/**
 * M-C.1 human-style validation — SESSION TIME (not wall clock).
 * Part A: Throughput + Balanced 55%, events OFF, 907×510
 * Part B: Margin + Fast 78%, events ON, 390×844
 *
 * SMOKE_URL=http://127.0.0.1:5174/ node scripts/validate-mc1-final.mjs
 *
 * Criteria: adaptive funding bands, commissioning Launch (1 relevant action,
 * no minElapsed), cumulative Return 2–5 min, free upgrade ± BONUS TIER.
 */
import { chromium } from 'playwright';
import fs from 'fs';

const URL = process.env.SMOKE_URL ?? 'http://127.0.0.1:5174/';
const THR = 650;

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
      launchHoldMs: Math.round(mc.launchHoldMs ?? 0),
      launchBaselineTp: mc.launchBaseline?.outputPerMin ?? mc.launchBaselineOutput,
      launchBaselineIncome:
        mc.launchBaseline?.lineIncomePerMin ?? mc.launchBaselineIncome,
      launchMinGateMs: mc.launchMinGateReachedMs,
      shift1: mc.shift1Complete,
      freeCredits: mc.freeUpgradeCredits,
      freeGranted: mc.freeUpgradeGranted,
      freeUsed: mc.freeUpgradeUsed,
      freeMode: mc.freeUpgradeMode,
      bonusGranted: mc.bonusUpgradeGranted,
      returnStarted: mc.returnChallengeStarted,
      returnDone: mc.returnChallengeComplete,
      returnKind: mc.returnChallenge?.kind ?? null,
      returnProgress: mc.returnChallenge?.batchProgress ?? 0,
      returnTarget: mc.returnChallenge?.batchTarget ?? 0,
      cashAtBuild: mc.cashAtBuild,
      markers: mc.campaignMarkers ?? null,
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

        // Never auto-buy during funding_choice / sampling / launch (manual protocol)
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
  return { before, after };
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
  const log = { markers: {}, notes: {}, fundBuys: [], criteria: {} };
  log.markers.stage1 = await reachChoice(page, prefer);
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
      log.markers.convergence = st;
      break;
    }
    await advance(page, 1500, prefer, 9_000);
  }

  if (eventsOff) {
    await page.evaluate(() => {
      window.__tfrGame.registry.get('game').factory.eventsSys.suppress();
    });
    log.notes.events = 'off';
  } else {
    await page.evaluate(() => {
      window.__tfrGame.registry.get('game').factory.eventsSys.resume();
    });
    log.notes.events = 'on';
  }

  for (let i = 0; i < 300; i++) {
    const st = await snap(page);
    if (st.earned >= THR && !log.markers.toysThreshold) log.markers.toysThreshold = st;
    if (st.canOpenToys) {
      log.markers.toysReady = st;
      break;
    }
    if (st.sessMs > 12 * 60_000) break;
    await advance(page, 2000, prefer, 9_000);
  }

  log.markers.beforeOpen = await snap(page);
  await page.evaluate(() => {
    window.__tfrGame.registry.get('game').factory.tryUnlockNext();
  });
  log.markers.afterOpen = await snap(page);

  // First toy + mastery
  for (let i = 0; i < 40; i++) {
    const st = await snap(page);
    if (st.phase === 'toy_mastery' || st.mcPhase === 'funding_choice') break;
    await advance(page, 500, prefer, 8_000);
  }
  log.markers.masteryShown = await snap(page);

  for (let i = 0; i < 400; i++) {
    const st = await snap(page);
    if (st.mcPhase === 'funding_choice') {
      log.markers.fundingChoice = st;
      break;
    }
    if (st.phase === 'smartphones_horizon' && st.mcPhase === 'funding_choice') {
      log.markers.fundingChoice = st;
      break;
    }
    await advance(page, 500, prefer, 8_000);
  }
  return log;
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
  } = cfg;

  await bootClean(page, viewport);
  const log = await playToFundingChoice(page, branch, prefer, eventsOff);
  log.id = id;
  log.branch = branch;
  log.policy = policy;
  log.viewport = viewport;
  log.shots = [];

  // --- Funding choice ---
  log.shots.push(await shot(page, `${shotPrefix}-01-policy-choice.png`));
  log.markers.atPolicyChoice = await snap(page);
  log.notes.policyUiClear =
    (log.markers.atPolicyChoice.label || '').includes('55') ||
    (log.markers.atPolicyChoice.label || '').includes('78') ||
    (log.markers.atPolicyChoice.label || '').includes('BALANCED') ||
    (log.markers.atPolicyChoice.label || '').includes('FAST') ||
    (log.markers.atPolicyChoice.label || '').includes('FUND');

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
      },
      built: f.mc.state.smartphonesBuilt,
    };
  }, policy);
  log.notes.policySelect = policyPick;
  log.markers.policySelected = await snap(page);
  log.criteria.selectNeverBuilds = !policyPick.built && policyPick.after.phase === 'smartphone_funding';
  log.criteria.policyLocked = !!policyPick.after.locked;
  log.criteria.adaptiveTargetLocked =
    !!policyPick.after.fundTarget &&
    policyPick.after.fundTarget > 0 &&
    !!policyPick.after.fundingRef &&
    policyPick.after.fundingRef > 0;
  log.criteria.contributionBand =
    policy === 'fast'
      ? policyPick.after.contribution >= 0.72 &&
        policyPick.after.contribution <= 0.82
      : policyPick.after.contribution >= 0.5 &&
        policyPick.after.contribution <= 0.65;

  // Early BUILD attempt (no-op)
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
  log.criteria.buildBeforeReadyNoop = earlyBuild.events === 0 && !earlyBuild.built;
  log.notes.earlyBuild = earlyBuild;

  // Funding upgrades; track fund never decreases (Balanced 2–3, Fast ≥1)
  log.shots.push(await shot(page, `${shotPrefix}-02-funding.png`));
  let fundBuys = 0;
  let midReloaded = false;
  for (let i = 0; i < 400; i++) {
    const st = await snap(page);
    if (st.mcPhase === 'smartphone_ready') {
      log.markers.ready = st;
      break;
    }

    // Mid-funding reload (Part A)
    if (
      midReloadPhase === 'funding' &&
      !midReloaded &&
      st.fund >= st.fundTarget * 0.45 &&
      st.fund < st.fundTarget
    ) {
      log.markers.beforeMidFundingReload = st;
      const rr = await saveReload(page);
      log.markers.afterMidFundingReload = rr.after;
      log.notes.midFundingReload = {
        fundBefore: rr.before.fund,
        fundAfter: rr.after.fund,
        policyAfter: rr.after.fundingPolicy,
        phaseAfter: rr.after.mcPhase,
        preserved:
          rr.after.fundingPolicy === policy &&
          rr.after.fund >= rr.before.fund - 1 &&
          (rr.after.mcPhase === 'smartphone_funding' ||
            rr.after.mcPhase === 'smartphone_ready'),
      };
      if (eventsOff) {
        await page.evaluate(() => {
          window.__tfrGame.registry.get('game').factory.eventsSys.suppress();
        });
      }
      midReloaded = true;
    }

    // Buy upgrades during funding (at least 3), record fund before/after
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
        return { ok: false, fundBefore: Math.floor(fundBefore), fundAfter: Math.floor(f.mc.state.smartphoneFund) };
      }, prefer);
      if (buy.ok) {
        fundBuys += 1;
        log.fundBuys.push(buy);
      }
    }

    // Try change policy — should fail
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
      log.criteria.policyChangeRejected = change.rejected;
      log.notes.policyChangeAttempt = change;
    }

    await advance(page, 1500, prefer, midReloadPhase === 'funding' ? 12_000 : 10_000);
    if (st.sessMs > 20 * 60_000) break;
  }

  log.criteria.fundNeverDecreased = log.fundBuys.every(
    (b) => b.fundAfter >= b.fundBefore,
  );
  log.criteria.fundingUpgradeAvailability =
    policy === 'fast'
      ? log.fundBuys.length >= 1
      : log.fundBuys.length >= 2;

  if (!log.markers.ready) log.markers.ready = await snap(page);
  log.shots.push(await shot(page, `${shotPrefix}-03-ready.png`));

  const readyReport = await sessionReport(page);
  const fundingDurMs =
    (log.markers.ready?.sessMs ?? 0) -
    (log.markers.policySelected?.sessMs ??
      log.markers.atPolicyChoice?.sessMs ??
      0);
  log.notes.atReady = {
    snap: log.markers.ready,
    fundReadyMs:
      readyReport.fundReadyMs ??
      readyReport.campaignMarkers?.fundReadyCampaignMs,
    fundingDurationMs: fundingDurMs,
    fundingDuration_s: +(fundingDurMs / 1000).toFixed(1),
    cash: log.markers.ready.coins,
    earned: log.markers.ready.earned,
    ups: log.markers.ready.ups,
    fundTarget: log.markers.ready.fundTarget,
    fundingRef: log.markers.ready.fundingRef,
    contribution: log.markers.ready.contribution,
    buildBandMin: +(log.markers.ready.sessMs / 60000).toFixed(2),
  };
  log.criteria.fundingReadyBand =
    policy === 'fast'
      ? fundingDurMs >= 150_000 && fundingDurMs <= 220_000
      : fundingDurMs >= 190_000 && fundingDurMs <= 280_000;

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
  log.notes.build = build;
  log.markers.afterBuild = await snap(page);
  log.criteria.buildCashDelta0 = build.cashDelta === 0;
  log.criteria.buildPolicyUnchanged = build.policyUnchanged;
  log.criteria.buildOnce = build.built;

  // Second BUILD no-op
  const build2 = await page.evaluate(() => {
    const f = window.__tfrGame.registry.get('game').factory;
    const ev = f.mc.buildSmartphoneLine(f);
    return { events: ev.length, phase: f.mc.phase };
  });
  log.criteria.buildIdempotent = build2.events === 0;
  log.notes.secondBuild = build2;

  // Selector hidden after build
  log.criteria.selectorGone =
    log.markers.afterBuild.mcPhase !== 'funding_choice' &&
    log.markers.afterBuild.policyLocked === true;

  // First smartphone ≤10s
  const buildMs = build.sessMs;
  for (let i = 0; i < 50; i++) {
    const st = await snap(page);
    if (st.firstPhone || st.mcPhase === 'smartphone_launch') {
      log.markers.firstPhone = st;
      break;
    }
    await advanceIdle(page, 250);
  }
  if (!log.markers.firstPhone) log.markers.firstPhone = await snap(page);
  log.shots.push(await shot(page, `${shotPrefix}-04-first-phone.png`));
  const firstDelta =
    (log.markers.firstPhone.sessMs ?? 0) - (log.markers.afterBuild.sessMs ?? buildMs);
  log.notes.firstPhone = {
    deltaMs: firstDelta,
    visual: {
      product: log.markers.firstPhone.product,
      baseValue: log.markers.firstPhone.baseValue,
      income: log.markers.firstPhone.income,
      incomeAtBuild: log.markers.afterBuild.income,
    },
    label: log.markers.firstPhone.label,
  };
  log.criteria.firstPhoneLe10s = firstDelta <= 10_000;
  log.criteria.entersBaselineOrLaunch =
    log.markers.firstPhone.mcPhase === 'baseline_sampling' ||
    log.markers.firstPhone.mcPhase === 'smartphone_launch' ||
    log.markers.firstPhone.mcPhase === 'first_smartphone';

  // Observe launch then 2 justified buys
  await advanceIdle(page, 3_000);
  log.shots.push(await shot(page, `${shotPrefix}-05-launch.png`));
  log.markers.launchObserve = await snap(page);

  // Mid-launch reload (Part B)
  if (midReloadPhase === 'launch') {
    log.markers.beforeLaunchReload = await snap(page);
    const rr = await saveReload(page);
    log.markers.afterLaunchReload = rr.after;
    log.notes.launchReload = {
      actionsBefore: rr.before.launchActions,
      actionsAfter: rr.after.launchActions,
      progressBefore: rr.before.launchProgress,
      progressAfter: rr.after.launchProgress,
      noDuplicateActions: rr.after.launchActions <= rr.before.launchActions,
      phaseOk: rr.after.mcPhase === 'smartphone_launch',
    };
    log.criteria.launchReloadPreserves =
      log.notes.launchReload.phaseOk && log.notes.launchReload.noDuplicateActions;
  }

  const batchAtLaunchStart = (await snap(page)).launchBatchProgress;
  const launchPlay = await commissioningLaunchAction(page, branch);
  log.notes.launchPlay = launchPlay;
  log.notes.batchAtLaunchArm = batchAtLaunchStart;
  log.criteria.salesTapsDontQualify = !!launchPlay.nonQualify.salesDidNotCount;
  log.criteria.wrongActionDoesNotQualify =
    launchPlay.buys.find((b) => b.kind === 'wrong')?.wrongDidNotComplete !==
    false;
  const correct = launchPlay.buys.find((b) => b.kind === 'correct');
  const gateAfterAction = (await snap(page)).launchActionGate;
  log.criteria.oneRelevantActionQualifies =
    launchPlay.observe.gate === 'waived_at_cap' ||
    gateAfterAction === 'waived_at_cap' ||
    gateAfterAction === 'complete' ||
    (correct?.ok && correct.after?.gate === 'complete');

  // Finish commissioning launch by idle batch progress (no timer gate)
  const launchStart = log.markers.firstPhone.sessMs;
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
      log.markers.shift1 = st;
      break;
    }
    // If still pending action, retry recommended once in a while
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
  if (!log.markers.shift1) log.markers.shift1 = await snap(page);

  const launchEnd = log.markers.shift1.sessMs;
  const launchDur = launchEnd - launchStart;
  log.notes.launchTiming = {
    launchStartMs: launchStart,
    actionDoneMs,
    batchFullMs,
    launchCompleteMs: launchEnd,
    durationMs: launchDur,
    minGateMs: log.markers.shift1.launchMinGateMs,
  };
  const eventsOn = !eventsOff;
  log.criteria.launchDurationBand = eventsOn
    ? launchDur >= 50_000 && launchDur <= 140_000
    : launchDur >= 70_000 && launchDur <= 150_000;
  log.criteria.launchNotElapsedTimer =
    log.markers.shift1.launchMinGateMs == null ||
    log.notes.launchTiming.minGateMs == null;
  log.criteria.launchCompletedByBatchNotIdleTimer =
    batchFullMs != null && actionDoneMs != null;
  log.notes.launchProductFeel = {
    mode: 'commissioning',
    wrongActionBlocked: log.criteria.wrongActionDoesNotQualify,
    relevantAction: log.criteria.oneRelevantActionQualifies,
    feltLikeForcedWait: 'should be NO — no minElapsed/hold gates',
  };

  // Shift 1 / return preview
  log.criteria.shift1Immediate =
    log.markers.shift1.shift1 === true ||
    log.markers.shift1.mcPhase === 'return_preview';
  log.criteria.noEmptyLabel = !log.markers.shift1.labelEmpty;
  log.criteria.returnNotSameSession = !log.markers.shift1.returnStarted;
  log.shots.push(await shot(page, `${shotPrefix}-06-shift1-preview.png`));

  // Reload → return challenge
  const retReload = await saveReload(page);
  log.markers.afterReturnReload = retReload.after;
  log.criteria.returnAppearsOnReload =
    retReload.after.mcPhase === 'return_challenge' &&
    retReload.after.returnStarted === true;
  log.criteria.returnKindMatches =
    (branch === 'throughput' && retReload.after.returnKind === 'flow') ||
    (branch === 'margin' && retReload.after.returnKind === 'margin');
  log.shots.push(await shot(page, `${shotPrefix}-07-return.png`));

  // Grace: should not autocomplete immediately
  await advanceIdle(page, 3_000);
  const afterGrace = await snap(page);
  log.criteria.returnNoAutocompleteGrace = !afterGrace.returnDone;

  // Complete return (need real upgrades + time)
  const returnStart = afterGrace.sessMs;
  for (let i = 0; i < 600; i++) {
    const st = await snap(page);
    if (st.returnDone || st.mcPhase === 'return_complete') {
      log.markers.returnDone = st;
      break;
    }
    if (i % 10 === 0) {
      await page.evaluate((pref) => {
        const f = window.__tfrGame.registry.get('game').factory;
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
        // If broke, small top-up for play (not to skip challenge)
        if (f.economy.coins < 50) f.economy.coins += 80;
        return false;
      }, prefer);
    }
    await advance(page, 500, prefer, 8_000);
  }
  if (!log.markers.returnDone) log.markers.returnDone = await snap(page);
  const returnDur = log.markers.returnDone.sessMs - returnStart;
  log.notes.returnDurationMs = returnDur;
  log.criteria.returnDuration2_5min =
    returnDur >= 90_000 && returnDur <= 5 * 60_000;
  log.criteria.freeUpgradeGranted =
    log.markers.returnDone.freeGranted &&
    log.markers.returnDone.freeCredits >= 1;

  // Reload before spending free upgrade
  const preSpendReload = await saveReload(page);
  log.markers.afterFreeCreditReload = preSpendReload.after;
  log.criteria.freeCreditSurvivesReload =
    preSpendReload.after.freeCredits >= 1 &&
    preSpendReload.after.freeGranted === true;
  log.shots.push(await shot(page, `${shotPrefix}-08-free-upgrade.png`));

  // Spend free upgrade — prefer unaffordable cost
  const spend = await page.evaluate(() => {
    const f = window.__tfrGame.registry.get('game').factory;
    // Find expensive upgrade
    let best = null;
    for (const type of ['speed', 'value', 'buffer']) {
      for (const m of [1, 0, 2]) {
        if (type === 'buffer' && m === 2) continue;
        const cost = f.upgrades.costFor(m, type);
        const level = f.upgrades.getLevel(m, type);
        if (!best || cost > best.cost) best = { type, machine: m, cost, level };
      }
    }
    // Drain cash so free credit is required
    f.economy.coins = Math.min(f.economy.coins, Math.max(0, (best?.cost ?? 1) - 1));
    const cashBefore = f.economy.coins;
    const levelBefore = f.upgrades.getLevel(best.machine, best.type);
    const ok = f.buyUpgrade(best.machine, best.type);
    return {
      ok,
      type: best.type,
      machine: best.machine,
      costListed: best.cost,
      levelBefore,
      levelAfter: f.upgrades.getLevel(best.machine, best.type),
      cashBefore: Math.floor(cashBefore),
      cashAfter: Math.floor(f.economy.coins),
      cashDelta: Math.floor(f.economy.coins - cashBefore),
      creditsAfter: f.mc.state.freeUpgradeCredits,
      used: f.mc.state.freeUpgradeUsed,
    };
  });
  log.notes.freeSpend = spend;
  log.criteria.freeSpendCashDelta0 = spend.ok && spend.cashDelta === 0;
  log.criteria.freeConsumed = spend.creditsAfter === 0 && spend.used === true;

  // Reload again — no duplicate credit / upgrade
  const postSpendReload = await saveReload(page);
  log.markers.afterSpendReload = postSpendReload.after;
  log.criteria.noDuplicateFreeOnReload =
    postSpendReload.after.freeCredits === 0 &&
    postSpendReload.after.freeUsed === true &&
    postSpendReload.after.freeGranted === true;

  log.report = await sessionReport(page);
  log.end = await snap(page);

  // Absolute BUILD band + floor
  const buildMin = log.notes.atReady.buildBandMin;
  log.criteria.buildFloor975 = buildMin >= 9.75;
  log.criteria.buildBand =
    policy === 'fast'
      ? buildMin >= 10 && buildMin <= 11.5
      : buildMin >= 11 && buildMin <= 13;
  log.criteria.buildBandSoft = buildMin >= 9.75 && buildMin <= 13.5;

  // campaign markers present in report after completion
  log.criteria.campaignMarkersPresent =
    !!log.report?.campaignMarkers &&
    (log.report.campaignMarkers.fundingChoiceCampaignMs != null ||
      log.report.campaignMarkers.fundReadyCampaignMs != null);

  return log;
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
    toys_s: s(r.markers.toysReady?.sessMs),
    fundingChoice_s: s(r.markers.fundingChoice?.sessMs),
    policySelect: r.notes.policySelect?.after,
    fundBuys: r.fundBuys,
    midFundingReload: r.notes.midFundingReload ?? null,
    fundingDuration_s: r.notes.atReady?.fundingDuration_s,
    ready_s: s(r.markers.ready?.sessMs),
    ready_min: r.notes.atReady?.buildBandMin,
    fundTarget: r.notes.atReady?.fundTarget,
    fundingRef: r.notes.atReady?.fundingRef,
    contribution: r.notes.atReady?.contribution,
    build: r.notes.build,
    firstPhoneDelta_s: s(r.notes.firstPhone?.deltaMs),
    firstPhoneVisual: r.notes.firstPhone?.visual,
    launchReload: r.notes.launchReload ?? null,
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
    freeSpend: r.notes.freeSpend,
    criteria: r.criteria,
    report: r.report,
    shots: r.shots,
  };
}

