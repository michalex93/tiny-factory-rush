import Phaser from 'phaser';
import { generateTextures } from '../art/Textures';
import { Platform } from '../systems/Platform';

/**
 * Bakes all procedural art, then jumps straight into gameplay
 * (CrazyGames: land new users in gameplay immediately — no menus).
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  create(): void {
    generateTextures(this);
    Platform.loadingStop();
    this.scene.start('GameScene');
  }
}
