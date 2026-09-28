import Phaser from 'phaser';
import { INK, mix } from './palette';

type Pt = { x: number; y: number };

/**
 * Thin wrapper over Phaser.Graphics that draws in logical units and
 * multiplies every coordinate by `k` — lets us author art at 1× and bake
 * it into 2× textures for crisp rendering on high-DPI / fullscreen.
 */
export class Pen {
  constructor(
    readonly g: Phaser.GameObjects.Graphics,
    readonly k: number,
  ) {}

  fill(color: number, alpha = 1): this {
    this.g.fillStyle(color, alpha);
    return this;
  }

  line(width: number, color: number = INK, alpha = 1): this {
    this.g.lineStyle(width * this.k, color, alpha);
    return this;
  }

  rect(x: number, y: number, w: number, h: number): this {
    const k = this.k;
    this.g.fillRect(x * k, y * k, w * k, h * k);
    return this;
  }

  strokeRect(x: number, y: number, w: number, h: number): this {
    const k = this.k;
    this.g.strokeRect(x * k, y * k, w * k, h * k);
    return this;
  }

  rrect(x: number, y: number, w: number, h: number, r: number): this {
    const k = this.k;
    const rr = Math.max(0.01, Math.min(r, w / 2, h / 2));
    this.g.fillRoundedRect(x * k, y * k, w * k, h * k, rr * k);
    return this;
  }

  strokeRrect(x: number, y: number, w: number, h: number, r: number): this {
    const k = this.k;
    const rr = Math.max(0.01, Math.min(r, w / 2, h / 2));
    this.g.strokeRoundedRect(x * k, y * k, w * k, h * k, rr * k);
    return this;
  }

  /** Filled + outlined rounded rect in one call. */
  box(
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
    color: number,
    outline = 3,
  ): this {
    this.fill(color).rrect(x, y, w, h, r);
    if (outline > 0) this.line(outline).strokeRrect(x, y, w, h, r);
    return this;
  }

  circle(x: number, y: number, r: number): this {
    const k = this.k;
    this.g.fillCircle(x * k, y * k, r * k);
    return this;
  }

  strokeCircle(x: number, y: number, r: number): this {
    const k = this.k;
    this.g.strokeCircle(x * k, y * k, r * k);
    return this;
  }

  dot(x: number, y: number, r: number, color: number, outline = 0): this {
    this.fill(color).circle(x, y, r);
    if (outline > 0) this.line(outline).strokeCircle(x, y, r);
    return this;
  }

  ellipse(x: number, y: number, w: number, h: number): this {
    const k = this.k;
    this.g.fillEllipse(x * k, y * k, w * k, h * k);
    return this;
  }

  strokeEllipse(x: number, y: number, w: number, h: number): this {
    const k = this.k;
    this.g.strokeEllipse(x * k, y * k, w * k, h * k);
    return this;
  }

  poly(points: Array<[number, number]>, closed = true): this {
    this.g.fillPoints(this.pts(points), closed, true);
    return this;
  }

  strokePoly(points: Array<[number, number]>, closed = true): this {
    this.g.strokePoints(this.pts(points), closed, true);
    return this;
  }

  shape(points: Array<[number, number]>, color: number, outline = 3): this {
    this.fill(color).poly(points);
    if (outline > 0) this.line(outline).strokePoly(points);
    return this;
  }

  seg(x1: number, y1: number, x2: number, y2: number): this {
    const k = this.k;
    this.g.lineBetween(x1 * k, y1 * k, x2 * k, y2 * k);
    return this;
  }

  arc(
    x: number,
    y: number,
    r: number,
    start: number,
    end: number,
    anticlockwise = false,
  ): this {
    const k = this.k;
    this.g.beginPath();
    this.g.arc(x * k, y * k, r * k, start, end, anticlockwise);
    this.g.strokePath();
    return this;
  }

  /** Filled pie wedge (used for gears / saw teeth / sparkles). */
  wedge(x: number, y: number, r: number, start: number, end: number): this {
    const k = this.k;
    this.g.slice(x * k, y * k, r * k, start, end, false);
    this.g.fillPath();
    return this;
  }

  /** Vertical gradient rect, drawn as fine bands (works in canvas + WebGL). */
  vgrad(x: number, y: number, w: number, h: number, top: number, bottom: number, bands = 32): this {
    const bh = h / bands;
    for (let i = 0; i < bands; i++) {
      this.fill(mix(top, bottom, i / (bands - 1))).rect(x, y + i * bh, w, bh + 0.6);
    }
    return this;
  }

  star(x: number, y: number, rOuter: number, rInner: number, points = 5, rot = -Math.PI / 2): Array<[number, number]> {
    const out: Array<[number, number]> = [];
    for (let i = 0; i < points * 2; i++) {
      const r = i % 2 === 0 ? rOuter : rInner;
      const a = rot + (i * Math.PI) / points;
      out.push([x + Math.cos(a) * r, y + Math.sin(a) * r]);
    }
    return out;
  }

  private pts(points: Array<[number, number]>): Phaser.Math.Vector2[] {
    const k = this.k;
    return points.map(([x, y]) => ({ x: x * k, y: y * k }) as Pt) as unknown as Phaser.Math.Vector2[];
  }
}
