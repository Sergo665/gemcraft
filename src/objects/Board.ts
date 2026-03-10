import Phaser from 'phaser';
import {
  GRID_COLS,
  GRID_ROWS,
  GEM_SIZE,
  GEM_PADDING,
  GEM_TYPES,
  GRID_OFFSET_X,
  GRID_OFFSET_Y,
  SWAP_DURATION,
  FALL_DURATION,
  GemType,
  SpecialGemType,
  BlockerType,
  POINTS_PER_GEM,
  COMBO_MULTIPLIERS,
  SWIPE_THRESHOLD,
} from '../config';
import { Gem } from './Gem';
import { Blocker } from './Blocker';
import { MatchSystem, Match } from '../systems/MatchSystem';
import { GoalSystem } from '../systems/GoalSystem';
import { SoundSystem } from '../systems/SoundSystem';
import { LevelConfig, BlockerConfig } from '../systems/LevelSystem';
import { getRandomGemType, shuffleArray } from '../utils/helpers';

/** Events emitted by the Board */
export interface BoardEvents {
  onMoveMade: () => void;
  onScoreChanged: (score: number) => void;
  onLevelComplete: () => void;
  onLevelFailed: () => void;
}

/**
 * Board — the game grid containing gems.
 * Handles rendering, input (tap-tap + swipe), swaps, match detection,
 * special gems, blockers, cascades, scoring, and goal tracking.
 */
export class Board {
  private scene: Phaser.Scene;
  private grid: (Gem | null)[][] = [];
  private blockerGrid: (Blocker | null)[][] = [];
  private selectedGem: Gem | null = null;
  private isProcessing = false;

  private matchSystem: MatchSystem;
  private goalSystem: GoalSystem;
  private soundSystem: SoundSystem | null = null;

  private levelConfig: LevelConfig | null = null;
  private gemTypesCount = 6;

  // Scoring
  private score = 0;
  private cascadeLevel = 0;

  // Moves
  private movesLeft = 30;

  // Swipe tracking
  private pointerDownPos: { x: number; y: number } | null = null;
  private pointerDownGem: Gem | null = null;

  // Booster mode
  private hammerMode = false;

  // Events callback
  private events: BoardEvents;

  constructor(
    scene: Phaser.Scene,
    goalSystem: GoalSystem,
    events: BoardEvents,
  ) {
    this.scene = scene;
    this.matchSystem = new MatchSystem();
    this.goalSystem = goalSystem;
    this.events = events;
    this.soundSystem = scene.registry.get('soundSystem') as SoundSystem ?? null;
  }

  // ─── Public API ─────────────────────────────────────────────

  /**
   * Initialize the board with a level config.
   */
  public create(config: LevelConfig): void {
    this.levelConfig = config;
    this.movesLeft = config.moves;
    this.gemTypesCount = config.gemTypesCount ?? 6;
    this.score = 0;
    this.cascadeLevel = 0;

    this.initBlockerGrid();
    this.drawBoardBackground();
    this.placeBlockers(config.blockers ?? []);
    this.fillBoard();
    this.setupInput();
  }

  public getMovesLeft(): number {
    return this.movesLeft;
  }

  public getScore(): number {
    return this.score;
  }

  public isLocked(): boolean {
    return this.isProcessing;
  }

  /**
   * Enable hammer mode (tap to destroy one gem).
   */
  public enableHammerMode(): void {
    this.hammerMode = true;
    if (this.selectedGem) {
      this.selectedGem.setSelected(false);
      this.selectedGem = null;
    }
  }

