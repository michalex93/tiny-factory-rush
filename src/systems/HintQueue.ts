/**
 * Single-slot hint queue — priority + dedupe + cooldown.
 * Priority: critical > objective > decision > sell_feedback
 */

export type HintPriority = 'critical' | 'objective' | 'decision' | 'sell_feedback';

export interface HintRequest {
  id: string;
  text: string;
  priority: HintPriority;
  /** If true, never show again after first successful display. */
  once?: boolean;
  /** Auto-clear after ms (0 = sticky until superseded/cleared). */
  ttlMs?: number;
}

export interface HintDisplay {
  id: string;
  text: string;
  priority: HintPriority;
}

const PRIORITY_RANK: Record<HintPriority, number> = {
  critical: 4,
  objective: 3,
  decision: 2,
  sell_feedback: 1,
};

export class HintQueue {
  private current: HintDisplay | null = null;
  private ttlRemainingMs = 0;
  private cooldownMs = 0;
  private understood = new Set<string>();
  private lastCooldownMs: number;
  displayedIds: string[] = [];
  dedupeCount = 0;

  constructor(cooldownMs = 4_000) {
    this.lastCooldownMs = cooldownMs;
  }

  get visible(): HintDisplay | null {
    return this.current;
  }

  /** Whether a hint id was already shown / marked understood. */
  wasUnderstood(id: string): boolean {
    return this.understood.has(id);
  }

  markUnderstood(id: string): void {
    this.understood.add(id);
  }

  /**
   * Attempt to show a hint. Returns true if it becomes the visible hint.
   * Deduped / lower-priority attempts do not change the banner.
   */
  offer(req: HintRequest): { shown: boolean; deduped: boolean } {
    if (req.once && this.understood.has(req.id)) {
      this.dedupeCount += 1;
      return { shown: false, deduped: true };
    }
    if (this.understood.has(req.id) && req.once !== false) {
      // default: don't re-show same id once understood
      if (this.current?.id !== req.id) {
        this.dedupeCount += 1;
        return { shown: false, deduped: true };
      }
    }

    if (this.current) {
      const curRank = PRIORITY_RANK[this.current.priority];
      const nextRank = PRIORITY_RANK[req.priority];
      if (nextRank < curRank) {
        return { shown: false, deduped: false };
      }
      if (nextRank === curRank && this.cooldownMs > 0 && this.current.id !== req.id) {
        return { shown: false, deduped: false };
      }
      if (this.current.id === req.id && this.current.text === req.text) {
        this.dedupeCount += 1;
        return { shown: false, deduped: true };
      }
    }

    this.current = { id: req.id, text: req.text, priority: req.priority };
    this.ttlRemainingMs = req.ttlMs ?? 0;
    this.cooldownMs = this.lastCooldownMs;
    if (!this.displayedIds.includes(req.id)) {
      this.displayedIds.push(req.id);
    }
    if (req.once) this.understood.add(req.id);
    return { shown: true, deduped: false };
  }

  /** Clear current if it matches id (condition satisfied). */
  clear(id?: string): void {
    if (!this.current) return;
    if (id && this.current.id !== id) return;
    this.understood.add(this.current.id);
    this.current = null;
    this.ttlRemainingMs = 0;
  }

  update(dtMs: number): void {
    if (this.cooldownMs > 0) this.cooldownMs = Math.max(0, this.cooldownMs - dtMs);
    if (this.current && this.ttlRemainingMs > 0) {
      this.ttlRemainingMs -= dtMs;
      if (this.ttlRemainingMs <= 0) {
        this.understood.add(this.current.id);
        this.current = null;
      }
    }
  }

  snapshot(): { current: HintDisplay | null; understood: string[] } {
    return {
      current: this.current ? { ...this.current } : null,
      understood: [...this.understood],
    };
  }

  load(data: { understood?: string[] } | undefined): void {
    this.understood = new Set(data?.understood ?? []);
    this.current = null;
  }
}
