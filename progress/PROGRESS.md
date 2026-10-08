# Progress log (append-only)

Agents and the loop append one entry per finished or blocked task. Never edit earlier entries (the gates check this file is append-only). Newest at the bottom.

Format:
```
## YYYY-MM-DD HH:MM — <TASK-ID> — done|blocked
- What changed: 1–3 lines
- Evidence: paths / commands with results
- Gates: quick PASS|FAIL, full PASS|FAIL
- Learnings: gotchas the next agent needs (durable ones also go to AGENTS.md → Learnings)
```

## 2026-10-05 23:25 — A-000 — done
- What changed: plan v0.2 (dates, scope tiers, decisions D-011..D-019, competitive research, playtest plan) and the autonomous development system (task queue, loop, gates with anti-cheat, review packet, Claude Code hooks/subagents/skills, FoV checker).
- Evidence: docs/xr/AUTONOMY.md, docs/xr/RESEARCH_2025_WINNERS.md, `npm run gates` (full) PASS, `npm run loop:selftest` PASS.
- Gates: quick PASS, full PASS
- Learnings: run the loop from a clean integration branch; `.agent/` holds runtime state and is gitignored.

## 2026-10-08 13:20 � CHK-01 � done
- What changed: Provisional IWSDK walking skeleton (source?procA?buffer?procB?sink, jam, BOOST snap/DEV FALLBACK, cash/grade, next shift). Unity parity timeboxed and stopped; D-007 remains OPEN. Checkpoint-01 package + Devpost draft prepared; no public deploy.
- Evidence: evidence/comp/CHECKPOINT-01.md, evidence/comp/checkpoint-01/, evidence/xr/factory-checkpoint/, evidence/xr/killtest-unity/SPRINT02-UNITY-STOP.md; 
pm --prefix xr-iwsdk test 17 PASS; 
pm --prefix xr-iwsdk run build PASS; browser LOOP-*.png (BROWSER / DEV_FALLBACK_KEY labeled).
- Gates: quick PASS; full PASS with UNITY_PATH cleared for this run (unity:editmode skipped � Editor held project / MCP disconnected).
- Learnings: vite-plugin-dev runtime ownership blocks vitest while dev:runtime is up; Playwright needs system Chrome channel or browser install + ignoreHTTPSErrors for IWSDK TLS; do not let Unity setup consume the shipping day.

## 2026-10-08 13:25 — CHK-01 — done
- What changed: Clarifies prior CHK-01 progress encoding: IWSDK walking skeleton shipped (line/jam/BOOST/cash/grade); Unity timeboxed stop; checkpoint package ready; no public deploy; D-007 OPEN.
- Evidence: commits ee12e50 + d6b7cf1; evidence/comp/checkpoint-01/; evidence/xr/factory-checkpoint/; SPRINT02-UNITY-STOP.md.
- Gates: quick PASS; full PASS (unity:editmode skipped by clearing UNITY_PATH for the run).
- Learnings: Prefer ASCII in PowerShell-appended progress lines on Windows.

## 2026-10-08 15:00 — CHK-01B — done
- What changed: Prompt 03 shippable checkpoint — IWER hand loop (inputSource xr), 60s shift + world grade board, GitHub Pages URL, HERO screenshots, checkpoint zip; Unity still blocked; D-007 OPEN.
- Evidence: evidence/xr/factory-checkpoint/EMULATOR-HAND-LOOP.json; evidence/comp/checkpoint-01/screenshots/HERO-*.png; https://michalex93.github.io/tiny-factory-rush/; artifacts/tiny-factory-rush-xr-checkpoint-01.zip.
- Gates: re-run after commit.
- Learnings: IWER CLI screenshots are slow (~7s); reset shift with R before intervention so snap lands while phase=running.
