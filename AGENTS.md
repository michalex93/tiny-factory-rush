# AGENTS.md — Tiny Factory Rush / XR Competition

## Mission
Build a commercially credible industrial-strategy game and a deliberately smaller MR vertical slice for Meta VR Start 2026.

The XR product thesis is:
> A toy-like factory lives on the player's real table. The player observes flow problems, physically reconfigures the system, and sees the consequences immediately.

The project is a **game first**. Industrial engineering lives in the rules, not in academic vocabulary.

## Non-negotiable principles
1. **Decisions over chores.** Every interaction must create a meaningful decision, improve legibility, or improve feel.
2. **Visible consequences.** Prefer physical queues, congestion, overflow, sound, and motion over dashboards.
3. **Hands-first MR.** Do not port mouse UI into XR.
4. **Tabletop comfort.** Frequent interactions stay near the tabletop and within comfortable reach.
5. **One mechanic, finished.** Competition work prioritizes a tight vertical slice over breadth.
6. **No scope creep by prestige.** Do not add workers, safety, detailed quality, detailed maintenance, multiplayer, AI assistants, or complex supply-chain systems unless a recorded experiment proves they are necessary.
7. **Evidence before opinion.** Important design changes require either user-test evidence, profiler evidence, competition requirements, or a clearly marked hypothesis.
8. **Preserve history.** Do not rewrite or squash away evidence that the web game existed before the competition window.

## Product split
### Web
- Casual industrial strategy / management.
- Longer progression is acceptable.
- Mouse/touch.
- CrazyGames/Poki style distribution.
- Can preserve deeper economy and campaign systems.

### XR
- Tabletop industrial strategy.
- Short turns, physical manipulation, low text.
- Shared simulation concepts where practical, but **not shared UI**.
- Target experience: satisfying within minutes.

## XR provisional loop
Contract -> Build/Reconfigure -> Start -> Observe -> Problem -> Intervene -> Result -> Grade -> Reward/Draft -> Next turn.

## Current XR hypotheses
These are NOT facts:
- Tabletop manipulation will be comfortable enough for repeated 3–5 minute turns.
- Physical overflow over the real table edge can create a memorable MR-specific moment.
- Large routing gates can preserve REDLINE's strategic tension without twitch pinching.
- Draft/meta-progression can create "one more turn" behavior at low content cost.

All must be tested.

## Hard competition gates
Before claiming the XR build is submission-ready:
- entire experience completable hands-first;
- seated play works;
- first-use tutorial does not require a wall of text;
- critical interactions are large and forgiving;
- real-room/table context materially matters;
- build is profiled on real target hardware;
- stable target framerate is demonstrated;
- no critical console/runtime errors;
- gameplay video is real gameplay.

See `docs/xr/COMPETITION_CHECKLIST.md`.

## Working protocol for agents
Before editing:
1. Read this file.
2. Read `docs/xr/PRODUCT_THESIS.md`.
3. Read `docs/xr/ROADMAP.md`.
4. Read `docs/xr/DECISIONS.md`.
5. Read the relevant skill under `skills/`.
6. State the milestone and acceptance criteria internally before coding.

After editing:
1. Run the narrowest relevant tests.
2. Run typecheck/build if the touched code affects production.
3. Record evidence, not claims.
4. Update roadmap/decision/experiment docs only when state actually changed.
5. Do not silently change scope.

## Change classification
Every meaningful change should be one of:
- PRODUCT — player-facing loop or scope.
- XR — interaction, anchoring, comfort, scene behavior.
- SIM — simulation/rules.
- ART — visual language/legibility.
- AUDIO — feedback/spatial sound.
- HARNESS — measurement/testing.
- COMP — competition compliance/submission.
- INFRA — agent/dev infrastructure.

## Kill-switch rule
If a critical experiment hits its KILL criterion, stop polishing that hypothesis. Record the result and pivot.

## Source of truth
Priority:
1. Runtime behavior and measured evidence.
2. Competition rules / official platform requirements.
3. `docs/xr/DECISIONS.md`.
4. `docs/xr/PRODUCT_THESIS.md`.
5. Roadmap.
6. Agent suggestions.

## Forbidden agent behavior
- Do not invent test results.
- Do not say "verified" without running the check.
- Do not add dependencies for convenience without justification.
- Do not rebuild the whole web game to make XR easier.
- Do not turn the game into educational software.
- Do not optimize for code volume.
- Do not introduce a second currency without a written decision.
- Do not add another gameplay system while a core interaction is still unproven.
