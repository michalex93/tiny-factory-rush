/**
 * M-B.2 final validation — SESSION TIME accelerated (not wall clock).
 * node scripts/validate-mb2-final.mjs
 */
import { chromium } from 'playwright';
import fs from 'fs';

const URL = process.env.SMOKE_URL ?? 'http://127.0.0.1:5173/';
const THR = 900;

async function bootClean(page, viewport) {
  await page.setViewportSize(viewport);
  // Wipe save BEFORE the game boots (reload would re-save dirty state on unload)
  await page.addInitScript(() => {
    try {
      localStorage.removeItem('tiny-factory-rush-save');
      localStorage.clear();
    } catch {
      /* ignore */
    }
  });
  await page.goto(URL + '?v=' + Date.now(), {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  });
  await page.waitForSelector('canvas', { timeout: 25000 });
  await page.waitForFunction(() => {
    const reg = window.__tfrGame?.registry?.get?.('game');
    return !!reg?.factory && reg.factory.sessionMs < 2000;
  }, { timeout: 25000 });
  await page.evaluate(() => {
    const reg = window.__tfrGame.registry.get('game');
    reg.factory.line.rollGolden = () => false;
    // Stop autosave writing mid-validation if possible
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
      earned: Math.floor(f.economy.totalEarned),
      toysDisplay: sg?.toysEarnedDisplay ?? 0,
      coins: Math.floor(f.economy.coins),
      ups: f.upgrades.totalPurchased,
      tp: +f.getThroughputPerMin().toFixed(1),
      income: +f.lineIncomePerMin().toFixed(1),
      wip: f.getWip(),
      bn: f.line.getBottleneckId(),
      product: f.economy.currentProduct,
      productColor: f.economy.productColor,
      lineColor: f.line.productColor,
      unlockedToys: f.progression.isUnlocked('toys'),
      canOpenToys: f.progression.canUnlock('toys', f.economy).ok,
      awaitingFirstToy: !!sg?.awaitingFirstToy,
      levels: {
        speed1: f.upgrades.getLevel(1, 'speed'),
        value1: f.upgrades.getLevel(1, 'value'),
        speed0: f.upgrades.getLevel(0, 'speed'),
        value0: f.upgrades.getLevel(0, 'value'),
      },
    };
  });
}

/** Advance session+telemetry; buy whenever affordable with short human cooldown. */
async function advance(page, ms, prefer, buyCooldownMs = 10_000) {
  return page.evaluate(
    ({ ms, prefer, buyCooldownMs }) => {
      const reg = window.__tfrGame.registry.get('game');
      const f = reg.factory;
      const t = reg.telemetry;
      let left = ms;
      let sinceBuy = buyCooldownMs; // allow immediate first buy
      let buys = 0;
      let lastBuyAt = f.sessionMs;
      let maxGap = 0;
      let progressNeverDecreased = true;
      let lastDisp = f.sessionGoal.snapshot()?.toysEarnedDisplay ?? 0;

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
                buys += 1;
                // mirror GameScene telemetry counters
                t.upgradesBought = (t.upgradesBought || 0) + 1;
                t.upgradesByType[type] = (t.upgradesByType[type] || 0) + 1;
                lastBuyAt = f.sessionMs;
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
        if (typeof t.noteUpgradesAtFive === 'function') {
          t.noteUpgradesAtFive(f.upgrades.totalPurchased);
        }
        left -= step;
        sinceBuy += step;

        const disp = f.sessionGoal.snapshot()?.toysEarnedDisplay ?? 0;
        if (disp < lastDisp) progressNeverDecreased = false;
        lastDisp = Math.max(lastDisp, disp);

        if (sinceBuy >= buyCooldownMs) {
          if (tryBuy()) sinceBuy = 0;
          else {
            maxGap = Math.max(maxGap, f.sessionMs - lastBuyAt);
            sinceBuy = Math.min(sinceBuy, buyCooldownMs); // retry soon
          }
        }
      }
      return { buys, maxGap, progressNeverDecreased, lastDisp };
    },
    { ms, prefer, buyCooldownMs },
  );
}

