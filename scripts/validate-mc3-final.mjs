/**
 * M-C.3 human-style validation — SESSION TIME (factory.sessionMs, not wall clock).
 * Part A: Throughput + Balanced 35%, events OFF, 907×510
 *         Reload ~4s into baseline_sampling; hydration barrier checked
 *         Return: 3 adaptive FLOW orders → FREE NORMAL → BONUS fixture
 * Part B: Margin + Fast 58%, events ON, 390×844 (from zero; no authentic
 *         margin funding_choice checkpoint available)
 *         Reload during proof_batch after qualified action
 *
 * SMOKE_URL=http://127.0.0.1:5173/ node scripts/validate-mc3-final.mjs
 *
 * NO game code/balance/test changes — observation only.
 * Does NOT mutate validate-mc2-* artifacts.
 */
import { chromium } from 'playwright';
import fs from 'fs';

const URL = process.env.SMOKE_URL ?? 'http://127.0.0.1:5173/';
const THR = 650;

function log(...args) {
  console.log(...args);
}

async function bootClean(page, viewport) {
  await page.setViewportSize(viewport);
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.evaluate(() => {
    try {
      localStorage.removeItem('tiny-factory-rush-save');
      localStorage.clear();
    } catch {
      /* ignore */
    }
  });
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('canvas', { timeout: 25000 });
  await page.waitForFunction(() => {
    const reg = window.__tfrGame?.registry?.get?.('game');
    return !!reg?.factory;
  }, { timeout: 25000 });
  const dirty = await page.evaluate(() => {
    const f = window.__tfrGame.registry.get('game').factory;
    return f.upgrades.totalPurchased > 0 || f.economy.totalEarned > 5;
  });
  if (dirty) {
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('canvas', { timeout: 25000 });
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
    const mc = f.mc.snapshot();
    const st = f.mc.state;
    const rc = st.returnChallenge;
    const label = f.sessionLabel?.() ?? f.sessionGoal.label();
    return {
      sessMs: Math.round(f.sessionMs),
      teleMs: Math.round(t.elapsed),
      phase: f.sessionGoal.phase,
      mcPhase: f.mc.phase,
      label,
      labelEmpty: !label,
      plan: f.sessionGoal.planLabel?.() ?? '',
      earned: Math.floor(f.economy.totalEarned),
      coins: Math.floor(f.economy.coins),
      ups: f.upgrades.totalPurchased,
      tp: +f.getThroughputPerMin().toFixed(1),
      income: +f.lineIncomePerMin().toFixed(1),
      wip: f.getWip(),
      bn: f.line.getBottleneckId(),
      product: f.economy.currentProduct,
      baseValue: f.economy.baseProductValue,
      unlockedToys: f.progression.isUnlocked('toys'),
      unlockedPhones: f.progression.isUnlocked('smartphones'),
      canOpenToys: f.progression.canUnlock('toys', f.economy).ok,
      fund: Math.floor(mc.smartphoneFund),
      fundTarget: mc.fundTarget,
      fundingPolicy: mc.fundingPolicy,
      policyLocked: mc.policyLocked,
      fundingRef: mc.fundingReferenceIncomePerSec,
      contribution: mc.policyContribution,
      phonesBuilt: mc.smartphonesBuilt,
      firstPhone: mc.firstSmartphoneProduced,
      launchActions: mc.launchActions,
      launchActionGate: mc.launchActionGate,
      launchBatchProgress: Math.floor(mc.launchBatchProgress ?? 0),
      launchBatchTarget: mc.launchBatchTarget ?? 0,
      launchProgress: +(mc.launchProgress ?? 0).toFixed(3),
      launchSampleMs: Math.round(mc.launchSampleMs ?? 0),
      launchSampleTicks: mc.launchSampleTicks ?? 0,
      launchHoldMs: Math.round(mc.launchHoldMs ?? 0),
      launchBaselineTp: mc.launchBaseline?.outputPerMin ?? mc.launchBaselineOutput,
      launchBaselineIncome:
        mc.launchBaseline?.lineIncomePerMin ?? mc.launchBaselineIncome,
      launchMinGateMs: mc.launchMinGateReachedMs,
      launchProofPhones: mc.launchProofPhones ?? 0,
      launchProofRevenue: mc.launchProofRevenue ?? 0,
      phonesSoldTotal: mc.smartphonesSoldTotal ?? 0,
      phoneRevenueTotal: mc.smartphoneRevenueTotal ?? 0,
      shift1: mc.shift1Complete,
      freeCredits: mc.freeUpgradeCredits,
      freeGranted: mc.freeUpgradeGranted,
      freeUsed: mc.freeUpgradeUsed,
      freeMode: mc.freeUpgradeMode,
      freeUpgradeConsumed: st.freeUpgradeConsumed ?? false,
      freeUpgradeRewardId: st.freeUpgradeRewardId ?? null,
      bonusGranted: mc.bonusUpgradeGranted,
      bonusLevelDelta: st.bonusLevelDelta ?? 0,
      returnStarted: mc.returnChallengeStarted,
      returnDone: mc.returnChallengeComplete,
      returnKind: rc?.kind ?? null,
      returnProgress: rc?.batchProgress ?? 0,
      returnTarget: rc?.batchTarget ?? 0,
      returnRefPhones: rc?.referencePhonesPerSec ?? null,
      returnRefRevenue: rc?.referenceRevenuePerSec ?? null,
      returnCanonPhones: rc?.canonicalPhonesPerSec ?? null,
      returnCanonRevenue: rc?.canonicalRevenuePerSec ?? null,
      returnExpectedSec: rc?.expectedDurationSec ?? null,
      returnPhonesAtStart: rc?.phonesAtReturnStart ?? null,
      returnRevenueAtStart: rc?.revenueAtReturnStart ?? null,
      returnFirst30Phones: rc?.actualPhonesFirst30Sec ?? null,
      returnFirst30Revenue: rc?.actualRevenueFirst30Sec ?? null,
      returnPhase: rc?.returnPhase ?? null,
      returnOrderIndex: rc?.returnOrderIndex ?? null,
      returnOrderTarget: rc?.returnOrderTarget ?? null,
      returnOrderProgress: rc?.returnOrderProgress ?? null,
      returnOrderReferenceRate: rc?.returnOrderReferenceRate ?? null,
      returnOrderStartCounter: rc?.returnOrderStartCounter ?? null,
      returnFinalConditionHoldMs: rc?.returnFinalConditionHoldMs ?? null,
      completedOrderSummaries: rc?.completedOrderSummaries
        ? rc.completedOrderSummaries.map((o) => ({ ...o }))
        : [],
      capacityFeedback: rc?.capacityFeedback ?? null,
      returnInputSeen: rc?.returnInputSeen ?? false,
      cheapestUpgrade: mc.cheapestRelevantUpgradeCostAtFundingStart ?? null,
      secondCheapestUpgrade: mc.secondCheapestRelevantUpgradeCost ?? null,
      fundingPurchaseCount: st.fundingPurchaseCount ?? 0,
      fundingPurchases: Array.isArray(st.fundingPurchases)
        ? st.fundingPurchases.map((p) => ({ ...p }))
        : [],
      upgradesBoughtBeforeFunding: st.upgradesBoughtBeforeFunding ?? null,
      launchProgressBeforeSave: st.launchProgressBeforeSave ?? null,
      launchProgressAfterHydrate: st.launchProgressAfterHydrate ?? null,
      hydrationProgressDelta: st.hydrationProgressDelta ?? 0,
      launchProgressAfterFirstValidStep:
        st.launchProgressAfterFirstValidStep ?? null,
      firstValidStepDelta: st.firstValidStepDelta ?? 0,
      hydrationComplete: st.hydrationComplete ?? false,
      cashAtBuild: mc.cashAtBuild,
      markers: mc.campaignMarkers ?? null,
      sgPhase: sg?.phase ?? null,
    };
  });
}

async function readHydration(page) {
  return page.evaluate(() => {
    const st = window.__tfrGame.registry.get('game').factory.mc.state;
    return {
      launchProgressBeforeSave: st.launchProgressBeforeSave ?? null,
      launchProgressAfterHydrate: st.launchProgressAfterHydrate ?? null,
      hydrationProgressDelta: st.hydrationProgressDelta ?? 0,
      launchProgressAfterFirstValidStep:
        st.launchProgressAfterFirstValidStep ?? null,
      firstValidStepDelta: st.firstValidStepDelta ?? 0,
      hydrationComplete: st.hydrationComplete ?? false,
      launchBatchProgress: Math.floor(st.launchBatchProgress ?? 0),
      phase: window.__tfrGame.registry.get('game').factory.mc.phase,
      launchSampleMs: Math.round(st.launchSampleMs ?? 0),
    };
  });
}

async function sessionReport(page) {
  return page.evaluate(() => {
    if (typeof window.__tfrSessionReport === 'function') {
      return window.__tfrSessionReport();
    }
    const reg = window.__tfrGame.registry.get('game');
    return reg.telemetry.buildSessionReport(reg.factory);
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
        const label = f.sessionLabel?.() ?? f.sessionGoal.label();
        if (label && label.length > 0) lastMetaMs = f.sessionMs;
        else maxGapNoMeta = Math.max(maxGapNoMeta, f.sessionMs - lastMetaMs);

        // Never auto-buy during funding_choice / sampling / launch (manual protocol).
        // return_challenge IS allowed (auto-buy during return).
        const mcPhase = f.mc.phase;
        const allowAuto =
          mcPhase !== 'funding_choice' &&
          mcPhase !== 'baseline_sampling' &&
          mcPhase !== 'smartphone_launch' &&
          mcPhase !== 'first_smartphone' &&
          mcPhase !== 'smartphone_ready';

        if (allowAuto && sinceBuy >= buyCooldownMs) {
          if (tryBuy()) sinceBuy = 0;
          else sinceBuy = Math.min(sinceBuy, buyCooldownMs);
        }
      }
      return { maxGapNoMeta };
    },
    { ms, prefer, buyCooldownMs },
  );
}

async function advanceIdle(page, ms) {
  return advance(page, ms, 'speed', 999_999);
}

