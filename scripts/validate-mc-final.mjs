/**
 * M-C final human-style validation — SESSION TIME (not wall clock).
 * Part A: Throughput + Balanced 68%, events OFF, 907×510
 * Part B: Margin + Fast 88%, events ON, 390×844
 *
 * SMOKE_URL=http://127.0.0.1:5174/ node scripts/validate-mc-final.mjs
 *
 * Does NOT modify game balance. Observes Launch with 2 justified buys only.
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
      phonesBuilt: mc.smartphonesBuilt,
      firstPhone: mc.firstSmartphoneProduced,
      launchActions: mc.launchActions,
      launchProgress: +(mc.launchProgress ?? 0).toFixed(3),
      launchHoldMs: Math.round(mc.launchHoldMs ?? 0),
      launchBaselineTp: mc.launchBaselineOutput,
      launchBaselineIncome: mc.launchBaselineIncome,
      launchMinGateMs: mc.launchMinGateReachedMs,
      shift1: mc.shift1Complete,
      freeCredits: mc.freeUpgradeCredits,
      freeGranted: mc.freeUpgradeGranted,
      freeUsed: mc.freeUpgradeUsed,
      returnStarted: mc.returnChallengeStarted,
      returnDone: mc.returnChallengeComplete,
      returnKind: mc.returnChallenge?.kind ?? null,
      cashAtBuild: mc.cashAtBuild,
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

        // Never auto-buy during funding_choice / launch (manual protocol)
        const mcPhase = f.mc.phase;
        const allowAuto =
          mcPhase !== 'funding_choice' &&
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

async function justifiedLaunchBuys(page, branch) {
  const buys = [];
  const observe = await page.evaluate(() => {
    const f = window.__tfrGame.registry.get('game').factory;
    const mc = f.mc.state;
    const cfg = {
      maxWip: 16,
      flowOut: mc.launchBaselineOutput * 0.95,
      flowInc: mc.launchBaselineIncome * 0.9,
      marginInc: mc.launchBaselineIncome * 0.95,
      marginOut: mc.launchBaselineOutput * 0.85,
    };
    const tp = f.getThroughputPerMin();
    const income = f.lineIncomePerMin();
    const wip = f.getWip();
    const bn = f.line.getBottleneckId();
    const failing = [];
    if (wip > cfg.maxWip) failing.push('WIP_HIGH');
    if (f.sessionGoal.selectedBranch === 'margin') {
      if (income < cfg.marginInc) failing.push('INCOME_LOW');
      if (tp < cfg.marginOut) failing.push('OUTPUT_LOW');
    } else {
      if (tp < cfg.flowOut) failing.push('OUTPUT_LOW');
      if (income < cfg.flowInc) failing.push('INCOME_LOW');
    }
    return {
      tp: +tp.toFixed(1),
      income: +income.toFixed(1),
      wip,
      bn,
      baselineTp: mc.launchBaselineOutput,
      baselineIncome: mc.launchBaselineIncome,
      failing,
      label: f.sessionLabel(),
      actions: mc.launchActions,
    };
  });

  // Exactly two justified purchases based on observation
  const plan = [];
  if (observe.failing.includes('WIP_HIGH') || observe.wip >= 12) {
    plan.push({ type: 'buffer', machine: observe.bn ?? 1, reason: 'reduce WIP / unblock' });
  }
  if (observe.failing.includes('OUTPUT_LOW') || branch === 'throughput') {
    plan.push({
      type: 'speed',
      machine: observe.bn ?? 1,
      reason: 'raise OUTPUT toward sustain baseline',
    });
  }
  if (observe.failing.includes('INCOME_LOW') || branch === 'margin') {
    plan.push({
      type: 'value',
      machine: 1,
      reason: 'raise LINE INCOME toward sustain baseline',
    });
  }
  // Ensure exactly 2 unique buys
  while (plan.length < 2) {
    plan.push({
      type: branch === 'margin' ? 'value' : 'speed',
      machine: 1,
      reason: 'support sustain KPIs (secondary)',
    });
  }
  const two = plan.slice(0, 2);

  for (const p of two) {
    const result = await page.evaluate(({ type, machine }) => {
      const f = window.__tfrGame.registry.get('game');
      const fac = f.factory;
      const t = f.telemetry;
      const before = {
        tp: fac.getThroughputPerMin(),
        income: fac.lineIncomePerMin(),
        wip: fac.getWip(),
        actions: fac.mc.state.launchActions,
        sessMs: fac.sessionMs,
        coins: fac.economy.coins,
      };
      const cost = fac.upgrades.costFor(machine, type);
      // Ensure affordability without breaking fund (post-build)
      if (!fac.economy.canAfford(cost)) {
        fac.economy.coins = Math.max(fac.economy.coins, cost);
      }
      const ok = fac.buyUpgrade(machine, type);
      if (ok) {
        t.upgradesBought = (t.upgradesBought || 0) + 1;
        t.upgradesByType[type] = (t.upgradesByType[type] || 0) + 1;
      }
      // settle a bit
      for (let i = 0; i < 8; i++) {
        t.update(200);
        fac.update(200);
      }
      const after = {
        tp: fac.getThroughputPerMin(),
        income: fac.lineIncomePerMin(),
        wip: fac.getWip(),
        actions: fac.mc.state.launchActions,
        sessMs: fac.sessionMs,
        coins: fac.economy.coins,
      };
      return { ok, cost, before, after, type, machine };
    }, p);
    buys.push({ ...p, ...result });
    await advanceIdle(page, 2_000);
  }

  // Verify sales/taps don't qualify
  const nonQualify = await page.evaluate(() => {
    const f = window.__tfrGame.registry.get('game').factory;
    const before = f.mc.state.launchActions;
    f.clickMachine(1);
    f.clickMachine(0);
    f.tryUnlockNext(); // BUILD no-op during launch
    // tick sales
    for (let i = 0; i < 20; i++) f.update(250);
    return {
      before,
      after: f.mc.state.launchActions,
      salesDidNotCount: f.mc.state.launchActions === before,
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
    (log.markers.atPolicyChoice.label || '').includes('68') ||
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
      },
      built: f.mc.state.smartphonesBuilt,
    };
  }, policy);
  log.notes.policySelect = policyPick;
  log.criteria.selectNeverBuilds = !policyPick.built && policyPick.after.phase === 'smartphone_funding';
  log.criteria.policyLocked = !!policyPick.after.locked;

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

  // Funding with ≥3 upgrades; track fund never decreases
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
    if (fundBuys < 3 && i % 3 === 0) {
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
  log.criteria.threeUpgradesDuringFunding = log.fundBuys.length >= 3;

  if (!log.markers.ready) log.markers.ready = await snap(page);
  log.shots.push(await shot(page, `${shotPrefix}-03-ready.png`));

  const readyReport = await sessionReport(page);
  log.notes.atReady = {
    snap: log.markers.ready,
    fundReadyMs: readyReport.fundReadyMs,
    cash: log.markers.ready.coins,
    earned: log.markers.ready.earned,
    ups: log.markers.ready.ups,
    buildBandMin: +(log.markers.ready.sessMs / 60000).toFixed(2),
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
  log.criteria.launchHudImmediate =
    log.markers.firstPhone.mcPhase === 'smartphone_launch' &&
    !log.markers.firstPhone.labelEmpty;

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

  const launchPlay = await justifiedLaunchBuys(page, branch);
  log.notes.launchPlay = launchPlay;
  log.criteria.salesTapsDontQualify = launchPlay.nonQualify.salesDidNotCount;
  log.criteria.twoQualifiedBuys =
    launchPlay.buys.filter((b) => b.ok).length === 2 &&
    (await snap(page)).launchActions >= 2;

  // Finish launch by sustaining (idle + occasional justified buy if stuck)
  const launchStart = log.markers.firstPhone.sessMs;
  let allKpisFirstMs = null;
  let secondActionMs = null;
  for (let i = 0; i < 400; i++) {
    const st = await snap(page);
    if (st.launchActions >= 2 && secondActionMs == null) {
      secondActionMs = st.sessMs;
    }
    const kpisOk = await page.evaluate(() => {
      const f = window.__tfrGame.registry.get('game').factory;
      const mc = f.mc.state;
      if (mc.phase !== 'smartphone_launch') return true;
      const tp = f.getThroughputPerMin();
      const income = f.lineIncomePerMin();
      const wip = f.getWip();
      if (wip > 16) return false;
      const branch = f.sessionGoal.selectedBranch;
      if (branch === 'margin') {
        return (
          income >= mc.launchBaselineIncome * 0.95 &&
          tp >= mc.launchBaselineOutput * 0.85
        );
      }
      return (
        tp >= mc.launchBaselineOutput * 0.95 &&
        income >= mc.launchBaselineIncome * 0.9
      );
    });
    if (kpisOk && allKpisFirstMs == null && st.mcPhase === 'smartphone_launch') {
      allKpisFirstMs = st.sessMs;
    }
    if (st.mcPhase === 'return_preview' || st.shift1 || st.mcPhase === 'shift_1_complete') {
      log.markers.shift1 = st;
      break;
    }
    // If actions < 2 somehow, buy once more
    if (st.launchActions < 2 && i % 20 === 10) {
      await page.evaluate((pref) => {
        const f = window.__tfrGame.registry.get('game').factory;
        const type = pref === 'speed' ? 'speed' : 'value';
        const cost = f.upgrades.costFor(1, type);
        if (!f.economy.canAfford(cost)) f.economy.coins += cost;
        f.buyUpgrade(1, type);
      }, prefer);
    }
    await advanceIdle(page, 500);
  }
  if (!log.markers.shift1) log.markers.shift1 = await snap(page);

  const launchEnd = log.markers.shift1.sessMs;
  const launchDur = launchEnd - launchStart;
  const waitAfterKpis =
    allKpisFirstMs != null ? launchEnd - allKpisFirstMs : null;
  log.notes.launchTiming = {
    launchStartMs: launchStart,
    secondActionMs,
    allKpisFirstMs,
    launchCompleteMs: launchEnd,
    durationMs: launchDur,
    waitAfterAllKpisMs: waitAfterKpis,
    minGateMs: log.markers.shift1.launchMinGateMs,
  };
  log.criteria.launchDuration80_150 =
    launchDur >= 80_000 && launchDur <= 150_000;
  log.criteria.launchNotPureWait = !(
    waitAfterKpis != null && waitAfterKpis >= 30_000
  );
  log.notes.launchProductFeel = {
    buysRespondedToVisibleProblem: launchPlay.observe.failing.length > 0
      ? launchPlay.buys.every((b) => b.reason)
      : 'PARTIAL — KPIs already near sustain at observe',
    feltLikeForcedWait:
      waitAfterKpis != null && waitAfterKpis >= 30_000
        ? 'YES — KPIs ok early, waited on timer'
        : 'NO or mild',
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

  // Build band
  const buildMin = log.notes.atReady.buildBandMin;
  log.criteria.buildBand =
    policy === 'fast'
      ? buildMin >= 10 && buildMin <= 11.5
      : buildMin >= 11 && buildMin <= 13;
  log.criteria.buildBandMax = buildMin >= 10 && buildMin <= 13.5;

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
    ready_s: s(r.markers.ready?.sessMs),
    ready_min: r.notes.atReady?.buildBandMin,
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
      waitAfterKpis_s: s(r.notes.launchTiming?.waitAfterAllKpisMs),
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
      shotPrefix: 'validate-mc-a',
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
      shotPrefix: 'validate-mc-b',
    });
    await page.close();
  }
} finally {
  await browser.close();
}

const out = {
  generatedAt: new Date().toISOString(),
  note: 'Session-time accelerated Playwright validation; Launch uses 2 justified buys then sustain.',
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

fs.writeFileSync('validate-mc-final.json', JSON.stringify(out, null, 2));
console.log(JSON.stringify({
  partA: {
    ready_min: out.partA.ready_min,
    firstPhoneDelta_s: out.partA.firstPhoneDelta_s,
    launchDur_s: out.partA.launchTiming.duration_s,
    returnDur_s: out.partA.returnDuration_s,
    criteria: out.partA.criteria,
  },
  partB: {
    ready_min: out.partB.ready_min,
    firstPhoneDelta_s: out.partB.firstPhoneDelta_s,
    launchDur_s: out.partB.launchTiming.duration_s,
    returnDur_s: out.partB.returnDuration_s,
    criteria: out.partB.criteria,
  },
}, null, 2));
