# Checkpoint 01 — Evidence Manifest

**Label:** DEVELOPMENT CHECKPOINT — NOT FINAL COMPETITION SUBMISSION  
**Branch:** `feat/xr-competition-build`  
**Commit (source tip at packaging):** see `git rev-parse HEAD`  
**Environment:** IWSDK IWER managed Chromium (emulator) unless noted

| Artifact | Purpose | Input source | Emulator vs hardware | Capture method | Known limitations |
|---|---|---|---|---|---|
| Public URL `https://michalex93.github.io/tiny-factory-rush/` | Shareable static build | n/a (page load) | Browser / Pages | GitHub Pages `gh-pages` | Not Quest; immersive XR needs headset/emulator |
| `public-smoke/PUBLIC-SMOKE-01.png` + `PUBLIC-SMOKE.json` | Public build smoke | n/a | Desktop Chromium | Playwright | Not hand-loop proof |
| `screenshots/HERO-01..05.png` | Causal still chain | XR hand (prior Prompt 03) | Emulator | IWER screenshot | Immersive; DOM HUD may be hidden |
| `short-video/IWSDK-EMULATOR-HAND-LOOP.webm` | Continuous runtime video | `xr` / hand-right | Emulator | CDP `Page.captureScreenshot` + ffmpeg-static | ~8 fps stitch; not Quest |
| `short-video/IWSDK-EMULATOR-HAND-LOOP.mp4` | H.264 transcode | same | Emulator | ffmpeg-static libx264 | same |
| `short-video/VIDEO-HAND-LOOP.json` | Event trace for video run | `xr` | Emulator | console listener | `shiftStart` may miss if reset timing; intervention/grade present |
| `short-video/VIDEO-QA-frame.jpg` | Visual non-black check | n/a | Emulator | ffmpeg frame extract | Still only |
| `../../xr/marketing/silent-10s/HERO-LOOP-10S.webm/.mp4` | ~10s continuous excerpt | same run | Emulator | ffmpeg slice | Not a montage |
| `../../xr/factory-checkpoint/EMULATOR-HAND-LOOP.json` | Prior hand-loop proof | `xr` | Emulator | IWER CLI | Pre-video |
| `artifacts/tiny-factory-rush-xr-checkpoint-01.zip` | Offline uploadable build | n/a | Static | dist package | May lag latest commit until rebuilt |

## Hashes (SHA-256)

See `HASHES.txt` in this folder (generated at packaging time).

## Explicit non-claims

- Not Quest hardware validation
- Not final engine (D-007 OPEN)
- Not final art / signature mechanic
