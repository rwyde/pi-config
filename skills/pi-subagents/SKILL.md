---
name: pi-subagents
description: Minimal parent-side guide to native Pi subagent tools, async launches, isolation, and recovery. Use when the user authorizes delegation. For the explicitly requested orchestrator plus parallel worktree-lane pattern, also use swarm.
---

# Subagents: Minimal Protocol

This replaces the packaged skill, not the extension. It is parent-only; delegated children follow their assigned handoff and do not orchestrate peers unless explicitly authorized and equipped with the subagent tool.

## Decide and launch

- Delegate only when the user requested it directly or applicable project instructions authorize it. Complexity alone is not permission.
- Choose the smallest useful handoff. Do not automatically add scouts, planners, challenges, reviewers, or integration stages.
- Reuse instructions and evidence already in context. Do not reread skills, list known roles, or fetch guides as a routine preflight.
- Available ordinary roles are `scout` for local reconnaissance, `researcher` for external evidence, `worker` for implementation, and `reviewer` for independent review. Discover other roles only when needed; use configured models unless an override is warranted.
- Each task needs a goal, explicit cwd/ref or baseline, edit/authority boundary, relevant context, success criteria, proportionate validation, expected output, and stop/ask conditions. A compact paragraph is enough.
- Launch async explicitly. Use fresh context with a self-contained brief; fork only when inherited history is necessary.

One bounded child needs only an ordinary tool call:

```js
subagent({
  agent: "scout",
  task: "Read-only: map the requested behavior in src/example.ts at the current baseline. Return the relevant paths, constraints, and unknowns. Do not edit, delegate, or access live services; ask if the target is ambiguous.",
  cwd: "/absolute/repo",
  async: true,
  options: { context: "fresh" }
})
```

For a coordinated wave, write one tagged block in the same reply as one `subagent({ workflow: true, async: true, cwd: "/absolute/repo" })` tool call:

```js workflow
const results = await runs.all([
  { key: "behavior", label: "Map target behavior", agent: "scout", context: "fresh", task: "Read-only: inspect the requested behavior in src/example.ts. Return paths and constraints; no edits or delegation." },
  { key: "consumers", label: "Map affected consumers", agent: "scout", context: "fresh", task: "Read-only: inspect consumers of src/example.ts. Return compatibility constraints; no edits or delegation." }
]);
return results;
```

These are shapes to adapt, not default stages. Use `runs.run(key, item)` for a dependent step and ordinary JavaScript for branching. Keep stable keys and short behavior labels. No nested async functions or arbitrary shell/filesystem tools exist in raw workflow scripts. Omit child `async`: awaiting a child then returns its completed result; explicit child `async: true` returns only a launch receipt.

Put non-schema top-level fields inside `options`, such as `context`, `timeoutMs`, or `outputMode`. Bind durable child reports with `output` on the child item; use relative paths and `outputMode: "file-only"` when a later step needs a saved report. Consume returned output references rather than guessing artifact paths. Otherwise leave optional fields out.

## Ownership and control

- One writer per cwd/worktree, including the parent. Parallel writers require separate worktrees and exclusive component/contract ownership. Shared-checkout children must be genuinely read-only.
- Before a writer launch, confirm the baseline and isolation. Managed `worktree: true` requires a clean source checkout and starts from tracked committed state. Do not commit, stash, reset, or omit unrelated/uncommitted user work merely to satisfy isolation; use an appropriate existing worktree or resolve the baseline decision.
- Pass on the user's testing and publication boundaries. Delegation does not authorize test changes, commits, pushes, releases, or live-service operations that were not otherwise authorized. Avoid hard tool budgets for mutation-capable workers.
- Continue safe independent work after launch. When only children remain active, yield; native completion wakes the parent. Do not sleep, poll, or use `bg_wait` for ordinary native async runs.
- Children use `contact_supervisor` for meaningful progress and decisions; the parent answers with `subagent_supervisor`. Use `subagent` status/steer only for a concrete inspection or intervention, not reassurance polling. Completed-child follow-ups use resume, not live steering.
- A launch/runtime failure is a blocker: report the exact error and run/worktree state. Verify cleanliness or capture partial changes before a same-protocol retry. Never silently switch runners or execution modes.

## Documentation on demand

No additional reference is mandatory for routine native launches. If a field or advanced feature is genuinely unknown, fetch only its relevant `subagent({ action: "guide", options: { topic: "..." } })` topic. Examples: `workflows/scripted-workflows`, `tool-reference/execution-parameters`, `tool-reference/retained-children`. External runners, schedules, missions, and advanced gates need their own documentation only when actually used.

Use [swarm](../swarm/SKILL.md) only for the user's requested parent-orchestrated parallel-lane pattern, not for every delegation.
