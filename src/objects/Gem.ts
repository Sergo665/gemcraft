import Phaser from 'phaser';
import {
  GEM_SIZE,
  GEM_COLORS_INT,
  GemType,
  SpecialGemType,
} from '../config';

/**
 * Gem — a single gem on the board.
 * Drawn as a circle with gradient (light center → dark edge),
 * soft shadow, and special type indicators.
 */
export class Gem extends Phaser.GameObjects.Container {
  public gemType: GemType;
  public specialType: SpecialGemType;
  public gridRow: number;
  public gridCol: number;

  private mainGraphics!: Phaser.GameObjects.Graphics;
  private specialGraphics: Phaser.GameObjects.Graphics | null = null;
  private shadowGraphics!: Phaser.GameObjects.Graphics;
  private pulseTimer: Phaser.Time.TimerEvent | null = null;

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
    const radius = GEM_SIZE / 2 - 4;

    // Shadow (slightly offset below)
    this.shadowGraphics = this.scene.add.graphics();
    this.shadowGraphics.fillStyle(0x000000, 0.25);
    this.shadowGraphics.fillCircle(2, 3, radius - 1);
    this.add(this.shadowGraphics);

    // Main gem body
    this.mainGraphics = this.scene.add.graphics();
    this.drawGemBody(radius);
    this.add(this.mainGraphics);

