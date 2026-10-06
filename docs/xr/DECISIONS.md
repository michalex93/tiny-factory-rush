# XR Decision Log

Record decisions that should survive agent/model changes.

Format:
- ID
- Date
- Status: PROVISIONAL / ACCEPTED / REJECTED / SUPERSEDED / OPEN
- Decision
- Evidence/reason
- Revisit trigger

Agents may propose decisions but only the human owner flips a decision to ACCEPTED/REJECTED.

---

## D-001
Date: 2026-10-05
Status: ACCEPTED
Decision: XR is a **redesign**, not a literal port of the web UI.
Reason: direct manipulation/tabletop are core to the MR value proposition; mouse-era UI is not.

## D-002
Date: 2026-10-05
Status: ACCEPTED
Decision: Industrial engineering remains in the simulation rules, not as mandatory technical vocabulary.
Reason: game-first positioning and lower cognitive load.

## D-003
Date: 2026-10-05
Status: SUPERSEDED by D-011 (2026-10-05)
Decision (original): The competition scope excludes workers, detailed safety, detailed quality, separate maintenance, complex supply chain, multiplayer and AI assistants.
Reason (original): six-week scope and competition emphasis on one polished mechanic.

## D-004
Date: 2026-10-05
Status: PROVISIONAL
Decision: REDLINE should become large, deliberate routing interactions rather than twitch pinching.
Reason: expected hand-tracking/comfort risk.
Revisit trigger: EXP-XR-03.

## D-005
Date: 2026-10-05
Status: PROVISIONAL
Decision: Physical WIP overflow over the real table edge is a candidate magic moment.
Reason: MR-specific, visually legible, high marketing potential. Note: Table Troopers already ships "units fall off the table" — novelty must come from strategic meaning (D-015).
Revisit trigger: EXP-XR-02, EXP-XR-08.

## D-006
Date: 2026-10-05
Status: PROVISIONAL
Decision: Use short 3–5 minute turns with a small draft between turns.
Reason: low content cost, replayability hypothesis, XR session fit. 2025 hand-award winner Hand Survivor used the same skill-draft pattern.
Revisit trigger: EXP-XR-04.

## D-007
Date: 2026-10-05 (updated with research)
Status: OPEN — **decide by Mon 2026-10-12**
Decision: WebXR/IWSDK versus Unity/Meta XR SDK.
Resolution method: 48-hour kill test on target hardware (simulator first), scored with the table below. The owner decides; agents write the evidence report (task A-006).

| Criterion (weight) | Unity + Meta XR SDK v207 | IWSDK (WebXR) |
|---|---|---|
| Rubric fit (30%) — rubric names gaze interactions "ISDK v207+", hand tracking, passthrough, spatial anchors | ISDK gaze interaction + building blocks, MRUK table detection | Hand tracking, hit-test, scene understanding; ISDK gaze not available |
| Agent automation (25%) | Meta XR Operator (MCP): screenshots, head pose, pinch/poke/grab, gaze-and-pinch, scene graph, custom C# tools; best in Meta XR Simulator (Windows/macOS) | `iwsdk` CLI + `iwsdk-runtime` MCP + managed Playwright; headless "agent" mode; runs in CI/cloud |
| Performance headroom (20%) | Native; mature profiling | Must prove 60 fps low-percentile with many moving products in the browser |
| Speed of iteration / code reuse (15%) | Port sim to C# (parity via golden vectors) | Reuse TypeScript sim directly |
| Distribution (10%) | APK in "Competition" release channel | URL; no install for judges |

