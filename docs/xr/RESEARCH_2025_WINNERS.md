# Research: what wins — evidence notes for Tiny Factory Rush XR

Updated: 2026-10-06

This document supports design decisions. It is **not** a recipe for copying winners.

## Method caution

Three evidence classes are kept separate:

1. **Official / primary** — Meta developer documentation, official competition rules, winner pages / developer case studies.
2. **Observed counts** — manual counts from the 2025 Devpost gallery. Useful descriptively; do not treat them as causal.
3. **Design inference** — our interpretation, always subject to playtest.

Important:
- Engine share among winners does not prove an engine causes winning.
- Multiplayer being overrepresented among winners does not prove adding multiplayer improves our odds.
- A feature used by a winner should not be copied unless it serves our own core loop.
- 2026 allows only **one prize per Entry**, so feature-shopping across special awards is strategically weak.

---

## 2025 Meta Horizon Start Developer Competition — reliable baseline

Meta's official winner recap reports:
- nearly 3,000 developers;
- more than 650 new/significantly updated projects;
- 32 awards;
- Best Casual Game winner: Tiny Golf;
- runner-up: Little Critters hands update;
- three Hand Interaction winners: Hand Survivor, Pocket Lands, Awesome Hand;
- IWSDK winners: The Nanauts and Dun Jun.

Primary source:
https://developers.meta.com/vr/blog/meta-horizon-start-developer-competition-meet-the-winners/

### Traits worth learning from

#### Tiny Golf
- premise instantly understandable;
- one physical interaction can explain the game;
- store/product presentation, not just a technology demo;
- reused prior technology, so "built during competition" did not mean "everything from zero."

#### Little Critters
- adapted/updated precedent directly relevant to us;
- playtests revealed real users do not all grab in the way developers expect;
- hand tracking needs recovery behavior, not just gesture detection.

#### Hand Survivor / Dun Jun / Awesome Hand
- hands-first can support action;
- the problem is not "speed" by itself;
- ambiguous, repetitive or precision-sensitive gestures are the danger;
- gestures must align with fantasy and be distinguishable.

#### Pocket Lands
- strong prior engine investment;
- context helps arbitrate input conflicts;
- smooth performance and tactile spatial interaction matter more than feature count.

### General winner pattern
Our strongest inference:
**familiar fantasy + one clear physical verb + product-level polish + evidence from naive users.**

Do not infer:
"copy pinch", "copy 0.5 seconds", "copy multiplayer", or "copy Unity."

---

## 2026 official judging

Four criteria, 25% each:
1. Innovation & Creativity.
2. Experience Design.
3. Technical Implementation.
4. Polish & Presentation.

Official rules emphasize:
- hands-first end-to-end;
- seated/context-specific design;
- habit-forming purpose;
- purposeful passthrough;
- FoV-aware design;
- gaze interactions as a platform capability;
- hand tracking;
- spatial anchoring/scene behavior;
- >=60 fps on Quest;
- real gameplay and strong presentation.

Special awards include:
- Social & Multiplayer;
- Agentic Interaction;
- Reason to Come Back;
- First Five Minutes;
- Accessibility Forward;
- Boldest Original Concept.

Rule that affects strategy:
**one prize per Entry.**

Primary sources:
- https://start-developer-competition-26.devpost.com/rules
- https://start-developer-competition-26.devpost.com/details/faqs
- https://start-developer-competition-26.devpost.com/details/special-awards

---

## Table Troopers — strongest commercial reference

Meta's developer case study describes a hands-first tabletop MR strategy title.

Key lessons:
- design started from what hand tracking + MR could uniquely enable;
- "all you need is pinch" means low conceptual friction, not simplistic implementation;
- 90% hand reliability was not considered launch quality;
- intent inference improved aiming/release;
- simplifying mechanics can be better than complicating input;
- objects leaving the playfield and remaining in the real room can create delight;
- long-term business came from strong core loop + community + content cadence, not MR novelty alone.

Commercial signal from Meta's case study:
- 4.8-star rating;
- Horizon+ materially expanded usage;
- DLC became more than half of revenue;
- repeat DLC purchasers exist.

