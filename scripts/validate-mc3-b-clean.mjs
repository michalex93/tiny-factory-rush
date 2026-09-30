/**
 * M-C.3 Part B MARGIN — CLEAN harness isolation re-validation.
 * Observation only. Does NOT mutate game source, balance, tests, or
 * validate-mc3-final.* artifacts. Never reads validate-mc3-final.json
 * into game state.
 *
 * SMOKE_URL=http://127.0.0.1:5175/ node scripts/validate-mc3-b-clean.mjs
 *
 * Writes: validate-mc3-b-clean.json (+ PNG shots in cwd)
 * Console logs (caller may tee to validate-mc3-b-clean-run.log)
 */
import { chromium } from 'playwright';
import fs from 'fs';

const URL = process.env.SMOKE_URL ?? 'http://127.0.0.1:5175/';
const THR = 650;
const VIEWPORT = { width: 390, height: 844 };
const BRANCH = 'margin';
const PREFER = 'value';
const POLICY = 'fast';
const SHOT_PREFIX = 'validate-mc3-b-clean';
const OUT_JSON = 'validate-mc3-b-clean.json';
const CONTAMINATED_TARGETS = new Set([101, 86, 79]);

const runId = `mc3-b-clean-${Date.now().toString(36)}`;

function log(...args) {
  console.log(...args);
}

function s(ms) {
  return ms == null ? null : +(ms / 1000).toFixed(1);
}

function score(c) {
  const entries = Object.entries(c || {});
  const pass = entries.filter(([, v]) => v === true).length;
  const fail = entries.filter(([, v]) => v === false).map(([k]) => k);
  return { pass, total: entries.length, fail };
}

function writeReport(report) {
  fs.writeFileSync(OUT_JSON, JSON.stringify(report, null, 2));
  log(`\nWrote ${OUT_JSON}`);
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
      selectedBranch: f.sessionGoal.selectedBranch ?? null,
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
  // Events ON for Part B margin
  await page.evaluate(() => {
    window.__tfrGame.registry.get('game').factory.eventsSys.resume();
  });
  const after = await snap(page);
  const hydrate = await readHydration(page);
  await page.evaluate(() => {
    const reg = window.__tfrGame.registry.get('game');
    reg.telemetry.update(50);
    reg.factory.update(50);
  });
  const afterFirstStep = await readHydration(page);
  return { before, after, hydrate, afterFirstStep };
}

async function waitFactory(page) {
  await page.waitForSelector('canvas', { timeout: 25000 });
  await page.waitForFunction(() => {
    const reg = window.__tfrGame?.registry?.get?.('game');
    return !!reg?.factory;
  }, { timeout: 25000 });
}

async function clearClientState(page) {
  await page.evaluate(async () => {
    try {
      localStorage.clear();
    } catch {
      /* ignore */
    }
    try {
      sessionStorage.clear();
    } catch {
      /* ignore */
    }
    try {
      if (typeof indexedDB !== 'undefined' && indexedDB.databases) {
        const dbs = await indexedDB.databases();
        await Promise.all(
          (dbs || []).map(
            (db) =>
              new Promise((resolve) => {
                if (!db?.name) return resolve();
                const req = indexedDB.deleteDatabase(db.name);
                req.onsuccess = () => resolve();
                req.onerror = () => resolve();
                req.onblocked = () => resolve();
              }),
          ),
        );
      }
    } catch {
      /* ignore */
    }
  });
}

async function callTfrResetIfPresent(page) {
  const has = await page.evaluate(() => typeof window.__tfrReset === 'function');
  if (!has) return false;
  try {
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 60000 }),
      page.evaluate(() => {
        window.__tfrReset();
      }),
    ]);
  } catch {
    // __tfrReset may already have navigated; ensure we settle
    try {
      await page.waitForLoadState('domcontentloaded', { timeout: 15000 });
    } catch {
      /* ignore */
    }
  }
  return true;
}

async function hardenSession(page) {
  await page.evaluate(() => {
    const reg = window.__tfrGame.registry.get('game');
    reg.factory.line.rollGolden = () => false;
    try {
      reg.saveSystem?.stopAutosave?.();
    } catch {
      /* ignore */
    }
    try {
      reg.factory.eventsSys.resume();
    } catch {
      /* ignore */
    }
  });
}

