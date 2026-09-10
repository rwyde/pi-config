# Commit

Create one local Git commit for the intended current change. Invoking `/commit`, or using `/work --commit`, is explicit authorization to commit but never to push.

- Inspect the working tree and diff before staging.
- If unrelated or ambiguous changes are present, ask which belong rather than guessing.
- Run a final check only when needed and not already demonstrated by current evidence.
- Stage only the intended files.
- Write a concise commit message describing the outcome and reason.
- Create the commit and report its hash and subject.
- Do not amend, push, create a pull request, or perform another external side effect unless explicitly requested.
