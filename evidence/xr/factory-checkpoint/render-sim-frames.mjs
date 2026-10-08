/**
 * Honest SIM VISUALIZATION frames (not headset camera, not IWER video).
 * Renders FactorySim state to PNG via pure node canvas-less SVG → sharp if available,
 * otherwise writes SVG files.
 */
import { writeFileSync, mkdirSync } from 'fs';
import { FactorySim } from '../../../xr-iwsdk/src/factory/sim.ts';

const outDir = 'evidence/comp/checkpoint-01/screenshots';
mkdirSync(outDir, { recursive: true });

const STATIONS = [
  { id: 'source', x: 120, label: 'SOURCE' },
  { id: 'procA', x: 280, label: 'PROC A' },
  { id: 'buffer', x: 440, label: 'BUFFER' },
  { id: 'procB', x: 600, label: 'PROC B' },
  { id: 'sink', x: 760, label: 'SINK' },
];

function frameSvg(title, snap, note) {
  const products = snap.products
    .map((p, i) => {
      if (p.kind === 'idle') return '';
      let x = 120;
      let y = 220;
      if (p.kind === 'at') {
        const s = STATIONS.find((st) => st.id === p.station);
        x = s ? s.x : 120;
        y = 200 - i * 2;
      } else if (p.kind === 'moving') {
        const a = STATIONS.find((st) => st.id === p.from);
        const b = STATIONS.find((st) => st.id === p.to);
        x = (a?.x ?? 120) + ((b?.x ?? 120) - (a?.x ?? 120)) * p.t;
        y = 180;
      } else if (p.kind === 'spill') {
        x = 440 + p.edgeX * 40;
        y = 320;
      }
      const fill = p.kind === 'spill' ? '#d9534f' : '#e8a838';
      return `<circle cx="${x}" cy="${y}" r="8" fill="${fill}"/>`;
    })
    .join('\n');

  const jam = snap.jamActive ? 'JAM' : snap.boosted ? 'BOOST ON' : 'FLOW';
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="900" height="420" viewBox="0 0 900 420">
  <rect width="900" height="420" fill="#1a1f24"/>
  <text x="24" y="36" fill="#f4f1ea" font-family="Segoe UI,sans-serif" font-size="18" font-weight="700">${title}</text>
  <text x="24" y="58" fill="#9aa3ad" font-family="Segoe UI,sans-serif" font-size="12">SIM VISUALIZATION — not Quest / not camera footage · ${note}</text>
  <rect x="60" y="140" width="780" height="120" rx="8" fill="#6e5843"/>
  ${STATIONS.map(
    (s) => `
    <rect x="${s.x - 36}" y="160" width="72" height="72" rx="6" fill="${
      s.id === 'procB' && snap.jamActive ? '#d9534f' : s.id === 'source' ? '#3d7ea6' : s.id === 'buffer' ? '#c4a35a' : s.id === 'sink' ? '#3f8f6b' : '#4a5568'
    }"/>
    <text x="${s.x}" y="255" text-anchor="middle" fill="#f4f1ea" font-family="Segoe UI,sans-serif" font-size="11">${s.label}</text>
  `,
  ).join('')}
  ${products}
  <text x="24" y="360" fill="#f4f1ea" font-family="Segoe UI,sans-serif" font-size="16">CASH ${Math.floor(snap.cash)} · OUT ${snap.delivered} · ${jam} · t=${snap.elapsed.toFixed(1)}s</text>
  <text x="24" y="390" fill="#f0c75e" font-family="Segoe UI,sans-serif" font-size="22" font-weight="800">${
    snap.grade ? `GRADE ${snap.grade}` : ''
  }</text>
</svg>`;
}

const sim = new FactorySim({
  shiftDurationSec: 40,
  sourcePeriodSec: 0.4,
  procAPeriodSec: 0.35,
  procBPeriodSec: 3.0,
  bufferCapacity: 2,
  jamBufferThreshold: 2,
  moveDurationSec: 0.15,
  boostCost: 18,
  startingCash: 40,
});
sim.start();

const captures = [];
for (let i = 0; i < 500; i += 1) {
  sim.step(0.1);
  const s = sim.snapshot();
  if (captures.length === 0 && s.products.some((p) => p.kind !== 'idle')) {
    captures.push(['SIM-01-production.svg', 'Production moving', s]);
  }
  if (captures.length === 1 && s.jamActive) {
    captures.push(['SIM-02-jam.svg', 'Jam at slow processor', s]);
  }
  if (captures.length === 2 && s.jamActive && s.elapsed > 4) {
    sim.tryApplyBoost();
    captures.push(['SIM-03-intervention-boost.svg', 'BOOST snapped (sim apply)', sim.snapshot()]);
  }
  if (captures.length === 3 && s.boosted && !s.jamActive && s.elapsed > 6) {
    captures.push(['SIM-04-recovered.svg', 'Flow recovered', sim.snapshot()]);
  }
  if (s.phase === 'ended') {
    captures.push(['SIM-05-grade.svg', 'Shift end grade', sim.snapshot()]);
    break;
  }
}

for (const [name, note, snap] of captures) {
  writeFileSync(`${outDir}/${name}`, frameSvg(note, snap, name));
  console.log('wrote', name);
}
console.log('frames', captures.length);
