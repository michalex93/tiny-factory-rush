# Meta VR Start Developer Competition 2026 — Checklist v0.2

Execution checklist built from the official rules (read 2026-10-05). It does not replace re-reading the rules within 72 h of submission: https://start-developer-competition-26.devpost.com/rules

Every checked item must link to evidence (file path, URL or commit).

## Key facts
- Deadline: **Wed Nov 18, 2026, 12:00 PT = 14:00 CST (Celaya)**. Internal target: Mon Nov 16, 20:00 CST.
- Division/track: **Adapted/Significantly Updated × Gaming** (D-018).
- One entry per individual; one prize per entry; special awards are open to both divisions.
- Judging: Stage One pass/fail (fits theme, applies required tools/features) → Stage Two, four criteria at 25% each: Innovation & Creativity, Experience Design, Technical Implementation, Polish & Presentation. AI tools may assist judges; humans decide.
- Judges are not required to watch video beyond 3 minutes.

## Eligibility / administration
- [x] Meta VR Start membership approved (welcome email 2026-10-05).
- [ ] Devpost registration complete (screenshot in `evidence/comp/`).
- [ ] Entrant/team details accurate (adults; residency not in an excluded region — exclusion is by residence).
- [ ] Division and track selected: Adapted/Significantly Updated × Gaming.
- [ ] Adaptation baseline preserved: pre-competition commits (2026-09-05 → 2026-09-23), CrazyGames submission email (2026-09-23), web screenshots.

## Adaptation evidence (Adapted division)
- [ ] "What existed before Sep 24" summary (web game: loop, campaign, product ladder) with commit links.
- [ ] "New during the window" summary: MR tabletop mode, hands-first interaction, gaze + pinch, new platform build.
- [ ] Dated changelog of MR work (from `progress/PROGRESS.md`).
- [ ] History not rewritten (no force-push over pre-competition commits).

## Experience (hard requirements)
- [ ] Fully usable with hands end-to-end; controllers optional only.
- [ ] Seated/stationary: every interaction works within a 2 ft (0.61 m) radius — "airplane seat test".
- [ ] FoV-aware: critical state and frequent interactables inside the VR Glasses budget (`npm run xr:fov` passes).
- [ ] Passthrough is purposeful: the real table materially changes play.
- [ ] No essential tiny text; no wall-of-text onboarding.
- [ ] Interaction understandable in unfamiliar rooms/tables.
- [ ] Pause/exit/recovery behavior is sane; hand-loss recovery handled.

## First five minutes (also "Best First Five Minutes" award)
- [ ] First action ≤30 s.
- [ ] First reward ≤60 s.
- [ ] First visible problem by ~3 min.
- [ ] First meaningful intervention by ~4 min.
- [ ] Satisfying payoff by ~5 min.

## Technical (Stage Two: Technical Implementation)
- [ ] ≥60 fps (low-percentile) on Meta Quest hardware in a busy state; 20-minute thermal run recorded.
- [ ] Hand tracking with intent buffering, multiple grab poses, tracking-loss rules.
- [ ] Gaze + pinch interaction (ISDK v207+ if Unity) with fallback.
- [ ] Spatial anchoring / table detection tested across rooms.
- [ ] No critical runtime errors (log captured).
- [ ] Build/load path documented and tested from a clean device.

## Reason to come back (also "Best Reason to Come Back" award)
- [ ] Persistence across app restarts.
- [ ] Visible cross-session progress (product ladder).
- [ ] Best grade per contract + daily contract.

## Polish (Stage Two: Polish & Presentation)
- [ ] Coherent art direction from a single asset source (see ART_DIRECTION.md).
- [ ] Machine silhouettes distinguishable at tabletop distance.
- [ ] State communicated by shape/motion/audio, not color alone.
- [ ] Spatial audio restrained and useful (factory rhythm).
- [ ] Snap/place feedback polished.
- [ ] No debug UI in submission build.

## Build distribution
- [ ] Unity/native: APK uploaded to the Meta VR Developer Dashboard in a **new release channel named "Competition"**.
- [ ] WebXR/IWSDK: public URL judges can open on Quest.
- [ ] Free of charge, with sufficient access for judging until the winner announcement (~Dec 11, 2026).
- [ ] No changes after the deadline.

## Submission package
- [ ] English (or English subtitles) everywhere.
- [ ] One-line tagline that names the signature interaction.
- [ ] Devpost write-up organized by the four criteria (one section each, concrete evidence, no fluff).
- [ ] Video < 3 min, footage as viewed on a Meta Quest device (or XR Simulator), public on YouTube/Vimeo; opens with the strongest MR moment within the first seconds.
- [ ] Screenshots from the actual build.
- [ ] Target launch date (if not already on the store).
- [ ] Licenses/attributions for every external asset.
- [ ] Final rules re-checked within 72 h of submission.
- [ ] Submitted before the internal deadline, not at the official last minute.
