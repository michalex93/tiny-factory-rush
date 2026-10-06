// Task queue model: load, validate, select next, diff immutable fields, update mutable fields.
// The queue is JSON on purpose: agents are less likely to rewrite JSON than Markdown
// (Anthropic, "Effective harnesses for long-running agents").
import fs from 'node:fs';

export const STATUSES = ['proposed', 'todo', 'doing', 'done', 'blocked', 'skipped'];
export const OWNERS = ['agent', 'human', 'pair'];
export const LANES = ['docs', 'tools', 'sim', 'web', 'xr', 'xr-iwsdk', 'xr-unity', 'comp', 'playtest', 'demo'];
export const TIERS = [0, 1, 2];

// Agents may change only these fields on existing tasks.
export const MUTABLE_FIELDS = ['status', 'attempts', 'notes', 'evidence', 'updated'];
// Everything else is the contract set by the human owner.
export const IMMUTABLE_FIELDS = [
  'id', 'title', 'phase', 'tier', 'owner', 'lane', 'depends_on',
  'acceptance', 'verify', 'evidence_required', 'due', 'skills',
];

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function loadQueue(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

export function saveQueue(file, queue) {
  fs.writeFileSync(file, JSON.stringify(queue, null, 2) + '\n', 'utf8');
}

export function validateQueue(queue) {
  const errors = [];
  if (!queue || typeof queue !== 'object') return ['queue is not an object'];
  if (queue.version !== 1) errors.push('queue.version must be 1');
  if (!Array.isArray(queue.tasks)) return [...errors, 'queue.tasks must be an array'];
  const ids = new Set();
  for (const [i, t] of queue.tasks.entries()) {
    const where = `tasks[${i}]${t?.id ? ` (${t.id})` : ''}`;
    if (!t || typeof t !== 'object') { errors.push(`${where}: not an object`); continue; }
    if (typeof t.id !== 'string' || !/^[A-Z][A-Z0-9]*-[A-Z0-9-]+$/.test(t.id)) errors.push(`${where}: id must look like A-012 / H-001`);
    if (ids.has(t.id)) errors.push(`${where}: duplicate id`);
    ids.add(t.id);
    if (typeof t.title !== 'string' || t.title.length < 5) errors.push(`${where}: title required`);
    if (!STATUSES.includes(t.status)) errors.push(`${where}: status must be one of ${STATUSES.join('|')}`);
    if (!OWNERS.includes(t.owner)) errors.push(`${where}: owner must be one of ${OWNERS.join('|')}`);
    if (!LANES.includes(t.lane)) errors.push(`${where}: lane must be one of ${LANES.join('|')}`);
    if (!TIERS.includes(t.tier)) errors.push(`${where}: tier must be 0, 1 or 2`);
    if (t.due !== undefined && !DATE_RE.test(t.due)) errors.push(`${where}: due must be YYYY-MM-DD`);
    if (!Array.isArray(t.acceptance) || t.acceptance.length === 0) errors.push(`${where}: acceptance must be a non-empty array`);
    for (const k of ['depends_on', 'verify', 'evidence_required', 'skills', 'notes', 'evidence']) {
      if (t[k] !== undefined && !Array.isArray(t[k])) errors.push(`${where}: ${k} must be an array`);
    }
    if (t.attempts !== undefined && !(Number.isInteger(t.attempts) && t.attempts >= 0)) errors.push(`${where}: attempts must be a non-negative integer`);
    if (t.status === 'done' && t.owner !== 'human' && (!Array.isArray(t.evidence) || t.evidence.length === 0)) {
      errors.push(`${where}: done tasks must list evidence`);
    }
  }
  for (const t of queue.tasks) {
    for (const d of t.depends_on ?? []) {
      if (!ids.has(d)) errors.push(`${t.id}: depends_on unknown task ${d}`);
    }
  }
  // Cycle detection.
  const byId = new Map(queue.tasks.map((t) => [t.id, t]));
  const state = new Map();
  const visit = (id, trail) => {
    if (state.get(id) === 'done') return;
    if (state.get(id) === 'active') { errors.push(`dependency cycle: ${[...trail, id].join(' -> ')}`); return; }
    state.set(id, 'active');
    for (const d of byId.get(id)?.depends_on ?? []) if (byId.has(d)) visit(d, [...trail, id]);
    state.set(id, 'done');
  };
  for (const t of queue.tasks) visit(t.id, []);
  return errors;
}

const SATISFIED = new Set(['done', 'skipped']);

export function isEligible(task, queue, ctx = {}) {
  const { includePair = false, stack = 'undecided', lanes } = ctx;
  if (task.status !== 'todo') return { ok: false, why: `status ${task.status}` };
  if (task.owner === 'human') return { ok: false, why: 'human task' };
  if (task.owner === 'pair' && !includePair) return { ok: false, why: 'pair task (run with --include-pair when you are present)' };
  if (lanes && !lanes.includes(task.lane)) return { ok: false, why: `lane ${task.lane} not selected` };
  if (task.lane === 'xr' && !['unity', 'iwsdk'].includes(stack)) return { ok: false, why: 'stack undecided (xr.config.json)' };
  if (task.lane === 'xr-unity' && stack === 'iwsdk') return { ok: false, why: 'stack is iwsdk' };
  if (task.lane === 'xr-iwsdk' && stack === 'unity') return { ok: false, why: 'stack is unity' };
  const byId = new Map(queue.tasks.map((t) => [t.id, t]));
  const missing = (task.depends_on ?? []).filter((d) => !SATISFIED.has(byId.get(d)?.status));
  if (missing.length) return { ok: false, why: `waiting on ${missing.join(', ')}` };
  return { ok: true };
}

/** Next task for the loop: earliest due date, then tier, then file order.
 * Due-date first prevents a late Tier-0 hardening task from starving an intentionally
 * earlier Tier-1 multiplier (art/audio/retention). Tier-2 work remains locked by
 * status/dependencies until the owner explicitly authorizes it.
 */
export function selectNext(queue, ctx = {}) {
  const candidates = queue.tasks
    .map((t, idx) => ({ t, idx }))
    .filter(({ t }) => isEligible(t, queue, ctx).ok);
  candidates.sort((a, b) =>
    String(a.t.due ?? '9999-12-31').localeCompare(String(b.t.due ?? '9999-12-31')) ||
    a.t.tier - b.t.tier ||
    a.idx - b.idx);
  return candidates[0]?.t ?? null;
}

/** Contract violations between a base queue and the current queue. */
export function immutableDiff(baseQueue, headQueue) {
  const violations = [];
  const baseById = new Map((baseQueue?.tasks ?? []).map((t) => [t.id, t]));
  const headById = new Map((headQueue?.tasks ?? []).map((t) => [t.id, t]));
  for (const [id, b] of baseById) {
    const h = headById.get(id);
    if (!h) { violations.push(`${id}: task removed`); continue; }
    for (const f of IMMUTABLE_FIELDS) {
      if (JSON.stringify(b[f]) !== JSON.stringify(h[f])) violations.push(`${id}: immutable field "${f}" changed`);
    }
  }
  for (const [id, h] of headById) {
    if (!baseById.has(id) && h.status !== 'proposed') {
      violations.push(`${id}: new tasks added by agents must have status "proposed"`);
    }
  }
  return violations;
}

/** Tasks whose status changed between base and head. */
export function statusChanges(baseQueue, headQueue) {
  const baseById = new Map((baseQueue?.tasks ?? []).map((t) => [t.id, t]));
  const changes = [];
  for (const h of headQueue?.tasks ?? []) {
    const b = baseById.get(h.id);
    if (!b || b.status !== h.status) changes.push({ id: h.id, from: b?.status ?? null, to: h.status, task: h });
  }
  return changes;
}

export function updateTask(queue, id, { status, note, evidence = [], attemptsDelta = 0 } = {}) {
  const t = queue.tasks.find((x) => x.id === id);
  if (!t) throw new Error(`unknown task ${id}`);
  if (status) {
    if (!STATUSES.includes(status)) throw new Error(`invalid status ${status}`);
    t.status = status;
  }
  if (note) t.notes = [...(t.notes ?? []), note];
  if (evidence.length) t.evidence = [...new Set([...(t.evidence ?? []), ...evidence])];
  if (attemptsDelta) t.attempts = (t.attempts ?? 0) + attemptsDelta;
  t.updated = new Date().toISOString();
  return t;
}

/** Minimal glob: supports **, * and ?; paths use forward slashes. */
export function globToRegExp(glob) {
  let re = '';
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === '*') {
      if (glob[i + 1] === '*') {
        re += '.*';
        i++;
        if (glob[i + 1] === '/') i++;
      } else {
        re += '[^/]*';
      }
    } else if (c === '?') {
      re += '[^/]';
    } else {
      re += c.replace(/[.+^${}()|[\]\\]/g, '\\$&');
    }
  }
  return new RegExp(`^${re}$`);
}

export function matchesAny(file, patterns) {
  const f = file.replace(/\\/g, '/').replace(/^\.\//, '');
  return patterns.some((p) => globToRegExp(p).test(f));
}
