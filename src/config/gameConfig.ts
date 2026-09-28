import Phaser from 'phaser';
import { LAYOUT } from './balance';
import { BootScene } from '../scenes/BootScene';
import { GameScene } from '../scenes/GameScene';
import { UIScene } from '../scenes/UIScene';
import { ZOOM } from '../art/view';

export function createGameConfig(
  parent: string | HTMLElement,
): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent,
    width: LAYOUT.width * ZOOM,
    height: LAYOUT.height * ZOOM,
    backgroundColor: '#3b93c9',
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