    // Special indicator
    if (this.specialType !== SpecialGemType.NONE) {
      this.drawSpecialIndicator(radius);
    }
  }

  private drawGemBody(radius: number): void {
    const color = GEM_COLORS_INT[this.gemType];
    this.mainGraphics.clear();

    // Outer ring (darker shade)
    this.mainGraphics.fillStyle(this.darkenColor(color, 0.7), 1);
    this.mainGraphics.fillCircle(0, 0, radius);

    // Inner body
    this.mainGraphics.fillStyle(color, 1);
    this.mainGraphics.fillCircle(0, 0, radius - 2);

    // Highlight (lighter center, offset up-left)
    this.mainGraphics.fillStyle(this.lightenColor(color, 1.4), 0.6);
    this.mainGraphics.fillCircle(-radius * 0.2, -radius * 0.2, radius * 0.5);

    // Small bright specular highlight
    this.mainGraphics.fillStyle(0xFFFFFF, 0.5);
    this.mainGraphics.fillCircle(-radius * 0.25, -radius * 0.3, radius * 0.18);

    // Subtle rim
    this.mainGraphics.lineStyle(1.5, 0xFFFFFF, 0.15);
    this.mainGraphics.strokeCircle(0, 0, radius - 1);
  }

  private drawSpecialIndicator(radius: number): void {
    if (this.specialGraphics) {
      this.specialGraphics.destroy();
    }
    this.specialGraphics = this.scene.add.graphics();

    switch (this.specialType) {
      case SpecialGemType.HORIZONTAL_STRIPE:
        // Horizontal white stripe through the gem
        this.specialGraphics.fillStyle(0xFFFFFF, 0.7);
        this.specialGraphics.fillRect(-radius + 4, -3, (radius - 4) * 2, 6);
        this.specialGraphics.fillStyle(0xFFFFFF, 0.4);
        this.specialGraphics.fillRect(-radius + 6, -5, (radius - 6) * 2, 2);
        this.specialGraphics.fillRect(-radius + 6, 3, (radius - 6) * 2, 2);
        break;

      case SpecialGemType.VERTICAL_STRIPE:
        // Vertical white stripe through the gem
        this.specialGraphics.fillStyle(0xFFFFFF, 0.7);
        this.specialGraphics.fillRect(-3, -radius + 4, 6, (radius - 4) * 2);
        this.specialGraphics.fillStyle(0xFFFFFF, 0.4);
        this.specialGraphics.fillRect(-5, -radius + 6, 2, (radius - 6) * 2);
        this.specialGraphics.fillRect(3, -radius + 6, 2, (radius - 6) * 2);
        break;

      case SpecialGemType.BOMB:
        // Pulsating ring
        this.specialGraphics.lineStyle(2.5, 0xFFFFFF, 0.7);
        this.specialGraphics.strokeCircle(0, 0, radius - 5);
        this.specialGraphics.lineStyle(1.5, 0xFFFFFF, 0.4);
        this.specialGraphics.strokeCircle(0, 0, radius - 8);
        // Star in center
        this.drawSmallStar(this.specialGraphics, 0, 0, 6, 0xFFFFFF, 0.8);
        // Start pulse animation
        this.startBombPulse();
        break;

      case SpecialGemType.RAINBOW: {
        // Rainbow gem — draw colored arcs
        const rainbowColors = [0xE63946, 0xF4A261, 0x2A9D8F, 0x457B9D, 0x7B2D8E];
        const arcWidth = 3;
        for (let i = 0; i < rainbowColors.length; i++) {
          this.specialGraphics.lineStyle(arcWidth, rainbowColors[i], 0.8);
          const arcRadius = radius - 4 - i * (arcWidth + 1);
          if (arcRadius > 2) {
            this.specialGraphics.beginPath();
            this.specialGraphics.arc(0, 0, arcRadius, 0, Math.PI * 2);
            this.specialGraphics.strokePath();
          }
        }
        // Bright center
        this.specialGraphics.fillStyle(0xFFFFFF, 0.7);
        this.specialGraphics.fillCircle(0, 0, 5);
        this.startBombPulse();
        break;
      }
    }

    this.add(this.specialGraphics);
  }

  private drawSmallStar(
    g: Phaser.GameObjects.Graphics,
    cx: number,
    cy: number,
    r: number,
    color: number,
    alpha: number,
  ): void {
    g.fillStyle(color, alpha);
    const points: Phaser.Geom.Point[] = [];
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 - Math.PI / 2;
      const rad = i % 2 === 0 ? r : r * 0.4;
      points.push(new Phaser.Geom.Point(cx + Math.cos(angle) * rad, cy + Math.sin(angle) * rad));
    }
    g.fillPoints(points, true);
  }

  private startBombPulse(): void {
    if (this.pulseTimer) return;
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

  /** Darken a color by a factor (0..1 = darker). */
  private darkenColor(color: number, factor: number): number {
    const r = Math.floor(((color >> 16) & 0xFF) * factor);
    const g = Math.floor(((color >> 8) & 0xFF) * factor);
    const b = Math.floor((color & 0xFF) * factor);
    return (r << 16) | (g << 8) | b;
  }

  /** Lighten a color by a factor (>1 = lighter). */
  private lightenColor(color: number, factor: number): number {
    const r = Math.min(255, Math.floor(((color >> 16) & 0xFF) * factor));
    const g = Math.min(255, Math.floor(((color >> 8) & 0xFF) * factor));
    const b = Math.min(255, Math.floor((color & 0xFF) * factor));
    return (r << 16) | (g << 8) | b;
  }

  /**
   * Update gem color (e.g. when type changes).
   */
  public setGemType(type: GemType): void {
    this.gemType = type;
    const radius = GEM_SIZE / 2 - 4;
    this.drawGemBody(radius);
  }

  /**
   * Set special type and redraw indicator.
   */
  public setSpecialType(type: SpecialGemType): void {
    this.specialType = type;
    const radius = GEM_SIZE / 2 - 4;
    if (type !== SpecialGemType.NONE) {
      this.drawSpecialIndicator(radius);
    } else if (this.specialGraphics) {
      this.specialGraphics.destroy();
      this.specialGraphics = null;
    }
  }

  /**
   * Highlight gem (selected state).
   */
  public setSelected(selected: boolean): void {
    if (selected) {
      this.setScale(1.15);
      // Add glow
      if (this.mainGraphics) {
        this.mainGraphics.lineStyle(3, 0xFFFFFF, 0.9);
        this.mainGraphics.strokeCircle(0, 0, GEM_SIZE / 2 - 3);
      }
    } else {
      this.setScale(1.0);
      // Redraw without extra glow
      const radius = GEM_SIZE / 2 - 4;
      this.drawGemBody(radius);
    }
  }

  /**
   * Play destroy animation with particles.
   */
  public playDestroy(onComplete?: () => void): void {
    // Spawn particles
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
