export type Vec3 = readonly [number, number, number];

export type SnapTarget = {
  id: string;
  position: Vec3;
  occupied: boolean;
};

export type SnapDecision =
  | { kind: 'snap'; targetId: string; position: Vec3; distance: number }
  | { kind: 'reject'; reason: 'out-of-range' | 'occupied' | 'no-targets'; nearestId: string | null; distance: number | null };

function distance(a: Vec3, b: Vec3): number {
  const dx = a[0] - b[0];
  const dy = a[1] - b[1];
  const dz = a[2] - b[2];
  return Math.hypot(dx, dy, dz);
}

/**
 * Choose the nearest valid snap target within radius.
 * Occupied slots are never selected; if the nearest slot is occupied we reject.
 */
export function selectSnapTarget(
  modulePosition: Vec3,
  targets: readonly SnapTarget[],
  snapRadius: number,
): SnapDecision {
  if (targets.length === 0) {
    return { kind: 'reject', reason: 'no-targets', nearestId: null, distance: null };
  }

  let nearest: SnapTarget | null = null;
  let nearestDist = Number.POSITIVE_INFINITY;
  for (const target of targets) {
    const d = distance(modulePosition, target.position);
    if (d < nearestDist) {
      nearest = target;
      nearestDist = d;
    }
  }

  if (!nearest || nearestDist > snapRadius) {
    return {
      kind: 'reject',
      reason: 'out-of-range',
      nearestId: nearest?.id ?? null,
      distance: nearest ? nearestDist : null,
    };
  }

  if (nearest.occupied) {
    return {
      kind: 'reject',
      reason: 'occupied',
      nearestId: nearest.id,
      distance: nearestDist,
    };
  }

  return {
    kind: 'snap',
    targetId: nearest.id,
    position: nearest.position,
    distance: nearestDist,
  };
}

export function isValidSnapPlacement(
  modulePosition: Vec3,
  targets: readonly SnapTarget[],
  snapRadius: number,
): boolean {
  return selectSnapTarget(modulePosition, targets, snapRadius).kind === 'snap';
}
