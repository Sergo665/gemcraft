import Phaser from 'phaser';
import {
  SCENE_GAME,
  SCENE_WORKSHOP,
  GAME_WIDTH,
  GAME_HEIGHT,
  GRID_COLS,
  GRID_ROWS,
  GEM_SIZE,
  GEM_PADDING,
  GRID_OFFSET_X,
  GRID_OFFSET_Y,
  CAVE_BG_INT,
  CAVE_TOP_INT,
  CAVE_BOTTOM_INT,
  CAVE_WALL_INT,
  CAVE_WALL_LIGHT_INT,
  STALACTITE_DARK_INT,
  STALACTITE_LIGHT_INT,
  TORCH_YELLOW_INT,
  TORCH_ORANGE_INT,
  CAVE_FLOOR_INT,
  CAVE_FLOOR_LIGHT_INT,
  STONE_FRAME_INT,
  STONE_FRAME_LIGHT_INT,
  STONE_FRAME_DARK_INT,
  STONE_CRACK_INT,
  WOOD_COLOR_INT,
  WOOD_DARK_INT,
  STONE_COLOR_INT,
  BOLT_COLOR_INT,
  BOLT_HIGHLIGHT_INT,
  CHAIN_COLOR_INT,
  GEM_COLORS_INT,
  GoalType,
  GemType,
} from '../config';
import { Board, BoardEvents } from '../objects/Board';
import { GoalSystem, Goal } from '../systems/GoalSystem';
import { LevelSystem } from '../systems/LevelSystem';
import { SoundSystem } from '../systems/SoundSystem';
import { LEVELS } from '../data/levels';
import { formatNumber } from '../utils/helpers';

// UI constants
const HEADER_HEIGHT = 140;
const BOOSTER_PANEL_Y = GAME_HEIGHT - 80;

/**
 * GameScene — main match-3 gameplay scene.
 * Cave background, goal header, booster panel, modal windows.
 * All visuals drawn programmatically via Phaser Graphics API.
 */
export class GameScene extends Phaser.Scene {
  private board!: Board;
  private goalSystem!: GoalSystem;
  private levelSystem!: LevelSystem;
  private soundSystem: SoundSystem | null = null;

  private levelId = 1;
  private isGameOver = false;

  // UI elements (updated dynamically)
  private movesText!: Phaser.GameObjects.Text;
  private goalTexts: Phaser.GameObjects.Text[] = [];
  private goalProgressBars: Phaser.GameObjects.Graphics[] = [];
  private scoreText!: Phaser.GameObjects.Text;

  // Torch glow objects for animation
  private torchGlows: Phaser.GameObjects.Ellipse[] = [];

  // Modal container
  private modalContainer: Phaser.GameObjects.Container | null = null;

  // Pre-level modal shown
  private gameStarted = false;

  constructor() {
    super({ key: SCENE_GAME });
  }

  init(data: { level?: number; levelId?: number }): void {
    this.levelId = data?.level ?? data?.levelId ?? 1;
  }

  create(): void {
    this.isGameOver = false;
    this.gameStarted = false;
    this.torchGlows = [];
    this.cameras.main.setBackgroundColor(CAVE_BG_INT);

    this.soundSystem = this.registry.get('soundSystem') as SoundSystem ?? null;
    this.goalSystem = new GoalSystem();
    this.levelSystem = new LevelSystem();

    // Load level
    const levelConfig = this.levelSystem.loadLevel(LEVELS, this.levelId);
    if (!levelConfig) {
      // Fallback to level 1
      this.levelId = 1;
      this.levelSystem.loadLevel(LEVELS, 1);
    }
    const config = this.levelSystem.getCurrentLevel()!;

    // Set up goals
    this.goalSystem.setGoals(config.goals);

    // Draw scene
    this.drawCaveBackground();
    this.drawStoneFrame();
    this.drawGoalHeader(config);
    this.drawBoosterPanel();
    this.drawPauseButton();

    // Create board
    const events: BoardEvents = {
      onMoveMade: () => this.onMoveMade(),
      onScoreChanged: (score) => this.onScoreChanged(score),
      onLevelComplete: () => this.onLevelComplete(),
      onLevelFailed: () => this.onLevelFailed(),
    };

    this.board = new Board(this, this.goalSystem, events);
    this.board.create(config);

    // Score text (below header)
    this.scoreText = this.add.text(GAME_WIDTH / 2, HEADER_HEIGHT - 8, '0', {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#FFD700',
    });
    this.scoreText.setOrigin(0.5);
    this.scoreText.setDepth(20);

    // Show pre-level modal
    this.showPreLevelModal(config);
  }

  // ─── Cave background (programmatic) ────────────────────────

