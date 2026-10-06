/**
 * Kill-test interaction tunables.
 *
 * Values are TUNABLE temporary defaults for the stack comparison — not design truth.
 * Do not copy timing constants from other games as permanent product law.
 */

export type KillTestConfig = {
  /** Sliding window used when buffering recent grab/release intent. TUNABLE. */
  intentHistoryWindowMs: number;
  /** Grace period before treating brief hand/gaze loss as a hard failure. TUNABLE. */
  trackingLossGraceMs: number;
  /** Magnetic snap capture radius in meters. TUNABLE. */
  snapRadius: number;
  /** Module half-extents (large forgiving target). TUNABLE. */
  moduleSize: [number, number, number];
  /** Number of deterministic moving tokens for runtime/render load. */
  tokenCount: number;
};

export const DEFAULT_KILLTEST_CONFIG: KillTestConfig = {
  intentHistoryWindowMs: 180,
  trackingLossGraceMs: 250,
  snapRadius: 0.18,
  moduleSize: [0.28, 0.16, 0.22],
  tokenCount: 10,
};

/** Fallback table pose when plane detection is unavailable (DEV FALLBACK). */
export const FALLBACK_TABLE = {
  position: [0, 0.72, -0.85] as [number, number, number],
  size: [1.2, 0.04, 0.7] as [number, number, number],
};

const TABLE_TOP_Y =
  FALLBACK_TABLE.position[1] + FALLBACK_TABLE.size[1] / 2;

/** Three snap pads on the fallback table (world meters). */
export const SNAP_SLOTS: ReadonlyArray<{
  id: string;
  position: [number, number, number];
}> = [
  { id: 'slot-left', position: [-0.35, TABLE_TOP_Y + 0.01, -0.95] },
  { id: 'slot-center', position: [0, TABLE_TOP_Y + 0.01, -0.95] },
  { id: 'slot-right', position: [0.35, TABLE_TOP_Y + 0.01, -0.95] },
];
