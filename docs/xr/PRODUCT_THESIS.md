# Tiny Factory Rush XR — Product Thesis v1.0

Status: **design freeze for implementation; change only from evidence**
Date: 2026-10-06

## One-sentence concept
A living miniature factory runs on the player's real table; the player physically reconfigures the line under controlled pressure, sees congestion become real spatial chaos, and feels the whole system recover when a smart decision works.

## Commercial-facing fantasy
**Build it. Run the shift. Rescue the line. Grow the factory.**

The game is industrial strategy, not industrial-engineering education. Real operations concepts exist in the simulation rules, but the player should understand the factory mainly by watching, touching and listening to it.

## Competition wedge
**A short industrial-strategy shift that could not play the same way on a flat screen.**

The real table must matter:
- its usable space constrains layout;
- its near edge can become part of a visible failure state;
- the player reaches into the system and changes it directly;
- the factory's spatial state, not a dashboard, explains what is going wrong.

If the experience can be described as "automation sandbox", "idle factory", "traffic routing with boxes" or "a 2D tycoon floating in MR", the wedge failed.

## What this is
- A videogame first.
- Tabletop mixed-reality industrial strategy.
- Hands-first end-to-end.
- Short shifts with clear start, crisis, intervention and result.
- Low-text, high-legibility interaction.
- Controlled pressure, not reflex punishment.
- A competition vertical slice designed to become a commercial product if validated.

## What this is not
- An educational simulator.
- A professional factory simulator.
- A literal port of the Phaser UI.
- A menu-heavy tycoon.
- A pure idle/incremental game.
- A full Factorio/Satisfactory competitor.
- A relaxed city-flow puzzle.
- A physics toy whose novelty ends after the first spill.
- A feature showcase built to chase several special awards.

## Core player fantasy
"I built this little factory. I can see exactly why it is failing. I can fix the system with my hands. When I make the right decision, the entire factory snaps back into rhythm and I make more money."

## The four roles of the core experience
Do not confuse these during implementation or playtests.

### 1. Signature interaction — what the PLAYER does
The player physically reconfigures a live production system.

Candidates to test:
- grab/snap a buffer, splitter or processing module into the live line;
- move a large routing gate;
- reroute a connection.

The signature interaction must be understandable in seconds and remain reliable with hand tracking.

### 2. Crisis / magic moment — what the WORLD does
A visible flow failure escalates into spatial chaos.

Primary hypothesis:
products visibly pile up at the cause, reach the near table edge and spill into the player's room.

Overflow is feedback and drama, **not automatically the signature interaction**.

### 3. Sensory identity — how success FEELS
A healthy line creates a coherent kinetic and audio rhythm.
Congestion breaks that rhythm.
Recovery restores it.

"Factory rhythm" is feedback/game-feel, not a separate game mode.

### 4. Strategy — why the decision MATTERS
Interventions have opportunity costs:
- spend money now or tolerate the jam;
- add buffer or increase processing;
- route urgent work or protect normal flow;
- take the safer contract or the more profitable one.

Do not add a system unless it creates a meaningful trade-off visible within the shift.

## Design pillars

### 1. Observe -> decide -> intervene -> feel
The player should spend more time understanding and choosing than repeatedly performing obvious actions.

### 2. The factory explains itself physically
Queues, machine state, overflow, motion, sound and spatial arrangement communicate state before text or statistics.

### 3. The table materially changes play
Passthrough is not decoration. Layout and failure use the player's physical surface.

### 4. Hands are interpreted by INTENT
Do not cargo-cult a single gesture or timing value from another game. Use forgiving targets, contextual arbitration, tunable intent smoothing and tracking-loss recovery; then tune from naive-player evidence.

### 5. Controlled pressure
The player can feel urgency without needing millisecond hand precision. REDLINE remains an experiment, not a commitment to slow or fast play.

### 6. Premium kinetic desk-toy identity
Toy/diorama is a readability baseline, not our identity. The target is a coherent **premium kinetic industrial desk toy**: distinctive silhouettes, tactile-looking materials, purposeful lights, satisfying mechanical motion and disciplined sound.

### 7. Product before perfection
From the stack decision onward, keep a runnable end-to-end build every day. Build the crude journey first, then replace weak parts instead of polishing isolated systems that have never worked together.

## Competition journey
The submission must deliver a complete satisfying moment in **6–8 minutes or less**, even if the eventual commercial run is longer.

