# Scrapshot · prototype 01

A five-site physics demolition experiment. Find a weak support, choose a ricochet, heavy or magnetic ball, and clear the target within three shots. Original procedural canvas art; English and Spanish UI. This is a prototype for testing the core action, not a release candidate.

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
