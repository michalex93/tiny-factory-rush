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
At least 70% correctly identify the congestion problem without explanation and at least 40% say they would show/share the moment.

KILL:
<50% understand the state change or the effect reads primarily as a bug.

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

## Experiment discipline
For every run, store a JSON record based on `tools/xr-harness/session-template.json` and run the harness.