Evidence so far (2025 edition): 68% of 655 projects used Unity; no WebXR project won a main-track prize (WebXR wins came from an IWSDK-only award that no longer exists, plus Judges' Choice). Default lean: **Unity**, unless the kill test shows IWSDK clearly better on interaction + performance.
Revisit trigger: kill-test evidence (EXP-XR-01, EXP-XR-07).

## D-008
Date: 2026-10-05
Status: ACCEPTED
Decision: Visual target is toy/diorama/abstract industrial, not realistic factory grime.
Reason: legibility, coherence, production cost and Quest performance.

## D-009
Date: 2026-10-05
Status: ACCEPTED
Decision: Preserve pre-competition Git history and evidence.
Reason: supports Adapted/Significantly Updated positioning.

## D-010
Date: 2026-10-05
Status: ACCEPTED
Decision: Share simulation concepts/code only where cleanly reusable; do not force shared UI between web and XR.
Reason: input and legibility requirements differ by platform.

## D-011
Date: 2026-10-05
Status: ACCEPTED
Decision: Replace hard exclusions with **scope tiers**. Tier 0 = must ship; Tier 1 = score multipliers (gaze + pinch, reason to come back, art/audio, accessibility basics); Tier 2 = stretch (pass-the-headset party mode, accessibility pack, async leaderboard, spatial foreman callouts, colocated multiplayer last). Tier 2 work starts only after G-T0 passes.
Reason: owner works full-time until the deadline and wants anything that raises competition odds; 2025 data shows multiplayer over-represented among gaming winners (7 of 15) and special awards exist for social, accessibility, agentic interaction and reason-to-come-back. Breadth only pays after core quality (polish is 25% of the score).
Revisit trigger: G-T0 result on Nov 1.

## D-012
Date: 2026-10-05
Status: ACCEPTED
Decision: Design for the narrowest target FoV (Meta VR Glasses ≈ 70×66°) with a comfort margin; all critical state and interactables inside that cone from the seated pose; every interaction within ~2 ft (0.61 m).
Reason: rubric evaluates "FoV-aware design" and the "airplane seat test"; Meta advises moving key UI toward the center for the narrower FoV.
Check: `npm run xr:fov -- <layout.json>` must pass for the current layout.

## D-013
Date: 2026-10-05
Status: ACCEPTED (Tier 1)
Decision: Gaze + pinch is a secondary input: look at a machine + pinch = inspect/select/upgrade. Fallback to raycast/head gaze on devices without eye tracking (Quest 3/3S).
Reason: rubric names gaze interactions explicitly; VR Glasses make eyes + hands primary.
Revisit trigger: EXP-XR-09.

## D-014
Date: 2026-10-05
Status: ACCEPTED (Tier 1)
Decision: Reason to come back is mandatory: persistence + product ladder (Boxes → Toys → Smartphones → Robots → Space Tech) + best grade per contract + daily seeded contract.
Reason: two of four criteria mention repeat usage; special award "Best Reason to Come Back".
Revisit trigger: EXP-XR-10.

## D-015
Date: 2026-10-05
Status: PROVISIONAL
Decision: Overflow must be (a) visible — happens at the table edge facing the player, inside the FoV, with a localized audio cue; and (b) diagnostic — products pile up visibly at the bottleneck before spilling, so the spill points at the cause.
Reason: a spill outside a 66° vertical FoV is a lost magic moment; a meaningless spill reads as a bug or a copy of Table Troopers.
Revisit trigger: EXP-XR-02, EXP-XR-08.

## D-016
Date: 2026-10-05
Status: OPEN — **decide by Sun 2026-10-18**
Decision: Choose the signature mechanic (overflow, REDLINE gates, factory rhythm, or a combination) from graybox playtest evidence (Sat Oct 17).
Reason: winners lead with one interaction understandable in seconds; we cannot polish four.

## D-017
Date: 2026-10-05
Status: ACCEPTED
Decision: Development runs through an autonomous system: task queue (`tasks/queue.json`) → outer loop (`npm run loop`) → deterministic gates with anti-cheat (`npm run gates`) → adversarial reviewer → review packet for the human + external reviewer. See `docs/xr/AUTONOMY.md`.
Reason: maximize progress per day while keeping evidence; based on Anthropic's long-running harness guidance, Claude Code best practices, the Ralph loop, Superpowers, Spec Kit and Kent Beck's augmented-coding warnings.

## D-018
Date: 2026-10-05
Status: ACCEPTED
Decision: Enter **Adapted/Significantly Updated Experience × Gaming**. Pre-existence evidence: Git history since 2026-09-05 and the CrazyGames submission of 2026-09-23; the significant update is a new MR hands-first mode on a new platform.
Reason: rules list "introducing a mixed reality interaction mode" and "hand interactions" as significant updates; any pre-existing build qualifies.

## D-019
Date: 2026-10-05
Status: ACCEPTED
Decision: Repo docs, code and all submission materials in English; owner-facing quick guides may be bilingual.
Reason: rules require English; agents perform best with one language in the repo.
