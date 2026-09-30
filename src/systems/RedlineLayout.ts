/**
 * Logical REDLINE layout for responsive QA (390×844, 800×450, 907×510, desktop).
 * Pure functions — no Phaser dependency.
 */
import { REDLINE, type RedlineDock } from '../config/redline';

export interface RedlineLayoutRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface RedlineLayoutPlan {
  forkX: number;
  forkY: number;
  standardDock: RedlineLayoutRect;
  priorityDock: RedlineLayoutRect;
  switchControl: RedlineLayoutRect;
  previewStrip: RedlineLayoutRect;
  hudPanel: RedlineLayoutRect;
  cta: RedlineLayoutRect;
  summary: RedlineLayoutRect;
  /** Min touch target edge (px). */
  touchMin: number;
  compact: boolean;
  landscape: boolean;
}

/**
 * Place bifurcation after the sink slot without covering machines/buffers.
 * @param sinkX canonical sink center X in design space
 * @param factoryY line Y
 * @param viewW viewport width
 * @param viewH viewport height
 */
export function planRedlineLayout(
  sinkX: number,
  factoryY: number,
  viewW: number,
  viewH: number,
): RedlineLayoutPlan {
  const landscape = viewW >= viewH;
  const compact = viewW < 500 || viewH < 500;
  const touchMin = compact ? 44 : 48;

  const dockW = Math.max(touchMin, compact ? 52 : 64);
  const dockH = Math.max(touchMin * 0.75, compact ? 36 : 48);
  const dockGap = compact ? 24 : 40;

  // Keep fork+docks inside the right margin
  const rightPad = dockW + 12;
  const forkX = Math.min(
    Math.max(sinkX + (compact ? 20 : 36), sinkX),
    viewW - rightPad - 8,
  );
  const forkY = Math.min(Math.max(factoryY, dockGap + dockH + 8), viewH - dockGap - dockH - 8);

  const standardDock: RedlineLayoutRect = {
    x: Math.min(forkX + 20, viewW - dockW - 4),
    y: Math.max(4, forkY - dockGap - dockH / 2),
    w: dockW,
    h: dockH,
  };
  const priorityDock: RedlineLayoutRect = {
    x: Math.min(forkX + 20, viewW - dockW - 4),
    y: Math.min(viewH - dockH - 4, forkY + dockGap - dockH / 2),
    w: dockW,
    h: dockH,
  };

  const switchW = Math.max(touchMin, compact ? 56 : 72);
  const switchControl: RedlineLayoutRect = {
    x: Math.max(4, Math.min(forkX - switchW / 2, viewW - switchW - 4)),
    y: Math.max(4, Math.min(forkY - touchMin / 2, viewH - touchMin - 4)),
    w: switchW,
    h: touchMin,
  };

  const previewW = Math.min(compact ? 140 : 180, viewW - 16);
  const previewStrip: RedlineLayoutRect = {
    x: Math.max(8, Math.min(forkX - previewW / 2, viewW - previewW - 8)),
    y: Math.max(8, factoryY - (compact ? 100 : 130)),
    w: previewW,
    h: 28,
  };

  const hudW = Math.min(viewW - 16, compact ? viewW - 16 : 320);
  const hudPanel: RedlineLayoutRect = {
    x: Math.max(8, (viewW - hudW) / 2),
    y: compact ? 64 : 88,
    w: hudW,
    h: compact ? 52 : 72,
  };

  const ctaW = Math.min(compact ? 140 : 180, viewW - 24);
  const cta: RedlineLayoutRect = {
    x: (viewW - ctaW) / 2,
    y: Math.max(
      factoryY + 60,
      Math.min(viewH - touchMin - 16, viewH - 100),
    ),
    w: ctaW,
    h: touchMin,
  };

  const summaryW = Math.min(compact ? viewW * 0.9 : 360, viewW - 16);
  const summaryH = Math.min(compact ? viewH * 0.48 : 320, viewH - 32);
  const summary: RedlineLayoutRect = {
    x: (viewW - summaryW) / 2,
    y: Math.max(16, (viewH - summaryH) / 2),
    w: summaryW,
    h: summaryH,
  };

  return {
    forkX,
    forkY,
    standardDock,
    priorityDock,
    switchControl,
    previewStrip,
    hudPanel,
    cta,
    summary,
    touchMin,
    compact,
    landscape,
  };
}

export function dockLabel(dock: RedlineDock): string {
  const v = REDLINE.dockVisual[dock];
  return `${v.symbol} ${v.label}`;
}

export function validateRedlineLayoutFits(plan: RedlineLayoutPlan, viewW: number, viewH: number): boolean {
  const rects = [
    plan.standardDock,
    plan.priorityDock,
    plan.switchControl,
    plan.cta,
    plan.hudPanel,
  ];
  for (const r of rects) {
    if (r.x < -4 || r.y < -4) return false;
    if (r.x + r.w > viewW + 4) return false;
    if (r.y + r.h > viewH + 4) return false;
    if (r.w < plan.touchMin * 0.7 || r.h < plan.touchMin * 0.55) return false;
  }
  // Docks must not overlap each other
  const a = plan.standardDock;
  const b = plan.priorityDock;
  const overlap =
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y;
  return !overlap;
}