const browser = await chromium.launch({ headless: true });
const results = {};

try {
  console.error('Part A — Throughput + Balanced, events OFF, 907×510…');
  {
    const page = await browser.newPage();
    results.partA = await runPart(page, {
      id: 'A_balanced_throughput',
      viewport: { width: 907, height: 510 },
      branch: 'throughput',
      prefer: 'speed',
      policy: 'balanced',
      eventsOff: true,
      midReloadPhase: 'funding',
      shotPrefix: 'validate-mc1-a',
    });
    await page.close();
  }

  console.error('Part B — Margin + Fast, events ON, 390×844…');
  {
    const page = await browser.newPage();
    results.partB = await runPart(page, {
      id: 'B_fast_margin',
      viewport: { width: 390, height: 844 },
      branch: 'margin',
      prefer: 'value',
      policy: 'fast',
      eventsOff: false,
      midReloadPhase: 'launch',
      shotPrefix: 'validate-mc1-b',
    });
    await page.close();
  }
} finally {
  await browser.close();
}

const out = {
  generatedAt: new Date().toISOString(),
  note: 'M-C.1 session-time Playwright validation; adaptive funding + commissioning Launch (1 relevant action).',
  partA: summarize(results.partA),
  partB: summarize(results.partB),
  raw: {
    partA_criteria: results.partA.criteria,
    partB_criteria: results.partB.criteria,
    partA_markers: Object.fromEntries(
      Object.entries(results.partA.markers).map(([k, v]) => [
        k,
        v && typeof v === 'object' ? { sessMs: v.sessMs, mcPhase: v.mcPhase, label: v.label } : v,
      ]),
    ),
    partB_markers: Object.fromEntries(
      Object.entries(results.partB.markers).map(([k, v]) => [
        k,
        v && typeof v === 'object' ? { sessMs: v.sessMs, mcPhase: v.mcPhase, label: v.label } : v,
      ]),
    ),
  },
};