async function buildPartBIsolationProof(page) {
  return page.evaluate(() => {
    const reg = window.__tfrGame?.registry?.get?.('game');
    const f = reg?.factory;
    const st = f?.mc?.state;
    const rc = st?.returnChallenge ?? null;
    const markers = st?.campaignMarkers ?? null;
    const report =
      typeof window.__tfrSessionReport === 'function'
        ? window.__tfrSessionReport()
        : reg?.telemetry?.buildSessionReport?.(f) ?? null;

    const summaries = rc?.completedOrderSummaries
      ? rc.completedOrderSummaries.map((o) => ({ ...o }))
      : [];

    return {
      sessionMs: Math.round(f?.sessionMs ?? -1),
      teleMs: Math.round(reg?.telemetry?.elapsed ?? -1),
      selectedBranch: f?.sessionGoal?.selectedBranch ?? null,
      sessionGoalPhase: f?.sessionGoal?.phase ?? null,
      fundingPolicy: st?.fundingPolicy ?? null,
      mcPhase: f?.mc?.phase ?? null,
      returnChallenge: rc
        ? {
            kind: rc.kind ?? null,
            returnPhase: rc.returnPhase ?? null,
            orderIndex: rc.returnOrderIndex ?? null,
            completedCount: summaries.length,
          }
        : null,
      returnPhase: rc?.returnPhase ?? null,
      freeUpgradeConsumed: st?.freeUpgradeConsumed ?? false,
      freeUpgradeCredits: st?.freeUpgradeCredits ?? 0,
      freeUpgradeGranted: st?.freeUpgradeGranted ?? false,
      freeUpgradeRewardId: st?.freeUpgradeRewardId ?? null,
      completedOrderSummaries: summaries,
      campaignMarkers: markers
        ? {
            fundingChoiceCampaignMs: markers.fundingChoiceCampaignMs ?? null,
            fundReadyCampaignMs: markers.fundReadyCampaignMs ?? null,
            smartphoneBuildCampaignMs:
              markers.smartphoneBuildCampaignMs ?? null,
            firstPhoneCampaignMs: markers.firstPhoneCampaignMs ?? null,
            launchStartCampaignMs: markers.launchStartCampaignMs ?? null,
            launchCompleteCampaignMs: markers.launchCompleteCampaignMs ?? null,
            shift1CompleteCampaignMs: markers.shift1CompleteCampaignMs ?? null,
            returnShownCampaignMs: markers.returnShownCampaignMs ?? null,
            returnCompleteCampaignMs: markers.returnCompleteCampaignMs ?? null,
            freeUpgradeUsedCampaignMs:
              markers.freeUpgradeUsedCampaignMs ?? null,
          }
        : null,
      smartphonesBuilt: st?.smartphonesBuilt ?? false,
      firstSmartphoneProduced: st?.firstSmartphoneProduced ?? false,
      fundingPurchaseCount: st?.fundingPurchaseCount ?? 0,
      totalPurchased: f?.upgrades?.totalPurchased ?? 0,
      totalEarned: Math.floor(f?.economy?.totalEarned ?? 0),
      sessionReportSnippet: report
        ? {
            sessionMs: report.sessionMs ?? report.elapsedMs ?? null,
            campaignMarkers: report.campaignMarkers ?? null,
            returnDiag: report.returnDiag
              ? {
                  kind: report.returnDiag.kind ?? null,
                  target: report.returnDiag.target ?? null,
                  completedOrders: report.returnDiag.completedOrders ?? null,
                }
              : null,
          }
        : null,
    };
  });
}

function evaluateIsolation(proof) {
  const fails = [];
  const sessionMs = proof?.sessionMs ?? Infinity;
  if (!(sessionMs < 5000)) {
    fails.push(`sessionMs=${sessionMs} (need <5000)`);
  }
  const branch = proof?.selectedBranch;
  if (branch != null && branch !== '' && branch !== 'unselected') {
    fails.push(`selectedBranch=${branch}`);
  }
  if (proof?.fundingPolicy != null) {
    fails.push(`fundingPolicy=${proof.fundingPolicy}`);
  }

  const phase = proof?.mcPhase;
  if (
    phase === 'return_preview' ||
    phase === 'return_challenge' ||
    phase === 'return_complete' ||
    phase === 'first_smartphone' ||
    phase === 'baseline_sampling' ||
    phase === 'smartphone_launch' ||
    phase === 'smartphone_ready' ||
    phase === 'smartphone_funding' ||
    phase === 'shift_1_complete'
  ) {
    fails.push(`mcPhase=${phase} (late/smartphone/return)`);
  } else if (phase !== 'idle' && phase !== 'funding_choice') {
    fails.push(`mcPhase=${phase} (expected idle, maybe early funding_choice)`);
  }

  const rp = proof?.returnPhase;
  const activeOrders =
    rp === 'order_1' ||
    rp === 'order_2' ||
    rp === 'order_3' ||
    rp === 'calibration' ||
    rp === 'preview';
  if (proof?.returnChallenge != null && activeOrders) {
    fails.push(`returnChallenge active (phase=${rp})`);
  }

  if (proof?.freeUpgradeConsumed === true) {
    fails.push('freeUpgradeConsumed=true');
  }
  const credits = proof?.freeUpgradeCredits ?? 0;
  if (credits !== 0 && proof?.freeUpgradeGranted) {
    fails.push(`freeUpgradeCredits=${credits} granted`);
  } else if (credits > 0) {
    fails.push(`freeUpgradeCredits=${credits}`);
  }

  const summaries = proof?.completedOrderSummaries || [];
  for (const o of summaries) {
    const t = o?.target ?? o?.batchTarget;
    if (CONTAMINATED_TARGETS.has(t)) {
      fails.push(`contaminated completedOrder target=${t}`);
    }
  }

  const markers = proof?.campaignMarkers || {};
  for (const [k, v] of Object.entries(markers)) {
    if (v != null) fails.push(`campaignMarkers.${k}=${v}`);
  }

  if (proof?.smartphonesBuilt === true) {
    fails.push('smartphonesBuilt=true');
  }

  return {
    ok: fails.length === 0,
    fails,
    preferredIdle: phase === 'idle',
  };
}

