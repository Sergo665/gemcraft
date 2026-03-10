import Phaser from 'phaser';
import {
  SCENE_BOOT,
  SCENE_WORKSHOP,
  GAME_WIDTH,
  GAME_HEIGHT,
  WOOD_COLOR,
} from '../config';
import { SoundSystem } from '../systems/SoundSystem';

/**
 * BootScene — loading assets and initial setup.
 * Initializes SoundSystem, then transitions to WorkshopScene.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENE_BOOT });
  }

  preload(): void {
    // Progress bar
    const barWidth = 300;
    const barHeight = 30;
    const barX = (GAME_WIDTH - barWidth) / 2;
    const barY = GAME_HEIGHT / 2;

    const progressBar = this.add.graphics();
    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x333333, 0.8);
    progressBox.fillRoundedRect(barX, barY, barWidth, barHeight, 8);

    const loadingText = this.add.text(GAME_WIDTH / 2, barY - 40, 'Загрузка...', {
      fontFamily: 'Arial',
      fontSize: '24px',
      color: WOOD_COLOR,
    });
    loadingText.setOrigin(0.5);

    this.load.on('progress', (value: number) => {
      progressBar.clear();
      progressBar.fillStyle(0xF4A261, 1);
      progressBar.fillRoundedRect(barX + 4, barY + 4, (barWidth - 8) * value, barHeight - 8, 6);
    });

    this.load.on('complete', () => {
      progressBar.destroy();
      progressBox.destroy();
      loadingText.destroy();
    });

    // TODO: Load actual game assets here
    // this.load.image('gem_ruby', 'assets/gems/ruby.png');
    // etc.
  }

  create(): void {
    // Initialize SoundSystem as a singleton, stored in game registry
    const soundSystem = new SoundSystem();
    this.registry.set('soundSystem', soundSystem);

    // Transition to Workshop (main hub)
    this.scene.start(SCENE_WORKSHOP);
  }
}
