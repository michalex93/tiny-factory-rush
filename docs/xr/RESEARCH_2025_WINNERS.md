# Research: what wins (2025 edition, current top MR games, platform direction)

Collected 2026-10-05. Counts come from the 2025 Devpost gallery filters (own counts) and the winners' Devpost pages. Use this file as the success-factor checklist; cite it in reviews.

## 2025 Meta Horizon Start Developer Competition — numbers
- 2,865 participants, 655 projects, 32 awards ($1.5M). Window Nov 5 – Dec 9, 2025.
- Tracks: Gaming 353 (54%), Entertainment 90; rest Lifestyle.
- Updated vs new: 222 updated (34%) won 14 awards (6.3% win rate) vs 433 new won 18 (4.2%).
- Submitter type: organizations 210 → 16 wins (7.6%); teams 125 → 6 (4.8%); individuals 320 → 10 (3.1%).
- Gaming by submitter: organizations 117 → 10 wins (8.5%); teams 62 → 2 (3.2%); individuals 172 → 3 (1.7%). The 6 main gaming prizes: 5 organizations, 1 team, 0 individuals.
- 6 of the 10 individual wins came from technology-specific awards (hands, camera+AI, IWSDK, Spatial SDK, Android) that do **not** exist in 2026.
- Capabilities: hand interactions in 59% of projects vs 69% of winners; multiplayer in 22% of projects vs 34% of winners and **47% of gaming winners (7 of 15)**.
- Build path: Unity 68% of projects; WebXR 75 projects → 4 wins (2 via IWSDK-only award, 2 Judges' Choice), none in main tracks.
- Closest theme precedents: Pack Attack (delivery-line MR party game, Social honorable mention); Loop One: Done (MR automation game) submitted an update and did not win.

## 2026 edition — structure
- $1M, 20 awards: per track (Gaming, Entertainment, Productivity) × division (New, Adapted/Updated) a winner + runner-up; six $25k special awards (Social & Multiplayer, Agentic Interaction, Reason to Come Back, First Five Minutes, Accessibility Forward, Boldest Original Concept); two $20k Judges' Choice.
- 2,182 participants registered on 2026-10-05 (day 12 of 55). Projection: ~660–910 submissions; Adapted Gaming ~120–230.

## Shared traits of winners (from their Devpost write-ups)
1. **One signature interaction, explainable in a sentence.** Tiny Golf: pinch-pull-release slingshot on a tabletop course. Awesome Hand: your hands are the physics objects. Little Critters: squash enemies against real walls. Final Throwdown: punch with tracked fists.
2. **Familiar premise, zero explanation.** Tiny Golf picked golf on purpose so all effort went into interaction.
3. **Product, not demo.** Tiny Golf shipped brand identity and a trailer within the month and treated it as a store-ready product; Le Dino Labo (experienced studio) cut features to polish snap/feedback/lighting; Pocket Lands launched early access two days after winners were announced.
4. **Hands by intent, not raw gestures.** Little Critters supports multiple grab poses discovered in playtests and never drops carried items when hands leave tracking view; Pocket Lands disables raycast when the pinch point is near world blocks to avoid conflicts; Hand Survivor kept gestures distinct to avoid false triggers.
5. **Early tests with new people.** Final Throwdown: public playtest at a library + Discord beta; redesigned the boss so players never need locomotion (seated-friendly).
6. **Short sessions + growth.** Hand Survivor: skill draft at level-ups + persistent codex/achievements. Le Dino Labo: collection/museum planned.
7. **Performance discipline.** Pocket Lands: large diorama at smooth 90 fps; Hand Survivor: pooling, event-driven updates, GC care; HandCraft XR (WebXR): instancing, batching, adaptive shadows.
8. **Reuse of prior work.** Tiny Golf reused older Unity systems; Pocket Lands' engine took a year; Saber Punks had 5 years of gameplay before adding MR.

## Current top MR / hands games (2025–2026)
- UploadVR 2025: Best MR game Little Critters; best hand-tracking game Jigsaw Night; best early-access MR game Laser Dance; MR nominees include Table Troopers, Crystal Commanders, Star Wars: Beyond Victory; early-access MR nominees include Loop One: Done and Galactic Traffic Control.
- VR.org (Sep 2026) best MR games: Laser Dance, Starship Home, Little Critters, Cybercore Protocol, Wall Town Wonders, Drop Dead: The Cabin, Demeo Battles, Cubism. Common traits: obvious premise, uses real room geometry, short sessions, hands supported, $10–20.
- Table Troopers (Meta case study): hands-first tabletop strategy; "all you need is pinch"; required 99.9% hand reliability before shipping hands; intent inference (uses the pose from ~0.5 s before release); units that fall off the table stay on the floor; pillars: minimal friction, no artificial locomotion, MR first, hands first, short sessions, high replayability; 4.8★; DLC > half of revenue; Horizon+ grew MAU >5×.
- Revenue charts are dominated by free-to-play social games (UG, Animal Company, Gorilla Tag) and evergreen hits; 2026 trend: simulators/action up, puzzle/casual down.

## Platform direction (Meta Connect 2026)
- Meta VR Glasses (spring 2027): ~100 g, eye tracking + hands primary, controllers optional, FoV ≈ 70×66° vs Quest 3 110×96°; Meta advises moving key UI toward the center.
- SDK v207: ISDK Gaze Interaction; Eye Gaze Interaction building block (switches gaze/raycast by device); Meta VR Simulator with VR Glasses profile (hand tracking via laptop camera); Meta XR Operator for Unity (agents build/test/verify).
- Store prioritizes hand-tracked titles for hands-only users.

## Key success factors → where they live in our plan
| Factor | Plan location |
|---|---|
| Signature interaction in one sentence | D-016 (decide Oct 18), PRODUCT_THESIS wedge |
| Familiar premise | D-002 |
| Real room matters | Pillar 3, D-015 |
| Hands by intent | EXP-XR-11, skills/xr-interaction-review |
| Product-level polish | ART_DIRECTION v0.2, Phase 4 |
| Early naive playtests | PLAYTEST_PLAN |
| Short sessions + reason to come back | D-006, D-014, EXP-XR-10 |
| Platform alignment (gaze, FoV, seated) | D-012, D-013, EXP-XR-08/09 |
| Social (stretch) | D-011 Tier 2 |
| Strong submission | COMPETITION_CHECKLIST v0.2 |

## Sources
- 2025 gallery: https://start-developer-competition.devpost.com/project-gallery
- Winners: https://developers.meta.com/horizon/blog/meta-horizon-start-developer-competition-meet-the-winners/
- Devpost pages: tiny-golf, little-critters, realcast-game-working-title (Le Dino Labo), saber-punks, pack-attack, handsurvivor, pocket-lands, awesome-hand, nanauts, dunjun, sumo-boxing (Final Throwdown), handcraft-xr-winter-edition (https://devpost.com/software/<slug>)
- 2026 rules: https://start-developer-competition-26.devpost.com/rules
- Table Troopers: https://developers.meta.com/horizon/discover/success-stories/table-troopers/
- UploadVR awards 2025: https://uploadvr.com/best-2025-hand-tracking-mixed-reality-early-access-games
- VR.org best MR 2026: https://vr.org/best-mixed-reality-games
- Loop One: Done: https://www.uploadvr.com/loop-one-done-early-access/ ; https://vrdb.app/game/7997634810352504
- Galactic Traffic Control: https://uploadvr.com/galactic-traffic-control-vr-mini-mode
- Connect 2026 recap: https://developers.meta.com/horizon/blog/meta-connect-recap-start-building-the-future-of-vr/
- ISDK gaze: https://developers.meta.com/vr/documentation/spatial-sdk/spatial-sdk-isdk-gaze/
- Best-selling Quest games (May 2026): https://www.roadtovr.com/?p=127181
