---
name: art-direction
description: Visual quality rules for the XR diorama (silhouettes, palette, materials, motion, thumbnails) and the single-asset-source pipeline. Use when creating or reviewing visuals, assets, materials, UI, screenshots or the video thumbnail.
---
<!-- Generated from skills/art-direction/SKILL.md by `npm run skills:sync`. Edit the source, not this copy. -->

# Skill: XR Art Direction

## Read first
docs/xr/ART_DIRECTION.md (owner, dates, pipeline, budgets).

## Procedure
1. Use only the asset source locked at art lock (Oct 27); log every external asset in docs/xr/ASSET_LICENSES.md.
2. Check silhouette at tabletop distance; remove detail that does not survive it.
3. Keep the palette semantic and restrained; never encode state by color alone.
4. Machine states must be understandable without labels.
5. Respect performance budgets (instancing for products, ≤150 draw calls target, no per-frame allocations).
6. Review actual simulator/headset captures, not editor views.
7. Test thumbnail/first-frame separately from in-game beauty.

## Reject when
- the asset looks realistic but reduces readability;
- tiny labels are required;
- the style conflicts with the rest of the diorama;
- an effect harms comfort/performance;
- art hides the flow state or the overflow.

## Evidence
Before/after screenshot or headset capture in `evidence/art/`; EXP-XR-06 A/B for major direction changes.
