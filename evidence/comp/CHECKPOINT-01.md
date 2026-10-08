# CHECKPOINT-01 — Tiny Factory Rush XR

## DEVELOPMENT CHECKPOINT
## NOT FINAL COMPETITION SUBMISSION

Date: 2026-10-08  
Branch: `feat/xr-competition-build`  
Engine claim: **PROVISIONAL IWSDK** — D-007 remains **OPEN**

### Public URL

**https://michalex93.github.io/tiny-factory-rush/**

- Hosting: GitHub Pages (`gh-pages` branch, `/`)
- Browser check: HTTP 200 for HTML + main JS bundle
- Authenticated deployer: `michalex93`

### Commit

Source packaging on `feat/xr-competition-build` (see latest `feat(xr):` / `docs(comp):` commits after Prompt 03).  
Published static tip on `gh-pages`: `625d700` (orphan deploy commit).

### Build command

```bash
npm --prefix xr-iwsdk ci
npm --prefix xr-iwsdk test
npm --prefix xr-iwsdk run build
```

IWER hand loop:

```bash
cd xr-iwsdk
npx iwsdk dev up --ai-mode agent --headless --open
node scripts/emulator-factory-loop.mjs
npx iwsdk dev down
```

### Deployment method

1. Build `xr-iwsdk/dist` (`base: './'`)
2. Publish static contents to orphan `gh-pages` (no master rewrite)
3. Pages source: `gh-pages` / `/`

### Hands-first validation

- Path: IWER `hand-right` pinch → grab → snap BOOST
- Logs: `inputSource: xr` on grab/snap/intervention/recovery
- DEV keyboard `B` gated behind `?dev=1` only
- Evidence: `evidence/xr/factory-checkpoint/EMULATOR-HAND-LOOP.json`
- Hero frames: `evidence/comp/checkpoint-01/screenshots/HERO-*.png`

### Known limitations

- Quest hardware: **UNKNOWN**
- Final performance: **UNKNOWN**
- Final engine (D-007): **OPEN**
- Final signature / overflow: PLACEHOLDER
- Continuous video file: not recorded in-agent (PNG storyboard + manual steps provided)
- Immersive XR hides DOM HUD; world-space grade board added for result visibility

### Device status

| Surface | Status |
|---|---|
| IWER hands loop | PASS (`inputSource: xr`) |
| Public URL | PASS |
| Deterministic sim | PASS |
| Quest | NOT TESTED |
| Unity Simulator kill-test | See SPRINT02 / Prompt 03 Unity note |
