# IWSDK rotate evidence — EMULATOR

Date: 2026-10-06  
Script: `xr-iwsdk/scripts/emulator-rotate-flow.mjs`  
Label: **EMULATOR** (not Quest)

## Procedure

1. `npx iwsdk dev up --ai-mode agent --headless --open`
2. `npx iwsdk xr enter`
3. `node scripts/emulator-rotate-flow.mjs`
4. `npx iwsdk dev down`

## Observed

| Step | Result |
|---|---|
| grab (squeeze) | `grabAttempt` + `grabSuccess` |
| rotate while held | Controller orientation yaw/pitch applied; module yellow (grabbed) in `EMULATOR-during-rotate.png` |
| release | `release` + `interactionDuration` |
| post-release orientation | ECS `Transform.orientation` ≈ `[0.154, 0.908, -0.174, 0.350]` (not identity) in `EMULATOR-module-transform-after-rotate.json` |
| snap | `snapRejected` out-of-range (distance ~0.19 m) — expected for this rotate path; invalid feedback path exercised |

## Verdict

**Rotate: PASS — EMULATOR**