  private drawCaveBackground(): void {
    const g = this.add.graphics();
    g.setDepth(0);

    // Dark gradient from top to bottom via horizontal strips
    const stripCount = 20;
    const stripH = GAME_HEIGHT / stripCount;
    for (let i = 0; i < stripCount; i++) {
      const t = i / (stripCount - 1);
      const color = Phaser.Display.Color.Interpolate.ColorWithColor(
        Phaser.Display.Color.IntegerToColor(CAVE_TOP_INT),
        Phaser.Display.Color.IntegerToColor(CAVE_BOTTOM_INT),
        1,
        t,
      );
      const intColor = Phaser.Display.Color.GetColor(
        Math.round(color.r),
        Math.round(color.g),
        Math.round(color.b),
      );
      g.fillStyle(intColor, 1);
      g.fillRect(0, i * stripH, GAME_WIDTH, stripH + 1);
    }

    // Stone walls on left side (irregular dark-brown rectangles)
    this.drawCaveWall(g, 0, 0, 28, GAME_HEIGHT);
    this.drawCaveWall(g, GAME_WIDTH - 28, 0, 28, GAME_HEIGHT);

    // Stalactites hanging from top
    this.drawStalactites(g);

    // Stone floor at the bottom (below boosters)
    this.drawCaveFloor(g);

    // Torches — glow-only, no sprites
    this.placeTorchGlow(30, 350);
    this.placeTorchGlow(GAME_WIDTH - 30, 350);
    this.placeTorchGlow(30, 600);
    this.placeTorchGlow(GAME_WIDTH - 30, 600);
  }

  /** Draw irregular cave wall strip. */
  private drawCaveWall(
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    w: number,
    h: number,
  ): void {
    // Base wall
    g.fillStyle(CAVE_WALL_INT, 1);
    g.fillRect(x, y, w, h);

    // Irregular bumps (lighter patches at random intervals)
    const bumpCount = 12;
    for (let i = 0; i < bumpCount; i++) {
      const by = y + (h / bumpCount) * i + Math.random() * 20;
      const bw = w * (0.4 + Math.random() * 0.5);
      const bh = 20 + Math.random() * 30;
      const bx = x + (w - bw) * Math.random();
      g.fillStyle(CAVE_WALL_LIGHT_INT, 0.3 + Math.random() * 0.2);
      g.fillRect(bx, by, bw, bh);
    }
  }

  /** Draw stalactites hanging from the ceiling. */
  private drawStalactites(g: Phaser.GameObjects.Graphics): void {
    // Spread across the width, varying sizes
    const positions = [40, 90, 140, 200, 260, 310, 370, 430, 480, 510];
    for (const px of positions) {
      const height = 20 + Math.floor(Math.random() * 40);
      const halfW = 5 + Math.floor(Math.random() * 8);
      const color = Math.random() > 0.5 ? STALACTITE_DARK_INT : STALACTITE_LIGHT_INT;
      g.fillStyle(color, 0.7 + Math.random() * 0.3);
      g.fillTriangle(
        px - halfW, 0,
        px + halfW, 0,
        px + (Math.random() - 0.5) * 4, height,
      );
    }
  }

  /** Draw stone floor at the bottom of the cave. */
  private drawCaveFloor(g: Phaser.GameObjects.Graphics): void {
    const floorY = GAME_HEIGHT - 120;
    const floorH = 120;

    g.fillStyle(CAVE_FLOOR_INT, 1);
    g.fillRect(0, floorY, GAME_WIDTH, floorH);

    // Stone tile lines
    for (let x = 0; x < GAME_WIDTH; x += 70 + Math.floor(Math.random() * 20)) {
      g.fillStyle(CAVE_FLOOR_LIGHT_INT, 0.2);
      g.fillRect(x, floorY, 2, floorH);
    }
    // Horizontal line at top of floor
    g.fillStyle(CAVE_WALL_INT, 0.6);
    g.fillRect(0, floorY, GAME_WIDTH, 3);
  }

  /**
   * Place a torch as a glow-only effect (no sprite).
   * Yellow-orange ellipses with ADD blend and alpha pulse tween.
   */
  private placeTorchGlow(x: number, y: number): void {
    // Torch bracket (small brown rectangle on the wall)
    const bracket = this.add.graphics();
    bracket.setDepth(1);
    bracket.fillStyle(CAVE_WALL_LIGHT_INT, 0.8);
    bracket.fillRect(x - 4, y + 5, 8, 20);
    bracket.fillStyle(0x4A3020, 1);
    bracket.fillRect(x - 3, y - 5, 6, 14);

    // Outer glow (large, faint)
    const outerGlow = this.add.ellipse(x, y - 20, 60, 80, TORCH_ORANGE_INT, 0.12);
    outerGlow.setBlendMode(Phaser.BlendModes.ADD);
    outerGlow.setDepth(1);

    // Inner glow (small, bright)
    const innerGlow = this.add.ellipse(x, y - 15, 28, 40, TORCH_YELLOW_INT, 0.25);
    innerGlow.setBlendMode(Phaser.BlendModes.ADD);
    innerGlow.setDepth(1);

    this.torchGlows.push(outerGlow, innerGlow);

    // Flicker animation on outer glow
    this.tweens.add({
      targets: outerGlow,
      alpha: { from: 0.08, to: 0.18 },
      scaleX: { from: 0.9, to: 1.1 },
      scaleY: { from: 0.9, to: 1.1 },
      duration: 400 + Math.random() * 300,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      delay: Math.random() * 200,
    });

    // Flicker animation on inner glow
    this.tweens.add({
      targets: innerGlow,
      alpha: { from: 0.18, to: 0.35 },
      scaleX: { from: 0.95, to: 1.08 },
      scaleY: { from: 0.95, to: 1.08 },
      duration: 300 + Math.random() * 250,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
      delay: Math.random() * 150,
    });
  }

