# XR Competition Roadmap v0.2

Status legend: TODO / DOING / BLOCKED / DONE / KILLED
All dates 2026, Celaya time (CST, UTC-6). The machine-readable version of this plan is `tasks/queue.json` (the autonomous loop executes it; see `docs/xr/AUTONOMY.md`).

## Fixed external dates
- Competition window opened: Sep 24.
- **Official deadline: Wed Nov 18, 14:00 CST** (12:00 PT).
- Judging: ~Nov 18 – Dec 9. Winners: ~Dec 11. Build must stay free and available until then.

## Internal milestones (hard)
| Date | Milestone | Gate |
|---|---|---|
| Mon Oct 12 | Stack decided (D-007) from kill-test evidence | G-P1 |
| Sun Oct 18 | Signature mechanic decided (D-016) after graybox playtest (Sat Oct 17) | — |
| Sun Nov 1 | Tier 0 core proven: G-T0 passes → Tier 2 window opens | G-T0 |
| Tue Oct 27 | Art direction locked (style board + single asset source) | — |
| Sat Nov 7, 23:59 | Feature freeze | G-FREEZE |
| Mon Nov 16, 20:00 | Internal submission | G-SUBMIT |

## Gates
- **G-P1 (kill test):** both candidate stacks (or the one that survives) show table placement, one grab, rotate/place, generous snap, simple product flow, and a target-hardware profile. Evidence in `evidence/xr/EXP-XR-01/` + perf record.
- **G-T0 (core proven):** hands-first end-to-end, seated within 2 ft, FoV check passes for critical elements (`npm run xr:fov`), ≥60 fps low-percentile in a busy state on Quest, first-five-minutes medians within targets for ≥5 naive players, signature mechanic implemented, zero critical errors.
- **G-FREEZE:** no new mechanics after this; only feel, art, audio, legibility, bugs.
- **G-SUBMIT:** `docs/xr/COMPETITION_CHECKLIST.md` fully checked with evidence links.

## Phase 0 — Foundation (Oct 5–7)
Status: DOING

Deliverables:
- [x] product thesis
- [x] agent rules
- [x] decision log
- [x] experiment register
- [x] competition checklist
- [x] harness scaffold
- [x] skill system scaffold
- [x] Meta VR Start approval (welcome email received 2026-10-05)
- [x] competitive research + success factors (`docs/xr/RESEARCH_2025_WINNERS.md`)
- [x] autonomous development system (loop, gates, review packet, hooks) — `docs/xr/AUTONOMY.md`
- [ ] Devpost registration confirmed (H-001, Oct 6)
- [ ] Quest 3/3S in hand, developer mode on (H-002, Oct 8)
- [ ] toolchains installed: Unity 6000.0 LTS + Meta XR Core SDK v207 + Meta XR Simulator; Node 22 + IWSDK CLI (H-003, Oct 7)

Exit gate: agents can start technical work without rediscovering scope, criteria or test protocol.

## Phase 1 — Technical kill test (Oct 8–12)
Agents build both kill-test scaffolds in parallel (IWSDK and Unity), simulator first, device as soon as the headset arrives.

Must prove:
- table/surface placement;
- one object grab (intent-buffered);
- rotation/placement;
- generous snapping;
- simple product flow driven by `xr/sim-core`;
- gaze + pinch selection works (eye gaze where available, fallback on Quest 3);
- target-hardware profiling.

Decision (D-007, Oct 12): pick the stack that wins on interaction quality + performance + agent tooling. Do not build content here.

## Phase 2 — Core physical loop (Oct 13–24)
Build only:
- source; belt/connection; processor; buffer; sink;
- visible queue; one bottleneck;
- overflow prototype (inside FoV, toward the player, diagnostic);
- REDLINE gate variants for EXP-XR-03;
- contracts + grade; 1-of-3 draft;
- gaze + pinch inspect/upgrade (Tier 1, cheap once Phase 1 proved it).

Graybox playtest Sat Oct 17 → signature decision Sun Oct 18.

Exit gate: a new player understands "stuff goes in -> line jams -> I fix it -> flow improves" without technical explanation.

## Phase 3 — First five minutes (Oct 25–Nov 1)
Implement:
- diegetic onboarding;
- first reward; first visible problem; first physical intervention; first payoff;
- simple grade; one draft choice;
- reason to come back skeleton (persistence + product ladder + best grade) — Tier 1 but scheduled here;
- FoV pass on the whole layout (VR Glasses budget).

Test with at least five naive players (Sat Oct 31; see `docs/xr/PLAYTEST_PLAN.md`).

Exit gate (part of G-T0): median first successful delivery < 60 s and no participant requires an engineering explanation.

## Phase 4 — Game feel and art (Oct 27–Nov 7, overlaps)
Art lock Tue Oct 27. Then work only on:
- snap quality; animation; silhouettes; audio (factory rhythm);
- spatial feedback; lighting/material coherence;
- legibility; error recovery.

EXP-XR-06 art A/B with ≥20 people by Tue Nov 3.

Exit gate: the build no longer looks or feels like a prototype.

## Phase 5 — Replayability slice (Oct 28–Nov 7, parallel)
- 2–3 contract variants; small draft pool; 4–5 turn run;
- daily contract (seeded);
- persistence verified across app restarts.

Exit gate: players voluntarily start another turn in free play.

## Tier 2 window (Nov 1–7, only if G-T0 passed)
In this order, each behind its own experiment/gate:
1. Pass-the-headset party mode (turns per player, no networking).
2. Accessibility pack (one-handed mode, left/right swap, high-contrast, captions for audio cues).
3. Async daily-contract leaderboard.
4. Spatial "foreman" callouts (agentic interaction experiment; no wall of text).
5. Colocated multiplayer — only if 1–4 are done and green.

## Phase 6 — Hardening (Nov 8–13)
Test:
- real Quest; different tables/rooms; seated play;
- left/right handed users; hand loss/reacquisition;
- pause/resume; performance + 20-minute thermal run;
- save/reload; clean-device install path.

No new mechanics.

## Phase 7 — Submission (Nov 12–16)
Prepare:
- real gameplay capture on Quest; <3 minute video that opens with the magic moment;
- English Devpost write-up organized by the four criteria + one-line tagline;
- "new features since pre-competition build" summary (Adapted division);
- screenshots; release-date statement;
- APK in release channel named "Competition" (or WebXR URL); free until winners;
- checklist audit; final rules re-check within 72 h of submission.

Internal target: Mon Nov 16, 20:00 CST.

## Current next actions
1. H-001 Devpost registration (Oct 6).
2. H-002/H-003 headset + toolchains (Oct 7–8).
3. Agents: A-002 `xr/sim-core` + golden vectors (Oct 8), then A-004/A-005 kill-test scaffolds (Oct 10).

## Scope guard
If work does not advance the current exit gate, it is backlog. Tier 2 work before G-T0 is rejected by the loop (`tasks/queue.json` dependencies).
