/** Pipe piece types */
export type PipeType = 'straight' | 'elbow' | 'tee' | 'cross';

/** Valid rotation angles */
export type Rotation = 0 | 90 | 180 | 270;

/** A single pipe cell on the grid */
export interface Pipe {
  type: PipeType;
  rotation: Rotation;
  /** Whether this pipe is currently connected to the source */
  connected: boolean;
  /** Water fill animation progress 0..1 */
  waterFill: number;
  /** true if this cell is the source */
  isSource: boolean;
  /** true if this cell is the drain */
  isDrain: boolean;
}

export type GameStatus = 'playing' | 'won';

export interface PipeState {
  grid: Pipe[][];
  cols: number;
  rows: number;
  level: number;
  moves: number;
  timer: number;
  status: GameStatus;
  /** Canvas layout */
  offsetX: number;
  offsetY: number;
  cellSize: number;
  /** Source and drain positions */
  sourceRow: number;
  sourceCol: number;
  drainRow: number;
  drainCol: number;
}

export const GAME_COLOR = '#26a69a';

/** Rotations available */
export const ROTATIONS: Rotation[] = [0, 90, 180, 270];

/**
 * Openings for each pipe type at rotation 0.
 * Directions: 0=up, 1=right, 2=down, 3=left
 */
export const PIPE_OPENINGS: Record<PipeType, number[]> = {
  straight: [0, 2],       // up and down
  elbow: [0, 1],          // up and right
  tee: [0, 1, 2],         // up, right, down
  cross: [0, 1, 2, 3],    // all four
};

/**
 * Get actual openings for a pipe considering its rotation.
 * Each 90deg rotation shifts directions clockwise by 1.
 */
export function getOpenings(pipe: Pipe): number[] {
  const base = PIPE_OPENINGS[pipe.type];
  const shift = pipe.rotation / 90;
  return base.map((d) => (d + shift) % 4);
}

/** Direction offsets: 0=up(-1,0), 1=right(0,+1), 2=down(+1,0), 3=left(0,-1) */
export const DIR_OFFSETS: [number, number][] = [
  [-1, 0], // up
  [0, 1],  // right
  [1, 0],  // down
  [0, -1], // left
];

/** Opposite direction */
export function oppositeDir(d: number): number {
  return (d + 2) % 4;
}

/** Grid size per level */
export function gridSizeForLevel(level: number): number {
  return Math.min(5 + level * 2, 11);
}
