# Plan

Produce a small, actionable plan without modifying files.

- Establish the requested outcome, current behavior, relevant constraints, and acceptance evidence.
- Inspect only enough code and documentation to understand the affected boundaries.
- Use a scout or researcher only when a focused lookup would materially reduce uncertainty. Parallelize only genuinely independent investigations.
- Ask the user only when an unresolved choice materially changes behavior, architecture, scope, risk, or an irreversible action.
- Choose the smallest adequate approach. Exclude speculative hardening, abstractions, cleanup, and unrelated improvements.

Return:

1. a concise understanding of the goal;
2. the proposed approach and likely files;
3. ordered implementation steps;
4. the smallest useful validation;
5. any decision still requiring the user.
