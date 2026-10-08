# Short video — Checkpoint 01

## Status

**No continuous MP4 recorded in-agent.**  
Honest substitute: ordered emulator PNG storyboard under `../screenshots/HERO-*.png` and `../../xr/marketing/silent-10s/`.

Label for any recording: **IWSDK EMULATOR — DEVELOPMENT CHECKPOINT**

## Proven interaction (logs)

`evidence/xr/factory-checkpoint/EMULATOR-HAND-LOOP.json`:

- grabSuccess `inputSource: xr`
- snapSuccess `inputSource: xr`
- interventionSuccess
- flowRecovered
- shiftEnd / grade
- no `dev-keyboard`

## Manual recording steps (Michel — ~2 min)

1. `cd xr-iwsdk && npx iwsdk dev up --ai-mode agent --open`
2. Enter XR → set input mode to Hands (IWER UI or CLI)
3. Start OS screen record (Win+G / OBS)
4. Wait for jam → pinch-grab BOOST → snap to pad → wait grade board
5. Stop at ~45–75s
6. Save as `checkpoint-01-emulator-loop.mp4` in this folder
7. Do **not** use keyboard `B` (`?dev=1` must stay off)
