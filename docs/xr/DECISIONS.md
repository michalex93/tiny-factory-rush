# XR Decision Log

Decisions that should survive agent/model changes.

Status:
- PROVISIONAL
- ACCEPTED
- REJECTED
- SUPERSEDED
- OPEN

Only the human owner changes a decision to ACCEPTED/REJECTED.

---

## D-001
Date: 2026-10-05
Status: ACCEPTED
Decision: XR is a redesign, not a literal port of the web UI.
Reason: direct manipulation/tabletop are core to the MR value proposition; mouse-era UI is not.

## D-002
Date: 2026-10-05
Status: ACCEPTED
Decision: Industrial engineering lives in the simulation rules, not as mandatory technical vocabulary.
Reason: game-first positioning and lower cognitive load.

## D-003
Date: 2026-10-05
Status: SUPERSEDED by D-011
Decision: Original hard-exclusion scope rule.

## D-004
Date: 2026-10-05
Status: SUPERSEDED by D-016/D-026
Decision: REDLINE should become large deliberate routing rather than twitch pinching.
Reason: later research showed action can work hands-first when intent is clear; speed itself is not the enemy.

## D-005
Date: 2026-10-05
Status: PROVISIONAL
Decision: Physical WIP overflow over the real table edge is a candidate crisis / magic moment.
Reason: MR-specific and highly legible, but Table Troopers proves falling off a table is not novel by itself.
Revisit: EXP-XR-02 and 10-second silent test.

## D-006
Date: 2026-10-05
Status: PROVISIONAL
Decision: Short shifts plus a small between-shift choice remain the leading replay structure.
Reason: strong "one more shift" hypothesis at relatively low content cost.
Revisit: EXP-XR-04.

## D-007
Date: 2026-10-06
Status: OPEN
Decision: WebXR/IWSDK versus Unity/Meta XR SDK.
Resolution:
- interaction-first kill test;
- same minimal scenario;
- real Quest evidence;
- compare interaction reliability, iteration speed, performance/headroom, agent runtime tooling, scene/anchor support and implementation friction.
Important:
- no default winner from 2025 engine popularity;
- no full simulation port before stack selection;
- distribution convenience is secondary to time-to-polished-core.
Deadline: immediately after kill-test evidence, target Oct 10–12.

## D-008
Date: 2026-10-05
Status: ACCEPTED
Decision: Visual base is toy/diorama/abstract industrial, but final identity must be a distinctive premium kinetic industrial desk-toy rather than generic low-poly assets.
Reason: toy/diorama is common in MR and therefore a readability baseline, not differentiation.

## D-009
Date: 2026-10-05
Status: ACCEPTED
Decision: Preserve pre-competition Git history and evidence.
Reason: supports Adapted/Significantly Updated positioning.

## D-010
Date: 2026-10-05
Status: ACCEPTED
Decision: Share simulation concepts/code only where cleanly reusable; never force shared UI between web and XR.
Reason: platform inputs and legibility differ.

## D-011
Date: 2026-10-06
Status: ACCEPTED
Decision: Scope uses Tier 0 / Tier 1 / optional stretch, but stretch work is **not automatically unlocked** by G-T0.
- Tier 0: must ship.
- Tier 1: directly strengthens the core four criteria (reason to return, art/audio, accessibility basics, useful gaze/pinch).
- Optional stretch: owner may authorize zero or one item after a written score-per-hour review.
Reason: official rules allow only one prize per Entry. Breadth across special-award categories cannot compensate for a lower main score.

## D-012
Date: 2026-10-06
Status: ACCEPTED
Decision: Design FoV-aware for Meta VR Glasses, but do not require the entire world/layout to remain inside one static 70×66° cone.
Requirement:
- the critical current state and the next required interaction must remain comfortably discoverable;
- essential UI must not live at extreme edges;
- deliberate head movement is allowed;
- all frequent interactions remain within comfortable seated reach.
Reason: strict static compression would damage the tabletop fantasy and overfit an unreleased device.

## D-013
Date: 2026-10-06
Status: ACCEPTED (Tier 1)
Decision: Gaze + pinch is a valuable secondary input path, not a blocker for proving the core loop.
- Use eye gaze where device supports it.
- Use head/ray fallback on Quest 3/3S.
- Direct hands remain available.
Reason: gaze is explicitly valued by the 2026 technical rubric, but judges must still be able to experience the core on current Quest hardware.

