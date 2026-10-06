# UNITY KILL-TEST — STATUS / NEEDS-HUMAN

Date: 2026-10-06  
Branch: `feat/xr-competition-build`

## Done automatically this session

| Item | Status |
|---|---|
| Unity Hub 3.22.2 via `winget install Unity.UnityHub` | INSTALLED (MSIX AppX) |
| Unity Editor 6000.6.4f1 via `winget install Unity.Unity.6000` | DOWNLOAD/INSTALL IN PROGRESS or pending verification |
| `xr-unity/` kill-test project scaffold | CREATED (scene + snap/intent logic + EditMode tests + OpenXR 1.17.1 + Meta All-in-One 207.0.0 manifest) |
| Android modules (SDK/NDK/OpenJDK) | **NOT YET** — requires Hub module install |
| Standalone Meta XR Simulator v207 | **NOT INSTALLED** |
| Meta XR Operator configured | **NOT DONE** |
| Simulator grab/rotate/snap screenshots | **NOT CAPTURED** |
| `UNITY_PATH` | **NOT SET** until Editor install finishes |

## Exact next UI / CLI steps for Michel

### A. Finish Editor + Android modules

1. Open **Unity Hub** (Start menu → Unity Hub).
2. Sign in with your Unity ID.
3. **Installs** → confirm **6000.6.4f1** (or install **6000.0.66f2+** LTS if Hub prefers LTS).
4. Gear on that install → **Add modules**:
   - Android Build Support
   - Android SDK & NDK Tools
   - OpenJDK
5. After install, set user/machine env:

```powershell
# Example — adjust to the real path Hub shows:
[System.Environment]::SetEnvironmentVariable(
  'UNITY_PATH',
  'C:\Program Files\Unity\Hub\Editor\6000.6.4f1\Editor\Unity.exe',
  'User')
```

Verify:

```powershell
echo $env:UNITY_PATH
& $env:UNITY_PATH -version
```

### B. Meta XR Simulator (standalone)

1. Download **Meta XR Simulator — Windows** from Meta Developer Center (v207 / current standalone; **do not** add deprecated `com.meta.xr.simulator` UPM package).
2. Install and launch once; leave available for OpenXR activation from Unity:  
   `Window → Meta → Meta XR Simulator → Activate`.

### C. Open kill-test project

1. Hub → **Open** → select repo folder `xr-unity/`.
2. Wait for Package Manager to resolve:
   - `com.meta.xr.sdk.all@207.0.0` (scoped registry already in `Packages/manifest.json`)
   - `com.unity.xr.openxr@1.17.1`
3. Open scene `Assets/Scenes/KillTest.unity`.
4. Project Settings → XR Plug-in Management → enable **OpenXR** for **Windows** and **Android**.
5. Activate Meta XR Simulator → **Play**.
6. Verify: grab, rotate (hold + twist), snap, invalid reject flash, 10 tokens moving.
7. Save screenshots to `evidence/xr/killtest-unity/` with prefix `SIMULATOR-`.

### D. XR Operator

1. Confirm Core SDK ≥207 pulled in by All-in-One.
2. Follow current Meta docs: enable Operator API layer; connect agent MCP.
3. Attempt scene screenshot + module state read; if it fails, paste exact error into `evidence/xr/killtest-unity/OPERATOR-BLOCKER.md`.

### E. EditMode tests

```powershell
& $env:UNITY_PATH -batchmode -nographics `
  -projectPath "$PWD\xr-unity" `
  -runTests -testPlatform EditMode `
  -testResults "$PWD\evidence\xr\killtest-unity\EditMode-TestResults.xml" `
  -logFile "$PWD\evidence\xr\killtest-unity\EditMode-unity.log"
```

## Official docs used

- Unity requirements: Editor ≥6000.0.66f2 + Android modules
- Meta XR All-in-One UPM / npm.developer.oculus.com v207
- Meta XR Simulator standalone getting started (deprecated Unity package)
- Meta XR Operator: Unity 6000.0.x+, Core v207+, OpenXR ≥1.17

## Why Simulator evidence is still missing

Editor install was started via winget but Android modules, Simulator, and Operator require signed-in Hub GUI + Meta downloads that cannot be completed headlessly in this Cursor session without the finished Editor path.
