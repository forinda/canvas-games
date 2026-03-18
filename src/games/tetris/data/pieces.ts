import type { PieceDefinition } from '../types';

/**
 * All 7 standard Tetrominoes.
 * Each rotation is an array of [row, col] offsets from the piece origin.
 * Rotations are ordered: 0=spawn, 1=CW, 2=180, 3=CCW.
 */
export const PIECES: readonly PieceDefinition[] = [
  // I piece - cyan
  {
    id: 'I',
    color: '#00e5ff',
    rotations: [
      [[0, 0], [0, 1], [0, 2], [0, 3]],
      [[0, 2], [1, 2], [2, 2], [3, 2]],
      [[2, 0], [2, 1], [2, 2], [2, 3]],
      [[0, 1], [1, 1], [2, 1], [3, 1]],
    ],
  },
  // O piece - yellow
  {
    id: 'O',
    color: '#ffd600',
    rotations: [
      [[0, 0], [0, 1], [1, 0], [1, 1]],
      [[0, 0], [0, 1], [1, 0], [1, 1]],
      [[0, 0], [0, 1], [1, 0], [1, 1]],
      [[0, 0], [0, 1], [1, 0], [1, 1]],
    ],
  },
  // T piece - purple
  {
    id: 'T',
    color: '#aa00ff',
    rotations: [
      [[0, 0], [0, 1], [0, 2], [1, 1]],
      [[0, 0], [1, 0], [2, 0], [1, 1]],
      [[1, 0], [1, 1], [1, 2], [0, 1]],
      [[0, 1], [1, 1], [2, 1], [1, 0]],
    ],
  },
  // S piece - green
  {
    id: 'S',
    color: '#00e676',
    rotations: [
      [[0, 1], [0, 2], [1, 0], [1, 1]],
      [[0, 0], [1, 0], [1, 1], [2, 1]],
      [[0, 1], [0, 2], [1, 0], [1, 1]],
      [[0, 0], [1, 0], [1, 1], [2, 1]],
    ],
  },
  // Z piece - red
  {
    id: 'Z',
    color: '#ff1744',
    rotations: [
      [[0, 0], [0, 1], [1, 1], [1, 2]],
      [[0, 1], [1, 0], [1, 1], [2, 0]],
      [[0, 0], [0, 1], [1, 1], [1, 2]],
      [[0, 1], [1, 0], [1, 1], [2, 0]],
    ],
  },
  // J piece - blue
  {
    id: 'J',
    color: '#2979ff',
    rotations: [
      [[0, 0], [1, 0], [1, 1], [1, 2]],
      [[0, 0], [0, 1], [1, 0], [2, 0]],
      [[0, 0], [0, 1], [0, 2], [1, 2]],
      [[0, 1], [1, 1], [2, 0], [2, 1]],
    ],
  },
  // L piece - orange
  {
    id: 'L',
    color: '#ff9100',
    rotations: [
      [[0, 2], [1, 0], [1, 1], [1, 2]],
      [[0, 0], [1, 0], [2, 0], [2, 1]],
      [[0, 0], [0, 1], [0, 2], [1, 0]],
      [[0, 0], [0, 1], [1, 1], [2, 1]],
    ],
  },
];

/** Wall kick offsets to try when rotation is blocked. [dx, dy] pairs. */
export const WALL_KICKS: readonly (readonly [number, number])[] = [
  [0, 0],
  [-1, 0],
  [1, 0],
  [-2, 0],
  [2, 0],
  [0, -1],
  [-1, -1],
  [1, -1],
  [0, 1],
  [-1, 1],
  [1, 1],
];

/** I-piece specific wall kicks */
export const I_WALL_KICKS: readonly (readonly [number, number])[] = [
  [0, 0],
  [-2, 0],
  [2, 0],
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, -2],
  [0, 1],
  [0, 2],
];
