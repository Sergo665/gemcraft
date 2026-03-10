import Phaser from 'phaser';
import {
  SCENE_WORKSHOP,
  SCENE_GAME,
  GAME_WIDTH,
  GAME_HEIGHT,
  WOOD_COLOR_INT,
  WOOD_DARK_INT,
} from '../config';
import { SoundSystem } from '../systems/SoundSystem';

// Workshop color palette
const BG_COLOR = 0x2C1810;
const WALL_COLOR = 0x4A2E1A;
const WALL_LIGHT = 0x5C3A24;
const WALL_PLANK = 0x3E2414;
const FLOOR_COLOR = 0x3A2010;
const FLOOR_LIGHT = 0x4A2A18;
const BEAM_COLOR = 0x3E2010;
const DOOR_COLOR = 0x5C3820;
const DOOR_DARK = 0x3E2410;
const DOOR_HANDLE = 0xC8A040;
const SHELF_COLOR = 0x5A3420;
const MAIL_COLOR = 0x6A5040;
const MAIL_RUST = 0x8A6A50;
const BOARD_COLOR = 0x6A5030;
const BENCH_COLOR = 0x5A3820;
const STONE_HEARTH = 0x4A4040;
const FIRE_ORANGE = 0xFF6B20;
const FIRE_YELLOW = 0xFFCC00;
const FIRE_RED = 0xFF3300;
const WINDOW_BLUE = 0x6BA3BE;
const WINDOW_FRAME = 0x4A3020;
const UI_BG = 0x3A2010;
const UI_BORDER = 0x5C3A1E;
const GOLD_COLOR = 0xFFD700;
const GEAR_COLOR = 0xC0C0C0;

/**
 * WorkshopScene — the main hub. Frontal view of a cozy mountain workshop.
 * All objects drawn programmatically via Phaser Graphics.
 */
export class WorkshopScene extends Phaser.Scene {
  private soundSystem!: SoundSystem;
  private fireParticles: Phaser.GameObjects.Arc[] = [];
  private doorGlow!: Phaser.GameObjects.Rectangle;
  private toastText: Phaser.GameObjects.Text | null = null;
  private toastBg: Phaser.GameObjects.Graphics | null = null;
  private settingsContainer: Phaser.GameObjects.Container | null = null;

  constructor() {
    super({ key: SCENE_WORKSHOP });
  }

  create(): void {
    this.cameras.main.setBackgroundColor(BG_COLOR);

    // Get SoundSystem from registry
    this.soundSystem = this.registry.get('soundSystem') as SoundSystem;

    this.drawWalls();
    this.drawFloor();
    this.drawBeams();
    this.drawWindow();
    this.drawFireplace();
    this.drawDoor();
    this.drawShelf();
    this.drawMailbox();
    this.drawTaskBoard();
    this.drawWorkbench();
    this.drawUI();

    // Start fire animation
    this.startFireAnimation();
    // Start door pulse
    this.startDoorPulse();
  }

  // ─── Room structure ────────────────────────────────────────

  private drawWalls(): void {
    const g = this.add.graphics();

    // Main wall background
    g.fillStyle(WALL_COLOR, 1);
    g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT * 0.78);

    // Horizontal planks (wood texture)
    for (let y = 0; y < GAME_HEIGHT * 0.78; y += 60) {
      // Plank line
      g.fillStyle(WALL_PLANK, 0.4);
      g.fillRect(0, y, GAME_WIDTH, 2);

      // Alternating slightly lighter/darker planks
      if (Math.floor(y / 60) % 2 === 0) {
        g.fillStyle(WALL_LIGHT, 0.15);
        g.fillRect(0, y + 2, GAME_WIDTH, 58);
      }
    }

