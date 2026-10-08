import type { StationId } from './sim.js';

export const TABLE = {
  position: [0, 0.72, -0.9] as const,
  size: [1.35, 0.04, 0.75] as const,
};

/** Station world positions on the DEV FALLBACK table (local tabletop). */
export const STATION_POS: Record<StationId, readonly [number, number, number]> = {
  source: [-0.48, 0.78, -0.95],
  procA: [-0.24, 0.78, -0.95],
  buffer: [0.0, 0.78, -0.95],
  procB: [0.24, 0.78, -0.95],
  sink: [0.48, 0.78, -0.95],
};

export const BOOST_SLOT = {
  id: 'boost-slot',
  position: [0.0, 0.76, -0.62] as const,
};

export const MODULE_SIZE = [0.16, 0.14, 0.16] as const;

export const SNAP_RADIUS = 0.22; // TUNABLE — not design truth
