---
name: performance-quest
description: Performance gate for Quest (≥60 fps low-percentile in a busy state, thermal run). Use when adding XR entities, particles, lights, physics or scene understanding, and before G-T0, G-FREEZE and submission.
---

# Skill: Quest Performance Gate

## Procedure
1. Profile on real target hardware (simulator numbers are not evidence for this gate).
2. Use a representative busy state (≥120 active products, overflow happening), not an empty scene.
3. Record frame timing / low-percentile FPS (Unity: OVR Metrics Tool / Profiler; WebXR: browser performance overlay or in-app frame timer).
4. Record active products, draw calls and notable effects.
5. Run 20 minutes to expose thermal degradation.
6. Prefer deterministic belt movement/waypoints over physics; pool everything; no per-frame allocations.
7. Remove expensive polish before compromising interaction clarity.

## Rule
No "should be fine" performance claims. Unknown = null.

## Output (store in evidence/perf/<date>-<build>.json)
- hardware; build/commit; scene; duration;
- measured result (avg, 1% low); active products; draw calls;
- bottleneck; pass/fail; next optimization.

## Stop condition
Current milestone performance threshold has device evidence.
