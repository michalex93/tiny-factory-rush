import Phaser from 'phaser';
import '@fontsource/fredoka/latin-500.css';
import '@fontsource/fredoka/latin-600.css';
import '@fontsource/fredoka/latin-700.css';
import { createGameConfig } from './config/gameConfig';
import { Platform } from './systems/Platform';

const parent = document.getElementById('game-container');
if (!parent) {
  throw new Error('Missing #game-container');
}

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

async function loadFonts(): Promise<void> {
  if (!document.fonts?.load) return;
  const wait = Promise.all(
    ['500', '600', '700'].map((w) => document.fonts.load(`${w} 20px "Fredoka"`)),
  );
  // Never block the game more than ~1.5 s on a slow font
  await Promise.race([wait, new Promise((r) => setTimeout(r, 1500))]);
}

async function boot(): Promise<void> {
  await Platform.init();
  Platform.loadingStart();
  await loadFonts();
  const game = new Phaser.Game(createGameConfig(parent!));
  window.__tfrGame = game;

  document.addEventListener('visibilitychange', () => {
    const reg = game.registry.get('game') as
      | { audio?: { suspend(): void; resume(): void } }
      | undefined;
    if (document.hidden) reg?.audio?.suspend();
    else reg?.audio?.resume();
  });
}

void boot();
