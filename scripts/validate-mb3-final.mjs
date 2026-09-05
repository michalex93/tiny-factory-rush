/**
 * M-B.3 final validation — SESSION TIME accelerated.
 * Throughput: events off. Margin: events on + save/reload mid-mastery + mobile.
 * node scripts/validate-mb3-final.mjs
 */
import { chromium } from 'playwright';
import fs from 'fs';

const URL = process.env.SMOKE_URL ?? 'http://127.0.0.1:5173/';
const THR = 650;

async function bootClean(page, viewport, { clearSave = true } = {}) {
  await page.setViewportSize(viewport);
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  if (clearSave) {
    await page.evaluate(() => {
      try {
        localStorage.removeItem('tiny-factory-rush-save');
        localStorage.clear();
      } catch {
        /* ignore */
      }
    });
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
  }
  await page.waitForSelector('canvas', { timeout: 25000 });
  await page.waitForFunction(() => {
    const reg = window.__tfrGame?.registry?.get?.('game');
    return !!reg?.factory;
  }, { timeout: 25000 });
  if (clearSave) {
    // If save somehow restored, wipe + reload once more
    const dirty = await page.evaluate(() => {
      const f = window.__tfrGame.registry.get('game').factory;
      return f.upgrades.totalPurchased > 0 || f.economy.totalEarned > 5;
    });
    if (dirty) {
      await page.evaluate(() => localStorage.clear());
      await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForSelector('canvas', { timeout: 25000 });
    }
  }
  await page.evaluate(() => {
    const reg = window.__tfrGame.registry.get('game');
    reg.factory.line.rollGolden = () => false;
    try {
      reg.saveSystem?.stopAutosave?.();
    } catch {
      /* ignore */
    }
  });
}

async function snap(page) {
  return page.evaluate(() => {
    const reg = window.__tfrGame.registry.get('game');
    const f = reg.factory;
    const t = reg.telemetry;
    const sg = f.sessionGoal.snapshot();
    return {
      sessMs: Math.round(f.sessionMs),
      teleMs: Math.round(t.elapsed),
      phase: f.sessionGoal.phase,
      label: f.sessionGoal.label(),
      plan: f.sessionGoal.planLabel?.() ?? '',
      earned: Math.floor(f.economy.totalEarned),
      coins: Math.floor(f.economy.coins),
      ups: f.upgrades.totalPurchased,
      tp: +f.getThroughputPerMin().toFixed(1),
      income: +f.lineIncomePerMin().toFixed(1),
      wip: f.getWip(),
      product: f.economy.currentProduct,
      unlockedToys: f.progression.isUnlocked('toys'),
      canOpenToys: f.progression.canUnlock('toys', f.economy).ok,
      awaitingFirstToy: !!sg?.awaitingFirstToy,
      firstToyProduced: !!sg?.firstToyProduced,
      masteryType: sg?.toyMasteryType ?? null,
      masteryProgress: sg?.toyMasteryProgress ?? 0,
      masteryTarget: sg?.toyMasteryTarget ?? 0,
      masteryDone: !!sg?.toyMasteryCompleted,
      phonesShown: !!sg?.smartphonesMilestoneShown,
      labelEmpty: !f.sessionGoal.label(),
    };
  });
}

