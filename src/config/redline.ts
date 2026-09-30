/**
 * M-R1 REDLINE ROUTING — config only (no economy retune of M-B/M-C).
 */
export type RedlineDock = 'standard' | 'priority';
export type RedlineMode = 'auto' | 'manual';
export type RedlinePhase =
  | 'locked'
  | 'available'
  | 'active'
  | 'summary'
  | 'cooldown';

export type RedlineTemplateId =
  | 'split_quota'
  | 'route_pattern'
  | 'priority_streak';

export type RedlineGrade = 'MISS' | 'BRONZE' | 'SILVER' | 'GOLD';

export const REDLINE = {
  /** Visual fork visible from boot; interaction locked until unlock. */
  visibleWhileLocked: true,
  /** Deadline for a contract (active simulation ms only). */
  deadlineMs: 60_000,
  /** Target count from event-neutral throughput × 45s. */
  targetDurationSec: 45,
  targetCountMin: 12,
  targetCountMax: 24,
  /** Cooldown between optional contracts (active sim ms). */
  cooldownMs: 75_000,
  /** Preview strip of upcoming destinations. */
  previewCount: 3,
  tutorialHintMax: 2,
  firstSwitchExpectMs: 5_000,
  ctaAfterUnlockMs: 2_000,

  combo: {
    /** Correct deliveries per combo tier bump. */
    streakPerTier: 3,
    maxMultiplier: 5,
    /** Wrong delivery reduces streak by this many (not full reset). */
    wrongStreakPenalty: 2,
  },

  grades: {
    missBelow: 0.6,
    bronzeAt: 0.6,
    silverAt: 0.8,
    goldAt: 0.95,
  },

  /** Reward = event-neutral line income/sec × seconds (frozen at contract start). */
  rewardSeconds: {
    MISS: 0,
    BRONZE: 20,
    SILVER: 25,
    GOLD: 30,
  } as Record<RedlineGrade, number>,

  heat: {
    /** Disabled on guided first contract. */
    tutorialDisabled: true,
    risePerSpamSwitch: 18,
    decayPerSec: 8,
    jamAt: 100,
    warningAt: 70,
    jamLockMs: 2_500,
    autoCoolMs: 3_000,
    spamWindowMs: 400,
  },

  dockVisual: {
    standard: {
      id: 'standard' as RedlineDock,
      label: 'STANDARD',
      symbol: 'S',
      letter: 'A',
      color: 0x5b8c5a,
    },
    priority: {
      id: 'priority' as RedlineDock,
      label: 'PRIORITY',
      symbol: 'P',
      letter: 'B',
      color: 0xc45c26,
    },
  },

  templates: [
    {
      id: 'split_quota' as RedlineTemplateId,
      name: 'SPLIT QUOTA',
      /** ~50/50 mix */
      priorityBias: 0.5,
      pattern: null as RedlineDock[] | null,
      requirePriorityStreak: 0,
    },
    {
      id: 'route_pattern' as RedlineTemplateId,
      name: 'ROUTE PATTERN',
      priorityBias: 0.4,
      pattern: ['standard', 'standard', 'priority'] as RedlineDock[],
      requirePriorityStreak: 0,
    },
    {
      id: 'priority_streak' as RedlineTemplateId,
      name: 'PRIORITY STREAK',
      priorityBias: 0.72,
      pattern: null as RedlineDock[] | null,
      requirePriorityStreak: 4,
    },
  ],
} as const;

export function clampRedlineTargetCount(n: number): number {
  if (!Number.isFinite(n)) return REDLINE.targetCountMin;
  return Math.max(
    REDLINE.targetCountMin,
    Math.min(REDLINE.targetCountMax, Math.round(n)),
  );
}

export function computeRedlineTargetCount(
  eventNeutralThroughputPerMin: number,
): number {
  const raw =
    (Math.max(0.5, eventNeutralThroughputPerMin) * REDLINE.targetDurationSec) /
    60;
  return clampRedlineTargetCount(raw);
}

export function gradeFromAccuracy(accuracy: number): RedlineGrade {
  if (accuracy >= REDLINE.grades.goldAt) return 'GOLD';
  if (accuracy >= REDLINE.grades.silverAt) return 'SILVER';
  if (accuracy >= REDLINE.grades.bronzeAt) return 'BRONZE';
  return 'MISS';
}

/** Mulberry32 seeded RNG — deterministic contract destinations. */
export function createSeededRng(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}
