# Implement

Implement the latest agreed plan in the conversation, or the supplied goal when no plan exists.

- Preserve the user's actual scope; do not add inferred workstreams or acceptance criteria.
- Maintain exactly one writer. Make small iterative changes directly when delegation would cost more than it saves. Delegate one bounded implementation only when the task is genuinely broad.
- If delegating, include only the user requirements, relevant constraints, affected boundaries, and one useful validation target. Do not attach generic security, audit, screenshot, browser-matrix, or comprehensive-test requirements.
- For bugs, prefer a focused regression test first when practical. For understood behavior, use red → green → refactor when useful. For exploratory work, establish the behavior and add tests only at stable boundaries.
- Run the smallest relevant check, inspect the resulting diff, and stop with something concrete the user can try.
- Do not launch an independent reviewer unless the user requests it or a specific high-risk boundary justifies it.
- Do not commit or push.

Report what changed, the files touched, the validation actually run, and any concrete remaining limitation.