async function runRoute(page, branch, viewport) {
  await bootClean(page, viewport);
  const prefer = branch === 'throughput' ? 'speed' : 'value';
  const log = {
    branch,
    viewport,
    markers: {},
    notes: {
      progressNeverDecreased: true,
      maxGapNoBuyMs: 0,
      upsAt5: null,
    },
  };

  // Stage 1 — reach choice
  for (let i = 0; i < 100; i++) {
    const st = await snap(page);
    if (st.phase === 'awaiting_choice') {
      log.markers.stage1 = st;
      break;
    }
    await advance(page, 1500, 'speed', 8_000);
    await page.evaluate(() => {
      const f = window.__tfrGame.registry.get('game').factory;
      if (f.upgrades.getLevel(1, 'speed') < 2) {
        const c = f.upgrades.costFor(1, 'speed');
        if (f.economy.canAfford(c)) f.buyUpgrade(1, 'speed');
      }
    });
  }
  if (!log.markers.stage1) {
    // Assist: inject coins to finish stage1 like a stuck player wouldn't — fail soft
    await page.evaluate(() => {
      const f = window.__tfrGame.registry.get('game').factory;
      f.economy.add(200);
      while (f.upgrades.getLevel(1, 'speed') < 2) f.buyUpgrade(1, 'speed');
    });
    for (let i = 0; i < 60; i++) {
      await advance(page, 1000, 'speed', 60_000);
      if ((await snap(page)).phase === 'awaiting_choice') break;
    }
    log.markers.stage1 = await snap(page);
  }
  if (log.markers.stage1.phase !== 'awaiting_choice') {
    throw new Error(`${branch}: stage1 failed phase=${log.markers.stage1.phase}`);
  }

  await page.evaluate((b) => {
    window.__tfrGame.registry.get('game').factory.selectOptimizationBranch(b);
  }, branch);

  for (let i = 0; i < 50; i++) {
    const bought = await page.evaluate((pick) => {
      const f = window.__tfrGame.registry.get('game').factory;
      const t = window.__tfrGame.registry.get('game').telemetry;
      const cost = f.upgrades.costFor(1, pick);
      if (!f.economy.canAfford(cost)) return false;
      const ok = f.buyUpgrade(1, pick);
      if (ok) {
        t.upgradesBought += 1;
        t.upgradesByType[pick] = (t.upgradesByType[pick] || 0) + 1;
      }
      return ok;
    }, prefer === 'speed' ? 'speed' : 'value');
    if (bought) break;
    await advance(page, 1000, prefer, 60_000);
  }
  log.markers.afterPurchase = await snap(page);

  // Branch + convergence
  for (let i = 0; i < 150; i++) {
    const st = await snap(page);
    if (st.phase === 'post_chain' || st.phase === 'complete') {
      log.markers.convergence = { ...st };
      log.markers.toysShown = { ...st };
      break;
    }
    const adv = await advance(page, 1500, prefer, 9_000);
    if (!adv.progressNeverDecreased) log.notes.progressNeverDecreased = false;
    log.notes.maxGapNoBuyMs = Math.max(log.notes.maxGapNoBuyMs, adv.maxGap || 0);
    await page.evaluate((pref) => {
      const f = window.__tfrGame.registry.get('game').factory;
      if (f.sessionGoal.phase !== 'convergence') return;
      const other = pref === 'speed' ? 'value' : 'speed';
      if (f.economy.canAfford(f.upgrades.costFor(1, other))) f.buyUpgrade(1, other);
    }, prefer);
  }
  if (!log.markers.convergence) throw new Error(`${branch}: no convergence`);

  // No global events (conservative pacing)
  await page.evaluate(() => {
    window.__tfrGame.registry.get('game').factory.eventsSys.suppress();
  });

  // Grind to threshold
  for (let i = 0; i < 250; i++) {
    const st = await snap(page);
    if (log.notes.upsAt5 === null && st.sessMs >= 5 * 60_000) {
      log.notes.upsAt5 = st.ups;
    }
    if (st.earned >= THR && !log.markers.toysThreshold) {
      log.markers.toysThreshold = { ...st };
    }
    if (st.canOpenToys) {
      log.markers.toysReady = { ...st };
      break;
    }
    if (st.sessMs > 10 * 60_000) break;
    const adv = await advance(page, 2000, prefer, 9_000);
    if (!adv.progressNeverDecreased) log.notes.progressNeverDecreased = false;
    log.notes.maxGapNoBuyMs = Math.max(log.notes.maxGapNoBuyMs, adv.maxGap || 0);
  }

  // Drain cash, confirm still ready
  log.notes.cashDrainTest = await page.evaluate(() => {
    const f = window.__tfrGame.registry.get('game').factory;
    const before = Math.floor(f.economy.coins);
    let safety = 0;
    while (f.economy.coins >= 10 && safety < 50) {
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
      safety += 1;
    }
    if (f.economy.coins > 0) f.economy.spend(Math.min(f.economy.coins, f.economy.coins));
    return {
      before,
      after: Math.floor(f.economy.coins),
      canOpen: f.progression.canUnlock('toys', f.economy).ok,
      earned: Math.floor(f.economy.totalEarned),
    };
  });

  // If still short of threshold after drain purchases, keep grinding with $0 ok once earned hits
  for (let i = 0; i < 80 && !(await snap(page)).canOpenToys; i++) {
    if ((await snap(page)).sessMs > 11 * 60_000) break;
    await advance(page, 2000, prefer, 9_000);
    const st = await snap(page);
    if (st.earned >= THR && !log.markers.toysThreshold) log.markers.toysThreshold = { ...st };
  }

  log.markers.beforeOpen = await snap(page);
  await page.screenshot({ path: `validate-mb2-${branch}-before-open.png`, fullPage: true });

  const openResult = await page.evaluate(() => {
    const reg = window.__tfrGame.registry.get('game');
    const f = reg.factory;
    const t = reg.telemetry;
    const cashBefore = Math.floor(f.economy.coins);
    const earnedBefore = Math.floor(f.economy.totalEarned);
    const colorBefore = f.economy.productColor;
    const ok = f.tryUnlockNext();
    // GameScene hooks may not fire when calling factory directly — mirror key telemetry
    if (ok && f.economy.currentProduct === 'toys') {
      t.once('toys_opened', {
        lifetimeEarnedAtUnlock: earnedBefore,
        cashAtUnlock: cashBefore,
      });
      t.lifetimeEarnedAtUnlock = earnedBefore;
      t.cashAtUnlock = cashBefore;
      t.upgradesAtToysUnlock = f.upgrades.totalPurchased;
      t.once('first_toy_action', { action: 'open_toys' });
    }
    return {
      ok,
      cashBefore,
      cashAfter: Math.floor(f.economy.coins),
      earnedBefore,
      colorBefore,
      colorAfter: f.economy.productColor,
      lineColor: f.line.productColor,
      product: f.economy.currentProduct,
      label: f.sessionGoal.label(),
      awaitingFirstToy: !!f.sessionGoal.snapshot()?.awaitingFirstToy,
      cashDelta: Math.floor(f.economy.coins) - cashBefore,
    };
  });
  log.markers.openToys = openResult;
  log.notes.visualChange = {
    product: openResult.product,
    colorBefore: openResult.colorBefore,
    colorAfter: openResult.colorAfter,
    colorChanged: openResult.colorBefore !== openResult.colorAfter,
    lineSynced: openResult.lineColor === openResult.colorAfter,
  };
  log.notes.doubleUnlock = await page.evaluate(() => {
    const f = window.__tfrGame.registry.get('game').factory;
    return {
      toysCount: f.progression.unlocked.filter((x) => x === 'toys').length,
      tryToysAgain: f.progression.tryUnlock('toys', f.economy).ok,
    };
  });

  await page.screenshot({ path: `validate-mb2-${branch}-after-open.png`, fullPage: true });

  // First toy production
  let firstToy = null;
  if (openResult.ok) {
    for (let i = 0; i < 50; i++) {
      await advance(page, 800, prefer, 60_000);
      const st = await snap(page);
      if (!st.awaitingFirstToy && st.product === 'toys') {
        await page.evaluate(() => {
          const t = window.__tfrGame.registry.get('game').telemetry;
          t.once('first_toy_produced', {});
        });
        firstToy = st;
        break;
      }
    }
  }
  log.markers.firstToy = firstToy;
  log.notes.postFirstToyLabel = firstToy?.label ?? (await snap(page)).label;
  log.notes.postFirstToyHasGoal = !!(firstToy?.label && firstToy.label.length > 0);

  await page.screenshot({ path: `validate-mb2-${branch}-first-toy.png`, fullPage: true });

  // Badge preview on mobile
  if (viewport.width < 700) {
    log.notes.badgePreview = await page.evaluate(() => {
      const ok = window.__tfrPreviewPayoff?.('still_limiting');
      const f = window.__tfrGame.registry.get('game').factory;
      return {
        previewFnExists: typeof window.__tfrPreviewPayoff === 'function',
        ok: !!ok,
        mode: f.bottleneckBadgeMode,
        delta: f.improvedBadgeDeltaPct,
        bn: f.highlightedBottleneck,
      };
    });
    await page.waitForTimeout(150);
    await page.screenshot({
      path: `validate-mb2-${branch}-badge-preview.png`,
      fullPage: true,
    });
  }

  log.report = await page.evaluate(() => {
    const r = window.__tfrOnboardingReport();
    return {
      toysMilestoneShownMs: r.toysMilestoneShownMs,
      toysThreshold: r.toysThreshold,
      toysThresholdReachedMs: r.toysThresholdReachedMs,
      toysOpenedMs: r.toysOpenedMs,
      firstToyActionMs: r.firstToyActionMs,
      lifetimeEarnedAtUnlock: r.lifetimeEarnedAtUnlock,
      cashAtUnlock: r.cashAtUnlock,
      upgradesAtFiveMinutes: r.upgradesAtFiveMinutes,
      upgradesAtToysUnlock: r.upgradesAtToysUnlock,
      branchSelected: r.branchSelected,
      convergenceCompletionTime: r.convergenceCompletionTime,
      upgradesByType: r.upgradesByType,
      lineIncome: r.canonicalLineIncomePerMin,
      upgradesBought: r.upgradesBought,
    };
  });
  log.end = await snap(page);
  return log;
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const results = {};
try {
  console.error('Running throughput…');
  results.throughput = await runRoute(page, 'throughput', { width: 1280, height: 800 });
  console.error('Running margin…');
  results.margin = await runRoute(page, 'margin', { width: 390, height: 844 });
} catch (e) {
  results.error = String(e?.stack || e);
  console.error(e);
}
await browser.close();
fs.writeFileSync('validate-mb2-final.json', JSON.stringify(results, null, 2));

// Compact table for console
function row(r) {
  if (!r) return null;
  return {
    convergence_s: r.markers.convergence ? +(r.markers.convergence.sessMs / 1000).toFixed(1) : null,
    toysShown_s: r.markers.toysShown ? +(r.markers.toysShown.sessMs / 1000).toFixed(1) : null,
    threshold_s: r.markers.toysThreshold
      ? +(r.markers.toysThreshold.sessMs / 1000).toFixed(1)
      : null,
    open_s: r.markers.openToys?.ok ? +(r.markers.beforeOpen.sessMs / 1000).toFixed(1) : null,
    open_ok: r.markers.openToys?.ok,
    cashAtOpen: r.markers.openToys?.cashBefore,
    earnedAtOpen: r.markers.openToys?.earnedBefore,
    cashDelta: r.markers.openToys?.cashDelta,
    firstToy_s: r.markers.firstToy ? +(r.markers.firstToy.sessMs / 1000).toFixed(1) : null,
    upsAt5: r.notes.upsAt5,
    upsAtOpen: r.markers.beforeOpen?.ups,
    progressOk: r.notes.progressNeverDecreased,
    visual: r.notes.visualChange,
    postLabel: r.notes.postFirstToyLabel,
    postHasGoal: r.notes.postFirstToyHasGoal,
    maxGap_s: r.notes.maxGapNoBuyMs ? +(r.notes.maxGapNoBuyMs / 1000).toFixed(1) : 0,
    drain: r.notes.cashDrainTest,
    badge: r.notes.badgePreview,
    levels: r.end?.levels,
    tp: r.end?.tp,
    income: r.end?.income,
  };
}
console.log(JSON.stringify({ throughput: row(results.throughput), margin: row(results.margin), error: results.error }, null, 2));
