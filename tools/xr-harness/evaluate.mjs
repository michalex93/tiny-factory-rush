#!/usr/bin/env node
import fs from 'node:fs';

const args = process.argv.slice(2);
const strict = args.includes('--strict');
const file = args.find((x) => x !== '--strict');

if (!file) {
  console.error('Usage: node tools/xr-harness/evaluate.mjs <session.json> [--strict]');
  process.exit(2);
}

const criteria = JSON.parse(
  fs.readFileSync(new URL('./criteria.json', import.meta.url), 'utf8'),
);
const session = JSON.parse(fs.readFileSync(file, 'utf8'));

const flat = {
  firstActionSec: session.timing?.firstActionSec,
  firstRewardSec: session.timing?.firstRewardSec,
  firstProblemSec: session.timing?.firstProblemSec,
  firstDecisionSec: session.timing?.firstDecisionSec,
  firstPayoffSec: session.timing?.firstPayoffSec,
  fatigueRating5: session.comfort?.fatigueRating5,
  interactionErrorsPerMin: session.interaction?.interactionErrorsPerMin,
  voluntaryTurns: session.engagement?.voluntaryTurns,
  fpsLowPercentile: session.performance?.fpsLowPercentile,
  criticalErrors: session.performance?.criticalErrors,
  handsFirstComplete: session.interaction?.handsFirstComplete,
  seatedComplete: session.interaction?.seatedComplete,
  realTableMatters: session.interaction?.realTableMatters,
  testedOnRealHardware: session.performance?.testedOnRealHardware,
  airplaneRadiusOk: session.interaction?.airplaneRadiusOk,
  fovCriticalInView: session.interaction?.fovCriticalInView,
  gazePinchWorks: session.interaction?.gazePinchWorks,
  overflowSeenInFov: session.engagement?.overflowSeenInFov,
  persistenceAcrossSessions: session.engagement?.persistenceAcrossSessions
};

const results = [];
let blocked = false;

function missingStatus(rule) {
  if (strict && rule.severity === 'kill') {
    blocked = true;
    return 'BLOCK';
  }
  return 'MISSING';
}

for (const [key, rule] of Object.entries(criteria.criteria)) {
  const value = flat[key];
  if (value === null || value === undefined) {
    results.push({ key, status: missingStatus(rule), value });
    continue;
  }
  let pass = true;
  if ('max' in rule) pass = pass && value <= rule.max;
  if ('min' in rule) pass = pass && value >= rule.min;
  const status = pass ? 'PASS' : rule.severity.toUpperCase();
  if (status === 'KILL') blocked = true;
  results.push({ key, status, value, rule });
}

for (const [key, rule] of Object.entries(criteria.booleans)) {
  const value = flat[key];
  if (value === null || value === undefined) {
    results.push({ key, status: missingStatus(rule), value });
    continue;
  }
  const pass = value === rule.expected;
  const status = pass ? 'PASS' : rule.severity.toUpperCase();
  if (status === 'KILL') blocked = true;
  results.push({ key, status, value, rule });
}

const pad = (s, n) => String(s).padEnd(n);
console.log(`XR HARNESS — ${session.sessionId ?? 'unknown session'}${strict ? ' [STRICT]' : ''}`);
console.log('-'.repeat(72));
for (const r of results) {
  console.log(`${pad(r.status, 8)} ${pad(r.key, 28)} ${String(r.value)}`);
}
console.log('-'.repeat(72));
console.log(blocked ? 'OVERALL: BLOCKED / KILL-PIVOT GATE TRIGGERED' : 'OVERALL: NO BLOCKING GATE TRIGGERED');

process.exit(blocked ? 1 : 0);
