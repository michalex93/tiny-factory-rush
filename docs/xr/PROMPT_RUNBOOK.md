# Agent Prompt Runbook

A "prompt" here means one substantial delegated objective with explicit acceptance criteria, not every chat message or correction.

## Expected total
### Lean path
~30–40 substantial agent runs.

### Realistic path
~40–60 runs including failed experiments, QA corrections and polish iterations.

### Badly scoped path
80+ runs. Treat that as a warning that the project is drifting.

The number is not a productivity metric.

## Budget by phase
| Phase | Typical substantial prompts |
|---|---:|
| Foundation / repo setup | 2–4 |
| XR technical kill test | 4–6 |
| Core physical loop | 5–8 |
| First-five-minutes onboarding | 4–7 |
| Art + audio + game feel | 6–10 |
| Replayability slice | 3–5 |
| Performance / room / hand QA | 5–8 |
| Submission / trailer / audit | 3–5 |

## Prompt pattern
Every implementation prompt should contain:
1. current milestone;
2. exact objective;
3. files/systems in scope;
4. explicit out-of-scope list;
5. acceptance tests;
6. commands/checks to run;
7. required documentation update;
8. stop condition.

## Example
"Implement EXP-XR-01 graybox snapping only. Do not add economy, contracts, art assets or progression. Acceptance: three modules can be grabbed, rotated and snapped on a tabletop; invalid placement is legible; run target-hardware smoke test and record error/fatigue observations using the session template. Stop after evidence is saved."

## Rule
One prompt should usually close one testable slice.

Do not ask an agent to "finish the XR game".
