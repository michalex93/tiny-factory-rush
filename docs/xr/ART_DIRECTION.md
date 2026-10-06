# XR Art Direction — v1.0

Polish & Presentation is 25% of judging. Art is therefore a parallel product lane, not a final cleanup phase.

## Visual target
**Premium kinetic industrial desk toy**

Toy/diorama is the readability baseline.
The identity should feel more specific:
- precision industrial miniatures;
- distinct machine silhouettes;
- tactile-looking metal/plastic components;
- restrained status lights;
- satisfying moving mechanisms;
- coherent "desk object" presence on the real table.

Avoid:
- generic low-poly asset-pack look;
- mixed visual kits;
- photorealistic dirty factory grime;
- detail too small to survive tabletop viewing distance.

## Principles
1. Silhouette before texture.
2. Fewer, larger forms.
3. One coherent material language.
4. Strict semantic palette.
5. State through motion + shape + sound, never color alone.
6. Strong table contact; no floating.
7. Mechanical motion communicates function.
8. Art must preserve performance and flow readability.

## Dates / gates
- Style-board v0: ~Oct 10.
- Art pass on walking skeleton: ~Oct 19.
- Blind preference + 10-second silent comprehension: ~Oct 20.
- Art direction lock: ~Oct 21–24.
- Refinement continues through feature freeze.

These dates may compress if tooling/headset availability slips; art does not move to the end.

## Asset strategy
Prefer in order:
1. custom/simple primitives shaped into a unique system;
2. one coherent licensed kit heavily conformed to our language;
3. AI-assisted assets only after cleanup/retopo/material normalization.

External asset tracking:
create/update `docs/xr/ASSET_LICENSES.md` with source, license and modifications.

## Performance hypotheses
Until real Quest profiling:
- cap visible products rather than allowing unbounded WIP;
- instance/batch repeated products;
- deterministic belt movement rather than rigidbody simulation;
- physics only where it creates visible value (for example a capped spill);
- restrained real-time lights/shadows.

Do not treat guessed triangle/draw-call numbers as platform requirements.

## Semantic visual roles
- neutral machine body;
- healthy/flow;
- warning/stress;
- priority/urgent;
- reward/value;
- ghost/placement preview.

Exact colors are an art-lock decision.

## Scale
Provisional:
- machines clearly palm/grab sized;
- product units readable as individual objects;
- snap targets intentionally generous;
- labels secondary.

Validate in headset.

## FoV
Essential current state and the next required action should remain comfortably discoverable on the narrower VR Glasses profile.

Do not compress every world object into a static 70×66° cone merely to satisfy a script.

The FoV tool is a heuristic plus evidence prompt.

## Motion language
- placement: short settle / magnetic click;
- processing: exaggerated but readable mechanism;
- healthy flow: consistent rhythm;
- blocked: backpressure / halted mechanism;
- crisis: accumulation escalates before spill;
- recovery: line visibly resynchronizes;
- reward: crisp, short, no camera shake.

## Audio language
A well-running factory forms a coherent groove.

Congestion:
- timing drifts/desynchronizes;
- spatial cue points toward the problem.

Recovery:
- rhythm locks back together;
- reward cue confirms consequence.

Avoid:
- constant alarms;
- dense machine noise;
- high-salience sounds for unimportant events.

## Art test
EXP-XR-06 asks two different questions:
1. Which visual direction looks more desirable?
2. Can viewers understand the game/crisis from the image/clip?

A beautiful image that obscures the system fails.
