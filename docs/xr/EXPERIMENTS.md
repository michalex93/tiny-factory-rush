# XR Experiment Register

No hypothesis becomes a permanent system merely because it sounds good.

## EXP-XR-01 — Tabletop comfort and hand reliability
Hypothesis:
A player can manipulate the core modules on a table for 10 minutes without significant fatigue or repeated tracking errors.

Prototype:
Graybox table, 3–5 modules, grab/rotate/snap loop.

Sample:
Minimum 3 people for first kill test; expand if promising.

Measure:
- fatigue rating 1–5 after 5 and 10 min;
- interaction errors/min;
- lost-hand incidents;
- task completion time;
- qualitative frustration.

GO:
- fatigue median <= 2;
- <1 material interaction error/min after onboarding;
- no repeated blocker across participants.

KILL/PIVOT:
- fatigue median >=3;
- repeated oclusion/precision failure prevents normal play;
- basic snap task remains frustrating after tuning.

---

## EXP-XR-02 — Overflow magic moment
Hypothesis:
Visible products spilling beyond the real table edge creates an MR-specific memorable moment and clearly communicates congestion.

Prototype:
10–15 second clip or working graybox.

Measure:
- comprehension: "what went wrong?";
- delight rating;
- share/show intent;
- spontaneous comments.

GO:
At least 70% correctly identify the congestion problem **and point at the bottleneck** without explanation, at least 40% say they would show/share the moment, and ≥80% saw the spill happen (it occurred inside their field of view — see EXP-XR-08).

KILL:
<50% understand the state change, the effect reads primarily as a bug, or most participants missed the spill because it happened outside their view.

---

## EXP-XR-03 — REDLINE interaction
Hypothesis:
Large physical routing gates preserve tension while avoiding twitch hand-tracking failure.

Variants:
A. rapid pinch toggle;
B. large physical gate;
C. pre-plan route before release.

Measure:
- errors/min;
- fatigue;
- perceived control;
- fun;
- time-to-correct route.

GO:
One variant clearly dominates on control + fun without high fatigue.

KILL:
All real-time variants produce repeated input frustration -> remove live REDLINE from competition build.

---

## EXP-XR-04 — One more turn
Hypothesis:
Short turns plus a 1-of-3 draft produce voluntary replay.

Protocol:
20 minutes free play after tutorial. Do not ask the player to continue.

Measure:
Number of turns voluntarily started.

GO:
Median >=3 turns.

KILL:
Median =1 and exit reason is lack of interest rather than usability/bug.

---

## EXP-XR-05 — Tutorial without wall of text
Hypothesis:
A naive player can complete the first production and understand the first jam through spatial cues.

Measure:
- time to first successful delivery;
- number of verbal interventions by facilitator;
- incorrect repeated actions.

GO:
Median first delivery <60 s and zero facilitator explanation of industrial terminology.

KILL:
Median >120 s or participants need explicit conceptual explanation.

---

## EXP-XR-06 — Art-direction gate
Hypothesis:
A coherent toy/diorama visual system materially improves appeal over current prototype visuals.

Method:
Blind A/B still/thumbnail comparison with >=20 people.

GO:
>=75% preference for new direction.

KILL:
<50% preference -> art direction is not solving the entry problem.

---

## EXP-XR-07 — Target hardware performance
Hypothesis:
The competition vertical slice can meet the chosen performance target on real target hardware.

Measure:
- frame timing;
- low-percentile FPS;
- draw calls;
- active product count;
- thermal degradation over a representative session.

GO:
Meets competition/platform threshold with headroom in representative play.

KILL/PIVOT:
Core mechanic cannot meet target without removing its defining visual behavior.

## EXP-XR-08 — FoV visibility of critical state (VR Glasses budget)
Hypothesis:
All critical state (bottleneck, overflow, contract timer, grade) and all frequent interactables fit inside a 70×66° view cone (minus a 5° margin) from the seated pose, so players on the narrowest device never miss the magic moment.

Prototype:
Exported layout JSON from the running build (`tools/xr-harness/examples/layout-example.json` shows the format) + simulator run with the VR Glasses profile.

Measure:
- `npm run xr:fov -- <layout.json> --device vr-glasses` result;
- % of participants who saw the overflow happen (EXP-XR-02);
- head-turn count needed to complete one turn.

GO:
FoV check passes for all critical elements and ≥80% of participants saw the spill.

KILL/PIVOT:
Critical elements require head turns > 30° or the spill is missed by >30% → shrink/move the play area, move the spill edge, add spatial audio cue.

---

## EXP-XR-09 — Gaze + pinch utility
Hypothesis:
Look-and-pinch to inspect/upgrade a machine is faster and less tiring than reaching for it, without false selections.

Variants:
A. direct reach + pinch;
B. gaze (eye or head fallback) + pinch;
C. both available.

Measure:
- time to inspect/upgrade target machine;
- false selections/min;
- preference.

GO:
B or C is faster with ≤0.5 false selections/min and no comfort penalty.

KILL:
False selections >1/min after tuning → keep gaze for hover/highlight only.

---

## EXP-XR-10 — Reason to come back
Hypothesis:
Visible cross-session progress (product ladder + best grade + daily contract) makes players want a second session.

Protocol:
Session 1 ends after a 4–5 turn run; ask nothing. 24 h later, offer an optional second session.

Measure:
- % who accept a second session;
- self-reported "I want to unlock the next product" (after, not before);
- turns played in session 2.

GO:
≥50% accept the second session or median ≥3 voluntary turns in session 2.

KILL:
<25% accept and exit interviews show no interest in the ladder → rethink progression reward.

---

## EXP-XR-11 — Hand intent robustness
Hypothesis:
Intent buffering (use the pose from ~0.5 s before release), accepting multiple grab poses (pinch, claw, fist) and keeping carried items through brief tracking loss cut interaction errors below 1/min for naive players.

Measure:
- errors/min with and without each rule (A/B toggles);
- dropped-item incidents during tracking loss;
- unintended releases.

GO:
<1 material error/min for naive players and zero item drops on short (<1 s) tracking loss.

KILL:
Errors stay >2/min after tuning → simplify the interaction (bigger targets, fewer simultaneous grabbables).

---

## Participant recruitment
See `docs/xr/PLAYTEST_PLAN.md` (who, when, consent, scripts, how evidence is recorded).

## Experiment discipline
For every run, store a JSON record based on `tools/xr-harness/session-template.json` and run the harness.