  // ─── Stone frame around the board (programmatic) ───────────

  private drawStoneFrame(): void {
    const cellSize = GEM_SIZE + GEM_PADDING;
    const boardWidth = GRID_COLS * cellSize + GEM_PADDING;
    const boardHeight = GRID_ROWS * cellSize + GEM_PADDING;
    const boardX = GRID_OFFSET_X - GEM_PADDING;
    const boardY = GRID_OFFSET_Y - GEM_PADDING;
    const ft = 17; // frame thickness

    const g = this.add.graphics();
    g.setDepth(3);

    const fx = boardX - ft;
    const fy = boardY - ft;
    const fw = boardWidth + ft * 2;
    const fh = boardHeight + ft * 2;
    const radius = 7;

    // Main stone fill
    g.fillStyle(STONE_FRAME_INT, 1);
    g.fillRoundedRect(fx, fy, fw, fh, radius);

    // Light edge (top + left) for 3D bevel
    g.lineStyle(2, STONE_FRAME_LIGHT_INT, 0.7);
    // Top edge
    g.lineBetween(fx + radius, fy + 1, fx + fw - radius, fy + 1);
    // Left edge
    g.lineBetween(fx + 1, fy + radius, fx + 1, fy + fh - radius);

    // Dark edge (bottom + right) for shadow
    g.lineStyle(2, STONE_FRAME_DARK_INT, 0.7);
    // Bottom edge
    g.lineBetween(fx + radius, fy + fh - 1, fx + fw - radius, fy + fh - 1);
    // Right edge
    g.lineBetween(fx + fw - 1, fy + radius, fx + fw - 1, fy + fh - radius);

    // Horizontal "cracks" at intervals
    const crackInterval = 45;
    g.lineStyle(1, STONE_CRACK_INT, 0.4);
    for (let cy = fy + crackInterval; cy < fy + fh - 10; cy += crackInterval + Math.random() * 15) {
      // Crack on left part of frame
      g.lineBetween(fx + 3, cy, fx + ft - 2, cy + (Math.random() - 0.5) * 4);
      // Crack on right part of frame
      g.lineBetween(fx + fw - ft + 2, cy, fx + fw - 3, cy + (Math.random() - 0.5) * 4);
    }
    // Vertical cracks on top/bottom
    for (let cx = fx + crackInterval; cx < fx + fw - 10; cx += crackInterval + Math.random() * 15) {
      g.lineBetween(cx, fy + 3, cx + (Math.random() - 0.5) * 4, fy + ft - 2);
      g.lineBetween(cx, fy + fh - ft + 2, cx + (Math.random() - 0.5) * 4, fy + fh - 3);
    }

    // Cut out the inner area (board area) — draw dark inset
    g.fillStyle(0x1A1010, 0.3);
    g.fillRoundedRect(boardX - 2, boardY - 2, boardWidth + 4, boardHeight + 4, 3);
  }

  // ─── Goal header (programmatic wooden panel) ───────────────

