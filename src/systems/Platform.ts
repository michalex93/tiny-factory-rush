/**
 * CrazyGames SDK v3 bridge (loaded via <script> in index.html).
 * Every call is guarded: outside CrazyGames (itch, localhost, tests) the
 * SDK is absent or "disabled" and these become no-ops.
 */
interface CgSdk {
  init(): Promise<void>;
  environment?: 'crazygames' | 'local' | 'disabled';
  game: {
    gameplayStart(): void;
    gameplayStop(): void;
    loadingStart(): void;
    loadingStop(): void;
    happytime(): void;
  };
}

function sdk(): CgSdk | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { CrazyGames?: { SDK?: CgSdk } };
  return w.CrazyGames?.SDK ?? null;
}

let ready = false;
let playing = false;

function safe(fn: (s: CgSdk) => void): void {
  const s = sdk();
  if (!s || !ready || s.environment === 'disabled') return;
  try {
    fn(s);
  } catch {
    /* never let the platform break the game */
  }
}

export const Platform = {
  async init(): Promise<void> {
    const s = sdk();
    if (!s) return;
    try {
      await Promise.race([s.init(), new Promise((r) => setTimeout(r, 2500))]);
      ready = true;
    } catch {
      ready = false;
    }
  },

  loadingStart(): void {
    safe((s) => s.game.loadingStart());
  },

  loadingStop(): void {
    safe((s) => s.game.loadingStop());
  },

  gameplayStart(): void {
    if (playing) return;
    playing = true;
    safe((s) => s.game.gameplayStart());
  },

  gameplayStop(): void {
    if (!playing) return;
    playing = false;
    safe((s) => s.game.gameplayStop());
  },

  /** Celebrate big moments (unlocks / goals) — CrazyGames uses it for engagement signals. */
  happytime(): void {
    safe((s) => s.game.happytime());
  },

  async showMidgameAd(): Promise<boolean> {
    return false;
  },

  async showRewardedAd(): Promise<boolean> {
    return false;
  },
};