### First-five-minutes target
- **0–15 s:** first successful physical action.
- **<=45 s:** first product/reward.
- **<=120 s:** first unmistakable flow problem.
- **<=180 s:** first meaningful strategic intervention.
- **<=240 s:** visible/audible recovery payoff.
- **<=300 s:** grade/reward plus clear invitation to another shift.

A judge must experience the whole game's promise before minute five.

## Provisional commercial session architecture
A commercial shift may later run ~3–5 minutes and a run may contain several shifts. Do not force that structure into the competition build until the 6–8 minute judge journey is excellent.

Base loop:
1. Receive a clear contract.
2. Build/reconfigure.
3. Start shift.
4. Observe flow.
5. Crisis becomes legible.
6. Make one meaningful intervention.
7. See/hear the consequence.
8. Receive money/grade.
9. Choose a small upgrade/draft.
10. Continue or stop cleanly.

## Reason to come back — minimum competition implementation
"Reason to return" must exist, but it must not become a second game.

Tier-1 minimum:
- best grade / best profit saved;
- deterministic Daily Shift seeded by date;
- one **visible** cross-session growth element on the table (for example a workshop shelf/trophy/product display);
- at least one meaningful product milestone in the competition build.

The full web ladder (Boxes -> Toys -> Smartphones -> Robots -> Space Tech) is a commercial roadmap, not a requirement to implement five complete product tiers before submission.

No online leaderboard is required for the competition slice.

## Core resources
Keep visible resources minimal:
- money / score;
- physical space;
- time / contract pressure;
- line capacity represented in the world.

Do not add currencies simply to make progression look deeper.

## Systems retained conceptually from web
- source -> process -> buffer -> process -> sink;
- visible WIP / queues;
- bottlenecks;
- route decisions;
- contracts and grades;
- economic trade-offs;
- FLOW vs MARGIN as an underlying rule, not required vocabulary.

## Systems outside the competition core
These remain backlog unless direct evidence changes the decision:
- individual workers;
- detailed labor safety / ergonomics;
- detailed quality inspection;
- separate maintenance economy;
- accounting inventory;
- CAPEX/OPEX dashboards;
- OEE/SPC vocabulary;
- UGC editor;
- complex procurement/supply chain;
- multiple currencies;
- long campaign.

## Optional stretch policy
There is **no automatic Tier-2 feature window**.

After the core gate passes, the owner may authorize **at most one** stretch feature if a written score-per-hour review shows it strengthens the main 4 judging criteria or a special award without threatening polish.

Candidates only:
- extra accessibility capability;
- pass-the-headset social mode;
- online daily leaderboard;
- agentic/foreman experiment;
- multiplayer.

Special awards are design signals, not a shopping list. Official rules limit an Entry to one prize.

## Competitive landscape
Closest threats / references:
- **Table Troopers:** validates hands-first tabletop strategy and intent-aware input; its falling-off-table moment means "things fall off the table" alone is not novel.
- **Loop One: Done:** already occupies tactile MR factory automation; we must not read as an automation sandbox.
- **Traffix XR: Cities of Tomorrow:** launches 2026-10-15 in the tabletop flow/routing space. Our differentiation must be industrial operation, money/risk and live crisis management, not merely "tabletop + flow + hands".
- **Tiny Golf / Little Critters / 2025 winners:** show the value of an obvious premise, one memorable physical interaction, early naive playtests and product-level polish.

Mandatory competitor checkpoint: review Traffix XR immediately after launch before signature lock.

## Main award strategy
Primary target:
**Best Adapted / Significantly Updated Gaming Experience.**

Secondary design targets:
- Best First Five Minutes;
- Boldest Original Concept;
- Best Reason to Come Back.

Do not add unrelated features solely to become eligible for more categories. One Entry can receive only one prize.

## Success definition for development
Before feature freeze we must prove:
- core hand interaction is reliable enough that users blame their decision, not tracking;
- a naive player understands the basic flow without industrial vocabulary;
- the real table materially affects the experience;
- the 6–8 minute journey has a beginning, crisis, intervention and payoff;
- one MR-specific moment is genuinely memorable;
- players voluntarily continue/replay;
- target hardware meets performance requirements with headroom;
- art/audio read as a coherent product, not a prototype.

Winning is the upside. These product signals are the controllable objective.
