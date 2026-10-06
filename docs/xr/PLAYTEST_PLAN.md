# Playtest Plan v1.0

Goal: expose interaction and comprehension failures early enough to fix them.

## Recruitment

### Naive players
Potential sources:
- volunteers from SABES / TecNM;
- colleagues, friends or staff;
- people with little/no prior VR when possible.

### Important boundary when recruiting students
Participation must be genuinely voluntary:
- no connection to grades, attendance, recommendations or course standing;
- make clear that declining has no consequence;
- prefer open volunteer recruitment rather than singling out a student;
- anonymize IDs;
- do not record faces;
- obtain explicit permission before recording headset/hands.

This is product testing, not a classroom assignment.

### Experienced VR users
Use 1–2 people for interaction/performance sanity checks, but do not substitute them for naive-player onboarding tests.

### Remote visual participants
For still/clip tests only; no XR claims can be proven remotely.

Target: ~12+ naive XR participants across the project, avoiding repeat exposure to the same experiment when possible.

---

## Schedule

| Target | Session | Experiments | People |
|---|---|---|---|
| Stack kill test | basic comfort/input on both candidates | EXP-XR-01, 07, 11 | owner + 2 |
| Oct 17 | graybox + complete rough shift | EXP-XR-02, 03, 08, 11, 13 | 3–5 naive |
| Oct 20-ish | silent 10-second clip / art direction | EXP-XR-06, 12 | >=10 remote/naive; expand A/B to >=20 |
| Oct 24–25 | early first-five test | EXP-XR-05, 04, 13 | 3–5 naive |
| ~24 h later | return test | EXP-XR-10 | prior group where feasible |
| Oct 31 | final pre-G-T0 first-five test | EXP-XR-05, 04, 08, 11, 13 | >=5 naive |
| Nov 8–11 | hardening | rooms/tables, hand loss, handedness, performance | 3–5 mixed |

Dates may move with headset/tooling availability, but **do not move all naive testing to the end**.

---

## Standard in-headset protocol

1. Confirm voluntary participation and recording consent.
2. Record anonymous participant ID and prior VR familiarity.
3. Note room lighting, table dimensions and device.
4. Start from the intended cold-start/onboarding state.
5. Say only:
   > "Play however you want. Think out loud if you can. I won't explain the solution."
6. Do not explain industrial terms or gesture vocabulary unless safety requires intervention.
7. Observe:
   - first action;
   - first product/reward;
   - first recognized problem;
   - first strategic decision;
   - first recovery payoff;
   - journey completion;
   - errors;
   - false activations;
   - tracking loss/recovery;
   - facilitator interventions.
8. Before asking whether they want another turn, allow the player to choose naturally.
9. After play:
   - fatigue 1–5;
   - "What went wrong?";
   - "What did your action change?";
   - "What would you do next?";
   - "Would you want to play another shift?";
   - "Would you show this to someone?"
10. Record one JSON per participant and link captures/logs.

## Hand-intent definitions

### Intended-action success
An attempt counts as successful when the action the participant visibly attempted completes without needing a second corrective input.

### False activation
The game performs a meaningful action the participant did not appear to intend.

### Material interaction error
An input failure that interrupts or changes the player's plan, not a harmless visual wobble.

Do not lower error counts by redefining failures after seeing results.

---

## 10-second silent test
Show the clip once, muted.

Ask:
1. What game do you think this is?
2. What happened?
3. Why did the player move that object / gate?
4. What would you do next?
5. Would you want to try it?

Do not explain before answers.

Primary risk:
if people answer "traffic puzzle", "generic automation" or cannot explain why the real table matters, differentiation is not strong enough.

---

## Evidence
For each XR participant:
- copy `tools/xr-harness/session-template.json`;
- commit/build/device;
- measured values or null;
- evidence links;
- observations without retroactive interpretation.

Run the harness after each session.

Failed sessions stay in the repo/evidence history.
