/**
 * M-C four-path timing summary (scripted Factory).
 * node scripts/sim-mc-paths.mjs  — uses vitest-style logic via dynamic import of built? 
 * Prefer: npx vitest run is source of truth; this prints calibrated ETA from config.
 */
import { SMARTPHONE_CAMPAIGN } from '../src/config/balance.ts';

const MASTERY_END = { flow: 490, margin: 449 };
const IPS = { low: 3.5, mid: 5.5, high: 8.3 }; // $/s post-mastery

const { fundTarget, balancedPct, fastPct } = SMARTPHONE_CAMPAIGN;
const launchSec = (SMARTPHONE_CAMPAIGN.launch.minElapsedMs + SMARTPHONE_CAMPAIGN.launch.holdMs) / 1000;

console.log('Config', { fundTarget, balancedPct, fastPct, launchSec });
console.log('\nEstimated BUILD / SHIFT1 (minutes session):');
for (const [branch, end] of Object.entries(MASTERY_END)) {
  for (const [tier, ips] of Object.entries(IPS)) {
    for (const [pol, pct] of [
      ['FAST', fastPct],
      ['BAL', balancedPct],
    ]) {
      const fundS = fundTarget / (ips * pct);
      const buildMin = (end + fundS) / 60;
      const shiftMin = (end + fundS + 8 + launchSec) / 60; // ~8s first phone
      console.log(
        `${branch}/${tier}/${pol}: BUILD ${buildMin.toFixed(1)}m → Shift1 ~${shiftMin.toFixed(1)}m (fund ${(fundS / 60).toFixed(2)}m)`,
      );
    }
  }
}
