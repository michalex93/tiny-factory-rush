# Stack kill-test comparison (Prompt 01B) — observations only

Date: 2026-10-08  
Branch: `feat/xr-competition-build`  
D-007: **OPEN** (no Quest evidence; owner decides later)

Desktop FPS is **not** used as a Quest predictor (Intel UHD / ~12 GB RAM host).

## Completeness

| Candidate | Runnable interaction evidence today | Class |
|---|---|---|
| IWSDK | YES — grab, rotate, snap, tracking metrics | **EMULATOR** |
| Unity | Meta XR 207 packages installed via MCP; KillTest scene present; **no** Simulator/Editor Play evidence yet | **NEEDS-HUMAN** (Editor recover + Simulator + OpenXR enable) |

## Comparison table

| Criterion | IWSDK | Unity | Evidence | Confidence |
|---|---|---|---|---|
| Time to working interaction | Same-day EMULATOR grab/snap after official scaffold | Editor open; Core/Interaction/MRUK 207 in PackageCache; Play/Simulator not observed | MCP-SESSION-01B; IWSDK evidence | High / Medium (packages only) |
| Grab | PASS | NOT OBSERVED (runtime) | IWSDK console + screenshots | High / None |
| Rotate | **PASS — EMULATOR** | NOT OBSERVED | IWSDK rotate evidence | High / None |
| Snap | PASS (`slot-right`, ~0.13 m) | Logic + EditMode tests authored; runtime NOT OBSERVED; batch EditMode blocked while Editor open | IWSDK metrics; Unity `SnapLogicTests` | High / Low |
| Tracking recovery | Metrics observed (emulator heuristic) | Logic + tests authored; runtime NOT OBSERVED | IWSDK console; Unity `IntentLogicTests` | Medium / Low |
| Gaze / head-gaze | Ray/`Hovered` highlight | Camera-forward hover fallback coded; not Play-proven | source / IWSDK | Medium / Low |
| Table placement | DEV FALLBACK + SEM living_room | DEV FALLBACK coded in Bootstrap; MRUK present but not Play-proven | labeled fallback | Medium / Low |
| Agent runtime tooling | Strong (`iwsdk` browser/xr/ecs/screenshot) | Unity Pipeline MCP used for packages/console; hung after import; XR Operator **not configured** | MCP-SESSION-01B | High / Low |
| Build friction | Low (npm create + vite) | Higher (modules, Meta npm vs All-in-One 404, URP, Simulator standalone, Android modules) | session notes | High |
| Debugging friction | Console metrics + ECS query worked | MCP useful until main-thread timeout during Meta import | Editor.log / pipeline timeouts | Medium |
| Desktop runtime | EMULATOR works on this PC | Unknown (Editor+Simulator on UHD) | — | High / Unknown |
| Quest evidence | NO | NO | — | N/A |
| Major blockers | Quest + Claude Code for unattended loop | Restart Editor if hung; enable OpenXR; install standalone Simulator; Android modules; Operator; EditMode with Editor closed | NEEDS-HUMAN.md | High |

## Desktop preflight posture (not a final engine choice)

**IWSDK LEADS IN DESKTOP PREFLIGHT** — only because it has completed EMULATOR interaction proof (including rotate) while Unity still lacks Simulator/Editor Play interaction evidence.

This is **not** `FINAL STACK = IWSDK`.

Unity package baseline for v207 is now largely present (Core + Interaction + OVR + MRUK); remaining gap is **runtime evidence**, not an empty project.

## Missing before D-007 can close

1. Unity Simulator (or at least EDITOR_FALLBACK / MCP Play) grab + rotate + snap + invalid feedback + tokens + gaze evidence
2. XR Operator evidence or exact blocker
3. Same core tasks on **real Quest** for both candidates (H-004)
4. Owner decision on D-007

## Explicit non-scores

- Winner engine popularity
- Language preference
- Personal familiarity
- Desktop FPS as Quest forecast
