# Playtest Plan

Winners test early with people who have never seen the game (Table Troopers' lesson #5; Final Throwdown ran a public playtest at a library; Little Critters discovered real grab poses only by watching players). Our experiments need naive players on a schedule, not "when possible".

## Who
- **Naive players**: students and staff at SABES and TecNM Celaya (no prior VR preferred; record prior experience).
- **Expert players**: 1–2 people with VR experience for comfort/perf sanity checks.
- **Remote voters** (stills only, EXP-XR-06): classmates, social networks, Discord communities.

Target pool: 12 naive players across the project, no one tested twice in the same experiment.

## When (fixed sessions)
| Date | Session | Experiments | People |
|---|---|---|---|
| Sun Oct 11 | Kill-test comfort check | EXP-XR-01 (short), EXP-XR-07 | Owner + 2 |
| Sat Oct 17 | Graybox signature playtest | EXP-XR-02, EXP-XR-03, EXP-XR-08, EXP-XR-11 | 3–5 naive |
| Sat Oct 24 | Core loop check | EXP-XR-09, EXP-XR-04 (short) | 3–5 naive |
| Sat Oct 31 | First five minutes | EXP-XR-05, EXP-XR-04 | ≥5 naive |
| Sun Nov 1 / Mon Nov 2 | Second session (24 h later) | EXP-XR-10 | Oct 31 group |
| Tue Nov 3 | Art A/B (remote) | EXP-XR-06 | ≥20 |
| Wed Nov 11 | Hardening | rooms/tables, left/right-handed, hand loss | 3–5 mixed |

## Protocol (every session)
1. Consent: verbal OK to observe and record hands/headset view; no faces in recordings; anonymous IDs (P01, P02…).
2. Hygiene: face cover/cleaning between players.
3. Setup: seated, at a real table, passthrough on; note table size and lighting.
4. Script: "Play however you want. Think out loud. I can't help you." Do not explain the intended solution or industrial terms.
5. Observe silently; count errors and facilitator interventions; time milestones with a stopwatch (first action, reward, problem, decision, payoff).
6. After: fatigue 1–5, "what went wrong when the boxes spilled?", "would you show this to someone?", "want another turn?" (but measure voluntary turns before asking).
7. Record one JSON per participant from `tools/xr-harness/session-template.json` into `evidence/xr/EXP-XR-XX/session-PNN.json` and run `npm run xr:harness -- <file>`.

## Rules
- Never manufacture missing measurements; leave null.
- Keep failed sessions.
- Fixes found in a session become tasks in `tasks/queue.json` the same day.
