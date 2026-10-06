# Task queue

`tasks/queue.json` is the machine-readable plan the autonomous loop executes (ROADMAP.md is the human view). JSON on purpose: agents are less likely to rewrite JSON than Markdown.

## Fields
| Field | Who may change it | Meaning |
|---|---|---|
| id, title, phase, tier, owner, lane, due, depends_on, acceptance, verify, evidence_required, skills | **owner only** (gates fail if an agent changes them) | The contract |
| status | agent / loop / owner | proposed · todo · doing · done · blocked · skipped |
| attempts, notes, evidence, updated | agent / loop | Execution record |

- `owner`: `agent` (loop runs it), `pair` (agent + you present: hardware, Unity editor; run with `--include-pair`), `human` (you).
- `lane`: `xr` tasks wait until `xr.config.json` has `"stack": "unity"` or `"iwsdk"` (decision D-007).
- `tier`: 0 must ship · 1 score multipliers · 2 stretch (locked until A-050 / G-T0 passes).
- Agents add discovered work as new tasks with `"status": "proposed"`. You approve by changing it to `todo`.

## Commands
```bash
npm run tasks -- validate
npm run tasks -- next [--include-pair]
npm run tasks -- human                       # what needs you, by due date
npm run tasks -- show A-002
npm run tasks -- set A-002 done --evidence xr/sim-core/README.md --note "..."
```
