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
