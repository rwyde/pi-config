---
description: Plan and implement a software goal, optionally creating a local commit
argument-hint: "[--commit] <goal>"
---

Read and apply the `simple-software` and `software-workflow` skills.

Arguments:

$@

Execute the shared Plan phase and then the shared Implement phase for the goal. Keep the plan proportional and continue directly into implementation unless a consequential unresolved decision requires the user.

Do not automatically launch an independent review. The Implement phase's focused validation and final diff inspection are sufficient unless the user requested review or a concrete high-risk boundary warrants it.

If and only if the first argument is exactly `--commit`, treat `${@:2}` as the goal and execute the shared Commit phase after successful implementation. Otherwise treat all arguments as the goal and do not commit.

Never push or create a pull request unless explicitly requested separately.
