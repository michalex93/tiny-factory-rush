# IWSDK interaction kill-test evidence

Date: 2026-10-06  
Branch: `feat/xr-competition-build`  
Stack: Immersive Web SDK / WebXR  
SDK: `@iwsdk/core@1.0.1` via official `npm create @iwsdk@latest` (`@iwsdk/create@1.0.1`)  
Mode labels used below: **EMULATOR** (IWER managed browser) — **not Quest**.

## Scenario implemented

- 1 DEV FALLBACK table plane (scene-understanding ready; no real room plane required in emulator)
- 1 large module: grab / move / rotate / release via `OneHandGrabbable` + `RayInteractable`
- 3 magnetic snap pads (`snapRadius` TUNABLE, default 0.18 m)
- 10 deterministic moving tokens (runtime/render load only — no factory sim)
- Hover highlight via `Hovered` (ray / head-gaze path)
- Optional `gazeTracking` + framework `gaze.trackingLossGraceSeconds` (TUNABLE)
- Intent/tracking tunables: `intentHistoryWindowMs`, `trackingLossGraceMs`, `snapRadius`
- Metrics: grabAttempt, grabSuccess, release, snapSuccess, snapRejected, falseActivation, trackingLost, trackingRecovered, interactionDuration

## Commands

```bash
npm create @iwsdk@latest xr-iwsdk -- -y --target ar --language ts --grabbing --scene-understanding --environment-raycast --no-git --install
npm --prefix xr-iwsdk run build
npm --prefix xr-iwsdk test
npm --prefix xr-iwsdk run typecheck
# runtime (EMULATOR):
cd xr-iwsdk && npx iwsdk dev up --ai-mode agent --headless --open
# grab flow helper (node; avoids PowerShell JSON mangling):
node scripts/emulator-grab-flow.mjs
npx iwsdk dev down
```

## Evidence inventory

| File | Label | What it shows |
|---|---|---|
| `EMULATOR-killtest-scene.png` | EMULATOR | XR session with fallback table, module, snap pads, tokens, IWER living_room mesh, controllers |
| `EMULATOR-after-grab-snap.png` | EMULATOR | After scripted squeeze→move→release toward right pad |
| `EMULATOR-during-rotate.png` | EMULATOR | Module held (yellow) with visible non-identity orientation while squeeze held |
| `EMULATOR-after-rotate-release.png` | EMULATOR | Module released still tilted; snapRejected out-of-range after rotate path |
| `EMULATOR-module-transform-after-rotate.json` | EMULATOR | ECS Transform.orientation quaternion ≠ identity after grab→rotate→release |
| `EMULATOR-console-rotate.json` | EMULATOR | Metrics: grabAttempt/Success, release, interactionDuration, snapRejected |
| `EMULATOR-console-killtest.json` | EMULATOR | Console including scene-ready + tracking events |
| `EMULATOR-console-after-grab.json` | EMULATOR | Metrics: grabAttempt/Success, release, snapSuccess→`slot-right`, interactionDuration |
| `build-log.txt` | BUILD | Production vite build result |
| `test-log.txt` | TEST | Vitest snap/intent unit results |
| `session-emulator.json` | EMULATOR | Harness session stub (`testedOnRealHardware=false`, human metrics null) |

## Observed EMULATOR results

- Build: PASS
- Unit tests (snap + intent/tracking machines): PASS (11)
- Managed runtime + XR enter: PASS
- Scripted controller grab → move → release: PASS
- **Rotate: PASS — EMULATOR** (`scripts/emulator-rotate-flow.mjs`; screenshots + ECS orientation `[0.154, 0.907, -0.174, 0.350]` ≠ identity)
- Snap success to `slot-right` at distance ≈0.13 m (inside 0.18 m radius): PASS
- Tracking lost/recovered metrics fired (heuristic + emulator device connect): observed
- Gaze eye-tracking: not claimed on Quest 3; head/ray `Hovered` highlight path present
- Real Quest: **NOT TESTED**

## Tunables (NOT design truth)

Defaults in `xr-iwsdk/src/killtest/config.ts`:
- `intentHistoryWindowMs = 180`
- `trackingLossGraceMs = 250`
- `snapRadius = 0.18`
- Framework gaze grace: `trackingLossGraceSeconds = 0.25` in `iwsdk.config.json`

## FoV checker (reference only)

`npm run xr:fov -- evidence/xr/killtest-iwsdk/fov-layout.json --device vr-glasses`

Result: horizontal/vertical angles for critical module + slots are comfortable; seated **reach** heuristic flags ~0.95–1.03 m table depth as OUT-OF-REACH against the 0.61 m airplane-radius default. Per product FoV rule (D-012), we did **not** shrink the tabletop into nonsense to force a static pass. Discoverability of current module + next snap remains the requirement.

## Not in this slice

Factory sim, overflow, contracts, REDLINE, Daily Shift, final art, audio identity.
