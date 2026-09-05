/** Central game balance — industrial-casual factory. */

export const SAVE_VERSION = 5;
export const SAVE_KEY = 'tiny-factory-rush-save';

export const MACHINE_COUNT = 3;
export const BUFFER_COUNT = 2; // AB, BC
export const MAX_UPGRADE_LEVEL = 20;

export type UpgradeType = 'speed' | 'buffer' | 'value';
export type MachineId = 0 | 1 | 2;
export type BufferId = 0 | 1;

export const MACHINE_NAMES = ['Procesado', 'Ensamblaje', 'Empaque'] as const;

export type MachineState = 'IDLE' | 'PROCESSING' | 'BLOCKED' | 'STARVED';

export const PRODUCT_ORDER = [
  'boxes',
  'toys',
  'smartphones',
  'robots',
  'spaceTech',
] as const;

export type ProductId = (typeof PRODUCT_ORDER)[number];

export const PRODUCTS: Record<
  ProductId,
  {
    id: ProductId;
    name: string;
    baseValue: number;
    color: number;
    unlockCost: number;
    unlockAtEarned: number;
  }
> = {
  boxes: {
    id: 'boxes',
    name: 'Boxes',
    baseValue: 2,
    color: 0xc4a574,
    unlockCost: 0,
    unlockAtEarned: 0,
  },
  toys: {
    id: 'toys',
    name: 'Toys',
    baseValue: 5,
    color: 0xe76f51,
    /**
     * M-B.3: first Toys unlock is lifetime-earned only (no cash).
     * Threshold from human traces (validate-mb2-final) → 650.
     */
    unlockCost: 0,
    unlockAtEarned: 650,
  },
  smartphones: {
    id: 'smartphones',
    name: 'Smartphones',
    baseValue: 14,
    color: 0x457b9d,
    /**
     * M-C: cash unlock retired — Expansion Fund target is SMARTPHONE_CAMPAIGN.fundTarget.
     * unlockCost kept 0 so legacy UI never shows pay-$X for phones.
     * Visibility gate = Toy Mastery complete (McCampaign).
     */
    unlockCost: 0,
    unlockAtEarned: 0,
  },
  robots: {
    id: 'robots',
    name: 'Robots',
    baseValue: 40,
    color: 0x2a9d8f,
    unlockCost: 3200,
    unlockAtEarned: 2000,
  },
  spaceTech: {
    id: 'spaceTech',
    name: 'Space Tech',
    baseValue: 120,
    color: 0x9b5de5,
    unlockCost: 18000,
    unlockAtEarned: 10000,
  },
};

/** Source spawn interval (ms). Tuned so early game feels alive. */
export const SPAWN = {
  intervalMs: 900,
  minIntervalMs: 200,
} as const;

/**
 * Base processing times (ms) — ratio ≈ 10:4:9 /min (B is bottleneck).
 * Scaled for casual pace while preserving industrial imbalance.
 */
export const MACHINE_BASE = {
  processMs: [1000, 2500, 1111] as const,
} as const;


/** Base buffer capacities between stations (AB=0, BC=1). */
export const BUFFER_BASE = {
  capacity: [6, 6] as const,
} as const;

export const CLICK_BOOST = {
  progressPulse: 0.35,
  cooldownMs: 280,
} as const;

export const UPGRADE_COSTS: Record<
  UpgradeType,
  { baseCost: number; growthFactor: number }
> = {
  speed: { baseCost: 14, growthFactor: 1.18 },
  buffer: { baseCost: 28, growthFactor: 1.2 },
  value: { baseCost: 24, growthFactor: 1.2 },
};

/** Cheap curve for guided onboarding buys (stage 1 + first strategic pick). */
export const UPGRADE_COSTS_ONBOARDING = UPGRADE_COSTS;

/**
 * Steeper curve after onboarding purchases — fewer trivial buys in 5 min.
 * Switches when totalPurchased >= ONBOARDING_PURCHASE_BUDGET.
 */
export const UPGRADE_COSTS_NORMAL: Record<
  UpgradeType,
  { baseCost: number; growthFactor: number }
