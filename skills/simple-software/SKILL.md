---
name: simple-software
description: Engineering principles for designing, implementing, refactoring, and reviewing software. Use for software architecture and coding work, especially when choosing abstractions, service boundaries, or classes.
---

# Simple Software

Apply these as judgment, not dogma. The goal is the smallest understandable system that fully satisfies the real constraints.

## Design

1. Treat complexity as a cost. Every abstraction, process, dependency, and deployment boundary must earn its existence.
2. Choose the smallest design that completely solves the present problem. Reject speculative infrastructure and hypothetical future-proofing.
3. Prefer one deployable program composed of coherent modules with explicit in-process interfaces.
4. Distribute only for a concrete constraint such as data residency, independent scaling, fault isolation, or organizational ownership. State the constraint and accept the operational cost deliberately.
5. Let module boundaries emerge from real behavior. Do not introduce an abstraction merely because two pieces of code currently look similar.
6. Prefer locality of behavior: keep code that must be understood or changed together close together.
7. Before removing or redesigning unfamiliar code, determine why it exists.

## Code

1. Optimize for the next reader: direct control flow, precise names, visible data movement, and easy debugging.
2. A function should perform one coherent operation. Function length is evidence to consider, not a rule.
3. Prefer functions and plain data. Use a class when stateful identity, lifecycle, or polymorphism makes the result simpler.
4. Do not introduce patterns, dependency layers, interfaces, factories, or SOLID-style indirection as goals in themselves.
5. Prefer a little obvious duplication over a premature or indirect abstraction.
6. Make the common case obvious. Keep exceptional complexity behind a narrow interface.
7. Make small, reversible changes and keep the system working throughout a refactor.

## Working Discipline

- Verify assumptions from code, documentation, or execution.
- Verify proportionately with existing checks or a focused manual check. Report what was actually checked and state any remaining uncertainty; do not add work just to make a stronger success claim.
- Keep changes within requested scope; mention attractive follow-up work instead of smuggling it into the patch.
- For exploratory work, deliver the smallest usable result first and stop when the request is satisfied.
- Use one writer per worktree. Parallelize independent read-only investigation or explicitly assigned, isolated implementation lanes; never overlap mutation ownership.
- When necessary complexity remains, explain the constraint that requires it.

## Sources

These principles are informed by [The Grug Brained Developer](https://grugbrain.dev), [The Majestic Monolith](https://signalvnoise.com/svn3/the-majestic-monolith/), and Dee Hock's principle that simple purpose and principles produce complex intelligent behavior.