  private drawGoalHeader(config: ReturnType<LevelSystem['getCurrentLevel']> & object): void {
    const headerW = GAME_WIDTH - 40;
    const headerH = 60;
    const headerX = 20;
    const headerY = 50;

    const g = this.add.graphics();
    g.setDepth(20);

    // Chains hanging from top
    g.lineStyle(2, CHAIN_COLOR_INT, 0.6);
    g.lineBetween(headerX + 40, 0, headerX + 40, headerY);
    g.lineBetween(headerX + headerW - 40, 0, headerX + headerW - 40, headerY);
    // Chain link dots
    for (let cy = 5; cy < headerY; cy += 10) {
      g.fillStyle(CHAIN_COLOR_INT, 0.4);
      g.fillCircle(headerX + 40, cy, 2);
      g.fillCircle(headerX + headerW - 40, cy, 2);
    }

    // Wooden plaque background
    g.fillStyle(WOOD_COLOR_INT, 1);
    g.fillRoundedRect(headerX, headerY, headerW, headerH, 10);
    g.lineStyle(2, WOOD_DARK_INT, 1);
    g.strokeRoundedRect(headerX, headerY, headerW, headerH, 10);

    // Wood grain lines
    g.lineStyle(1, WOOD_DARK_INT, 0.15);
    for (let gy = headerY + 8; gy < headerY + headerH - 5; gy += 7) {
      g.lineBetween(headerX + 5, gy, headerX + headerW - 5, gy);
    }

    // Bolts at corners
    const boltOffX = 12;
    const boltOffY = 10;
    const boltPositions = [
      { x: headerX + boltOffX, y: headerY + boltOffY },
      { x: headerX + headerW - boltOffX, y: headerY + boltOffY },
      { x: headerX + boltOffX, y: headerY + headerH - boltOffY },
      { x: headerX + headerW - boltOffX, y: headerY + headerH - boltOffY },
    ];
    for (const bp of boltPositions) {
      g.fillStyle(BOLT_COLOR_INT, 1);
      g.fillCircle(bp.x, bp.y, 4);
      g.fillStyle(BOLT_HIGHLIGHT_INT, 0.7);
      g.fillCircle(bp.x - 1, bp.y - 1, 1.5);
    }

    // Level name
    const levelName = this.add.text(headerX + headerW / 2, headerY - 8, config.name, {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: '#D4B896',
    });
    levelName.setOrigin(0.5);
    levelName.setDepth(21);

    // Goals
    this.goalTexts = [];
    this.goalProgressBars = [];
    const goals = this.goalSystem.getGoals();
    const goalsWidth = goals.length * 120;
    const startX = headerX + (headerW - 100 - goalsWidth) / 2;

    for (let i = 0; i < goals.length; i++) {
      const gx = startX + i * 120 + 30;
      const gy = headerY + headerH / 2 + 2;

      // Goal icon (programmatic)
      this.placeGoalIcon(gx - 16, gy, goals[i]);

      // Goal text
      const goalText = this.add.text(gx + 8, gy, `${goals[i].current}/${goals[i].target}`, {
        fontFamily: 'Arial',
        fontSize: '18px',
        color: '#FFFFFF',
        fontStyle: 'bold',
      });
      goalText.setOrigin(0, 0.5);
      goalText.setDepth(21);
      this.goalTexts.push(goalText);
    }

    // Moves counter on the right
    this.movesText = this.add.text(
      headerX + headerW - 30,
      headerY + headerH / 2 + 2,
      `${config.moves}`,
      {
        fontFamily: 'Arial Black, Arial',
        fontSize: '28px',
        color: '#FFFFFF',
        stroke: '#3A2A1A',
        strokeThickness: 3,
      },
    );
    this.movesText.setOrigin(0.5);
    this.movesText.setDepth(21);

    // Small "ходов" label
    const movesLabel = this.add.text(
      headerX + headerW - 30,
      headerY + headerH / 2 + 22,
      'ходов',
      {
        fontFamily: 'Arial',
        fontSize: '10px',
        color: '#D4B896',
      },
    );
    movesLabel.setOrigin(0.5);
    movesLabel.setDepth(21);

    // Progress bar at bottom of header
    const progressG = this.add.graphics();
    progressG.setDepth(20);
    progressG.fillStyle(0x3A2A1A, 0.5);
    progressG.fillRoundedRect(headerX + 10, headerY + headerH - 6, headerW - 20, 4, 2);
    this.goalProgressBars.push(progressG);
  }

