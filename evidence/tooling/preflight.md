# Toolchain Preflight — Prompt 01

Date: 2026-10-06  
Branch: `feat/xr-competition-build`  
Base planning commit: `44cc09ffa42511b9fd579131e8af9ee5452f7261`  
Machine: Windows desktop (Celaya owner PC)

## Host

| Item | Value |
|---|---|
| OS | Microsoft Windows NT 10.0.26200.0 (win32) |
| Shell | PowerShell 5.1.26100.9444 |
| CPU | Intel(R) Core(TM) i7-10510U CPU @ 1.80GHz (8 logical) |
| GPU | Intel(R) UHD Graphics |
| RAM | 11.8 GB |

## Root web toolchain

| Item | Value |
|---|---|
| Node | v22.22.0 (meets Node 22 baseline; also satisfies IWSDK `>=22.12`) |
| npm | 11.6.2 |
| Git | 2.46.2.windows.1 |
| `npm ci` | PASS |
| `npm run gates` | see session report (unit flake fixed via 30s timeout on heavy sim diagnostic) |
| `npm run loop:selftest` | PASS |
| `npm run loop -- --dry-run` | PASS (`no-eligible-task` on clean tree; expected) |

## Agent tooling

| Tool | Status |
|---|---|
| Claude Code CLI (`claude`) | NOT INSTALLED on PATH |
| Codex CLI (`codex`) | NOT INSTALLED on PATH |
| Loop hooks / selftest mock agent | PASS via `npm run loop:selftest` |
| Unattended loop | NOT STARTED (supervised bootstrap only) |

## Candidate A — IWSDK / WebXR

| Item | Value |
|---|---|
| Official scaffold | `npm create @iwsdk@latest` (`@iwsdk/create@1.0.1`) |
| Project path | `xr-iwsdk/` |
| Target | AR/MR + grabbing + scene understanding + environment raycast |
| `@iwsdk/core` | 1.0.1 |
| `@iwsdk/cli` | 1.0.1 |
| Emulator | IWER managed browser + `metaQuest3` / `living_room` (SEM) |
| Reference warmup | FAILED once (timeout 120s); optional; not blocking build |

## Candidate B — Unity + Meta XR

| Item | Value |
|---|---|
| `UNITY_PATH` | unset / empty |
| Unity Hub Editors | NOT FOUND under standard Program Files paths |
| Meta XR Core SDK v207 | NOT FOUND |
| Meta XR Simulator | NOT FOUND |
| Meta XR Operator | NOT FOUND |
| Android / ADB | `adb` NOT on PATH |
| Quest Developer Hub | NOT FOUND |
| Status | **NEEDS-HUMAN** — see `evidence/xr/killtest-unity/NEEDS-HUMAN.md` |

Official Meta docs consulted (2026):
- Unity requirements: Editor **6000.0.66f2+**, Android Build Support + OpenJDK + SDK/NDK
- Meta XR Operator: Unity 6000.0.x+, Core SDK **v207+**, OpenXR Plugin **1.17.0+**
- Meta XR Simulator: standalone OpenXR runtime (Windows 10+ 64-bit)

## Quest hardware

| Item | Value |
|---|---|
| Quest connected | NO (no ADB; no headset detected this session) |
| Real-hardware kill test | NOT RUN |

## Blocking components

1. Unity 6 LTS + Android modules + Meta XR Core SDK v207 (+ Simulator / Operator) — required for candidate B.
2. Claude Code / Codex CLI — required before starting the unattended agent loop (not required for this supervised Prompt 01 kill-test work).
3. Quest + ADB — required before D-007 can close.

## Non-blocking / optional

- IWSDK reference asset warmup cache
- Quest Developer Hub
