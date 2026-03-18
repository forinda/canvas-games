/** Walls present on each side of a cell */
export interface CellWalls {
  top: boolean;
  right: boolean;
  bottom: boolean;
  left: boolean;
}

/** A single maze cell */
export interface Cell {
  walls: CellWalls;
  visited: boolean;
}

/** Player position on the grid */
export interface GridPos {
  x: number;
  y: number;
}

/** Full mutable game state */
export interface MazeState {
  /** 2D grid of cells: grid[y][x] */
  grid: Cell[][];
  mazeW: number;
  mazeH: number;
  player: GridPos;
  exit: GridPos;
  /** Cells within this radius of the player are visible */
  revealRadius: number;
  /** Set of "x,y" keys the player has ever been near (persistent fog reveal) */
  revealed: Set<string>;
  level: number;
  timeLeft: number;
  won: boolean;
  lost: boolean;
  paused: boolean;
  started: boolean;
  /** Accumulated levels completed */
  totalScore: number;
}

/** Starting maze dimensions (grows each level) */
export const BASE_MAZE_W = 10;
export const BASE_MAZE_H = 10;
/** Maze grows by this amount each level */
export const MAZE_GROW = 2;
/** Default reveal radius in cells */
export const REVEAL_RADIUS = 3;
/** Base time in seconds for level 1 */
export const BASE_TIME = 60;
/** Extra time per additional cell beyond the base size */
export const TIME_PER_EXTRA_CELL = 0.5;
/** Bonus seconds added when completing a level */
export const COMPLETION_BONUS = 15;
/** LocalStorage key for high score */
export const HS_KEY = 'maze_runner_highscore';
