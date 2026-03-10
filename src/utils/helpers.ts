import { GEM_TYPES, GemType } from '../config';

/**
 * Get a random gem type from the available types.
 */
export function getRandomGemType(count?: number): GemType {
  const types = count ? GEM_TYPES.slice(0, count) : GEM_TYPES;
  return types[Math.floor(Math.random() * types.length)];
}

/**
 * Shuffle an array in place (Fisher-Yates).
 */
export function shuffleArray<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

/**
 * Clamp a value between min and max.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Linear interpolation.
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Format a number with thousands separator.
 */
export function formatNumber(n: number): string {
  return n.toLocaleString('ru-RU');
}

/**
 * Delay utility for async/await in Phaser scenes.
 */
export function delay(scene: Phaser.Scene, ms: number): Promise<void> {
  return new Promise((resolve) => {
    scene.time.delayedCall(ms, resolve);
  });
}
