# Toolchain Preflight — Prompt 01 / 01B

Date: 2026-10-08  
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
| `npm run gates` | FAIL 2026-10-08 — only `lane:extra` / `unity:editmode` (Editor has project open); root typecheck/unit/build PASS |
| `npm run loop:selftest` | PASS |
| `npm run loop -- --dry-run` | PASS |

## Agent tooling

| Tool | Status |
|---|---|
| Claude Code CLI (`claude`) | NOT INSTALLED on PATH |
| Codex CLI (`codex`) | NOT INSTALLED on PATH |
| Unity CLI | INSTALLED (`Unity.CLI` ~1.0.0-beta.12) at `%LOCALAPPDATA%\Unity\bin\unity.exe` |
| Unity MCP (Pipeline) | Configured in `~/.cursor\mcp.json`; connected when Editor ready; timed out after Meta import |
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
| Unity Editor | **6000.6.4f1** (winget and/or Hub path) |
| Android modules | NOT YET |
| Meta XR packages | **207.0.0** Core + Interaction + Interaction.OVR + MRUK via `npm.developer.oculus.com` (All-in-One `com.meta.xr.sdk.all` **404** on registry) |
| OpenXR | `com.unity.xr.openxr@1.18.0` installed; XR Management loaders **not enabled** yet |
| Meta XR Simulator standalone | **INSTALLED v207.0** via `metavr tools install xrsim` → `%APPDATA%\metavr\tools\xrsim\MetaXRSimulator.exe` (not Program Files; no admin) |
| Meta XR Operator | Package Editor tooling present in Core 207; **NOT CONFIGURED** |
| `UNITY_PATH` | NOT SET (Editor at `C:\Program Files\Unity 6000.6.4f1\Editor\Unity.exe` and/or Hub `...\Hub\Editor\6000.6.4f1\...`) |
| ADB | NOT on PATH |
| Quest Developer Hub | NOT FOUND |

Official baselines consulted: Unity ≥6000.0.66f2; Meta XR v207; OpenXR ≥1.17; standalone Simulator (deprecated Unity package avoided).

## Quest hardware

| Item | Value |
|---|---|
| Quest connected | NO |
| Real-hardware kill test | NOT RUN |

## Blocking for full parity

1. Restart Unity if Pipeline hung; finish compile; enable OpenXR Windows+Android
2. Install standalone Meta XR Simulator; capture **SIMULATOR** evidence
3. Optional URP 17.6.0 for MRUK shaders
4. XR Operator setup or exact blocker doc
5. Android modules + ADB + Quest for H-004 before D-007
