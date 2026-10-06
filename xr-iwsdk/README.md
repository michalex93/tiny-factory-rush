# Tiny Factory Rush XR — IWSDK kill-test candidate

Official scaffold: `npm create @iwsdk@latest` (`@iwsdk/create@1.0.1`)  
Target: mixed reality / passthrough with grabbing, scene understanding, environment raycast.  
SDK: `@iwsdk/core@1.0.1`

## What this is

Interaction-first stack kill-test (G-P1 / task A-004):

- fallback tabletop plane
- one large grabbable module (`OneHandGrabbable` + hand pinch enabled)
- three magnetic snap slots
- ten moving tokens (render/runtime load only)
- tunable intent / tracking / snap parameters
- metric logging for later EXP-XR-01 / EXP-XR-11

## What this is not

Factory simulation, economy, overflow, REDLINE, contracts, Daily Shift, final art.

## Commands

```bash
npm install
npm run build
npm test
npm run typecheck
npm run dev          # managed IWSDK session (IWER emulator)
```

Emulator grab evidence helper (avoids PowerShell JSON quoting issues):

```bash
npx iwsdk dev up --ai-mode agent --headless --open
node scripts/emulator-grab-flow.mjs
npx iwsdk dev down
```

## Evidence

See `../evidence/xr/killtest-iwsdk/`.  
**EMULATOR ≠ QUEST.** Real headset evidence is a separate human session.

## Tunables (not design truth)

`src/killtest/config.ts` — `intentHistoryWindowMs`, `trackingLossGraceMs`, `snapRadius`.
