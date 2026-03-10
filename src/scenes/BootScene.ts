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

    // Background
    this.load.image('cave_bg', 'assets/cave_bg.png');

    // Gems
    this.load.image('gem_ruby', 'assets/gems/gem_ruby.png');
    this.load.image('gem_sapphire', 'assets/gems/gem_sapphire.png');
    this.load.image('gem_emerald', 'assets/gems/gem_emerald.png');
    this.load.image('gem_amber', 'assets/gems/gem_amber.png');
    this.load.image('gem_amethyst', 'assets/gems/gem_amethyst.png');
    this.load.image('gem_topaz', 'assets/gems/gem_topaz.png');

    // UI
    this.load.image('stone_frame', 'assets/ui/stone_frame.png');
    this.load.image('goal_panel', 'assets/ui/goal_panel.png');
    this.load.image('btn_hammer', 'assets/ui/btn_hammer.png');
    this.load.image('btn_shuffle', 'assets/ui/btn_shuffle.png');
    this.load.image('btn_rainbow', 'assets/ui/btn_rainbow.png');
    this.load.image('icon_ruby', 'assets/ui/icon_ruby.png');
    this.load.image('icon_sapphire', 'assets/ui/icon_sapphire.png');
    this.load.image('icon_emerald', 'assets/ui/icon_emerald.png');
    this.load.image('icon_amber', 'assets/ui/icon_amber.png');
    this.load.image('icon_amethyst', 'assets/ui/icon_amethyst.png');
    this.load.image('cell_bg', 'assets/ui/cell_bg.png');
    this.load.image('torch', 'assets/ui/torch.png');

    // FX
    this.load.image('fx_stripe_h', 'assets/fx/fx_stripe_h.png');
    this.load.image('fx_stripe_v', 'assets/fx/fx_stripe_v.png');
    this.load.image('fx_bomb', 'assets/fx/fx_bomb.png');
    this.load.image('fx_rainbow', 'assets/fx/fx_rainbow.png');

    // Blockers
    this.load.image('blocker_ice', 'assets/blockers/blocker_ice.png');
    this.load.image('blocker_rock', 'assets/blockers/blocker_rock.png');
    this.load.image('blocker_key', 'assets/blockers/blocker_key.png');
  }

  create(): void {
    // Initialize SoundSystem as a singleton, stored in game registry
    const soundSystem = new SoundSystem();
    this.registry.set('soundSystem', soundSystem);

    // Transition to Workshop (main hub)
    this.scene.start(SCENE_WORKSHOP);
  }
}