  /**
   * Draw a programmatic goal icon instead of using a sprite.
   */
  private placeGoalIcon(x: number, y: number, goal: Readonly<Goal>): void {
    const g = this.add.graphics();
    g.setDepth(21);

    switch (goal.type) {
      case GoalType.COLLECT_COLOR: {
        // Small diamond/rhombus of the gem color
        if (goal.color) {
          const color = GEM_COLORS_INT[goal.color] ?? 0xFFFFFF;
          const s = 10; // half-size
          g.fillStyle(color, 1);
          g.fillPoints([
            new Phaser.Geom.Point(x, y - s),
            new Phaser.Geom.Point(x + s, y),
            new Phaser.Geom.Point(x, y + s),
            new Phaser.Geom.Point(x - s, y),
          ], true);
          // Highlight
          g.fillStyle(0xFFFFFF, 0.3);
          g.fillPoints([
            new Phaser.Geom.Point(x, y - s),
            new Phaser.Geom.Point(x + s * 0.4, y - s * 0.3),
            new Phaser.Geom.Point(x, y),
            new Phaser.Geom.Point(x - s * 0.4, y - s * 0.3),
          ], true);
        }
        break;
      }
      case GoalType.BREAK_ICE: {
        // Light blue square with white diagonal lines (ice)
        const hs = 10;
        g.fillStyle(0x88CCEE, 0.9);
        g.fillRect(x - hs, y - hs, hs * 2, hs * 2);
        g.lineStyle(1.5, 0xFFFFFF, 0.6);
        g.lineBetween(x - hs + 3, y - hs + 3, x + hs - 3, y + hs - 3);
        g.lineBetween(x + hs - 3, y - hs + 3, x - hs + 3, y + hs - 3);
        // Border
        g.lineStyle(1, 0x66AACC, 0.8);
        g.strokeRect(x - hs, y - hs, hs * 2, hs * 2);
        break;
      }
      case GoalType.DROP_ITEM: {
        // Yellow cross/key shape
        const ks = 8;
        g.fillStyle(0xFFD700, 1);
        g.fillRect(x - 2, y - ks, 4, ks * 2); // vertical bar
        g.fillRect(x - ks, y - 2, ks * 2, 4); // horizontal bar
        // Small circle at center
        g.fillStyle(0xDAA520, 1);
        g.fillCircle(x, y, 3);
        break;
      }
      case GoalType.SCORE: {
        // Golden star
        g.fillStyle(0xFFD700, 1);
        const points: Phaser.Geom.Point[] = [];
        for (let i = 0; i < 10; i++) {
          const angle = (i / 10) * Math.PI * 2 - Math.PI / 2;
          const radius = i % 2 === 0 ? 9 : 4;
          points.push(new Phaser.Geom.Point(
            x + Math.cos(angle) * radius,
            y + Math.sin(angle) * radius,
          ));
        }
        g.fillPoints(points, true);
        break;
      }
    }
  }

  // ─── Booster panel (programmatic) ──────────────────────────

  private drawBoosterPanel(): void {
    const btnSize = 72;
    const spacing = 20;
    const totalW = btnSize * 3 + spacing * 2;
    const startX = (GAME_WIDTH - totalW) / 2;
    const y = BOOSTER_PANEL_Y;

    interface BoosterDef {
      name: string;
      action: () => void;
      drawIcon: (g: Phaser.GameObjects.Graphics, cx: number, cy: number) => void;
    }

    const boosters: BoosterDef[] = [
      {
        name: 'Молот',
        action: () => this.onHammerBooster(),
        drawIcon: (g, cx, cy) => {
          // Hammer: gray handle + dark block head
          g.fillStyle(0x8A8A8A, 1);
          g.fillRect(cx - 2, cy - 4, 4, 24); // handle
          g.fillStyle(0x555555, 1);
          g.fillRect(cx - 10, cy - 12, 20, 12); // head
          g.fillStyle(0x6A6A6A, 0.6);
          g.fillRect(cx - 9, cy - 11, 18, 3); // head highlight
        },
      },
      {
        name: 'Микс',
        action: () => this.onShuffleBooster(),
        drawIcon: (g, cx, cy) => {
          // Shuffle arrows: two curved arrow arcs
          g.lineStyle(3, 0xFFFFFF, 0.9);
          // Top arc (right-pointing)
          g.beginPath();
          g.arc(cx, cy - 2, 12, -Math.PI * 0.8, -Math.PI * 0.15, false);
          g.strokePath();
          // Arrowhead for top
          g.fillStyle(0xFFFFFF, 0.9);
          g.fillTriangle(
            cx + 10, cy - 8,
            cx + 14, cy - 2,
            cx + 6, cy - 2,
          );
          // Bottom arc (left-pointing)
          g.lineStyle(3, 0xFFFFFF, 0.9);
          g.beginPath();
          g.arc(cx, cy + 2, 12, Math.PI * 0.2, Math.PI * 0.85, false);
          g.strokePath();
          // Arrowhead for bottom
          g.fillTriangle(
            cx - 10, cy + 8,
            cx - 14, cy + 2,
            cx - 6, cy + 2,
          );
        },
      },
      {
        name: 'Радуга',
        action: () => this.onRainbowBooster(),
        drawIcon: (g, cx, cy) => {
          // Rainbow diamond — multi-colored rhombus
          const colors = [
            GEM_COLORS_INT.ruby,
            GEM_COLORS_INT.sapphire,
            GEM_COLORS_INT.emerald,
            GEM_COLORS_INT.amber,
            GEM_COLORS_INT.amethyst,
            GEM_COLORS_INT.topaz,
          ];
          const s = 14;
          // Draw 6 triangular slices from center
          for (let i = 0; i < 6; i++) {
            const a1 = (i / 6) * Math.PI * 2 - Math.PI / 2;
            const a2 = ((i + 1) / 6) * Math.PI * 2 - Math.PI / 2;
            g.fillStyle(colors[i], 1);
            g.fillTriangle(
              cx, cy,
              cx + Math.cos(a1) * s, cy + Math.sin(a1) * s,
              cx + Math.cos(a2) * s, cy + Math.sin(a2) * s,
            );
          }
          // White center highlight
          g.fillStyle(0xFFFFFF, 0.35);
          g.fillCircle(cx, cy, 4);
        },
      },
    ];

    for (let i = 0; i < boosters.length; i++) {
      const bx = startX + i * (btnSize + spacing) + btnSize / 2;
      const by = y + btnSize / 2;

      // Wooden button background
      const bg = this.add.graphics();
      bg.setDepth(20);
      bg.fillStyle(WOOD_COLOR_INT, 1);
      bg.fillRoundedRect(bx - btnSize / 2, by - btnSize / 2, btnSize, btnSize, 10);
      bg.lineStyle(2, WOOD_DARK_INT, 1);
      bg.strokeRoundedRect(bx - btnSize / 2, by - btnSize / 2, btnSize, btnSize, 10);

      // Bolts at corners of button
      const boff = 8;
      const boltPositions = [
        { x: bx - btnSize / 2 + boff, y: by - btnSize / 2 + boff },
        { x: bx + btnSize / 2 - boff, y: by - btnSize / 2 + boff },
        { x: bx - btnSize / 2 + boff, y: by + btnSize / 2 - boff },
        { x: bx + btnSize / 2 - boff, y: by + btnSize / 2 - boff },
      ];
      for (const bp of boltPositions) {
        bg.fillStyle(BOLT_COLOR_INT, 0.8);
        bg.fillCircle(bp.x, bp.y, 3);
        bg.fillStyle(BOLT_HIGHLIGHT_INT, 0.5);
        bg.fillCircle(bp.x - 0.5, bp.y - 0.5, 1.2);
      }

      // Icon drawn programmatically
      const iconG = this.add.graphics();
      iconG.setDepth(21);
      boosters[i].drawIcon(iconG, bx, by);

      // Interactive area
      const hitArea = this.add.rectangle(bx, by, btnSize, btnSize, 0x000000, 0);
      hitArea.setInteractive({ cursor: 'pointer' });
      hitArea.setDepth(22);

      const action = boosters[i].action;
      hitArea.on('pointerdown', () => {
        if (this.isGameOver || !this.gameStarted || this.board.isLocked()) return;
        this.soundSystem?.playButtonClick();
        // Press feedback on the background graphic
        this.tweens.add({
          targets: [bg, iconG],
          scaleX: 0.9,
          scaleY: 0.9,
          duration: 80,
          yoyo: true,
          onComplete: () => action(),
        });
      });

      // Name label below
      const name = this.add.text(bx, y + btnSize + 8, boosters[i].name, {
        fontFamily: 'Arial',
        fontSize: '10px',
        color: '#8A7A6A',
      });
      name.setOrigin(0.5);
      name.setDepth(21);
    }
  }

