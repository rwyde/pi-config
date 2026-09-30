import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { SessionManager } from "@earendil-works/pi-coding-agent";
import {
  matchWorktree,
  newWorktreePath,
  parseWorktreeList,
  suggestedWorktreeName,
  worktreeLabel,
  worktreeParent,
} from "../extensions/worktree-core.mjs";
import {
  createSeededSession,
  forkSessionToWorktree,
} from "../extensions/worktree-session.mjs";

const porcelain = [
  "worktree /src/project",
  "bare",
  "",
  "worktree /src/project/main",
  "HEAD abc123",
  "branch refs/heads/main",
  "",
  "worktree /src/project/feature-one",
  "HEAD def456",
  "branch refs/heads/feat/one",
  "locked",
  "",
].join("\0");

test("parses bare and checked-out worktrees", () => {
  const worktrees = parseWorktreeList(porcelain);
  assert.deepEqual(worktrees, [
    {
      path: "/src/project",
      head: undefined,
      branch: undefined,
      bare: true,
      detached: false,
      locked: false,
      prunable: false,
    },
    {
      path: "/src/project/main",
      head: "abc123",
      branch: "main",
      bare: false,
      detached: false,
      locked: false,
      prunable: false,
    },
    {
      path: "/src/project/feature-one",
      head: "def456",
      branch: "feat/one",
      bare: false,
      detached: false,
      locked: true,
      prunable: false,
    },
  ]);
});

test("matches worktrees by branch, basename, or cwd-relative path", () => {
  const worktrees = parseWorktreeList(porcelain);
  assert.equal(matchWorktree(worktrees, "feat/one", "/src/project")[0]?.path, "/src/project/feature-one");
  assert.equal(matchWorktree(worktrees, "feature-one", "/tmp")[0]?.branch, "feat/one");
  assert.equal(matchWorktree(worktrees, "./main", "/src/project")[0]?.branch, "main");
  assert.deepEqual(matchWorktree(worktrees, "project", "/src"), []);
});

test("derives immediate-child paths from a bare coordinator", () => {
  const worktrees = parseWorktreeList(porcelain);
  assert.equal(worktreeParent(worktrees), "/src/project");
  assert.equal(suggestedWorktreeName("feat/SIM-123/use-cache"), "feat-SIM-123-use-cache");
  assert.equal(newWorktreePath(worktrees, "cache-work"), "/src/project/cache-work");
  assert.throws(() => newWorktreePath(worktrees, "nested/cache-work"), /immediate child/);
});

test("renders enough state to disambiguate worktree choices", () => {
  const feature = parseWorktreeList(porcelain)[2];
  assert.equal(
    worktreeLabel(feature),
    "feature-one — feat/one (locked) — /src/project/feature-one",
  );
});

test("recognizes reason-bearing locked and prunable records", () => {
  const [worktree] = parseWorktreeList(
    [
      "worktree /src/project/stale",
      "HEAD abc123",
      "branch refs/heads/stale",
      "locked deployment checkout",
      "prunable gitdir file points to non-existent location",
      "",
    ].join("\0"),
  );
  assert.equal(worktree.locked, true);
  assert.equal(worktree.prunable, true);
});

test("creates persisted target-cwd sessions for handoff and fresh modes", (t) => {
  const root = mkdtempSync(join(tmpdir(), "pi-worktree-session-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const sourceCwd = join(root, "source");
  const targetCwd = join(root, "target");
  mkdirSync(sourceCwd);
  mkdirSync(targetCwd);

  const source = SessionManager.create(sourceCwd);
  source.appendMessage({ role: "user", content: "decide what to build", timestamp: Date.now() });
  const sourcePath = source.getSessionFile();
  assert.ok(sourcePath);

  const targetPath = createSeededSession(targetCwd, sourcePath, "## Objective\nBuild it");
  const entries = readFileSync(targetPath, "utf8")
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line));
  assert.equal(entries[0].cwd, targetCwd);
  assert.equal(entries[0].parentSession, sourcePath);
  assert.ok(
    entries.some(
      (entry) =>
        entry.type === "message" &&
        entry.message?.role === "user" &&
        entry.message.content === "## Objective\nBuild it",
    ),
  );
});

test("forks full history into a persisted target-cwd session", (t) => {
  const root = mkdtempSync(join(tmpdir(), "pi-worktree-fork-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const sourceCwd = join(root, "source");
  const targetCwd = join(root, "target");
  mkdirSync(sourceCwd);
  mkdirSync(targetCwd);

  const source = SessionManager.create(sourceCwd);
  source.appendMessage({ role: "user", content: "important context", timestamp: Date.now() });
  const sourcePath = source.getSessionFile();
  assert.ok(sourcePath);

  const targetPath = forkSessionToWorktree(sourcePath, targetCwd);
  const entries = readFileSync(targetPath, "utf8")
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line));
  assert.equal(entries[0].cwd, targetCwd);
  assert.equal(entries[0].parentSession, sourcePath);
  assert.ok(
    entries.some(
      (entry) => entry.type === "message" && entry.message?.content === "important context",
    ),
  );
});

test("full-history mode rejects a prospective but nonexistent session path", () => {
  assert.throws(
    () => forkSessionToWorktree("/tmp/does-not-exist-pi-session.jsonl", "/tmp"),
    /requires a saved source session/,
  );
});
