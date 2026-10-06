# Stack kill-test comparison (Prompt 01) — observed facts only

Date: 2026-10-06  
Branch: `feat/xr-competition-build`  
D-007 status: remains **OPEN** (owner decides; no ACCEPTED change made)

## Completeness

| Candidate | Runnable today? | Evidence class |
|---|---|---|
| A IWSDK | YES | EMULATOR (IWER) + unit tests + production build |
| B Unity | NO | NEEDS-HUMAN toolchain blocker only |

Because Unity could not run, this document is a **partial comparison**. It must not close D-007.

## Observed dimensions

### Interaction reliability

- **IWSDK (EMULATOR):** Scripted controller squeeze grab → move → release produced `grabAttempt`, `grabSuccess`, `release`, `snapSuccess` (`slot-right`, distance 0.13 m). Hover/selection coloring via `Hovered` present. Tracking-loss metric path observed (emulator connect/disconnect heuristic).  
- **Unity:** NOT OBSERVED.

### Implementation friction

- **IWSDK:** Official scaffold completed in one non-interactive command; kill-test scene in TypeScript/ECS same day; agent CLI (`iwsdk browser` / `iwsdk xr`) usable for runtime eyes. PowerShell JSON quoting is awkward; node spawn to CLI binary works.  
- **Unity:** Zero friction measured — environment absent.

### Time to first running XR interaction

- **IWSDK:** Scaffold + scene + EMULATOR XR enter + grab/snap metrics: same session (~hours including installs/docs).  
- **Unity:** Blocked before project creation.

### Agent / runtime tooling

- **IWSDK:** Strong — managed headless browser, screenshot, XR device mutation, console logs, MCP adapters shipped in scaffold.  
- **Unity:** Meta XR Operator exists in docs for v207+, but not installable here today.

### Table / scene support

- **IWSDK:** AR mode + scene understanding + environment raycast enabled; kill-test uses labeled **DEV FALLBACK** table in emulator living_room SEM. Real plane anchoring untested.  
- **Unity:** NOT OBSERVED (MRUK/table path not available).

### Gaze / head-gaze

- **IWSDK:** `gazeTracking` enabled optional path; ray/`Hovered` highlight demonstrated. Eye-gaze on Quest not tested.  
- **Unity:** NOT OBSERVED.

### Performance evidence

- **IWSDK:** No Quest FPS. EMULATOR only; no human fatigue metrics.  
- **Unity:** NONE.

### Debugging experience

- **IWSDK:** Console metrics + CLI screenshot/logs sufficient for this tiny scene.  
- **Unity:** N/A.

### Distribution friction

- Not evaluated (kill-test only). Competition accepts hosted IWSDK URL per research notes; Unity store/app path not compared.

### Major risks

- Closing D-007 from EMULATOR-only IWSDK evidence would ignore Unity’s unknown interaction reliability and Operator workflow.
- Host GPU is Intel UHD / 12 GB RAM — fine for IWSDK emulator; Unity Editor + Simulator may be constrained once installed.
- No Quest on this machine yet → H-004 still required.

### Missing evidence

- Unity Simulator / XR Operator / EditMode tests
- Real Quest interaction + performance for either stack
- Naive-player false-activation / fatigue numbers (correctly left null)

## Recommendation posture

**UNITY BLOCKED** for candidate B completion.  
IWSDK candidate is ready for continued EMULATOR iteration and for real-Quest comparison once hardware + Unity toolchain are available.

Do **not** treat “more 2025 winners used Unity” as a score. Do **not** accept D-007 from this file alone.
