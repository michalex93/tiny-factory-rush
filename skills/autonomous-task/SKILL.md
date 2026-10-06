---
name: autonomous-task
description: Mandatory end-to-end procedure for executing ONE task from tasks/queue.json (orient, health check, search, plan, test first, implement, verify, independent review, record evidence, commit). Use whenever you start work on a task id, when running inside the agent loop, or when asked to "do the next task".
---

# Skill: Autonomous Task

Sources this procedure is built from: Anthropic "Effective harnesses for long-running agents" (one feature at a time, verify end-to-end before marking done, leave a clean state), Claude Code best practices (give the agent a check it can run; explore → plan → code → commit; fresh context after two failed corrections; adversarial review subagent), Ralph loop (one item per loop, search before building, backpressure from tests), Superpowers (test-first, evidence before claims, root cause before fixes), Kent Beck's augmented coding (watch for deleted tests and unrequested features).

## Read first
- AGENTS.md (rules, commands, protected files)
- The task: `node scripts/tasks.mjs show <ID>`
- The skills listed in the task's `skills`
- Last 40 lines of `progress/PROGRESS.md`; `git log --oneline -15`

## Procedure
1. **Orient** — confirm branch, base commit (`.agent/current-task.json` or `.agent/session-base`) and the task's acceptance criteria. Restate the criteria to yourself as checks.
2. **Health check** — `npm run gates:quick`. Red before you start? Fix that first and record it.
3. **Search before building** — grep for existing implementations, helpers, tests. Reuse > rewrite.
4. **Plan** — 3–8 steps, smallest diff that satisfies the criteria. Anything outside scope becomes a `proposed` task.
5. **Test first** — one test (or reproducible check) per acceptance criterion; run it and see it fail for the right reason.
6. **Implement** — minimal code to make the tests pass; keep functions small; no speculative abstraction.
7. **Verify like a user** — run the task's `verify` commands, then `npm run gates`. XR/visual work: capture emulator/simulator/Operator screenshots into `evidence/<area>/<task-id>-*.png` and look at them.
8. **Independent review** — run the `verifier` subagent (tries to prove you are not done), then the `reviewer` subagent (diff vs acceptance). Fix blockers/majors only. No subagents available? Walk through `prompts/reviewer.md` yourself.
9. **Record** — append to `progress/PROGRESS.md`:
   ```
   ## YYYY-MM-DD HH:MM — <ID> — done
   - What changed: <1–3 lines>
   - Evidence: <paths / commands with results>
   - Gates: quick PASS, full PASS
   - Learnings: <gotchas the next agent needs>
   ```
   then `node scripts/tasks.mjs set <ID> done --evidence <path> ... --note "<one line>"`.
10. **Commit** — `git add -A && git commit -m "<ID>: <summary>"`. Do not push. Leave the tree clean.

## Definition of done
- Every acceptance criterion has proof (test name, evidence file or command output).
- `npm run gates` is green on the final commit.
- Progress entry appended; task marked done with evidence that matches `evidence_required`.
- No protected file touched; no test removed, skipped or weakened.

## When stuck
- Two failed approaches to the same problem → stop, write the diagnosis, `node scripts/tasks.mjs set <ID> blocked --note "<root-cause hypothesis; tried X, Y; evidence Z>"`, progress entry, commit, end.
- Needs hardware/accounts/decisions → block with `NEEDS-HUMAN: <exact ask>`.

## Common failure modes
- Declaring victory from unit tests while the feature does not work end-to-end (capture the screenshot/run).
- Doing three tasks at once. One task per session.
- "Fixing" a gate by editing the gate, the test, or the acceptance criteria.
- Leaving the tree dirty or uncommitted.

## Stop condition
Task is done per the definition above, or blocked with a written diagnosis.
