import Phaser from 'phaser';
import { GEM_SIZE, BlockerType } from '../config';

/**
 * Blocker — obstacles on the board (ice, rock, drop item).
 * Rendered as colored overlays/shapes (placeholder until sprites are ready).
 */
export class Blocker extends Phaser.GameObjects.Container {
  public blockerType: BlockerType;
  public gridRow: number;
  public gridCol: number;
  public layers: number; // For ice: 1-3 layers

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    blockerType: BlockerType,
    row: number,
    col: number,
  ) {
    super(scene, x, y);

    this.blockerType = blockerType;
    this.gridRow = row;
    this.gridCol = col;
    this.layers = this.getInitialLayers();

    this.drawBlocker();
    scene.add.existing(this);
  }

  private getInitialLayers(): number {
    switch (this.blockerType) {
      case BlockerType.ICE_1:
        return 1;
      case BlockerType.ICE_2:
        return 2;
      case BlockerType.ICE_3:
        return 3;
      default:
        return 0;
    }
  }

  private drawBlocker(): void {
    const size = GEM_SIZE - 4;

    switch (this.blockerType) {
      case BlockerType.ICE_1:
      case BlockerType.ICE_2:
      case BlockerType.ICE_3: {
        const alpha = 0.2 + this.layers * 0.2;
        const ice = this.scene.add.rectangle(0, 0, size, size, 0xAADDFF, alpha);
        ice.setStrokeStyle(1, 0xFFFFFF, 0.5);
        this.add(ice);
        break;
      }
      case BlockerType.ROCK: {
        const rock = this.scene.add.rectangle(0, 0, size, size, 0x4A4A4A, 0.9);
        rock.setStrokeStyle(2, 0x333333, 1);
        this.add(rock);
        break;
      }
      case BlockerType.DROP_ITEM: {
        const item = this.scene.add.circle(0, 0, size / 3, 0xFFD700, 1);
        item.setStrokeStyle(2, 0xDAA520, 1);
        this.add(item);
        const arrow = this.scene.add.text(0, size / 3, '↓', {
          fontSize: '14px',
          color: '#FFD700',
        });
        arrow.setOrigin(0.5);
        this.add(arrow);
        break;
      }
    }
  }

  /**
   * Reduce ice layer by 1. Returns true if blocker is fully destroyed.
   */
  public hitIce(): boolean {
    if (this.layers > 0) {
      this.layers--;
      if (this.layers === 0) {
        this.destroy();
        return true;
      }
      // Redraw with updated opacity
      this.removeAll(true);
      this.drawBlocker();
    }
    return this.layers === 0;
  }
}
