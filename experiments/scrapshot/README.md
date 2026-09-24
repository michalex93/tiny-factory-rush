# Scrapshot · prototype 03

A ten-site physics demolition experiment. Find a weak support, choose a ricochet, heavy or magnetic ball, and clear the target within three shots (up to six with upgrades and the ammo depot). Original procedural canvas art; English and Spanish UI. This is a prototype for testing the core action, not a release candidate.

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

No account, backend, ads or external analytics. Export playtest downloads the last 200 local events; it sends nothing to us. Progress is separate from the existing factory game's storage. Browser-local records are exploratory and can be cleared or altered.

The three tools are implemented, but difficulty, tool balance, touch usability and visual polish still need human playtesting. The dotted trajectory is an aiming guide, not a collision prediction. CrazyGames SDK integration and platform QA are future work after validating the loop.

See [plan](../../docs/SCRAPSHOT_PLAN.md) and [validation](../../docs/SCRAPSHOT_VALIDATION.md).

## Workshop (0.2.0)

Clear sites to earn coins: first clear pays 100 + 20 × site index (zero-based), plus 20 per newly earned star. Replays pay 25 + 5 × site index plus any new star improvement. Failed attempts pay no coins, but retain newly recovered scrap. Stars depend on shots used: one shot earns three stars, two shots two stars, three or more one star.

Before the first shot, buy reinforced impact (+25% projectile mass per rank, three ranks costing 100/220/380) or an extended magazine (+1 shot per rank, two ranks costing 180/360). Impact adds gold bands to the barrel. Purchases save immediately. Old saves receive first-clear and star credit once; completed site 5 now unlocks site 6.

## Rebuild the workshop (0.3.0)

Sites 6–10 now have distinct layouts: freight bridge, staircase, iron cargo, offset tower and three separate towers. All ten remain solvable with three baseline shots.

Each site awards scrap only for increases in its highest recovered percentage, capped at 100 scrap per site (1,000 for the campaign). Scrap is banked after settled shots, on results, retry and changing sites; refreshing during flight can lose unbanked recovery. Replaying or reloading cannot repay an existing record. Coins retain the established clear/replay payouts.

Spend scrap on three sequential visible projects: precision bench (90, longer approximate aiming guide), magnetic coil (180, magnet lasts 5 seconds instead of 3.2), ammo depot (280, +1 shot per site). Projects can be built before the first shot. Their total 550 scrap requires progress in at least six sites; they do not require grinding repeat clears.

New players unlock heavy at site 3 and magnet at site 4. Existing saves retain all tools, coins, upgrades, stars and level access. Completed sites receive 100 scrap each once during schema-3 migration; this is immediately persisted and marks their recovery records paid. Workshop, tools and recovery events are included in local export. Actual retention and commercial effects remain unmeasured.
