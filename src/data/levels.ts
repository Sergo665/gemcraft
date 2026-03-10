import { GoalType, BlockerType } from '../config';
import { LevelConfig } from '../systems/LevelSystem';

/**
 * Level configurations for the first location: "Mountain Mine" (Горный рудник).
 * 15 levels with progressive difficulty.
 *
 * Design notes:
 * - Levels 1-3: simple COLLECT_COLOR, 5 gem types, 30-35 moves
 * - Levels 4-6: double COLLECT_COLOR goals, 6 gem types, 30 moves
 * - Levels 7-9: BREAK_ICE (1-2 layer ice), 5-6 types, 28-30 moves
 * - Levels 10-11: DROP_ITEM (1-2 items), 5 types, 30 moves
 * - Levels 12-13: COLLECT_COLOR + BREAK_ICE combo, 6 types, 25-28 moves
 * - Level 14: SCORE + rock obstacles, 6 types, 30 moves
 * - Level 15: DROP_ITEM + BREAK_ICE + rocks, 6 types, 25 moves (hard)
 *
 * "Fail" levels (tight move budget): 6, 9, 15
 */
export const LEVELS: LevelConfig[] = [
  // ─── Level 1: Tutorial ────────────────────────────────────
  {
    id: 1,
    name: 'Первый камень',
    moves: 35,
    goals: [
      { type: GoalType.COLLECT_COLOR, target: 10, current: 0, color: 'ruby' },
    ],
    gemTypesCount: 5,
  },

  // ─── Level 2 ──────────────────────────────────────────────
  {
    id: 2,
    name: 'Рубиновый сбор',
    moves: 30,
    goals: [
      { type: GoalType.COLLECT_COLOR, target: 15, current: 0, color: 'ruby' },
    ],
    gemTypesCount: 5,
  },

  // ─── Level 3 ──────────────────────────────────────────────
  {
    id: 3,
    name: 'Сапфировая жила',
    moves: 32,
    goals: [
      { type: GoalType.COLLECT_COLOR, target: 20, current: 0, color: 'sapphire' },
    ],
    gemTypesCount: 5,
  },

  // ─── Level 4: Double goals ────────────────────────────────
  {
    id: 4,
    name: 'Двойная добыча',
    moves: 30,
    goals: [
      { type: GoalType.COLLECT_COLOR, target: 12, current: 0, color: 'emerald' },
      { type: GoalType.COLLECT_COLOR, target: 12, current: 0, color: 'amber' },
    ],
    gemTypesCount: 6,
  },

  // ─── Level 5 ──────────────────────────────────────────────
  {
    id: 5,
    name: 'Аметистовая охота',
    moves: 30,
    goals: [
      { type: GoalType.COLLECT_COLOR, target: 15, current: 0, color: 'amethyst' },
      { type: GoalType.COLLECT_COLOR, target: 10, current: 0, color: 'topaz' },
    ],
    gemTypesCount: 6,
  },

  // ─── Level 6: FAIL LEVEL ──────────────────────────────────
  {
    id: 6,
    name: 'Трудный выбор',
    moves: 22,
    goals: [
      { type: GoalType.COLLECT_COLOR, target: 18, current: 0, color: 'ruby' },
      { type: GoalType.COLLECT_COLOR, target: 18, current: 0, color: 'sapphire' },
    ],
    gemTypesCount: 6,
  },

  // ─── Level 7: Ice begins ──────────────────────────────────
  {
    id: 7,
    name: 'Ледяная ловушка',
    moves: 30,
    goals: [
      { type: GoalType.BREAK_ICE, target: 6, current: 0 },
    ],
    gemTypesCount: 5,
    blockers: [
      { type: BlockerType.ICE_1, row: 2, col: 2 },
      { type: BlockerType.ICE_1, row: 2, col: 4 },
      { type: BlockerType.ICE_1, row: 4, col: 1 },
      { type: BlockerType.ICE_1, row: 4, col: 5 },
      { type: BlockerType.ICE_1, row: 5, col: 2 },
      { type: BlockerType.ICE_1, row: 5, col: 4 },
    ],
  },

  // ─── Level 8: Ice 2 layers ────────────────────────────────
  {
    id: 8,
    name: 'Морозный грот',
    moves: 28,
    goals: [
      { type: GoalType.BREAK_ICE, target: 8, current: 0 },
    ],
    gemTypesCount: 5,
    blockers: [
      { type: BlockerType.ICE_2, row: 1, col: 3 },
      { type: BlockerType.ICE_1, row: 2, col: 2 },
      { type: BlockerType.ICE_2, row: 2, col: 4 },
      { type: BlockerType.ICE_1, row: 3, col: 1 },
      { type: BlockerType.ICE_1, row: 3, col: 5 },
      { type: BlockerType.ICE_2, row: 4, col: 3 },
      { type: BlockerType.ICE_1, row: 5, col: 2 },
      { type: BlockerType.ICE_1, row: 5, col: 4 },
    ],
  },

  // ─── Level 9: FAIL LEVEL ──────────────────────────────────
  {
    id: 9,
    name: 'Ледяной панцирь',
    moves: 20,
    goals: [
      { type: GoalType.BREAK_ICE, target: 10, current: 0 },
    ],
    gemTypesCount: 6,
    blockers: [
      { type: BlockerType.ICE_2, row: 1, col: 2 },
      { type: BlockerType.ICE_2, row: 1, col: 4 },
      { type: BlockerType.ICE_3, row: 2, col: 3 },
      { type: BlockerType.ICE_1, row: 3, col: 1 },
      { type: BlockerType.ICE_2, row: 3, col: 5 },
      { type: BlockerType.ICE_1, row: 4, col: 2 },
      { type: BlockerType.ICE_1, row: 4, col: 4 },
      { type: BlockerType.ICE_2, row: 5, col: 3 },
      { type: BlockerType.ICE_1, row: 6, col: 1 },
      { type: BlockerType.ICE_1, row: 6, col: 5 },
    ],
  },

  // ─── Level 10: Drop items ─────────────────────────────────
  {
    id: 10,
    name: 'Золотой ключ',
    moves: 30,
    goals: [
      { type: GoalType.DROP_ITEM, target: 1, current: 0 },
    ],
    gemTypesCount: 5,
    blockers: [
      { type: BlockerType.DROP_ITEM, row: 0, col: 3 },
    ],
  },

  // ─── Level 11 ─────────────────────────────────────────────
  {
    id: 11,
    name: 'Два ключа',
    moves: 30,
    goals: [
      { type: GoalType.DROP_ITEM, target: 2, current: 0 },
    ],
    gemTypesCount: 5,
    blockers: [
      { type: BlockerType.DROP_ITEM, row: 0, col: 2 },
      { type: BlockerType.DROP_ITEM, row: 0, col: 4 },
    ],
  },

  // ─── Level 12: Combo goals ────────────────────────────────
  {
    id: 12,
    name: 'Лёд и рубины',
    moves: 28,
    goals: [
      { type: GoalType.COLLECT_COLOR, target: 15, current: 0, color: 'ruby' },
      { type: GoalType.BREAK_ICE, target: 6, current: 0 },
    ],
    gemTypesCount: 6,
    blockers: [
      { type: BlockerType.ICE_1, row: 2, col: 1 },
      { type: BlockerType.ICE_1, row: 2, col: 5 },
      { type: BlockerType.ICE_2, row: 3, col: 3 },
      { type: BlockerType.ICE_1, row: 4, col: 2 },
      { type: BlockerType.ICE_1, row: 4, col: 4 },
      { type: BlockerType.ICE_1, row: 5, col: 3 },
    ],
  },

  // ─── Level 13 ─────────────────────────────────────────────
  {
    id: 13,
    name: 'Морозный улов',
    moves: 25,
    goals: [
      { type: GoalType.COLLECT_COLOR, target: 12, current: 0, color: 'emerald' },
      { type: GoalType.BREAK_ICE, target: 8, current: 0 },
    ],
    gemTypesCount: 6,
    blockers: [
      { type: BlockerType.ICE_2, row: 1, col: 2 },
      { type: BlockerType.ICE_2, row: 1, col: 4 },
      { type: BlockerType.ICE_1, row: 2, col: 3 },
      { type: BlockerType.ICE_1, row: 3, col: 1 },
      { type: BlockerType.ICE_1, row: 3, col: 5 },
      { type: BlockerType.ICE_2, row: 4, col: 3 },
      { type: BlockerType.ICE_1, row: 5, col: 2 },
      { type: BlockerType.ICE_1, row: 5, col: 4 },
    ],
  },

  // ─── Level 14: Score + rocks ──────────────────────────────
  {
    id: 14,
    name: 'Горный перевал',
    moves: 30,
    goals: [
      { type: GoalType.SCORE, target: 3000, current: 0 },
    ],
    gemTypesCount: 6,
    blockers: [
      { type: BlockerType.ROCK, row: 2, col: 0 },
      { type: BlockerType.ROCK, row: 2, col: 6 },
      { type: BlockerType.ROCK, row: 5, col: 0 },
      { type: BlockerType.ROCK, row: 5, col: 6 },
      { type: BlockerType.ROCK, row: 3, col: 3 },
    ],
  },

  // ─── Level 15: HARD LEVEL ─────────────────────────────────
  {
    id: 15,
    name: 'Сердце горы',
    moves: 25,
    goals: [
      { type: GoalType.DROP_ITEM, target: 2, current: 0 },
      { type: GoalType.BREAK_ICE, target: 6, current: 0 },
    ],
    gemTypesCount: 6,
    blockers: [
      { type: BlockerType.DROP_ITEM, row: 0, col: 2 },
      { type: BlockerType.DROP_ITEM, row: 0, col: 4 },
      { type: BlockerType.ROCK, row: 3, col: 0 },
      { type: BlockerType.ROCK, row: 3, col: 6 },
      { type: BlockerType.ICE_2, row: 2, col: 3 },
      { type: BlockerType.ICE_1, row: 4, col: 2 },
      { type: BlockerType.ICE_1, row: 4, col: 4 },
      { type: BlockerType.ICE_2, row: 5, col: 1 },
      { type: BlockerType.ICE_2, row: 5, col: 5 },
      { type: BlockerType.ICE_1, row: 6, col: 3 },
    ],
  },
];