Primary source:
https://developers.meta.com/vr/discover/success-stories/table-troopers/

Implication for us:
- tabletop strategy is commercially credible;
- "things fall off the table" is not enough to differentiate;
- reliability/intent must be a first-class product requirement.

---

## Loop One: Done — direct thematic competitor

Current positioning:
MR/VR factory automation; tactile building/problem solving; recipes/research/facilities; improved hand tracking and micro-gestures.

Source:
https://www.uploadvr.com/loop-one-done-adds-vr/

Implication:
Tiny Factory must not present as another automation sandbox.
Our wedge is **short live industrial crises + strategic intervention + money/grade + recovery**, not endless automation construction.

---

## Traffix XR: Cities of Tomorrow — mandatory checkpoint

Scheduled launch: 2026-10-15.

It occupies:
- tabletop MR;
- hands;
- flow/routing;
- miniature city;
- visible traffic problems;
- procedural/creative elements.

This makes "tabletop + flow + hands" insufficient differentiation.

Checkpoint on launch:
1. inspect reviews and real playthrough footage;
2. identify what players praise/complain about;
3. identify which visual/interaction language it already owns;
4. re-run the 10-second differentiation question;
5. do not pivot from one review.

Our intended separation:
**industrial operation under controlled pressure, physical production, profit/grade, live reconfiguration, crisis/recovery**, not relaxed traffic design.

---

## Platform direction — Meta VR Glasses / SDK 207

Official Meta material:
- VR Glasses: hands + eyes primary;
- FoV roughly 70° × 66° versus Quest 3 ~110° × 96°;
- Store discovery benefits hands-compatible titles;
- v207 Simulator supports VR Glasses profile and Look + Pinch;
- Core SDK v207 adds FoV simulation / readiness tooling;
- XR Operator can let coding agents observe/interact/verify running XR apps;
- IWSDK has a VR Glasses path using gaze targeting + pinch selection.

Sources:
- https://developers.meta.com/blog/meta-connect-recap/
- https://developers.meta.com/vr/downloads/package/meta-xr-core-sdk/207.0/
- https://developers.meta.com/vr/downloads/package/meta-xr-simulator-windows/207.0/
- https://developers.meta.com/vr/documentation/iwsdk/guides/get-started-glasses/

Implication:
FoV-aware design and gaze/pinch are valuable.
But we should not compress the entire tabletop into a static 70×66° screenshot. The current action/state must remain comfortable and discoverable across devices.

---

## Stack evidence

### IWSDK/WebXR
2025 proved IWSDK can produce award-winning immersive experiences.
2026 rules explicitly accept a hosted IWSDK URL.

### Unity
Strong current Meta tooling:
- Interaction SDK / MRUK ecosystem;
- XR Simulator;
- XR Operator;
- v207 gaze / device-readiness path.

Decision rule:
choose by our own kill-test evidence, not winner frequency.

---

## Success factors translated to our project

| Evidence pattern | Tiny Factory requirement |
|---|---|
| Obvious physical verb | signature interaction must be demonstrated in seconds |
| Hands by intent | measure false activations + intended-action success + tracking recovery |
| Real space matters | table size/edge changes layout and crisis |
| Short complete moment | competition journey <=8 min |
| Early naive tests | multiple tests before Oct 31 |
| Product, not demo | art/audio/pitch in parallel |
| Repeat use | Daily Shift + saved best + visible growth |
| Performance discipline | real Quest profiling before feature freeze |
| Platform capabilities used strategically | hands/passthrough/anchors/FoV + useful gaze path |
| Prior work reuse | preserve/adapt web rules where valuable, not web UI |

---

## Things we must NOT infer from the research

- "Unity wins more, therefore Unity wins."
- "Social games won, therefore add multiplayer."
- "Table Troopers used intent history, therefore 0.5 s is the correct value."
- "Little Critters supported many grab poses, therefore our game needs pinch/claw/fist from day one."
- "Overflow is novel because it uses a real table."
- "Toy/diorama art is distinctive."
- "Special-award eligibility increases expected prize value if it damages main-track polish."

These are exactly the kinds of cargo-cult conclusions the experiments are designed to prevent.
