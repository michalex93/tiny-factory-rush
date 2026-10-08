# Tiny Factory Rush XR

**Tagline:** A living toy factory on your table. Fix the line with your hands before the shift collapses.

## Status

prototype / competition **development checkpoint**

> DEVELOPMENT CHECKPOINT — NOT FINAL COMPETITION SUBMISSION  
> D-007 engine decision remains **OPEN**. Quest **not verified**.

## Platform

IWSDK / WebXR — browser runtime + deterministic sim tested  
(Emulator/headset hand grab proven earlier on kill-test; this checkpoint also used DEV FALLBACK keyboard `B` for automation evidence.)

## Current features

- hands-first module manipulation (kill-test path + BOOST pad snap)
- miniature production line (source → procA → buffer → procB → sink)
- visible bottleneck / JAM
- physical (or DEV FALLBACK) intervention that changes simulation
- recovery / BOOST ON flow
- money (CASH) + shift grade (S/A/B/C) + next shift (`R`)

## Not yet verified

- Quest hardware
- final performance
- final engine
- final art
- final signature interaction (overflow is PLACEHOLDER)

## Run locally

```bash
npm --prefix xr-iwsdk ci
npm --prefix xr-iwsdk test
npm --prefix xr-iwsdk run build
npm --prefix xr-iwsdk run preview -- --host 127.0.0.1 --port 4173
# IWER-injected:
npm --prefix xr-iwsdk run dev:runtime -- --host 127.0.0.1 --port 5173
```

Controls: grab BOOST cube → snap to pad; DEV FALLBACK: `B` apply boost, `R` next shift.

## Package contents

- `screenshots/` — browser runtime frames + SIM VISUALIZATION SVGs
- `short-video/` — see note inside (recording not completed in-agent)
- `build-url.txt` — public URL status
- `build-info.md` — build provenance
- `known-limitations.md`