  /**
   * Shuffle all gems on the board.
   */
  public async shuffleBoard(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    // Collect all gem types
    const types: GemType[] = [];
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const gem = this.grid[row][col];
        if (gem && !this.isRock(row, col)) {
          types.push(gem.gemType);
        }
      }
    }

    shuffleArray(types);

    // Animate out
    const fadeOuts: Promise<void>[] = [];
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const gem = this.grid[row][col];
        if (gem && !this.isRock(row, col)) {
          fadeOuts.push(
            new Promise((resolve) => {
              this.scene.tweens.add({
                targets: gem,
                alpha: 0,
                scaleX: 0.5,
                scaleY: 0.5,
                duration: 200,
                onComplete: () => resolve(),
              });
            }),
          );
        }
      }
    }
    await Promise.all(fadeOuts);

    // Reassign types
    let idx = 0;
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const gem = this.grid[row][col];
        if (gem && !this.isRock(row, col)) {
          gem.setGemType(types[idx++]);
          gem.specialType = SpecialGemType.NONE;
        }
      }
    }

    // Animate in
    const fadeIns: Promise<void>[] = [];
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const gem = this.grid[row][col];
        if (gem && !this.isRock(row, col)) {
          fadeIns.push(
            new Promise((resolve) => {
              this.scene.tweens.add({
                targets: gem,
                alpha: 1,
                scaleX: 1,
                scaleY: 1,
                duration: 200,
                onComplete: () => resolve(),
              });
            }),
          );
        }
      }
    }
    await Promise.all(fadeIns);

    // Check and fix if no moves available
    const typeGrid = this.getTypeGrid();
    if (!this.matchSystem.hasPossibleMoves(typeGrid)) {
      await this.shuffleBoard();
      return;
    }

    this.isProcessing = false;
  }

  /**
   * Place a rainbow gem in a random empty-ish spot.
   */
  public addRandomRainbow(): void {
    const candidates: { row: number; col: number }[] = [];
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        if (
          this.grid[row][col] &&
          !this.isRock(row, col) &&
          !this.isDropItem(row, col) &&
          this.grid[row][col]!.specialType === SpecialGemType.NONE
        ) {
          candidates.push({ row, col });
        }
      }
    }
    if (candidates.length === 0) return;

    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    const gem = this.grid[pick.row][pick.col];
    if (gem) {
      gem.setSpecialType(SpecialGemType.RAINBOW);
      this.soundSystem?.playSpecialCreate();
    }
  }

  // ─── Board setup ────────────────────────────────────────────

  private initBlockerGrid(): void {
    this.blockerGrid = [];
    for (let row = 0; row < GRID_ROWS; row++) {
      this.blockerGrid[row] = [];
      for (let col = 0; col < GRID_COLS; col++) {
        this.blockerGrid[row][col] = null;
      }
    }
  }

  private drawBoardBackground(): void {
    const cellSize = GEM_SIZE + GEM_PADDING;

    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const x = GRID_OFFSET_X + col * cellSize + GEM_SIZE / 2;
        const y = GRID_OFFSET_Y + row * cellSize + GEM_SIZE / 2;
        const cellBg = this.scene.add.image(x, y, 'cell_bg');
        cellBg.setDisplaySize(GEM_SIZE, GEM_SIZE);
        cellBg.setDepth(4);
      }
    }
  }

  private placeBlockers(blockers: BlockerConfig[]): void {
    for (const b of blockers) {
      if (b.row < 0 || b.row >= GRID_ROWS || b.col < 0 || b.col >= GRID_COLS) continue;
      const pos = this.gridToWorld(b.row, b.col);
      const blocker = new Blocker(this.scene, pos.x, pos.y, b.type, b.row, b.col);
      blocker.setDepth(b.type === BlockerType.DROP_ITEM ? 15 : 5);
      this.blockerGrid[b.row][b.col] = blocker;
    }
  }

  private fillBoard(): void {
    this.grid = [];
    for (let row = 0; row < GRID_ROWS; row++) {
      this.grid[row] = [];
      for (let col = 0; col < GRID_COLS; col++) {
        // Rock blocker = no gem
        if (this.isRock(row, col)) {
          this.grid[row][col] = null;
          continue;
        }

        let gemType = getRandomGemType(this.gemTypesCount);
        while (this.wouldCreateMatch(row, col, gemType)) {
          gemType = getRandomGemType(this.gemTypesCount);
        }

        const pos = this.gridToWorld(row, col);
        const gem = new Gem(this.scene, pos.x, pos.y, gemType, row, col);
        gem.setDepth(10);
        this.grid[row][col] = gem;
      }
    }
  }

  private wouldCreateMatch(row: number, col: number, type: GemType): boolean {
    if (
      col >= 2 &&
      this.grid[row][col - 1]?.gemType === type &&
      this.grid[row][col - 2]?.gemType === type
    ) {
      return true;
    }
    if (
      row >= 2 &&
      this.grid[row - 1]?.[col]?.gemType === type &&
      this.grid[row - 2]?.[col]?.gemType === type
    ) {
      return true;
    }
    return false;
  }

  // ─── Coordinate helpers ─────────────────────────────────────

  private gridToWorld(row: number, col: number): { x: number; y: number } {
    const cellSize = GEM_SIZE + GEM_PADDING;
    return {
      x: GRID_OFFSET_X + col * cellSize + GEM_SIZE / 2,
      y: GRID_OFFSET_Y + row * cellSize + GEM_SIZE / 2,
    };
  }

  private worldToGrid(x: number, y: number): { row: number; col: number } | null {
    const cellSize = GEM_SIZE + GEM_PADDING;
    const col = Math.floor((x - GRID_OFFSET_X) / cellSize);
    const row = Math.floor((y - GRID_OFFSET_Y) / cellSize);

    if (row >= 0 && row < GRID_ROWS && col >= 0 && col < GRID_COLS) {
      return { row, col };
    }
    return null;
  }

  // ─── Input handling ─────────────────────────────────────────

  private setupInput(): void {
    // Tap-tap (click on game objects)
    this.scene.input.on(
      'gameobjectdown',
      (_pointer: Phaser.Input.Pointer, gameObject: Phaser.GameObjects.GameObject) => {
        if (this.isProcessing) return;
        const gem = this.getGemFromObject(gameObject);
        if (!gem) return;

        // Hammer mode: destroy one gem
        if (this.hammerMode) {
          this.hammerMode = false;
          this.useHammer(gem);
          return;
        }
      },
    );

    // Swipe detection: pointerdown → pointerup
    this.scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.isProcessing) return;
      this.pointerDownPos = { x: pointer.x, y: pointer.y };

      const gridPos = this.worldToGrid(pointer.x, pointer.y);
      if (gridPos) {
        this.pointerDownGem = this.grid[gridPos.row][gridPos.col] ?? null;
      } else {
        this.pointerDownGem = null;
      }
    });

    this.scene.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (this.isProcessing || !this.pointerDownPos) return;
      if (this.hammerMode) return; // Handled by gameobjectdown

      const dx = pointer.x - this.pointerDownPos.x;
      const dy = pointer.y - this.pointerDownPos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > SWIPE_THRESHOLD && this.pointerDownGem) {
        // Swipe detected — determine direction
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);
        let dRow = 0;
        let dCol = 0;

        if (absDx > absDy) {
          dCol = dx > 0 ? 1 : -1;
        } else {
          dRow = dy > 0 ? 1 : -1;
        }

        const gem = this.pointerDownGem;
        const targetRow = gem.gridRow + dRow;
        const targetCol = gem.gridCol + dCol;

        if (
          targetRow >= 0 && targetRow < GRID_ROWS &&
          targetCol >= 0 && targetCol < GRID_COLS
        ) {
          const targetGem = this.grid[targetRow][targetCol];
          if (targetGem && !this.isRock(targetRow, targetCol)) {
            // Check ice: can't swipe iced gems
            if (this.isIced(gem.gridRow, gem.gridCol) || this.isIced(targetRow, targetCol)) {
              this.pointerDownPos = null;
              this.pointerDownGem = null;
              return;
            }

            if (this.selectedGem) {
              this.selectedGem.setSelected(false);
              this.selectedGem = null;
            }
            this.trySwap(gem, targetGem);
          }
        }

        this.pointerDownPos = null;
        this.pointerDownGem = null;
        return;
      }

      // Short tap → tap-tap selection mode
      if (dist <= SWIPE_THRESHOLD && this.pointerDownGem) {
        const gem = this.pointerDownGem;

        // Can't tap iced gems
        if (this.isIced(gem.gridRow, gem.gridCol)) {
          this.pointerDownPos = null;
          this.pointerDownGem = null;
          return;
        }

        if (!this.selectedGem) {
          this.selectedGem = gem;
          gem.setSelected(true);
          this.soundSystem?.playGemSelect();
        } else if (this.selectedGem === gem) {
          gem.setSelected(false);
          this.selectedGem = null;
        } else if (this.areAdjacent(this.selectedGem, gem)) {
          // Check ice on the swap target
          if (this.isIced(gem.gridRow, gem.gridCol)) {
            this.selectedGem.setSelected(false);
            this.selectedGem = null;
            this.pointerDownPos = null;
            this.pointerDownGem = null;
            return;
          }
          this.selectedGem.setSelected(false);
          this.trySwap(this.selectedGem, gem);
          this.selectedGem = null;
        } else {
          this.selectedGem.setSelected(false);
          this.selectedGem = gem;
          gem.setSelected(true);
          this.soundSystem?.playGemSelect();
        }
      }

      this.pointerDownPos = null;
      this.pointerDownGem = null;
    });
  }

  private getGemFromObject(obj: Phaser.GameObjects.GameObject): Gem | null {
    if (obj instanceof Gem) return obj;
    if (obj.parentContainer instanceof Gem) return obj.parentContainer as Gem;
    return null;
  }

  private areAdjacent(a: Gem, b: Gem): boolean {
    const rowDiff = Math.abs(a.gridRow - b.gridRow);
    const colDiff = Math.abs(a.gridCol - b.gridCol);
    return (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);
  }

  // ─── Blocker helpers ────────────────────────────────────────

  private isRock(row: number, col: number): boolean {
    return this.blockerGrid[row]?.[col]?.blockerType === BlockerType.ROCK;
  }

  private isIced(row: number, col: number): boolean {
    const b = this.blockerGrid[row]?.[col];
    if (!b) return false;
    return (
      b.blockerType === BlockerType.ICE_1 ||
      b.blockerType === BlockerType.ICE_2 ||
      b.blockerType === BlockerType.ICE_3
    );
  }

  private isDropItem(row: number, col: number): boolean {
    return this.blockerGrid[row]?.[col]?.blockerType === BlockerType.DROP_ITEM;
  }

  private getIceBlocker(row: number, col: number): Blocker | null {
    const b = this.blockerGrid[row]?.[col];
    if (!b) return null;
    if (
      b.blockerType === BlockerType.ICE_1 ||
      b.blockerType === BlockerType.ICE_2 ||
      b.blockerType === BlockerType.ICE_3
    ) {
      return b;
    }
    return null;
  }

  // ─── Swap logic ─────────────────────────────────────────────

  private async trySwap(gemA: Gem, gemB: Gem): Promise<void> {
    this.isProcessing = true;
    this.cascadeLevel = 0;
    this.soundSystem?.resetCascade();
    this.soundSystem?.playSwap();

    // Check for special-special combo
    const specialCombo = this.checkSpecialCombo(gemA, gemB);
    if (specialCombo) {
      await this.executeSpecialCombo(gemA, gemB);
      this.consumeMove();
      this.isProcessing = false;
      this.checkGameEnd();
      return;
    }

    // Rainbow swap on any neighbor
    if (gemA.specialType === SpecialGemType.RAINBOW) {
      await this.animateSwap(gemA, gemB);
      await this.activateRainbow(gemA, gemB.gemType);
      this.consumeMove();
      await this.doCascadeLoop();
      this.isProcessing = false;
      this.checkGameEnd();
      return;
    }
    if (gemB.specialType === SpecialGemType.RAINBOW) {
      await this.animateSwap(gemA, gemB);
      await this.activateRainbow(gemB, gemA.gemType);
      this.consumeMove();
      await this.doCascadeLoop();
      this.isProcessing = false;
      this.checkGameEnd();
      return;
    }

    // Normal swap
    this.swapInGrid(gemA, gemB);
    await this.animateSwap(gemA, gemB);

    gemA.playBounce();
    gemB.playBounce();

    const typeGrid = this.getTypeGrid();
    const matches = this.matchSystem.findAllMatches(typeGrid);

    if (matches.length > 0) {
      this.consumeMove();
      await this.processMatches(matches, gemA, gemB);
      await this.doCascadeLoop();
      this.checkGameEnd();
    } else {
      // No match — swap back
      this.swapInGrid(gemA, gemB);
      await this.animateSwap(gemA, gemB);
    }

    this.isProcessing = false;
  }

  private consumeMove(): void {
    this.movesLeft--;
    this.events.onMoveMade();
  }

  private swapInGrid(gemA: Gem, gemB: Gem): void {
    const tempRow = gemA.gridRow;
    const tempCol = gemA.gridCol;

    this.grid[gemA.gridRow][gemA.gridCol] = gemB;
    this.grid[gemB.gridRow][gemB.gridCol] = gemA;

    gemA.gridRow = gemB.gridRow;
    gemA.gridCol = gemB.gridCol;
    gemB.gridRow = tempRow;
    gemB.gridCol = tempCol;
  }

  private animateSwap(gemA: Gem, gemB: Gem): Promise<void> {
    const posA = this.gridToWorld(gemA.gridRow, gemA.gridCol);
    const posB = this.gridToWorld(gemB.gridRow, gemB.gridCol);

    return new Promise((resolve) => {
      this.scene.tweens.add({
        targets: gemA,
        x: posA.x,
        y: posA.y,
        duration: SWAP_DURATION,
        ease: 'Power2',
      });

      this.scene.tweens.add({
        targets: gemB,
        x: posB.x,
        y: posB.y,
        duration: SWAP_DURATION,
        ease: 'Power2',
        onComplete: () => resolve(),
      });
    });
  }

  // ─── Match processing ───────────────────────────────────────

  /**
   * Process matches: destroy gems, create specials, apply score, handle ice/drops.
   * gemA/gemB are the swapped gems (used to determine where special gem spawns).
   */
  private async processMatches(
    matches: Match[],
    swappedA?: Gem,
    swappedB?: Gem,
  ): Promise<void> {
    this.cascadeLevel++;
    const comboIdx = Math.min(this.cascadeLevel - 1, COMBO_MULTIPLIERS.length - 1);
    const multiplier = COMBO_MULTIPLIERS[comboIdx];

    // Play cascade sound
    this.soundSystem?.playCascade();

    // Determine special gems to create BEFORE destruction
    const specialsToCreate: { row: number; col: number; type: SpecialGemType; color: GemType }[] = [];

    for (const match of matches) {
      const specialType = this.matchSystem.determineSpecialType(match);
      if (specialType !== SpecialGemType.NONE) {
        // Find the swapped gem that is part of this match
        let spawnCell: { row: number; col: number } | null = null;

        if (swappedA) {
          const inMatch = match.cells.some(
            (c) => c.row === swappedA.gridRow && c.col === swappedA.gridCol,
          );
          if (inMatch) {
            spawnCell = { row: swappedA.gridRow, col: swappedA.gridCol };
          }
        }
        if (!spawnCell && swappedB) {
          const inMatch = match.cells.some(
            (c) => c.row === swappedB.gridRow && c.col === swappedB.gridCol,
          );
          if (inMatch) {
            spawnCell = { row: swappedB.gridRow, col: swappedB.gridCol };
          }
        }
        if (!spawnCell) {
          // Fallback: last cell of the match
          const last = match.cells[match.cells.length - 1];
          spawnCell = { row: last.row, col: last.col };
        }

        specialsToCreate.push({
          row: spawnCell.row,
          col: spawnCell.col,
          type: specialType,
          color: match.type,
        });
      }
    }

    // Collect cells to destroy and check for special gem activations
    const destroySet = new Set<string>();
    const activatedSpecials: { gem: Gem; row: number; col: number }[] = [];

    for (const match of matches) {
      for (const cell of match.cells) {
        const key = `${cell.row},${cell.col}`;
        const gem = this.grid[cell.row]?.[cell.col];

        // Check if this gem is a special being activated (not one we're about to create)
        if (
          gem &&
          gem.specialType !== SpecialGemType.NONE &&
          !specialsToCreate.some((s) => s.row === cell.row && s.col === cell.col)
        ) {
          activatedSpecials.push({ gem, row: cell.row, col: cell.col });
        }

        destroySet.add(key);
      }
    }

    // Activate special gems — gather additional cells to destroy
    for (const { gem, row, col } of activatedSpecials) {
      const extraCells = this.getSpecialEffect(gem.specialType, row, col, gem.gemType);
      for (const cell of extraCells) {
        destroySet.add(`${cell.row},${cell.col}`);
      }
      // Play activation sounds
      this.playSpecialSound(gem.specialType);
    }

    // Count destroyed by color for goals
    const colorCounts = new Map<GemType, number>();
    let iceCount = 0;

    // Destroy gems and track
    for (const key of destroySet) {
      const [r, c] = key.split(',').map(Number);
      const gem = this.grid[r]?.[c];
      if (!gem) continue;

      // Skip rock cells
      if (this.isRock(r, c)) continue;

      // Don't destroy if this is a cell where we're creating a special
      if (specialsToCreate.some((s) => s.row === r && s.col === c)) continue;

      // Track color
      const count = colorCounts.get(gem.gemType) ?? 0;
      colorCounts.set(gem.gemType, count + 1);

      // Score
      this.score += Math.round(POINTS_PER_GEM * multiplier);

      gem.playDestroy();
      this.grid[r][c] = null;
    }

    // Handle ice adjacent to destroyed cells
    iceCount = this.processIceBreaks(destroySet);

    // Report to GoalSystem
    for (const [color, count] of colorCounts) {
      this.goalSystem.onGemsDestroyed(color, count);
    }
    if (iceCount > 0) {
      this.goalSystem.onIceBroken(iceCount);
    }
    this.goalSystem.onScoreChanged(this.score);
    this.events.onScoreChanged(this.score);

    // Wait for destroy animations
    await this.delay(200);

    // Create special gems
    for (const spec of specialsToCreate) {
      // If the cell was destroyed, create a new gem
      if (!this.grid[spec.row]?.[spec.col]) {
        const pos = this.gridToWorld(spec.row, spec.col);
        const color = spec.type === SpecialGemType.RAINBOW ? spec.color : spec.color;
        const gem = new Gem(this.scene, pos.x, pos.y, color, spec.row, spec.col, spec.type);
        gem.setDepth(10);
        this.grid[spec.row][spec.col] = gem;
      } else {
        // Cell still has a gem (it's where we placed the special)
        this.grid[spec.row][spec.col]!.setSpecialType(spec.type);
      }
      this.soundSystem?.playSpecialCreate();
    }
  }

  /**
   * Process ice breaks for cells adjacent to destroyed positions.
   * Returns how many ice layers were broken total.
   */
  private processIceBreaks(destroyedKeys: Set<string>): number {
    const adjacentIcePositions = new Set<string>();

    for (const key of destroyedKeys) {
      const [r, c] = key.split(',').map(Number);
      // Check 4 neighbors
      const neighbors = [
        { row: r - 1, col: c },
        { row: r + 1, col: c },
        { row: r, col: c - 1 },
        { row: r, col: c + 1 },
      ];
      for (const n of neighbors) {
        if (n.row >= 0 && n.row < GRID_ROWS && n.col >= 0 && n.col < GRID_COLS) {
          const ice = this.getIceBlocker(n.row, n.col);
          if (ice) {
            adjacentIcePositions.add(`${n.row},${n.col}`);
          }
        }
      }
      // Also check if destroyed cell itself had ice
      const selfIce = this.getIceBlocker(r, c);
      if (selfIce) {
        adjacentIcePositions.add(`${r},${c}`);
      }
    }

    let count = 0;
    for (const key of adjacentIcePositions) {
      const [r, c] = key.split(',').map(Number);
      const ice = this.getIceBlocker(r, c);
      if (ice) {
        const destroyed = ice.hitIce();
        count++;
        this.soundSystem?.playIceBreak();
        if (destroyed) {
          this.blockerGrid[r][c] = null;
        }
      }
    }
    return count;
  }

  /**
   * Get cells affected by a special gem effect.
   */
  private getSpecialEffect(
    type: SpecialGemType,
    row: number,
    col: number,
    _gemType: GemType,
  ): { row: number; col: number }[] {
    const cells: { row: number; col: number }[] = [];

    switch (type) {
      case SpecialGemType.HORIZONTAL_STRIPE:
        for (let c = 0; c < GRID_COLS; c++) {
          if (!this.isRock(row, c)) cells.push({ row, col: c });
        }
        this.soundSystem?.playSpecialActivate();
        break;

      case SpecialGemType.VERTICAL_STRIPE:
        for (let r = 0; r < GRID_ROWS; r++) {
          if (!this.isRock(r, col)) cells.push({ row: r, col });
        }
        this.soundSystem?.playSpecialActivate();
        break;

      case SpecialGemType.BOMB:
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const r = row + dr;
            const c = col + dc;
            if (r >= 0 && r < GRID_ROWS && c >= 0 && c < GRID_COLS && !this.isRock(r, c)) {
              cells.push({ row: r, col: c });
            }
          }
        }
        this.soundSystem?.playBomb();
        break;

      default:
        break;
    }

    return cells;
  }

  private playSpecialSound(type: SpecialGemType): void {
    switch (type) {
      case SpecialGemType.HORIZONTAL_STRIPE:
      case SpecialGemType.VERTICAL_STRIPE:
        this.soundSystem?.playSpecialActivate();
        break;
      case SpecialGemType.BOMB:
        this.soundSystem?.playBomb();
        break;
      case SpecialGemType.RAINBOW:
        this.soundSystem?.playRainbow();
        break;
    }
  }

  // ─── Rainbow logic ──────────────────────────────────────────

  private async activateRainbow(rainbowGem: Gem, targetColor: GemType): Promise<void> {
    this.soundSystem?.playRainbow();

    const cellsToDestroy: { row: number; col: number }[] = [];
    cellsToDestroy.push({ row: rainbowGem.gridRow, col: rainbowGem.gridCol });

    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const gem = this.grid[row][col];
        if (gem && gem.gemType === targetColor && !this.isRock(row, col)) {
          cellsToDestroy.push({ row, col });
        }
      }
    }

    let count = 0;
    for (const cell of cellsToDestroy) {
      const gem = this.grid[cell.row][cell.col];
      if (gem) {
        this.score += Math.round(POINTS_PER_GEM * 1.5);
        count++;
        gem.playDestroy();
        this.grid[cell.row][cell.col] = null;
      }
    }

    this.goalSystem.onGemsDestroyed(targetColor, count);
    this.goalSystem.onScoreChanged(this.score);
    this.events.onScoreChanged(this.score);

    await this.delay(250);
  }

  // ─── Special combo logic ────────────────────────────────────

  private checkSpecialCombo(a: Gem, b: Gem): boolean {
    return (
      a.specialType !== SpecialGemType.NONE &&
      b.specialType !== SpecialGemType.NONE
    );
  }

  private async executeSpecialCombo(gemA: Gem, gemB: Gem): Promise<void> {
    await this.animateSwap(gemA, gemB);
    // Swap back visually but process combo
    this.swapInGrid(gemA, gemB);

    const typeA = gemA.specialType;
    const typeB = gemB.specialType;
    const rowA = gemA.gridRow;
    const colA = gemA.gridCol;
    const rowB = gemB.gridRow;
    const colB = gemB.gridCol;

    const cellsToDestroy = new Set<string>();

    // Rainbow + Rainbow = clear all
    if (typeA === SpecialGemType.RAINBOW && typeB === SpecialGemType.RAINBOW) {
      this.soundSystem?.playRainbow();
      for (let r = 0; r < GRID_ROWS; r++) {
        for (let c = 0; c < GRID_COLS; c++) {
          if (!this.isRock(r, c) && this.grid[r][c]) {
            cellsToDestroy.add(`${r},${c}`);
          }
        }
      }
    }
    // Rainbow + Striped
    else if (
      (typeA === SpecialGemType.RAINBOW && (typeB === SpecialGemType.HORIZONTAL_STRIPE || typeB === SpecialGemType.VERTICAL_STRIPE)) ||
      (typeB === SpecialGemType.RAINBOW && (typeA === SpecialGemType.HORIZONTAL_STRIPE || typeA === SpecialGemType.VERTICAL_STRIPE))
    ) {
      this.soundSystem?.playRainbow();
      const stripedGem = typeA === SpecialGemType.RAINBOW ? gemB : gemA;
      const targetColor = stripedGem.gemType;
      // All gems of that color become striped and activate
      for (let r = 0; r < GRID_ROWS; r++) {
        for (let c = 0; c < GRID_COLS; c++) {
          const gem = this.grid[r][c];
          if (gem && gem.gemType === targetColor && !this.isRock(r, c)) {
            // Destroy row or column
            if (Math.random() > 0.5) {
              for (let cc = 0; cc < GRID_COLS; cc++) if (!this.isRock(r, cc)) cellsToDestroy.add(`${r},${cc}`);
            } else {
              for (let rr = 0; rr < GRID_ROWS; rr++) if (!this.isRock(rr, c)) cellsToDestroy.add(`${rr},${c}`);
            }
          }
        }
      }
      cellsToDestroy.add(`${rowA},${colA}`);
      cellsToDestroy.add(`${rowB},${colB}`);
    }
    // Rainbow + Bomb
    else if (
      (typeA === SpecialGemType.RAINBOW && typeB === SpecialGemType.BOMB) ||
      (typeB === SpecialGemType.RAINBOW && typeA === SpecialGemType.BOMB)
    ) {
      this.soundSystem?.playRainbow();
      this.soundSystem?.playBomb();
      // Random color → all become bombs
      const types = GEM_TYPES.slice(0, this.gemTypesCount);
      const targetColor = types[Math.floor(Math.random() * types.length)];
      for (let r = 0; r < GRID_ROWS; r++) {
        for (let c = 0; c < GRID_COLS; c++) {
          const gem = this.grid[r][c];
          if (gem && gem.gemType === targetColor && !this.isRock(r, c)) {
            // Bomb 3x3
            for (let dr = -1; dr <= 1; dr++) {
              for (let dc = -1; dc <= 1; dc++) {
                const nr = r + dr;
                const nc = c + dc;
                if (nr >= 0 && nr < GRID_ROWS && nc >= 0 && nc < GRID_COLS && !this.isRock(nr, nc)) {
                  cellsToDestroy.add(`${nr},${nc}`);
                }
              }
            }
          }
        }
      }
      cellsToDestroy.add(`${rowA},${colA}`);
      cellsToDestroy.add(`${rowB},${colB}`);
    }
    // Bomb + Bomb = 5x5
    else if (typeA === SpecialGemType.BOMB && typeB === SpecialGemType.BOMB) {
      this.soundSystem?.playBomb();
      const centerRow = rowA;
      const centerCol = colA;
      for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
          const r = centerRow + dr;
          const c = centerCol + dc;
          if (r >= 0 && r < GRID_ROWS && c >= 0 && c < GRID_COLS && !this.isRock(r, c)) {
            cellsToDestroy.add(`${r},${c}`);
          }
        }
      }
    }
    // Striped + Striped = cross (row + column)
    else if (
      (typeA === SpecialGemType.HORIZONTAL_STRIPE || typeA === SpecialGemType.VERTICAL_STRIPE) &&
      (typeB === SpecialGemType.HORIZONTAL_STRIPE || typeB === SpecialGemType.VERTICAL_STRIPE)
    ) {
      this.soundSystem?.playSpecialActivate();
      // Cross at gemA position
      for (let c = 0; c < GRID_COLS; c++) if (!this.isRock(rowA, c)) cellsToDestroy.add(`${rowA},${c}`);
      for (let r = 0; r < GRID_ROWS; r++) if (!this.isRock(r, colA)) cellsToDestroy.add(`${r},${colA}`);
    }
    // Striped + Bomb = 3 rows + 3 columns
    else if (
      ((typeA === SpecialGemType.HORIZONTAL_STRIPE || typeA === SpecialGemType.VERTICAL_STRIPE) && typeB === SpecialGemType.BOMB) ||
      (typeA === SpecialGemType.BOMB && (typeB === SpecialGemType.HORIZONTAL_STRIPE || typeB === SpecialGemType.VERTICAL_STRIPE))
    ) {
      this.soundSystem?.playBomb();
      this.soundSystem?.playSpecialActivate();
      const center = typeA === SpecialGemType.BOMB ? { row: rowA, col: colA } : { row: rowB, col: colB };
      for (let d = -1; d <= 1; d++) {
        const r = center.row + d;
        const c = center.col + d;
        if (r >= 0 && r < GRID_ROWS) {
          for (let cc = 0; cc < GRID_COLS; cc++) if (!this.isRock(r, cc)) cellsToDestroy.add(`${r},${cc}`);
        }
        if (c >= 0 && c < GRID_COLS) {
          for (let rr = 0; rr < GRID_ROWS; rr++) if (!this.isRock(rr, c)) cellsToDestroy.add(`${rr},${c}`);
        }
      }
    }

    // Destroy all collected cells
    const colorCounts = new Map<GemType, number>();
    for (const key of cellsToDestroy) {
      const [r, c] = key.split(',').map(Number);
      const gem = this.grid[r]?.[c];
      if (!gem) continue;

      const cnt = colorCounts.get(gem.gemType) ?? 0;
      colorCounts.set(gem.gemType, cnt + 1);
      this.score += POINTS_PER_GEM * 2;
      gem.playDestroy();
      this.grid[r][c] = null;
    }

    // Process ice
    const iceCount = this.processIceBreaks(cellsToDestroy);

    for (const [color, count] of colorCounts) {
      this.goalSystem.onGemsDestroyed(color, count);
    }
    if (iceCount > 0) this.goalSystem.onIceBroken(iceCount);
    this.goalSystem.onScoreChanged(this.score);
    this.events.onScoreChanged(this.score);

    await this.delay(300);
    await this.cascadeDown();
    await this.fillEmptyCells();
  }

  // ─── Cascade loop ───────────────────────────────────────────

  private async doCascadeLoop(): Promise<void> {
    await this.cascadeDown();
    await this.fillEmptyCells();

    // Drop items
    await this.processDropItems();

    // Check for new matches (chain reactions)
    const typeGrid = this.getTypeGrid();
    const newMatches = this.matchSystem.findAllMatches(typeGrid);
    if (newMatches.length > 0) {
      await this.processMatches(newMatches);
      await this.doCascadeLoop();
    } else {
      // No more matches — check if moves are possible
      if (!this.matchSystem.hasPossibleMoves(this.getTypeGrid())) {
        await this.shuffleBoard();
      }
    }
  }

  private async cascadeDown(): Promise<void> {
    const animations: Promise<void>[] = [];

    for (let col = 0; col < GRID_COLS; col++) {
      let emptyRow = GRID_ROWS - 1;

      for (let row = GRID_ROWS - 1; row >= 0; row--) {
        // Skip rocks
        if (this.isRock(row, col)) {
          // Rock stays, reset emptyRow pointer
          if (row === emptyRow) emptyRow--;
          continue;
        }

        if (this.grid[row][col] !== null) {
          if (row !== emptyRow) {
            // Skip if emptyRow has a rock
            while (emptyRow > row && this.isRock(emptyRow, col)) {
              emptyRow--;
            }
            if (emptyRow <= row) {
              emptyRow--;
              continue;
            }

            const gem = this.grid[row][col]!;
            this.grid[emptyRow][col] = gem;
            this.grid[row][col] = null;
            gem.gridRow = emptyRow;
            gem.gridCol = col;

            // Also move any drop-item blocker
            const dropItem = this.blockerGrid[row][col];
            if (dropItem && dropItem.blockerType === BlockerType.DROP_ITEM) {
              this.blockerGrid[emptyRow][col] = dropItem;
              this.blockerGrid[row][col] = null;
              dropItem.gridRow = emptyRow;
              dropItem.gridCol = col;

              const dropPos = this.gridToWorld(emptyRow, col);
              animations.push(
                new Promise((resolve) => {
                  this.scene.tweens.add({
                    targets: dropItem,
                    x: dropPos.x,
                    y: dropPos.y,
                    duration: FALL_DURATION * (emptyRow - row),
                    ease: 'Bounce.easeOut',
                    onComplete: () => resolve(),
                  });
                }),
              );
            }

            const pos = this.gridToWorld(emptyRow, col);
            animations.push(
              new Promise((resolve) => {
                this.scene.tweens.add({
                  targets: gem,
                  y: pos.y,
                  duration: FALL_DURATION * (emptyRow - row),
                  ease: 'Bounce.easeOut',
                  onComplete: () => resolve(),
                });
              }),
            );
          }
          emptyRow--;
        }
      }
    }

    if (animations.length > 0) {
      await Promise.all(animations);
      this.soundSystem?.playGemLand();
    }
  }

  private async fillEmptyCells(): Promise<void> {
    const animations: Promise<void>[] = [];

    for (let col = 0; col < GRID_COLS; col++) {
      for (let row = GRID_ROWS - 1; row >= 0; row--) {
        if (this.isRock(row, col)) continue;
        if (this.grid[row][col] === null) {
          const gemType = getRandomGemType(this.gemTypesCount);
          const pos = this.gridToWorld(row, col);
          const gem = new Gem(this.scene, pos.x, GRID_OFFSET_Y - GEM_SIZE, gemType, row, col);
          gem.setDepth(10);
          this.grid[row][col] = gem;

          animations.push(
            new Promise((resolve) => {
              this.scene.tweens.add({
                targets: gem,
                y: pos.y,
                duration: FALL_DURATION * (row + 1),
                ease: 'Bounce.easeOut',
                onComplete: () => resolve(),
              });
            }),
          );
        }
      }
    }

    if (animations.length > 0) {
      await Promise.all(animations);
    }
  }

  // ─── Drop item logic ────────────────────────────────────────

  private async processDropItems(): Promise<void> {
    // Check each column bottom-up for drop items that reached the bottom
    for (let col = 0; col < GRID_COLS; col++) {
      for (let row = GRID_ROWS - 1; row >= 0; row--) {
        const blocker = this.blockerGrid[row][col];
        if (blocker && blocker.blockerType === BlockerType.DROP_ITEM) {
          if (row === GRID_ROWS - 1) {
            // Item reached bottom!
            this.goalSystem.onItemDropped();
            blocker.destroy();
            this.blockerGrid[row][col] = null;
            this.soundSystem?.playSpecialActivate();
          }
        }
      }
    }
  }

  // ─── Hammer booster ─────────────────────────────────────────

  private async useHammer(gem: Gem): Promise<void> {
    this.isProcessing = true;

    const color = gem.gemType;
    this.score += POINTS_PER_GEM;
    this.goalSystem.onGemsDestroyed(color, 1);
    this.goalSystem.onScoreChanged(this.score);
    this.events.onScoreChanged(this.score);

    // Check ice
    const ice = this.getIceBlocker(gem.gridRow, gem.gridCol);
    if (ice) {
      const destroyed = ice.hitIce();
      this.soundSystem?.playIceBreak();
      if (destroyed) {
        this.blockerGrid[gem.gridRow][gem.gridCol] = null;
        this.goalSystem.onIceBroken(1);
      }
    }

    this.soundSystem?.playBomb();
    gem.playDestroy();
    this.grid[gem.gridRow][gem.gridCol] = null;

    await this.delay(200);
    await this.doCascadeLoop();

    this.isProcessing = false;
    this.checkGameEnd();
  }

  // ─── Game end checks ────────────────────────────────────────

  private checkGameEnd(): void {
    if (this.goalSystem.isComplete()) {
      this.events.onLevelComplete();
      return;
    }

    if (this.movesLeft <= 0) {
      this.events.onLevelFailed();
    }
  }

  // ─── Utilities ──────────────────────────────────────────────

  private getTypeGrid(): (GemType | null)[][] {
    return this.grid.map((row) =>
      row.map((gem) => (gem ? gem.gemType : null)),
    );
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => {
      this.scene.time.delayedCall(ms, resolve);
    });
  }
}
