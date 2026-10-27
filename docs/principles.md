# Engineering Principles

## Purpose

Produce software that is correct **and** simple to understand, maintain, change, and debug. Working behavior is necessary but not sufficient.

## Constitution

1. Complexity is a cost and must be justified.
2. Solve the present problem completely with the smallest adequate design.
3. Prefer a modular monolith: one deployable program with coherent internal modules.
4. Cross a process or network boundary only for a concrete constraint whose operational cost is worth paying.
5. Allow abstractions and module boundaries to emerge from real behavior rather than anticipating them.
6. Prefer readable functions and plain data. Use classes where stateful identity or lifecycle makes them clearer.
7. Reject SOLID, design patterns, OOP, DRY, and any other technique when applied as doctrine rather than as a locally useful tool.
8. Keep behavior local, control flow direct, names precise, and debugging easy.
9. Make small, reversible changes. Understand existing fences before removing them.
10. Verify claims with proportionate, actual evidence.
11. Keep one writer per worktree; parallelize independent investigation or explicitly assigned, isolated implementation lanes.
12. Add no speculative scope.

## Testing authorization

Writing or modifying automated tests requires explicit user authorization. Once authorized, apply the `software-testing` skill. Existing relevant checks may be run without adding or changing tests.

## Architectural default

Start with one program. Organize it into modules whose interfaces can be changed internally. Split a module into another program only when a demonstrated requirement—such as data residency, independently necessary scaling, fault isolation, or organizational ownership—outweighs distributed-system failure modes and operating cost.

## References

- [The Grug Brained Developer](https://grugbrain.dev)
- [The Majestic Monolith](https://signalvnoise.com/svn3/the-majestic-monolith/)
- [The Hock Principle](https://www.deewhock.com/quotations/thehockprinciple/)