async function advance(page, ms, prefer, buyCooldownMs = 10_000) {
  return page.evaluate(
    ({ ms, prefer, buyCooldownMs }) => {
      const reg = window.__tfrGame.registry.get('game');
      const f = reg.factory;
      const t = reg.telemetry;
      let left = ms;
      let sinceBuy = buyCooldownMs;
      let maxGapNoMeta = 0;
      let lastMetaMs = f.sessionMs;

      const tryBuy = () => {
        const order =
          prefer === 'speed'
            ? ['speed', 'value', 'buffer']
            : ['value', 'speed', 'buffer'];
        for (const type of order) {
          for (const m of [1, 0, 2]) {
            if (type === 'buffer' && m === 2) continue;
            if (f.economy.canAfford(f.upgrades.costFor(m, type))) {
              if (f.buyUpgrade(m, type)) {
                t.upgradesBought = (t.upgradesBought || 0) + 1;
                t.upgradesByType[type] = (t.upgradesByType[type] || 0) + 1;
                return true;
              }
            }
          }
        }
        return false;
      };

      while (left > 0) {
        const step = Math.min(250, left);
        t.update(step);
        f.update(step);
        t.noteUpgradesAtFive?.(f.upgrades.totalPurchased);
        left -= step;
        sinceBuy += step;
        const label = f.sessionGoal.label();
        if (label && label.length > 0) lastMetaMs = f.sessionMs;
        else maxGapNoMeta = Math.max(maxGapNoMeta, f.sessionMs - lastMetaMs);

        if (sinceBuy >= buyCooldownMs) {
          if (tryBuy()) sinceBuy = 0;
          else sinceBuy = Math.min(sinceBuy, buyCooldownMs);
        }
      }
      return { maxGapNoMeta };
    },
    { ms, prefer, buyCooldownMs },
  );
}

async function reachChoice(page, prefer) {
  for (let i = 0; i < 120; i++) {
    const st = await snap(page);
    if (st.phase === 'awaiting_choice') return st;
    await advance(page, 1500, 'speed', 8_000);
    await page.evaluate(() => {
      const f = window.__tfrGame.registry.get('game').factory;
      if (f.upgrades.getLevel(1, 'speed') < 2) {
        const c = f.upgrades.costFor(1, 'speed');
        if (f.economy.canAfford(c)) f.buyUpgrade(1, 'speed');
      }
    });
  }
  await page.evaluate(() => {
    const f = window.__tfrGame.registry.get('game').factory;
    f.economy.coins += 500;
    while (f.upgrades.getLevel(1, 'speed') < 2) f.buyUpgrade(1, 'speed');
  });
  for (let i = 0; i < 80; i++) {
    await advance(page, 1000, prefer, 60_000);
    if ((await snap(page)).phase === 'awaiting_choice') break;
  }
  return snap(page);
}

