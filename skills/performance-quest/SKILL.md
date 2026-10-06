# Skill: Quest Performance Gate

## Use when
Adding XR entities, particles, lights, physics, scene understanding or before release gates.

## Procedure
1. Profile on real target hardware.
2. Use a representative busy state, not an empty scene.
3. Record frame timing / low-percentile FPS.
4. Record active products, draw calls and notable effects if available.
5. Test for a representative session length to expose thermal degradation.
6. Prefer deterministic belt movement/waypoints over expensive physics where visuals allow.
7. Remove expensive polish before compromising interaction clarity.

## Rule
No "should be fine" performance claims.

## Output
- hardware;
- build/commit;
- scene;
- duration;
- measured result;
- bottleneck;
- pass/fail;
- next optimization.

## Stop condition
Current milestone performance threshold has evidence.
