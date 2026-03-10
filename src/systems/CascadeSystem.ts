import { GRID_COLS, GRID_ROWS, GemType } from '../config';

/**
 * CascadeSystem — handles gravity logic (gems falling down to fill gaps).
 * The actual animation is done in Board; this system provides the logical operations.
 */
export class CascadeSystem {
  /**
   * Apply gravity to a type grid: move non-null values down to fill nulls.
   * Returns array of moves: { fromRow, toRow, col }.
   */
  public applyGravity(
    grid: (GemType | null)[][],
  ): { fromRow: number; toRow: number; col: number }[] {
    const moves: { fromRow: number; toRow: number; col: number }[] = [];

    for (let col = 0; col < GRID_COLS; col++) {
      let emptyRow = GRID_ROWS - 1;

      for (let row = GRID_ROWS - 1; row >= 0; row--) {
        if (grid[row][col] !== null) {
          if (row !== emptyRow) {
            grid[emptyRow][col] = grid[row][col];
            grid[row][col] = null;
            moves.push({ fromRow: row, toRow: emptyRow, col });
          }
          emptyRow--;
        }
      }
    }

    return moves;
  }

  /**
   * Count empty cells in each column (for spawning new gems from top).
   */
  public countEmptyPerColumn(grid: (GemType | null)[][]): number[] {
    const counts: number[] = new Array(GRID_COLS).fill(0);

    for (let col = 0; col < GRID_COLS; col++) {
      for (let row = 0; row < GRID_ROWS; row++) {
        if (grid[row][col] === null) {
          counts[col]++;
        }
      }
    }

    return counts;
  }
}
