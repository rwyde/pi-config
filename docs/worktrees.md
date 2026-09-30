# Worktree session handoff

`/worktree` moves from repository exploration into a session rooted in a selected
Git worktree. It is intended for repositories that keep a primary checkout or
bare coordinator beside linked worktrees.

Pi binds tools, context files, skills, settings, trust, and session storage to a
session cwd. The command therefore does not mutate the current session's cwd.
It creates a target-cwd session and asks Pi to replace the active runtime. The
source session remains available through `/resume`.

## Recommended flow

Start Pi in the primary checkout and keep that checkout read-only while deciding
what to do:

```bash
cd /path/to/repository/main
pi
```

Then run `/worktree`. Select an existing worktree or create a branch and sibling
worktree. The command warns before entering a worktree with local changes.

A destination can be selected directly by path, directory name, or branch:

```text
/worktree feature-one
/worktree feat/SIM-1234-feature-one
/worktree /path/to/repository/feature-one
```

Create a worktree interactively or provide its branch and optional base ref:

```text
/worktree new
/worktree new feat/SIM-1234-feature-one
/worktree new feat/SIM-1234-feature-one main
```

New worktrees are immediate siblings of the existing checkouts. In a
bare-coordinator layout they are created directly under the bare repository
root. When Git worktree-specific configuration is enabled, the command records
`core.bare=false` in the new worktree configuration.

## Transfer modes

### Concise handoff

The default. Pi asks the active model to produce a structured, self-contained
implementation prompt from the effective conversation context. You can review
and edit it before the command creates the target session. After the runtime
switch, the handoff is submitted automatically.

The handoff includes the objective, decisions and constraints, relevant
artifacts, evidence, open questions, and next action. It tells the receiving
agent to inspect the target branch before editing.

### Full conversation history

Copies the active session path to the target cwd with
`SessionManager.forkFrom()`. This preserves every relevant message but also
carries exploratory noise and consumes more context. The command places a
verification prompt in the editor rather than immediately starting another
turn.

Full-history transfer requires a persisted source session.

### Fresh session

Creates a target-cwd session without copying source-conversation context. It
contains only a short bootstrap message identifying the worktree and telling
the agent to wait for the user's task. The session header still links back to the
source session when one exists.

## Session and trust behavior

The new session records the source session as `parentSession`. Switching the
runtime reloads context files, skills, settings, extensions, tools, and project
trust for the destination cwd. If that worktree has not been trusted, Pi's
normal trust flow applies.

The command does not delete, move, commit, stash, or otherwise modify an
existing worktree. Creating a worktree is always confirmed first.
