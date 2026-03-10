import { SpecialGemType, GRID_COLS, GRID_ROWS } from '../config';

/**
 * Special gem effects — logic for what happens when a special gem is activated.
 */

interface AffectedCell {
  row: number;
  col: number;
}

/**
 * Get all cells affected by a special gem activation at (row, col).
 */
export function getSpecialGemEffect(
  type: SpecialGemType,
  row: number,
  col: number,
): AffectedCell[] {
  const cells: AffectedCell[] = [];

  switch (type) {
    case SpecialGemType.HORIZONTAL_STRIPE:
      // Destroy entire row
      for (let c = 0; c < GRID_COLS; c++) {
        cells.push({ row, col: c });
      }
      break;

    case SpecialGemType.VERTICAL_STRIPE:
      // Destroy entire column
      for (let r = 0; r < GRID_ROWS; r++) {
        cells.push({ row: r, col });
      }
      break;

    case SpecialGemType.BOMB:
      // Destroy 3x3 area
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const r = row + dr;
          const c = col + dc;
          if (r >= 0 && r < GRID_ROWS && c >= 0 && c < GRID_COLS) {
            cells.push({ row: r, col: c });
          }
        }
      }
      break;

    case SpecialGemType.RAINBOW:
      // All gems of target color — handled separately (needs color info)
      break;

    case SpecialGemType.NONE:
      break;
  }

  return cells;
}

/**
 * Determine what special gem to create based on match size and shape.
 */
export function determineSpecialGem(
  matchSize: number,
  isHorizontal: boolean,
  isLOrT: boolean,
): SpecialGemType {
  if (matchSize >= 5 && !isLOrT) {
    return SpecialGemType.RAINBOW;
  }
  if (isLOrT) {
    return SpecialGemType.BOMB;
  }
  if (matchSize === 4) {
    return isHorizontal
      ? SpecialGemType.HORIZONTAL_STRIPE
      : SpecialGemType.VERTICAL_STRIPE;
  }
  return SpecialGemType.NONE;
}
