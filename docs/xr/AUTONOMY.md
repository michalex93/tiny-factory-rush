# Autonomous development system — v1.0

Goal: maximize **verified** progress per day without allowing an unattended agent to redefine the product, weaken its own grader, or compound several structural mistakes before a human sees them.

## Guía rápida (ES)

### Una vez
```bash
npm ci
npm run gates
npm run loop:selftest
npm run loop -- --dry-run
```

Confirm Claude/Codex headless invocation works on the actual Windows PC.

### Cada mañana
1. `npm run tasks -- human`
2. unblock human/pair tasks first;
3. review any proposed tasks;
4. start the loop from a clean integration branch.

### Start
```bash
npm run loop -- --agent claude
```

Use `--include-pair` only while physically present for hardware/Unity/headset tasks.

### Stop
Create:
`.agent/STOP`

or press Ctrl+C once.

### Every run
Read the generated `review/REVIEW-*.md`.
Use an external model for independent review of important changes.

---

## Conservative default

The default unattended budget is intentionally limited:
- max 3 tasks/run;
- ~4 h run budget;
- stop after 2 consecutive blocked tasks.

Why:
during stack selection and early product formation, a subtle structural mistake can still pass unit tests and poison downstream tasks.

After the stack, core interaction and local Windows loop are proven, the owner may deliberately increase the limits.

Do not measure productivity by number of autonomous merges.

---

## Architecture

```
tasks/queue.json
      |
      v
scripts/agent-loop.mjs
      |
      +--> isolated agent/<task> branch
      |      |
      |      +--> fresh agent attempt
      |      +--> task-specific acceptance
      |      +--> verifier
      |      +--> adversarial reviewer
      |
      +--> deterministic gates
              |
              +--> green + evidence + done -> merge to integration
              |
              +--> fail -> retry / block / preserve failed branch

end of run
      |
      v
review packet -> human + external reviewer
```

One task per agent session.

---

## Autonomy boundary

### Agents MAY
- implement a task;
- add tests;
- capture emulator/simulator evidence;
- update task status/notes/evidence;
- append progress;
- add a newly discovered task as `proposed`.

### Agents MAY NOT redefine
- product thesis;
- roadmap gates;
- accepted decisions;
- competition strategy;
- root grading rules;
- root toolchain contract;
- their own acceptance criteria.

Governance is owner-controlled.

---

## Protected files

The deterministic anti-cheat/protected list includes infrastructure plus product governance, including:
- AGENTS.md;
- CLAUDE.md;
- .cursor/rules/**;
- docs/xr/PRODUCT_THESIS.md;
- docs/xr/ROADMAP.md;
- docs/xr/DECISIONS.md;
- docs/xr/COMPETITION_SCORECARD.md;
- gates / loop / hooks / prompts;
- harness grading code;
- root package.json/tooling contracts.

If a protected file needs changing, that is an owner/governance task, not something the implementing agent should "fix."

---

## Shell / credential safety

The standard Claude unattended command is intentionally narrower than a normal interactive coding session.

Do not run long unattended loops in an environment containing:
- production credentials;
- unrelated SSH keys;
- cloud-admin tokens;
- banking/payment credentials;
- secrets not needed by the repo.

For `claude-auto` or broader permissions:
use a dedicated VM/container or otherwise isolated development environment.

The allowlist is not a security boundary against malicious code. It is an accident-prevention mechanism.

Dependency/toolchain changes belong to human/pair tasks unless explicitly approved.

---

## Why the grader is outside the agent's control

Gates run independently after the agent exits.

They check:
- task schema;
- typecheck;
- unit tests;
- build;
- harness smoke fixture;
- FoV heuristic;
- anti-cheat diff;
- required evidence path;
- append-only progress;
- lane-specific tests.

Anti-cheat catches:
- deleted test files;
- reduced test counts;
- new skips/todos;
- focused tests;
- protected-file edits;
- changes to immutable task contracts.

Important limitation:
an evidence path existing does **not** prove the evidence is good.
The verifier/reviewer/human still inspect visual and hardware evidence.

For high-impact XR tasks, the real gate is measured headset evidence.

---

## External review policy

External review is especially important for:
- stack decision;
- signature interaction;
- product-scope proposals;
- G-T0;
- feature-freeze decision;
- submission package.

A review may create a **proposed task**.
It does not silently modify accepted product decisions.

---

## Practices adopted

| Practice | Implementation |
|---|---|
| JSON task contracts | `tasks/queue.json` |
| One task / fresh session | outer loop |
| Tests/evidence before done | gates + verifier |
| Fresh retry after failure | new agent session |
| Preserve failed work | `agent/failed/*` |
| Adversarial review | verifier + reviewer + external packet |
| Prevent grader editing | protected files + diff anti-cheat |
| Search before build | task prompt |
| Append-only history | `progress/PROGRESS.md` |
| Runtime eyes for agents | XR Operator / IWSDK tooling tasks |
| Human product decisions | protected thesis/roadmap/decisions |

Durable implementation learnings are appended to the task's `progress/PROGRESS.md` entry. AGENTS.md is protected.

---

## Evidence hierarchy

1. Real target-hardware evidence.
2. Simulator/emulator evidence.
3. Automated unit/integration evidence.
4. Static analysis.
5. Agent statement.

Never invert this hierarchy.

Examples:
- a screenshot from XR Simulator does not prove Quest hand reliability;
- a passing unit test does not prove a gesture feels good;
- an agent saying "60 fps" without device capture is no measurement.

---

## Human + external review cadence

### Morning
- human tasks;
- blocked tasks;
- proposed tasks;
- decide whether loop should run.

### Evening / end of run
- read review packet;
- inspect actual app/build if relevant;
- send packet to external reviewer;
- add only useful findings as proposed tasks.

During the earliest stack/product period, review after **every 1–3 merged tasks**, not after an all-night chain.

---

## Troubleshooting

### working tree not clean
Commit/stash. The loop needs a deterministic base.

### two blocked tasks
Stop. Assume systemic issue until disproved.

### Stop hook keeps blocking
Fix the root cause or honestly block the task.

### hardware task
Use owner `pair` / `human`; never let the agent fabricate device evidence.

### governance needs change
Do it outside autonomous implementation, with deliberate owner review and protected-edit override.

### new feature idea
Add as `proposed`, do not implement opportunistically.

---

## "Product before perfection" rule

Automation exists to shorten the path to a playable product, not to create more architecture.

After stack choice:
- every day should end with a runnable end-to-end build when practical;
- integrate early;
- use ugly placeholders when they answer the right question;
- replace the weak parts after the whole loop exists.

A beautiful subsystem disconnected from the judge journey is not progress.
