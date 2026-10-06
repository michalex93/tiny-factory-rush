# Agent Prompt / Run Budget v1.0

A "prompt" here means one substantial delegated implementation objective with explicit acceptance criteria, not every conversational turn.

## Queue-derived estimate (2026-10-06)

Current plan contains roughly:
- **24 active autonomous agent tasks**;
- **4 pair tasks** that require the owner/hardware/tooling present;
- **~19 human decisions/tests/admin actions**;
- **4 optional stretch tasks** parked as `proposed` (default: do not build).

Because autonomous tasks can retry, task count != agent invocation count.

## Expected autonomous agent sessions

### Clean path
~25–32 substantial agent sessions.

### Realistic path
~30–45 sessions including failed attempts, bug correction and evidence re-runs.

### Warning zone
>55–60 substantial agent sessions before feature freeze suggests:
- tasks are too broad/unclear;
- acceptance criteria are unstable;
- tooling is fighting us;
- scope is drifting.

Investigate instead of celebrating "more agent usage."

## Human / pair time remains critical
Agents cannot honestly replace:
- real Quest tests;
- naive-player observation;
- stack/signature decisions;
- art-direction approval;
- competitor interpretation;
- final submission decisions.

## Phase budget
| Phase | Typical agent sessions |
|---|---:|
| Kill-test scaffolds / stack evidence | 4–7 |
| Walking skeleton + simulation hardening | 4–6 |
| Signature prototypes / interaction reliability | 5–8 |
| First five + retention | 4–7 |
| Art/audio integration | 3–6 |
| Hardening | 3–5 |
| Submission | 2–4 |

Several phases overlap.

## Prompt contract
Each implementation prompt/task should specify:
1. current gate;
2. exact player/technical outcome;
3. in-scope files/systems;
4. explicit non-goals;
5. acceptance criteria;
6. evidence required;
7. commands/checks;
8. stop/block condition.

## Accelerator rule
After stack selection, prefer prompts that move the **whole runnable journey** forward.

Bad:
> Perfect the simulation architecture.

Better:
> Make the current walking skeleton produce one visible jam, accept one physical fix, recover, and produce a result; then add only the tests required to keep that loop stable.

## Rule
One prompt normally closes one testable slice.

Never ask an unattended agent to "finish the XR game."