> = {
  speed: { baseCost: 18, growthFactor: 1.38 },
  buffer: { baseCost: 32, growthFactor: 1.35 },
  value: { baseCost: 28, growthFactor: 1.4 },
};

/** Stage1 (~2 Speed) + one strategic choice buy stay on onboarding curve. */
export const ONBOARDING_PURCHASE_BUDGET = 3;

export const UPGRADE_EFFECTS = {
  /** processMs *= factor^level */
  speedFactorPerLevel: 0.9,
  /** +slots per buffer upgrade level (applied to buffer after that machine) */
  bufferSlotsPerLevel: 1,
  /** sale value *= factor^level (summed across machines as product) */
  valueFactorPerLevel: 1.12,
} as const;

export const ECONOMY = {
  startingCoins: 0,
  incomeWindowMs: 5000,
} as const;

export const METRICS = {
  /** rolling window for throughput / cycle time */
  windowMs: 30_000,
  utilizationWindowMs: 15_000,
} as const;

export const EVENTS = {
  enabled: true,
  golden: {
    enabled: true,
    chance: 0.045,
    valueMult: 8,
    color: 0xffd700,
  },
  productionBoost: {
    enabled: true,
    cooldownMs: 55_000,
    firstDelayMs: 40_000,
    durationMs: 20_000,
    mult: 2,
  },
  overdrive: {
    enabled: true,
    cooldownMs: 70_000,
    firstDelayMs: 55_000,
    durationMs: 8_000,
    speedMult: 3.5,
  },
} as const;

/** Progressive disclosure — first-session industrial hook. */
export const REVEAL = {
  /** Show focused first upgrade after this many sales (or any purchase). */
  upgradesAfterSales: 1,
  /** Full metrics (OUTPUT/WIP) after first upgrade purchase. */
  metricsAfterUpgrades: 1,
  /** Unlock product button after this many upgrades. */
  unlockAfterUpgrades: 2,
  /** Full 3×3 upgrade grid after this many upgrades. */
  fullUpgradeGridAfter: 2,
  /** Highlight bottleneck once buffer fill or util crosses threshold. */
  bottleneckMinSessionMs: 18_000,
  bottleneckBufferFill: 0.45,
  /** Start short session goal after first upgrade. */
  sessionGoalAfterUpgrades: 1,
  /** Legacy / advanced industrial copy */
  wipMs: 45_000,
  utilizationMs: 60_000,
  bottleneckInsightMs: 90_000,
} as const;

/** First industrial session goal targets. */
export const SESSION_GOAL = {
  /** Reach this rolling throughput (units/min). */
  targetThroughputPerMin: 28,
  /** Fail/expire after this ms (0 = no fail, only complete). */
  timeLimitMs: 120_000,
} as const;

/**
 * M-B.1 optimization chain — real decision (Speed vs Value), then converge.
 *
 * Buffer is NOT offered here (reserved for future variability/surge).
 * Thresholds from Mb1BalanceSim (post stage-1 ≈ 2× Speed on M1).
 */
export const OPTIMIZATION_CHAIN = {
  nextStageMaxDelayMs: 2_000,
  /** Ignore inherited conditions briefly after arming a goal. */
  armGraceMs: 2_500,
  stage1: {
    id: 'throughput' as const,
    targetThroughputPerMin: SESSION_GOAL.targetThroughputPerMin,
    timeLimitMs: SESSION_GOAL.timeLimitMs,
  },
  /** Relative branch goals — evaluated vs baseline AFTER required purchase. */
  branchThroughput: {
    id: 'branch_throughput' as const,
    holdMs: 22_000,
    /** Sustain OUTPUT at least this fraction above post-purchase baseline. */
    minOutputLift: 0.08,
    /** Absolute floor if baseline is noisy. */
    minAbsoluteOutputDelta: 2,
    maxWip: 11,
  },
  branchMargin: {
    id: 'branch_margin' as const,
    holdMs: 22_000,
    /** Sustain LINE INCOME at least this fraction of post-purchase baseline. */
    minIncomeHoldRatio: 0.94,
    /** Must exceed pre-purchase income by this ratio (proves Value mattered). */
    minIncomeVsPreChoice: 1.12,
    maxWip: 11,
  },
  convergence: {
    id: 'convergence' as const,
    holdMs: 20_000,
    minThroughputPerMin: 32,
    minLineIncomePerMin: 85,
    maxWip: 11,
    /** At least one upgrade after convergence starts (no instant clear). */
    minPurchasesAfterStart: 1,
  },
  nextMilestone: {
    productId: 'toys' as const,
  },
} as const;

