# Competition Scorecard — Meta VR Start 2026

Purpose: keep the project optimized for the **four official 25% judging criteria**, not for the number of features implemented.

Do not assign fake numerical scores. Use:
- RED — not proven / weak;
- YELLOW — plausible but incomplete;
- GREEN — demonstrated by the current build and evidence.

Update at:
1. stack decision;
2. signature lock;
3. G-T0;
4. feature freeze;
5. pre-submission.

Official strategic rule:
**one Entry can receive only one prize.**
Special-award ideas are useful only when they also improve the product or provide a better fallback without damaging the main-track score.

---

## 1. Innovation & Creativity — 25%

### Intended argument
Tiny Factory Rush is not a 2D factory game displayed in MR. The player's real table becomes a production constraint and failure surface. A live industrial system can congest, spill into the player's room, and be physically rescued/reconfigured.

### Must prove
- real room/table materially changes play;
- core loop depends on spatial depth / hands;
- signature interaction is obvious and memorable;
- concept is clearly distinct from Traffix XR, Loop One: Done and Table Troopers;
- repeat-use concept exists.

### Current state
YELLOW — strong thesis, no build evidence yet.

### Evidence targets
- EXP-XR-02;
- EXP-XR-03;
- EXP-XR-12;
- competitor checkpoint;
- real gameplay capture.

---

## 2. Experience Design — 25%

### Intended argument
A seated player learns by touching, not reading. The factory explains its own failure through motion, queues, sound and physical layout; the first meaningful payoff arrives inside minutes.

### Must prove
- hands-first end-to-end;
- complete moment in <=8 min;
- first action <=15 s;
- first reward <=45 s;
- problem <=120 s;
- intervention <=180 s;
- payoff <=240 s;
- clear recovery/error handling;
- comfortable reach;
- reason to return.

### Current state
RED — not yet implemented or tested.

### Evidence targets
- EXP-XR-01;
- EXP-XR-04;
- EXP-XR-05;
- EXP-XR-08;
- EXP-XR-10;
- EXP-XR-13.

---

## 3. Technical Implementation — 25%

### Intended argument
The build uses platform capabilities strategically rather than decoratively: hand tracking, purposeful passthrough/table anchoring, FoV-aware design, intent-aware interaction, and gaze where it materially improves selection.

### Must prove
- stack chosen from evidence;
- reliable hand input;
- tracking-loss recovery;
- no critical runtime failures;
- correct table/plane behavior in unfamiliar spaces;
- target Quest performance >= official minimum with headroom;
- gaze/head-gaze behavior if retained.

### Current state
RED — no target-hardware evidence yet.

### Evidence targets
- stack kill test;
- EXP-XR-07;
- EXP-XR-08;
- EXP-XR-09;
- EXP-XR-11;
- hardening captures/logs.

---

## 4. Polish & Presentation — 25%

### Intended argument
The experience looks and sounds like one coherent premium kinetic industrial desk toy, not a graybox or mixed asset pack. Motion and sound communicate flow as well as celebrate it.

### Must prove
- coherent art direction;
- silhouettes readable at tabletop distance;
- audio/state language works;
- strong first frame / thumbnail;
- trailer communicates the hook immediately;
- submission copy maps claims to evidence.

### Current state
RED — direction defined, production art not proven.

### Evidence targets
- EXP-XR-06;
- EXP-XR-12;
- art/audio captures;
- trailer review;
- final screenshots.

---

# Main-track strategy

Primary target:
**Best Adapted / Significantly Updated Gaming Experience**

Design-relevant special awards:
- Best First Five Minutes;
- Boldest Original Concept;
- Best Reason to Come Back.

Do not build social, agentic or leaderboard systems simply to collect category eligibility.

# Weekly review question

For every proposed feature ask:

> Which official 25% criterion does this measurably improve, what evidence will prove it, and what polish work would we give up to build it?

If that answer is weak, backlog the feature.