async function bootIsolated(page) {
  log(`  → goto ${URL}`);
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });

  log('  → clear storages (+ optional __tfrReset)');
  await clearClientState(page);
  const reset1 = await callTfrResetIfPresent(page);
  if (!reset1) {
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
  } else {
    // __tfrReset already reloaded; still do an explicit reload per protocol
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
  }

  await waitFactory(page);

  log('  → second __tfrReset + reload');
  const reset2 = await callTfrResetIfPresent(page);
  if (!reset2) {
    await clearClientState(page);
  }
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
  await waitFactory(page);
  await hardenSession(page);
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

async function playToFundingChoice(page, branch, prefer) {
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
  log(
    `  → convergence @ ${((logObj.markers.convergence?.sessMs ?? 0) / 1000).toFixed(0)}s`,
  );

  await page.evaluate(() => {
    window.__tfrGame.registry.get('game').factory.eventsSys.resume();
  });
  logObj.notes.events = 'on';

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
  log(
    `  → toys ready @ ${((logObj.markers.toysReady?.sessMs ?? 0) / 1000).toFixed(0)}s`,
  );

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
  log(
    `  → funding_choice @ ${((logObj.markers.fundingChoice?.sessMs ?? 0) / 1000).toFixed(0)}s`,
  );
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

function classifyTargetChange(prev, next) {
  if (prev == null || next == null || !(prev > 0)) {
    return { classification: 'unknown', ratio: null, pct: null };
  }
  const ratio = next / prev;
  const pct = +((ratio - 1) * 100).toFixed(2);
  let classification = 'stable';
  if (ratio > 1.05) classification = 'increased';
  else if (ratio < 0.95) classification = 'decreased';
  return { classification, ratio: +ratio.toFixed(4), pct };
}

function computeOverallVerdict(criteria, notes) {
  const sc = score(criteria);
  const fail = sc.fail;

  if (fail.length === 0) {
    if (notes?.microcopyPending) {
      return 'M-C funcionalmente cerrado, pendiente microcopy';
    }
    return 'M-C funcionalmente cerrado';
  }

  // Pacing OK but microcopy mismatch alone → pending microcopy
  const onlyMicro =
    fail.length > 0 &&
    fail.every(
      (k) =>
        k.includes('microcopy') ||
        k.includes('capacityCopy') ||
        k.includes('targetCopy'),
    );
  if (onlyMicro || (notes?.microcopyPending && notes?.pacingOk)) {
    const hardFails = fail.filter(
      (k) =>
        !k.includes('microcopy') &&
        !k.includes('capacityCopy') &&
        !k.includes('targetCopy'),
    );
    if (hardFails.length === 0) {
      return 'M-C funcionalmente cerrado, pendiente microcopy';
    }
  }

  return 'necesita corrección funcional MARGIN';
}

async function runPartB(page, report) {
  const logObj = await playToFundingChoice(page, BRANCH, PREFER);
  logObj.id = 'B_fast_margin_mc3_clean';
  logObj.branch = BRANCH;
  logObj.policy = POLICY;
  logObj.prefer = PREFER;
  logObj.viewport = VIEWPORT;
  logObj.runId = runId;
  logObj.shots = report.shots;
  logObj.notes.events = 'on';
  logObj.notes.authenticCheckpoint =
    'Clean isolation run from zero (Margin/FAST/events ON/390×844). No validate-mc3-final.json restore.';

  // --- Policy select FAST ---
  log('  → select FAST policy…');
  logObj.markers.atPolicyChoice = await snap(page);
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
  }, POLICY);
  logObj.notes.policySelect = policyPick;
  logObj.markers.policySelected = await snap(page);
  logObj.criteria.selectNeverBuilds =
    !policyPick.built && policyPick.after.phase === 'smartphone_funding';
  logObj.criteria.policyLocked = !!policyPick.after.locked;
  logObj.criteria.contribution058 =
    Math.abs((policyPick.after.contribution ?? 0) - 0.58) < 0.001;

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
  logObj.criteria.affordableOpportunitiesOk = costsAfter.affordable >= 1;

  // Funding (≥1 buy)
  log('  → funding phase…');
  logObj.shots.push(await shot(page, `${SHOT_PREFIX}-01-funding.png`));
  let fundBuys = 0;
  for (let i = 0; i < 400; i++) {
    const st = await snap(page);
    if (st.mcPhase === 'smartphone_ready') {
      logObj.markers.ready = st;
      break;
    }

    if (fundBuys < 2 && i % 3 === 0) {
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
      }, PREFER);
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

    await advance(page, 1500, PREFER, 10_000);
    if (st.sessMs > 20 * 60_000) break;
  }

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
  logObj.criteria.fundingPurchaseCountGe1 = (fp.count ?? 0) >= 1;
  logObj.criteria.fundingPurchaseCountMatchesList =
    (fp.count ?? 0) === (fp.list?.length ?? 0);

  if (!logObj.markers.ready) logObj.markers.ready = await snap(page);
  logObj.shots.push(await shot(page, `${SHOT_PREFIX}-02-ready.png`));
  log(
    `  → READY @ ${(logObj.markers.ready.sessMs / 60000).toFixed(2)}min, fundingPurchases=${fp.count}`,
  );

  const fundingDurMs =
    (logObj.markers.ready?.sessMs ?? 0) -
    (logObj.markers.policySelected?.sessMs ??
      logObj.markers.atPolicyChoice?.sessMs ??
      0);
  logObj.notes.atReady = {
    snap: logObj.markers.ready,
    fundingDurationMs: fundingDurMs,
    fundingDuration_s: +(fundingDurMs / 1000).toFixed(1),
    cash: logObj.markers.ready.coins,
    fundTarget: logObj.markers.ready.fundTarget,
    fundingRef: logObj.markers.ready.fundingRef,
    contribution: logObj.markers.ready.contribution,
    buildBandMin: +(logObj.markers.ready.sessMs / 60000).toFixed(2),
    fundingPurchaseCount: fp.count,
    fundingPurchases: fp.list,
  };
  logObj.criteria.fundingReadyBand150_220 =
    fundingDurMs >= 150_000 && fundingDurMs <= 220_000;

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

  const buildMin = logObj.notes.atReady.buildBandMin;
  logObj.criteria.buildFloor975 = buildMin >= 9.75;
  // M-C.3.1: FAST hard acceptance ≥9.75 and ≤11.5; 9.75–10.0 = sim tolerance (PASS)
  logObj.criteria.buildBand10_115 = buildMin >= 9.75 && buildMin <= 11.5;
  logObj.criteria.buildBandNominal10_115 = buildMin >= 10 && buildMin <= 11.5;
  logObj.notes.buildBandClassification =
    buildMin >= 10 && buildMin <= 11.5
      ? 'nominal'
      : buildMin >= 9.75 && buildMin < 10
        ? 'tolerance_975_10'
        : buildMin > 11.5
          ? 'above_band'
          : 'below_floor';

  // First phone → sampling → launch
  for (let i = 0; i < 50; i++) {
    const st = await snap(page);
    if (st.firstPhone || st.mcPhase === 'smartphone_launch') {
      logObj.markers.firstPhone = st;
      break;
    }
    await advanceIdle(page, 250);
  }
  if (!logObj.markers.firstPhone) logObj.markers.firstPhone = await snap(page);

  for (let i = 0; i < 80; i++) {
    const st = await snap(page);
    if (st.mcPhase === 'baseline_sampling' && !logObj.markers.baselineSamplingStart) {
      logObj.markers.baselineSamplingStart = st;
      break;
    }
    if (st.mcPhase === 'smartphone_launch') break;
    await advanceIdle(page, 250);
  }

  const batchAtLaunchStart = (await snap(page)).launchBatchProgress;
  const launchPlay = await commissioningLaunchAction(page, BRANCH);
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

  // Proof progress → SAVE/RELOAD (hydration)
  log('  → proof_batch reload after MARGIN action…');
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
  const beforeProof = await snap(page);
  logObj.markers.beforeProofReload = beforeProof;
  logObj.shots.push(
    await shot(page, `${SHOT_PREFIX}-03-launch-before-reload.png`),
  );
  const rr = await saveReload(page);
  logObj.markers.afterProofReload = rr.after;
  logObj.shots.push(
    await shot(page, `${SHOT_PREFIX}-04-launch-after-reload.png`),
  );
  logObj.notes.proofReload = {
    phaseBeforeSave: beforeProof.mcPhase,
    batchBefore: beforeProof.launchBatchProgress,
    gateBefore: beforeProof.launchActionGate,
    targetBefore: beforeProof.launchBatchTarget,
    phaseAfterLoad: rr.after.mcPhase,
    batchAfter: rr.after.launchBatchProgress,
    gateAfter: rr.after.launchActionGate,
    targetAfter: rr.after.launchBatchTarget,
    phaseOkBoth:
      beforeProof.mcPhase === 'smartphone_launch' &&
      rr.after.mcPhase === 'smartphone_launch',
    gatePreserved: rr.after.launchActionGate === beforeProof.launchActionGate,
    targetUnchanged: rr.after.launchBatchTarget === beforeProof.launchBatchTarget,
    batchPreserved:
      rr.after.launchBatchProgress === beforeProof.launchBatchProgress,
    noBackToSampling: rr.after.mcPhase !== 'baseline_sampling',
    noReturn: !rr.after.returnStarted && rr.after.mcPhase !== 'return_challenge',
    hydrate: rr.hydrate,
    afterFirstStep: rr.afterFirstStep,
    progressBeforeSave: rr.hydrate.launchProgressBeforeSave,
    progressAfterHydrate: rr.hydrate.launchProgressAfterHydrate,
    hydrationProgressDelta: rr.hydrate.hydrationProgressDelta,
  };
  logObj.criteria.proofPhaseSmartphoneLaunchBoth =
    logObj.notes.proofReload.phaseOkBoth;
  logObj.criteria.proofGateTargetSame =
    logObj.notes.proofReload.gatePreserved &&
    logObj.notes.proofReload.targetUnchanged;
  logObj.criteria.proofProgressAfterHydrateEqualsBefore =
    rr.hydrate.launchProgressAfterHydrate ===
      rr.hydrate.launchProgressBeforeSave ||
    rr.after.launchBatchProgress === beforeProof.launchBatchProgress;
  logObj.criteria.proofHydrationProgressDelta0 =
    rr.hydrate.hydrationProgressDelta === 0;
  logObj.criteria.proofNoSampling = logObj.notes.proofReload.noBackToSampling;
  logObj.criteria.proofNoReturn = logObj.notes.proofReload.noReturn;

  // Finish launch → Shift1
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
      }, PREFER);
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
    duration_s: +(launchDur / 1000).toFixed(1),
    minGateMs: logObj.markers.shift1.launchMinGateMs,
  };
  // ~60–120s with events
  logObj.criteria.launchDurationBand60_120 =
    launchDur >= 60_000 && launchDur <= 120_000;
  logObj.criteria.shift1Immediate =
    logObj.markers.shift1.shift1 === true ||
    logObj.markers.shift1.mcPhase === 'return_preview';
  logObj.criteria.returnNotSameSession = !logObj.markers.shift1.returnStarted;
  log(`  → Shift1 @ ${(launchEnd / 60000).toFixed(2)}min (launch ${s(launchDur)}s)`);

  // Reload → Return
  log('  → reload → RETURN…');
  const retReload = await saveReload(page);
  logObj.markers.afterReturnReload = retReload.after;
  logObj.criteria.returnAppearsOnReload =
    retReload.after.mcPhase === 'return_challenge' &&
    retReload.after.returnStarted === true;
  logObj.criteria.returnKindMargin = retReload.after.returnKind === 'margin';

  await advanceIdle(page, 3_000);
  const afterGrace = await snap(page);
  logObj.criteria.returnNoAutocompleteGrace = !afterGrace.returnDone;

  const returnStart = afterGrace.sessMs;
  logObj.notes.returnProgressSamples = [];
  logObj.notes.returnOrderRecords = [];
  logObj.notes.returnOrderTransitions = [];
  logObj.notes.returnLabelSamples = [];
  logObj.notes.capacityFeedbackSamples = [];
  logObj.notes.orderGaps = [];
  const seenOrders = new Set();
  let lastSummaryCount = 0;
  let freeBeforeThree = false;
  let prevOrderTarget = null;
  let prevOrderCompleteMs = null;
  let orderShotTaken = { 1: false, 2: false, 3: false };
  let microcopyMismatch = false;
  const sampleAts = [30_000, 60_000, 90_000];
  const sampled = new Set();

  log('  → playing return MARGIN orders…');
  for (let i = 0; i < 800; i++) {
    const st = await snap(page);
    const elapsed = st.sessMs - returnStart;

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
          st.label.includes('COMPLETE') ||
          st.label.includes('increased') ||
          st.label.includes('capacity'));
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
        label: st.label,
      });
    }

    // Capture order shots on phase entry
    if (st.returnPhase === 'order_1' && !orderShotTaken[1]) {
      orderShotTaken[1] = true;
      logObj.shots.push(await shot(page, `${SHOT_PREFIX}-05-order1.png`));
    }
    if (st.returnPhase === 'order_2' && !orderShotTaken[2]) {
      orderShotTaken[2] = true;
      logObj.shots.push(await shot(page, `${SHOT_PREFIX}-06-order2.png`));
    }
    if (st.returnPhase === 'order_3' && !orderShotTaken[3]) {
      orderShotTaken[3] = true;
      logObj.shots.push(await shot(page, `${SHOT_PREFIX}-07-final-order.png`));
    }

    const summaries = st.completedOrderSummaries || [];
    if (summaries.length > lastSummaryCount) {
      for (let oi = lastSummaryCount; oi < summaries.length; oi++) {
        const sum = summaries[oi];
        const target = sum.target ?? sum.batchTarget ?? null;
        const change = classifyTargetChange(prevOrderTarget, target);
        const gapMs =
          prevOrderCompleteMs != null
            ? st.sessMs - prevOrderCompleteMs
            : null;
        const labelLower = (st.label || '').toLowerCase();
        const copySaysIncreased =
          labelLower.includes('increased') ||
          labelLower.includes('next customer order increased');
        const copyMismatch =
          change.classification === 'decreased' && copySaysIncreased;
        if (copyMismatch) microcopyMismatch = true;

        const rec = {
          ...sum,
          observedAtSessMs: st.sessMs,
          durationMs: sum.durationMs ?? sum.activeSimulationMs ?? null,
          orderIndex: sum.orderIndex ?? oi + 1,
          target,
          prevTarget: prevOrderTarget,
          targetChange: change,
          gapFromPrevOrderMs: gapMs,
          capacityFeedback: st.capacityFeedback,
          label: st.label,
          copySaysIncreased,
          copyMismatch,
        };
        logObj.notes.returnOrderRecords.push(rec);
        logObj.notes.returnOrderTransitions.push({
          fromOrder: oi,
          toOrder: oi + 1,
          prevTarget: prevOrderTarget,
          nextTarget: target,
          ...change,
          gapMs,
          capacityFeedback: st.capacityFeedback,
          label: st.label,
          copyMismatch,
        });
        if (gapMs != null) {
          logObj.notes.orderGaps.push({
            afterOrder: oi + 1,
            gapMs,
            gap_s: +(gapMs / 1000).toFixed(1),
          });
        }
        log(
          `  → order ${rec.orderIndex} complete @ +${(elapsed / 1000).toFixed(0)}s target=${target} change=${change.classification} gap=${gapMs != null ? s(gapMs) + 's' : 'n/a'}`,
        );
        prevOrderTarget = target;
        prevOrderCompleteMs = st.sessMs;
      }
      lastSummaryCount = summaries.length;
    }

    // Also classify live next-order target vs previous when entering a new order
    if (
      !seenOrders.has(st.returnPhase) &&
      st.returnPhase &&
      (st.returnPhase === 'order_1' ||
        st.returnPhase === 'order_2' ||
        st.returnPhase === 'order_3')
    ) {
      seenOrders.add(st.returnPhase);
      const liveTarget = st.returnOrderTarget;
      if (prevOrderTarget != null && liveTarget != null) {
        const liveChange = classifyTargetChange(prevOrderTarget, liveTarget);
        const labelLower = (st.label || '').toLowerCase();
        const copySaysIncreased =
          labelLower.includes('increased') ||
          labelLower.includes('next customer order increased');
        if (
          liveChange.classification === 'decreased' &&
          copySaysIncreased
        ) {
          microcopyMismatch = true;
        }
        logObj.notes.returnOrderTransitions.push({
          kind: 'phase_enter',
          returnPhase: st.returnPhase,
          prevTarget: prevOrderTarget,
          nextTarget: liveTarget,
          ...liveChange,
          capacityFeedback: st.capacityFeedback,
          label: st.label,
          copySaysIncreased,
          copyMismatch:
            liveChange.classification === 'decreased' && copySaysIncreased,
        });
      }
      log(`  → returnPhase=${st.returnPhase} label="${st.label}"`);
    }

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

    if (st.returnDone || st.mcPhase === 'return_complete') {
      logObj.markers.returnDone = st;
      break;
    }

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
      }, PREFER);
    }
    await advance(page, 500, PREFER, 8_000);
  }

  if (!logObj.markers.returnDone) logObj.markers.returnDone = await snap(page);
  const returnDur = logObj.markers.returnDone.sessMs - returnStart;
  logObj.notes.returnDurationMs = returnDur;
  logObj.notes.returnDuration_s = +(returnDur / 1000).toFixed(1);
  log(
    `  → return done in ${s(returnDur)}s, orders=${logObj.markers.returnDone.completedOrderSummaries?.length ?? 0}`,
  );

  const finalSummaries =
    logObj.markers.returnDone.completedOrderSummaries || [];
  logObj.criteria.returnExactly3Orders = finalSummaries.length === 3;
  logObj.criteria.returnFreeNotBeforeThree = !freeBeforeThree;
  logObj.criteria.returnLabelsNeverEmpty = !logObj.notes.emptyLabelAt;
  logObj.criteria.returnInputSeen =
    logObj.markers.returnDone.returnInputSeen === true;

  // Duration: preferred 120–240; wide 120–300; 90–119 only if extreme documented; <90 FAIL
  const extremeEvents = await page.evaluate(() => {
    const f = window.__tfrGame.registry.get('game').factory;
    const ev = f.eventsSys;
    return {
      active: ev?.activeEvent?.type ?? ev?.current?.type ?? null,
      recent: (ev?.history || ev?.recentEvents || []).slice?.(-5) ?? null,
      suppressed: !!ev?.suppressed,
    };
  });
  logObj.notes.returnExtremeEvents = extremeEvents;

  let returnDurOk = false;
  let returnDurNote = 'OUT of band';
  let returnExtreme = null;
  if (returnDur < 90_000) {
    returnDurOk = false;
    returnDurNote = 'FAIL <90s';
  } else if (returnDur >= 90_000 && returnDur < 120_000) {
    const hasExtreme =
      !!extremeEvents?.active ||
      (Array.isArray(extremeEvents?.recent) &&
        extremeEvents.recent.length > 0);
    returnExtreme = hasExtreme
      ? 'extreme short 90–119s with event documented'
      : 'extreme short 90–119s WITHOUT documented event';
    returnDurOk = hasExtreme;
    returnDurNote = returnExtreme;
  } else if (returnDur >= 120_000 && returnDur <= 240_000) {
    returnDurOk = true;
    returnDurNote = 'preferred 120–240s';
  } else if (returnDur > 240_000 && returnDur <= 300_000) {
    returnDurOk = true;
    returnDurNote = 'wide band 240–300s (acceptable)';
  } else {
    returnDurOk = false;
    returnDurNote = 'OUT >300s';
  }
  logObj.notes.returnDurationNote = returnDurNote;
  logObj.notes.returnDurationExtreme = returnExtreme;
  logObj.criteria.returnDurationBand = returnDurOk;
  logObj.criteria.returnDurationPreferred120_240 =
    returnDur >= 120_000 && returnDur <= 240_000;
  logObj.criteria.returnNotUnder90 = returnDur >= 90_000;

  const rep = await sessionReport(page);
  logObj.notes.returnDiag = {
    ...(rep.returnDiag || {}),
    observedDuration_s: +(returnDur / 1000).toFixed(1),
    orderRecords: logObj.notes.returnOrderRecords,
    transitions: logObj.notes.returnOrderTransitions,
    capacityFeedbackSamples: logObj.notes.capacityFeedbackSamples,
    orderGaps: logObj.notes.orderGaps,
  };

  // Reward check ONLY (no FREE spend / BONUS fixtures)
  const rewardSnap = await snap(page);
  logObj.markers.atReward = rewardSnap;
  logObj.shots.push(await shot(page, `${SHOT_PREFIX}-08-reward.png`));

  const rewardId = rewardSnap.freeUpgradeRewardId;
  const rewardBeforeThree = freeBeforeThree;
  logObj.notes.rewardCheck = {
    freeCredits: rewardSnap.freeCredits,
    freeGranted: rewardSnap.freeGranted,
    freeUpgradeConsumed: rewardSnap.freeUpgradeConsumed,
    freeUpgradeRewardId: rewardId,
    ordersComplete: finalSummaries.length,
    freeBeforeThree: rewardBeforeThree,
    note: 'Observation only — FREE spend / BONUS fixtures NOT run',
  };
  logObj.criteria.rewardCredit1 =
    !!rewardSnap.freeGranted && rewardSnap.freeCredits === 1;
  logObj.criteria.rewardHasNewRewardId =
    rewardId != null && String(rewardId).length > 0;
  logObj.criteria.rewardOnlyAfter3of3 =
    finalSummaries.length === 3 && !rewardBeforeThree && !!rewardSnap.freeGranted;

  logObj.notes.microcopyPending = microcopyMismatch;
  logObj.criteria.microcopyTargetConsistent = !microcopyMismatch;

  logObj.report = await sessionReport(page);
  logObj.end = await snap(page);

  // Pacing aggregate for verdict
  const pacingOk =
    logObj.criteria.contribution058 &&
    logObj.criteria.fundingPurchaseCountGe1 &&
    logObj.criteria.fundingPurchaseCountMatchesList &&
    logObj.criteria.fundingReadyBand150_220 &&
    logObj.criteria.buildFloor975 &&
    logObj.criteria.buildBand10_115 &&
    logObj.criteria.buildCashDelta0 &&
    logObj.criteria.proofPhaseSmartphoneLaunchBoth &&
    logObj.criteria.proofHydrationProgressDelta0 &&
    logObj.criteria.proofProgressAfterHydrateEqualsBefore &&
    logObj.criteria.launchDurationBand60_120 &&
    logObj.criteria.returnExactly3Orders &&
    logObj.criteria.returnDurationBand &&
    logObj.criteria.rewardOnlyAfter3of3;
  logObj.notes.pacingOk = pacingOk;

  log('=== Part B clean done ===\n');
  return logObj;
}

