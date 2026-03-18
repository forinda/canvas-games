/**
 * Level definitions for Breakout.
 * Each level is a 2D array of hp values (0 = no brick).
 * Color palettes are assigned per row.
 */

export interface LevelDef {
  /** 2D grid: rows x cols, value = brick HP (0 = empty) */
  layout: number[][];
  /** Row colors from top to bottom */
  colors: string[];
  /** Ball speed multiplier for this level */
  speedMult: number;
}

export const LEVELS: LevelDef[] = [
  // Level 1: Classic solid rows
  {
    layout: [
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    ],
    colors: ['#e74c3c', '#e67e22', '#f1c40f', '#2ecc71', '#3498db'],
    speedMult: 1.0,
  },
  // Level 2: Checkerboard with some 2-hp bricks
  {
    layout: [
      [2, 0, 2, 0, 2, 0, 2, 0, 2, 0],
      [0, 1, 0, 1, 0, 1, 0, 1, 0, 1],
      [2, 0, 2, 0, 2, 0, 2, 0, 2, 0],
      [0, 1, 0, 1, 0, 1, 0, 1, 0, 1],
      [2, 0, 2, 0, 2, 0, 2, 0, 2, 0],
      [0, 1, 0, 1, 0, 1, 0, 1, 0, 1],
    ],
    colors: ['#9b59b6', '#8e44ad', '#e74c3c', '#c0392b', '#e67e22', '#d35400'],
    speedMult: 1.1,
  },
  // Level 3: Diamond shape, mixed hp
  {
    layout: [
      [0, 0, 0, 0, 2, 2, 0, 0, 0, 0],
      [0, 0, 0, 2, 1, 1, 2, 0, 0, 0],
      [0, 0, 2, 1, 3, 3, 1, 2, 0, 0],
      [0, 2, 1, 3, 3, 3, 3, 1, 2, 0],
      [0, 0, 2, 1, 3, 3, 1, 2, 0, 0],
      [0, 0, 0, 2, 1, 1, 2, 0, 0, 0],
      [0, 0, 0, 0, 2, 2, 0, 0, 0, 0],
    ],
    colors: ['#1abc9c', '#16a085', '#2ecc71', '#27ae60', '#2ecc71', '#16a085', '#1abc9c'],
    speedMult: 1.2,
  },
  // Level 4: Fortress with tough bricks
  {
    layout: [
      [3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
      [3, 0, 0, 0, 0, 0, 0, 0, 0, 3],
      [3, 0, 2, 2, 2, 2, 2, 2, 0, 3],
      [3, 0, 2, 0, 0, 0, 0, 2, 0, 3],
      [3, 0, 2, 2, 2, 2, 2, 2, 0, 3],
      [3, 0, 0, 0, 0, 0, 0, 0, 0, 3],
      [3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
    ],
    colors: ['#e74c3c', '#c0392b', '#e67e22', '#d35400', '#e67e22', '#c0392b', '#e74c3c'],
    speedMult: 1.3,
  },
  // Level 5: Full grid, all tough
  {
    layout: [
      [3, 2, 3, 2, 3, 2, 3, 2, 3, 2],
      [2, 3, 2, 3, 2, 3, 2, 3, 2, 3],
      [3, 2, 3, 2, 3, 2, 3, 2, 3, 2],
      [2, 3, 2, 3, 2, 3, 2, 3, 2, 3],
      [3, 2, 3, 2, 3, 2, 3, 2, 3, 2],
      [2, 3, 2, 3, 2, 3, 2, 3, 2, 3],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    ],
    colors: ['#e74c3c', '#e67e22', '#f1c40f', '#2ecc71', '#3498db', '#9b59b6', '#1abc9c', '#16a085'],
    speedMult: 1.5,
  },
];
