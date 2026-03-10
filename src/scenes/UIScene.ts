import Phaser from 'phaser';
import { SCENE_UI, GAME_WIDTH } from '../config';

/**
 * UIScene — overlay UI (goals, boosters, pause button).
 * Runs parallel to GameScene.
 */
export class UIScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENE_UI });
  }

  create(): void {
    // UI overlay — will be launched alongside GameScene
    // For now, empty placeholder
  }
}
