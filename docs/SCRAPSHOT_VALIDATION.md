# Scrapshot validation — 2026-09-24

## Local results

- Prototype: production build and TypeScript check pass; 16 automated checks pass.
- Five structures stay upright for ten seconds without input and have a solution within three shots in the physics simulation.
- The compiled application can complete the five-site campaign through its actual UI handlers in a simulated DOM. Reload restores the last unlocked site.
- Pause, three failed shots, retry, Spanish language switch, corrupt save handling, bounded aiming and metal-only magnet forces are covered.
- Existing factory game: 136 tests pass, 3 skipped; production build passes. Its runtime files and dependencies were not changed.
- Prototype build approximately 116 KB uncompressed (HTML, JS and CSS), excluding transport overhead. No remote art or font dependencies.

## Defects found and corrected

- Site 4 initially awarded progress before a shot: raised its clear line.
- Low-power projectiles rolled too far: increased drag and contact friction so poor aiming can fail.
- Turns could end while the projectile was still moving: settling now includes projectile speed.

Physics tests and UI simulations have different inter-shot timings. UI solutions use 5°/70% for sites 1, 3 and 5; 5°/100% for site 2; 10°/100% for site 4. These are regression fixtures, not recommended difficulty tuning.

## Outstanding gate

Real browser navigation to the local preview was blocked by this environment's security policy. No screenshot, physical touchscreen test, real-browser layout check or measured mobile frame rate is claimed. The simulated DOM stubs canvas drawing and audio, so it cannot validate rendering, sound or touch ergonomics. Keep the PR in draft until desktop and mobile checks are performed.

Manual checks: first launch at 390px and desktop widths; aim/cancel with touch; keyboard controls and modal focus; mute/pause and background resume; all three tools; loss/retry; campaign completion and reload; console errors and frame rate on an ordinary phone.

## Product validation next

Observe 10–15 fresh players without coaching. Record time to first shot, voluntary retries, levels completed and moments of confusion. Use the local export only with the tester's awareness. Improve the weakest part of the loop before adding content or monetization. Neither these tests nor technical compatibility prove demand, revenue or CrazyGames acceptance.

## 0.2.0 — workshop follow-up

31 automated checks pass, including all ten sites through compiled UI handlers, old-save migration, one-time credit persistence, purchase costs/caps, shot-budget changes, no duplicate completion payouts, and physical mass increases. Ten structures remain standing before input and have baseline three-shot solutions. New sites are reinforced variants, not five entirely new layouts. Browser visual/mobile QA remains unverified; the owner reported the previous published version looked good. Economy balance and difficulty are provisional.

## 0.3.0 — benchmark-driven progression

34 checks pass. Added migration coverage for preserved currencies/upgrades/tools and one-time scrap credit; partial recovery and duplicate-recovery protection across reload; gradual tool access; project costs, persistence and actual UI shot-budget changes. The compiled UI completes all ten changed sites with baseline equipment. Ten structures stay upright for ten seconds and have three-shot solutions.

New UI solution fixtures: sites 6/8/9 at 5°/70%, site 7 at 5°/85%, site 10 at 5°/100%. These are feasibility checks, not difficulty or fun ratings. New workshop cards are responsive in CSS; real-browser and touch QA remain outstanding. No revenue, retention improvement or platform approval is claimed.

## 0.3.1 — usability audit corrections

35 automated checks pass. A new integration scenario checks bilingual visible aiming/cancel instructions, pause during flight, blocked background Retry and R shortcut, unchanged round state while paused, Escape resume and Next after victory. Dialogs now live outside the canvas clipping container, cover the viewport, make header/main inert, and constrain their scrollable content to the available viewport height. Explicit hidden-button CSS keeps the victory-only Retry action out of the pause dialog.

The approved internal browser preview was attempted on 2026-09-24 and returned ERR_BLOCKED_BY_CLIENT. No visual/mobile or physical-touch verification is claimed. Fixed viewport positioning removes dependence on the short mobile canvas height, but real rendering remains a manual gate.

## 0.4.0 — distinct aiming challenges and impact tiers

40 automated checks pass. The ten-site compiled UI campaign uses baseline solutions including site 4 at 18°/100%, site 6 at 25°/85%, site 9 at 35°/70%, and site 10 at 25°/85%. Physics fixtures verify pre-input stability, first-collision damage changes, larger caliber, area destruction that preserves metal, and failure of six fully upgraded low shots for every tool on each of the four walled sites.

The owner reported 0.3.1 looked good on their phone. This is evidence about that version's appearance on one device, not observed touch/performance QA of 0.4.0. Browser testing remains blocked. Human difficulty, upgrade satisfaction and retention are unmeasured.


## 0.4.1 submission candidate

41 automated tests passed, including absence of playtest export/telemetry and retained saved progress. Build succeeded. No new real-browser result is claimed: managed preview was blocked by ERR_BLOCKED_BY_CLIENT. Offline native-canvas promotional rendering is media production only. Verify loading, controls, pause/resume, saves and readability in the CrazyGames portal on desktop and a real phone before submission.
