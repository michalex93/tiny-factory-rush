---
name: fov-aware-design
description: Rules and checks for placing anything in the XR scene (machines, buffers, overflow edge, timers, grades, tutorials) so it fits the narrow Meta VR Glasses field of view and the seated 2 ft reach. Use when creating or moving scene layout, UI, onboarding cues or the overflow effect.
---
<!-- Generated from skills/fov-aware-design/SKILL.md by `npm run skills:sync`. Edit the source, not this copy. -->

# Skill: FoV-Aware Design (D-012, D-015)

## Targets
- Narrowest device: Meta VR Glasses ≈ 70° × 66° (Quest 3 ≈ 110° × 96°). Keep a 5° margin.
- Seated "airplane seat test": every interaction reachable within 0.61 m (2 ft).
- Critical state (bottleneck, overflow, contract timer, grade, current tutorial cue) must be inside the cone from the seated pose looking at the table center.

## Procedure
1. Export the current layout to JSON in the format of `tools/xr-harness/examples/layout-example.json` (head pose, look-at, elements with `critical`/`interactable` flags and `radius`).
2. Run `npm run xr:fov -- <layout.json> --device vr-glasses` (and `--device quest3` for reference). Fix every FAIL.
3. Overflow: products pile at the bottleneck first and spill over the edge **facing the player**; add a localized audio cue. Never spill on the far edge or behind the player.
4. Text: secondary only; never required to understand state; keep it within the central cone.
5. Check in the simulator/emulator with the VR Glasses profile and save a screenshot to `evidence/xr/fov/`.

## Reject when
- A critical element needs a head turn > 30°.
- An interactable is beyond 0.61 m.
- The magic moment happens outside the cone.
