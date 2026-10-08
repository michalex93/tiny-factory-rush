# UNITY KILL-TEST — STATUS / NEEDS-HUMAN

Date: 2026-10-08  
Branch: `feat/xr-competition-build`  
See also: `MCP-SESSION-01B.md`

## Done this session (agent + Unity MCP / CLI)

| Item | Status |
|---|---|
| Unity Editor 6000.6.4f1 open + Pipeline MCP connected | YES (later hung on main thread) |
| Meta XR Core / Interaction / Interaction.OVR / MRUK **207.0.0** via npm scoped registry | INSTALLED in PackageCache |
| OpenXR package | 1.18.0 present |
| KillTest scene + runtime bootstrap assets | PRESENT (`Assets/Scenes/KillTest.unity`) |
| CS0102 `_grabbed` fix | DONE earlier |
| KillTest ISDK hook softened (reflection) | DONE |
| Built-in modules ai / assetbundle / particlesystem / … | ADDED to manifest |
| SIMULATOR / EDITOR Play Mode evidence | **NOT CAPTURED** |
| OpenXR enabled in XR Plug-in Management | **NOT DONE** (settings empty) |
| Standalone Meta XR Simulator | **INSTALLED v207.0** (`metavr tools install xrsim` → `%APPDATA%\metavr\tools\xrsim`) |
| XR Operator configured | **NOT DONE** |
| Android modules | **NOT YET** |
| `UNITY_PATH` user env | optional; Editor known at winget or Hub path |

## Exact remaining human / GUI actions

### 0. Recover Editor (required now)

NEEDS-HUMAN:
1. If Unity is frozen / MCP times out: **save if prompted → close Unity Editor fully**.
2. Re-open `xr-unity` in Unity 6000.6.4f1.
3. Wait until Console is clean of CS errors (Package Manager finish importing Meta 207).
4. Confirm Cursor MCP `unity` reconnects (`unity status` shows `ready`).

### A. URP (for MRUK shaders)

NEEDS-HUMAN:
- Package Manager → install **Universal RP 17.6.0** (matches this Editor’s built-in URP), **or** accept Built-in RP for kill-test only (Standard shader fallback already in Bootstrap).

### B. OpenXR + Project Setup

NEEDS-HUMAN (or agent after Editor recovers):
1. `Edit → Project Settings → XR Plug-in Management` → enable **OpenXR** for **Windows** and **Android**.
2. `Meta → Tools → Project Setup Tool` → fix relevant OpenXR / Quest issues only.
3. Optional: `Meta → Tools → AI Tools Setup` for Operator proxy notes.

### C. Meta XR Simulator (standalone — already installed)

Installed path: `C:\Users\miche\AppData\Roaming\metavr\tools\xrsim\MetaXRSimulator.exe` (v207.0).

NEEDS-HUMAN (activation / Play evidence):
1. Launch: `metavr tools launch xrsim` **or** run `MetaXRSimulator.exe`.
2. Activate OpenXR runtime (slider in Simulator UI, or `metavr xrsim runtime activate` — may need admin for HKLM).
3. In Unity (after Editor recovery): `Window → Meta → Meta XR Simulator → Activate` → open KillTest → Play.
4. Save screenshots to `evidence/xr/killtest-unity/` with prefix `SIMULATOR-`.
5. **Do not** add deprecated `com.meta.xr.simulator` UPM package.

### D. XR Operator

NEEDS-HUMAN:
1. With Core 207 present: follow Meta AI Tools / Operator docs (ADB forward port **8720** for headset path).
2. For desktop Simulator path: enable Operator per current Meta docs if supported.
3. If blocked, write exact error to `evidence/xr/killtest-unity/OPERATOR-BLOCKER.md`.

### E. Android modules + UNITY_PATH

NEEDS-HUMAN:
1. Unity Hub → Installs → 6000.6.4f1 → Add modules: Android Build Support, SDK & NDK, OpenJDK.
2. Optional env:

```powershell
[System.Environment]::SetEnvironmentVariable(
  'UNITY_PATH',
  'C:\Program Files\Unity 6000.6.4f1\Editor\Unity.exe',
  'User')
```

(Also Hub path may exist: `C:\Program Files\Unity\Hub\Editor\6000.6.4f1\Editor\Unity.exe`.)

### F. EditMode tests (close Editor first OR run in-Editor Test Runner)

```powershell
& $env:UNITY_PATH -batchmode -nographics `
  -projectPath "$PWD\xr-unity" `
  -runTests -testPlatform EditMode `
  -testResults "$PWD\evidence\xr\killtest-unity\EditMode-TestResults.xml" `
  -logFile "$PWD\evidence\xr\killtest-unity\EditMode-unity.log"
```

Note: `npm run gates` → `unity:editmode` **fails while this Editor has the project open**.

## Why All-in-One was not used

`https://npm.developer.oculus.com/com.meta.xr.sdk.all` returns **404**. Direct `com.meta.xr.sdk.all@207` in manifest is invalid on this registry. Use individual packages (Core, Interaction, MRUK, …) or Asset Store My Assets install of All-in-One if you specifically need the wrapper.

## D-007

**OPEN**
