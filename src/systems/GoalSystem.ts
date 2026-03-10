import { GoalType, GemType } from '../config';

export interface Goal {
  type: GoalType;
  target: number;
  current: number;
  color?: GemType; // For COLLECT_COLOR goals
}

/**
 * GoalSystem — tracks level goals and determines completion.
 */
export class GoalSystem {
  private goals: Goal[] = [];

  /**
   * Initialize goals for a level.
   */
  public setGoals(goals: Goal[]): void {
    this.goals = goals.map((g) => ({ ...g, current: 0 }));
  }

  /**
   * Update goal progress when gems are destroyed.
   */
  public onGemsDestroyed(color: GemType, count: number): void {
    for (const goal of this.goals) {
      if (goal.type === GoalType.COLLECT_COLOR && goal.color === color) {
        goal.current = Math.min(goal.current + count, goal.target);
      }
    }
  }

  /**
   * Update goal progress when ice is broken.
   */
  public onIceBroken(count: number): void {
    for (const goal of this.goals) {
      if (goal.type === GoalType.BREAK_ICE) {
        goal.current = Math.min(goal.current + count, goal.target);
      }
    }
  }

  /**
   * Update goal progress when an item reaches the bottom.
   */
  public onItemDropped(): void {
    for (const goal of this.goals) {
      if (goal.type === GoalType.DROP_ITEM) {
        goal.current = Math.min(goal.current + 1, goal.target);
      }
    }
  }

  /**
   * Update score goal.
   */
  public onScoreChanged(totalScore: number): void {
    for (const goal of this.goals) {
      if (goal.type === GoalType.SCORE) {
        goal.current = totalScore;
      }
    }
  }

  /**
   * Check if all goals are completed.
   */
  public isComplete(): boolean {
    return this.goals.every((g) => g.current >= g.target);
  }

  /**
   * Get current goals (for UI display).
   */
  public getGoals(): Readonly<Goal[]> {
    return this.goals;
  }
}
