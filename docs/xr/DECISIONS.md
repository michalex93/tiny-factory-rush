# XR Decision Log

Record decisions that should survive agent/model changes.

Format:
- ID
- Date
- Status: PROVISIONAL / ACCEPTED / REJECTED / SUPERSEDED
- Decision
- Evidence/reason
- Revisit trigger

---

## D-001
Date: 2026-10-05
Status: ACCEPTED
Decision: XR is a **redesign**, not a literal port of the web UI.
Reason: direct manipulation/tabletop are core to the MR value proposition; mouse-era UI is not.

## D-002
Date: 2026-10-05
Status: ACCEPTED
Decision: Industrial engineering remains in the simulation rules, not as mandatory technical vocabulary.
Reason: game-first positioning and lower cognitive load.

## D-003
Date: 2026-10-05
Status: ACCEPTED
Decision: The competition scope excludes workers, detailed safety, detailed quality, separate maintenance, complex supply chain, multiplayer and AI assistants.
Reason: six-week scope and competition emphasis on one polished mechanic.

## D-004
Date: 2026-10-05
Status: PROVISIONAL
Decision: REDLINE should become large, deliberate routing interactions rather than twitch pinching.
Reason: expected hand-tracking/comfort risk.
Revisit trigger: EXP-XR-03.

## D-005
Date: 2026-10-05
Status: PROVISIONAL
Decision: Physical WIP overflow over the real table edge is a candidate magic moment.
Reason: MR-specific, visually legible, high marketing potential.
Revisit trigger: EXP-XR-02.

## D-006
Date: 2026-10-05
Status: PROVISIONAL
Decision: Use short 3–5 minute turns with a small draft between turns.
Reason: low content cost, replayability hypothesis, XR session fit.
Revisit trigger: EXP-XR-04.

## D-007
Date: 2026-10-05
Status: OPEN
Decision: WebXR/IWSDK versus Unity/Meta XR SDK.
Current position: do not decide from opinion.
Resolution method: 48-hour target-hardware kill test measuring interaction quality, anchoring/tooling friction and performance.

## D-008
Date: 2026-10-05
Status: ACCEPTED
Decision: Visual target is toy/diorama/abstract industrial, not realistic factory grime.
Reason: legibility, coherence, production cost and Quest performance.

## D-009
Date: 2026-10-05
Status: ACCEPTED
Decision: Preserve pre-competition Git history and evidence.
Reason: supports Adapted/Significantly Updated positioning.

## D-010
Date: 2026-10-05
Status: ACCEPTED
Decision: Share simulation concepts/code only where cleanly reusable; do not force shared UI between web and XR.
Reason: input and legibility requirements differ by platform.
