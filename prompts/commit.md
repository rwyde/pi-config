---
description: Inspect, commit, and push the intended current change
argument-hint: "[message guidance]"
---

Inspect the working tree and diff. If unrelated or ambiguous changes are present, ask which belong rather than guessing. Stage only the intended files, create one commit with a concise message describing the outcome and reason, then push it to the current branch's configured upstream.

If the branch has no configured upstream or the push fails, report that and do not guess a remote or force the push. Do not amend or create a pull request unless explicitly requested.

This invocation explicitly authorizes one commit and its push. Optional message guidance:

$@
