---
name: swarm
description: Parent-orchestrated async subagent work with independent worktree lanes, progress updates, and reviewed integration. Always use when the user asks the agent to work on more than one item, even without mentioning swarm, parallelism, or delegation. Also use for explicit swarm or parallel-lane requests. Not for work assigned to a delegated child.
---

# Swarm

## When to invoke

Load this skill whenever the user asks you to work on two or more items: tasks, issues, fixes, features, or deliverables, whether listed separately or combined in prose. The user does not need to say "swarm", "parallel", or "delegate". Also load it for explicit swarm or parent-orchestrated parallel-lane requests.

Count user-requested work items, not implementation steps you invent for a single item. Related or dependent items still trigger the skill, but do not force parallel execution; keep dependent work sequential. Loading this skill does not override delegation authorization requirements or explicit instructions to work without subagents. Delegated children follow their handoff instead of invoking a nested swarm.

The parent owns the plan, decisions, routing, progress, integration acceptance, and final answer. Children own bounded assignments, not the overall project. If you are a delegated child, follow your handoff instead of starting this workflow.

Use [the minimal subagent protocol](../pi-subagents/SKILL.md); read it only if it is not already available in the current context. This skill adds orchestration policy, not another API or required reference tree.

## Start useful work early

1. Reuse the approved plan and evidence. Inspect only enough to identify the first independent assignments and their authority boundaries.
2. State the first wave and any real dependency in a few sentences, then launch it. If the plan already supports bounded writers, start them; do not add scouts automatically. If specific unknowns block writers, launch focused read-only scouts before preparing every future worktree, brief, or review stage.
3. While scouts run, prepare safe isolation and concise writer handoffs. Do not edit files being inspected in a way that invalidates their baseline. If no safe independent preparation remains, yield for completion.

Optimize time to the first useful child, not time to a fully scripted lifecycle. Do not write a project-sized workflow before starting a two-child investigation.

## Partition only real seams

Keep a small ownership table in the parent context:

`Lane | cwd/baseline | owned files or contract | deliverable | dependency/status`

No separate JSON board, orchestration document, or duplicate plan is required. Use a shared brief only when it materially reduces repeated context or preserves essential decisions.

- Split independently implementable source/contract boundaries, not arbitrary item counts. Two to four lanes are a useful starting point, not a quota.
- Every writer gets an isolated worktree and exclusive ownership. Serial work stays serial. One tightly coupled change can have one writer plus independent read-only advisors.
- Resolve shared contracts first only where they actually block independence. Do not impose a contract-freeze stage on unrelated work.
- A dirty source checkout is a baseline decision, not an invitation to build a snapshot framework. Preserve user changes; use a suitable clean baseline/worktree when valid. If required uncommitted inputs cannot safely be included, ask rather than silently dropping them or committing/stashing the user's checkout.
- Create worktrees as lanes become ready. Confirm dependency/bootstrap needs before attributing missing modules to a code defect.

## Orchestrate ready waves

Use one async workflow per coordinated wave, with `runs.all` for independent lanes. Use sequential `runs.run` steps only for known dependencies. Make later decisions after evidence arrives instead of encoding speculative gates, retries, and approval choreography up front.

Each handoff states the relevant approved plan, cwd/baseline, exclusive scope, success and validation criteria, output, and escalation rules. Carry through all user authorization limits. Children do not spawn peers or expand scope on their own.

As lanes finish, inspect their handoffs, decide what is ready, and launch the next useful wave. Keep safe independent lanes moving; do not wait for the slowest lane unless its result is a real dependency. The parent must not become another writer inside an active child's worktree.

Ask children for material progress, discoveries, and blockers through `contact_supervisor`, not a report after every tool. Give the user concise milestones: what started, what completed, what is blocked, and what happens next. Answer supervisor decisions promptly. Do not add status-poll loops.

## Review and integrate

A completed writer returns changed files, a patch or other durable handoff, actual validation, unresolved decisions, and worktree state. Commits are one possible handoff only when authorized; never assume they are required.

Before accepting substantial changes, obtain fresh read-only review of the exact candidate. Review independent lanes or the integrated result according to actual risk; do not require a reviewer for every tiny stage. The parent dispositions evidence-backed findings and sends accepted fixes to the owning writer.

Integrate only ready, non-overlapping handoffs into an explicit target. The parent may integrate once writers are done; a separate integration worker is optional, not mandatory. Preserve unrelated dirty work. Run the smallest relevant checks and recheck only the affected areas after fixes.

Finish with outcomes, validation actually performed, residual limitations, and any remaining decision. Keep worktrees until their handoffs are durable and no active child or review needs them. Do not commit, push, publish, or clean up unrelated work without authority.
