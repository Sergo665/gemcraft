import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, CAVE_BG_INT } from './config';
import { BootScene } from './scenes/BootScene';
import { WorkshopScene } from './scenes/WorkshopScene';
import { GameScene } from './scenes/GameScene';
import { LevelMapScene } from './scenes/LevelMapScene';
import { UIScene } from './scenes/UIScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: CAVE_BG_INT,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  input: {
    touch: true,
  },
  scene: [BootScene, WorkshopScene, GameScene, LevelMapScene, UIScene],
};

new Phaser.Game(config);
