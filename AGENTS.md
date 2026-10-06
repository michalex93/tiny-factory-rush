# AGENTS.md — Tiny Factory Rush / XR Competition

## Mission
Build a commercially credible industrial-strategy game and a deliberately smaller MR vertical slice for the Meta VR Start Developer Competition 2026 (Adapted/Updated × Gaming; deadline **Wed Nov 18, 2026, 14:00 CST**).

The XR product thesis is:
> A toy-like factory lives on the player's real table. The player observes flow problems, physically reconfigures the system, and sees the consequences immediately.

The project is a **game first**. Industrial engineering lives in the rules, not in academic vocabulary.

## What to do next
`tasks/queue.json` is the plan. Get your task with `node scripts/tasks.mjs next` (or the loop gives it to you) and execute it with **skills/autonomous-task/SKILL.md**. One task per session.

## Commands
| Command | Purpose |
|---|---|
| `npm run gates:quick` | typecheck + unit tests + queue/skills checks (fast; the Claude Stop hook runs this) |
| `npm run gates` | full gates: + build, harness fixture, FoV example, anti-cheat diff, evidence and progress checks |
| `npm test` / `npm run typecheck` / `npm run build` | individual checks |
| `node scripts/tasks.mjs next / show <id> / set <id> <status> --evidence <path> --note "..."` | task queue |
| `npm run xr:fov -- <layout.json> --device vr-glasses` | FoV + 2 ft reach check (D-012) |
| `npm run xr:harness -- <session.json>` | playtest session gates |
| `npm run review:packet` | review packet for the owner / external reviewer |
| `npm run loop -- --agent claude` | outer autonomous loop (owner runs it; agents never start it) |

## Non-negotiable principles
1. **Decisions over chores.** Every interaction must create a meaningful decision, improve legibility, or improve feel.
2. **Visible consequences.** Prefer physical queues, congestion, overflow, sound, and motion over dashboards.
3. **Hands-first MR, eyes + hands ready.** Do not port mouse UI into XR; gaze + pinch is a secondary input (D-013).
4. **Tabletop comfort.** Seated, everything within 0.61 m, critical state inside the VR Glasses FoV (D-012).
5. **One mechanic, finished.** Competition work prioritizes a tight vertical slice over breadth.
6. **Tier order.** Tier 0 → Tier 1 → Tier 2; Tier 2 only after G-T0 passes (D-011). No workers, detailed safety/quality/maintenance accounting, OEE/SPC vocabulary, UGC or complex supply chain.
7. **Evidence before opinion.** Design changes need user-test evidence, profiler evidence, competition requirements, or a clearly marked hypothesis.
8. **Preserve history.** Never rewrite or squash away evidence that the web game existed before Sep 24, 2026.

## Definition of done (every task)
- Each acceptance criterion has proof: a test that asserts it, an evidence file, or a command output.
- `npm run gates` green on the final commit.
- Progress entry appended to `progress/PROGRESS.md` with heading `— <ID> —`.
- `node scripts/tasks.mjs set <ID> done --evidence ...` with evidence matching `evidence_required`.
- Committed as `<ID>: <summary>`; tree clean; nothing pushed.

## Anti-cheat rules (the gates enforce them)
- Never delete, skip, `.only` or weaken tests; never loosen assertions to pass.
- Never edit protected files (gates.config.json → "protected": gates, loop, hooks, harness criteria, CI, prompts).
- Never change an existing task's acceptance, verify, tier, owner, lane, dependencies or due date. New work → new task with `"status": "proposed"`.
- Never invent results; unknown measurements are `null`. Say "verified in emulator/simulator" vs "verified on Quest".
- Stay on your branch; do not push, rebase, reset or switch branches.

## When stuck
After two failed approaches: write the diagnosis and `node scripts/tasks.mjs set <ID> blocked --note "..."`; use `NEEDS-HUMAN:` when a person must act (hardware, accounts, decisions). Then progress entry, commit, stop.

## Product split
### Web
- Casual industrial strategy / management; longer progression; mouse/touch; CrazyGames/Poki style distribution.

### XR
- Tabletop industrial strategy; short 3–5 min turns; physical manipulation; low text.
- Shared simulation concepts where practical (`xr/sim-core`), but **not shared UI**.

## XR provisional loop
Contract -> Build/Reconfigure -> Start -> Observe -> Problem -> Intervene -> Result -> Grade -> Reward/Draft -> Next turn.

## Hard competition gates
Before claiming the XR build is submission-ready (details in docs/xr/COMPETITION_CHECKLIST.md):
- entire experience completable hands-first; seated within 2 ft;
- critical state inside the VR Glasses FoV;
- first-use tutorial without a wall of text;
- real-room/table context materially matters;
- profiled on real target hardware, stable ≥60 fps;
- no critical console/runtime errors;
- gameplay video is real gameplay.

## Source of truth
Priority:
1. Runtime behavior and measured evidence.
2. Competition rules / official platform requirements.
3. `docs/xr/DECISIONS.md` (only the owner accepts decisions).
4. `docs/xr/PRODUCT_THESIS.md`.
5. `tasks/queue.json` and `docs/xr/ROADMAP.md`.
6. Agent suggestions.

## Skills (canonical in skills/, mirrored to .claude/skills/ by `npm run skills:sync`)
autonomous-task · systematic-debugging · verification-before-completion · fov-aware-design · xr-interaction-review · xr-product-guardian · gameplay-experiment · art-direction · performance-quest · submission-evidence · next-task · review-diff · handoff

## Change classification
PRODUCT · XR · SIM · ART · AUDIO · HARNESS · COMP · INFRA (mention it in the progress entry).

## Learnings
Agents append durable gotchas here (≤2 lines each, newest last).
- Run the loop only from a clean integration branch; `.agent/` is runtime state (gitignored).
