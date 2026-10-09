# Quest ready card — H-002 + smoke

**Date:** 2026-10-08  
**Public build (latest cues):** https://michalex93.github.io/tiny-factory-rush/  
**Branch tip:** `feat/xr-competition-build` (world-space jam cue published to `gh-pages`)

Agent cannot finish H-002 without your headset. Everything else below is prepared.

---

## YOU DO THIS (one session, ~10 min)

### A — Without USB (play smoke tonight)

1. Put on the Quest.
2. Open **Meta Browser**.
3. Go to: `https://michalex93.github.io/tiny-factory-rush/`
4. Enter immersive XR / WebXR.
5. Hands only (no controllers if possible).
6. Watch for the world card:
   - idle: *Watch the line*
   - jam: **JAM → 1. Grab the glowing cube → 2. Snap it on the bright pad**
7. Grab glowing cube → snap on bright pad → see FLOW RECOVERED / grade.

Record (voice note / photo / Quest capture is enough):
- loads? yes/no
- hands tracked? yes/no
- grab works? yes/no
- snap works? yes/no
- understood what to do? yes/no
- felt fun for 30s? yes/no

### B — With USB (unlock H-002 + agent automation)

Do this when you have a cable:

1. Quest → Settings → Developer → **USB debugging ON** (Developer Mode via Meta app if needed).
2. Plug USB into this PC.
3. Put headset on once → accept **Allow USB debugging**.
4. On PC, run:

```bat
npm run quest:ready
```

Expected: `QUEST_CONNECTED: yes` and a device id.

That closes **H-002** acceptance for “ADB sees the device”.

---

## ALREADY READY (agent)

| Item | Status |
|---|---|
| Public URL | LIVE on GitHub Pages |
| World-space jam cues | Deployed |
| Checkpoint video / smoke / manifest | On branch |
| Local `adb` (platform-tools) | Installed under `.agent/platform-tools/` (gitignored) |
| Probe script | `npm run quest:ready` → `scripts/quest-ready.mjs` |
| Emulator evidence | PASS (not Quest) |
| D-007 | Still OPEN until real Quest parity |

---

## NOT READY (needs you / later)

- H-002 marked done in `tasks/queue.json` (human task)
- Real Quest grab/snap/perf evidence labeled `QUEST-*`
- Unity EditMode / Simulator Play
- Fun product (art, overflow, rhythm) — separate from “Quest connected”