    // Vertical plank separators (wood grain effect)
    const plankWidths = [110, 140, 120, 130, 150];
    let px = 0;
    for (const pw of plankWidths) {
      px += pw;
      if (px >= GAME_WIDTH) break;
      g.fillStyle(WALL_PLANK, 0.25);
      g.fillRect(px - 1, 0, 2, GAME_HEIGHT * 0.78);
    }
  }

  private drawFloor(): void {
    const g = this.add.graphics();
    const floorY = GAME_HEIGHT * 0.78;
    const floorH = GAME_HEIGHT - floorY;

    // Floor base
    g.fillStyle(FLOOR_COLOR, 1);
    g.fillRect(0, floorY, GAME_WIDTH, floorH);

    // Floor planks
    for (let x = 0; x < GAME_WIDTH; x += 90) {
      g.fillStyle(FLOOR_LIGHT, 0.2);
      g.fillRect(x, floorY, 2, floorH);
    }

    // Floor-wall border
    g.fillStyle(WALL_PLANK, 0.6);
    g.fillRect(0, floorY - 3, GAME_WIDTH, 6);
  }

  private drawBeams(): void {
    const g = this.add.graphics();

    // Two ceiling beams
    const beamY = 20;
    const beamH = 18;

    g.fillStyle(BEAM_COLOR, 0.8);
    g.fillRect(0, beamY, GAME_WIDTH, beamH);
    g.fillStyle(WALL_PLANK, 0.3);
    g.fillRect(0, beamY + beamH - 2, GAME_WIDTH, 2);

    // Second beam
    g.fillStyle(BEAM_COLOR, 0.6);
    g.fillRect(0, beamY + 40, GAME_WIDTH, 12);
  }

  // ─── Decorative objects ────────────────────────────────────

  private drawWindow(): void {
    // Left-upper quadrant
    const wx = 55;
    const wy = 110;
    const ww = 120;
    const wh = 140;

    const g = this.add.graphics();

    // Window frame (wood)
    g.fillStyle(WINDOW_FRAME, 1);
    g.fillRoundedRect(wx - 8, wy - 8, ww + 16, wh + 16, 6);

    // Glass pane — blue glow (mountains view)
    g.fillStyle(WINDOW_BLUE, 0.7);
    g.fillRoundedRect(wx, wy, ww, wh, 3);

    // Cross frame divider
    g.fillStyle(WINDOW_FRAME, 1);
    g.fillRect(wx + ww / 2 - 3, wy, 6, wh);
    g.fillRect(wx, wy + wh / 2 - 3, ww, 6);

    // Mountain silhouette inside window
    g.fillStyle(0x3A6080, 0.6);
    g.fillTriangle(
      wx + 10, wy + wh - 10,
      wx + 35, wy + 40,
      wx + 60, wy + wh - 10,
    );
    g.fillTriangle(
      wx + 40, wy + wh - 10,
      wx + 70, wy + 30,
      wx + ww - 10, wy + wh - 10,
    );

    // Snow on peaks
    g.fillStyle(0xFFFFFF, 0.5);
    g.fillTriangle(
      wx + 28, wy + 45,
      wx + 35, wy + 40,
      wx + 42, wy + 45,
    );
    g.fillTriangle(
      wx + 63, wy + 35,
      wx + 70, wy + 30,
      wx + 77, wy + 35,
    );

    // Soft glow effect
    const glow = this.add.rectangle(wx + ww / 2, wy + wh / 2, ww + 30, wh + 30, WINDOW_BLUE, 0.08);
    glow.setBlendMode(Phaser.BlendModes.ADD);
  }

  private drawFireplace(): void {
    // Left-lower area
    const fx = 30;
    const fy = GAME_HEIGHT * 0.78 - 180;
    const fw = 140;
    const fh = 180;

    const g = this.add.graphics();

    // Stone hearth
    g.fillStyle(STONE_HEARTH, 1);
    g.fillRoundedRect(fx, fy, fw, fh, { tl: 12, tr: 12, bl: 4, br: 4 });

    // Inner fireplace opening (dark arch)
    g.fillStyle(0x1A1010, 1);
    g.fillRoundedRect(fx + 18, fy + 40, fw - 36, fh - 45, { tl: 30, tr: 30, bl: 4, br: 4 });

    // Stone detail lines
    g.lineStyle(1, 0x5A5050, 0.3);
    for (let sy = fy + 15; sy < fy + fh; sy += 25) {
      g.lineBetween(fx + 5, sy, fx + fw - 5, sy);
    }

    // Mantle shelf
    g.fillStyle(WOOD_DARK_INT, 1);
    g.fillRoundedRect(fx - 8, fy - 6, fw + 16, 14, 3);

    // Fire particles will be animated — create them here
    const fireBaseX = fx + fw / 2;
    const fireBaseY = fy + fh - 25;

    for (let i = 0; i < 8; i++) {
      const color = [FIRE_ORANGE, FIRE_YELLOW, FIRE_RED][i % 3];
      const size = 6 + Math.random() * 8;
      const offsetX = (Math.random() - 0.5) * 40;
      const offsetY = -Math.random() * 50;

      const particle = this.add.circle(
        fireBaseX + offsetX,
        fireBaseY + offsetY,
        size,
        color,
        0.7,
      );
      particle.setBlendMode(Phaser.BlendModes.ADD);
      this.fireParticles.push(particle);
    }

    // Warm glow on the floor
    const warmGlow = this.add.ellipse(fx + fw / 2, fy + fh + 20, 200, 60, FIRE_ORANGE, 0.06);
    warmGlow.setBlendMode(Phaser.BlendModes.ADD);
  }

  // ─── Interactive objects ───────────────────────────────────

  private drawDoor(): void {
    // Center, middle area
    const dx = GAME_WIDTH / 2 - 65;
    const dy = 270;
    const dw = 130;
    const dh = 220;

    const g = this.add.graphics();

    // Door frame
    g.fillStyle(WALL_PLANK, 1);
    g.fillRoundedRect(dx - 12, dy - 12, dw + 24, dh + 16, 6);

    // Door body
    g.fillStyle(DOOR_COLOR, 1);
    g.fillRoundedRect(dx, dy, dw, dh, { tl: 8, tr: 8, bl: 2, br: 2 });

    // Door panels (carved look)
    g.fillStyle(DOOR_DARK, 0.4);
    g.fillRoundedRect(dx + 15, dy + 20, dw - 30, 80, 4);
    g.fillRoundedRect(dx + 15, dy + 115, dw - 30, 80, 4);

    // Wood grain on door
    g.lineStyle(1, DOOR_DARK, 0.15);
    for (let ly = dy + 5; ly < dy + dh; ly += 12) {
      g.lineBetween(dx + 8, ly, dx + dw - 8, ly);
    }

    // Door handle (forged iron circle)
    g.fillStyle(DOOR_HANDLE, 1);
    g.fillCircle(dx + dw - 28, dy + dh / 2, 8);
    g.fillStyle(0x8A6A20, 1);
    g.fillCircle(dx + dw - 28, dy + dh / 2, 4);

    // Pulsating glow behind door
    this.doorGlow = this.add.rectangle(
      dx + dw / 2,
      dy + dh / 2,
      dw + 20,
      dh + 20,
      GOLD_COLOR,
      0.05,
    );
    this.doorGlow.setBlendMode(Phaser.BlendModes.ADD);

    // "ИГРАТЬ" button text over door
    const playText = this.add.text(dx + dw / 2, dy + dh / 2 + 10, 'ИГРАТЬ', {
      fontFamily: 'Arial Black, Arial',
      fontSize: '32px',
      color: '#FFD700',
      stroke: '#3A1800',
      strokeThickness: 4,
      shadow: {
        offsetX: 2,
        offsetY: 2,
        color: '#000000',
        blur: 4,
        fill: true,
      },
    });
    playText.setOrigin(0.5);

    // Make the door interactive
    const hitArea = this.add.rectangle(dx + dw / 2, dy + dh / 2, dw, dh, 0x000000, 0);
    hitArea.setInteractive({ cursor: 'pointer' });
    hitArea.on('pointerdown', () => {
      this.onDoorClick();
    });
  }

  private drawShelf(): void {
    // Right, middle area
    const sx = GAME_WIDTH - 170;
    const sy = 290;
    const sw = 140;
    const sh = 100;

    const g = this.add.graphics();

    // Shelf bracket (wall mount)
    g.fillStyle(SHELF_COLOR, 1);
    g.fillRoundedRect(sx, sy + sh - 12, sw, 12, 3);

    // Shelf supports
    g.fillStyle(WALL_PLANK, 0.8);
    g.fillTriangle(sx + 10, sy + sh, sx + 10, sy + sh + 25, sx + 30, sy + sh);
    g.fillTriangle(sx + sw - 10, sy + sh, sx + sw - 10, sy + sh + 25, sx + sw - 30, sy + sh);

    // Broken shelf effect — crack line
    g.lineStyle(2, 0x2A1808, 0.7);
    g.lineBetween(sx + sw / 2 - 10, sy + sh - 12, sx + sw / 2 + 5, sy + sh);
    g.lineStyle(1, 0x2A1808, 0.5);
    g.lineBetween(sx + sw / 2 + 5, sy + sh - 8, sx + sw / 2 + 15, sy + sh);

    // A couple of dull mineral shapes on the shelf
    g.fillStyle(0x6A4A6A, 0.5);
    g.fillCircle(sx + 30, sy + sh - 22, 10);
    g.fillStyle(0x4A6A5A, 0.5);
    g.fillCircle(sx + 70, sy + sh - 20, 8);
    g.fillStyle(0x6A5A4A, 0.4);
    g.fillCircle(sx + 105, sy + sh - 22, 9);

    // Label
    const label = this.add.text(sx + sw / 2, sy + sh + 35, 'Минералы', {
      fontFamily: 'Arial',
      fontSize: '13px',
      color: '#8A7A6A',
    });
    label.setOrigin(0.5);

    // Interactive
    const hitArea = this.add.rectangle(sx + sw / 2, sy + sh / 2 + 10, sw, sh + 30, 0x000000, 0);
    hitArea.setInteractive({ cursor: 'pointer' });
    hitArea.on('pointerdown', () => {
      this.showToast('Скоро...');
      this.soundSystem?.playButtonClick();
    });
  }

  private drawMailbox(): void {
    // Left, middle area
    const mx = 35;
    const my = 320;
    const mw = 80;
    const mh = 60;

    const g = this.add.graphics();

    // Mailbox body
    g.fillStyle(MAIL_COLOR, 1);
    g.fillRoundedRect(mx, my, mw, mh, 4);

    // Rust patches
    g.fillStyle(MAIL_RUST, 0.4);
    g.fillCircle(mx + 20, my + 25, 12);
    g.fillCircle(mx + 55, my + 35, 10);

    // Slot
    g.fillStyle(0x2A1A10, 0.8);
    g.fillRoundedRect(mx + 15, my + 12, mw - 30, 8, 2);

    // Rusty hinge
    g.fillStyle(0x8A5A30, 0.6);
    g.fillCircle(mx + mw - 10, my + 15, 4);

    // Label
    const label = this.add.text(mx + mw / 2, my + mh + 12, 'Почта', {
      fontFamily: 'Arial',
      fontSize: '13px',
      color: '#8A7A6A',
    });
    label.setOrigin(0.5);

    // Interactive
    const hitArea = this.add.rectangle(mx + mw / 2, my + mh / 2, mw + 20, mh + 20, 0x000000, 0);
    hitArea.setInteractive({ cursor: 'pointer' });
    hitArea.on('pointerdown', () => {
      this.showToast('Скоро...');
      this.soundSystem?.playButtonClick();
    });
  }

  private drawTaskBoard(): void {
    // Right-upper area
    const bx = GAME_WIDTH - 150;
    const by = 100;
    const bw = 110;
    const bh = 130;

    const g = this.add.graphics();

    // Board body
    g.fillStyle(BOARD_COLOR, 1);
    g.fillRoundedRect(bx, by, bw, bh, 4);

    // Board frame
    g.lineStyle(3, WOOD_DARK_INT, 0.7);
    g.strokeRoundedRect(bx, by, bw, bh, 4);

    // Nail at top center
    g.fillStyle(0x808080, 1);
    g.fillCircle(bx + bw / 2, by - 3, 5);
    g.fillStyle(0xA0A0A0, 0.7);
    g.fillCircle(bx + bw / 2, by - 3, 2);

    // Empty board indicator — faded text
    const emptyText = this.add.text(bx + bw / 2, by + bh / 2, 'Пусто', {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#6A5A4A',
    });
    emptyText.setOrigin(0.5);
    emptyText.setAlpha(0.5);

    // Label
    const label = this.add.text(bx + bw / 2, by + bh + 12, 'Задания', {
      fontFamily: 'Arial',
      fontSize: '13px',
      color: '#8A7A6A',
    });
    label.setOrigin(0.5);

    // Interactive
    const hitArea = this.add.rectangle(bx + bw / 2, by + bh / 2, bw + 10, bh + 20, 0x000000, 0);
    hitArea.setInteractive({ cursor: 'pointer' });
    hitArea.on('pointerdown', () => {
      this.showToast('Скоро...');
      this.soundSystem?.playButtonClick();
    });
  }

  private drawWorkbench(): void {
    // Right-lower area
    const wx = GAME_WIDTH - 190;
    const wy = GAME_HEIGHT * 0.78 - 120;
    const ww = 170;
    const wh = 120;

    const g = this.add.graphics();

    // Table top
    g.fillStyle(BENCH_COLOR, 1);
    g.fillRoundedRect(wx, wy, ww, 15, 3);

    // Table legs
    g.fillStyle(WOOD_DARK_INT, 0.8);
    g.fillRect(wx + 10, wy + 15, 12, wh - 15);
    g.fillRect(wx + ww - 22, wy + 15, 12, wh - 15);

    // Broken leg effect — one leg angled
    g.fillStyle(BENCH_COLOR, 0.6);
    // Diagonal crack piece
    g.lineStyle(2, 0x2A1808, 0.6);
    g.lineBetween(wx + ww - 18, wy + 50, wx + ww - 10, wy + 70);

    // Some tools on the table
    g.fillStyle(0x808080, 0.5);
    g.fillRect(wx + 30, wy - 3, 25, 5); // Hammer handle
    g.fillStyle(0x606060, 0.6);
    g.fillRect(wx + 28, wy - 6, 10, 8); // Hammer head

    g.fillStyle(0x707070, 0.4);
    g.fillRect(wx + 80, wy - 2, 40, 3); // File/rasp

    // Label
    const label = this.add.text(wx + ww / 2, wy + wh + 12, 'Верстак', {
      fontFamily: 'Arial',
      fontSize: '13px',
      color: '#8A7A6A',
    });
    label.setOrigin(0.5);

    // Interactive
    const hitArea = this.add.rectangle(wx + ww / 2, wy + wh / 2, ww + 10, wh + 20, 0x000000, 0);
    hitArea.setInteractive({ cursor: 'pointer' });
    hitArea.on('pointerdown', () => {
      this.showToast('Скоро...');
      this.soundSystem?.playButtonClick();
    });
  }

  // ─── UI elements ───────────────────────────────────────────

  private drawUI(): void {
    // --- Top-left: Coins ---
    this.drawCoinDisplay();

    // --- Top-right: Settings gear ---
    this.drawSettingsButton();

    // --- Bottom-center: Mastery ---
    this.drawMasteryDisplay();
  }

  private drawCoinDisplay(): void {
    const g = this.add.graphics();
    const px = 16;
    const py = 50;
    const pw = 120;
    const ph = 36;

    // Wooden plaque background
    g.fillStyle(UI_BG, 0.9);
    g.fillRoundedRect(px, py, pw, ph, 8);
    g.lineStyle(2, UI_BORDER, 0.8);
    g.strokeRoundedRect(px, py, pw, ph, 8);

    // Coin icon (circle)
    const coinX = px + 22;
    const coinY = py + ph / 2;
    g.fillStyle(GOLD_COLOR, 1);
    g.fillCircle(coinX, coinY, 11);
    g.fillStyle(0xDAA520, 1);
    g.fillCircle(coinX, coinY, 7);

    // Dollar sign on coin
    const coinSign = this.add.text(coinX, coinY, '$', {
      fontFamily: 'Arial',
      fontSize: '11px',
      color: '#FFD700',
      fontStyle: 'bold',
    });
    coinSign.setOrigin(0.5);

    // Amount text
    this.add.text(px + 42, coinY, '0', {
      fontFamily: 'Arial',
      fontSize: '18px',
      color: '#FFD700',
      fontStyle: 'bold',
    }).setOrigin(0, 0.5);
  }

  private drawSettingsButton(): void {
    const bx = GAME_WIDTH - 56;
    const by = 55;
    const bSize = 38;

    const g = this.add.graphics();

    // Wooden frame
    g.fillStyle(UI_BG, 0.9);
    g.fillRoundedRect(bx - bSize / 2, by - bSize / 2, bSize, bSize, 8);
    g.lineStyle(2, UI_BORDER, 0.8);
    g.strokeRoundedRect(bx - bSize / 2, by - bSize / 2, bSize, bSize, 8);

    // Gear icon (drawn from circles)
    g.fillStyle(GEAR_COLOR, 0.9);
    g.fillCircle(bx, by, 10);
    g.fillStyle(UI_BG, 1);
    g.fillCircle(bx, by, 5);

    // Gear teeth (8 teeth)
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const tx = bx + Math.cos(angle) * 12;
      const ty = by + Math.sin(angle) * 12;
      g.fillStyle(GEAR_COLOR, 0.9);
      g.fillCircle(tx, ty, 3);
    }

    // Interactive hit area
    const hitArea = this.add.rectangle(bx, by, bSize + 10, bSize + 10, 0x000000, 0);
    hitArea.setInteractive({ cursor: 'pointer' });
    hitArea.on('pointerdown', () => {
      this.soundSystem?.playButtonClick();
      this.showSettings();
    });
  }

  private drawMasteryDisplay(): void {
    const g = this.add.graphics();
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT - 55;
    const pw = 180;
    const ph = 36;

    // Wooden plaque
    g.fillStyle(UI_BG, 0.9);
    g.fillRoundedRect(cx - pw / 2, cy - ph / 2, pw, ph, 8);
    g.lineStyle(2, UI_BORDER, 0.8);
    g.strokeRoundedRect(cx - pw / 2, cy - ph / 2, pw, ph, 8);

    // Star icon
    const starX = cx - pw / 2 + 24;
    this.drawStar(g, starX, cy, 10, GOLD_COLOR);

    // Mastery text
    this.add.text(cx + 5, cy, 'Мастерство: 0', {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#FFD700',
      fontStyle: 'bold',
    }).setOrigin(0.5);
  }

  /** Draw a simple 5-point star. */
  private drawStar(g: Phaser.GameObjects.Graphics, cx: number, cy: number, r: number, color: number): void {
    g.fillStyle(color, 1);
    const points: number[] = [];
    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * Math.PI * 2 - Math.PI / 2;
      const radius = i % 2 === 0 ? r : r * 0.45;
      points.push(cx + Math.cos(angle) * radius);
      points.push(cy + Math.sin(angle) * radius);
    }
    // Draw using fillPoints
    const phaserPoints = [];
    for (let i = 0; i < points.length; i += 2) {
      phaserPoints.push(new Phaser.Geom.Point(points[i], points[i + 1]));
    }
    g.fillPoints(phaserPoints, true);
  }

  // ─── Settings modal ────────────────────────────────────────

  private showSettings(): void {
    if (this.settingsContainer) return; // Already open

    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    const mw = 280;
    const mh = 200;

    this.settingsContainer = this.add.container(0, 0);
    this.settingsContainer.setDepth(100);

    // Dim overlay
    const overlay = this.add.rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.5);
    overlay.setInteractive(); // Block clicks through
    this.settingsContainer.add(overlay);

    // Modal background
    const bg = this.add.graphics();
    bg.fillStyle(UI_BG, 0.95);
    bg.fillRoundedRect(cx - mw / 2, cy - mh / 2, mw, mh, 12);
    bg.lineStyle(3, UI_BORDER, 1);
    bg.strokeRoundedRect(cx - mw / 2, cy - mh / 2, mw, mh, 12);
    this.settingsContainer.add(bg);

    // Title
    const title = this.add.text(cx, cy - mh / 2 + 30, 'Настройки', {
      fontFamily: 'Arial',
      fontSize: '24px',
      color: '#FFD700',
      fontStyle: 'bold',
    });
    title.setOrigin(0.5);
    this.settingsContainer.add(title);

    // Sound toggle
    const soundLabel = this.add.text(cx - 60, cy - 10, 'Звук:', {
      fontFamily: 'Arial',
      fontSize: '20px',
      color: '#D4B896',
    });
    soundLabel.setOrigin(0, 0.5);
    this.settingsContainer.add(soundLabel);

    const isMuted = this.soundSystem?.getMuted() ?? false;
    const soundState = this.add.text(cx + 50, cy - 10, isMuted ? 'ВЫКЛ' : 'ВКЛ', {
      fontFamily: 'Arial',
      fontSize: '20px',
      color: isMuted ? '#AA6666' : '#66AA66',
      fontStyle: 'bold',
    });
    soundState.setOrigin(0, 0.5);
    this.settingsContainer.add(soundState);

    // Sound toggle hit area
    const toggleArea = this.add.rectangle(cx, cy - 10, mw - 40, 40, 0x000000, 0);
    toggleArea.setInteractive({ cursor: 'pointer' });
    toggleArea.on('pointerdown', () => {
      const newMuted = this.soundSystem?.toggleMute() ?? false;
      soundState.setText(newMuted ? 'ВЫКЛ' : 'ВКЛ');
      soundState.setColor(newMuted ? '#AA6666' : '#66AA66');
      if (!newMuted) {
        this.soundSystem?.playButtonClick();
      }
    });
    this.settingsContainer.add(toggleArea);

    // Close button
    const closeBtn = this.add.graphics();
    const cbx = cx;
    const cby = cy + mh / 2 - 40;
    const cbw = 120;
    const cbh = 36;
    closeBtn.fillStyle(WOOD_COLOR_INT, 1);
    closeBtn.fillRoundedRect(cbx - cbw / 2, cby - cbh / 2, cbw, cbh, 6);
    closeBtn.lineStyle(2, WOOD_DARK_INT, 1);
    closeBtn.strokeRoundedRect(cbx - cbw / 2, cby - cbh / 2, cbw, cbh, 6);
    this.settingsContainer.add(closeBtn);

    const closeText = this.add.text(cbx, cby, 'Закрыть', {
      fontFamily: 'Arial',
      fontSize: '18px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    });
    closeText.setOrigin(0.5);
    this.settingsContainer.add(closeText);

    const closeBtnArea = this.add.rectangle(cbx, cby, cbw + 10, cbh + 10, 0x000000, 0);
    closeBtnArea.setInteractive({ cursor: 'pointer' });
    closeBtnArea.on('pointerdown', () => {
      this.soundSystem?.playButtonClick();
      this.hideSettings();
    });
    this.settingsContainer.add(closeBtnArea);
  }

  private hideSettings(): void {
    if (this.settingsContainer) {
      this.settingsContainer.destroy(true);
      this.settingsContainer = null;
    }
  }

  // ─── Animations ────────────────────────────────────────────

  private startFireAnimation(): void {
    // Flicker each fire particle independently
    for (const particle of this.fireParticles) {
      this.tweens.add({
        targets: particle,
        alpha: { from: 0.3 + Math.random() * 0.4, to: 0.1 + Math.random() * 0.3 },
        y: particle.y - 5 - Math.random() * 15,
        scaleX: { from: 0.8, to: 1.2 + Math.random() * 0.3 },
        scaleY: { from: 0.8, to: 1.3 + Math.random() * 0.3 },
        duration: 300 + Math.random() * 500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        delay: Math.random() * 300,
      });
    }
  }

  private startDoorPulse(): void {
    if (!this.doorGlow) return;

    this.tweens.add({
      targets: this.doorGlow,
      alpha: { from: 0.03, to: 0.1 },
      scaleX: { from: 1.0, to: 1.05 },
      scaleY: { from: 1.0, to: 1.03 },
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  // ─── Actions ───────────────────────────────────────────────

  private onDoorClick(): void {
    this.soundSystem?.playButtonClick();

    // Transition to GameScene with level 1
    this.cameras.main.fadeOut(400, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start(SCENE_GAME, { level: 1 });
    });
  }

  // ─── Toast message ─────────────────────────────────────────

  private showToast(message: string): void {
    // Remove previous toast
    this.toastText?.destroy();
    this.toastBg?.destroy();

    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2 + 200;

    this.toastBg = this.add.graphics();
    this.toastBg.fillStyle(0x000000, 0.7);
    this.toastBg.fillRoundedRect(cx - 80, cy - 18, 160, 36, 12);
    this.toastBg.setDepth(90);

    this.toastText = this.add.text(cx, cy, message, {
      fontFamily: 'Arial',
      fontSize: '18px',
      color: '#FFFFFF',
    });
    this.toastText.setOrigin(0.5);
    this.toastText.setDepth(91);

    // Fade out after 1.5s
    this.time.delayedCall(1500, () => {
      if (this.toastText) {
        this.tweens.add({
          targets: [this.toastText, this.toastBg],
          alpha: 0,
          duration: 300,
          onComplete: () => {
            this.toastText?.destroy();
            this.toastBg?.destroy();
            this.toastText = null;
            this.toastBg = null;
          },
        });
      }
    });
  }
}
