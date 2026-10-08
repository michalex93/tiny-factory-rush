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

Current development checkpoint validated in Meta's IWSDK emulator; target-device validation is scheduled next.

Public development checkpoint: https://michalex93.github.io/tiny-factory-rush/

## INSPIRATION

Desk toys and living systems you can touch — a factory that feels like a kinetic diorama. The fun is reading the line with your eyes and fixing it with your hands, not reading charts.

## HOW BUILT

Provisional IWSDK (`@iwsdk/core` 1.0.1) walking skeleton: deterministic local simulation, Three.js stations/products, OneHandGrabbable + hand-pinch grab, snap BOOST intervention, DOM + world-space result board. Unity + Meta XR 207 path explored in parallel for D-007; no final engine lock. Emulator evidence labeled honestly (not Quest).

## FUTURE PLANS

Close D-007 with measured parity, verify on Quest, polish signature intervention / overflow hypothesis, art/audio coherence, and ship the ≤8-minute judge journey for Meta VR Start 2026.

## TARGET LAUNCH

Provisional / competition development checkpoint (not a store release claim).

## HAND INTERACTIONS

IWER-validated hand pinch grab of a BOOST module; move while held; snap into a large pad. Structured logs use `inputSource: xr` for the XR GrabSystem path. A `?dev=1` keyboard path exists for debugging only and is not used for hero evidence.
