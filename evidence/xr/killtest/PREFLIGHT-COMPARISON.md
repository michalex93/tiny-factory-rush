# Stack kill-test comparison (Prompt 01B) — observations only

Date: 2026-10-06  
Branch: `feat/xr-competition-build`  
D-007: **OPEN** (no Quest evidence; owner decides later)

Desktop FPS is **not** used as a Quest predictor (Intel UHD / ~12 GB RAM host).

## Completeness

| Candidate | Runnable interaction evidence today | Class |
|---|---|---|
| IWSDK | YES — grab, rotate, snap, tracking metrics | **EMULATOR** |
| Unity | Scaffold + Hub/Editor install started; Simulator interaction **not yet observed** | **NEEDS-HUMAN** for Simulator/Operator |

## Comparison table

| Criterion | IWSDK | Unity | Evidence | Confidence |
|---|---|---|---|---|
| Time to working interaction | Same-day EMULATOR grab/snap after official scaffold | Hub installed; Editor download/install; project scaffolded; Simulator path unfinished | preflight + killtest READMEs | High for IWSDK; High that Unity unfinished |
| Grab | PASS | NOT OBSERVED in Simulator | IWSDK console + screenshots | High / None |
| Rotate | **PASS — EMULATOR** (screenshots + ECS quaternion ≠ identity) | NOT OBSERVED | `EMULATOR-during-rotate.png`, `EMULATOR-module-transform-after-rotate.json` | High / None |
| Snap | PASS (`slot-right`, ~0.13 m) | Logic + EditMode tests authored; runtime NOT OBSERVED | IWSDK metrics; Unity `SnapLogicTests` | High / Low (logic only) |
| Tracking recovery | Metrics observed (emulator heuristic) | Logic + tests authored; runtime NOT OBSERVED | IWSDK console; Unity `IntentLogicTests` | Medium / Low |
| Gaze / head-gaze | Ray/`Hovered` highlight; gazeTracking optional | Camera-forward hover fallback coded; ISDK/gaze BB not Simulator-proven | IWSDK runtime; Unity source | Medium / Low |
| Table placement | DEV FALLBACK + SEM living_room | DEV FALLBACK coded; MRUK not Simulator-proven | labeled fallback both | Medium / Low |
| Agent runtime tooling | Strong (`iwsdk` browser/xr/ecs/screenshot) | XR Operator **not configured** yet | IWSDK CLI logs; Unity NEEDS-HUMAN | High / None |
| Build friction | Low (npm create + vite) | Higher (Hub login, Android modules, Meta packages, Simulator) | session notes | High |
| Debugging friction | Console metrics + ECS query worked | Unknown until Editor opens | — | Medium / Unknown |
| Desktop runtime | EMULATOR works on this PC | Unknown (UHD may struggle with Editor+Simulator) | — | High / Unknown |
| Quest evidence | NO | NO | — | N/A |
| Major blockers | Quest + Claude Code for unattended loop | Android modules, Simulator, Operator, UNITY_PATH, Simulator captures | NEEDS-HUMAN.md | High |

## Desktop preflight posture (not a final engine choice)

**IWSDK LEADS IN DESKTOP PREFLIGHT** — only because it has completed EMULATOR interaction proof (including rotate) while Unity Simulator interaction remains blocked on unfinished local Meta/Unity setup.

This is **not** `FINAL STACK = IWSDK`.

## Missing before D-007 can close

1. Unity Simulator: grab + rotate + snap + invalid feedback + tokens + gaze/head-gaze evidence labeled **SIMULATOR**
2. XR Operator evidence or exact blocker
3. Same core tasks on **real Quest** for both candidates (H-004)
4. Owner decision on D-007

## Explicit non-scores

- Winner engine popularity
- Language preference
- Personal familiarity
- Desktop FPS as Quest forecast
