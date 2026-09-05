import Phaser from 'phaser';
import { LAYOUT } from './balance';
import { BootScene } from '../scenes/BootScene';
import { GameScene } from '../scenes/GameScene';
import { UIScene } from '../scenes/UIScene';

export function createGameConfig(
  parent: string | HTMLElement,
): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent,
    width: LAYOUT.width,
    height: LAYOUT.height,
    backgroundColor: '#1a2332',
    roundPixels: false,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [BootScene, GameScene, UIScene],
    input: {
      activePointers: 3,
    },
    render: {
      antialias: true,
      powerPreference: 'high-performance',
    },
  };
}
