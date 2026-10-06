---
name: next-task
description: Pick the next eligible task from tasks/queue.json and execute it with the autonomous-task procedure. Invoke manually with /next-task (optionally pass a task id).
disable-model-invocation: true
---
<!-- Generated from skills/next-task/SKILL.md by `npm run skills:sync`. Edit the source, not this copy. -->

# /next-task

1. If an id was given ($ARGUMENTS), use it; otherwise run `node scripts/tasks.mjs next --include-pair` and take that task.
2. Write `.agent/current-task.json` with `{ "task": "<ID>", "base": "<git rev-parse HEAD>" }` so the reviewer and gates know the base.
3. Execute the task strictly with skills/autonomous-task/SKILL.md (one task only).
4. Finish with the verifier and reviewer subagents, the progress entry, `node scripts/tasks.mjs set <ID> done|blocked ...` and a commit.
5. Report: task id, verdict, evidence paths, gate result, anything not verified.
