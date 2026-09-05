import {
  MAX_UPGRADE_LEVEL,
  SAVE_KEY,
  SAVE_VERSION,
  isProductId,
  type MachineId,
  type ProductId,
} from '../config/balance';
import type { UpgradeLevels } from './Upgrades';
import type { FactorySnapshot } from './Factory';
import type { StatsSnapshot } from './Stats';
import type { InsightId } from './Insights';

export interface SaveData {
  version: number;
  economy: {
    coins: number;
    totalEarned: number;
    productsSold: number;
    currentProduct: ProductId;
  };
  upgrades: {
    levels: UpgradeLevels;
    totalPurchased: number;
  };
  progression: {
    unlocked: ProductId[];
  };
  factory?: FactorySnapshot;
  audio: { muted: boolean };
  stats: StatsSnapshot;
  savedAt: number;
}

export interface SaveSystemHooks {
  getState: () => Omit<SaveData, 'version' | 'savedAt'>;
  applyState: (data: SaveData) => void;
}

export class SaveSystem {
  private hooks: SaveSystemHooks;
  private timerId: ReturnType<typeof setInterval> | null = null;
  private autosaveMs: number;

  constructor(hooks: SaveSystemHooks, autosaveMs: number) {
    this.hooks = hooks;
    this.autosaveMs = autosaveMs;
  }

  startAutosave(): void {
    this.stopAutosave();
    this.timerId = setInterval(() => this.save(), this.autosaveMs);
    if (typeof window !== 'undefined') {
      window.addEventListener('pagehide', this.onPageHide);
      document.addEventListener('visibilitychange', this.onVisibility);
    }
  }

  stopAutosave(): void {
    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('pagehide', this.onPageHide);
      document.removeEventListener('visibilitychange', this.onVisibility);
    }
  }

  private onPageHide = (): void => {
    this.save();
  };

  private onVisibility = (): void => {
    if (document.visibilityState === 'hidden') this.save();
  };

  save(): boolean {
    try {
      const state = this.hooks.getState();
      const data: SaveData = {
        version: SAVE_VERSION,
        savedAt: Date.now(),
        ...state,
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
      return true;
    } catch {
      return false;
    }
  }

  load(): SaveData | null {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const parsed: unknown = JSON.parse(raw);
      const data = validateSave(parsed);
      if (!data) return null;
      this.hooks.applyState(data);
      return data;
    } catch {
      return null;
    }
  }

  reset(): void {
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch {
      /* ignore */
    }
  }

  static clearStorage(): void {
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch {
      /* ignore */
    }
  }
}

function emptyLevels(): UpgradeLevels {
  return {
    0: { speed: 0, buffer: 0, value: 0 },
    1: { speed: 0, buffer: 0, value: 0 },
    2: { speed: 0, buffer: 0, value: 0 },
  };
}

function migrateLevels(raw: unknown): UpgradeLevels | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, Record<string, unknown>>;
  const levels = emptyLevels();

  for (const key of ['0', '1', '2'] as const) {
    const m = obj[key];
    if (!m || typeof m !== 'object') return null;
    const mid = Number(key) as MachineId;

    const speed = m.speed;
    if (typeof speed !== 'number' || !Number.isFinite(speed)) return null;
    levels[mid].speed = Math.max(0, Math.min(MAX_UPGRADE_LEVEL, Math.floor(speed)));

    // v3: buffer/value — v2: capacity/profit
    const bufferRaw = m.buffer ?? m.capacity;
    const valueRaw = m.value ?? m.profit;
    if (typeof bufferRaw !== 'number' || !Number.isFinite(bufferRaw)) return null;
    if (typeof valueRaw !== 'number' || !Number.isFinite(valueRaw)) return null;
    levels[mid].buffer = Math.max(
      0,
      Math.min(MAX_UPGRADE_LEVEL, Math.floor(bufferRaw)),
    );
    levels[mid].value = Math.max(
      0,
      Math.min(MAX_UPGRADE_LEVEL, Math.floor(valueRaw)),
    );
  }
  return levels;
}

export function validateSave(parsed: unknown): SaveData | null {
  if (!parsed || typeof parsed !== 'object') return null;
  const data = parsed as Partial<SaveData> & { version?: number };

  if (
    data.version !== 1 &&
    data.version !== 2 &&
    data.version !== 3 &&
    data.version !== 4 &&
    data.version !== SAVE_VERSION
  ) {
    return null;
  }
  if (!data.economy || typeof data.economy !== 'object') return null;
  if (typeof data.economy.coins !== 'number' || !Number.isFinite(data.economy.coins)) {
    return null;
  }
  if (
    typeof data.economy.totalEarned !== 'number' ||
    !Number.isFinite(data.economy.totalEarned)
  ) {
    return null;
  }
  if (
    typeof data.economy.productsSold !== 'number' ||
    !Number.isFinite(data.economy.productsSold)
  ) {
    return null;
  }
  if (!isProductId(data.economy.currentProduct)) {
    if (data.version === 1) {
      data.economy.currentProduct = 'boxes';
    } else {
      return null;
    }
  }

  if (!data.upgrades || typeof data.upgrades.totalPurchased !== 'number') return null;
  const levels = migrateLevels(data.upgrades.levels);
  if (!levels) return null;
  if (!Number.isFinite(data.upgrades.totalPurchased)) return null;

  let unlocked: ProductId[] = ['boxes'];
  if (data.progression?.unlocked && Array.isArray(data.progression.unlocked)) {
    unlocked = data.progression.unlocked.filter(isProductId);
    if (unlocked.length === 0) unlocked = ['boxes'];
  } else if (isProductId(data.economy.currentProduct)) {
    const order = ['boxes', 'toys', 'smartphones', 'robots', 'spaceTech'] as const;
    const idx = order.indexOf(data.economy.currentProduct);
    unlocked = order.slice(0, Math.max(1, idx + 1)) as ProductId[];
  }

  if (!data.audio || typeof data.audio.muted !== 'boolean') return null;
  if (!data.stats || typeof data.stats !== 'object') return null;

  if (data.economy.coins < 0) data.economy.coins = 0;
  if (data.economy.totalEarned < 0) data.economy.totalEarned = 0;
  if (data.economy.productsSold < 0) data.economy.productsSold = 0;

  const factory =
    (data.version === SAVE_VERSION ||
      data.version === 4 ||
      data.version === 3) &&
    data.factory?.line
      ? data.factory
      : {
          sessionMs: data.factory?.sessionMs,
          insights: data.factory?.insights as InsightId[] | undefined,
          unlocked,
          sessionGoal: data.factory?.sessionGoal,
          mcCampaign: data.factory?.mcCampaign,
        };

  return {
    version: SAVE_VERSION,
    savedAt: typeof data.savedAt === 'number' ? data.savedAt : Date.now(),
    economy: {
      coins: data.economy.coins,
      totalEarned: data.economy.totalEarned,
      productsSold: data.economy.productsSold,
      currentProduct: data.economy.currentProduct as ProductId,
    },
    upgrades: {
      levels,
      totalPurchased: Math.max(0, Math.floor(data.upgrades.totalPurchased)),
    },
    progression: { unlocked },
    factory,
    audio: data.audio,
    stats: data.stats as StatsSnapshot,
  };
}
