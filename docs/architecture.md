# Customization Architecture

## Layers

| Concern | Mechanism | Reason |
|---|---|---|
| Enduring engineering judgment | `simple-software` skill | Loaded only for software work |
| Software commands | Self-contained prompt templates | Commands stay explicit without imposing a workflow state machine |
| Context isolation and delegation | Pinned `pi-subagents` package | Reuses mature lifecycle, sandbox, and review machinery |
| Worktree session transitions | `/worktree` extension | Rebuilds cwd-bound Pi resources and preserves source-session provenance |
| Mechanical enforcement | Extension, only after repeated prompt failures | Code should enforce only what prose cannot reliably guarantee |
| Repository-specific commands and conventions | Project `.pi/` resources | Keeps general behavior independent from one employer or project |

## Orchestration model

The parent Pi session owns user interaction, decisions, synthesis, and final validation. There is no separate orchestrator agent.

The initial delegated roles are:

- `scout`: local read-only reconnaissance
- `researcher`: external evidence
- `worker`: the sole writer
- `reviewer`: fresh independent review

Parallel execution is restricted to independent read-only work. Mutation has one owner at a time.

## Worktree session boundary

Pi binds tools, context, skills, settings, trust, and session storage to the
session cwd. `/worktree` therefore creates or forks a session at the destination
and uses Pi's supported session-replacement lifecycle instead of mutating cwd in
place. A concise, reviewable handoff is the default; full-history transfer and
a fresh session remain explicit alternatives.

The source session is retained. Existing worktrees are never modified beyond
normal reads, while creation requires confirmation and delegates branch and
checkout mechanics to Git.

## Why use a large dependency behind a small surface?

`pi-subagents` contains substantial lifecycle and recovery machinery. Reimplementing that machinery would create more risk and maintenance than pinning it. Our public workflow intentionally uses only four roles and a small command surface. Features earn adoption through observed need rather than availability.

## Evolution rule

Do not add a command, role, skill, or extension after one inconvenience. Record the failure. Add machinery only when the same class of failure recurs and a smaller prompt or documentation change cannot solve it.

## Deferred scope

- employer- and project-specific integrations
- automatic commits, pushes, or pull requests
- multiple writers or worktree fanout
- nested subagent trees
- councils, missions, schedules, watchdogs, external-agent adapters
- a workflow state-machine extension
- learning-system customization
