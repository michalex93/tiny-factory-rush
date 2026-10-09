# Fun-slice baseline — Prompt 06 Phase 0

Date: 2026-10-09  
Branch: `feat/xr-competition-build`  
Commit at baseline: `125a02e` (Quest human snap/recovery PASS)  
Public URL: https://michalex93.github.io/tiny-factory-rush/

## Tests / build (before fun changes)

| Check | Result |
|---|---|
| `npm --prefix xr-iwsdk test` | 18/18 PASS |
| `npm --prefix xr-iwsdk run build` | PASS |

## Known timings (pre-fun)

| Metric | Approx |
|---|---|
| Shift duration | 60 s |
| Jam onset | ~early (buffer fills behind slow procB) |
| Intervention | BOOST cube → pad snap |
| Recovery | jam clears on boost; weak visual payoff |

## Quest evidence (DO NOT OVERWRITE)

Preserved:

- `evidence/xr/QUEST-HUMAN-SMOKE-01.md` — grab/snap/recovery PASS (Meta Browser)
- `evidence/xr/QUEST-READY.md`
- `evidence/xr/QUEST-STATUS.md`
- Checkpoint-01 video/smoke under `evidence/comp/checkpoint-01/`

## Baseline feel (harsh)

- Healthy factory: weak / gray boxes
- Jam: readable only with cue board; overflow faint
- Recovery: state flip more than industrial satisfaction
- Audio: essentially none for factory state
- Result: grade board exists; weak replay cue

## Goal of this sprint

Make jam → grab → snap → recovery feel like **"I fixed that"** in ~2–3 minutes.