async function runThroughput(page) {
  const viewport = { width: 1280, height: 800 };
  await bootClean(page, viewport);
  const prefer = 'speed';
  const log = { branch: 'throughput', events: 'off', markers: {}, notes: { maxGapNoMetaMs: 0 } };

  log.markers.stage1 = await reachChoice(page, prefer);
  await page.evaluate(() => {
    window.__tfrGame.registry.get('game').factory.selectOptimizationBranch('throughput');
  });
  for (let i = 0; i < 50; i++) {
    const bought = await page.evaluate(() => {
      const f = window.__tfrGame.registry.get('game').factory;
      const t = window.__tfrGame.registry.get('game').telemetry;
      if (!f.economy.canAfford(f.upgrades.costFor(1, 'speed'))) return false;
      const ok = f.buyUpgrade(1, 'speed');
      if (ok) {
        t.upgradesBought += 1;
        t.upgradesByType.speed = (t.upgradesByType.speed || 0) + 1;
      }
      return ok;
    });
    if (bought) break;
    await advance(page, 1000, prefer, 60_000);
  }

  for (let i = 0; i < 160; i++) {
    const st = await snap(page);
    if (st.phase === 'post_chain') {
      log.markers.convergence = st;
      break;
    }
    const adv = await advance(page, 1500, prefer, 9_000);
    log.notes.maxGapNoMetaMs = Math.max(log.notes.maxGapNoMetaMs, adv.maxGapNoMeta || 0);
    await page.evaluate(() => {
      const f = window.__tfrGame.registry.get('game').factory;
      if (f.sessionGoal.phase !== 'convergence') return;
      if (f.economy.canAfford(f.upgrades.costFor(1, 'value'))) f.buyUpgrade(1, 'value');
    });
  }

  // Events OFF
  await page.evaluate(() => {
    window.__tfrGame.registry.get('game').factory.eventsSys.suppress();
  });

  for (let i = 0; i < 250; i++) {
    const st = await snap(page);
    if (st.earned >= THR && !log.markers.toysThreshold) log.markers.toysThreshold = st;
    if (st.canOpenToys) {
      log.markers.toysReady = st;
      break;
    }
    if (st.sessMs > 10 * 60_000) break;
    const adv = await advance(page, 2000, prefer, 9_000);
    log.notes.maxGapNoMetaMs = Math.max(log.notes.maxGapNoMetaMs, adv.maxGapNoMeta || 0);
  }

  // Drain cash
  await page.evaluate(() => {
    const f = window.__tfrGame.registry.get('game').factory;
    let s = 0;
    while (f.economy.coins >= 10 && s < 40) {
      let bought = false;
      for (const type of ['speed', 'value', 'buffer']) {
        for (const m of [1, 0, 2]) {
          if (type === 'buffer' && m === 2) continue;
          if (f.economy.canAfford(f.upgrades.costFor(m, type))) {
            f.buyUpgrade(m, type);
            bought = true;
          }
        }
      }
      if (!bought) break;
      s += 1;
    }
    if (f.economy.coins > 0) f.economy.spend(f.economy.coins);
  });

  for (let i = 0; i < 40 && !(await snap(page)).canOpenToys; i++) {
    await advance(page, 2000, prefer, 9_000);
  }

  log.markers.beforeOpen = await snap(page);
  const open = await page.evaluate(() => {
    const f = window.__tfrGame.registry.get('game').factory;
    const t = window.__tfrGame.registry.get('game').telemetry;
    const cashBefore = Math.floor(f.economy.coins);
    const earnedBefore = Math.floor(f.economy.totalEarned);
    const ok = f.tryUnlockNext();
    if (ok) {
      t.once('toys_opened', { lifetimeEarnedAtUnlock: earnedBefore, cashAtUnlock: cashBefore });
      t.lifetimeEarnedAtUnlock = earnedBefore;
      t.cashAtUnlock = cashBefore;
      t.upgradesAtToysUnlock = f.upgrades.totalPurchased;
      t.once('first_toy_action', { action: 'open_toys' });
    }
    return {
      ok,
      cashBefore,
      cashAfter: Math.floor(f.economy.coins),
      cashDelta: Math.floor(f.economy.coins) - cashBefore,
      earnedBefore,
      label: f.sessionGoal.label(),
    };
  });
  log.markers.openToys = open;

  // First toy + mastery
  for (let i = 0; i < 60; i++) {
    await advance(page, 500, prefer, 60_000);
    const st = await snap(page);
    if (st.firstToyProduced && !log.markers.firstToy) {
      log.markers.firstToy = st;
    }
    if (st.phase === 'toy_mastery' && !log.markers.masteryShown) {
      log.markers.masteryShown = st;
      log.notes.masteryDelayMs =
        st.sessMs - (log.markers.firstToy?.sessMs ?? st.sessMs);
    }
    if (log.markers.firstToy && log.markers.masteryShown) break;
  }

  const masteryStart = (await snap(page)).sessMs;
  for (let i = 0; i < 400; i++) {
    const st = await snap(page);
    if (st.phase === 'smartphones_horizon' || st.phonesShown) {
      log.markers.masteryDone = st;
      log.markers.smartphones = st;
      log.notes.masteryDurationMs = st.sessMs - masteryStart;
      log.notes.phonesDelayMs = 0;
      break;
    }
    if (st.phase === 'toy_mastery') {
      const adv = await advance(page, 500, prefer, 12_000);
      log.notes.maxGapNoMetaMs = Math.max(log.notes.maxGapNoMetaMs, adv.maxGapNoMeta || 0);
    } else {
      await advance(page, 500, prefer, 60_000);
    }
  }

  await page.screenshot({ path: 'validate-mb3-throughput-end.png', fullPage: true });
  log.report = await page.evaluate(() => {
    const r = window.__tfrOnboardingReport();
    return {
      toysOpenedMs: r.toysOpenedMs,
      toysThresholdReachedMs: r.toysThresholdReachedMs,
      firstToyProducedMs: r.firstToyProducedMs,
      toyMasteryShownMs: r.toyMasteryShownMs,
      toyMasteryCompleteMs: r.toyMasteryCompleteMs,
      toyMasteryType: r.toyMasteryType,
      toyMasteryTarget: r.toyMasteryTarget,
      smartphonesMilestoneShownMs: r.smartphonesMilestoneShownMs,
      lifetimeEarnedAtUnlock: r.lifetimeEarnedAtUnlock,
      cashAtUnlock: r.cashAtUnlock,
      upgradesAtToysUnlock: r.upgradesAtToysUnlock,
      upgradesAtFiveMinutes: r.upgradesAtFiveMinutes,
      convergenceCompletionTime: r.convergenceCompletionTime,
      branchSelected: r.branchSelected,
    };
  });
  log.end = await snap(page);
  return log;
}

