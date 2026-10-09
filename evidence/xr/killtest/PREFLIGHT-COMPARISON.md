# Stack kill-test comparison — updated Prompt 04

Date: 2026-10-08  
Branch: `feat/xr-competition-build`  
D-007: **OPEN** (no comparable Quest evidence on both stacks)

## Evidence quality matrix

| Criterion | IWSDK emulator | IWSDK Quest | Unity simulator | Unity Quest |
|---|---|---|---|---|
| Grab | PASS | PASS (human Meta Browser) | UNKNOWN | UNKNOWN |
| Rotate | PASS | UNKNOWN | UNKNOWN | UNKNOWN |
| Snap | PASS | PASS (human Meta Browser) | UNKNOWN | UNKNOWN |
| Tracking recovery | PASS (emulator metrics) | UNKNOWN | UNKNOWN | UNKNOWN |
| Gaze | PASS (ray/hover) | UNKNOWN | UNKNOWN | UNKNOWN |
| Setup friction | Low | Low (public URL) | High (Editor/MCP/OpenXR) | UNKNOWN |
| Build health | PASS | PASS (loads on device) | Partial (packages present) | UNKNOWN |
| Evidence quality | High (logs + video + screenshots) | Medium (owner report; no fps/logs) | Low (no Play observation) | None |

## Completeness notes

| Candidate | Runnable interaction evidence | Class |
|---|---|---|
| IWSDK | YES — emulator video + Quest human grab/snap/recovery | EMULATOR + QUEST (partial) |
| Unity | Packages/OpenXR assets present; Play/Simulator interaction still not observed | NEEDS-HUMAN / BLOCKED |

## Explicit non-decision

No subjective winner. Simulator ≠ Quest. D-007 stays OPEN until both stacks have comparable **real Quest** evidence.
