# XR Competition Roadmap v1.0

Status legend: TODO / DOING / BLOCKED / DONE / KILLED
All dates 2026, Celaya time (CST, UTC-6).

Machine-readable execution plan: `tasks/queue.json`.
Autonomous-loop rules: `docs/xr/AUTONOMY.md`.

## External dates
- Competition opened: Sep 24.
- Official deadline: **Wed Nov 18, 14:00 CST** (12:00 PT).
- Judging: ~Nov 18 – Dec 9.
- Winner announcement: ~Dec 11.

## Internal hard dates
| Date | Milestone |
|---|---|
| Oct 6 | Final planning freeze merged |
| Oct 10–12 | Stack decision from real evidence |
| Oct 15 | Traffix XR competitor checkpoint |
| Oct 18 | Signature interaction decision |
| Oct 24 | Art direction locked |
| Nov 1 | Tier-0 core / first-five gate |
| Nov 7 | Feature freeze |
| Nov 13 | Hardening complete + gameplay capture |
| Nov 16, 20:00 | Internal submission deadline |

If headset/tooling delivery delays the stack decision, compress feature breadth, not hardening or submission margin.

## Operating principle: product before perfection
From the stack decision onward, maintain a runnable end-to-end build.

Do not spend a week perfecting an isolated subsystem that has never been experienced inside the full loop.

The order is:
1. interaction proof;
2. walking skeleton;
3. complete crude judge journey;
4. signature evidence;
5. polish;
6. optional breadth.

## Gates

### G-P1 — stack kill test
Purpose: choose the technology that gets us to a polished product fastest.

Compare the two candidates with the **same minimal scenario**:
- tabletop placement/fallback;
- grab -> move -> rotate -> release;
- forgiving snap;
- hand-loss recovery;
- simple 10-token belt animation;
- gaze/head-gaze highlight where supported;
- simulator/agent-tooling path;
- real Quest performance and interaction evidence.

Do **not** build the production simulation twice before this decision.

Decision dimensions:
- interaction reliability;
- time-to-iterate;
- target-hardware performance/headroom;
- quality of agent runtime tooling;
- anchoring/scene support;
- implementation friction;
- distribution convenience.

No engine receives a default win because it was common among prior submissions.

### G-WALK — walking skeleton
Immediately after stack selection, the chosen build must produce a crude end-to-end loop:
table -> start -> products move -> visible jam -> physical fix -> recovery -> reward.

No final art required.

Exit requirement:
a naive observer can explain the loop from a short capture.

### G-SIG — signature evidence
By Oct 18, distinguish:
- **signature interaction**: what the player physically does;
- **magic moment**: the world's memorable crisis/payoff;
- **sensory identity**: the motion/audio feedback.

Do not "choose" overflow, REDLINE and rhythm as if they were the same design category.

### G-T0 — competition core proven
Must have:
- hands-first end-to-end;
- seated play within comfortable reach;
- reliable core input with measured false activations / intended-action success;
- a complete 6–8 minute journey;
- first-five timings inside target range for naive players;
- real table materially matters;
- signature interaction implemented;
- coherent art/audio direction in the actual build;
- target hardware >= competition performance requirement with headroom;
- zero critical runtime errors.

FoV is evaluated as a comfort/legibility constraint, not as "every world object must fit a static 70×66° cone simultaneously."

### G-FREEZE
Nov 7.
No new mechanics after this gate.

Only:
- interaction reliability;
- game feel;
- art/audio;
- onboarding;
- performance;
- accessibility fixes;
- bugs;
- submission materials.

### G-SUBMIT
Every material competition claim maps to evidence.

## Parallel work lanes
Starting as soon as the stack kill test begins, work in parallel:

### Lane A — Interaction / runtime
Hands, intent, anchoring, performance, recovery.

### Lane B — Gameplay
Walking skeleton, crisis, intervention, contracts, grade, replay.

### Lane C — Art + audio
Visual identity, silhouette language, materials, factory rhythm, spatial cues.

### Lane D — Retention + pitch
Daily Shift, visible persistence, 10-second silent test, competition scorecard, trailer story.

Do not postpone Lane C until gameplay is "finished."

---

## Phase 0 — Foundation (Oct 5–6)
Status: DOING

Done:
- product thesis;
- agent rules;
- decision log;
- experiment register;
- competition checklist;
- harness scaffold;
- skill system;
- competitive research;
- autonomous loop/gates/review system.

Human prerequisites:
- Devpost registration;
- Quest access;
- local toolchains;
- loop selftest.

Exit:
repo can begin technical work without rediscovering scope.

---

## Phase 1 — Interaction-first stack kill test (Oct 7–12)

### Important change from v0.2
The kill test happens **before** building a full shared XR simulation core.

Each candidate gets the smallest comparable scenario possible.

