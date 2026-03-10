import Phaser from 'phaser';
import { GEM_SIZE, BlockerType } from '../config';

/** Alpha per ice layer count */
const ICE_ALPHA: Record<number, number> = {
  1: 0.4,
  2: 0.7,
  3: 1.0,
};

/**
 * Blocker — obstacles on the board (ice, rock, drop item).
 * Uses pre-loaded sprite assets.
 */
export class Blocker extends Phaser.GameObjects.Container {
  public blockerType: BlockerType;
  public gridRow: number;
  public gridCol: number;
  public layers: number; // For ice: 1-3 layers

  private blockerSprite: Phaser.GameObjects.Image | null = null;

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
        const alpha = ICE_ALPHA[this.layers] ?? 0.4;
        this.blockerSprite = this.scene.add.image(0, 0, 'blocker_ice');
        this.blockerSprite.setDisplaySize(size, size);
        this.blockerSprite.setAlpha(alpha);
        this.add(this.blockerSprite);
        break;
      }
      case BlockerType.ROCK: {
        this.blockerSprite = this.scene.add.image(0, 0, 'blocker_rock');
        this.blockerSprite.setDisplaySize(size, size);
        this.add(this.blockerSprite);
        break;
      }
      case BlockerType.DROP_ITEM: {
        this.blockerSprite = this.scene.add.image(0, 0, 'blocker_key');
        this.blockerSprite.setDisplaySize(size * 0.7, size * 0.7);
        this.add(this.blockerSprite);
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
      // Update alpha for remaining layers
      if (this.blockerSprite) {
        this.blockerSprite.setAlpha(ICE_ALPHA[this.layers] ?? 0.4);
      }
    }
    return this.layers === 0;
  }
}
