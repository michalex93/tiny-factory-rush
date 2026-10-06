// Field-of-view and reach geometry for seated tabletop MR (D-012). Units: meters, degrees, y up.
export const DEVICES = {
  'vr-glasses': { h: 70, v: 66, label: 'Meta VR Glasses (≈70×66°)' },
  quest3: { h: 110, v: 96, label: 'Meta Quest 3 (≈110×96°)' },
};

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len = (a) => Math.hypot(a[0], a[1], a[2]);
const norm = (a) => {
  const l = len(a);
  if (l === 0) throw new Error('zero-length vector');
  return [a[0] / l, a[1] / l, a[2] / l];
};
const deg = (r) => (r * 180) / Math.PI;

/** Camera basis from a head position and a look-at point (world up = +y). */
export function basis(head, lookAt) {
  const f = norm(sub(lookAt, head));
  let r = cross(f, [0, 1, 0]);
  if (len(r) < 1e-6) r = [1, 0, 0]; // looking straight up/down
  r = norm(r);
  const u = norm(cross(r, f));
  return { f, r, u };
}

/** Horizontal/vertical angles (deg) of point p relative to the view direction, plus distance. */
export function angles(head, lookAt, p) {
  const { f, r, u } = basis(head, lookAt);
  const d = sub(p, head);
  const dist = len(d);
  const x = dot(d, r);
  const y = dot(d, u);
  const z = dot(d, f);
  return { h: deg(Math.atan2(x, z)), v: deg(Math.atan2(y, z)), dist, inFront: z > 0 };
}

/**
 * Checks every element of a layout against a device FoV (with margin) and the seated reach radius.
 * layout: { head:[x,y,z], lookAt:[x,y,z], reachOrigin?:[x,y,z], elements:[{ id, position:[x,y,z], radius?, critical?, interactable? }] }
 */
export function checkLayout(layout, { device = 'vr-glasses', margin = 5, reach = 0.61 } = {}) {
  const spec = DEVICES[device];
  if (!spec) throw new Error(`unknown device ${device}; use ${Object.keys(DEVICES).join(', ')}`);
  const halfH = spec.h / 2 - margin;
  const halfV = spec.v / 2 - margin;
  const origin = layout.reachOrigin ?? [layout.head[0], layout.head[1] - 0.25, layout.head[2]];
  const results = (layout.elements ?? []).map((e) => {
    const a = angles(layout.head, layout.lookAt, e.position);
    const angR = e.radius ? deg(Math.atan2(e.radius, Math.max(a.dist, 1e-6))) : 0;
    const inFov = a.inFront && Math.abs(a.h) + angR <= halfH && Math.abs(a.v) + angR <= halfV;
    const reachDist = len(sub(e.position, origin));
    const reachOk = !e.interactable || reachDist <= reach;
    const mustSee = Boolean(e.critical || e.interactable);
    return {
      id: e.id,
      h: Math.round(a.h * 10) / 10,
      v: Math.round(a.v * 10) / 10,
      dist: Math.round(a.dist * 100) / 100,
      reachDist: Math.round(reachDist * 100) / 100,
      inFov,
      reachOk,
      pass: (!mustSee || inFov) && reachOk,
      critical: Boolean(e.critical),
      interactable: Boolean(e.interactable),
    };
  });
  return { device, label: spec.label, halfH, halfV, reach, pass: results.every((r) => r.pass), results };
}
