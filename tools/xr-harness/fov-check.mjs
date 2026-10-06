#!/usr/bin/env node
// FoV + reach check for a seated tabletop layout (D-012).
// Usage: node tools/xr-harness/fov-check.mjs <layout.json> [--device vr-glasses|quest3] [--margin 5] [--reach 0.61] [--json]
import fs from 'node:fs';
import { checkLayout } from './lib/fov.mjs';

const args = process.argv.slice(2);
const opt = (n, d) => {
  const i = args.indexOf(n);
  return i >= 0 ? args[i + 1] : d;
};
const file = args.find((a, i) => !a.startsWith('--') && !['--device', '--margin', '--reach'].includes(args[i - 1]));
if (!file) {
  console.error('Usage: node tools/xr-harness/fov-check.mjs <layout.json> [--device vr-glasses|quest3] [--margin 5] [--reach 0.61] [--json]');
  process.exit(2);
}
const layout = JSON.parse(fs.readFileSync(file, 'utf8'));
const report = checkLayout(layout, {
  device: opt('--device', 'vr-glasses'),
  margin: Number(opt('--margin', 5)),
  reach: Number(opt('--reach', 0.61)),
});

if (args.includes('--json')) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(`FOV CHECK — ${report.label}, budget ±${report.halfH}° × ±${report.halfV}°, reach ${report.reach} m`);
  console.log('-'.repeat(78));
  for (const r of report.results) {
    const tags = `${r.critical ? 'C' : '-'}${r.interactable ? 'I' : '-'}`;
    console.log(`${(r.pass ? 'PASS' : 'FAIL').padEnd(5)} ${tags} ${r.id.padEnd(22)} h=${String(r.h).padStart(6)}° v=${String(r.v).padStart(6)}° reach=${r.reachDist} m${r.inFov ? '' : '  OUT-OF-FOV'}${r.reachOk ? '' : '  OUT-OF-REACH'}`);
  }
  console.log('-'.repeat(78));
  console.log(report.pass ? 'OVERALL: PASS' : 'OVERALL: FAIL (C = critical, I = interactable)');
}
process.exit(report.pass ? 0 : 1);
