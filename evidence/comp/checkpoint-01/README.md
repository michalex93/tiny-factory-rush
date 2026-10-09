# Tiny Factory Rush XR — Checkpoint 01

## What it demonstrates

- miniature tabletop factory
- visible production flow
- visible jam
- hands-first physical intervention (IWER simulated hand tracking)
- immediate recovery that changes the production system in real time
- money/result
- shift grade

## Runtime

IWSDK/WebXR

## Evidence level

EMULATOR — validated in IWSDK's XR emulator using simulated hand tracking input (`inputSource: xr`).

## Public URL

https://michalex93.github.io/tiny-factory-rush/

## Continuous video

`short-video/IWSDK-EMULATOR-HAND-LOOP.webm` (+ `.mp4`) — automated CDP capture during hand pinch grab/snap.

## Not yet proven

- Quest performance
- Quest hand reliability
- final engine (D-007 OPEN)
- final signature interaction
- final art
- final balance

## Build commit

See `build-info.md` / `git log -1` on `feat/xr-competition-build`.

## Controls

- Enter XR → hands (IWER hand mode)
- Grab BOOST → snap to pad
- After grade: `R` next shift
- DEV ONLY (`?dev=1`): keyboard `B` — not used for hero evidence
