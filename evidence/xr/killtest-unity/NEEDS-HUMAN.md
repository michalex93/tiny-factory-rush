# UNITY BLOCKER — NEEDS-HUMAN

Date: 2026-10-06  
Branch: `feat/xr-competition-build`  
Status: **candidate B not executable on this machine today**

## Exact missing prerequisites

From current official Meta Unity docs (checked 2026-10-06):

1. **Unity Editor 6000.0.66f2 or higher** with modules:
   - Android Build Support
   - OpenJDK
   - Android SDK & NDK Tools
2. **Meta XR Core SDK v207+**
3. **Unity OpenXR Plugin 1.17.0+** (required for Meta XR Operator)
4. **Meta XR Simulator** (standalone Windows OpenXR runtime) — for desktop interaction evidence
5. **Meta XR Operator** (optional but required by task A-005 evidence path)
6. **ADB / Android platform tools** for Quest deploy later
7. Environment variable **`UNITY_PATH`** pointing at the Editor executable (gates lane `unity:editmode`)

Discovered on this host:
- `UNITY_PATH` empty
- No Unity Hub Editor installs under standard `C:\Program Files\Unity*`
- No Meta XR Simulator / Operator installs found
- `adb` not on PATH

## Why we did not fake a Unity candidate

Creating a non-runnable `xr-unity/` stub or claiming Simulator screenshots without the toolchain would falsify the kill-test comparison. Per Prompt 01: do not choose IWSDK because Unity setup is annoying; leave D-007 OPEN.

## Likely human setup time

| Step | Estimate |
|---|---|
| Install Unity Hub + Unity 6000.0.66f2+ with Android modules | 45–90 min (download-bound) |
| Create/import project + Meta XR Core SDK v207 | 30–60 min |
| Install/configure Meta XR Simulator | 15–30 min |
| Enable XR Operator + OpenXR 1.17+ | 15–30 min |
| Rebuild kill-test scene parity | 2–4 h once tools work |

**Total wall-clock if downloads are ready:** roughly half a day to one day for a first runnable Simulator grab/snap.

## Exact next human action (Michel)

1. Install Unity Hub → Unity **6000.0.66f2+** with Android Build Support + OpenJDK + SDK/NDK.
2. Install **Meta XR Simulator** (Windows) from Meta developer downloads.
3. Create project under `xr-unity/` using Meta XR Core SDK **v207+** + OpenXR Plugin **≥1.17.0**.
4. Set machine env `UNITY_PATH` to the Editor `.exe`.
5. Re-run Prompt 01 candidate B acceptance (same tabletop grab/rotate/snap + 10 tokens).
6. Capture Simulator evidence into `evidence/xr/killtest-unity/` labeled **SIMULATOR**.

Do **not** accept D-007 until both candidates have honest interaction evidence and preferably real Quest comparison (H-004).
