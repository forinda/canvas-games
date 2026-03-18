export type Cell = 'X' | 'O' | null;
export type GameMode = 'ai' | '2player';
export type Player = 'X' | 'O';

export interface WinLine {
  cells: [number, number, number];
  progress: number; // 0..1 animation
}

export interface CellAnimation {
  cellIndex: number;
  progress: number; // 0..1 draw animation
}

export interface TicTacToeState {
  board: Cell[];
  currentPlayer: Player;
  mode: GameMode;
  winner: Player | null;
  winLine: WinLine | null;
  isDraw: boolean;
  gameOver: boolean;
  paused: boolean;
  scoreX: number;
  scoreO: number;
  draws: number;
  canvasWidth: number;
  canvasHeight: number;
  cellAnimations: CellAnimation[];
  aiThinking: boolean;
  showModeSelect: boolean;
  lastClickCell: number | null;
  animationTime: number;
}

// Board constants
export const GRID_SIZE = 3;
export const TOTAL_CELLS = GRID_SIZE * GRID_SIZE;

// Win conditions: indices of three-in-a-row
export const WIN_LINES: [number, number, number][] = [
  // Rows
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  // Columns
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  // Diagonals
  [0, 4, 8],
  [2, 4, 6],
];

export const SCORE_KEY = 'tictactoe_scores';
