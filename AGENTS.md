# AGENTS.md — Tiny Factory Rush / XR Competition

## Mission
Build a commercially credible industrial-strategy game and a deliberately focused MR competition slice for Meta VR Start 2026.

Primary competition target:
**Adapted / Significantly Updated Gaming Experience**

Deadline:
**Wed Nov 18, 2026, 14:00 CST**

Read first:
1. `docs/xr/PRODUCT_THESIS.md`
2. `docs/xr/ROADMAP.md`
3. `docs/xr/DECISIONS.md`
4. the task-specific skill(s)

## Product thesis in one line
A living miniature factory runs on the player's real table; the player physically reconfigures it under controlled pressure and immediately sees/hears the consequences of the decision.

The project is a **game first**. Industrial engineering lives in the rules, not in academic vocabulary.

## Work source
`tasks/queue.json` is the execution contract.

Use:
`node scripts/tasks.mjs next`

The autonomous loop gives one task to one fresh agent session.

## Core commands
| Command | Purpose |
|---|---|
| `npm run gates:quick` | fast deterministic checks |
| `npm run gates` | full quality/evidence gates |
| `npm test` | tests |
| `npm run typecheck` | TypeScript |
| `npm run build` | web build |
| `npm run xr:harness -- <session.json>` | evaluate XR evidence |
| `npm run xr:fov -- <layout.json> --device vr-glasses` | FoV heuristic + reach check |
| `node scripts/tasks.mjs ...` | task queue |
| `npm run review:packet` | review packet |
| `npm run loop -- --agent claude` | owner-started outer loop |

## Non-negotiable principles
1. **Decisions over chores.**
2. **Visible consequences over dashboards.**
3. **Hands-first end-to-end.**
4. **Intent-aware input, not raw gesture worship.**
5. **Tabletop comfort and purposeful passthrough.**
6. **Complete crude product before isolated perfection.**
7. **Art/audio/pitch develop in parallel with gameplay.**
8. **One polished core beats broad feature coverage.**
9. **Evidence before opinion.**
10. **Preserve pre-competition Git history.**

## Do not confuse design layers
- **Signature interaction:** what the player physically does.
- **Magic moment:** what memorable crisis/payoff the world creates.
- **Sensory identity:** how flow/recovery feels and sounds.

Overflow, REDLINE and factory rhythm are not interchangeable candidates for the same thing.

## Competition journey target
A complete satisfying arc in <=8 minutes.

First-five targets:
- action <=15 s;
- product/reward <=45 s;
- clear problem <=120 s;
- meaningful intervention <=180 s;
- recovery payoff <=240 s;
- grade/next-shift invitation <=300 s.

## Product split
### Web
Casual industrial strategy / management; longer progression; mouse/touch.

### XR
Tabletop industrial strategy; short shifts; physical manipulation; low text; controlled pressure.

Share rules where cleanly reusable. Never share UI merely for reuse.

## Scope
### Tier 0
Hands-first core, signature interaction, purposeful table/MR, complete judge journey, performance, art/audio coherence, submission.

### Tier 1
Reason to return, useful gaze/pinch, accessibility basics, replayable contracts/draft where proven.

### Optional stretch
Not automatically unlocked. Owner may authorize at most one after core proof and written score-per-hour review.

Do not build workers, detailed safety/quality/maintenance accounting, OEE/SPC vocabulary, UGC, complex procurement or a long campaign during competition work.

## Main-award-first rule
Official rules allow one prize per Entry.

Do not bolt on social, agentic, multiplayer or leaderboard features merely to become eligible for another special award.

## Input rules
- no copied magic timing constants from another game;
- intent-history windows are tunable;
- observe natural grab behavior before supporting extra pose families;
- measure false activations, intended-action success and tracking recovery;
- simplify mechanics before complicating input.

## FoV rule
Meta VR Glasses are a narrow-FoV design constraint, not a command to fit the whole world in a static rectangle.

Keep:
- critical current state;
- essential UI;
- next required action

comfortably discoverable.

Deliberate head movement is allowed. Frequent interactions remain within comfortable seated reach.

## Definition of done
Every task requires:
- evidence for every acceptance criterion;
- full relevant gates green;
- append-only progress entry;
- task status/evidence updated;
- clean committed tree.

"Looks right" is not evidence.

## Anti-cheat / governance
Agents must not:
- delete/skip/weaken/focus tests;
- change task acceptance/verify/tier/owner/lane/dependencies/due date;
- edit protected product/governance/gating files;
- invent performance or headset results;
- claim emulator evidence as Quest evidence;
- silently add scope;
- push/rebase/reset/switch branches.

New discoveries -> proposed task.

## Protected product decisions
Autonomous agents implement the product; they do not redefine it.

Owner-protected files include:
- AGENTS.md;
- CLAUDE.md;
- core Cursor rules;
- PRODUCT_THESIS;
- ROADMAP;
- DECISIONS;
- COMPETITION_SCORECARD;
- root tooling/gates as configured.

## When stuck
After two failed approaches, stop guessing:
- document root-cause hypothesis;
- mark blocked;
- use `NEEDS-HUMAN:` when appropriate;
- preserve the failed branch/evidence.

## Source-of-truth priority
1. measured runtime/user evidence;
2. current official competition/platform requirements;
3. accepted decisions;
4. product thesis;
5. task contract/roadmap;
6. agent suggestions.

## Durable learnings
Do **not** append to this protected file.
Put task learnings in the append-only `progress/PROGRESS.md` entry and propose a governance change for anything that should alter product rules.
