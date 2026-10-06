# Autonomous development system

Goal: maximum verified progress per day with agents working unattended, while every claim stays backed by evidence and a human (+ an external reviewer) steers once or twice a day.

## Guía rápida (ES)
1. **Una vez:** `npm ci`, `npm run gates`, `npm run loop:selftest` (prueba de punta a punta del loop con un agente simulado: fusiona lo honesto y bloquea trampas). Inicia sesión en Claude Code (`claude`) o Codex.
2. **Cada mañana:** `npm run tasks -- human` (lo que te toca: visor, decisiones, playtests). Atiende eso primero.
3. **Lanzar el loop** desde tu rama de integración limpia: `npm run loop -- --agent claude` (o `--agent codex`). Para tareas que necesitan Unity o el visor contigo presente: `npm run loop -- --include-pair`.
4. **Detenerlo con calma:** crea el archivo `.agent/STOP` (o Ctrl+C una vez).
5. **Al terminar cada corrida** se genera `review/REVIEW-*.md`. Léelo, pega la última sección en ChatGPT/Claude como revisor externo, y convierte lo útil en tareas (`"status": "proposed"` → `todo`).
6. **Trabajo interactivo** con Claude Code: `/next-task`, `/review-diff`, `/handoff`. Los hooks aplican las mismas reglas.

## Architecture
```
tasks/queue.json ──► npm run loop (scripts/agent-loop.mjs)
   (contract)          for each eligible task (tier → due date → order):
                         branch agent/<id>-<run>
                         attempt 1..3: fresh agent session  ◄── prompts/task.md (+ retry.md with the gate failure)
                           agent: skills/autonomous-task (orient → health check → search → plan → test first →
                                  implement → verify → verifier + reviewer subagents → progress → tasks set → commit)
                           Claude hooks: Stop = quick gates must be green · PreToolUse = protected files denied
                         independent gates: npm run gates --base <task base>  (full level)
                         green + task done with evidence → merge --no-ff into integration
                         else → status blocked + note, branch kept as agent/failed/<id>-<run>
                       2 blocked in a row → stop (systemic problem)
                       end → review/REVIEW-<stamp>.md (+ external-review prompt) committed
```

## Practices adopted and where they live
| Practice | Source | Mechanism in this repo |
|---|---|---|
| JSON feature/task list with pass/fail; agents may not edit the tests/criteria | Anthropic, *Effective harnesses for long-running agents* (agents are less likely to rewrite JSON than Markdown) | `tasks/queue.json`; immutable fields enforced by `diff:anticheat` |
| One feature per session; start by reading progress + git log + running a basic check | same | prompt steps 1–2; `skills/autonomous-task` |
| Verify end-to-end like a user before marking done | same; Claude Code best practices ("give Claude a check it can run") | `verify` commands per task, screenshots in `evidence/`, `task:evidence` gate |
| Progress file + descriptive commits; leave a clean state | same | `progress/PROGRESS.md` (append-only gate), loop auto-commit + `<ID>:` commits |
| Deterministic gate on stopping | Claude Code docs: Stop hooks block a turn until a script passes; `/goal` alternative | `.claude/hooks/stop-gate.mjs` |
| Adversarial second opinion in a fresh context; reviewers report only correctness/requirement gaps | Claude Code best practices (verification subagent; avoid over-engineering from reviewers) | `.claude/agents/verifier.md`, `.claude/agents/reviewer.md`, `prompts/reviewer.md` |
| Fresh session instead of piling corrections | Claude Code best practices (after two failed corrections, clear and re-prompt) | new `claude -p` per attempt, failure summary in `prompts/retry.md`; reset before final attempt |
| Loop the same prompt, one item per loop, search before building, backpressure from tests/types | Geoffrey Huntley, *Ralph* | `scripts/agent-loop.mjs` + `prompts/task.md` step 3; gates as backpressure |
| Agents append learnings for the next agent | Ralph (AGENT.md), Scott Logic agentic-loop write-up | AGENTS.md → Learnings; progress "Learnings" line |
| Spec → plan → tasks → implement → converge | GitHub Spec Kit | PRODUCT_THESIS/DECISIONS (spec) → ROADMAP (plan) → queue (tasks) → loop (implement) → review packet (converge) |
| Test-first, evidence over claims, root cause before fixes, two-stage review | obra/Superpowers | skills: autonomous-task, verification-before-completion, systematic-debugging; verifier then reviewer |
| Watch the "genie": deleted/disabled tests, unrequested features | Kent Beck, *Augmented coding: beyond the vibes* | `scripts/lib/anticheat.mjs` (test counts, skips, `.only`, protected files), reviewer checklist |
| Clear success criteria; sandbox/allowlist for YOLO; scoped credentials | Simon Willison, *Designing agentic loops* | testable acceptance criteria; `--allowedTools` allowlist in `agent-loop.config.json`; no push from agents |
| Agents that can see and drive the running XR app | Meta XR Operator (Unity, MCP: screenshots, head pose, pinch/poke/grab, gaze-and-pinch, scene graph); IWSDK `iwsdk` CLI + `iwsdk-runtime` MCP + Playwright headless "agent" mode | kill-test tasks A-004/A-005 require agent-captured screenshots |
| Headless automation flags | Claude Code `claude -p` (`--permission-mode`, `--allowedTools`, `--output-format json`); Codex `codex exec --sandbox workspace-write -` | `agent-loop.config.json` agents |

