# Claude Code entry point

@AGENTS.md

## Claude-specific setup
- **Hooks** (`.claude/settings.json`): SessionStart prints orientation and records the session base commit; PreToolUse denies edits to protected files; Stop runs `npm run gates:quick` when you changed something and blocks the stop while it is red (max 3 blocks; an explicit `blocked` task status is an honest stop).
- **Subagents** (`.claude/agents/`): `verifier` tries to prove the task is NOT done; `reviewer` reviews the diff against the acceptance criteria. Use both before marking a task done; fix blockers/majors only.
- **Skills**: edit `skills/<name>/SKILL.md`, then `npm run skills:sync`. Never edit `.claude/skills/` directly. Manual commands: `/next-task`, `/review-diff`, `/handoff`.
- Read `docs/xr/PRODUCT_THESIS.md`, `docs/xr/ROADMAP.md` and `docs/xr/DECISIONS.md` only when the task needs them.

Do not infer that a feature is approved merely because it appears in an old prompt, screenshot, branch, or research note. Scope is defined by the documents above and `tasks/queue.json`.
