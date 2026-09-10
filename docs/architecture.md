# Customization Architecture

## Layers

| Concern | Mechanism | Reason |
|---|---|---|
| Enduring engineering judgment | `simple-software` skill | Loaded only for software work, but explicitly required by `/work` |
| Software workflow phases | Prompt templates backed by the `software-workflow` skill | Each phase can be used and improved independently without a runtime state machine |
| Context isolation and delegation | Pinned `pi-subagents` package | Reuses mature lifecycle, sandbox, and review machinery |
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
