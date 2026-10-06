---
name: fov-aware-design
description: Use when placing or reviewing XR scene layout, UI, onboarding cues or crisis effects across Quest and the narrower Meta VR Glasses profile.
---
<!-- Generated from skills/fov-aware-design/SKILL.md by `npm run skills:sync`. Edit the source, not this copy. -->

# Skill: FoV-Aware Design

## Principle
FoV awareness means the player can discover and act on the **current important state** comfortably. It does not mean every object in the world must fit one static cone.

## Targets
- VR Glasses profile is the narrow-FoV stress case.
- Frequent interactions remain within comfortable seated reach.
- Essential UI avoids extreme edges.
- The next required action and active crisis remain discoverable without awkward posture.

## Procedure
1. Export layout JSON when available.
2. Run the FoV/reach heuristic for VR Glasses and Quest 3.
3. Inspect in the actual simulator/device profile.
4. Record which critical elements are visible at the relevant moment.
5. Count missed events / awkward head turns in naive playtests.
6. If static checker and human test disagree, investigate rather than worship the checker.

## Overflow
- Accumulation begins at the true bottleneck.
- Spill location is chosen for discoverability, not gimmick.
- Spatial audio may attract attention.
- Do not force all failures to the near edge if that breaks causal meaning.

## Reject when
- essential UI/action is routinely missed;
- frequent interaction requires uncomfortable reach/posture;
- layout is compressed until strategy/readability is worse simply to satisfy the static checker.

## Evidence
Heuristic report + simulator/device capture + naive-player observation.
