# Tiny Factory Rush XR — Product Thesis v0.2

Status: **provisional, experiment-driven**
Date: 2026-10-05 (v0.2 adds competitive landscape, platform direction, scope tiers and reason-to-come-back)

## One-sentence concept
A toy-like factory lives on the player's real table; the player physically builds and reconfigures it, observes visible flow problems, and makes strategic interventions whose consequences are immediate.

## Wedge (what makes us different)
**A 3–5 minute flow-crisis puzzle on your real table.** You read where the line jams, fix it with your hands, and feel the factory lock into rhythm.

- The overflow is the **diagnosis**, not a physics gag: where boxes pile up and spill tells you where the bottleneck is.
- The **real table is a constraint**: its size and edges shape the layout and the stakes.
- The reward is **systemic**: one smart intervention makes the whole line move in sync (motion + sound).

If a judge could describe us as "an automation sandbox" or "a physics toy", the wedge failed.

## What this is
- A videogame first.
- Industrial strategy expressed through systems.
- Tabletop mixed reality.
- Short, replayable turns.
- Direct hand manipulation, with eyes+hands (gaze + pinch) as a secondary input.
- Low-text, high-legibility interaction.
- A competition vertical slice before it becomes a full commercial product.

## What this is not
- An industrial-engineering teaching tool.
- A professional simulator.
- A literal VR port of the Phaser UI.
- A menu-heavy tycoon.
- A twitch hand-tracking game.
- A full Factorio competitor.
- An automation/programming sandbox (that is Loop One: Done's space).

## Competitive landscape (researched 2026-10-05)
Details and sources: `docs/xr/RESEARCH_2025_WINNERS.md`.

| Product | What it is | Why it matters to us |
|---|---|---|
| Loop One: Done | MR automation game; tiny industrial world built with your hands; seated miniature mode; solo dev, 4.7★ but few reviews | Closest concept. We must not read as "automation sandbox": we are short flow crises with diagnosis and rhythm. |
| Table Troopers | Hands-first tabletop MR tactics; units that fall off the table stay on your floor; 4.8★, Horizon+ | Proves tabletop + falling-off-table delight. Overflow alone is **not novel**; its strategic meaning is. Copy their intent-based input. |
| Galactic Traffic Control | MR routing arcade (route ships to matching ports), Mini/Micro seated modes | Flow/routing in MR exists; REDLINE must feel like strategy, not traffic arcade. |
| Pack Attack (2025 Start, Social HM) | MR party game about a delivery line; phones as controllers | Industrial/logistics theme is judge-friendly; their edge was social asymmetry. |
| HandCraft XR (2025 Start, Judges' Choice) | IWSDK tabletop builder with pinch-spawn and snap | Grab & snap on a table is table stakes, not a differentiator. |
| Little Critters (2025 Start runner-up; UploadVR Best MR Game 2025) | MR tower defense with scene-aware hand interactions | Bar for hand quality: multiple grab poses, tracking-loss rules, real-surface interactions. |

## Platform direction (Meta Connect 2026)
- Meta VR Glasses ship spring 2027: eyes + hands are the primary inputs, controllers optional, FoV ≈ 70×66° (Quest 3 ≈ 110×96°).
- SDK v207: Interaction SDK gaze interaction (eye gaze + pinch, with HMD/raycast fallback), Meta VR Simulator with a VR Glasses profile, Meta XR Operator (agents can build/test/verify in simulator or headset).
- Store shows hand-tracked titles first to hands-only users.
- The 2026 competition rubric explicitly evaluates gaze interactions (ISDK v207+), FoV-aware design, seated "airplane seat test" (every interaction within ~2 ft), hands-first end-to-end and ≥60 fps on Quest.

Consequence: we design for the **narrowest** device (D-012) and support **gaze + pinch** (D-013).

## Core player fantasy
"I built this little factory. I can see exactly why it is failing. I can fix it with my hands. When I make a smart decision, the whole system comes alive."

## Design pillars
### 1. Observe, decide, intervene, feel
The player should spend more time diagnosing and deciding than repeatedly clicking obvious actions.

### 2. The system explains itself physically
Queues, blocked machines, overflow, rhythm, smoke/stress and movement communicate state before text does.

### 3. The table matters
The real tabletop is not a background. Space, edges, reach and placement change the experience.

### 4. Strategic pressure, not reflex punishment
Time pressure may exist, but interactions must be forgiving. REDLINE is preserved as routing strategy, not rapid repetitive pinching.

### 5. Toy-like clarity
Large silhouettes, few colors, readable modules, strong snap feedback and restrained effects.

### 6. Built for the next device
Everything that matters sits in the central field of view, works seated within ~2 ft, and works with hands only or eyes + hands.

## Provisional session architecture
Turn length: ~3–5 minutes.

Loop:
1. Receive a contract/goal.
2. Build or reconfigure the line.
3. Start production.
4. Observe flow.
5. A legible problem emerges.
6. Intervene physically.
7. See and hear the result.
8. Receive grade/reward.
9. Choose one upgrade/module from a small draft.
10. Start another turn.

A run can contain 4–5 turns, but the competition build may only need enough content to prove the loop.

## Reason to come back (Tier 1, mandatory — D-014)
The rubric rewards repeat usage in two criteria (Innovation: "drive repeat usage"; Experience Design: "habit-forming purpose") plus a special award.
- **Product ladder** reused from the web game: Boxes → Toys → Smartphones → Robots → Space Tech, unlocked across sessions and visible on the table.
- **Best grade per contract** persisted; beating it is the short-term goal.
- **Daily contract**: one seeded contract per day, same for everyone (enables a leaderboard later, Tier 2).

## Core resources
Keep the visible resource model minimal:
- money / score;
- physical space;
- time / contract pressure;
- flow capacity.

Do not introduce additional currencies without evidence.

## Systems to retain from web conceptually
- source -> process -> buffer -> process -> sink;
- visible WIP;
- bottlenecks;
- route decisions;
- contracts/grades;
- upgrade trade-offs;
- product ladder (as cross-session progression);
- FLOW versus MARGIN as an underlying rule, not necessarily explicit vocabulary.

## Scope tiers (D-011 supersedes D-003)
The owner works full-time on this until the deadline, so work that raises competition odds is in scope — **in tier order**. Tier 2 starts only after gate G-T0 passes (see ROADMAP).

- **Tier 0 — must ship:** hands-first core loop, signature mechanic, MR table anchoring, seated ≤2 ft, FoV-aware layout, first five minutes, ≥60 fps on Quest, English, video.
- **Tier 1 — score multipliers:** gaze + pinch, reason to come back, art/audio polish, accessibility basics (one-handed, left/right, non-color state).
- **Tier 2 — stretch (only after G-T0):** pass-the-headset party mode (no networking), async daily-contract leaderboard, accessibility pack, short spatial "foreman" callouts (agentic interaction experiment), colocated multiplayer only if everything above is green.

Still out (low odds per hour): individual workers, detailed labor safety/ergonomics, detailed quality/inspection, separate maintenance economy, accounting inventory, CAPEX/OPEX UI, OEE/SPC vocabulary, UGC editor, complex procurement/supply chain, multiple currencies, long campaign.

## Signature-mechanic candidates
These are hypotheses to test; decision by **2026-10-18** (D-016):
1. **Grab & Snap Modules** — direct physical reconfiguration (table stakes; must be excellent, cannot be the wedge alone).
2. **Physical Overflow** — WIP spills over the real table edge **toward the player, inside the FoV**, and points at the bottleneck (D-015).
3. **Large REDLINE Gates** — strategic routing under moderate pressure.
4. **Factory Rhythm** — an efficient line creates an audible groove; congestion breaks it.

## The magic-moment hypothesis
A line overloads, boxes visibly pile up at the bottleneck and spill off the player's real table edge in front of them; the player snaps a module/buffer into place and the jam resolves with synchronized motion and sound.

## First-five-minutes target
- 0–30 s: first successful physical interaction.
- <=60 s: first product/reward.
- 2–3 min: first visible flow problem.
- 3–4 min: first meaningful physical intervention.
- <=5 min: obvious payoff and invitation to another turn.

## Commercial split
### Web
Free/ad-supported candidate after visual polish and portal validation.

### Quest/MR
Potential low-price premium/Horizon+ style product if the competition prototype proves demand and comfort.

No commercial model is considered validated yet.

## Success definition for the next phase
The project is successful in this phase if we prove:
- the tabletop interaction is comfortable;
- the loop is understandable without technical vocabulary;
- at least one MR-specific mechanic produces delight;
- players voluntarily want another turn;
- target hardware performance is acceptable;
- the vertical slice can be polished before submission.

Winning the competition is an upside, not a valid substitute for those product signals.
