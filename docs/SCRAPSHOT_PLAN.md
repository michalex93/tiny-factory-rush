# Scrapshot — bounded prototype

Status: implementation experiment, not ready for submission or validated commercially.

## Hypothesis
A readable physical collapse plus a meaningful choice of shot invites voluntary retries. Inspired by the design patterns observed in browser physics games; original implementation and procedural artwork. Working name, not trademark-cleared.

## Scope
- Independent Vite / TypeScript / Matter.js application in experiments/scrapshot.
- Five hand-authored structures; wood, glass and metal.
- Standard, heavy and magnetic shots; fixed three-shot budget.
- Pointer / touch aiming and accessible keyboard angle/power controls.
- Immediate restart, pause, sound toggle, reduced-motion support.
- Local progress and bounded local playtest events; no network analytics.
- English / Spanish interface.

## Validation gate
Build and unit checks plus real browser interaction. Check no pre-shot collapse, finite shot budget, reachable success, retry after failure, level progression, reload, keyboard and touch layout. Human fun/retention testing remains necessary. No paid ads, third-party analytics or CrazyGames submission in this milestone.

## Git discipline
Feature branch feat/scrapshot-prototype from master; separate planning and implementation commits; PR with reproducible commands and honest limitations. No automatic merge, no generated dist or node_modules in Git. The original factory game is preserved.

## Next decision
Test with 10–15 people without coaching. Record first shot, voluntary retries, completed levels and frustration. Advance only if the core action is understood and repeated voluntarily. These are exploratory observations, not proof of revenue or statistically reliable retention.