## D-014
Date: 2026-10-06
Status: ACCEPTED (Tier 1)
Decision: Reason-to-return minimum for competition is:
- best grade/profit persistence;
- Daily Shift seeded by date;
- one visible cross-session growth element;
- at least one product milestone.
The complete five-product web ladder is not required before submission.
Reason: visible progression matters; five full product tiers are poor value per hour inside this deadline.

## D-015
Date: 2026-10-06
Status: PROVISIONAL
Decision: Overflow, if retained, must be diagnostic before dramatic.
Requirements:
- accumulation begins at the actual cause;
- spatial/sound cues point to that cause;
- any spill remains discoverable from the normal seated pose;
- the effect must read as an intentional crisis, not a physics bug.
Revisit: EXP-XR-02.

## D-016
Date: 2026-10-06
Status: OPEN
Decision: By Oct 18 lock the **signature interaction**, not a confused mix of interaction/effect/audio.
Candidate signature interactions:
- live grab/snap reconfiguration;
- physical REDLINE routing gate;
- another physical action proven stronger in graybox testing.
Separately evaluate:
- magic moment: overflow/crisis;
- sensory identity: factory rhythm.
Reason: what the player does, what the world does, and how success feels are different design layers.

## D-017
Date: 2026-10-05
Status: ACCEPTED
Decision: Use autonomous task queue -> isolated branch -> deterministic gates -> review packet workflow.
Reason: maximize verified progress per day.

## D-018
Date: 2026-10-05
Status: ACCEPTED
Decision: Enter Adapted / Significantly Updated Experience × Gaming.
Reason: pre-existing web project plus new MR/hands-first mode matches official examples.

## D-019
Date: 2026-10-05
Status: ACCEPTED
Decision: Repo/code/submission in English; owner quick guides may be bilingual.

## D-020
Date: 2026-10-06
Status: ACCEPTED
Decision: Optimize first for **Best Adapted / Significantly Updated Gaming Experience** and the four equal judging criteria.
Special awards guide design but do not justify bolted-on systems.
Reason: official rules limit each Entry to one prize.

## D-021
Date: 2026-10-06
Status: ACCEPTED
Decision: Stack kill test is interaction-first.
Do not build xr/sim-core plus a C# parity port before choosing the stack.
Each stack receives the same tiny local-flow test; production simulation is extracted/hardened after the stack decision.
Reason: the uncertainty being killed is XR interaction/tooling/performance, not whether we can write another simulation engine.

## D-022
Date: 2026-10-06
Status: ACCEPTED
Decision: Product-governance files are owner-protected from autonomous agents:
- AGENTS.md;
- CLAUDE.md;
- core Cursor rules;
- PRODUCT_THESIS;
- ROADMAP;
- DECISIONS;
- competition scorecard;
- root package/tooling contracts unless explicitly authorized.
Reason: agents may implement decisions; they must not silently redefine the product or their own grading environment.

## D-023
Date: 2026-10-06
Status: ACCEPTED
Decision: "Playable every night" accelerator.
After stack selection, maintain a runnable end-to-end build. The first crude walking skeleton precedes architecture perfection.
Reason: integration risk must surface immediately, not at the end of October.

## D-024
Date: 2026-10-06
Status: ACCEPTED
Decision: Art/audio/pitch work begins in parallel with gameplay, not after it.
Reason: Polish & Presentation is 25% of judging and prior portal rejection already exposed visual quality as a gate.

## D-025
Date: 2026-10-06
Status: ACCEPTED
Decision: Traffix XR launch on Oct 15 is a mandatory competitor checkpoint before signature lock.
Reason: it occupies tabletop + hands + flow/routing. Tiny Factory must remain clearly industrial-operation/strategy rather than "Traffix with boxes."

## D-026
Date: 2026-10-06
Status: ACCEPTED
Decision: Hand input is designed around measured intent, not copied implementation details from winners.
- intent history window must be tunable;
- do not hard-code "0.5 s earlier";
- do not implement pinch/claw/fist support merely because another title did;
- observe naive users' natural actions, then support the ones that matter.
Measure false activations, intended-action success and tracking-loss recovery.

## D-027
Date: 2026-10-06
Status: ACCEPTED
Decision: Competition journey must provide a complete satisfying moment within 6–8 minutes and the game's full promise within five.
Reason: judges should not need a 20-minute run to understand the entry.

## D-028
Date: 2026-10-06
Status: ACCEPTED
Decision: The autonomous loop starts conservatively (shorter runs / fewer merged tasks), then may be widened after local Windows + real-agent selftests.
Reason: eight unattended structural merges before human review create compounding risk during the highest-uncertainty phase.
