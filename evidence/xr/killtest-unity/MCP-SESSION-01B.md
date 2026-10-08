# Unity MCP session — Prompt 01B continuation

Date: 2026-10-08  
Branch: `feat/xr-competition-build`  
Editor: Unity 6000.6.4f1 (PID connected via Unity CLI / Pipeline MCP)

## UNITY MCP connection

| Item | Fact |
|---|---|
| Bridge | Unity CLI `unity mcp` → Pipeline port 7800 |
| Project | `C:\Users\miche\OneDrive\Documentos\01_repos_activos\tiny\xr-unity` |
| Capabilities used | `status`, `editor_status`, `console`, `package_list`, `package_search`, `package_add`, `package_status`, `recompile`, `recompile_status`, `list_open_scenes`, `get_scene_hierarchy`, `find_assets` (attempted) |
| Blocker late session | Main-thread pipeline timeouts after Meta XR package import (`Failed to handle /api/exec … timed out after 30000ms`); `compilationFailed: true` until modules fixed; Editor remained unresponsive to further MCP commands |

## Packages (verified in PackageCache / manifest)

Installed via scoped registry `https://npm.developer.oculus.com` (scope `com.meta.xr`):

| Package | Version | Notes |
|---|---|---|
| `com.meta.xr.sdk.core` | 207.0.0 | Installed via MCP `package_add` |
| `com.meta.xr.sdk.interaction` | 207.0.0 | Installed via MCP `package_add` |
| `com.meta.xr.sdk.interaction.ovr` | 207.0.0 | Added via valid manifest dependency |
| `com.meta.xr.mrutilitykit` | 207.0.0 | Added via valid manifest dependency |
| `com.unity.xr.openxr` | 1.18.0 | Already present (≥1.17) |
| `com.unity.xr.hands` | 1.7.2 | Core dependency |
| `com.unity.ugui` | 2.x resolved | Interaction dependency |

**Not on Meta npm registry:** `com.meta.xr.sdk.all` → HTTP 404. All-in-One is **not** installable as a direct UPM npm dependency on this machine. Individual v207 packages are the working path.

**Not installed (intentionally):** deprecated `com.meta.xr.simulator` UPM package.

## Compile blockers observed (and mitigations)

1. Missing built-in modules (`ai`, `assetbundle`, `particlesystem`, `unitywebrequestaudio`) → added to `Packages/manifest.json`.
2. Invalid `com.unity.modules.vr@1.0.0` on Unity 6000.6 → removed.
3. KillTest `META_XR_INTERACTION` + hard `using Oculus.Interaction` while Interaction assembly failed → switched to reflection hook; removed hard asmdef ref.
4. URP `17.3.0` wrong for this Editor (built-in URP is **17.6.0**); pinning URP caused long Package Manager stall → removed from manifest for this session. MRUK URP shaders may warn until URP is installed.

## Scene

- `Assets/Scenes/KillTest.unity` exists with `KillTestRoot` + `KillTestBootstrap` (runtime builds table/module/3 pads/10 tokens).
- At session start MCP showed an **untitled** empty hierarchy (KillTest scene not open).
- Play Mode / screenshots **not captured** — Editor main thread hung before open_scene / editor_play / capture could run.

## OpenXR / Simulator / Operator

| Item | Status |
|---|---|
| OpenXR package | 1.18.0 installed |
| XR Plug-in Management loaders | `XRGeneralSettingsPerBuildTarget.asset` Keys/Values **empty** — OpenXR not enabled for Standalone/Android yet |
| Meta XR Simulator standalone | **NOT FOUND** on disk |
| Core Editor tooling present in package | `Editor/MetaXRSimulator`, `Editor/MetaXROperator`, AI Tools Setup (Operator MCP port 8720 in Core sources) |
| XR Operator runtime | **NOT CONFIGURED** (needs headset/Simulator + Project Setup / AI Tools Setup) |
| ADB | NOT on PATH |

## Tests / gates

| Command | Result |
|---|---|
| Unity EditMode via `npm run gates` → `unity:editmode` | **FAIL** — another Unity instance has `xr-unity` open (expected while MCP Editor is open) |
| Root `typecheck` / `unit` / `build` / other gates lanes | **PASS** |
| Overall `npm run gates` | **FAIL** (`lane:extra` / unity:editmode only) |

## D-007

**OPEN** — no Quest evidence; no SIMULATOR interaction evidence this session.
