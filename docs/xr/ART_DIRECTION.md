# XR Art Direction — v0.2

Visuals are the project's historical weak point (both CrazyGames rejections cited visuals) and Polish & Presentation is 25% of the score. v0.2 adds an owner, a pipeline, budgets and dates.

## Target
Toy / diorama / abstract industrial.

The factory should look like a premium tabletop toy the player wants to touch.

## Principles
1. Silhouette before texture.
2. Fewer, larger forms.
3. Strict palette.
4. State through motion + form + restrained color.
5. Soft contact with the real table (contact shadows, no floating).
6. No photorealistic factory grime.
7. Avoid mixed asset-library styles.

## Ownership and dates
- Owner: Michel (final say). Agents propose; the owner approves the style board.
- Style board (6–10 references + 1 palette + 1 material sheet): **Mon Oct 26**.
- Art lock (single asset source + palette + material set): **Tue Oct 27**.
- EXP-XR-06 blind A/B (stills, ≥20 people, can be online): **Tue Nov 3**.
- Art/audio pass complete: **Sat Nov 7** (feature freeze).

## Pipeline (pick ONE source at art lock)
1. **One coherent low-poly kit** (paid or CC0) as the base, recolored to our palette; or
2. **Custom primitives** (rounded boxes, cylinders, bevels) generated procedurally — safest for coherence and performance; or
3. **AI-assisted models** only if retopologized/cleaned to match the kit; otherwise replaced (asset rule below).

Every external asset gets a line in `docs/xr/ASSET_LICENSES.md` (create on first use): name, source URL, license, modifications.

## Performance budgets (Quest, busy state)
- Active products on screen: design for ≤120, test at 150.
- Draw calls: target ≤150 (instancing/batching for products).
- Triangles: ≤300k visible.
- Lights: 1 realtime directional max; baked/fake contact shadows.
- No physics for belt motion: deterministic waypoints; physics only for spills (pooled, capped).
Budgets are hypotheses until profiled on device (EXP-XR-07).

## Initial palette roles
Use semantic roles (exact colors chosen at art lock):
- neutral machine body;
- flow/healthy;
- warning/stress;
- priority/urgent;
- currency/reward;
- background/ghosted.

Keep total simultaneous high-salience colors low. Never encode state by color alone (Tier 1 accessibility basics, D-011).

## Scale
Provisional:
- machine footprint: roughly palm-sized / clearly grabbable;
- products: large enough to read at tabletop distance;
- snap points: visually obvious;
- labels: secondary, not required to understand state.

Exact dimensions must be validated in-headset and with `npm run xr:fov` (everything critical inside the VR Glasses cone).

## Motion language
- placement: short settle/compression;
- production: rhythmic and readable;
- blocked: visibly stalls/backpressure;
- stress: subtle vibration/smoke/tempo change;
- overflow: products pile at the bottleneck first, then spill toward the player (D-015);
- reward: quick, crisp, non-screen-shaking celebration.

## Audio language
Efficient line -> coherent groove (factory rhythm).
Congestion -> rhythm loses synchronization.
Critical event (overflow) -> localized high-salience cue that pulls the eyes to the spill.

Avoid constant alarm loops.

## Asset rule
If an external or AI-generated asset cannot be made visually coherent with the system cheaply, replace it with a simpler custom primitive.