  // ─── Pause button ──────────────────────────────────────────

  private drawPauseButton(): void {
    const g = this.add.graphics();
    g.setDepth(20);

    const bx = GAME_WIDTH - 50;
    const by = 15;
    const size = 32;

    g.fillStyle(STONE_COLOR_INT, 0.8);
    g.fillRoundedRect(bx, by, size, size, 6);
    g.lineStyle(1, 0x6A6A6A, 0.5);
    g.strokeRoundedRect(bx, by, size, size, 6);

    // Pause icon (two bars)
    g.fillStyle(0xFFFFFF, 0.8);
    g.fillRect(bx + 10, by + 8, 4, 16);
    g.fillRect(bx + 18, by + 8, 4, 16);

    const hitArea = this.add.rectangle(bx + size / 2, by + size / 2, size + 10, size + 10, 0x000000, 0);
    hitArea.setInteractive({ cursor: 'pointer' });
    hitArea.setDepth(22);
    hitArea.on('pointerdown', () => {
      this.soundSystem?.playButtonClick();
      this.goToWorkshop();
    });
  }

  // ─── UI updates ────────────────────────────────────────────

  private onMoveMade(): void {
    const moves = this.board.getMovesLeft();
    this.movesText.setText(`${moves}`);

    // Flash red when low on moves
    if (moves <= 5) {
      this.movesText.setColor('#FF4444');
      this.tweens.add({
        targets: this.movesText,
        scaleX: { from: 1.3, to: 1.0 },
        scaleY: { from: 1.3, to: 1.0 },
        duration: 200,
      });
    }

    this.updateGoalTexts();
  }

  private onScoreChanged(score: number): void {
    this.scoreText.setText(formatNumber(score));
    this.updateGoalTexts();
  }

  private updateGoalTexts(): void {
    const goals = this.goalSystem.getGoals();
    for (let i = 0; i < goals.length && i < this.goalTexts.length; i++) {
      const goal = goals[i];
      this.goalTexts[i].setText(`${Math.min(goal.current, goal.target)}/${goal.target}`);
      if (goal.current >= goal.target) {
        this.goalTexts[i].setColor('#66FF66');
      }
    }
  }

