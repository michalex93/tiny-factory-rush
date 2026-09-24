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
