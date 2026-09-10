---
name: github-pr-review
description: Check out a GitHub pull request into /tmp, review its description and code for correctness using simple-software, optionally integrate with Hunk, and always generate an explain-diff HTML walkthrough.
---

# GitHub PR Review

Review one GitHub pull request without disturbing the caller's checkout. Apply the `simple-software` and `explain-diff-html` skills.

## 1. Read PR metadata

Require a GitHub PR URL. Use `gh pr view` to read at least:

```text
number, title, body, url, author, baseRefName, baseRefOid,
headRefName, headRefOid, isDraft, changedFiles, additions,
deletions, statusCheckRollup
```

Treat the description as the author's statement of intent. Check whether the implementation actually fulfills it.

## 2. Create an isolated temporary checkout

Use a fresh clone under a directory created with `mktemp -d /tmp/pr-review-XXXXXX`. Derive `OWNER/REPO` from the canonical PR URL, then:

```sh
gh repo clone OWNER/REPO "$review_dir" -- --filter=blob:none
cd "$review_dir"
gh pr checkout "$pr_url" --detach
git fetch origin "$base_ref"
```

Verify that `HEAD` is the expected head OID and that both recorded OIDs exist locally. Compare the exact reviewed revisions with:

```sh
git diff "$base_oid...$head_oid"
```

If either recorded OID is unavailable, fetch the corresponding advertised branch or PR ref and verify it before continuing. Report the exact base and head commits actually reviewed. Do not reuse, modify, or clean the caller's checkout. Leave the temporary clone available when finished and report its path.

## 3. Review the change

Review directly unless the user specifically requests additional subagents.

- Read the PR description, changed-file summary, and full diff.
- Inspect only the surrounding code and tests needed to understand changed behavior.
- Apply `simple-software`: check correctness, unmet intent, likely regressions, readable data/control flow, unnecessary complexity, and tests at meaningful boundaries.
- Judge against the repository's actual maturity and trust model. Do not invent production-hardening, exhaustive compatibility, or comprehensive-test requirements.
- Run a focused existing check only when it is useful and practical.
- Cite concrete findings with file and line locations. Separate material defects from optional suggestions, and say plainly when no material issues exist.

## 4. Optional Hunk integration

Only use Hunk when the user passes `--hunk` or explicitly asks for it.

Resolve and read its current bundled instructions:

```sh
hunk skill path hunk-review
```

Follow that skill. Do not launch interactive `hunk diff` yourself. If a matching live Hunk session exists, use `hunk session` commands to load `base_oid...head_oid`, navigate, and add only useful review comments. If no session exists, continue the normal review and report this launch command for the user:

```sh
cd "$review_dir" && hunk diff "$base_oid...$head_oid"
```

## 5. Always generate the explanation

After the correctness review, apply `explain-diff-html` to the same exact base/head comparison and surrounding code already inspected. Generate its structured JSON specification and self-contained HTML artifact outside the checkout using date-prefixed filenames that identify the repository and PR number.

The explanation should accurately reflect the PR description, reviewed commits, behavior, and material review findings. Do not repeat repository discovery that has already been completed.

## 6. Report

Return:

- PR title, URL, and exact base/head commits;
- concise review summary and findings;
- focused validation actually run;
- temporary checkout path;
- explain-diff JSON path;
- explain-diff HTML path;
- Hunk session status or launch command when requested.

Do not post a GitHub review, comment on the PR, push, merge, or delete the temporary checkout unless explicitly requested.
