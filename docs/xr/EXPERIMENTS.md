# XR Experiment Register v1.0

No hypothesis becomes a permanent system because it sounds clever or because a winner used it.

For each experiment:
- define GO/KILL before observing results;
- prefer behavior over self-report;
- preserve failed sessions;
- never manufacture missing measurements.

## EXP-XR-01 — Tabletop comfort and basic hand reliability
Hypothesis:
A player can manipulate the core tabletop objects for 10 minutes without significant fatigue or repeated tracking failure.

Prototype:
Graybox table + 3–5 large interactables.

Measure:
- fatigue 1–5 at 5 and 10 min;
- material interaction errors/min;
- tracking-loss incidents;
- recovery time;
- task completion.

GO:
- median fatigue <=2;
- <1 material interaction error/min after onboarding;
- no repeated blocker shared by participants.

KILL/PIVOT:
- median fatigue >=3;
- normal play repeatedly fails due to precision/occlusion;
- errors remain >2/min after one focused tuning pass.

---

## EXP-XR-02 — Diagnostic overflow / magic moment
Hypothesis:
Visible WIP accumulation followed by a spill near the real table edge communicates the line problem and creates a memorable MR-specific crisis.

Prototype:
Working graybox or honest gameplay clip.

Measure:
- "what went wrong?" comprehension;
- whether participant identifies the correct cause before explanation;
- delight rating;
- would-show-someone behavior/response;
- whether the spill reads as intentional versus a bug.

GO:
- >=70% identify the congestion/cause without explanation;
- >=40% say they would show/share the moment;
- no dominant "bug" interpretation.

KILL/PIVOT:
- <50% understand what the spill means;
- effect is memorable but not diagnostic;
- effect requires looking away from the normal play area to notice.

---

## EXP-XR-03 — Signature routing/reconfiguration interaction
Hypothesis:
At least one physical intervention delivers strategic pressure without input frustration.

Variants can include:
A. large physical routing gate;
B. deliberate grab/snap buffer or splitter;
C. swipe/flick routing gesture;
D. pre-plan route before release.

Do not force all variants if early evidence makes one obviously unsuitable.

Measure:
- intended-action success rate;
- false activations/min;
- time to correct a problem;
- fatigue;
- perceived control;
- fun/preference;
- whether player understands strategic consequence.

GO:
One variant is clearly reliable and fun enough to become the signature interaction.

KILL:
All live variants create repeated input frustration -> simplify the intervention or make routing pre-planned.

---

## EXP-XR-04 — "One more shift"
Hypothesis:
A short result + meaningful choice creates voluntary continuation.

Protocol:
After tutorial, allow free play without asking the participant to continue.

Measure:
- shifts voluntarily started;
- time between result and next start;
- stop reason.

GO:
Median >=3 voluntarily started shifts in the allotted session.

KILL:
Median =1 and exit interviews indicate lack of interest rather than usability/bug.

---

## EXP-XR-05 — First-five-minutes comprehension
Hypothesis:
A naive player experiences the complete promise without industrial terminology.

Target milestones:
- first successful action <=15 s;
- first product/reward <=45 s;
- unmistakable problem <=120 s;
- meaningful intervention <=180 s;
- recovery payoff <=240 s;
- grade/next-shift invitation <=300 s.

Measure:
- timestamps;
- facilitator interventions;
- repeated wrong actions;
- "what happened?" explanation afterward.

GO:
Median meets the targets and no participant needs an engineering explanation.

KILL/PIVOT:
- median first product >90 s;
- median payoff >300 s;
- users cannot explain the cause/effect chain.

---

## EXP-XR-06 — Art-direction gate
Hypothesis:
The premium kinetic industrial desk-toy direction materially improves appeal and clarity over prototype/generic low-poly visuals.

Method:
Blind A/B still or 10-second capture with >=20 people.

Measure:
- preference;
- "what kind of game is this?" clarity;
- perceived product quality.

GO:
>=70% prefer the new direction and the majority identify factory/industrial strategy without prompting.

KILL/PIVOT:
<50% preference or visual language reduces state readability.

---

## EXP-XR-07 — Target-hardware performance
Hypothesis:
The competition journey meets the platform minimum with useful headroom on real target hardware.

Measure:
- frame timing / low-percentile FPS;
- active product count;
- draw calls/material count where available;
- GC/allocation spikes;
- thermal degradation over representative session;
- critical runtime errors.

