export interface Cell {
  revealed: boolean;
  flagged: boolean;
  mine: boolean;
  adjacentMines: number;
}

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface DifficultyPreset {
  cols: number;
  rows: number;
  mines: number;
}

export const DIFFICULTY_PRESETS: Record<Difficulty, DifficultyPreset> = {
  easy: { cols: 9, rows: 9, mines: 10 },
  medium: { cols: 16, rows: 16, mines: 40 },
  hard: { cols: 30, rows: 16, mines: 99 },
};

export type GameStatus = 'idle' | 'playing' | 'won' | 'lost';

export interface MinesweeperState {
  board: Cell[][];
  cols: number;
  rows: number;
  difficulty: Difficulty;
  totalMines: number;
  flagCount: number;
  status: GameStatus;
  /** Timer in seconds */
  timer: number;
  /** Whether the first click has happened (mines placed after first click) */
  firstClick: boolean;
  /** Offset for centering the board on canvas */
  offsetX: number;
  offsetY: number;
  cellSize: number;
}

export const GAME_COLOR = '#95a5a6';

/** Colors for number display by adjacent mine count (1-8) */
export const NUMBER_COLORS: Record<number, string> = {
  1: '#2563eb',
  2: '#16a34a',
  3: '#dc2626',
  4: '#7c3aed',
  5: '#b91c1c',
  6: '#0891b2',
  7: '#1e1e1e',
  8: '#6b7280',
};
