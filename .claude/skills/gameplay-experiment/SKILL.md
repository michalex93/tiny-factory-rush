---
name: gameplay-experiment
description: Template and rules for running a gameplay/UX experiment with GO/KILL criteria defined before observing. Use when a design claim is uncertain, when preparing a playtest, or when recording EXP-XR-* results.
---
<!-- Generated from skills/gameplay-experiment/SKILL.md by `npm run skills:sync`. Edit the source, not this copy. -->

# Skill: Gameplay Experiment

## Template
Hypothesis:
Prototype:
Participants:
Primary metric:
Secondary metrics:
GO:
KILL:
Confounds:
Evidence path:

## Procedure
1. Test one uncertainty at a time.
2. Build the cheapest believable prototype.
3. Define GO/KILL before observing results.
4. Avoid explaining the intended answer to participants (docs/xr/PLAYTEST_PLAN.md script).
5. Record every session with `tools/xr-harness/session-template.json` → `evidence/xr/EXP-XR-XX/session-PNN.json`; run `npm run xr:harness -- <file>`.
6. Record failures.
7. Do not reinterpret a failed metric into success after the fact.
8. Update docs/xr/EXPERIMENTS.md and propose the DECISIONS.md change only after evidence exists (the owner accepts decisions).

## Preferred measures
Behavior before opinion:
- task completion;
- error rate;
- voluntary replay;
- time-to-first-success;
- abandonment;
- correction/recovery.

Then subjective:
- comfort;
- delight;
- clarity;
- willingness to replay/share.

## Stop condition
Decision recorded: proceed, tune once, pivot, or kill.
