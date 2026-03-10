import Phaser from 'phaser';
import {
  GEM_SIZE,
  GEM_COLORS_INT,
  GemType,
  SpecialGemType,
} from '../config';

/** Mapping gemType → sprite texture key */
const GEM_TEXTURE_MAP: Record<GemType, string> = {
  ruby: 'gem_ruby',
  sapphire: 'gem_sapphire',
  emerald: 'gem_emerald',
  amber: 'gem_amber',
  amethyst: 'gem_amethyst',
  topaz: 'gem_topaz',
};

/** Mapping special type → FX overlay texture key */
const FX_TEXTURE_MAP: Partial<Record<SpecialGemType, string>> = {
  [SpecialGemType.HORIZONTAL_STRIPE]: 'fx_stripe_h',
  [SpecialGemType.VERTICAL_STRIPE]: 'fx_stripe_v',
  [SpecialGemType.BOMB]: 'fx_bomb',
};

/** Sprite display size inside a cell (slightly smaller than GEM_SIZE for padding) */
const GEM_DISPLAY = GEM_SIZE - 8;

/**
 * Gem — a single gem on the board.
 * Uses pre-loaded sprites instead of programmatic graphics.
 * Special gem types have an FX overlay; rainbow replaces the base sprite entirely.
 */
export class Gem extends Phaser.GameObjects.Container {
  public gemType: GemType;
  public specialType: SpecialGemType;
  public gridRow: number;
  public gridCol: number;

  private gemSprite!: Phaser.GameObjects.Image;
  private fxSprite: Phaser.GameObjects.Image | null = null;
  private selectTween: Phaser.Tweens.Tween | null = null;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    gemType: GemType,
    row: number,
    col: number,
    specialType: SpecialGemType = SpecialGemType.NONE,
  ) {
    super(scene, x, y);

    this.gemType = gemType;
    this.specialType = specialType;
    this.gridRow = row;
    this.gridCol = col;

    this.drawGem();

    this.setSize(GEM_SIZE, GEM_SIZE);
    this.setInteractive();
    scene.add.existing(this);
  }

  private drawGem(): void {
    // Main gem sprite
    const textureKey = this.specialType === SpecialGemType.RAINBOW
      ? 'fx_rainbow'
      : GEM_TEXTURE_MAP[this.gemType];

    this.gemSprite = this.scene.add.image(0, 0, textureKey);
    this.gemSprite.setDisplaySize(GEM_DISPLAY, GEM_DISPLAY);
    this.add(this.gemSprite);

    // FX overlay for special types (except rainbow, which replaces sprite)
    if (this.specialType !== SpecialGemType.NONE && this.specialType !== SpecialGemType.RAINBOW) {
      this.drawFxOverlay();
    }

    // Pulse animation for bomb / rainbow
    if (this.specialType === SpecialGemType.BOMB || this.specialType === SpecialGemType.RAINBOW) {
      this.startPulse();
    }
  }

  private drawFxOverlay(): void {
    const fxKey = FX_TEXTURE_MAP[this.specialType];
    if (!fxKey) return;

    this.fxSprite = this.scene.add.image(0, 0, fxKey);
    this.fxSprite.setDisplaySize(GEM_DISPLAY, GEM_DISPLAY);
    this.fxSprite.setAlpha(0.8);
    this.add(this.fxSprite);
  }

  private startPulse(): void {
    this.scene.tweens.add({
      targets: this,
      scaleX: { from: 1.0, to: 1.08 },
      scaleY: { from: 1.0, to: 1.08 },
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  /**
   * Update gem color / sprite (e.g. when type changes during shuffle).
   */
  public setGemType(type: GemType): void {
    this.gemType = type;
    if (this.specialType === SpecialGemType.RAINBOW) return; // rainbow has no color-based sprite
    this.gemSprite.setTexture(GEM_TEXTURE_MAP[type]);
  }

  /**
   * Set special type and update visual.
   */
  public setSpecialType(type: SpecialGemType): void {
    this.specialType = type;

    // Remove old FX overlay
    if (this.fxSprite) {
      this.fxSprite.destroy();
      this.fxSprite = null;
    }

    if (type === SpecialGemType.RAINBOW) {
      // Replace base sprite with rainbow
      this.gemSprite.setTexture('fx_rainbow');
      this.startPulse();
    } else if (type !== SpecialGemType.NONE) {
      // Restore gem sprite to correct color (in case it was rainbow before)
      this.gemSprite.setTexture(GEM_TEXTURE_MAP[this.gemType]);
      this.drawFxOverlay();
      if (type === SpecialGemType.BOMB) {
        this.startPulse();
      }
    } else {
      // Back to normal
      this.gemSprite.setTexture(GEM_TEXTURE_MAP[this.gemType]);
    }
  }

  /**
   * Highlight gem (selected state) — pulsating scale tween.
   */
  public setSelected(selected: boolean): void {
    if (selected) {
      this.selectTween = this.scene.tweens.add({
        targets: this,
        scaleX: { from: 1.0, to: 1.12 },
        scaleY: { from: 1.0, to: 1.12 },
        duration: 400,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    } else {
      if (this.selectTween) {
        this.selectTween.stop();
        this.selectTween = null;
      }
      this.setScale(1.0);
    }
  }

  /**
   * Play destroy animation with particles.
   */
  public playDestroy(onComplete?: () => void): void {
    this.spawnParticles();

    this.scene.tweens.add({
      targets: this,
      scaleX: 0,
      scaleY: 0,
      alpha: 0,
      duration: 150,
      ease: 'Power2',
      onComplete: () => {
        if (onComplete) onComplete();
        this.destroy();
      },
    });
  }

  /**
   * Spawn small colored particles on destroy.
   */
  private spawnParticles(): void {
    const color = GEM_COLORS_INT[this.gemType];
    const count = 6;
    const worldPos = this.getWorldTransformMatrix();

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const speed = 40 + Math.random() * 60;
      const size = 2 + Math.random() * 3;

      const particle = this.scene.add.circle(
        worldPos.tx,
        worldPos.ty,
        size,
        color,
        0.9,
      );
      particle.setDepth(100);

      this.scene.tweens.add({
        targets: particle,
        x: worldPos.tx + Math.cos(angle) * speed,
        y: worldPos.ty + Math.sin(angle) * speed,
        alpha: 0,
        scaleX: 0,
        scaleY: 0,
        duration: 300 + Math.random() * 200,
        ease: 'Power2',
        onComplete: () => particle.destroy(),
      });
    }
  }

  /**
   * Play bounce animation (after swap).
   */
  public playBounce(): void {
    this.scene.tweens.add({
      targets: this,
      scaleX: { from: 1.15, to: 1.0 },
      scaleY: { from: 0.9, to: 1.0 },
      duration: 200,
      ease: 'Bounce.easeOut',
    });
  }
}
