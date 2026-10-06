---
name: xr-product-guardian
description: Scope and product-fit review for the XR competition build. Use when planning features, proposing new tasks, changing the gameplay loop, or deciding whether a request fits the current tier and gate.
---
<!-- Generated from skills/xr-product-guardian/SKILL.md by `npm run skills:sync`. Edit the source, not this copy. -->

# Skill: XR Product Guardian

## Read first
- AGENTS.md
- docs/xr/PRODUCT_THESIS.md (wedge, scope tiers)
- docs/xr/DECISIONS.md
- docs/xr/ROADMAP.md (dates, gates)
- docs/xr/RESEARCH_2025_WINNERS.md (success factors)

## Procedure
1. State the player-facing problem.
2. Identify the current milestone and gate (G-P1, G-T0, G-FREEZE, G-SUBMIT).
3. Check the tier: Tier 0 first; Tier 1 multipliers next; Tier 2 only after G-T0 passes (D-011).
4. Ask whether the proposal improves a judged criterion: meaningful decision, physical legibility, interaction satisfaction, FoV/seated fit, reason to come back, polish.
5. Check the wedge: does it make us read as "automation sandbox" or "physics toy"? Then reject or reshape.
6. Classify the claim as evidence, hypothesis or preference. Hypothesis → cheapest experiment.
7. Reject work that does not advance the current gate.

## Output
- decision: BUILD / TEST / BACKLOG / REJECT;
- one-sentence reason;
- evidence needed;
- smallest next slice (as a `proposed` task if new).

## Failure modes
- adding realism because it is "industrial engineering";
- adding systems before the core interaction is proven;
- technical vocabulary as gameplay;
- treating competition novelty as a substitute for fun;
- starting Tier 2 before G-T0.

## Stop condition
A scoped, testable next action exists or the proposal is explicitly backlogged.
