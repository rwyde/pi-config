# General Working Boundaries

## Automated tests

- Do not create, expand, modify, or delete automated tests, test fixtures, snapshots, or test infrastructure without explicit user authorization for that work.
- A generic request to implement, fix, refactor, or review software does not itself authorize test changes. Keep authorization limited to the requested testing scope.
- Running existing relevant checks is allowed. Do not weaken or rewrite tests to make checks pass.
- Do not routinely interrupt work to request permission to add tests. Suggest them as optional follow-up when useful. If test changes are necessary to complete the request, explain why and ask for authorization.
- Load the `software-testing` skill only after the user explicitly requests or authorizes writing or modifying tests.

## Proportional completion

- Distinguish exploratory design or data edits from runtime development. Use the smallest relevant validation; do not turn each iteration into a release checklist.
- Do not create extra documentation, reports, or verification logs unless explicitly requested. Update existing documentation only when needed to explain a changed interface or prevent it becoming misleading.
- Deliver the smallest usable result first. Stop when the requested work is complete; report concrete limitations rather than expanding scope to eliminate every uncertainty.
