# Scrapshot · 0.4.1

A ten-site physics demolition experiment. Find a weak support, choose a ricochet, heavy or magnetic ball, and clear the target within three shots (up to six with upgrades and the ammo depot). Original procedural canvas art; English and Spanish UI. Submission candidate for CrazyGames Basic Launch; portal QA remains pending.

## Run

Use Node 24 LTS and npm. From this directory:

```sh
npm ci
npm run dev
```

Open the URL Vite prints. In restricted environments use `npm run dev -- --host 127.0.0.1`.

Drag within the scene and release to shoot, or adjust angle and power then press Fire. Drag outside to cancel. P pauses; R retries. Levels unlock and stars save locally. A second campaign can use different tools or fewer shots.

```sh
npm test
npm run preview
```

`npm test` typechecks, builds, and runs physics plus simulated DOM integration checks. `dist/` is a static web build with relative asset paths; serve it over HTTP. CI attaches that directory as a downloadable artifact. No publishing is automatic.

## Boundaries

No account, backend, ads or external analytics. Only gameplay progress and preferences are saved locally; playtest telemetry and export were removed in 0.4.1. Progress is separate from the existing factory game's storage. Browser-local records are exploratory and can be cleared or altered.

The three tools are implemented, but difficulty, tool balance, touch usability and visual polish still need human playtesting. The dotted trajectory is an aiming guide, not a collision prediction. The CrazyGames SDK is not included; it is optional for Basic Launch. Platform QA remains pending.

See [plan](../../docs/SCRAPSHOT_PLAN.md) and [validation](../../docs/SCRAPSHOT_VALIDATION.md).

## Workshop (0.2.0)

Clear sites to earn coins: first clear pays 100 + 20 × site index (zero-based), plus 20 per newly earned star. Replays pay 25 + 5 × site index plus any new star improvement. Failed attempts pay no coins, but retain newly recovered scrap. Stars depend on shots used: one shot earns three stars, two shots two stars, three or more one star.

Before the first shot, buy reinforced impact (+25% projectile mass per rank, three ranks costing 100/220/380) or an extended magazine (+1 shot per rank, two ranks costing 180/360). Impact adds gold bands to the barrel. Purchases save immediately. Old saves receive first-clear and star credit once; completed site 5 now unlocks site 6.

## Rebuild the workshop (0.3.0)

Sites 6–10 now have distinct layouts: freight bridge, staircase, iron cargo, offset tower and three separate towers. All ten remain solvable with three baseline shots.

Each site awards scrap only for increases in its highest recovered percentage, capped at 100 scrap per site (1,000 for the campaign). Scrap is banked after settled shots, on results, retry and changing sites; refreshing during flight can lose unbanked recovery. Replaying or reloading cannot repay an existing record. Coins retain the established clear/replay payouts.

Spend scrap on three sequential visible projects: precision bench (90, longer approximate aiming guide), magnetic coil (180, magnet lasts 5 seconds instead of 3.2), ammo depot (280, +1 shot per site). Projects can be built before the first shot. Their total 550 scrap requires progress in at least six sites; they do not require grinding repeat clears.

New players unlock heavy at site 3 and magnet at site 4. Existing saves retain all tools, coins, upgrades, stars and level access. Completed sites receive 100 scrap each once during schema-3 migration; this is immediately persisted and marks their recovery records paid. Local event export was removed in 0.4.1. Actual retention and commercial effects remain unmeasured.


## Shot variety and tangible upgrades (0.4.0)

Striped fixed barriers on sites 4, 6, 9 and 10 obstruct low shots; the overhead beam on site 7 favors low trajectories. Barriers never count toward recovered scrap or demolition targets. Existing layouts and hints combine these obstacles with bridges, metal loads and offset floors. Three background palettes separate the early yard, industrial section and late sites.

Impact upgrades retain the 100/220/380 prices and mass increases. Rank 1 deals two damage instead of one on a strong direct hit (wood has two HP). Rank 2 also adds four world units to projectile radius. Rank 3 releases one 90-unit pulse on its first collision above the collision-speed threshold, destroying nearby wood and glass but not metal or barriers. Each rank adds 25 units of magnet range. Barrel size, gold bands, projectile trails, enlarged ammo and the purple pulse communicate progress. Purchases and existing save ranks retain their values.

Feasibility remains three shots with baseline equipment. New regression checks verify that six 5°/100% shots with fully upgraded equipment, for each ammo type, cannot clear the four walled sites. This prevents one specific repetitive strategy; it does not establish human difficulty or retention. No moving targets, protected-objective mode or hinged counterweights are implemented in this version.

## Submission preparation (0.4.1)

English is the fallback language. Production labels replace prototype labels; mobile safe areas and touch selection are handled. See `submission/LEEME_PUBLICACION.md` for the upload checklist. The 41 checks are automated physics/DOM checks, not real-browser certification. Promotional videos use the actual compiled canvas/physics in an offline renderer; they are not browser QA evidence.