GO:
Meets official competition minimum on Quest in a representative busy state and shows headroom outside transient loading.

KILL/PIVOT:
Defining visual behavior cannot meet minimum performance after one focused optimization pass.

---

## EXP-XR-08 — FoV / discoverability
Hypothesis:
The player can keep the critical current state and next required interaction comfortably discoverable on the narrower VR Glasses FoV without compressing the world into an unreadable cluster.

Measure:
- VR Glasses simulator profile;
- FoV heuristic report;
- head-turn count / missed critical events;
- overflow noticed rate;
- user comfort.

GO:
Critical current state is not routinely missed; essential UI avoids extreme edges; deliberate head movement does not interrupt flow.

KILL/PIVOT:
Players repeatedly miss the required next action/event or must maintain uncomfortable head/arm posture.

Note:
The static FoV checker is a heuristic. It is not proof that every world object must fit simultaneously inside one cone.

---

## EXP-XR-09 — Gaze + pinch utility
Hypothesis:
Gaze/head-gaze + pinch is useful for inspection/secondary selection without causing false actions.

Variants:
A. direct reach;
B. gaze/head-gaze + pinch;
C. both available.

Measure:
- selection time;
- false activations/min;
- intended-action success;
- preference;
- comfort.

GO:
B or C improves speed/reach with <=0.5 false selections/min and no comfort penalty.

KILL:
False selections remain >1/min after tuning -> restrict gaze to highlight/inspection or remove from core flow.

---

## EXP-XR-10 — Reason to come back
Hypothesis:
Daily Shift + saved best result + visible cross-session growth is enough to motivate a second session without implementing a full campaign.

Protocol:
Session 1 ends normally. Offer an optional second session about 24 h later.

Measure:
- second-session acceptance;
- voluntary shifts in session 2;
- what visible progression the participant remembers.

GO:
>=50% accept the optional second session OR median >=3 voluntary shifts among returners.

KILL:
<25% accept and interviews show no interest in improving/unlocking.

---

## EXP-XR-11 — Hand intent robustness
Hypothesis:
Contextual intent handling can make the core action reliable enough for naive players.

Important:
Do not hard-code another game's timing or grab vocabulary.

Parameters to test:
- intent-history window;
- target size/snap magnetism;
- tracking-loss grace period;
- ray/direct-grab arbitration.

Observe which natural grab poses participants actually attempt before implementing additional gesture families.

Measure:
- intendedActionSuccessRate;
- falseActivationsPerMin;
- unintended releases;
- lost-hand incidents;
- trackingRecoverySec;
- material interaction errors/min.

GO:
- intended-action success >=95% for the core action after onboarding;
- false activations <=0.5/min;
- no dropped item on brief recoverable tracking loss in test scenario.

KILL/PIVOT:
Reliability remains poor after simplifying the mechanic and enlarging tolerance.

---

## EXP-XR-12 — 10-second silent marketing / comprehension test
Hypothesis:
A person can understand the premise and identify the MR-specific hook from a 10-second clip with no narration.

Method:
Show clip once, muted, to >=10 people who have not seen the project.

Ask:
1. What do you think the game is?
2. What happened?
3. What would you do next?
4. Would you want to try it?

GO:
- >=70% identify factory/production plus the crisis/fix concept;
- >=40% express clear desire to try/show it.

KILL/PIVOT:
Most describe it as generic automation, traffic routing, or cannot identify why MR matters.

---

## EXP-XR-13 — Complete judge journey
Hypothesis:
A judge can have a complete satisfying arc in <=8 minutes without needing a long run.

Measure:
- cold start to first action;
- journey completion time;
- whether participant reports a beginning, crisis, decision and result;
- clean pause/exit.

GO:
Median complete journey <=8 min and all four story beats are understood.

KILL/PIVOT:
Median >10 min or participants finish without understanding what their decision changed.

---

## Participant recruitment
See `docs/xr/PLAYTEST_PLAN.md`.

## Evidence discipline
For every real run:
1. copy/fill `tools/xr-harness/session-template.json`;
2. store it under the experiment evidence directory;
3. keep null for data not measured;
4. run the harness;
5. store captures/logs referenced by the session;
6. record build/commit/hardware.

Failed evidence is still evidence.
