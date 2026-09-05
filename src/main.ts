import Phaser from 'phaser';
import { createGameConfig } from './config/gameConfig';

const parent = document.getElementById('game-container');
if (!parent) {
  throw new Error('Missing #game-container');
}

const game = new Phaser.Game(createGameConfig(parent));

// Helpful in console during development
declare global {
  interface Window {
    __tfrGame?: Phaser.Game;
    __tfrReset?: () => void;
    /** First-session hook timings / funnel (set by GameScene). */
    __tfrOnboardingReport?: () => import('./systems/Telemetry').OnboardingReport;
    /** Full session report including M-C (set by GameScene). */
    __tfrSessionReport?: () => Record<string, unknown>;
    /** Dev-only badge preview for responsive QA. */
    __tfrPreviewPayoff?: (
      kind: 'still_limiting' | 'resolved' | 'moved',
    ) => boolean;
  }
}
window.__tfrGame = game;

export default game;