Required:
- table placement/fallback;
- one grabbable module;
- move/rotate/snap;
- tunable intent smoothing;
- short tracking-loss recovery;
- 10 moving tokens using trivial local behavior;
- gaze/head-gaze highlight if available;
- screenshot/runtime observation through each stack's agent tooling;
- real Quest test.

Human stack decision immediately after evidence report.

Exit: G-P1.

---

## Phase 2 — Walking skeleton + signature prototypes (stack decision -> Oct 18)

### First objective: whole product in ugly form
Within 48–72 h of stack selection, create:
- source;
- one processor;
- one buffer;
- sink;
- products;
- jam;
- one intervention;
- recovery;
- money/grade;
- restart/next shift.

This is the first integrated product.

Then:
- extract/harden the deterministic simulation rules;
- add table-layout adaptation;
- prototype overflow;
- prototype REDLINE interaction variants;
- prototype factory-rhythm feedback;
- instrument hand intent.

### Oct 15 — competitor checkpoint
Review Traffix XR's actual launch materials/reviews/playthroughs.

Answer:
- what does it already own?
- what complaints appear?
- what would make Tiny Factory look derivative?
- what industrial-strategy behaviors remain clearly ours?

Do not pivot from one review. Update only if evidence materially changes differentiation.

### Oct 17 — naive graybox playtest
Test:
- interaction intent;
- overflow comprehension/delight;
- REDLINE variants;
- full rough shift comprehension.

### Oct 18 — signature lock
Owner records D-016 decision based on evidence.

Exit: G-SIG.

---

## Phase 3 — First five minutes + early product polish (Oct 18–Nov 1)

### Timing target
- action <=15 s;
- first product/reward <=45 s;
- clear problem <=120 s;
- meaningful intervention <=180 s;
- recovery payoff <=240 s;
- grade / next-shift invitation <=300 s.

### Art/audio starts early
By ~Oct 10–12:
- style-board v0;
- premium kinetic industrial desk-toy direction;
- silhouette rules;
- small palette/material system;
- audio language.

By Oct 20:
- first visual A/B and 10-second silent test.

By Oct 24:
- art direction lock.

### Naive tests
Run an early first-five test around Oct 24–25.
Run the final pre-gate first-five test around Oct 31.

Do not wait until Oct 31 to discover the onboarding is broken.

Exit: G-T0 on Nov 1.

---

## Phase 4 — Reason to come back + replayability (parallel, Oct 24–Nov 7)

Minimum:
- best grade/profit persistence;
- date-seeded Daily Shift;
- one visible cross-session growth element;
- at least one product milestone;
- 2–3 contract variants;
- small draft pool only if it improves "one more shift."

Do not require all five web product tiers before submission.
Do not require online leaderboard.

Second-session test remains evidence, not a checkbox.

---

## Optional stretch decision (after G-T0 only)

G-T0 does **not** automatically unlock a pile of Tier-2 work.

The owner writes a short score-per-hour decision and may authorize **zero or one** stretch item.

Possible candidates:
1. stronger accessibility option;
2. cheap pass-the-headset social mode;
3. online Daily Shift leaderboard;
4. agentic foreman;
5. multiplayer.

Default: build none and spend the time on polish.

Reason: official rules allow only one prize per Entry; award-category shopping is not a rational substitute for main-score quality.

---

## Phase 5 — Feature freeze and hardening (Nov 7–13)

No new mechanics.

Test:
- Quest 3/3S;
- 20-minute thermal/performance run;
- multiple tables/rooms;
- seated use;
- left/right and one-hand paths where supported;
- hand loss/reacquisition;
- false activations;
- pause/resume;
- clean install/open path;
- persistence;
- logs.

Art/audio/onboarding may still be refined.

---

## Phase 6 — Submission (Nov 12–16)

Prepare in parallel:
- gameplay capture on real Quest;
- <3 min trailer;
- Devpost text organized by four judging criteria;
- adaptation baseline evidence;
- current-build evidence;
- screenshots;
- release-date statement;
- license/attribution audit;
- distribution path;
- final rules re-check.

Trailer rule:
lead with whichever magic moment actually won the evidence gate.
Do not hard-code overflow in the shot list before that evidence exists.

Internal submit: Nov 16, 20:00 CST.

---

## Competition scorecard cadence
Update `docs/xr/COMPETITION_SCORECARD.md` at:
- stack decision;
- signature lock;
- G-T0;
- feature freeze;
- pre-submission.

The scorecard is diagnostic, not a self-awarded numeric score.

## Scope guard
If work does not improve:
- meaningful decision;
- physical legibility;
- interaction reliability;
- delight/game feel;
- repeat usage;
- or one of the four judging criteria,

it is backlog.

After this v1.0 freeze, change design only because of measured evidence, official-rule changes, or a clearly documented competitor event.
