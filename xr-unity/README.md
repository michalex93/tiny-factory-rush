# Tiny Factory Rush XR — Unity kill-test candidate

Stack evaluation only. No factory gameplay.

## Target toolchain (official Meta baseline)

- Unity **≥ 6000.0.66f2** (local winget attempt: `Unity.Unity.6000` → 6000.6.4f1)
- Meta XR **All-in-One SDK v207** via scoped registry `https://npm.developer.oculus.com`
- OpenXR Plugin **≥ 1.17.1** (`com.unity.xr.openxr`)
- Standalone **Meta XR Simulator** (not deprecated `com.meta.xr.simulator` package)
- Meta XR Operator (Core SDK v207+ experimental component)

## Scenario

Matches IWSDK kill-test:

- 1 DEV FALLBACK table
- 1 large module (grab / move / rotate / release / snap)
- 3 snap pads
- 10 deterministic tokens
- tunable `intentHistoryWindowMs`, `trackingLossGraceMs`, `snapRadius`
- metrics logging

## Open project

1. Install Unity Editor + Android modules (see `evidence/xr/killtest-unity/NEEDS-HUMAN.md`).
2. Set `UNITY_PATH` to `.../Editor/Unity.exe`.
3. Open `xr-unity/` in Unity Hub.
4. Wait for Package Manager to resolve Meta XR packages.
5. Open scene `Assets/Scenes/KillTest.unity`.
6. Activate **Meta XR Simulator** (standalone), then Play.
7. Capture Simulator screenshots into `../evidence/xr/killtest-unity/` labeled **SIMULATOR**.

## EditMode tests

```bat
"%UNITY_PATH%" -batchmode -nographics -projectPath "%CD%" -runTests -testPlatform EditMode -testResults TestResults-EditMode.xml -logFile -
```

## Evidence labels

Use only: **SIMULATOR**, **QUEST**, or (for editor mouse fallback) **EDITOR_FALLBACK** — never claim Quest from Simulator.
