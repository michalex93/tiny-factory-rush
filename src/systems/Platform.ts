/**
 * Future CrazyGames / ad SDK hooks.
 * No-op for Milestone 1 — keep call sites so ads can plug in later.
 */
export const Platform = {
  gameplayStart(): void {
    // CrazyGames SDK: gameplayStart()
  },

  gameplayStop(): void {
    // CrazyGames SDK: gameplayStop()
  },

  async showMidgameAd(): Promise<boolean> {
    // CrazyGames SDK: midgame ad
    return false;
  },

  async showRewardedAd(): Promise<boolean> {
    // CrazyGames SDK: rewarded ad → resolve true if watched
    return false;
  },
};
