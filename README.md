# Pi Agent Config

A deliberately small, version-controlled Pi setup for simple software development and bounded subagent delegation.

## Surface

- `/plan <goal>` — inspect and produce a small actionable plan
- `/implement [goal]` — implement the latest plan or a supplied goal
- `/review [focus]` — proportionally review the current change
- `/commit [guidance]` — create one commit and push it to the configured upstream
- `/pr-review <PR-URL> [--hunk]` — review a temporary PR checkout and generate an HTML explanation
- `/worktree [selector]` — open or create a Git worktree and continue in a worktree-bound Pi session
- `simple-software` — shared engineering principles
- `software-testing` — testing guidance, loaded only after explicit authorization to write or modify tests
- `github-pr-review` — GitHub checkout, correctness review, optional Hunk integration, and explain-diff output
- `pi-subagents` — local minimal delegation protocol, replacing the packaged skill without disabling its extension
- `/skill:swarm <goal>` — parent-orchestrated async worktree lanes, progress, and reviewed integration; also applies when that pattern is explicitly requested in prose
- Four enabled subagent roles from `pi-subagents`: `scout`, `researcher`, `worker`, and `reviewer`
- Context-efficient native MCP access to optional web-development tools

See [`docs/principles.md`](docs/principles.md), [`docs/architecture.md`](docs/architecture.md), [`docs/mcp.md`](docs/mcp.md), and [`docs/worktrees.md`](docs/worktrees.md).

## Installation

Package versions are unpinned by default. Add an explicit version only when a documented compatibility issue makes it necessary.

```bash
pi install npm:pi-subagents
git clone https://github.com/rwyde/pi-config.git ~/src/pi-config
pi install ~/src/pi-config
mkdir -p ~/.pi/agent/extensions/subagent
ln -sfn ~/src/pi-config/config/pi-subagents.json \
  ~/.pi/agent/extensions/subagent/config.json
```

Install [`config/AGENTS.md`](config/AGENTS.md) as `~/.pi/agent/AGENTS.md` to apply the testing-permission and proportional-completion rules across projects. If a global instructions file already exists, merge these rules into it rather than overwriting it.

Merge the `subagents` object from [`config/settings.fragment.json`](config/settings.fragment.json) into `~/.pi/agent/settings.json`. Apply its `npm:pi-subagents` package entry too: `"skills": []` disables the packaged skills, while omitting `extensions` leaves the extension enabled. This package supplies the local `pi-subagents` and `swarm` skills. Do not replace the existing package list; retain other installed Pi packages. See [`docs/mcp.md`](docs/mcp.md) before copying the machine-local MCP example.

Restart Pi or run `/reload` after resource changes. Changes to subagent startup configuration are safest to apply by restarting Pi. Do not reload a session with an active async workflow merely to pick up these changes; use a fresh session or wait until it is idle.

A typical worktree flow starts Pi in a read-only primary checkout, uses the
session to clarify the work, then runs `/worktree` to create or select the
implementation checkout. The default transfer mode generates an editable,
concise handoff before Pi switches to a session rooted in that worktree.

## Scope

This repository owns general-purpose behavior only. Employer- and repository-specific resources belong in each project's `.pi/` directory and will be integrated only after the generic workflow has been exercised independently.

## Safety defaults

- one writer per worktree, with exclusive scope for parallel implementation lanes;
- async subagents by default;
- fresh child context by default;
- bounded nesting; children delegate only with explicit authority and tool access;
- bounded concurrency and spawn counts;
- schedules and persistent fleet UI disabled;
- commit and push require `/commit` or equivalent explicit authorization; PR creation requires separate authorization.

## Development

Start with prompts and skills. Add an extension only when a repeated failure requires mechanical enforcement. Keep secrets and machine-generated runtime artifacts out of this repository.

`npm test` runs behavioral tests for the worktree extension and HTML renderer. Run the relevant tests when changing that executable code. Markdown and configuration edits do not require the full suite; check syntax and Pi resource diagnostics as appropriate.
