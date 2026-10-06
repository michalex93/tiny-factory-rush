# Project Skills

Skills are compact task-specific operating procedures for agents. The canonical copies live here (any agent can read them; AGENTS.md lists them). Claude Code loads project skills from `.claude/skills/`, so run `npm run skills:sync` after editing — the gates fail if the mirror is stale.

Create a new one with:
```bash
npm run skill:new -- <skill-name>
```
Every SKILL.md starts with frontmatter (`name`, `description` that says WHEN to use it) and answers: what to read first, procedure, required evidence, acceptance criteria, common failure modes, stop condition.

## Workflow skills
- autonomous-task — mandatory procedure for one task (the inner loop)
- systematic-debugging — root cause before fixes
- verification-before-completion — evidence before claims
- next-task — `/next-task` (manual)
- review-diff — `/review-diff` (manual)
- handoff — `/handoff` (manual)

## Product/XR skills
- xr-product-guardian — scope tiers, wedge, gates
- xr-interaction-review — hands/gaze rules from 2025 winners
- fov-aware-design — VR Glasses FoV + 2 ft reach
- gameplay-experiment — GO/KILL experiments
- art-direction — single asset source, budgets
- performance-quest — device performance gate
- submission-evidence — Devpost package and audit
