import { existsSync } from "node:fs";
import { basename } from "node:path";
import { SessionManager } from "@earendil-works/pi-coding-agent";

/**
 * Create a persisted target-cwd session seeded with one user message.
 * SessionManager intentionally delays file creation until a conversation begins.
 *
 * @param {string} targetCwd
 * @param {string | undefined} parentSession
 * @param {string} initialMessage
 */
export function createSeededSession(targetCwd, parentSession, initialMessage) {
  const session = SessionManager.create(targetCwd, undefined, { parentSession });
  session.appendSessionInfo(`Worktree: ${basename(targetCwd)}`);
  session.appendMessage({ role: "user", content: initialMessage, timestamp: Date.now() });

  const path = session.getSessionFile();
  if (!path || !existsSync(path)) {
    throw new Error("Could not persist the target worktree session");
  }
  return path;
}

/**
 * Copy a persisted source session into a target cwd.
 *
 * @param {string | undefined} sourceSession
 * @param {string} targetCwd
 */
export function forkSessionToWorktree(sourceSession, targetCwd) {
  if (!sourceSession || !existsSync(sourceSession)) {
    throw new Error("Full-history transfer requires a saved source session");
  }

  const session = SessionManager.forkFrom(sourceSession, targetCwd, undefined, {
    parentSession: sourceSession,
  });
  session.appendSessionInfo(`Worktree: ${basename(targetCwd)}`);

  const path = session.getSessionFile();
  if (!path || !existsSync(path)) {
    throw new Error("Could not persist the full-history target session");
  }
  return path;
}
