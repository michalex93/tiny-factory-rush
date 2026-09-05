/**
 * M-C funding pacing sim — post Toy Mastery income → fund fill time.
 * node scripts/sim-mc-funding.mjs
 *
 * Uses approximate human post-mastery LINE INCOME rates from validate-mb3-final.
 */
const MASTERY_END_S = { flow: 490, margin: 449 }; // session s from mb3 final
const INCOME_PER_S = {
  // conservative / typical / strong post-mastery Toys line
  low: 3.2,
  mid: 4.5,
  high: 6.5,
};

const TARGETS = [550, 600, 650, 700];
const BALANCED = [0.65, 0.68, 0.7];
const FAST = [0.85, 0.88, 0.9];

function eta(target, pct, ips) {
  const rate = ips * pct;
  return rate > 0 ? target / rate : Infinity;
}

function band(masteryEndS, fundS) {
  return (masteryEndS + fundS) / 60;
}

console.log('=== M-C funding ETA (minutes to BUILD from session start) ===\n');

const picks = [];
for (const target of TARGETS) {
  for (const bal of BALANCED) {
    for (const fast of FAST) {
      const rows = [];
      for (const [branch, endS] of Object.entries(MASTERY_END_S)) {
        for (const [tier, ips] of Object.entries(INCOME_PER_S)) {
          const balS = eta(target, bal, ips);
          const fastS = eta(target, fast, ips);
          const balMin = band(endS, balS);
          const fastMin = band(endS, fastS);
          const diff = (balS - fastS) / fastS;
          rows.push({
            branch,
            tier,
            ips,
            balMin: +balMin.toFixed(2),
            fastMin: +fastMin.toFixed(2),
            balFundMin: +(balS / 60).toFixed(2),
            fastFundMin: +(fastS / 60).toFixed(2),
            diffPct: +(diff * 100).toFixed(0),
          });
        }
      }
      // Score: how many mid-tier rows land in FAST 10–12 and BALANCED 11–13.5
      let score = 0;
      for (const r of rows.filter((x) => x.tier === 'mid')) {
        if (r.fastMin >= 10 && r.fastMin <= 12) score += 2;
        else if (r.fastMin >= 9.5 && r.fastMin <= 12.5) score += 1;
        if (r.balMin >= 11 && r.balMin <= 13.5) score += 2;
        else if (r.balMin >= 10.5 && r.balMin <= 14) score += 1;
        if (r.diffPct > 0 && r.diffPct <= 35) score += 1;
      }
      picks.push({ target, bal, fast, score, rows });
    }
  }
}

picks.sort((a, b) => b.score - a.score);
const best = picks[0];
console.log('BEST config:', {
  target: best.target,
  balancedPct: best.bal,
  fastPct: best.fast,
  score: best.score,
});
console.log('\nMid-tier detail:');
for (const r of best.rows.filter((x) => x.tier === 'mid')) {
  console.log(
    `  ${r.branch}: FAST ${r.fastMin}m (fund ${r.fastFundMin}m) | BAL ${r.balMin}m (fund ${r.balFundMin}m) | Δ ${r.diffPct}%`,
  );
}
console.log('\nLow/high sensitivity (same config):');
for (const r of best.rows.filter((x) => x.tier !== 'mid')) {
  console.log(
    `  ${r.branch}/${r.tier}: FAST ${r.fastMin}m | BAL ${r.balMin}m`,
  );
}

// Also check if $600 @ 68/88 works with mid
const t600 = picks.find((p) => p.target === 600 && p.bal === 0.68 && p.fast === 0.88);
console.log('\n$600 @ 68%/88% mid:', t600?.rows.filter((x) => x.tier === 'mid'));
