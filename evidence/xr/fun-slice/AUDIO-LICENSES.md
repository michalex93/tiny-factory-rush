# Fun-slice audio licenses

All factory state cues are **synthesized at runtime** via the Web Audio API
(`xr-iwsdk/src/factory/audio.ts`): oscillators only — no sampled libraries.

| Cue | Implementation | License |
|---|---|---|
| healthy rhythm | triangle pulse | original / public domain by authorship |
| jam rhythm / warn | saw/square blips | original |
| delivery | short sine blip | original |
| grab / snap / reject | short tones | original |
| recovery | rising sine triad | original |
| shift result | two-tone chime | original |

Bundled `public/audio/chime.mp3` is **not** used by the fun-slice factory audio path.
