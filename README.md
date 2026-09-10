# Pi Agent Config

A deliberately small, version-controlled Pi setup for simple software development and bounded subagent delegation.

## Surface

- `/plan <goal>` — inspect and produce a small actionable plan
- `/implement [goal]` — implement the latest plan or a supplied goal
- `/review [focus]` — proportionally review the current change
- `/commit [guidance]` — create one local commit without pushing
- `/work [--commit] <goal>` — compose planning and implementation, with explicit optional commit
- `/pr-review <PR-URL> [--hunk]` — review a temporary PR checkout and generate an HTML explanation
- `simple-software` — shared engineering principles
- `software-workflow` — shared plan, implementation, review, and commit phases
- `github-pr-review` — GitHub checkout, correctness review, optional Hunk integration, and explain-diff output
- Four enabled subagent roles from `pi-subagents`: `scout`, `researcher`, `worker`, and `reviewer`

See [`docs/principles.md`](docs/principles.md) and [`docs/architecture.md`](docs/architecture.md).

## Installation

This setup currently targets Pi `0.84.4` and pins `pi-subagents` `0.66.0`. Extension startup was smoke-tested with that combination.

```bash
pi install npm:pi-subagents@0.66.0
git clone https://github.com/rwyde/pi-agent-config.git ~/src/pi-agent-config
pi install ~/src/pi-agent-config
mkdir -p ~/.pi/agent/extensions/subagent
ln -sfn ~/src/pi-agent-config/config/pi-subagents.json \
  ~/.pi/agent/extensions/subagent/config.json
```

Merge the `subagents` object from [`config/settings.fragment.json`](config/settings.fragment.json) into `~/.pi/agent/settings.json`. Do not replace the existing package list; retain other installed Pi packages.

Restart Pi or run `/reload` after resource changes. Changes to subagent startup configuration are safest to apply by restarting Pi.

## Scope

This repository owns general-purpose behavior only. Employer- and repository-specific resources belong in each project's `.pi/` directory and will be integrated only after the generic workflow has been exercised independently.

## Safety defaults

- one writer at a time;
- foreground subagents by default;
- fresh child context by default;
- nesting capped at one level;
- bounded concurrency and spawn counts;
- schedules and persistent fleet UI disabled;
- commit, push, and PR creation require explicit user authorization.

## Development

Start with prompts and skills. Add an extension only when a repeated failure requires mechanical enforcement. Keep secrets and machine-generated runtime artifacts out of this repository.