async function runMargin(page) {
  const viewport = { width: 390, height: 844 };
  await bootClean(page, viewport);
  const prefer = 'value';
  const log = {
    branch: 'margin',
    events: 'typical',
    viewport,
    markers: {},
    notes: { maxGapNoMetaMs: 0 },
  };

  log.markers.stage1 = await reachChoice(page, prefer);
  await page.evaluate(() => {
    window.__tfrGame.registry.get('game').factory.selectOptimizationBranch('margin');
  });
  for (let i = 0; i < 50; i++) {
    const bought = await page.evaluate(() => {
      const f = window.__tfrGame.registry.get('game').factory;
      if (!f.economy.canAfford(f.upgrades.costFor(1, 'value'))) return false;
      return f.buyUpgrade(1, 'value');
    });
    if (bought) break;
    await advance(page, 1000, prefer, 60_000);
  }

  for (let i = 0; i < 160; i++) {
    const st = await snap(page);
    if (st.phase === 'post_chain') {
      log.markers.convergence = st;
      break;
    }
    const adv = await advance(page, 1500, prefer, 9_000);
    log.notes.maxGapNoMetaMs = Math.max(log.notes.maxGapNoMetaMs, adv.maxGapNoMeta || 0);
    await page.evaluate(() => {
      const f = window.__tfrGame.registry.get('game').factory;
      if (f.sessionGoal.phase !== 'convergence') return;
      if (f.economy.canAfford(f.upgrades.costFor(1, 'speed'))) f.buyUpgrade(1, 'speed');
    });
  }

  // Events ON (resume after chain — already resumed by game; ensure not suppressed)
  await page.evaluate(() => {
    const f = window.__tfrGame.registry.get('game').factory;
    if (f.eventsSys.suppressed) f.eventsSys.resume();
  });

  for (let i = 0; i < 250; i++) {
    const st = await snap(page);
    if (st.earned >= THR && !log.markers.toysThreshold) log.markers.toysThreshold = st;
    if (st.canOpenToys) {
      log.markers.toysReady = st;
      break;
    }
    if (st.sessMs > 10 * 60_000) break;
    const adv = await advance(page, 2000, prefer, 9_000);
    log.notes.maxGapNoMetaMs = Math.max(log.notes.maxGapNoMetaMs, adv.maxGapNoMeta || 0);
  }

  await page.evaluate(() => {
    const f = window.__tfrGame.registry.get('game').factory;
    if (f.economy.coins > 0) f.economy.spend(f.economy.coins);
  });
  for (let i = 0; i < 40 && !(await snap(page)).canOpenToys; i++) {
    await advance(page, 2000, prefer, 9_000);
  }

  log.markers.beforeOpen = await snap(page);
  log.markers.openToys = await page.evaluate(() => {
    const f = window.__tfrGame.registry.get('game').factory;
    const t = window.__tfrGame.registry.get('game').telemetry;
    const cashBefore = Math.floor(f.economy.coins);
    const earnedBefore = Math.floor(f.economy.totalEarned);
    const ok = f.tryUnlockNext();
    if (ok) {
      t.once('toys_opened', { lifetimeEarnedAtUnlock: earnedBefore, cashAtUnlock: cashBefore });
      t.lifetimeEarnedAtUnlock = earnedBefore;
      t.cashAtUnlock = cashBefore;
      t.upgradesAtToysUnlock = f.upgrades.totalPurchased;
    }
    return {
      ok,
      cashBefore,
      cashAfter: Math.floor(f.economy.coins),
      cashDelta: Math.floor(f.economy.coins) - cashBefore,
      earnedBefore,
      label: f.sessionGoal.label(),
    };
  });

  for (let i = 0; i < 60; i++) {
    await advance(page, 500, prefer, 60_000);
    const st = await snap(page);
    if (st.firstToyProduced && !log.markers.firstToy) log.markers.firstToy = st;
    if (st.phase === 'toy_mastery' && !log.markers.masteryShown) {
      log.markers.masteryShown = st;
      log.notes.masteryDelayMs =
        st.sessMs - (log.markers.firstToy?.sessMs ?? st.sessMs);
    }
    if (log.markers.firstToy && log.markers.masteryShown) break;
  }

  // Progress mastery to ~halfway then save/reload
  const midTarget = (log.markers.masteryShown?.masteryTarget ?? 420) * 0.45;
  for (let i = 0; i < 200; i++) {
    const st = await snap(page);
    if (st.masteryProgress >= midTarget) {
      log.markers.midMastery = st;
      break;
    }
    await advance(page, 500, prefer, 12_000);
  }

  // Save
  await page.evaluate(() => {
    const reg = window.__tfrGame.registry.get('game');
    reg.saveSystem?.save?.();
  });
  const saveRaw = await page.evaluate(() =>
    localStorage.getItem('tiny-factory-rush-save'),
  );
  log.notes.saveBytes = saveRaw?.length ?? 0;

  // Reload WITHOUT clearing save
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('canvas', { timeout: 25000 });
  await page.waitForFunction(() => {
    const reg = window.__tfrGame?.registry?.get?.('game');
    if (!reg?.factory) return false;
    const sg = reg.factory.sessionGoal.snapshot();
    return (
      reg.factory.progression.isUnlocked('toys') ||
      sg?.phase === 'toy_mastery' ||
      sg?.toysOpened === true
    );
  }, { timeout: 45000 });
  await page.evaluate(() => {
    window.__tfrGame.registry.get('game').factory.line.rollGolden = () => false;
  });

  log.markers.afterReload = await snap(page);
  log.notes.reloadOk =
    log.markers.afterReload.phase === 'toy_mastery' &&
    !log.markers.afterReload.labelEmpty &&
    log.markers.afterReload.masteryType === 'margin' &&
    log.markers.afterReload.masteryProgress > 0;

  // Finish mastery
  const masteryStart = log.markers.masteryShown?.sessMs ?? log.markers.afterReload.sessMs;
  for (let i = 0; i < 400; i++) {
    const st = await snap(page);
    if (st.phase === 'smartphones_horizon' || st.phonesShown) {
      log.markers.masteryDone = st;
      log.markers.smartphones = st;
      log.notes.masteryDurationMs = st.sessMs - masteryStart;
      break;
    }
    await advance(page, 500, prefer, 12_000);
  }

  // Badge preview
  log.notes.badgePreview = await page.evaluate(() => {
    const ok = window.__tfrPreviewPayoff?.('still_limiting');
    const f = window.__tfrGame.registry.get('game').factory;
    return {
      ok: !!ok,
      mode: f.bottleneckBadgeMode,
      delta: f.improvedBadgeDeltaPct,
      bn: f.highlightedBottleneck,
    };
  });
  await page.waitForTimeout(150);
  await page.screenshot({
    path: 'validate-mb3-margin-badge.png',
    fullPage: true,
  });
  await page.screenshot({ path: 'validate-mb3-margin-end.png', fullPage: true });

  log.report = await page.evaluate(() => {
    const r = window.__tfrOnboardingReport();
    return {
      toysOpenedMs: r.toysOpenedMs,
      toysThresholdReachedMs: r.toysThresholdReachedMs,
      firstToyProducedMs: r.firstToyProducedMs,
      toyMasteryShownMs: r.toyMasteryShownMs,
      toyMasteryCompleteMs: r.toyMasteryCompleteMs,
      toyMasteryType: r.toyMasteryType,
      toyMasteryTarget: r.toyMasteryTarget,
      smartphonesMilestoneShownMs: r.smartphonesMilestoneShownMs,
      lifetimeEarnedAtUnlock: r.lifetimeEarnedAtUnlock,
      cashAtUnlock: r.cashAtUnlock,
      upgradesAtToysUnlock: r.upgradesAtToysUnlock,
      upgradesAtFiveMinutes: r.upgradesAtFiveMinutes,
      convergenceCompletionTime: r.convergenceCompletionTime,
      branchSelected: r.branchSelected,
    };
  });
  log.end = await snap(page);
  return log;
}

