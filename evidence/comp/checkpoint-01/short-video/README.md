# Short video — Checkpoint 01

## Status

**VIDEO_CAPTURE = PASS** (automated)

Label: **IWSDK EMULATOR — DEVELOPMENT CHECKPOINT**

## Files

| File | Notes |
|---|---|
| `IWSDK-EMULATOR-HAND-LOOP.webm` | Primary continuous capture |
| `IWSDK-EMULATOR-HAND-LOOP.mp4` | H.264 (`MP4_AVAILABLE=yes`) |
| `VIDEO-HAND-LOOP.json` | Event trace (`inputSource: xr`, no keyboard) |
| `VIDEO-QA-frame.jpg` | Still extracted for non-black QA |
| `capture-async.log` | Orchestrator log |

## Capture method

1. `iwsdk dev up --allow-browser-automation --headless --open`
2. `iwsdk browser run scripts/browser-record-and-loop.mjs`
3. Parallel CDP `Page.captureScreenshot` during IWER hand-right pinch grab/snap
4. `ffmpeg-static` encode webm+mp4

Keyboard `B` / `?dev=1` **not** used.
