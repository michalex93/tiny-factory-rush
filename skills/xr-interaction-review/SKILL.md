# Skill: XR Interaction Review

## Use when
Implementing or reviewing grab, snap, rotate, route, menu, hand, gaze, tabletop or onboarding interactions.

## Procedure
1. Confirm task can be completed hands-first.
2. Prefer direct manipulation over 2D floating controls.
3. Keep frequent actions near tabletop/comfortable reach.
4. Make targets forgiving and visually distinct.
5. Provide non-color feedback for state.
6. Handle invalid placement and hand-loss recovery.
7. Measure errors; do not infer comfort from developer familiarity.
8. Test on real hardware before calling interaction "done".

## Review checklist
- Can a naive player discover the action?
- Is precision smaller than the hardware/input comfortably supports?
- Does the interaction require repeated fast pinches?
- Are arms held unnecessarily high?
- Does snapping reduce precision burden?
- Can the player recover from mistakes?
- Does this feel better in MR than with a mouse?

## Required evidence
At minimum: short capture + session record with error count.

## Stop condition
The interaction meets its experiment acceptance criterion or is rejected/pivoted.
