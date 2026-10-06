---
name: verification-before-completion
description: Evidence-before-claims checklist. Use before saying anything is done, fixed, passing or verified, before marking a task done, and before writing a progress entry.
---
<!-- Generated from skills/verification-before-completion/SKILL.md by `npm run skills:sync`. Edit the source, not this copy. -->

# Skill: Verification Before Completion

"Evidence over claims" (Superpowers) — "have Claude show evidence rather than asserting success" (Claude Code best practices).

## Before any claim
- [ ] I ran the command myself in this session and saw the exit code (not "should pass").
- [ ] Tests that prove the acceptance criteria exist and pass; I can name them.
- [ ] `npm run gates` is green on the commit I am about to report.
- [ ] For visual/XR behavior I captured and opened a screenshot or log that shows it.
- [ ] Evidence files are inside the repo (`evidence/…`) or are stable URLs, and match `evidence_required`.
- [ ] My progress entry says what is NOT done or not verified (e.g., "not tested on device yet").

## Wording
Say "verified in the IWER emulator / Meta XR Simulator" or "verified on Quest 3" — never just "verified". Unknown measurements are `null`, not estimates.
