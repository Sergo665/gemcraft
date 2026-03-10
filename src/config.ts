// Game dimensions
export const GAME_WIDTH = 540;
export const GAME_HEIGHT = 960;

// Grid
export const GRID_COLS = 7;
export const GRID_ROWS = 8;
export const GEM_SIZE = 64;
export const GEM_PADDING = 4;
export const GRID_OFFSET_X = (GAME_WIDTH - GRID_COLS * (GEM_SIZE + GEM_PADDING)) / 2;
export const GRID_OFFSET_Y = 200;

// Swap animation
export const SWAP_DURATION = 200;
export const FALL_DURATION = 150;
export const MATCH_DELAY = 100;

// 6 gem types with colors from DESIGN_GUIDE
export const GEM_TYPES = ['ruby', 'sapphire', 'emerald', 'amber', 'amethyst', 'topaz'] as const;
export type GemType = typeof GEM_TYPES[number];

export const GEM_COLORS: Record<GemType, string> = {
  ruby: '#E63946',
  sapphire: '#457B9D',
  emerald: '#2A9D8F',
  amber: '#F4A261',
  amethyst: '#7B2D8E',
  topaz: '#48CAE4',
};

export const GEM_COLORS_INT: Record<GemType, number> = {
  ruby: 0xE63946,
  sapphire: 0x457B9D,
  emerald: 0x2A9D8F,
  amber: 0xF4A261,
  amethyst: 0x7B2D8E,
  topaz: 0x48CAE4,
};

// Special gem types
export enum SpecialGemType {
  NONE = 'none',
  HORIZONTAL_STRIPE = 'horizontal_stripe',
  VERTICAL_STRIPE = 'vertical_stripe',
  BOMB = 'bomb',
  RAINBOW = 'rainbow',
}

// Blocker types
export enum BlockerType {
  NONE = 'none',
  ICE_1 = 'ice_1',
  ICE_2 = 'ice_2',
  ICE_3 = 'ice_3',
  ROCK = 'rock',
  DROP_ITEM = 'drop_item',
}

// Goal types
export enum GoalType {
  COLLECT_COLOR = 'collect_color',
  BREAK_ICE = 'break_ice',
  DROP_ITEM = 'drop_item',
  SCORE = 'score',
}

// UI colors
export const WOOD_COLOR = '#8B5E3C';
export const WOOD_DARK = '#5C3A1E';
export const STONE_COLOR = '#4A4A4A';
export const STONE_LIGHT = '#6A6A6A';
export const CAVE_BG = '#1A1A2E';

export const WOOD_COLOR_INT = 0x8B5E3C;
export const WOOD_DARK_INT = 0x5C3A1E;
export const STONE_COLOR_INT = 0x4A4A4A;
export const STONE_LIGHT_INT = 0x6A6A6A;
export const CAVE_BG_INT = 0x1A1A2E;

// Scoring
export const POINTS_PER_GEM = 10;
export const COMBO_MULTIPLIERS = [1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0];
export const COMBO_MULTIPLIER = 1.5;

// Swipe detection
export const SWIPE_THRESHOLD = 30;

// Star thresholds (percentage of max possible score)
export const STAR_THRESHOLDS = [0, 0.4, 0.7]; // 1 star = complete goals, 2 = 40%, 3 = 70%

// Scenes keys
export const SCENE_BOOT = 'BootScene';
export const SCENE_WORKSHOP = 'WorkshopScene';
export const SCENE_GAME = 'GameScene';
export const SCENE_LEVEL_MAP = 'LevelMapScene';
export const SCENE_UI = 'UIScene';
