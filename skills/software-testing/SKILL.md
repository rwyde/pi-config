---
name: software-testing
description: Guidance for writing or modifying automated tests. Use only when the user explicitly requests or authorizes that test work; implementing or fixing software does not itself authorize writing tests.
---

# Software Testing

Apply this guidance only within the user's explicitly authorized testing scope. If authorization is absent, do not write or modify tests. Loading this skill does not itself grant authorization.

1. For a bug, reproduce it with a failing regression test before fixing it whenever practical.
2. For well-understood behavior changes, prefer red → green → refactor.
3. For exploratory work where the behavior is not understood yet, establish the shape first and add tests as stable boundaries emerge.
4. Prefer integration tests around meaningful module boundaries. Use unit tests where they give fast, precise diagnosis and a small end-to-end suite for critical paths.
5. Test externally meaningful behavior rather than implementation details. Avoid mocks unless crossing an expensive or uncontrollable boundary.
6. Do not add tests merely to increase coverage.
7. Run the relevant tests you wrote or changed and report their actual results. Do not silently expand the authorized scope.
