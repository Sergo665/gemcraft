import { GRID_COLS, GRID_ROWS, GemType, SpecialGemType } from '../config';

export interface MatchCell {
  row: number;
  col: number;
}

export interface Match {
  cells: MatchCell[];
  type: GemType;
  isHorizontal: boolean;
  /** Length of the longest line segment in this match */
  length: number;
  /** Whether this match forms an L or T shape (two intersecting lines) */
  isLOrT: boolean;
}

/**
 * MatchSystem — finds all matches of 3+ on the board.
 * Enhanced to detect L/T shapes and 5-in-a-row for special gem creation.
 */
export class MatchSystem {
  /**
   * Find all horizontal and vertical matches of 3+ gems.
   * Merges overlapping matches into combined shapes (L, T).
   */
  public findAllMatches(grid: (GemType | null)[][]): Match[] {
    const hMatches = this.findDirectionalMatches(grid, true);
    const vMatches = this.findDirectionalMatches(grid, false);

    // Merge intersecting matches of the same color into L/T shapes
    return this.mergeMatches(hMatches, vMatches);
  }

  /**
   * Find matches in one direction (horizontal or vertical).
   */
  private findDirectionalMatches(
    grid: (GemType | null)[][],
    horizontal: boolean,
  ): Match[] {
    const matches: Match[] = [];
    const outerLimit = horizontal ? GRID_ROWS : GRID_COLS;
    const innerLimit = horizontal ? GRID_COLS : GRID_ROWS;

    for (let outer = 0; outer < outerLimit; outer++) {
      let inner = 0;
      while (inner < innerLimit) {
        const row = horizontal ? outer : inner;
        const col = horizontal ? inner : outer;
        const type = grid[row]?.[col] ?? null;

        if (type === null) {
          inner++;
          continue;
        }

        let end = inner + 1;
        while (end < innerLimit) {
          const r = horizontal ? outer : end;
          const c = horizontal ? end : outer;
          if (grid[r]?.[c] !== type) break;
          end++;
        }

        const length = end - inner;
        if (length >= 3) {
          const cells: MatchCell[] = [];
          for (let i = inner; i < end; i++) {
            cells.push({
              row: horizontal ? outer : i,
              col: horizontal ? i : outer,
            });
          }
          matches.push({
            cells,
            type,
            isHorizontal: horizontal,
            length,
            isLOrT: false,
          });
        }

        inner = end;
      }
    }

    return matches;
  }

  /**
   * Merge horizontal and vertical matches that share cells of the same color.
   * Shared cell = L or T shape.
   */
  private mergeMatches(hMatches: Match[], vMatches: Match[]): Match[] {
    const allMatches = [...hMatches, ...vMatches];
    const merged: Match[] = [];
    const used = new Set<number>();

    for (let i = 0; i < allMatches.length; i++) {
      if (used.has(i)) continue;

      const group = [i];
      const cellSet = new Set<string>();
      for (const c of allMatches[i].cells) {
        cellSet.add(`${c.row},${c.col}`);
      }

      // Find all matches that share at least one cell with this group
      let changed = true;
      while (changed) {
        changed = false;
        for (let j = 0; j < allMatches.length; j++) {
          if (used.has(j) || group.includes(j)) continue;
          if (allMatches[j].type !== allMatches[i].type) continue;

          const shares = allMatches[j].cells.some(
            (c) => cellSet.has(`${c.row},${c.col}`),
          );
          if (shares) {
            group.push(j);
            for (const c of allMatches[j].cells) {
              cellSet.add(`${c.row},${c.col}`);
            }
            changed = true;
          }
        }
      }

      for (const idx of group) {
        used.add(idx);
      }

      // Build merged match
      const uniqueCells: MatchCell[] = [];
      const seen = new Set<string>();
      for (const idx of group) {
        for (const c of allMatches[idx].cells) {
          const key = `${c.row},${c.col}`;
          if (!seen.has(key)) {
            seen.add(key);
            uniqueCells.push(c);
          }
        }
      }

      const hasH = group.some((idx) => allMatches[idx].isHorizontal);
      const hasV = group.some((idx) => !allMatches[idx].isHorizontal);
      const isLOrT = hasH && hasV;
      const maxLength = Math.max(...group.map((idx) => allMatches[idx].length));

      merged.push({
        cells: uniqueCells,
        type: allMatches[i].type,
        isHorizontal: hasH && !hasV,
        length: maxLength,
        isLOrT,
      });
    }

    return merged;
  }

  /**
   * Determine what special gem should be created for a match.
   */
  public determineSpecialType(match: Match): SpecialGemType {
    const totalCells = match.cells.length;

    // 5+ in a straight line → Rainbow
    if (match.length >= 5 && !match.isLOrT) {
      return SpecialGemType.RAINBOW;
    }

    // L or T shape (5 cells from two intersecting 3+ lines) → Bomb
    if (match.isLOrT && totalCells >= 5) {
      return SpecialGemType.BOMB;
    }

    // 4 in a row → Striped (direction based on line orientation)
    if (match.length === 4 && !match.isLOrT) {
      return match.isHorizontal
        ? SpecialGemType.HORIZONTAL_STRIPE
        : SpecialGemType.VERTICAL_STRIPE;
    }

    return SpecialGemType.NONE;
  }

  /**
   * Check if there are any possible moves on the board.
   */
  public hasPossibleMoves(grid: (GemType | null)[][]): boolean {
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        if (grid[row][col] === null) continue;

        // Try swap right
        if (col < GRID_COLS - 1 && grid[row][col + 1] !== null) {
          this.swap(grid, row, col, row, col + 1);
          if (this.findAllMatches(grid).length > 0) {
            this.swap(grid, row, col, row, col + 1);
            return true;
          }
          this.swap(grid, row, col, row, col + 1);
        }
        // Try swap down
        if (row < GRID_ROWS - 1 && grid[row + 1]?.[col] !== null) {
          this.swap(grid, row, col, row + 1, col);
          if (this.findAllMatches(grid).length > 0) {
            this.swap(grid, row, col, row + 1, col);
            return true;
          }
          this.swap(grid, row, col, row + 1, col);
        }
      }
    }
    return false;
  }

  private swap(
    grid: (GemType | null)[][],
    r1: number,
    c1: number,
    r2: number,
    c2: number,
  ): void {
    const temp = grid[r1][c1];
    grid[r1][c1] = grid[r2][c2];
    grid[r2][c2] = temp;
  }
}
