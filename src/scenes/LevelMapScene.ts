import Phaser from 'phaser';
import { SCENE_LEVEL_MAP, GAME_WIDTH, GAME_HEIGHT, WOOD_COLOR } from '../config';

/**
 * LevelMapScene — world map with level nodes.
 * Locations: Mountain Mine → Sea Cave → Volcano → Underwater Grottos → ...
 */
export class LevelMapScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENE_LEVEL_MAP });
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#1B3A4B');

    const title = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'Карта путешествий', {
      fontFamily: 'Arial',
      fontSize: '36px',
      color: WOOD_COLOR,
    });
    title.setOrigin(0.5);

    const hint = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 50, '(в разработке)', {
      fontFamily: 'Arial',
      fontSize: '20px',
      color: '#999999',
    });
    hint.setOrigin(0.5);
  }
}
