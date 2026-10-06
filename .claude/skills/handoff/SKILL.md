---
name: handoff
description: End a working session cleanly: gates, progress entry, task statuses, review packet for the owner and the external reviewer. Invoke manually with /handoff.
disable-model-invocation: true
---
<!-- Generated from skills/handoff/SKILL.md by `npm run skills:sync`. Edit the source, not this copy. -->

# /handoff

1. `npm run gates` — report the result; do not hide failures.
2. Make sure every task touched in this session has the right status (done with evidence, blocked with diagnosis, or still todo) and a progress entry.
3. Commit any finished work (`<ID>: <summary>`); never commit half-done work as done.
4. `npm run review:packet` and report the file path.
5. Tell the owner, in 5 lines max: done, blocked (why), what needs them (hardware, decisions, playtests) and the next eligible task.
