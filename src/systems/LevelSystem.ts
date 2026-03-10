import { GoalType, GemType, BlockerType, SpecialGemType } from '../config';
import { Goal } from './GoalSystem';

export interface BlockerConfig {
  type: BlockerType;
  row: number;
  col: number;
}

export interface PresetSpecialConfig {
  row: number;
  col: number;
  type: SpecialGemType;
}

export interface LevelConfig {
  id: number;
  name: string;
  moves: number;
  goals: Goal[];
  gridCols?: number;
  gridRows?: number;
  blockers?: BlockerConfig[];
  presetSpecials?: PresetSpecialConfig[];
  gemTypesCount?: number; // How many gem types to use (3-6), default 6
}

/**
 * LevelSystem — loads and manages level configurations.
 */
export class LevelSystem {
  private currentLevel: LevelConfig | null = null;
  private highestUnlockedLevel = 1;

  /**
   * Load a level by ID.
   */
  public loadLevel(levels: LevelConfig[], levelId: number): LevelConfig | null {
    const level = levels.find((l) => l.id === levelId) ?? null;
    this.currentLevel = level;
    return level;
  }

  /**
   * Get the current level config.
   */
  public getCurrentLevel(): LevelConfig | null {
    return this.currentLevel;
  }

  /**
   * Mark a level as completed and unlock the next.
   */
  public completeLevel(stars: number): void {
    if (this.currentLevel) {
      const nextLevel = this.currentLevel.id + 1;
      if (nextLevel > this.highestUnlockedLevel) {
        this.highestUnlockedLevel = nextLevel;
      }
    }
  }

  /**
   * Check if a level is unlocked.
   */
  public isLevelUnlocked(levelId: number): boolean {
    return levelId <= this.highestUnlockedLevel;
  }

  /**
   * Get the highest unlocked level.
   */
  public getHighestUnlockedLevel(): number {
    return this.highestUnlockedLevel;
  }
}
