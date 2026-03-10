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
  GEM_COLORS_INT,
  GRID_OFFSET_X,
  GRID_OFFSET_Y,
  CAVE_BG_INT,
  WOOD_COLOR_INT,
  WOOD_DARK_INT,
  STONE_COLOR_INT,
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
const TORCH_COLOR = 0xF4A261;
const TORCH_GLOW = 0xFF8C00;
const STALACTITE_COLOR = 0x2A1A10;
const FRAME_COLOR = 0x5A4A3A;
const FRAME_DARK = 0x3A2A1A;

/**
 * GameScene — main match-3 gameplay scene.
 * Cave background, goal header, booster panel, modal windows.
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

  // Torch flame particles
  private torchParticles: Phaser.GameObjects.Arc[] = [];

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

  // ─── Cave background ───────────────────────────────────────

  private drawCaveBackground(): void {
    const g = this.add.graphics();
    g.setDepth(0);

    // Gradient: dark blue → dark purple
    const steps = 20;
    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      const r = Math.floor(0x1A + (0x16 - 0x1A) * t);
      const gv = Math.floor(0x1A + (0x21 - 0x1A) * t);
      const b = Math.floor(0x2E + (0x3E - 0x2E) * t);
      const color = (Math.max(0, r) << 16) | (Math.max(0, gv) << 8) | b;
      g.fillStyle(color, 1);
      g.fillRect(0, (GAME_HEIGHT / steps) * i, GAME_WIDTH, GAME_HEIGHT / steps + 1);
    }

    // Stalactites (top)
    this.drawStalactites(g);

    // Torches on sides
    this.drawTorch(30, 350);
    this.drawTorch(GAME_WIDTH - 30, 350);
    this.drawTorch(30, 600);
    this.drawTorch(GAME_WIDTH - 30, 600);

    // Cave entrance arch at bottom
    this.drawCaveEntrance(g);
  }

  private drawStalactites(g: Phaser.GameObjects.Graphics): void {
    g.fillStyle(STALACTITE_COLOR, 0.8);

    const stalactites = [
      { x: 40, w: 20, h: 50 },
      { x: 90, w: 15, h: 35 },
      { x: 150, w: 25, h: 60 },
      { x: 220, w: 18, h: 40 },
      { x: 300, w: 22, h: 55 },
      { x: 370, w: 16, h: 38 },
      { x: 430, w: 24, h: 48 },
      { x: 490, w: 14, h: 30 },
      { x: 520, w: 20, h: 42 },
    ];

    for (const s of stalactites) {
      g.fillTriangle(
        s.x - s.w / 2, 0,
        s.x + s.w / 2, 0,
        s.x + (Math.random() - 0.5) * 6, s.h,
      );
    }
  }

  private drawTorch(x: number, y: number): void {
    const g = this.add.graphics();
    g.setDepth(1);

    // Torch bracket
    g.fillStyle(0x4A3A2A, 1);
    g.fillRect(x - 4, y - 15, 8, 30);
    g.fillStyle(0x3A2A1A, 1);
    g.fillRect(x - 6, y - 18, 12, 6);

    // Flame glow
    const glow = this.add.circle(x, y - 25, 30, TORCH_GLOW, 0.08);
    glow.setBlendMode(Phaser.BlendModes.ADD);
    glow.setDepth(1);

    // Flame particles
    for (let i = 0; i < 3; i++) {
      const size = 4 + Math.random() * 4;
      const colors = [0xFF6B20, 0xFFCC00, 0xFF3300];
      const particle = this.add.circle(
        x + (Math.random() - 0.5) * 8,
        y - 20 - Math.random() * 15,
        size,
        colors[i % 3],
        0.7,
      );
      particle.setBlendMode(Phaser.BlendModes.ADD);
      particle.setDepth(2);
      this.torchParticles.push(particle);

      // Animate flame
      this.tweens.add({
        targets: particle,
        alpha: { from: 0.4, to: 0.1 },
        y: particle.y - 8 - Math.random() * 10,
        scaleX: { from: 0.8, to: 1.2 },
        scaleY: { from: 0.8, to: 1.3 },
        duration: 300 + Math.random() * 400,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        delay: Math.random() * 200,
      });
    }
  }

  private drawCaveEntrance(g: Phaser.GameObjects.Graphics): void {
    const archX = GAME_WIDTH / 2;
    const archY = GAME_HEIGHT - 30;
    const archW = 160;
    const archH = 50;

    g.fillStyle(0x0A0A15, 0.9);
    g.fillRoundedRect(
      archX - archW / 2,
      archY - archH,
      archW,
      archH + 30,
      { tl: 40, tr: 40, bl: 0, br: 0 },
    );

    // Dark shadow inside
    g.fillStyle(0x050510, 0.5);
    g.fillRoundedRect(
      archX - archW / 2 + 10,
      archY - archH + 10,
      archW - 20,
      archH,
      { tl: 30, tr: 30, bl: 0, br: 0 },
    );
  }

  // ─── Stone frame around the board ──────────────────────────

  private drawStoneFrame(): void {
    const g = this.add.graphics();
    g.setDepth(3);

    const cellSize = GEM_SIZE + GEM_PADDING;
    const boardWidth = GRID_COLS * cellSize + GEM_PADDING;
    const boardHeight = GRID_ROWS * cellSize + GEM_PADDING;
    const boardX = GRID_OFFSET_X - GEM_PADDING;
    const boardY = GRID_OFFSET_Y - GEM_PADDING;
    const frameThickness = 10;

    // Outer frame
    g.fillStyle(FRAME_COLOR, 0.9);
    g.fillRoundedRect(
      boardX - frameThickness,
      boardY - frameThickness,
      boardWidth + frameThickness * 2,
      boardHeight + frameThickness * 2,
      8,
    );

    // Inner frame (darker)
    g.fillStyle(FRAME_DARK, 0.7);
    g.fillRoundedRect(
      boardX - 3,
      boardY - 3,
      boardWidth + 6,
      boardHeight + 6,
      4,
    );

    // Stone texture lines
    g.lineStyle(1, 0x2A1A0A, 0.3);
    for (let i = 0; i < 6; i++) {
      const y = boardY - frameThickness + i * (boardHeight + frameThickness * 2) / 6;
      g.lineBetween(boardX - frameThickness, y, boardX + boardWidth + frameThickness, y);
    }
  }

  // ─── Goal header ───────────────────────────────────────────

  private drawGoalHeader(config: ReturnType<LevelSystem['getCurrentLevel']> & object): void {
    const g = this.add.graphics();
    g.setDepth(20);

    const headerW = GAME_WIDTH - 40;
    const headerH = 60;
    const headerX = 20;
    const headerY = 50;

    // Wooden plaque
    g.fillStyle(WOOD_COLOR_INT, 0.95);
    g.fillRoundedRect(headerX, headerY, headerW, headerH, 10);
    g.lineStyle(2, WOOD_DARK_INT, 0.8);
    g.strokeRoundedRect(headerX, headerY, headerW, headerH, 10);

    // Rope/chain lines from top
    g.lineStyle(2, 0x8A7A6A, 0.6);
    g.lineBetween(headerX + 40, 0, headerX + 40, headerY);
    g.lineBetween(headerX + headerW - 40, 0, headerX + headerW - 40, headerY);

    // Rope "links" pattern
    for (let y = 5; y < headerY; y += 12) {
      g.fillStyle(0x7A6A5A, 0.4);
      g.fillCircle(headerX + 40, y, 2);
      g.fillCircle(headerX + headerW - 40, y, 2);
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

      // Goal icon
      this.drawGoalIcon(g, gx - 16, gy, goals[i]);

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

  private drawGoalIcon(
    g: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    goal: Readonly<Goal>,
  ): void {
    switch (goal.type) {
      case GoalType.COLLECT_COLOR:
        if (goal.color) {
          g.fillStyle(GEM_COLORS_INT[goal.color], 1);
          g.fillCircle(x, y, 9);
          g.lineStyle(1, 0xFFFFFF, 0.4);
          g.strokeCircle(x, y, 9);
        }
        break;

      case GoalType.BREAK_ICE:
        g.fillStyle(0xAADDFF, 0.8);
        g.fillRoundedRect(x - 8, y - 8, 16, 16, 3);
        g.lineStyle(1, 0xFFFFFF, 0.5);
        g.strokeRoundedRect(x - 8, y - 8, 16, 16, 3);
        break;

      case GoalType.DROP_ITEM:
        g.fillStyle(0xFFD700, 1);
        g.fillCircle(x, y, 7);
        g.lineStyle(1, 0xDAA520, 1);
        g.strokeCircle(x, y, 7);
        // Down arrow
        g.fillStyle(0xFFD700, 1);
        g.fillTriangle(x - 4, y + 10, x + 4, y + 10, x, y + 16);
        break;

      case GoalType.SCORE: {
        // Star icon
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

  // ─── Booster panel ─────────────────────────────────────────

  private drawBoosterPanel(): void {
    const g = this.add.graphics();
    g.setDepth(20);

    const btnW = 70;
    const btnH = 50;
    const spacing = 20;
    const totalW = btnW * 3 + spacing * 2;
    const startX = (GAME_WIDTH - totalW) / 2;
    const y = BOOSTER_PANEL_Y;

    const boosters = [
      { label: '🔨', name: 'Молот', action: () => this.onHammerBooster() },
      { label: '🔄', name: 'Микс', action: () => this.onShuffleBooster() },
      { label: '💎', name: 'Радуга', action: () => this.onRainbowBooster() },
    ];

    for (let i = 0; i < boosters.length; i++) {
      const bx = startX + i * (btnW + spacing);

      // Button background
      g.fillStyle(WOOD_COLOR_INT, 0.95);
      g.fillRoundedRect(bx, y, btnW, btnH, 8);
      g.lineStyle(2, WOOD_DARK_INT, 0.8);
      g.strokeRoundedRect(bx, y, btnW, btnH, 8);

      // Icon
      const icon = this.add.text(bx + btnW / 2, y + btnH / 2 - 4, boosters[i].label, {
        fontSize: '22px',
      });
      icon.setOrigin(0.5);
      icon.setDepth(21);

      // Name label below
      const name = this.add.text(bx + btnW / 2, y + btnH + 8, boosters[i].name, {
        fontFamily: 'Arial',
        fontSize: '10px',
        color: '#8A7A6A',
      });
      name.setOrigin(0.5);
      name.setDepth(21);

      // Hit area
      const hitArea = this.add.rectangle(bx + btnW / 2, y + btnH / 2, btnW + 4, btnH + 4, 0x000000, 0);
      hitArea.setInteractive({ cursor: 'pointer' });
      hitArea.setDepth(22);
      const action = boosters[i].action;
      hitArea.on('pointerdown', () => {
        if (this.isGameOver || !this.gameStarted || this.board.isLocked()) return;
        this.soundSystem?.playButtonClick();
        action();
      });
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
