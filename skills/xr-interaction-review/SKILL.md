---
name: xr-interaction-review
description: Implementation and review rules for hand, gaze and tabletop interactions (grab, snap, rotate, route, menus, onboarding). Use when building or reviewing any interaction, especially grab/snap, REDLINE gates, gaze + pinch, or hand-loss handling.
---

# Skill: XR Interaction Review

## Rules taken from 2025 winners and top MR games (docs/xr/RESEARCH_2025_WINNERS.md)
1. **Pinch first.** One forgiving pinch/grab covers most actions (Tiny Golf, Table Troopers).
2. **Intent buffering.** On release, use the hand pose from ~0.5 s earlier as the intended target/aim (Table Troopers) — releases are noisy.
3. **Accept multiple grab poses.** Pinch, claw and fist all grab (Little Critters discovered players use all three).
4. **Keep items through tracking loss.** A carried module is not dropped when the hand briefly leaves tracking view; resume on reacquisition (Little Critters).
5. **Arbitrate ray vs direct grab.** Disable the ray when the pinch point is near a grabbable/world object to avoid conflicts (Pocket Lands).
6. **Distinct gestures.** No two actions with similar poses; filter to avoid false triggers (Hand Survivor).
7. **Gaze + pinch as secondary input.** Look + pinch to inspect/select; fallback to ray/head gaze on devices without eye tracking (D-013).
8. **No locomotion, everything within 0.61 m**, frequent actions near the tabletop (Final Throwdown redesigned the boss to keep players stationary).

## Procedure
1. Confirm the task can be completed hands-first.
2. Prefer direct manipulation over 2D floating controls.
3. Keep frequent actions near the tabletop and inside the FoV budget (skills/fov-aware-design).
4. Make targets forgiving (snap radius ≥ 3 cm at tabletop scale; validate in headset).
5. Provide non-color feedback for state (shape, motion, sound).
6. Handle invalid placement and hand-loss recovery explicitly.
7. Add toggles for A/B testing rules 2–5 (EXP-XR-11).
8. Measure errors; do not infer comfort from developer familiarity.
9. Test on real hardware before calling an interaction "done"; simulator/emulator evidence is labeled as such.

## Review checklist
- Can a naive player discover the action without text?
- Is required precision smaller than hand tracking comfortably supports?
- Does it require repeated fast pinches?
- Are arms held high for long?
- Does snapping reduce the precision burden?
- Can the player recover from mistakes?
- Does this feel better in MR than with a mouse?

## Required evidence
Short capture (emulator/simulator at minimum) + session record with error count; device evidence before G-T0.

## Stop condition
The interaction meets its experiment acceptance criterion or is rejected/pivoted.
