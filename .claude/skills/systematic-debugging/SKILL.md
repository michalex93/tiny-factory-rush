---
name: systematic-debugging
description: Root-cause-first debugging procedure. Use when a test, typecheck, build or gate fails, when the loop's retry context reports a failure, or when behavior differs from what the task expects.
---
<!-- Generated from skills/systematic-debugging/SKILL.md by `npm run skills:sync`. Edit the source, not this copy. -->

# Skill: Systematic Debugging

Root cause before fixes (Superpowers' 4-phase process; Claude Code best practice: "address the root cause, don't suppress the error").

## Procedure
1. **Reproduce** — run the exact failing command; copy the first real error (not the last line of noise).
2. **Localize** — narrow to the smallest failing unit: one test (`npx vitest run <file> -t "<name>"`), one file, one function. Read the code path end to end.
3. **Hypothesize** — write one sentence: "It fails because X". List the evidence for and against.
4. **Test the hypothesis** — add a focused assertion or log, or a minimal failing test. Confirm or kill the hypothesis. Never change two things at once.
5. **Fix the cause** — the smallest change that makes the reproduction pass. Re-run the reproduction, then `npm run gates:quick`.
6. **Prevent** — keep the regression test. Add a one-line learning to the progress entry (and AGENTS.md "Learnings" if it will bite again).

## Forbidden "fixes"
- Deleting, skipping or loosening the failing test; adding `.only`.
- Catching and ignoring the error; adding `any`/`@ts-ignore` to silence the compiler without justification.
- Editing gates, harness criteria or acceptance criteria.
- Retrying the same change hoping for a different result.

## Escalate
Two hypotheses killed with no progress → block the task with the reproduction command, both hypotheses and the evidence.
