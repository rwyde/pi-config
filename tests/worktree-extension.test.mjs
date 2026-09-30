import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { SessionManager } from "@earendil-works/pi-coding-agent";
import worktreeExtension from "../extensions/worktree.ts";

function run(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, encoding: "utf8" });
  return {
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    code: result.status ?? 1,
    killed: result.signal !== null,
  };
}

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), "pi-worktree-extension-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const source = join(root, "source");
  const target = join(root, "target");
  mkdirSync(source);
  assert.equal(run("git", ["init", "-q"], source).code, 0);
  assert.equal(run("git", ["config", "user.email", "test@example.com"], source).code, 0);
  assert.equal(run("git", ["config", "user.name", "Test"], source).code, 0);
  writeFileSync(join(source, "file.txt"), "content\n");
  assert.equal(run("git", ["add", "file.txt"], source).code, 0);
  assert.equal(run("git", ["commit", "-qm", "initial"], source).code, 0);
  assert.equal(run("git", ["worktree", "add", "-qb", "feat/test", target], source).code, 0);

  const sourceSession = SessionManager.create(source);
  sourceSession.appendMessage({ role: "user", content: "retain this decision", timestamp: Date.now() });

  return { source, target, sourceSession };
}

function commandHarness(sourceSession, source, transferMode) {
  let command;
  let switchedPath;
  let editorText;
  let kickedOff;
  const notifications = [];
  const pi = {
    registerCommand(name, definition) {
      assert.equal(name, "worktree");
      command = definition;
    },
    exec(program, args, options = {}) {
      return Promise.resolve(run(program, args, options.cwd ?? source));
    },
  };
  worktreeExtension(pi);

  const ctx = {
    mode: "tui",
    cwd: source,
    sessionManager: sourceSession,
    waitForIdle: async () => {},
    switchSession: async (path, options) => {
      switchedPath = path;
      assert.ok(readFileSync(path, "utf8").length > 0);
      await options.withSession({
        ui: {
          notify(message) {
            notifications.push(message);
          },
          setEditorText(text) {
            editorText = text;
          },
        },
        async sendUserMessage(message) {
          kickedOff = message;
        },
      });
      return { cancelled: false };
    },
    model: {},
    modelRegistry: {},
    ui: {
      select: async () => transferMode,
      confirm: async () => true,
      input: async () => "",
      custom: async () => "## Objective\nImplement the selected work",
      editor: async (_title, text) => text,
      notify(message) {
        notifications.push(message);
      },
    },
  };

  return {
    run: async (target) => command.handler(target, ctx),
    result: () => ({ switchedPath, editorText, kickedOff, notifications }),
  };
}

test("full-history mode switches to a persisted target-cwd session", async (t) => {
  const { source, target, sourceSession } = fixture(t);
  const harness = commandHarness(sourceSession, source, "Full conversation history");
  await harness.run(target);

  const { switchedPath, editorText } = harness.result();
  assert.ok(switchedPath);
  const entries = readFileSync(switchedPath, "utf8")
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line));
  assert.equal(entries[0].cwd, target);
  assert.ok(
    entries.some(
      (entry) => entry.type === "message" && entry.message?.content === "retain this decision",
    ),
  );
  assert.match(editorText, /Re-check its branch/);
});

test("handoff mode persists the reviewed handoff before switching and starts work", async (t) => {
  const { source, target, sourceSession } = fixture(t);
  const harness = commandHarness(sourceSession, source, "Concise handoff (recommended)");
  await harness.run(target);

  const { switchedPath, kickedOff } = harness.result();
  assert.ok(switchedPath);
  const entries = readFileSync(switchedPath, "utf8")
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line));
  assert.equal(entries[0].cwd, target);
  assert.ok(
    entries.some(
      (entry) =>
        entry.type === "message" &&
        entry.message?.role === "user" &&
        entry.message.content === "## Objective\nImplement the selected work",
    ),
  );
  assert.match(kickedOff, /verify the branch and repository state/);
});

test("fresh mode switches to a persisted target session without copying history", async (t) => {
  const { source, target, sourceSession } = fixture(t);
  const harness = commandHarness(sourceSession, source, "Start fresh");
  await harness.run(target);

  const { switchedPath } = harness.result();
  assert.ok(switchedPath);
  const entries = readFileSync(switchedPath, "utf8")
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line));
  assert.equal(entries[0].cwd, target);
  assert.equal(entries[0].parentSession, sourceSession.getSessionFile());
  assert.equal(
    entries.some(
      (entry) => entry.type === "message" && entry.message?.content === "retain this decision",
    ),
    false,
  );
  assert.ok(
    entries.some(
      (entry) =>
        entry.type === "message" &&
        entry.message?.role === "user" &&
        /Wait for the user's task/.test(entry.message.content),
    ),
  );
});
