import { existsSync, unlinkSync } from "node:fs";
import { type Message, uuidv7 } from "@earendil-works/pi-ai";
import {
  BorderedLoader,
  convertToLlm,
  type ExtensionAPI,
  type ExtensionCommandContext,
  serializeConversation,
} from "@earendil-works/pi-coding-agent";
import {
  matchWorktree,
  newWorktreePath,
  parseWorktreeList,
  suggestedWorktreeName,
  worktreeLabel,
} from "./worktree-core.mjs";
import { createSeededSession, forkSessionToWorktree } from "./worktree-session.mjs";

const CREATE_WORKTREE = "Create a new worktree…";
const HANDOFF = "Concise handoff (recommended)";
const FULL_HISTORY = "Full conversation history";
const FRESH_SESSION = "Start fresh";

const HANDOFF_SYSTEM_PROMPT = `You prepare precise handoffs between Pi sessions. Produce a self-contained implementation prompt for a fresh session in a Git worktree.

Include only relevant, supported information from the source conversation. Do not invent repository facts or claim that work was completed unless the conversation proves it. Preserve important user intent and explicit constraints.

Use exactly these sections when applicable:

## Objective
## Decisions and constraints
## Relevant issues and documents
## Relevant files and packages
## Progress and evidence
## Open questions
## Next action

Mention that the receiving agent must inspect the target worktree before editing because its branch state may differ from the source session. Be concise. Return only the handoff prompt, with no preamble.`;

type Worktree = ReturnType<typeof parseWorktreeList>[number];

async function git(pi: ExtensionAPI, cwd: string, args: string[]) {
  const result = await pi.exec("git", args, { cwd, timeout: 30_000 });
  if (result.code !== 0) {
    const detail = result.stderr.trim() || result.stdout.trim() || `git exited ${result.code}`;
    throw new Error(detail);
  }
  return result.stdout;
}

async function listWorktrees(pi: ExtensionAPI, cwd: string) {
  return parseWorktreeList(await git(pi, cwd, ["worktree", "list", "--porcelain", "-z"]));
}

async function createWorktree(
  pi: ExtensionAPI,
  ctx: ExtensionCommandContext,
  worktrees: Worktree[],
  rawArgs?: string,
): Promise<Worktree | undefined> {
  const fields = rawArgs?.trim().split(/\s+/).filter(Boolean) ?? [];
  const requestedBranch = fields[0];
  const requestedBase = fields[1];
  const branch = requestedBranch ?? (await ctx.ui.input("New branch", "feat/my-change"))?.trim();
  if (!branch) return undefined;

  const branchCheck = await pi.exec("git", ["check-ref-format", "--branch", branch], {
    cwd: ctx.cwd,
    timeout: 10_000,
  });
  if (branch.startsWith("-") || branchCheck.code !== 0) {
    ctx.ui.notify(`Invalid branch name: ${branch}`, "error");
    return undefined;
  }

  const suggestedName = suggestedWorktreeName(branch);
  const enteredName = await ctx.ui.input("Worktree directory name", suggestedName);
  if (enteredName === undefined) return undefined;

  let path: string;
  try {
    path = newWorktreePath(worktrees, enteredName.trim() || suggestedName);
  } catch (error) {
    ctx.ui.notify(error instanceof Error ? error.message : String(error), "error");
    return undefined;
  }
  if (existsSync(path)) {
    ctx.ui.notify(`Path already exists: ${path}`, "error");
    return undefined;
  }

  const enteredBase = requestedBase ?? (await ctx.ui.input("Base ref", "HEAD"))?.trim();
  const base = enteredBase || "HEAD";
  const localBranch = await pi.exec("git", ["show-ref", "--verify", "--quiet", `refs/heads/${branch}`], {
    cwd: ctx.cwd,
    timeout: 10_000,
  });
  const action =
    localBranch.code === 0
      ? `Check out existing branch ${branch} at ${path}?`
      : `Create ${branch} from ${base} at ${path}?`;
  if (!(await ctx.ui.confirm("Create worktree", action))) return undefined;

  const args =
    localBranch.code === 0
      ? ["worktree", "add", "--", path, branch]
      : ["worktree", "add", "-b", branch, "--", path, base];
  await git(pi, ctx.cwd, args);

  const worktreeConfig = await pi.exec("git", ["config", "--get", "extensions.worktreeConfig"], {
    cwd: ctx.cwd,
    timeout: 10_000,
  });
  if (worktreeConfig.code === 0 && worktreeConfig.stdout.trim() === "true") {
    await git(pi, path, ["config", "--worktree", "core.bare", "false"]);
  }

  const created = (await listWorktrees(pi, ctx.cwd)).find(
    (worktree) => worktree.path === path && !worktree.bare,
  );
  if (!created) throw new Error(`Git created ${path}, but it was not listed as a worktree`);
  return created;
}

