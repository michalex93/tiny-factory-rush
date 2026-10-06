# XR Validation Harness

Purpose: turn subjective XR progress into repeatable evidence.

The harness is deliberately lightweight and dependency-free. It does not automate headset interaction. It evaluates structured session records produced by humans/agents after real tests.

## Run
```bash
npm run xr:harness -- tools/xr-harness/session-template.json
```

Prefer copying the template into an evidence directory instead of editing the template.

## What it checks
Hard/near-hard gates:
- first action/reward/problem/decision/payoff timing;
- fatigue;
- interaction error rate;
- voluntary turns;
- target FPS evidence;
- critical errors;
- hands-first completion;
- seated completion;
- real-table dependency.

The harness reports PASS / WARN / KILL / MISSING.

## Important
A harness PASS does not prove the game is fun or competition-worthy. It only prevents us from forgetting explicit gates while enthusiasm does its usual damage.
