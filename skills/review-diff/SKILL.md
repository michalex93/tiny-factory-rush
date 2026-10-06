---
name: review-diff
description: Run the read-only reviewer and verifier subagents on the current changes and summarize required fixes. Invoke manually with /review-diff (optionally pass a base commit).
disable-model-invocation: true
---

# /review-diff

1. Base = $ARGUMENTS if given, else `.agent/current-task.json` base, else `.agent/session-base`.
2. Use the `verifier` subagent, then the `reviewer` subagent (prompts/reviewer.md format).
3. Merge their findings into one list: blockers, majors (with file:line and the concrete fix). Drop style nits.
4. Do not apply fixes unless asked; propose them.
