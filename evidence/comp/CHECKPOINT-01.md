# CHECKPOINT-01 — Tiny Factory Rush XR

## DEVELOPMENT CHECKPOINT
## NOT FINAL COMPETITION SUBMISSION

Date: 2026-10-08  
Branch: `feat/xr-competition-build`  
Engine claim: **PROVISIONAL IWSDK** — D-007 remains **OPEN**

### Public URL

**Not deployed this sprint.**  
Vercel / GitHub auth CLI did not complete in-session (`vercel whoami` hung; no confirmed token).  
Fallback: local runnable build (instructions below).

### Commit

HEAD at packaging time: `b66c78a` on `feat/xr-competition-build`  
Key commits: `ee12e50` (walking skeleton), `d6b7cf1` (checkpoint evidence), `b66c78a` (Unity package/OpenXR assets).

### Build command

```bash
npm --prefix xr-iwsdk ci
npm --prefix xr-iwsdk test
npm --prefix xr-iwsdk run build
npm --prefix xr-iwsdk run preview -- --host 127.0.0.1 --port 4173
# or IWER-injected:
npm --prefix xr-iwsdk run dev:runtime -- --host 127.0.0.1 --port 5173
```

Open `https://127.0.0.1:5173/` (dev) or `https://127.0.0.1:4173/` (preview).  
Self-signed TLS: accept browser warning. Emulator footage must be labeled emulator.

### Deployment method

None yet (local only). Preferred next: Vercel static from `xr-iwsdk/dist` after owner login, or GitHub Pages from `gh-pages` / Actions — **ask before push**.

### Known limitations

- Quest hardware: **UNKNOWN**
- Final performance: **UNKNOWN**
- Final engine (D-007): **OPEN**
- Final signature interaction / overflow: **PLACEHOLDER only**
- Audio: not shipped this checkpoint
- Public HTTPS URL: **not available**
- Visual screenshots may include SIM VISUALIZATION SVGs + browser captures; do not claim Quest

### Device status

| Surface | Status |
|---|---|
| Deterministic sim loop | PASS (see `evidence/xr/factory-checkpoint/LOOP-HEADLESS.json`) |
| IWSDK unit tests | PASS |
| IWSDK production build | PASS |
| IWER / browser visual | Attempted locally; package under `evidence/comp/checkpoint-01/` |
| Quest | NOT TESTED |
| Unity Simulator kill-test | NOT OBSERVED (see `evidence/xr/killtest-unity/SPRINT02-UNITY-STOP.md`) |