// Cross-part Fast vs Balanced funding duration
const fundA = out.partA.fundingDuration_s;
const fundB = out.partB.fundingDuration_s;
out.cross = {
  fastFundingShorter:
    fundA != null && fundB != null ? fundB < fundA : null,
  fastFundingRatio:
    fundA && fundB ? +(fundB / fundA).toFixed(3) : null,
  bothBuildAboveFloor:
    out.partA.criteria.buildFloor975 && out.partB.criteria.buildFloor975,
};

function score(c) {
  const entries = Object.entries(c || {});
  const pass = entries.filter(([, v]) => v === true).length;
  return { pass, total: entries.length, fail: entries.filter(([, v]) => v === false).map(([k]) => k) };
}

out.verdict = {
  partA: score(out.partA.criteria),
  partB: score(out.partB.criteria),
  cross: out.cross,
};

fs.writeFileSync('validate-mc1-final.json', JSON.stringify(out, null, 2));
console.log(JSON.stringify({
  verdict: out.verdict,
  partA: {
    fundingDuration_s: out.partA.fundingDuration_s,
    ready_min: out.partA.ready_min,
    fundTarget: out.partA.fundTarget,
    contribution: out.partA.contribution,
    firstPhoneDelta_s: out.partA.firstPhoneDelta_s,
    launchDur_s: out.partA.launchTiming.duration_s,
    returnDur_s: out.partA.returnDuration_s,
    fail: out.verdict.partA.fail,
  },
  partB: {
    fundingDuration_s: out.partB.fundingDuration_s,
    ready_min: out.partB.ready_min,
    fundTarget: out.partB.fundTarget,
    contribution: out.partB.contribution,
    firstPhoneDelta_s: out.partB.firstPhoneDelta_s,
    launchDur_s: out.partB.launchTiming.duration_s,
    returnDur_s: out.partB.returnDuration_s,
    fail: out.verdict.partB.fail,
  },
}, null, 2));