async function chooseWorktree(
  pi: ExtensionAPI,
  ctx: ExtensionCommandContext,
  args: string,
): Promise<Worktree | undefined> {
  const worktrees = await listWorktrees(pi, ctx.cwd);
  const trimmed = args.trim();

  if (trimmed === "new" || trimmed.startsWith("new ")) {
    return createWorktree(pi, ctx, worktrees, trimmed.slice(3));
  }

  if (trimmed) {
    const matches = matchWorktree(worktrees, trimmed, ctx.cwd);
    if (matches.length === 1) return matches[0];
    if (matches.length > 1) {
      ctx.ui.notify(`Worktree selector is ambiguous: ${trimmed}`, "error");
    } else {
      ctx.ui.notify(`No worktree matches: ${trimmed}`, "error");
    }
    return undefined;
  }

  const available = worktrees.filter((worktree) => !worktree.bare);
  const labels = available.map(worktreeLabel);
  const selected = await ctx.ui.select("Open or create a worktree", [...labels, CREATE_WORKTREE]);
  if (!selected) return undefined;
  if (selected === CREATE_WORKTREE) return createWorktree(pi, ctx, worktrees);
  return available[labels.indexOf(selected)];
}

async function warnAboutTargetState(pi: ExtensionAPI, ctx: ExtensionCommandContext, target: Worktree) {
  if (!existsSync(target.path) || target.prunable) {
    throw new Error(`Worktree is unavailable: ${target.path}`);
  }

  const status = await git(pi, target.path, ["status", "--short", "--branch"]);
  const changed = status
    .split("\n")
    .slice(1)
    .some((line) => line.trim());
  if (changed) {
    const proceed = await ctx.ui.confirm(
      "Worktree has local changes",
      `${target.path}\n\nOpen it without modifying those changes?`,
    );
    if (!proceed) throw new Error("Cancelled");
  }
}

async function generateHandoff(
  ctx: ExtensionCommandContext,
  target: Worktree,
  goal: string,
): Promise<string | undefined> {
  if (!ctx.model) throw new Error("No model selected");

  const messages = ctx.sessionManager.buildSessionContext().messages;
  if (messages.length === 0) throw new Error("No conversation to hand off");
  const conversation = serializeConversation(convertToLlm(messages));
  const prompt: Message = {
    role: "user",
    content: [
      {
        type: "text",
        text: [
          "## Source conversation",
          "",
          conversation,
          "",
          "## Destination",
          `Path: ${target.path}`,
          `Branch: ${target.branch ?? "detached"}`,
          "",
          "## Goal in the destination worktree",
          goal || "Continue the concrete work established in the source conversation.",
        ].join("\n"),
      },
    ],
    timestamp: Date.now(),
  };

  let generationError: Error | undefined;
  const result = await ctx.ui.custom<string | null>((tui, theme, _keybindings, done) => {
    const loader = new BorderedLoader(tui, theme, "Preparing worktree handoff…");
    loader.onAbort = () => done(null);

    ctx.modelRegistry
      .complete(
        ctx.model!,
        { systemPrompt: HANDOFF_SYSTEM_PROMPT, messages: [prompt] },
        { signal: loader.signal, cacheRetention: "none", sessionId: uuidv7() },
      )
      .then((response) => {
        if (response.stopReason === "aborted") return done(null);
        if (response.stopReason === "error") {
          throw new Error(response.errorMessage || "Handoff generation failed");
        }
        const text = response.content
          .filter((part): part is { type: "text"; text: string } => part.type === "text")
          .map((part) => part.text)
          .join("\n")
          .trim();
        done(text || null);
      })
      .catch((error) => {
        generationError = error instanceof Error ? error : new Error(String(error));
        done(null);
      });

    return loader;
  });

  if (generationError) throw generationError;
  if (!result) return undefined;
  return ctx.ui.editor("Review worktree handoff", result);
}

