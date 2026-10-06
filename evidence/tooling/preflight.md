# Toolchain Preflight — Prompt 01 / 01B

Date: 2026-10-06  
Branch: `feat/xr-competition-build`  
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
| Node | v22.22.0 |
| npm | 11.6.2 |
| Git | 2.46.2.windows.1 |
| `npm ci` | PASS (Prompt 01) |
| `npm run gates` | PASS (Prompt 01; re-check after 01B) |
| `npm run loop:selftest` | PASS |
| `npm run loop -- --dry-run` | PASS |

## Agent tooling

| Tool | Status |
|---|---|
| Claude Code CLI (`claude`) | NOT INSTALLED on PATH |
| Codex CLI (`codex`) | NOT INSTALLED on PATH |
| Loop selftest mock agent | PASS |
| Unattended loop | NOT STARTED |

## Candidate A — IWSDK / WebXR

| Item | Value |
|---|---|
| Scaffold | `npm create @iwsdk@latest` (`@iwsdk/create@1.0.1`) |
| `@iwsdk/core` | 1.0.1 |
| Build / tests | PASS |
| Runtime | IWER EMULATOR |
| Grab / snap / rotate | PASS — EMULATOR (rotate closed in Prompt 01B) |
| Quest | NOT TESTED |

## Candidate B — Unity + Meta XR

| Item | Value |
|---|---|
| Unity Hub | **3.22.2.65535** installed via `winget install Unity.UnityHub` (MSIX) |
| Unity Editor | **6000.6.4f1** install via `winget install Unity.Unity.6000` — download/install long-running; verify path after Hub shows install |
| Android modules | NOT YET (Hub UI/CLI modules required) |
| Meta XR All-in-One | Declared in `xr-unity/Packages/manifest.json` as `com.meta.xr.sdk.all@207.0.0` (scoped registry) — not resolved until Editor opens project |
| OpenXR | Declared `com.unity.xr.openxr@1.17.1` |
| Meta XR Simulator standalone | NOT INSTALLED |
| Meta XR Operator | NOT CONFIGURED |
| `UNITY_PATH` | NOT SET |
| ADB | NOT on PATH |
| Quest Developer Hub | NOT FOUND |

Official baselines consulted: Unity ≥6000.0.66f2; Meta XR v207; OpenXR ≥1.17; standalone Simulator (deprecated UPM simulator package avoided).

## Quest hardware

| Item | Value |
|---|---|
| Quest connected | NO |
| Real-hardware kill test | NOT RUN |

## Blocking for full parity

1. Finish Unity Editor install + Android modules → set `UNITY_PATH`
2. Install standalone Meta XR Simulator
3. Open `xr-unity/`, resolve packages, capture **SIMULATOR** grab/rotate/snap evidence + Operator attempt
4. Quest + ADB for H-004 before D-007
