#!/usr/bin/env node
/**
 * Quest readiness probe for H-002 / smoke handoff.
 * Does not require a device to run — reports honestly.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const localAdb = join(root, '.agent', 'platform-tools', 'adb.exe');
const outPath = join(root, 'evidence', 'xr', 'QUEST-STATUS.md');
const publicUrl = 'https://michalex93.github.io/tiny-factory-rush/';

function findAdb() {
  if (existsSync(localAdb)) return localAdb;
  const which = spawnSync(process.platform === 'win32' ? 'where' : 'which', ['adb'], {
    encoding: 'utf8',
  });
  const line = (which.stdout || '').split(/\r?\n/).map((s) => s.trim()).find(Boolean);
  return line || null;
}

function adbDevices(adb) {
  const r = spawnSync(adb, ['devices', '-l'], { encoding: 'utf8' });
  const text = `${r.stdout || ''}${r.stderr || ''}`;
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('List of devices'));
  const devices = lines
    .map((l) => {
      const [id, state, ...rest] = l.split(/\s+/);
      return { id, state, detail: rest.join(' ') };
    })
    .filter((d) => d.id && d.state);
  return { text, devices, ok: r.status === 0 };
}

const now = new Date().toISOString();
const adb = findAdb();
let connected = false;
let authorized = 'UNKNOWN';
let deviceSummary = 'none';
let adbBlock = 'adb not found';

if (!adb) {
  adbBlock =
    'adb not found. Expected `.agent/platform-tools/adb.exe` (run download) or PATH.';
} else {
  const { text, devices, ok } = adbDevices(adb);
  adbBlock = text.trim() || '(empty adb devices output)';
  const ready = devices.filter((d) => d.state === 'device');
  const unauthorized = devices.filter((d) => d.state === 'unauthorized');
  connected = ready.length > 0 || unauthorized.length > 0;
  if (ready.length > 0) {
    authorized = 'yes';
    deviceSummary = ready
      .map((d) => `${d.id}${d.detail ? ` (${d.detail})` : ''}`)
      .join(', ');
  } else if (unauthorized.length > 0) {
    authorized = 'no — accept USB debugging on headset';
    deviceSummary = unauthorized.map((d) => d.id).join(', ');
  }
  if (!ok && devices.length === 0) {
    adbBlock += '\n(adb exited non-zero)';
  }
}

const md = `# Quest readiness — live probe

Date: ${now.slice(0, 10)}  
Probed at: ${now}  
**QUEST_CONNECTED: ${connected ? 'yes' : 'no'}**

## adb

- path: \`${adb ?? 'MISSING'}\`
- authorized: ${authorized}
- device: ${deviceSummary}

\`\`\`
${adbBlock}
\`\`\`

## Public build (no USB required)

URL: ${publicUrl}

Open in **Meta Browser** on Quest for play smoke.

## PERFORMANCE

**UNKNOWN** (no automated fps capture in this probe)

## Next

${
  connected && authorized === 'yes'
    ? 'Device ready. Ask the agent to run Quest smoke / capture QUEST-* evidence.'
    : connected
      ? 'NEEDS-HUMAN: Put the Quest on and accept the USB debugging dialog.'
      : 'NEEDS-HUMAN: For USB path — connect Quest by USB, enable developer/USB debugging, accept the prompt. For no-USB path — open the public URL in Meta Browser (see evidence/xr/QUEST-READY.md).'
}

See also: \`evidence/xr/QUEST-READY.md\`
`;

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, md, 'utf8');

console.log(md);
console.log(`\nWrote ${outPath}`);
process.exitCode = connected && authorized === 'yes' ? 0 : 2;