  private onLevelComplete(): void {
    if (this.isGameOver) return;
    this.isGameOver = true;

    this.soundSystem?.playVictory();

    // Calculate stars
    const movesLeft = this.board.getMovesLeft();
    const config = this.levelSystem.getCurrentLevel()!;
    const movePercent = movesLeft / config.moves;
    let stars = 1;
    if (movePercent >= 0.3) stars = 2;
    if (movePercent >= 0.5) stars = 3;

    this.levelSystem.completeLevel(stars);

    this.time.delayedCall(500, () => {
      this.showVictoryModal(stars);
    });
  }

  private onLevelFailed(): void {
    if (this.isGameOver) return;
    this.isGameOver = true;

    this.soundSystem?.playDefeat();

    this.time.delayedCall(500, () => {
      this.showDefeatModal();
    });
  }

  // ─── Booster actions ───────────────────────────────────────

  private onHammerBooster(): void {
    this.board.enableHammerMode();
  }

  private onShuffleBooster(): void {
    this.board.shuffleBoard();
  }

  private onRainbowBooster(): void {
    this.board.addRandomRainbow();
  }

  // ─── Modal: Pre-level ──────────────────────────────────────

  private showPreLevelModal(config: NonNullable<ReturnType<LevelSystem['getCurrentLevel']>>): void {
    this.showModal((container, cx, cy) => {
      // Title
      const title = this.add.text(cx, cy - 60, `Уровень ${config.id}`, {
        fontFamily: 'Arial Black, Arial',
        fontSize: '28px',
        color: '#FFD700',
        stroke: '#3A1800',
        strokeThickness: 3,
      });
      title.setOrigin(0.5);
      title.setDepth(101);
      container.add(title);

      // Level name
      const name = this.add.text(cx, cy - 28, config.name, {
        fontFamily: 'Arial',
        fontSize: '18px',
        color: '#D4B896',
      });
      name.setOrigin(0.5);
      name.setDepth(101);
      container.add(name);

      // Goals description
      const goals = config.goals;
      let goalY = cy + 5;
      for (const goal of goals) {
        const desc = this.getGoalDescription(goal);
        const goalText = this.add.text(cx, goalY, desc, {
          fontFamily: 'Arial',
          fontSize: '16px',
          color: '#FFFFFF',
        });
        goalText.setOrigin(0.5);
        goalText.setDepth(101);
        container.add(goalText);
        goalY += 24;
      }

      // Moves info
      const movesInfo = this.add.text(cx, goalY + 10, `Ходов: ${config.moves}`, {
        fontFamily: 'Arial',
        fontSize: '16px',
        color: '#FFD700',
      });
      movesInfo.setOrigin(0.5);
      movesInfo.setDepth(101);
      container.add(movesInfo);

      // Start button
      this.addModalButton(container, cx, cy + 80, 'Начать', () => {
        this.hideModal();
        this.gameStarted = true;
      });
    });
  }

  private getGoalDescription(goal: Readonly<Goal>): string {
    switch (goal.type) {
      case GoalType.COLLECT_COLOR: {
        const colorNames: Record<string, string> = {
          ruby: 'рубинов',
          sapphire: 'сапфиров',
          emerald: 'изумрудов',
          amber: 'янтарей',
          amethyst: 'аметистов',
          topaz: 'топазов',
        };
        const name = goal.color ? colorNames[goal.color] ?? goal.color : 'камней';
        return `Собери ${goal.target} ${name}`;
      }
      case GoalType.BREAK_ICE:
        return `Разбей ${goal.target} льдинок`;
      case GoalType.DROP_ITEM:
        return `Опусти ${goal.target} предмет${goal.target > 1 ? 'а' : ''}`;
      case GoalType.SCORE:
        return `Набери ${formatNumber(goal.target)} очков`;
    }
  }

  // ─── Modal: Victory ────────────────────────────────────────

