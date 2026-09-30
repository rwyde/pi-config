import { basename, dirname, join, resolve } from "node:path";

/**
 * Parse `git worktree list --porcelain -z` output.
 *
 * @param {string} output
 * @returns {Array<{
 *   path: string,
 *   head?: string,
 *   branch?: string,
 *   bare: boolean,
 *   detached: boolean,
 *   locked: boolean,
 *   prunable: boolean,
 * }>} */
export function parseWorktreeList(output) {
  const records = output.split("\0\0").filter(Boolean);
  return records.map((record) => {
    const fields = record.split("\0").filter(Boolean);
    const values = new Map();
    const flags = new Set();

    for (const field of fields) {
      const separator = field.indexOf(" ");
      if (separator === -1) {
        flags.add(field);
      } else {
        values.set(field.slice(0, separator), field.slice(separator + 1));
      }
    }

    const path = values.get("worktree");
    if (!path) throw new Error("Git returned a worktree record without a path");

    const branchRef = values.get("branch");
    return {
      path,
      head: values.get("HEAD"),
      branch: branchRef?.replace(/^refs\/heads\//, ""),
      bare: flags.has("bare"),
      detached: flags.has("detached"),
      locked: flags.has("locked") || values.has("locked"),
      prunable: flags.has("prunable") || values.has("prunable"),
    };
  });
}

/** @param {ReturnType<typeof parseWorktreeList>[number]} worktree */
export function worktreeLabel(worktree) {
  const state = worktree.branch ?? (worktree.detached ? "detached" : "no branch");
  const flags = [worktree.locked && "locked", worktree.prunable && "prunable"].filter(Boolean);
  return `${basename(worktree.path)} — ${state}${flags.length ? ` (${flags.join(", ")})` : ""} — ${worktree.path}`;
}

/**
 * @param {ReturnType<typeof parseWorktreeList>} worktrees
 * @param {string} selector
 * @param {string} cwd
 */
export function matchWorktree(worktrees, selector, cwd) {
  const normalized = resolve(cwd, selector);
  return worktrees.filter(
    (worktree) =>
      !worktree.bare &&
      (resolve(worktree.path) === normalized ||
        basename(worktree.path) === selector ||
        worktree.branch === selector),
  );
}

/** @param {string} branch */
export function suggestedWorktreeName(branch) {
  return branch
    .replace(/^refs\/heads\//, "")
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "worktree";
}

/** @param {ReturnType<typeof parseWorktreeList>} worktrees */
export function worktreeParent(worktrees) {
  const bare = worktrees.find((worktree) => worktree.bare);
  if (bare) return bare.path;

  const firstCheckout = worktrees.find((worktree) => !worktree.bare);
  if (!firstCheckout) throw new Error("Git reported no worktree root");
  return dirname(firstCheckout.path);
}

/**
 * @param {ReturnType<typeof parseWorktreeList>} worktrees
 * @param {string} directoryName
 */
export function newWorktreePath(worktrees, directoryName) {
  if (
    !directoryName ||
    directoryName === "." ||
    directoryName === ".." ||
    directoryName.includes("/") ||
    directoryName.includes("\\")
  ) {
    throw new Error("Worktree directory must be one immediate child directory name");
  }
  return join(worktreeParent(worktrees), directoryName);
}