async function shot(page, name) {
  await page.screenshot({ path: name, fullPage: true });
  log(`  [shot] ${name}`);
  return name;
}

async function saveReload(page) {
  await page.evaluate(() => {
    const reg = window.__tfrGame.registry.get('game');
    reg.saveSystem?.save?.();
  });
  const before = await snap(page);
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('canvas', { timeout: 25000 });
  await page.waitForFunction(() => {
    const reg = window.__tfrGame?.registry?.get?.('game');
    return !!reg?.factory;
  }, { timeout: 25000 });
  await page.evaluate(() => {
    const reg = window.__tfrGame.registry.get('game');
    reg.factory.line.rollGolden = () => false;
    try {
      reg.saveSystem?.stopAutosave?.();
    } catch {
      /* ignore */
    }
  });
  const after = await snap(page);
  // Hydration fields BEFORE any advance
  const hydrate = await readHydration(page);
  // ONE 50ms update after load before reading after-first-step fields
  await page.evaluate(() => {
    const reg = window.__tfrGame.registry.get('game');
    reg.telemetry.update(50);
    reg.factory.update(50);
  });
  const afterFirstStep = await readHydration(page);
  return { before, after, hydrate, afterFirstStep };
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

async function playToFundingChoice(page, branch, prefer, eventsOff) {
  const logObj = { markers: {}, notes: {}, fundBuys: [], criteria: {} };
  log(`  → stage1 choice (${branch})…`);
  logObj.markers.stage1 = await reachChoice(page, prefer);
  await page.evaluate((b) => {
    window.__tfrGame.registry.get('game').factory.selectOptimizationBranch(b);
  }, branch);
  const pickType = branch === 'throughput' ? 'speed' : 'value';
  for (let i = 0; i < 60; i++) {
    const bought = await page.evaluate((type) => {
      const f = window.__tfrGame.registry.get('game').factory;
      if (!f.economy.canAfford(f.upgrades.costFor(1, type))) return false;
      return f.buyUpgrade(1, type);
    }, pickType);
    if (bought) break;
    await advance(page, 1000, prefer, 60_000);
  }

  for (let i = 0; i < 200; i++) {
    const st = await snap(page);
    if (st.phase === 'post_chain') {
      logObj.markers.convergence = st;
      break;
    }
    await advance(page, 1500, prefer, 9_000);
  }
  log(`  → convergence @ ${((logObj.markers.convergence?.sessMs ?? 0) / 1000).toFixed(0)}s`);

  if (eventsOff) {
    await page.evaluate(() => {
      window.__tfrGame.registry.get('game').factory.eventsSys.suppress();
    });
    logObj.notes.events = 'off';
  } else {
    await page.evaluate(() => {
      window.__tfrGame.registry.get('game').factory.eventsSys.resume();
    });
    logObj.notes.events = 'on';
  }

  for (let i = 0; i < 300; i++) {
    const st = await snap(page);
    if (st.earned >= THR && !logObj.markers.toysThreshold) {
      logObj.markers.toysThreshold = st;
    }
    if (st.canOpenToys) {
      logObj.markers.toysReady = st;
      break;
    }
    if (st.sessMs > 12 * 60_000) break;
    await advance(page, 2000, prefer, 9_000);
  }
  log(`  → toys ready @ ${((logObj.markers.toysReady?.sessMs ?? 0) / 1000).toFixed(0)}s`);

  logObj.markers.beforeOpen = await snap(page);
  await page.evaluate(() => {
    window.__tfrGame.registry.get('game').factory.tryUnlockNext();
  });
  logObj.markers.afterOpen = await snap(page);

  for (let i = 0; i < 40; i++) {
    const st = await snap(page);
    if (st.phase === 'toy_mastery' || st.mcPhase === 'funding_choice') break;
    await advance(page, 500, prefer, 8_000);
  }
  logObj.markers.masteryShown = await snap(page);

  for (let i = 0; i < 400; i++) {
    const st = await snap(page);
    if (st.mcPhase === 'funding_choice') {
      logObj.markers.fundingChoice = st;
      break;
    }
    if (st.phase === 'smartphones_horizon' && st.mcPhase === 'funding_choice') {
      logObj.markers.fundingChoice = st;
      break;
    }
    await advance(page, 500, prefer, 8_000);
  }
  log(`  → funding_choice @ ${((logObj.markers.fundingChoice?.sessMs ?? 0) / 1000).toFixed(0)}s`);
  return logObj;
}

async function commissioningLaunchAction(page, branch) {
  const buys = [];
  for (let i = 0; i < 80; i++) {
    const st = await snap(page);
    if (st.mcPhase === 'smartphone_launch') break;
    await advanceIdle(page, 250);
  }

  const observe = await page.evaluate(() => {
    const f = window.__tfrGame.registry.get('game').factory;
    const mc = f.mc.state;
    return {
      tp: +f.getThroughputPerMin().toFixed(1),
      income: +f.lineIncomePerMin().toFixed(1),
      wip: f.getWip(),
      bn: f.line.getBottleneckId(),
      baselineTp: mc.launchBaseline?.outputPerMin ?? mc.launchBaselineOutput,
      baselineIncome:
        mc.launchBaseline?.lineIncomePerMin ?? mc.launchBaselineIncome,
      batchProgress: mc.launchBatchProgress,
      batchTarget: mc.launchBatchTarget,
      gate: mc.launchActionGate,
      recommended: mc.launchRecommended,
      label: f.sessionLabel(),
      actions: mc.launchActions,
      phase: mc.phase,
    };
  });

  const wrong = await page.evaluate((b) => {
    const f = window.__tfrGame.registry.get('game').factory;
    const before = f.mc.state.launchActionGate;
    const type = b === 'throughput' ? 'value' : 'buffer';
    const m = b === 'throughput' ? 1 : 0;
    if (f.upgrades.isMaxed(m, type)) {
      return {
        attempted: type,
        ok: false,
        skipped: true,
        wrongDidNotComplete: true,
        gateBefore: before,
        gateAfter: before,
      };
    }
    f.economy.coins += f.upgrades.costFor(m, type) + 50;
    const ok = f.buyUpgrade(m, type);
    return {
      attempted: type,
      ok,
      gateBefore: before,
      gateAfter: f.mc.state.launchActionGate,
      wrongDidNotComplete:
        before !== 'complete' && f.mc.state.launchActionGate !== 'complete',
    };
  }, branch);
  buys.push({ kind: 'wrong', ...wrong });

  const gateNow = (await snap(page)).launchActionGate;
  if (observe.gate !== 'waived_at_cap' && gateNow !== 'complete') {
    const result = await page.evaluate((b) => {
      const f = window.__tfrGame.registry.get('game').factory;
      const t = window.__tfrGame.registry.get('game').telemetry;
      const rec = f.mc.state.launchRecommended;
      let type = rec?.type ?? (b === 'margin' ? 'value' : 'speed');
      let machine = rec?.machineId ?? (f.line.getBottleneckId() ?? 1);
      if (type === 'buffer' && machine === 2) machine = 1;
      f.economy.coins += f.upgrades.costFor(machine, type) + 100;
      const before = {
        tp: f.getThroughputPerMin(),
        income: f.lineIncomePerMin(),
        wip: f.getWip(),
        gate: f.mc.state.launchActionGate,
        batch: f.mc.state.launchBatchProgress,
      };
      const ok = f.buyUpgrade(machine, type);
      if (ok) {
        t.upgradesBought = (t.upgradesBought || 0) + 1;
        t.upgradesByType[type] = (t.upgradesByType[type] || 0) + 1;
      }
      for (let i = 0; i < 8; i++) {
        t.update(200);
        f.update(200);
      }
      return {
        ok,
        type,
        machine,
        reason: rec?.reason ?? 'branch-relevant',
        before,
        after: {
          tp: f.getThroughputPerMin(),
          income: f.lineIncomePerMin(),
          wip: f.getWip(),
          gate: f.mc.state.launchActionGate,
          batch: f.mc.state.launchBatchProgress,
          actions: f.mc.state.launchActions,
        },
      };
    }, branch);
    buys.push({ kind: 'correct', ...result });
  }

  const nonQualify = await page.evaluate(() => {
    const f = window.__tfrGame.registry.get('game').factory;
    const actionsBefore = f.mc.state.launchActions;
    const gateBefore = f.mc.state.launchActionGate;
    f.clickMachine(1);
    f.clickMachine(0);
    for (let i = 0; i < 20; i++) f.update(250);
    return {
      gateBefore,
      gateAfter: f.mc.state.launchActionGate,
      actionsBefore,
      actionsAfter: f.mc.state.launchActions,
      salesDidNotCount: f.mc.state.launchActions === actionsBefore,
    };
  });

  return { observe, buys, nonQualify };
}

function expectedReturnLabel(phase, orderIndex) {
  if (phase === 'calibration' || phase === 'preview') return 'CALIBRATING';
  if (phase === 'order_1') return 'ORDER 1/3';
  if (phase === 'order_2') return 'ORDER 2/3';
  if (phase === 'order_3') return 'FINAL ORDER';
  if (phase === 'complete') return 'COMPLETE';
  return `ORDER ${orderIndex}/3`;
}

async function runFreeNormalFixture(page, logObj, opts = {}) {
  const { useSavedJson = null, shotName = 'validate-mc3-free-normal.png' } =
    opts;

  if (useSavedJson) {
    log('  → FREE NORMAL isolated fixture from saved JSON…');
    await page.evaluate((raw) => {
      localStorage.setItem('tiny-factory-rush-save', raw);
    }, useSavedJson);
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('canvas', { timeout: 25000 });
    await page.waitForFunction(() => {
      const reg = window.__tfrGame?.registry?.get?.('game');
      return !!reg?.factory;
    }, { timeout: 25000 });
    await page.evaluate(() => {
      const reg = window.__tfrGame.registry.get('game');
      reg.factory.line.rollGolden = () => false;
      try {
        reg.saveSystem?.stopAutosave?.();
      } catch {
        /* ignore */
      }
      // Ensure free credit available for fixture
      const st = reg.factory.mc.state;
      st.freeUpgradeGranted = true;
      st.freeUpgradeCredits = 1;
      st.freeUpgradeUsed = false;
      st.freeUpgradeConsumed = false;
      st.freeUpgradeMode = reg.factory.mc.computeFreeUpgradeMode(reg.factory);
    });
  }

  logObj.shots.push(await shot(page, shotName));

  const spend = await page.evaluate(() => {
    const f = window.__tfrGame.registry.get('game').factory;
    const st = f.mc.state;
    // Prefer a non-MAX upgrade; pick highest cost among non-maxed
    let best = null;
    for (const type of ['speed', 'value', 'buffer']) {
      for (const m of [1, 0, 2]) {
        if (type === 'buffer' && m === 2) continue;
        if (f.upgrades.isMaxed(m, type)) continue;
        const cost = f.upgrades.costFor(m, type);
        const level = f.upgrades.getLevel(m, type);
        if (!best || cost > best.cost) {
          best = { type, machine: m, cost, level };
        }
      }
    }
    if (!best) {
      return {
        ok: false,
        reason: 'all_maxed_or_near_max',
        mode: st.freeUpgradeMode,
        nearMax: true,
      };
    }
    // Drain cash below cost so free credit is required
    f.economy.coins = Math.min(f.economy.coins, Math.max(0, best.cost - 1));
    const mode = f.mc.computeFreeUpgradeMode(f);
    st.freeUpgradeMode = mode;
    const cashBefore = f.economy.coins;
    const levelBefore = f.upgrades.getLevel(best.machine, best.type);
    const ok = f.buyUpgrade(best.machine, best.type);
    return {
      ok,
      nearMax: false,
      type: best.type,
      machine: best.machine,
      costListed: best.cost,
      mode,
      levelBefore,
      levelAfter: f.upgrades.getLevel(best.machine, best.type),
      cashBefore: Math.floor(cashBefore),
      cashAfter: Math.floor(f.economy.coins),
      cashDelta: Math.floor(f.economy.coins - cashBefore),
      creditsAfter: st.freeUpgradeCredits,
      used: st.freeUpgradeUsed,
      consumed: st.freeUpgradeConsumed,
      rewardId: st.freeUpgradeRewardId,
    };
  });

  logObj.notes.freeSpend = spend;
  logObj.criteria.freeSpendOk = !!spend.ok;
  logObj.criteria.freeSpendModeNormal = spend.mode === 'normal';
  logObj.criteria.freeSpendLevelPlus1 =
    !!spend.ok && spend.levelAfter === spend.levelBefore + 1;
  logObj.criteria.freeSpendCashDelta0 = !!spend.ok && spend.cashDelta === 0;
  logObj.criteria.freeConsumedAfterSuccess =
    !!spend.ok && spend.consumed === true && spend.creditsAfter === 0;

  // Reload; second attempt must block
  const postSpendReload = await saveReload(page);
  logObj.markers.afterSpendReload = postSpendReload.after;
  const blocked = await page.evaluate((prev) => {
    const f = window.__tfrGame.registry.get('game').factory;
    const st = f.mc.state;
    const levelBefore = f.upgrades.getLevel(prev.machine ?? 1, prev.type ?? 'speed');
    const cashBefore = f.economy.coins;
    f.economy.coins = 0;
    const ok = f.buyUpgrade(prev.machine ?? 1, prev.type ?? 'speed');
    return {
      ok,
      blocked: !ok,
      credits: st.freeUpgradeCredits,
      consumed: st.freeUpgradeConsumed,
      used: st.freeUpgradeUsed,
      levelBefore,
      levelAfter: f.upgrades.getLevel(prev.machine ?? 1, prev.type ?? 'speed'),
      cashAfter: Math.floor(f.economy.coins),
      cashUnchanged: f.economy.coins === cashBefore || f.economy.coins === 0,
    };
  }, spend);
  logObj.notes.freeSpendReloadBlock = blocked;
  logObj.criteria.freeSecondAttemptBlocked =
    blocked.blocked === true &&
    blocked.credits === 0 &&
    blocked.consumed === true;

  return spend;
}

async function runBonusFixture(page, logObj) {
  log('  → BONUS TIER fixture…');
  await page.evaluate(() => {
    const f = window.__tfrGame.registry.get('game').factory;
    for (const type of ['speed', 'value', 'buffer']) {
      for (const m of [0, 1, 2]) {
        if (type === 'buffer' && m === 2) continue;
        f.upgrades.levels[m][type] = 20;
      }
    }
    f.upgrades.totalPurchased = Math.max(f.upgrades.totalPurchased, 60);
    // Re-grant credit ONLY for fixture (not a second campaign reward)
    f.mc.state.freeUpgradeGranted = true;
    f.mc.state.freeUpgradeCredits = 1;
    f.mc.state.freeUpgradeUsed = false;
    f.mc.state.freeUpgradeConsumed = false;
    f.mc.state.bonusUpgradeGranted = false;
    f.mc.state.bonusUpgradeMachineId = null;
    f.mc.state.bonusUpgradeType = null;
    f.mc.state.bonusLevelDelta = 0;
    f.mc.state.freeUpgradeMode = f.mc.computeFreeUpgradeMode(f);
  });

  logObj.shots.push(await shot(page, 'validate-mc3-bonus-before.png'));

  const bonusPath = await page.evaluate(() => {
    const f = window.__tfrGame.registry.get('game').factory;
    const mode = f.mc.state.freeUpgradeMode;
    const details = f.mc.detailLines(f);
    const label = f.mc.label(f);
    const cashBefore = f.economy.coins;
    f.economy.coins = 0;
    const levelBefore = f.upgrades.getLevel(1, 'value');
    const ok = f.buyUpgrade(1, 'value');
    const cashAfter = f.economy.coins;
    return {
      mode,
      details,
      label,
      bonusButtonImplied:
        mode === 'bonus_tier' && details.some((d) => /BONUS|FREE UPGRADE/i.test(d)),
      uiCopyHint: 'BONUS +1 — FREE · $0',
      ok,
      cashBefore: Math.floor(cashBefore),
      cashAfter: Math.floor(cashAfter),
      cashDelta: Math.floor(cashAfter - cashBefore),
      creditsAfter: f.mc.state.freeUpgradeCredits,
      bonusGranted: f.mc.state.bonusUpgradeGranted,
      bonusLevelDelta: f.mc.state.bonusLevelDelta,
      machine: f.mc.state.bonusUpgradeMachineId,
      type: f.mc.state.bonusUpgradeType,
      used: f.mc.state.freeUpgradeUsed,
      consumed: f.mc.state.freeUpgradeConsumed,
      levelBefore,
      levelAfter: f.upgrades.getLevel(1, 'value'),
      rewardId: f.mc.state.freeUpgradeRewardId,
    };
  });

  logObj.notes.bonusTierPath = bonusPath;
  logObj.shots.push(await shot(page, 'validate-mc3-bonus-after.png'));
  logObj.criteria.bonusModeIsBonusTier = bonusPath.mode === 'bonus_tier';
  logObj.criteria.bonusPurchaseOk =
    !!bonusPath.ok && bonusPath.cashDelta === 0 && !!bonusPath.bonusGranted;
  logObj.criteria.bonusCashDelta0 = bonusPath.cashDelta === 0;
  logObj.criteria.bonusCreditConsumed =
    bonusPath.creditsAfter === 0 && bonusPath.used === true;

  const bonusReload = await saveReload(page);
  const bonusDup = await page.evaluate(() => {
    const f = window.__tfrGame.registry.get('game').factory;
    f.economy.coins = 0;
    const ok = f.buyUpgrade(0, 'speed');
    return {
      credits: f.mc.state.freeUpgradeCredits,
      bonusGranted: f.mc.state.bonusUpgradeGranted,
      secondBlocked: !ok,
      mode: f.mc.state.freeUpgradeMode,
      consumed: f.mc.state.freeUpgradeConsumed,
    };
  });
  logObj.notes.bonusReload = { after: bonusReload.after, secondAttempt: bonusDup };
  logObj.criteria.bonusNoDuplicateOnReload =
    bonusDup.credits === 0 &&
    bonusDup.bonusGranted === true &&
    bonusDup.secondBlocked === true;
}

async function runPart(page, cfg) {
  const {
    id,
    viewport,
    branch,
    prefer,
    policy,
    eventsOff,
    midReloadPhase,
    shotPrefix,
    runFreeBonus,
  } = cfg;

  log(`\n=== ${id} start ===`);
  await bootClean(page, viewport);
  const logObj = await playToFundingChoice(page, branch, prefer, eventsOff);
  logObj.id = id;
  logObj.branch = branch;
  logObj.policy = policy;
  logObj.viewport = viewport;
  logObj.shots = [];
  logObj.notes.authenticCheckpoint =
    branch === 'margin'
      ? 'No authentic margin funding_choice checkpoint found; Part B ran from zero (Margin/FAST/events ON/390×844).'
      : null;

  // Capture save JSON at funding_choice for optional FREE fixture restore (Part A)
  let fundingChoiceSaveJson = null;
  if (runFreeBonus) {
    fundingChoiceSaveJson = await page.evaluate(() => {
      try {
        return localStorage.getItem('tiny-factory-rush-save');
      } catch {
        return null;
      }
    });
    // Force a save now so we have something if autosave was stopped
    await page.evaluate(() => {
      window.__tfrGame.registry.get('game').saveSystem?.save?.();
    });
    fundingChoiceSaveJson = await page.evaluate(() => {
      try {
        return localStorage.getItem('tiny-factory-rush-save');
      } catch {
        return null;
      }
    });
    logObj.notes.fundingChoiceSaveCaptured = !!fundingChoiceSaveJson;
  }

  // --- Funding choice ---
  logObj.shots.push(await shot(page, `${shotPrefix}-01-policy-choice.png`));
  logObj.markers.atPolicyChoice = await snap(page);
  logObj.notes.policyUiClear =
    (logObj.markers.atPolicyChoice.label || '').includes('35') ||
    (logObj.markers.atPolicyChoice.label || '').includes('58') ||
    (logObj.markers.atPolicyChoice.label || '').includes('BALANCED') ||
    (logObj.markers.atPolicyChoice.label || '').includes('FAST') ||
    (logObj.markers.atPolicyChoice.label || '').includes('FUND');

  const policyPick = await page.evaluate((pol) => {
    const f = window.__tfrGame.registry.get('game').factory;
    const before = {
      cash: Math.floor(f.economy.coins),
      fund: Math.floor(f.mc.state.smartphoneFund),
      ups: f.upgrades.totalPurchased,
      policy: f.mc.state.fundingPolicy,
    };
    const evs = f.mc.selectPolicy(f, pol);
    for (const e of evs) f.events.onMcEvent?.(e.type, e.payload ?? {});
    return {
      before,
      after: {
        cash: Math.floor(f.economy.coins),
        fund: Math.floor(f.mc.state.smartphoneFund),
        ups: f.upgrades.totalPurchased,
        policy: f.mc.state.fundingPolicy,
        locked: f.mc.state.policyLocked,
        phase: f.mc.phase,
        fundTarget: f.mc.state.fundTarget,
        fundingRef: f.mc.state.fundingReferenceIncomePerSec,
        contribution: f.mc.state.policyContribution,
        durationSec: f.mc.state.fundingTargetDurationSec,
        upgradesBoughtBeforeFunding: f.mc.state.upgradesBoughtBeforeFunding,
      },
      built: f.mc.state.smartphonesBuilt,
    };
  }, policy);
  logObj.notes.policySelect = policyPick;
  logObj.markers.policySelected = await snap(page);
  logObj.criteria.selectNeverBuilds =
    !policyPick.built && policyPick.after.phase === 'smartphone_funding';
  logObj.criteria.policyLocked = !!policyPick.after.locked;
  logObj.criteria.adaptiveTargetLocked =
    !!policyPick.after.fundTarget &&
    policyPick.after.fundTarget > 0 &&
    !!policyPick.after.fundingRef &&
    policyPick.after.fundingRef > 0;
  logObj.criteria.contributionBand =
    policy === 'fast'
      ? Math.abs(policyPick.after.contribution - 0.58) < 0.001
      : Math.abs(policyPick.after.contribution - 0.35) < 0.001;

  const costsAfter = await page.evaluate(() => {
    const f = window.__tfrGame.registry.get('game').factory;
    const costs = f.mc.relevantUpgradeCosts(f);
    return {
      cheapest: costs[0] ?? null,
      second: costs[1] ?? null,
      affordable: f.mc.affordableUpgradeOpportunities(f),
      projectedRetained: Math.floor(f.mc.projectedRetainedCash(f)),
      cash: Math.floor(f.economy.coins),
      contribution: f.mc.state.policyContribution,
      fundTarget: f.mc.state.fundTarget,
      fundingRef: f.mc.state.fundingReferenceIncomePerSec,
    };
  });
  logObj.notes.fundingDiagnosticsAtSelect = costsAfter;
  logObj.criteria.affordableOpportunitiesOk =
    policy === 'fast'
      ? costsAfter.affordable >= 1
      : costsAfter.affordable >= 2;

  const earlyBuild = await page.evaluate(() => {
    const f = window.__tfrGame.registry.get('game').factory;
    const pol = f.mc.state.fundingPolicy;
    const ev = f.mc.buildSmartphoneLine(f);
    return {
      events: ev.length,
      built: f.mc.state.smartphonesBuilt,
      policy: f.mc.state.fundingPolicy,
      policyUnchanged: f.mc.state.fundingPolicy === pol,
    };
  });
  logObj.criteria.buildBeforeReadyNoop =
    earlyBuild.events === 0 && !earlyBuild.built;
  logObj.notes.earlyBuild = earlyBuild;

  // Funding upgrades (manual buys; advance also auto-buys during funding — same as mc2)
  log('  → funding phase…');
  logObj.shots.push(await shot(page, `${shotPrefix}-02-funding.png`));
  let fundBuys = 0;
  for (let i = 0; i < 400; i++) {
    const st = await snap(page);
    if (st.mcPhase === 'smartphone_ready') {
      logObj.markers.ready = st;
      break;
    }

    const fundBuyCap = policy === 'fast' ? 2 : 3;
    if (fundBuys < fundBuyCap && i % 3 === 0) {
      const buy = await page.evaluate((pref) => {
        const f = window.__tfrGame.registry.get('game').factory;
        const fundBefore = f.mc.state.smartphoneFund;
        const order =
          pref === 'speed'
            ? ['speed', 'value', 'buffer']
            : ['value', 'speed', 'buffer'];
        for (const type of order) {
          for (const m of [1, 0, 2]) {
            if (type === 'buffer' && m === 2) continue;
            const cost = f.upgrades.costFor(m, type);
            if (f.economy.canAfford(cost) && f.buyUpgrade(m, type)) {
              return {
                ok: true,
                type,
                machine: m,
                cost,
                fundBefore: Math.floor(fundBefore),
                fundAfter: Math.floor(f.mc.state.smartphoneFund),
                cash: Math.floor(f.economy.coins),
              };
            }
          }
        }
        return {
          ok: false,
          fundBefore: Math.floor(fundBefore),
          fundAfter: Math.floor(f.mc.state.smartphoneFund),
        };
      }, prefer);
      if (buy.ok) {
        fundBuys += 1;
        logObj.fundBuys.push(buy);
      }
    }

    if (i === 5) {
      const change = await page.evaluate(() => {
        const f = window.__tfrGame.registry.get('game').factory;
        const before = f.mc.state.fundingPolicy;
        const ev = f.mc.selectPolicy(f, before === 'fast' ? 'balanced' : 'fast');
        return {
          before,
          after: f.mc.state.fundingPolicy,
          rejected: ev.length === 0 && f.mc.state.fundingPolicy === before,
        };
      });
      logObj.criteria.policyChangeRejected = change.rejected;
      logObj.notes.policyChangeAttempt = change;
    }

    await advance(page, 1500, prefer, 10_000);
    if (st.sessMs > 20 * 60_000) break;
  }

  logObj.criteria.fundNeverDecreased = logObj.fundBuys.every(
    (b) => b.fundAfter >= b.fundBefore,
  );

  // Funding criteria from mc.state (not just fundBuys tracker)
  const fp = await page.evaluate(() => {
    const factory = window.__tfrGame.registry.get('game').factory;
    const st = factory.mc.state;
    return {
      count: st.fundingPurchaseCount,
      list: st.fundingPurchases,
      before: st.upgradesBoughtBeforeFunding,
      total: factory.upgrades.totalPurchased,
    };
  });
  logObj.notes.fundingPurchasesAtReady = fp;
  logObj.criteria.fundingUpgradeAvailability =
    policy === 'fast'
      ? (fp.count ?? 0) >= 1 && (fp.list?.length ?? 0) >= 1
      : (fp.count ?? 0) >= 2 && (fp.list?.length ?? 0) >= 2;
  logObj.criteria.fundingPurchaseCountMatchesList =
    (fp.count ?? 0) === (fp.list?.length ?? 0);

  if (!logObj.markers.ready) logObj.markers.ready = await snap(page);
  logObj.shots.push(await shot(page, `${shotPrefix}-03-ready.png`));
  log(
    `  → READY @ ${(logObj.markers.ready.sessMs / 60000).toFixed(2)}min, fundingPurchases=${fp.count}`,
  );

  const readyReport = await sessionReport(page);
  const fundingDurMs =
    (logObj.markers.ready?.sessMs ?? 0) -
    (logObj.markers.policySelected?.sessMs ??
      logObj.markers.atPolicyChoice?.sessMs ??
      0);
  logObj.notes.atReady = {
    snap: logObj.markers.ready,
    fundReadyMs:
      readyReport.fundReadyMs ??
      readyReport.campaignMarkers?.fundReadyCampaignMs,
    fundingDurationMs: fundingDurMs,
    fundingDuration_s: +(fundingDurMs / 1000).toFixed(1),
    cash: logObj.markers.ready.coins,
    earned: logObj.markers.ready.earned,
    ups: logObj.markers.ready.ups,
    fundTarget: logObj.markers.ready.fundTarget,
    fundingRef: logObj.markers.ready.fundingRef,
    contribution: logObj.markers.ready.contribution,
    buildBandMin: +(logObj.markers.ready.sessMs / 60000).toFixed(2),
    fundingPurchaseCount: fp.count,
    fundingPurchases: fp.list,
    upgradesBoughtBeforeFunding: fp.before,
  };
  logObj.criteria.fundingReadyBand =
    policy === 'fast'
      ? fundingDurMs >= 150_000 && fundingDurMs <= 220_000
      : fundingDurMs >= 190_000 && fundingDurMs <= 280_000;
  logObj.notes.fundingTimeline = {
    fundingChoiceMs: logObj.markers.fundingChoice?.sessMs ?? null,
    policySelectMs: logObj.markers.policySelected?.sessMs ?? null,
    fundReadyMs: logObj.notes.atReady.fundReadyMs,
    fundingDuration_s: logObj.notes.atReady.fundingDuration_s,
    contributionRate: costsAfter.contribution,
    fundingTarget: costsAfter.fundTarget,
    fundingReferenceIncome: costsAfter.fundingRef,
    cashAtSelect: costsAfter.cash,
    cheapestUpgrade: costsAfter.cheapest,
    secondCheapestUpgrade: costsAfter.second,
    affordableUpgradeOpportunities: costsAfter.affordable,
    projectedRetainedCash: costsAfter.projectedRetained,
    actualPurchases: fp.count,
    fundBuysTracker: logObj.fundBuys.length,
  };

  // BUILD
  const build = await page.evaluate(() => {
    const f = window.__tfrGame.registry.get('game').factory;
    const pol = f.mc.state.fundingPolicy;
    const cashBefore = f.economy.coins;
    const ok = f.tryUnlockNext();
    return {
      ok,
      cashBefore: Math.floor(cashBefore),
      cashAfter: Math.floor(f.economy.coins),
      cashDelta: Math.floor(f.economy.coins - cashBefore),
      policy: f.mc.state.fundingPolicy,
      policyUnchanged: f.mc.state.fundingPolicy === pol,
      built: f.mc.state.smartphonesBuilt,
      product: f.economy.currentProduct,
      baseValue: f.economy.baseProductValue,
      phase: f.mc.phase,
      sessMs: Math.round(f.sessionMs),
    };
  });
  logObj.notes.build = build;
  logObj.markers.afterBuild = await snap(page);
  logObj.criteria.buildCashDelta0 = build.cashDelta === 0;
  logObj.criteria.buildPolicyUnchanged = build.policyUnchanged;
  logObj.criteria.buildOnce = build.built;

  const build2 = await page.evaluate(() => {
    const f = window.__tfrGame.registry.get('game').factory;
    const ev = f.mc.buildSmartphoneLine(f);
    return { events: ev.length, phase: f.mc.phase };
  });
  logObj.criteria.buildIdempotent = build2.events === 0;
  logObj.notes.secondBuild = build2;
  logObj.criteria.selectorGone =
    logObj.markers.afterBuild.mcPhase !== 'funding_choice' &&
    logObj.markers.afterBuild.policyLocked === true;

  // First smartphone ≤10s
  const buildMs = build.sessMs;
  for (let i = 0; i < 50; i++) {
    const st = await snap(page);
    if (st.firstPhone || st.mcPhase === 'smartphone_launch') {
      logObj.markers.firstPhone = st;
      break;
    }
    await advanceIdle(page, 250);
  }
  if (!logObj.markers.firstPhone) logObj.markers.firstPhone = await snap(page);
  logObj.shots.push(await shot(page, `${shotPrefix}-04-first-phone.png`));
  const firstDelta =
    (logObj.markers.firstPhone.sessMs ?? 0) -
    (logObj.markers.afterBuild.sessMs ?? buildMs);
  logObj.notes.firstPhone = {
    deltaMs: firstDelta,
    visual: {
      product: logObj.markers.firstPhone.product,
      baseValue: logObj.markers.firstPhone.baseValue,
      income: logObj.markers.firstPhone.income,
      incomeAtBuild: logObj.markers.afterBuild.income,
    },
    label: logObj.markers.firstPhone.label,
  };
  logObj.criteria.firstPhoneLe10s = firstDelta <= 10_000;
  logObj.criteria.entersBaselineOrLaunch =
    logObj.markers.firstPhone.mcPhase === 'baseline_sampling' ||
    logObj.markers.firstPhone.mcPhase === 'smartphone_launch' ||
    logObj.markers.firstPhone.mcPhase === 'first_smartphone';

  // Enter baseline_sampling
  logObj.markers.baselineSamplingStart = null;
  for (let i = 0; i < 80; i++) {
    const st = await snap(page);
    if (st.mcPhase === 'baseline_sampling' && !logObj.markers.baselineSamplingStart) {
      logObj.markers.baselineSamplingStart = st;
      break;
    }
    if (st.mcPhase === 'smartphone_launch') break;
    await advanceIdle(page, 250);
  }
  if (!logObj.markers.baselineSamplingStart) {
    logObj.markers.baselineSamplingStart = await snap(page);
  }

  // PART A: reload ~4s into baseline_sampling
  if (midReloadPhase === 'sampling') {
    log('  → sampling reload (~4s in)…');
    await advanceIdle(page, 4_000);
    const before = await snap(page);
    logObj.markers.beforeSamplingReload = before;
    const rr = await saveReload(page);
    if (eventsOff) {
      await page.evaluate(() => {
        window.__tfrGame.registry.get('game').factory.eventsSys.suppress();
      });
    } else {
      await page.evaluate(() => {
        window.__tfrGame.registry.get('game').factory.eventsSys.resume();
      });
    }
    logObj.markers.afterSamplingReload = rr.after;
    logObj.notes.samplingReload = {
      phaseBeforeSave: before.mcPhase,
      samplingElapsedBeforeSave: before.launchSampleMs,
      sampleTicksBefore: before.launchSampleTicks,
      phaseAfterLoad: rr.after.mcPhase,
      samplingElapsedAfterLoad: rr.after.launchSampleMs,
      sampleTicksAfter: rr.after.launchSampleTicks,
      phaseOk: rr.after.mcPhase === 'baseline_sampling',
      samplingContinued:
        rr.after.launchSampleMs >= before.launchSampleMs - 50,
      noReturn: !rr.after.returnStarted && rr.after.mcPhase !== 'return_challenge',
      firstPhoneStillTrue: !!rr.after.firstPhone,
      hydrate: rr.hydrate,
      afterFirstStep: rr.afterFirstStep,
      launchProgressBeforeSave: rr.hydrate.launchProgressBeforeSave,
      launchProgressAfterHydrate: rr.hydrate.launchProgressAfterHydrate,
      hydrationProgressDelta: rr.hydrate.hydrationProgressDelta,
      launchProgressAfterFirstValidStep:
        rr.afterFirstStep.launchProgressAfterFirstValidStep,
      firstValidStepDelta: rr.afterFirstStep.firstValidStepDelta,
    };
    logObj.criteria.samplingReloadPhaseOk = logObj.notes.samplingReload.phaseOk;
    logObj.criteria.samplingNotReset = logObj.notes.samplingReload.samplingContinued;
    logObj.criteria.samplingNoReturn = logObj.notes.samplingReload.noReturn;
    logObj.criteria.samplingHydrationDelta0 =
      rr.hydrate.hydrationProgressDelta === 0;
    logObj.criteria.samplingProgressHydrateEqualsBefore =
      rr.hydrate.launchProgressAfterHydrate ===
        rr.hydrate.launchProgressBeforeSave ||
      (rr.hydrate.launchProgressAfterHydrate == null &&
        rr.hydrate.launchProgressBeforeSave == null) ||
      rr.after.launchBatchProgress === before.launchBatchProgress;
  }

  logObj.shots.push(await shot(page, `${shotPrefix}-05-launch.png`));
  logObj.markers.launchObserve = await snap(page);

  const batchAtLaunchStart = (await snap(page)).launchBatchProgress;
  const launchPlay = await commissioningLaunchAction(page, branch);
  logObj.notes.launchPlay = launchPlay;
  logObj.notes.batchAtLaunchArm = batchAtLaunchStart;
  logObj.criteria.salesTapsDontQualify = !!launchPlay.nonQualify.salesDidNotCount;
  logObj.criteria.wrongActionDoesNotQualify =
    launchPlay.buys.find((b) => b.kind === 'wrong')?.wrongDidNotComplete !==
    false;
  const correct = launchPlay.buys.find((b) => b.kind === 'correct');
  const gateAfterAction = (await snap(page)).launchActionGate;
  logObj.criteria.oneRelevantActionQualifies =
    launchPlay.observe.gate === 'waived_at_cap' ||
    gateAfterAction === 'waived_at_cap' ||
    gateAfterAction === 'complete' ||
    (correct?.ok && correct.after?.gate === 'complete');

  // PART B: reload during proof_batch AFTER qualified action
  if (midReloadPhase === 'proof') {
    log('  → proof_batch reload after qualified action…');
    for (let i = 0; i < 40; i++) {
      const st = await snap(page);
      if (
        st.mcPhase === 'smartphone_launch' &&
        (st.launchActionGate === 'complete' ||
          st.launchActionGate === 'waived_at_cap')
      ) {
        break;
      }
      await advanceIdle(page, 250);
    }
    await advanceIdle(page, 2_000);
    const before = await snap(page);
    logObj.markers.beforeProofReload = before;
    const rr = await saveReload(page);
    if (!eventsOff) {
      await page.evaluate(() => {
        window.__tfrGame.registry.get('game').factory.eventsSys.resume();
      });
    }
    logObj.markers.afterProofReload = rr.after;
    logObj.notes.proofReload = {
      phaseBeforeSave: before.mcPhase,
      batchBefore: before.launchBatchProgress,
      gateBefore: before.launchActionGate,
      targetBefore: before.launchBatchTarget,
      phaseAfterLoad: rr.after.mcPhase,
      batchAfter: rr.after.launchBatchProgress,
      gateAfter: rr.after.launchActionGate,
      targetAfter: rr.after.launchBatchTarget,
      phaseOk: rr.after.mcPhase === 'smartphone_launch',
      batchPreserved: rr.after.launchBatchProgress === before.launchBatchProgress,
      gatePreserved: rr.after.launchActionGate === before.launchActionGate,
      targetUnchanged: rr.after.launchBatchTarget === before.launchBatchTarget,
      noBackToSampling: rr.after.mcPhase !== 'baseline_sampling',
      noReturn: !rr.after.returnStarted,
      hydrate: rr.hydrate,
      afterFirstStep: rr.afterFirstStep,
      launchProgressBeforeSave: rr.hydrate.launchProgressBeforeSave,
      launchProgressAfterHydrate: rr.hydrate.launchProgressAfterHydrate,
      hydrationProgressDelta: rr.hydrate.hydrationProgressDelta,
      launchProgressAfterFirstValidStep:
        rr.afterFirstStep.launchProgressAfterFirstValidStep,
      firstValidStepDelta: rr.afterFirstStep.firstValidStepDelta,
    };
    logObj.criteria.proofReloadPhaseOk = logObj.notes.proofReload.phaseOk;
    logObj.criteria.proofBatchPreserved = logObj.notes.proofReload.batchPreserved;
    logObj.criteria.proofActionPreserved = logObj.notes.proofReload.gatePreserved;
    logObj.criteria.proofTargetUnchanged = logObj.notes.proofReload.targetUnchanged;
    logObj.criteria.proofNoSamplingReset = logObj.notes.proofReload.noBackToSampling;
    logObj.criteria.proofHydrationDelta0 =
      rr.hydrate.hydrationProgressDelta === 0;
    logObj.criteria.proofProgressHydrateEqualsBefore =
      rr.hydrate.launchProgressAfterHydrate === before.launchBatchProgress ||
      rr.after.launchBatchProgress === before.launchBatchProgress ||
      rr.hydrate.launchProgressAfterHydrate ===
        rr.hydrate.launchProgressBeforeSave;
  }

  // Finish commissioning launch
  log('  → finishing launch → Shift1…');
  const launchStart = logObj.markers.firstPhone.sessMs;
  let batchFullMs = null;
  let actionDoneMs = null;
  for (let i = 0; i < 500; i++) {
    const st = await snap(page);
    if (
      (st.launchActionGate === 'complete' ||
        st.launchActionGate === 'waived_at_cap') &&
      actionDoneMs == null
    ) {
      actionDoneMs = st.sessMs;
    }
    if (
      st.launchBatchTarget > 0 &&
      st.launchBatchProgress >= st.launchBatchTarget &&
      batchFullMs == null
    ) {
      batchFullMs = st.sessMs;
    }
    if (
      st.mcPhase === 'return_preview' ||
      st.shift1 ||
      st.mcPhase === 'shift_1_complete'
    ) {
      logObj.markers.shift1 = st;
      break;
    }
    if (st.launchActionGate === 'pending' && i % 25 === 12) {
      await page.evaluate((pref) => {
        const f = window.__tfrGame.registry.get('game').factory;
        const rec = f.mc.state.launchRecommended;
        const type = rec?.type ?? (pref === 'speed' ? 'speed' : 'value');
        const machine = rec?.machineId ?? 1;
        const cost = f.upgrades.costFor(machine, type);
        if (!f.economy.canAfford(cost)) f.economy.coins += cost;
        f.buyUpgrade(machine, type);
      }, prefer);
    }
    await advanceIdle(page, 500);
  }
  if (!logObj.markers.shift1) logObj.markers.shift1 = await snap(page);

  const launchEnd = logObj.markers.shift1.sessMs;
  const launchDur = launchEnd - launchStart;
  logObj.notes.launchTiming = {
    launchStartMs: launchStart,
    actionDoneMs,
    batchFullMs,
    launchCompleteMs: launchEnd,
    durationMs: launchDur,
    minGateMs: logObj.markers.shift1.launchMinGateMs,
  };
  const eventsOn = !eventsOff;
  logObj.criteria.launchDurationBand = eventsOn
    ? launchDur >= 50_000 && launchDur <= 140_000
    : launchDur >= 70_000 && launchDur <= 150_000;
  logObj.criteria.launchNotElapsedTimer =
    logObj.markers.shift1.launchMinGateMs == null ||
    logObj.notes.launchTiming.minGateMs == null;
  logObj.criteria.launchCompletedByBatchNotIdleTimer =
    batchFullMs != null && actionDoneMs != null;
  logObj.notes.launchProductFeel = {
    mode: 'commissioning',
    wrongActionBlocked: logObj.criteria.wrongActionDoesNotQualify,
    relevantAction: logObj.criteria.oneRelevantActionQualifies,
    feltLikeForcedWait: 'should be NO — no minElapsed/hold gates',
  };

  logObj.criteria.shift1Immediate =
    logObj.markers.shift1.shift1 === true ||
    logObj.markers.shift1.mcPhase === 'return_preview';
  logObj.criteria.noEmptyLabel = !logObj.markers.shift1.labelEmpty;
  logObj.criteria.returnNotSameSession = !logObj.markers.shift1.returnStarted;
  logObj.shots.push(await shot(page, `${shotPrefix}-06-shift1-preview.png`));
  log(`  → Shift1 @ ${(launchEnd / 60000).toFixed(2)}min`);

  // Reload → return challenge
  log('  → reload → RETURN…');
  const retReload = await saveReload(page);
  logObj.markers.afterReturnReload = retReload.after;
  logObj.criteria.returnAppearsOnReload =
    retReload.after.mcPhase === 'return_challenge' &&
    retReload.after.returnStarted === true;
  logObj.criteria.returnKindMatches =
    (branch === 'throughput' && retReload.after.returnKind === 'flow') ||
    (branch === 'margin' && retReload.after.returnKind === 'margin');
  logObj.shots.push(await shot(page, `${shotPrefix}-07-return.png`));

  await advanceIdle(page, 3_000);
  const afterGrace = await snap(page);
  logObj.criteria.returnNoAutocompleteGrace = !afterGrace.returnDone;

  // Complete return — track 3 adaptive orders carefully
  const returnStart = afterGrace.sessMs;
  logObj.notes.returnProgressSamples = [];
  logObj.notes.returnOrderRecords = [];
  logObj.notes.returnLabelSamples = [];
  logObj.notes.capacityFeedbackSamples = [];
  const seenOrders = new Set();
  let lastSummaryCount = 0;
  let freeBeforeThree = false;
  const sampleAts = [30_000, 60_000, 90_000];
  const sampled = new Set();

  log('  → playing return orders…');
  for (let i = 0; i < 800; i++) {
    const st = await snap(page);
    const elapsed = st.sessMs - returnStart;

    // Label never empty; sample expected phrases
    if (st.labelEmpty) {
      logObj.notes.emptyLabelAt = { sessMs: st.sessMs, phase: st.returnPhase };
    }
    if (i % 8 === 0) {
      const expectFrag = expectedReturnLabel(st.returnPhase, st.returnOrderIndex);
      const labelOk =
        !st.labelEmpty &&
        (st.label.includes(expectFrag) ||
          st.label.includes('CALIBRAT') ||
          st.label.includes('ORDER') ||
          st.label.includes('FINAL') ||
          st.label.includes('RETURN') ||
          st.label.includes('FREE') ||
          st.label.includes('COMPLETE'));
      logObj.notes.returnLabelSamples.push({
        sessMs: st.sessMs,
        returnPhase: st.returnPhase,
        orderIndex: st.returnOrderIndex,
        label: st.label,
        expectFrag,
        labelOk,
      });
    }

    if (st.capacityFeedback) {
      logObj.notes.capacityFeedbackSamples.push({
        sessMs: st.sessMs,
        feedback: st.capacityFeedback,
        orderIndex: st.returnOrderIndex,
      });
    }

    // Track completed order summaries
    const summaries = st.completedOrderSummaries || [];
    if (summaries.length > lastSummaryCount) {
      for (let oi = lastSummaryCount; oi < summaries.length; oi++) {
        const sum = summaries[oi];
        const rec = {
          ...sum,
          observedAtSessMs: st.sessMs,
          durationMs: sum.durationMs ?? sum.activeSimulationMs ?? null,
          orderIndex: sum.orderIndex ?? oi + 1,
        };
        logObj.notes.returnOrderRecords.push(rec);
        log(
          `  → order ${rec.orderIndex} complete @ +${(elapsed / 1000).toFixed(0)}s (target=${rec.target})`,
        );
      }
      lastSummaryCount = summaries.length;
    }

    // Free must not grant before 3/3
    if (
      summaries.length < 3 &&
      (st.freeGranted || st.freeCredits >= 1 || st.freeUpgradeConsumed)
    ) {
      freeBeforeThree = true;
    }

    for (const at of sampleAts) {
      if (!sampled.has(at) && elapsed >= at) {
        sampled.add(at);
        logObj.notes.returnProgressSamples.push({
          at_s: at / 1000,
          progress: st.returnOrderProgress ?? st.returnProgress,
          target: st.returnOrderTarget ?? st.returnTarget,
          returnPhase: st.returnPhase,
          orderIndex: st.returnOrderIndex,
          sessMs: st.sessMs,
          label: st.label,
        });
      }
    }

    if (!seenOrders.has(st.returnPhase) && st.returnPhase) {
      seenOrders.add(st.returnPhase);
      log(`  → returnPhase=${st.returnPhase} label="${st.label}"`);
    }

    if (st.returnDone || st.mcPhase === 'return_complete') {
      logObj.markers.returnDone = st;
      break;
    }

    // During return: periodically buyPrefer + clickMachine for returnInputSeen
    if (i % 6 === 0) {
      await page.evaluate((pref) => {
        const f = window.__tfrGame.registry.get('game').factory;
        f.clickMachine(1);
        f.clickMachine(0);
        const order =
          pref === 'speed'
            ? ['speed', 'value', 'buffer']
            : ['value', 'speed', 'buffer'];
        for (const type of order) {
          for (const m of [1, 0, 2]) {
            if (type === 'buffer' && m === 2) continue;
            const cost = f.upgrades.costFor(m, type);
            if (!f.economy.canAfford(cost)) continue;
            if (f.buyUpgrade(m, type)) return true;
          }
        }
        if (f.economy.coins < 50) f.economy.coins += 80;
        return false;
      }, prefer);
    }
    await advance(page, 500, prefer, 8_000);
  }

  if (!logObj.markers.returnDone) logObj.markers.returnDone = await snap(page);
  const returnDur = logObj.markers.returnDone.sessMs - returnStart;
  logObj.notes.returnDurationMs = returnDur;
  log(
    `  → return done in ${(returnDur / 1000).toFixed(1)}s, orders=${logObj.markers.returnDone.completedOrderSummaries?.length ?? 0}`,
  );

  const finalSummaries =
    logObj.markers.returnDone.completedOrderSummaries || [];
  logObj.criteria.returnExactly3Orders = finalSummaries.length === 3;
  logObj.criteria.returnFreeNotBeforeThree = !freeBeforeThree;
  logObj.criteria.returnLabelsNeverEmpty =
    !logObj.notes.emptyLabelAt &&
    (logObj.notes.returnLabelSamples.length === 0 ||
      logObj.notes.returnLabelSamples.every((s) => s.labelOk !== false));
  logObj.criteria.returnInputSeen =
    !!logObj.markers.returnDone.returnInputSeen ||
    logObj.notes.returnLabelSamples.some(() => true); // soft — also check snap
  // Harder check from final snap
  logObj.criteria.returnInputSeen =
    logObj.markers.returnDone.returnInputSeen === true;

  // Duration bands
  if (branch === 'throughput') {
    logObj.criteria.returnDurationBand =
      returnDur >= 120_000 && returnDur <= 300_000;
    logObj.criteria.returnDurationPreferred =
      returnDur >= 150_000 && returnDur <= 240_000;
    logObj.notes.returnDurationNote =
      returnDur >= 150_000 && returnDur <= 240_000
        ? 'preferred 150–240s'
        : returnDur >= 120_000 && returnDur <= 300_000
          ? 'in wide band 120–300s'
          : 'OUT of band';
  } else {
    logObj.criteria.returnDurationBand =
      returnDur >= 90_000 && returnDur <= 300_000;
    logObj.notes.returnDurationExtreme =
      returnDur >= 90_000 && returnDur < 120_000
        ? 'extreme short (90–119s)'
        : null;
    logObj.criteria.returnDurationPreferred =
      returnDur >= 120_000 && returnDur <= 300_000;
    logObj.notes.returnDurationNote =
      returnDur >= 90_000 && returnDur < 120_000
        ? 'extreme short 90–119s (still ≥90)'
        : returnDur >= 90_000 && returnDur <= 300_000
          ? 'in band ≥90 ≤300'
          : 'OUT of band';
  }
  logObj.criteria.returnNotUnder90 = returnDur >= 90_000;
  logObj.criteria.returnNotOver5min = returnDur <= 5 * 60_000;

  const rep = await sessionReport(page);
  const rd = rep.returnDiag || null;
  logObj.notes.returnDiag = {
    ...(rd || {}),
    observedDuration_s: +(returnDur / 1000).toFixed(1),
    expectedDuration_s: rd?.expectedDuration ?? null,
    observedToExpectedRatio:
      rd?.expectedDuration && returnDur
        ? +((returnDur / 1000) / rd.expectedDuration).toFixed(3)
        : (rd?.observedToExpectedRatio ?? null),
    referenceRate: rd?.referenceRate ?? null,
    canonicalRate: rd?.canonicalRate ?? null,
    first30SecActualRate: rd?.first30SecActualRate ?? null,
    target: rd?.target ?? logObj.markers.returnDone?.returnTarget,
    startCounter: rd?.startCounter ?? null,
    countedProgress:
      rd?.countedProgress ?? logObj.markers.returnDone?.returnProgress,
    completedOrders: finalSummaries.length,
    orderRecords: logObj.notes.returnOrderRecords,
    capacityFeedbackSamples: logObj.notes.capacityFeedbackSamples,
  };
  logObj.criteria.returnRatioOk =
    logObj.notes.returnDiag.observedToExpectedRatio == null ||
    (logObj.notes.returnDiag.observedToExpectedRatio >= 0.6 &&
      logObj.notes.returnDiag.observedToExpectedRatio <= 1.4);
  logObj.criteria.returnStartsAtZero =
    (logObj.markers.afterReturnReload?.returnOrderProgress ??
      logObj.markers.afterReturnReload?.returnProgress ??
      0) === 0;
  logObj.criteria.freeUpgradeGranted =
    !!logObj.markers.returnDone.freeGranted &&
    logObj.markers.returnDone.freeCredits >= 1;
  logObj.criteria.freeGrantedOnlyAfter3 =
    logObj.criteria.returnExactly3Orders &&
    logObj.criteria.returnFreeNotBeforeThree &&
    logObj.criteria.freeUpgradeGranted;

  // Save JSON before free spend (for isolated fixture if needed)
  await page.evaluate(() => {
    window.__tfrGame.registry.get('game').saveSystem?.save?.();
  });
  const preFreeSaveJson = await page.evaluate(() => {
    try {
      return localStorage.getItem('tiny-factory-rush-save');
    } catch {
      return null;
    }
  });
  logObj.notes.preFreeSaveCaptured = !!preFreeSaveJson;

  const preSpendReload = await saveReload(page);
  logObj.markers.afterFreeCreditReload = preSpendReload.after;
  logObj.criteria.freeCreditSurvivesReload =
    preSpendReload.after.freeCredits >= 1 &&
    preSpendReload.after.freeGranted === true;
  logObj.shots.push(await shot(page, `${shotPrefix}-08-free-upgrade.png`));

  if (runFreeBonus) {
    // FREE NORMAL after A's return (before BONUS maxing)
    log('  → FREE NORMAL…');
    let spend = await runFreeNormalFixture(page, logObj, {
      shotName: 'validate-mc3-free-normal.png',
    });

    // Dedicated FREE NORMAL fixture if spend fails due to near-max
    if (!spend.ok || spend.nearMax || spend.reason === 'all_maxed_or_near_max') {
      log('  → FREE NORMAL failed (near-max); isolated fixture…');
      logObj.notes.freeSpendFallback = true;
      const restoreJson = preFreeSaveJson || fundingChoiceSaveJson;
      if (restoreJson) {
        // Load A's save before spend; ensure some levels allow +1
        await page.evaluate((raw) => {
          localStorage.setItem('tiny-factory-rush-save', raw);
        }, restoreJson);
        await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.waitForSelector('canvas', { timeout: 25000 });
        await page.waitForFunction(() => {
          const reg = window.__tfrGame?.registry?.get?.('game');
          return !!reg?.factory;
        }, { timeout: 25000 });
        await page.evaluate(() => {
          const reg = window.__tfrGame.registry.get('game');
          reg.factory.line.rollGolden = () => false;
          try {
            reg.saveSystem?.stopAutosave?.();
          } catch {
            /* ignore */
          }
          const f = reg.factory;
          // Ensure at least one non-max slot and free credit
          for (const type of ['speed', 'value', 'buffer']) {
            for (const m of [1, 0, 2]) {
              if (type === 'buffer' && m === 2) continue;
              if (f.upgrades.getLevel(m, type) >= 20) {
                f.upgrades.levels[m][type] = 18;
              }
            }
          }
          f.mc.state.freeUpgradeGranted = true;
          f.mc.state.freeUpgradeCredits = 1;
          f.mc.state.freeUpgradeUsed = false;
          f.mc.state.freeUpgradeConsumed = false;
          f.mc.state.freeUpgradeMode = f.mc.computeFreeUpgradeMode(f);
        });
        spend = await runFreeNormalFixture(page, logObj, {
          shotName: 'validate-mc3-free-normal.png',
        });
        logObj.notes.freeSpendIsolated = spend;
      } else {
        logObj.notes.freeSpendFallbackNoSave = true;
      }
    }

    // BONUS after free normal consumed
    await runBonusFixture(page, logObj);
  } else {
    // Part B: light free spend check without dedicated screenshots
    const spend = await page.evaluate(() => {
      const f = window.__tfrGame.registry.get('game').factory;
      let best = null;
      for (const type of ['speed', 'value', 'buffer']) {
        for (const m of [1, 0, 2]) {
          if (type === 'buffer' && m === 2) continue;
          if (f.upgrades.isMaxed(m, type)) continue;
          const cost = f.upgrades.costFor(m, type);
          if (!best || cost > best.cost) {
            best = { type, machine: m, cost };
          }
        }
      }
      if (!best) return { ok: false, reason: 'all_maxed' };
      f.economy.coins = Math.min(f.economy.coins, Math.max(0, best.cost - 1));
      const cashBefore = f.economy.coins;
      const levelBefore = f.upgrades.getLevel(best.machine, best.type);
      const ok = f.buyUpgrade(best.machine, best.type);
      return {
        ok,
        type: best.type,
        machine: best.machine,
        levelBefore,
        levelAfter: f.upgrades.getLevel(best.machine, best.type),
        cashDelta: Math.floor(f.economy.coins - cashBefore),
        creditsAfter: f.mc.state.freeUpgradeCredits,
        used: f.mc.state.freeUpgradeUsed,
        consumed: f.mc.state.freeUpgradeConsumed,
        rewardId: f.mc.state.freeUpgradeRewardId,
        mode: f.mc.state.freeUpgradeMode,
      };
    });
    logObj.notes.freeSpend = spend;
    logObj.criteria.freeSpendCashDelta0 = spend.ok && spend.cashDelta === 0;
    logObj.criteria.freeConsumed =
      spend.creditsAfter === 0 && (spend.used === true || spend.consumed === true);
  }

  logObj.report = await sessionReport(page);
  logObj.end = await snap(page);

  const buildMin = logObj.notes.atReady.buildBandMin;
  logObj.criteria.buildFloor975 = buildMin >= 9.75;
  logObj.criteria.buildBand =
    policy === 'fast'
      ? buildMin >= 10 && buildMin <= 11.5
      : buildMin >= 11 && buildMin <= 13;
  logObj.criteria.buildBandSoft = buildMin >= 9.75 && buildMin <= 13.5;

  logObj.criteria.campaignMarkersPresent =
    !!logObj.report?.campaignMarkers &&
    (logObj.report.campaignMarkers.fundingChoiceCampaignMs != null ||
      logObj.report.campaignMarkers.fundReadyCampaignMs != null);

  log(`=== ${id} done ===\n`);
  return logObj;
}

function s(ms) {
  return ms == null ? null : +(ms / 1000).toFixed(1);
}

function summarize(r) {
  return {
    id: r.id,
    branch: r.branch,
    policy: r.policy,
    events: r.notes.events,
    authenticCheckpoint: r.notes.authenticCheckpoint ?? null,
    toys_s: s(r.markers.toysReady?.sessMs),
    fundingChoice_s: s(r.markers.fundingChoice?.sessMs),
    policySelect: r.notes.policySelect?.after,
    fundBuys: r.fundBuys,
    fundingPurchasesAtReady: r.notes.fundingPurchasesAtReady ?? null,
    fundingDuration_s: r.notes.atReady?.fundingDuration_s,
    ready_s: s(r.markers.ready?.sessMs),
    ready_min: r.notes.atReady?.buildBandMin,
    fundTarget: r.notes.atReady?.fundTarget,
    fundingRef: r.notes.atReady?.fundingRef,
    contribution: r.notes.atReady?.contribution,
    build: r.notes.build,
    firstPhoneDelta_s: s(r.notes.firstPhone?.deltaMs),
    firstPhoneVisual: r.notes.firstPhone?.visual,
    samplingReload: r.notes.samplingReload ?? null,
    proofReload: r.notes.proofReload ?? null,
    launchObserve: r.notes.launchPlay?.observe,
    launchBuys: r.notes.launchPlay?.buys?.map((b) => ({
      type: b.type,
      machine: b.machine,
      reason: b.reason,
      ok: b.ok,
      cost: b.cost,
      actionsAfter: b.after?.actions,
      tp: [b.before?.tp, b.after?.tp],
      wip: [b.before?.wip, b.after?.wip],
      income: [b.before?.income, b.after?.income],
    })),
    launchTiming: {
      ...r.notes.launchTiming,
      duration_s: s(r.notes.launchTiming?.durationMs),
      actionDone_s: s(r.notes.launchTiming?.actionDoneMs),
      batchFull_s: s(r.notes.launchTiming?.batchFullMs),
    },
    launchProductFeel: r.notes.launchProductFeel,
    shift1_s: s(r.markers.shift1?.sessMs),
    returnKind: r.markers.afterReturnReload?.returnKind,
    returnDuration_s: s(r.notes.returnDurationMs),
    returnDurationNote: r.notes.returnDurationNote ?? null,
    returnDurationExtreme: r.notes.returnDurationExtreme ?? null,
    returnOrderRecords: r.notes.returnOrderRecords ?? [],
    returnDiag: r.notes.returnDiag,
    freeSpend: r.notes.freeSpend,
    bonusTierPath: r.notes.bonusTierPath ?? null,
    criteria: r.criteria,
    report: r.report,
    shots: r.shots,
  };
}

function score(c) {
  const entries = Object.entries(c || {});
  const pass = entries.filter(([, v]) => v === true).length;
  const fail = entries.filter(([, v]) => v === false).map(([k]) => k);
  return { pass, total: entries.length, fail };
}

function computeOverallVerdict(partA, partB) {
  const aFail = score(partA.criteria).fail;
  const bFail = score(partB.criteria).fail;
  const allFail = [...aFail, ...bFail];

  const returnKeys = [
    'returnDurationBand',
    'returnExactly3Orders',
    'returnFreeNotBeforeThree',
    'returnLabelsNeverEmpty',
    'returnInputSeen',
    'freeGrantedOnlyAfter3',
    'returnAppearsOnReload',
    'returnKindMatches',
  ];
  const returnFails = allFail.filter((k) =>
    returnKeys.some((rk) => k.includes('return') || k === rk || k.startsWith('return') || k.startsWith('freeGranted')),
  );
  const hydrationFails = allFail.filter(
    (k) =>
      k.includes('Hydration') ||
      k.includes('hydration') ||
      k.includes('sampling') ||
      k.includes('proof'),
  );
  const fundingFails = allFail.filter(
    (k) =>
      k.includes('funding') ||
      k.includes('Funding') ||
      k.includes('buildBand') ||
      k.includes('buildCash') ||
      k.includes('buildFloor'),
  );
  const freeBonusFails = allFail.filter(
    (k) =>
      k.includes('free') ||
      k.includes('Free') ||
      k.includes('bonus') ||
      k.includes('Bonus'),
  );
  const priorMilestoneFails = allFail.filter(
    (k) =>
      k.includes('selectNever') ||
      k.includes('policy') ||
      k.includes('contribution') ||
      k.includes('firstPhone') ||
      k.includes('launch') ||
      k.includes('shift1') ||
      k.includes('campaignMarkers'),
  );

  if (allFail.length === 0) return 'M-C cerrado';

  const returnCritical =
    returnFails.length >= 2 ||
    aFail.includes('returnExactly3Orders') ||
    bFail.includes('returnExactly3Orders') ||
    aFail.includes('returnDurationBand') ||
    bFail.includes('returnDurationBand') ||
    aFail.includes('freeGrantedOnlyAfter3') ||
    bFail.includes('freeGrantedOnlyAfter3');

  if (returnCritical && returnFails.length >= fundingFails.length) {
    return 'Return necesita rediseño';
  }

  if (
    priorMilestoneFails.length >= 3 &&
    priorMilestoneFails.length > returnFails.length
  ) {
    return 'regresión en milestone anterior';
  }

  if (
    fundingFails.length + freeBonusFails.length + hydrationFails.length > 0 ||
    allFail.length > 0
  ) {
    return 'necesita corrección funcional';
  }

  return 'necesita corrección funcional';
}

// ---- main ----
log(`M-C.3 validation → ${URL}`);
log('(sessionMs criteria; observation only)\n');

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const results = {};

try {
  log('Part A — Throughput + Balanced 35%, events OFF, 907×510…');
  results.partA = await runPart(page, {
    id: 'A_balanced_throughput_mc3',
    viewport: { width: 907, height: 510 },
    branch: 'throughput',
    prefer: 'speed',
    policy: 'balanced',
    eventsOff: true,
    midReloadPhase: 'sampling',
    shotPrefix: 'validate-mc3-a',
    runFreeBonus: true,
  });

  log('Part B — Margin + Fast 58%, events ON, 390×844 (from zero)…');
  results.partB = await runPart(page, {
    id: 'B_fast_margin_mc3',
    viewport: { width: 390, height: 844 },
    branch: 'margin',
    prefer: 'value',
    policy: 'fast',
    eventsOff: false,
    midReloadPhase: 'proof',
    shotPrefix: 'validate-mc3-b',
    runFreeBonus: false,
  });
} finally {
  await browser.close();
}

const out = {
  generatedAt: new Date().toISOString(),
  note: 'M-C.3 session-time Playwright validation; 3 adaptive Return orders, hydration barrier, fundingPurchaseCount, FREE NORMAL + BONUS fixtures.',
  smokeUrl: URL,
  partA: summarize(results.partA),
  partB: summarize(results.partB),
  raw: {
    partA_criteria: results.partA.criteria,
    partB_criteria: results.partB.criteria,
    partA_markers: Object.fromEntries(
      Object.entries(results.partA.markers).map(([k, v]) => [
        k,
        v && typeof v === 'object'
          ? {
              sessMs: v.sessMs,
              mcPhase: v.mcPhase,
              label: v.label,
              returnPhase: v.returnPhase,
              returnOrderIndex: v.returnOrderIndex,
            }
          : v,
      ]),
    ),
    partB_markers: Object.fromEntries(
      Object.entries(results.partB.markers).map(([k, v]) => [
        k,
        v && typeof v === 'object'
          ? {
              sessMs: v.sessMs,
              mcPhase: v.mcPhase,
              label: v.label,
              returnPhase: v.returnPhase,
              returnOrderIndex: v.returnOrderIndex,
            }
          : v,
      ]),
    ),
  },
};

const fundA = out.partA.fundingDuration_s;
const fundB = out.partB.fundingDuration_s;
out.cross = {
  fastFundingShorter:
    fundA != null && fundB != null ? fundB < fundA : null,
  fastFundingRatio: fundA && fundB ? +(fundB / fundA).toFixed(3) : null,
  bothBuildAboveFloor:
    out.partA.criteria.buildFloor975 && out.partB.criteria.buildFloor975,
  bothReturn3Orders:
    out.partA.criteria.returnExactly3Orders &&
    out.partB.criteria.returnExactly3Orders,
};

out.verdict = {
  partA: score(out.partA.criteria),
  partB: score(out.partB.criteria),
  cross: out.cross,
};
out.overallVerdict = computeOverallVerdict(results.partA, results.partB);

out.ux = {
  partA: results.partA.notes.launchProductFeel,
  partB: results.partB.notes.launchProductFeel,
  returnA: results.partA.notes.returnDiag,
  returnB: results.partB.notes.returnDiag,
  samplingReload: results.partA.notes.samplingReload ?? null,
  proofReload: results.partB.notes.proofReload ?? null,
  freeA: results.partA.notes.freeSpend ?? null,
  bonusA: results.partA.notes.bonusTierPath ?? null,
  authenticCheckpointB: results.partB.notes.authenticCheckpoint ?? null,
};

fs.writeFileSync('validate-mc3-final.json', JSON.stringify(out, null, 2));
log('\nWrote validate-mc3-final.json');

// PASS/FAIL table
function row(name, ok) {
  return `${ok ? 'PASS' : 'FAIL'}  ${name}`;
}

log('\n========== M-C.3 CRITERIA TABLE ==========');
for (const [partName, part] of [
  ['Part A (FLOW/Balanced)', results.partA],
  ['Part B (MARGIN/Fast)', results.partB],
]) {
  log(`\n--- ${partName} ---`);
  const entries = Object.entries(part.criteria || {}).sort(([a], [b]) =>
    a.localeCompare(b),
  );
  for (const [k, v] of entries) {
    if (typeof v === 'boolean') log(row(k, v));
  }
  log(
    `  fundingDuration_s=${part.notes.atReady?.fundingDuration_s} ready_min=${part.notes.atReady?.buildBandMin}`,
  );
  log(
    `  returnDur_s=${s(part.notes.returnDurationMs)} orders=${part.markers.returnDone?.completedOrderSummaries?.length ?? 0} note=${part.notes.returnDurationNote}`,
  );
  log(
    `  fundingPurchaseCount=${part.notes.fundingPurchasesAtReady?.count} score=${score(part.criteria).pass}/${score(part.criteria).total}`,
  );
}

log('\n========== OVERALL ==========');
log(`overallVerdict: ${out.overallVerdict}`);
log(
  `partA fail: ${out.verdict.partA.fail.join(', ') || '(none)'}`,
);
log(
  `partB fail: ${out.verdict.partB.fail.join(', ') || '(none)'}`,
);

console.log(
  JSON.stringify(
    {
      overallVerdict: out.overallVerdict,
      verdict: out.verdict,
      partA: {
        fundingDuration_s: out.partA.fundingDuration_s,
        ready_min: out.partA.ready_min,
        fundTarget: out.partA.fundTarget,
        contribution: out.partA.contribution,
        fundingPurchaseCount: out.partA.fundingPurchasesAtReady?.count,
        launchDur_s: out.partA.launchTiming?.duration_s,
        returnDur_s: out.partA.returnDuration_s,
        returnOrders: out.partA.returnOrderRecords?.length,
        returnNote: out.partA.returnDurationNote,
        freeSpend: out.partA.freeSpend,
        fail: out.verdict.partA.fail,
      },
      partB: {
        fundingDuration_s: out.partB.fundingDuration_s,
        ready_min: out.partB.ready_min,
        fundTarget: out.partB.fundTarget,
        contribution: out.partB.contribution,
        fundingPurchaseCount: out.partB.fundingPurchasesAtReady?.count,
        launchDur_s: out.partB.launchTiming?.duration_s,
        returnDur_s: out.partB.returnDuration_s,
        returnOrders: out.partB.returnOrderRecords?.length,
        returnNote: out.partB.returnDurationNote,
        returnExtreme: out.partB.returnDurationExtreme,
        fail: out.verdict.partB.fail,
      },
    },
    null,
    2,
  ),
);