  private showVictoryModal(stars: number): void {
    this.showModal((container, cx, cy) => {
      const title = this.add.text(cx, cy - 60, 'Уровень пройден!', {
        fontFamily: 'Arial Black, Arial',
        fontSize: '26px',
        color: '#66FF66',
        stroke: '#1A3A0A',
        strokeThickness: 3,
      });
      title.setOrigin(0.5);
      title.setDepth(101);
      container.add(title);

      // Stars
      const starG = this.add.graphics();
      starG.setDepth(101);
      for (let i = 0; i < 3; i++) {
        const sx = cx - 50 + i * 50;
        const sy = cy - 10;
        const color = i < stars ? 0xFFD700 : 0x4A4A4A;
        this.drawStarShape(starG, sx, sy, 18, color);
      }
      container.add(starG);

      // Score
      const scoreInfo = this.add.text(cx, cy + 30, `Очки: ${formatNumber(this.board.getScore())}`, {
        fontFamily: 'Arial',
        fontSize: '18px',
        color: '#FFD700',
      });
      scoreInfo.setOrigin(0.5);
      scoreInfo.setDepth(101);
      container.add(scoreInfo);

      // Next button
      this.addModalButton(container, cx, cy + 80, 'Далее', () => {
        this.hideModal();
        // Go to next level or back to workshop
        const nextLevel = this.levelId + 1;
        const exists = LEVELS.find((l) => l.id === nextLevel);
        if (exists) {
          this.scene.restart({ level: nextLevel });
        } else {
          this.goToWorkshop();
        }
      });
    });
  }

  // ─── Modal: Defeat ─────────────────────────────────────────

  private showDefeatModal(): void {
    this.showModal((container, cx, cy) => {
      const title = this.add.text(cx, cy - 50, 'Не хватило ходов!', {
        fontFamily: 'Arial Black, Arial',
        fontSize: '24px',
        color: '#FF6644',
        stroke: '#3A0A0A',
        strokeThickness: 3,
      });
      title.setOrigin(0.5);
      title.setDepth(101);
      container.add(title);

      // Retry button
      this.addModalButton(container, cx - 80, cy + 40, 'Повторить', () => {
        this.hideModal();
        this.scene.restart({ level: this.levelId });
      });

      // Back button
      this.addModalButton(container, cx + 80, cy + 40, 'Назад', () => {
        this.hideModal();
        this.goToWorkshop();
      });
    });
  }

  // ─── Modal helpers ─────────────────────────────────────────

  private showModal(
    buildContent: (container: Phaser.GameObjects.Container, cx: number, cy: number) => void,
  ): void {
    if (this.modalContainer) this.hideModal();

    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    const mw = 320;
    const mh = 240;

    this.modalContainer = this.add.container(0, 0);
    this.modalContainer.setDepth(100);

    // Dim overlay
    const overlay = this.add.rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.6);
    overlay.setInteractive(); // Block clicks
    this.modalContainer.add(overlay);

    // Modal background
    const bg = this.add.graphics();
    bg.fillStyle(0x2A1A0A, 0.95);
    bg.fillRoundedRect(cx - mw / 2, cy - mh / 2, mw, mh, 14);
    bg.lineStyle(3, WOOD_COLOR_INT, 1);
    bg.strokeRoundedRect(cx - mw / 2, cy - mh / 2, mw, mh, 14);
    bg.setDepth(100);
    this.modalContainer.add(bg);

    buildContent(this.modalContainer, cx, cy);
  }

  private hideModal(): void {
    if (this.modalContainer) {
      this.modalContainer.destroy(true);
      this.modalContainer = null;
    }
  }

  private addModalButton(
    container: Phaser.GameObjects.Container,
    x: number,
    y: number,
    label: string,
    onClick: () => void,
  ): void {
    const bw = 130;
    const bh = 40;

    const g = this.add.graphics();
    g.fillStyle(WOOD_COLOR_INT, 1);
    g.fillRoundedRect(x - bw / 2, y - bh / 2, bw, bh, 8);
    g.lineStyle(2, WOOD_DARK_INT, 1);
    g.strokeRoundedRect(x - bw / 2, y - bh / 2, bw, bh, 8);
    g.setDepth(101);
    container.add(g);

    const text = this.add.text(x, y, label, {
      fontFamily: 'Arial',
      fontSize: '18px',
      color: '#FFFFFF',
      fontStyle: 'bold',
    });
    text.setOrigin(0.5);
    text.setDepth(102);
    container.add(text);

    const hitArea = this.add.rectangle(x, y, bw + 4, bh + 4, 0x000000, 0);
    hitArea.setInteractive({ cursor: 'pointer' });
    hitArea.setDepth(103);
    hitArea.on('pointerdown', () => {
      this.soundSystem?.playButtonClick();
      onClick();
    });
    container.add(hitArea);
  }

  private drawStarShape(
    g: Phaser.GameObjects.Graphics,
    cx: number,
    cy: number,
    r: number,
    color: number,
  ): void {
    g.fillStyle(color, 1);
    const points: Phaser.Geom.Point[] = [];
    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * Math.PI * 2 - Math.PI / 2;
      const radius = i % 2 === 0 ? r : r * 0.45;
      points.push(new Phaser.Geom.Point(
        cx + Math.cos(angle) * radius,
        cy + Math.sin(angle) * radius,
      ));
    }
    g.fillPoints(points, true);
  }

  // ─── Navigation ────────────────────────────────────────────

  private goToWorkshop(): void {
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.start(SCENE_WORKSHOP);
    });
  }
}
