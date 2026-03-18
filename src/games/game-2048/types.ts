export const GRID_SIZE = 4;
export const HS_KEY = '2048_high_score';

export interface Tile {
  value: number;
  row: number;
  col: number;
  /** Previous position for slide animation */
  prevRow: number;
  prevCol: number;
  /** If this tile was created by merging two tiles */
  mergedFrom: [Tile, Tile] | null;
  /** Whether this tile is newly spawned */
  isNew: boolean;
}

export type Direction = 'up' | 'down' | 'left' | 'right';

export interface Game2048State {
  grid: (Tile | null)[][];
  score: number;
  highScore: number;
  bestTile: number;
  gameOver: boolean;
  won: boolean;
  keepPlaying: boolean;
  /** Pending direction from input (consumed by BoardSystem) */
  pendingDirection: Direction | null;
  /** Animation progress 0..1 */
  animProgress: number;
  /** Whether an animation is playing */
  animating: boolean;
  /** Duration of slide animation in ms */
  animDuration: number;
  /** Whether game has started (first tile placed) */
  started: boolean;
  /** Request to restart */
  restartRequested: boolean;
  /** Request to continue after winning */
  continueRequested: boolean;
}

export function createEmptyGrid(): (Tile | null)[][] {
  return Array.from({ length: GRID_SIZE }, () =>
    Array.from({ length: GRID_SIZE }, () => null),
  );
}

export function createInitialState(highScore: number): Game2048State {
  return {
    grid: createEmptyGrid(),
    score: 0,
    highScore,
    bestTile: 0,
    gameOver: false,
    won: false,
    keepPlaying: false,
    pendingDirection: null,
    animProgress: 1,
    animating: false,
    animDuration: 100,
    started: true,
    restartRequested: false,
    continueRequested: false,
  };
}