// ---- main ----
log(`M-C.3 Part B CLEAN isolation → ${URL}`);
log(`runId=${runId}`);
log('(sessionMs criteria; observation only; no FREE/BONUS fixtures)\n');

const report = {
  runId,
  url: URL,
  viewport: VIEWPORT,
  branch: BRANCH,
  prefer: PREFER,
  policy: POLICY,
  events: 'on',
  isolationFail: false,
  partBIsolationProof: null,
  isolationEval: null,
  shots: [],
  criteria: {},
  notes: {},
  markers: {},
  overallVerdict: null,
  createdAt: new Date().toISOString(),
};

const browser = await chromium.launch({ headless: true });
let context = null;
let exitCode = 0;

try {
  context = await browser.newContext({
    viewport: VIEWPORT,
    serviceWorkers: 'block',
    // NO storageState — exclusive clean context
  });
  const page = await context.newPage();

  log('=== Isolation boot ===');
  await bootIsolated(page);

  const proof = await buildPartBIsolationProof(page);
  report.partBIsolationProof = proof;
  const iso = evaluateIsolation(proof);
  report.isolationEval = iso;
  log(`  isolation ok=${iso.ok} fails=${iso.fails.join('; ') || '(none)'}`);
  log(
    `  sessionMs=${proof.sessionMs} branch=${proof.selectedBranch} mcPhase=${proof.mcPhase} policy=${proof.fundingPolicy}`,
  );

  report.shots.push(await shot(page, `${SHOT_PREFIX}-00-isolation.png`));

  if (!iso.ok) {
    report.isolationFail = true;
    report.overallVerdict = 'harness isolation falló nuevamente';
    report.notes.abortReason = iso.fails;
    writeReport(report);
    log(`overallVerdict: ${report.overallVerdict}`);
    exitCode = 2;
  } else {
    log('\n=== Gameplay Part B MARGIN (isolation OK) ===');
    const part = await runPartB(page, report);
    report.criteria = part.criteria;
    report.notes = { ...report.notes, ...part.notes };
    report.markers = part.markers;
    report.fundBuys = part.fundBuys;
    report.fundingPurchasesAtReady = part.notes.fundingPurchasesAtReady;
    report.atReady = part.notes.atReady;
    report.build = part.notes.build;
    report.proofReload = part.notes.proofReload;
    report.launchTiming = part.notes.launchTiming;
    report.returnDuration_s = part.notes.returnDuration_s;
    report.returnDurationNote = part.notes.returnDurationNote;
    report.returnDurationExtreme = part.notes.returnDurationExtreme;
    report.returnOrderRecords = part.notes.returnOrderRecords;
    report.returnOrderTransitions = part.notes.returnOrderTransitions;
    report.rewardCheck = part.notes.rewardCheck;
    report.sessionReport = part.report;
    report.end = part.end;
    report.verdictScore = score(part.criteria);
    report.overallVerdict = computeOverallVerdict(part.criteria, part.notes);

    writeReport(report);
    log(`\n========== OVERALL ==========`);
    log(`overallVerdict: ${report.overallVerdict}`);
    log(
      `criteria ${report.verdictScore.pass}/${report.verdictScore.total} fail: ${report.verdictScore.fail.join(', ') || '(none)'}`,
    );
    log(
      JSON.stringify(
        {
          overallVerdict: report.overallVerdict,
          contribution: report.atReady?.contribution,
          fundingPurchaseCount: report.fundingPurchasesAtReady?.count,
          ready_min: report.atReady?.buildBandMin,
          fundingDuration_s: report.atReady?.fundingDuration_s,
          launchDur_s: report.launchTiming?.duration_s,
          returnDur_s: report.returnDuration_s,
          returnNote: report.returnDurationNote,
          returnOrders: report.returnOrderRecords?.length,
          reward: report.rewardCheck,
          fail: report.verdictScore.fail,
        },
        null,
        2,
      ),
    );

    if (
      report.overallVerdict === 'necesita corrección funcional MARGIN' ||
      report.overallVerdict === 'harness isolation falló nuevamente'
    ) {
      exitCode = 1;
    }
  }
} catch (err) {
  report.notes.fatalError = String(err?.stack || err);
  report.overallVerdict =
    report.overallVerdict || 'necesita corrección funcional MARGIN';
  try {
    writeReport(report);
  } catch {
    /* ignore */
  }
  console.error(err);
  exitCode = 1;
} finally {
  try {
    if (context) await context.close();
  } catch {
    /* ignore */
  }
  try {
    await browser.close();
  } catch {
    /* ignore */
  }
}

process.exit(exitCode);
