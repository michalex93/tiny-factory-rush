# Factory checkpoint — browser runtime evidence

Label: **BROWSER runtime** (Chrome via Playwright, `ignoreHTTPSErrors`)  
Not Quest. Not Meta XR Simulator.

## Observed loop (2026-10-08)

| Step | Evidence |
|---|---|
| Cold start | `[factory] walking skeleton ready` + HUD `CASH 40` |
| First product | `[factory] firstProduct` |
| Jam | HUD `· JAM` + screenshot `LOOP-02-jam.png` |
| Intervention | DEV FALLBACK key `B` → `snapSuccess path: DEV_FALLBACK_KEY` + `interventionSuccess` |
| Recovery | HUD `BOOST ON` + `flowRecovered` + `LOOP-04-recovered.png` |
| Money | CASH increased with deliveries |
| Grade | Headless sim `LOOP-HEADLESS.json` ends with grade; 90s shift not waited out in browser capture |

Hand grab/snap on IWSDK emulator was previously proven in kill-test commits; this checkpoint browser capture used DEV FALLBACK keyboard for automation honesty.

## Files

- `LOOP-HEADLESS.json`
- `RUNTIME-BROWSER-LOG.json`
- `../comp/checkpoint-01/screenshots/LOOP-*.png`
- `../comp/checkpoint-01/screenshots/SIM-*.svg` (SIM VISUALIZATION — not camera)