/**
 * M-B.3 Toys expansion — irreversible lifetime earned (human-calibrated).
 * Cash is never required / deducted for the first Toys unlock.
 */
export const TOYS_MILESTONE = {
  productId: 'toys' as const,
  /** Must match PRODUCTS.toys.unlockAtEarned. */
  unlockAtEarned: 650,
  freeUnlock: true,
  /** Session band without events (human-calibrated). */
  targetUnlockMs: { min: 330_000, max: 480_000 } as const,
  /** Favorable events should not unlock before ~3 min (bot); human ~3.5–4. */
  eventFloorMs: 180_000,
  progressBuckets: [0.15, 0.3, 0.5, 0.7, 0.85, 1] as const,
  postUnlockObjective: 'Produce your first Toy',
} as const;

/**
 * Branch-coherent Toy Mastery (45–90 s). No hidden permanent bonuses.
 * Tuned for post-open Toys line at typical human builds (~30–40 OUTPUT/min).
 */
export const TOY_MASTERY = {
  armGraceMs: 1_800,
  /** Require at least one post-start action (upgrade or extra sale beyond first). */
  minActionsAfterStart: 1,
  throughput: {
    id: 'toy_rush' as const,
    planLabel: 'FLOW PLAN',
    title: 'TOY RUSH',
    /** Toys sold during mastery (first Toy already produced before start). */
    sellTarget: 28,
    maxWip: 12,
    copy: 'Sell {n} Toys while keeping the line flowing.',
  },
  margin: {
    id: 'premium_toys' as const,
    planLabel: 'MARGIN PLAN',
    title: 'PREMIUM TOYS',
    /** Coins earned from Toy sales during mastery (~50–70 s at ~$8/s). */
    incomeTarget: 420,
    copy: 'Earn ${x} from Toys through higher unit value.',
  },
} as const;

/** Horizon after Toy Mastery — hands off to M-C Expansion Fund. */
export const SMARTPHONES_HORIZON = {
  productId: 'smartphones' as const,
  title: 'NEXT CATEGORY — SMARTPHONES',
  copy: 'Allocate factory income to build the next line.',
} as const;

export {
  SMARTPHONE_CAMPAIGN,
  computeFundTarget,
  roundReadableFund,
  clampReturnReference,
} from './smartphoneCampaign';

export const HINT_QUEUE = {
  cooldownMs: 4_000,
  sellTeachOnce: true,
} as const;

export const UPGRADE_PAYOFF = {
  settleMs: 1_600,
  wipTrendWindowMs: 4_000,
  improvedBadgeMs: 5_000,
} as const;

export const SAVE = {
  autosaveIntervalMs: 5000,
} as const;

export const LAYOUT = {
  width: 1280,
  height: 720,
  factoryY: 360,
  machineWidth: 110,
  machineHeight: 130,
  bufferWidth: 90,
  bufferHeight: 70,
  itemSize: 24,
} as const;

export function isProductId(value: unknown): value is ProductId {
  return typeof value === 'string' && value in PRODUCTS;
}

export function nextProductId(current: ProductId): ProductId | null {
  const idx = PRODUCT_ORDER.indexOf(current);
  if (idx < 0 || idx >= PRODUCT_ORDER.length - 1) return null;
  return PRODUCT_ORDER[idx + 1]!;
}

export function isUpgradeType(value: unknown): value is UpgradeType {
  return value === 'speed' || value === 'buffer' || value === 'value';
}