function row(r) {
  if (!r) return null;
  const s = (m) => (m?.sessMs != null ? +(m.sessMs / 1000).toFixed(1) : null);
  return {
    convergence_s: s(r.markers.convergence),
    toysThreshold_s: s(r.markers.toysThreshold),
    open_s: s(r.markers.beforeOpen),
    open_ok: r.markers.openToys?.ok,
    cashAtOpen: r.markers.openToys?.cashBefore,
    cashDelta: r.markers.openToys?.cashDelta,
    earnedAtOpen: r.markers.openToys?.earnedBefore,
    firstToy_s: s(r.markers.firstToy),
    firstToyDelay_s: r.markers.firstToy && r.markers.openToys
      ? +((r.markers.firstToy.sessMs - (r.markers.beforeOpen?.sessMs ?? 0)) / 1000).toFixed(1)
      : null,
    masteryShown_s: s(r.markers.masteryShown),
    masteryDelay_s: r.notes.masteryDelayMs != null
      ? +(r.notes.masteryDelayMs / 1000).toFixed(2)
      : null,
    masteryType: r.markers.masteryShown?.masteryType,
    plan: r.markers.masteryShown?.plan,
    masteryDone_s: s(r.markers.masteryDone),
    masteryDur_s: r.notes.masteryDurationMs != null
      ? +(r.notes.masteryDurationMs / 1000).toFixed(1)
      : null,
    smartphones_s: s(r.markers.smartphones),
    upsAtOpen: r.markers.beforeOpen?.ups,
    maxGapNoMeta_s: r.notes.maxGapNoMetaMs
      ? +(r.notes.maxGapNoMetaMs / 1000).toFixed(2)
      : 0,
    afterReload: r.markers.afterReload
      ? {
          phase: r.markers.afterReload.phase,
          label: r.markers.afterReload.label,
          progress: r.markers.afterReload.masteryProgress,
          labelEmpty: r.markers.afterReload.labelEmpty,
        }
      : null,
    reloadOk: r.notes.reloadOk ?? null,
    badge: r.notes.badgePreview ?? null,
    endLabel: r.end?.label,
    report: r.report,
  };
}

const browser = await chromium.launch({ headless: true });
const results = {};
try {
  console.error('Throughput (events off)…');
  {
    const page = await browser.newPage();
    results.throughput = await runThroughput(page);
    await page.close();
  }
  console.error('Margin (events on, mobile, save/reload)…');
  {
    const page = await browser.newPage();
    results.margin = await runMargin(page);
    await page.close();
  }
} catch (e) {
  results.error = String(e?.stack || e);
  console.error(e);
}
await browser.close();
fs.writeFileSync('validate-mb3-final.json', JSON.stringify(results, null, 2));
console.log(
  JSON.stringify(
    {
      throughput: row(results.throughput),
      margin: row(results.margin),
      error: results.error,
    },
    null,
    2,
  ),
);
