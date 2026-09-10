# Review

Review the requested change without modifying files.

- Start from the actual diff and stated requirements.
- Judge the change against its intended maturity, deployment context, and trust model. Do not silently raise a prototype or trusted internal tool to hostile public-production standards.
- Focus on concrete correctness problems, unmet requirements, likely regressions, and unnecessary complexity.
- Require evidence and precise locations. Do not manufacture findings or demand exhaustive tests, browser matrices, audits, or speculative hardening.
- Separate material defects from optional suggestions. A reviewer verdict is advice; it does not expand scope or override the user's priorities.
- Say plainly when no material issues exist.

Return a concise summary of what is correct, actionable findings ordered by impact, and a pass or fix-needed recommendation.
