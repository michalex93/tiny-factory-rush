# Devpost draft — NOT SUBMITTED

> Draft only. Do **not** submit unless Michel explicitly instructs.

## NAME

Tiny Factory Rush XR

## TAGLINE

A living toy factory on your table. Fix the line with your hands before the shift collapses.

(≤140 chars — count: 94)

## TRACK

Gaming

## DIVISION

Adapted / Significantly Updated Gaming Experience

## BEFORE COMPETITION

Tiny Factory Rush already existed as a web industrial-strategy / management game: a miniature factory the player steers under pressure with mouse/touch, focusing on decisions and visible consequences rather than dashboards.

## NEW DURING COMPETITION

MR / hands-first tabletop slice: the factory runs on a real (or fallback) table; products flow through a crude line; a jam becomes visually obvious; the player grabs a BOOST module and snaps it into a correction slot; cash and grade close the short shift. Built provisionally on IWSDK/WebXR while Unity comparison continues (D-007 open).

## INSPIRATION

Desk toys and living systems you can touch — a factory that feels like a kinetic diorama. The fun is reading the line with your eyes and fixing it with your hands, not reading charts.

## HOW BUILT

Provisional IWSDK (`@iwsdk/core` 1.0.1) walking skeleton: deterministic local simulation, Three.js stations/products, proven grab/snap interaction path, DOM HUD for cash/shift/grade. Unity + Meta XR 207 path explored in parallel for D-007; no final engine lock. Evidence logged honestly (emulator/browser vs Quest).

## FUTURE PLANS

Close D-007 with measured parity, verify on Quest, polish signature intervention / overflow hypothesis, art/audio coherence, and ship the ≤8-minute judge journey for Meta VR Start 2026.

## TARGET LAUNCH

Provisional / competition development checkpoint (not a store release claim).

## HAND INTERACTIONS

One-hand grab of a BOOST module; rotate while held; snap into a large highlighted pad. Intent/tracking buffers exist from the interaction kill-test. DEV FALLBACK keyboard exists for automation only and is not a Quest claim.