function removeTargetSession(path: string | undefined) {
  if (!path) return;
  try {
    unlinkSync(path);
  } catch {}
}

async function switchWithHandoff(
  ctx: ExtensionCommandContext,
  target: Worktree,
  handoff: string,
) {
  const sourceSession = ctx.sessionManager.getSessionFile();
  const targetSessionFile = createSeededSession(target.path, sourceSession, handoff);

  const result = await ctx.switchSession(targetSessionFile, {
    withSession: async (replacementCtx) => {
      replacementCtx.ui.notify(`Now working in ${target.path}`, "info");
      await replacementCtx.sendUserMessage(
        "Proceed from the worktree handoff above. First verify the branch and repository state.",
      );
    },
  });
  if (result.cancelled) {
    removeTargetSession(targetSessionFile);
    ctx.ui.notify("Session switch cancelled", "info");
  }
}

async function switchWithFullHistory(ctx: ExtensionCommandContext, target: Worktree) {
  const sourceSession = ctx.sessionManager.getSessionFile();
  const targetSessionFile = forkSessionToWorktree(sourceSession, target.path);

  const result = await ctx.switchSession(targetSessionFile, {
    withSession: async (replacementCtx) => {
      replacementCtx.ui.setEditorText(
        "Continue in this worktree. Re-check its branch and repository state before editing.",
      );
      replacementCtx.ui.notify(`Conversation copied to ${target.path}`, "info");
    },
  });
  if (result.cancelled) {
    removeTargetSession(targetSessionFile);
    ctx.ui.notify("Session switch cancelled", "info");
  }
}

async function switchFresh(ctx: ExtensionCommandContext, target: Worktree) {
  const sourceSession = ctx.sessionManager.getSessionFile();
  const initialMessage = [
    `Start a fresh task session in the Git worktree at ${target.path}.`,
    `The checked-out branch is ${target.branch ?? "detached"}.`,
    "Do not assume context from the parent session. Wait for the user's task.",
  ].join("\n");
  const targetSessionFile = createSeededSession(target.path, sourceSession, initialMessage);

  const result = await ctx.switchSession(targetSessionFile, {
    withSession: async (replacementCtx) => {
      replacementCtx.ui.notify(`Started a fresh session in ${target.path}`, "info");
    },
  });
  if (result.cancelled) {
    removeTargetSession(targetSessionFile);
    ctx.ui.notify("Session switch cancelled", "info");
  }
}

export default function worktreeExtension(pi: ExtensionAPI) {
  pi.registerCommand("worktree", {
    description: "Open or create a Git worktree and continue in a worktree-bound session",
    handler: async (args, ctx) => {
      if (ctx.mode !== "tui") {
        ctx.ui.notify("/worktree requires interactive mode", "error");
        return;
      }

      await ctx.waitForIdle();
      try {
        const target = await chooseWorktree(pi, ctx, args);
        if (!target) return;
        if (target.path === ctx.cwd) {
          ctx.ui.notify(`Already in ${target.path}`, "info");
          return;
        }

        await warnAboutTargetState(pi, ctx, target);
        const transfer = await ctx.ui.select("Transfer context", [
          HANDOFF,
          FULL_HISTORY,
          FRESH_SESSION,
        ]);
        if (!transfer) return;

        if (transfer === HANDOFF) {
          const goal = await ctx.ui.input(
            "Goal in the worktree",
            "Continue the work established in this conversation",
          );
          if (goal === undefined) return;
          const handoff = await generateHandoff(ctx, target, goal.trim());
          if (handoff === undefined) {
            ctx.ui.notify("Handoff cancelled", "info");
            return;
          }
          await switchWithHandoff(ctx, target, handoff);
          return;
        }

        if (transfer === FULL_HISTORY) {
          await switchWithFullHistory(ctx, target);
          return;
        }

        await switchFresh(ctx, target);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (message !== "Cancelled") ctx.ui.notify(message, "error");
      }
    },
  });
}