## Safety model
- Agents never push, switch branches or edit the grading machinery (permissions deny list + PreToolUse hook + `diff:anticheat`).
- Work is merged only when the loop's own gates pass (the agent's claim is not trusted).
- Failed work is never lost: `agent/failed/*` branches.
- For more autonomy use `--agent claude-auto` (Claude Code auto mode with a classifier) or run inside a container/VM. Never give agents production credentials; the loop does not need any.

## Human + external review cadence
- Morning: `npm run tasks -- human`, unblock (`NEEDS-HUMAN` notes), approve/discard `proposed` tasks, launch the loop.
- Evening: read the newest `review/REVIEW-*.md`, paste its external-review section into ChatGPT or Claude, turn findings into tasks.
- Owner-only actions: accept decisions (D-xxx), change acceptance criteria, edit protected files (run with `ALLOW_PROTECTED_EDITS=1` and `npm run gates -- --allow-protected` when you intentionally change them).

## Files
| Path | Role | Agents may edit |
|---|---|---|
| tasks/queue.json | plan / contract | status, notes, evidence, attempts; may add `proposed` tasks |
| progress/PROGRESS.md | append-only log | append only |
| prompts/*.md | loop prompts | no |
| scripts/agent-loop.mjs, scripts/gates.mjs, scripts/lib/** | loop + gates | no |
| gates.config.json, agent-loop.config.json | configuration | no |
| .claude/settings.json, .claude/hooks/**, .claude/agents/** | Claude enforcement | no |
| skills/** | procedures | via tasks (then `npm run skills:sync`) |
| review/ | packets | generated |
| .agent/ | runtime state, logs, prompts, gate reports (gitignored) | runtime only |

## Troubleshooting
- "working tree is not clean": commit or stash before `npm run loop`.
- Two tasks blocked in a row: read the review packet and `.agent/failures/*`; usually environment (Unity path, missing login) or an unclear acceptance criterion.
- Stop hook keeps blocking in an interactive session: fix the red gate, or mark the task `blocked` with a diagnosis; after 3 blocks it lets you stop.
- Codex has no Claude hooks: the loop's gates still enforce everything; subagents are replaced by the reviewer checklist.
- You (the owner) want to change a protected file or a task's acceptance inside a Claude session: start it with `ALLOW_PROTECTED_EDITS=1 claude` for protected files; edit `tasks/queue.json` contracts outside agent sessions and commit, so the next session's base already contains them.
- `claude -p` must accept the prompt on stdin (`echo "say ok" | claude -p`). If your CLI differs, set `AGENT_CMD` to a command that reads stdin.
