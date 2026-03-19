export const BOARD_SIZE = 8;

export type PieceColor = 'red' | 'black';

export type GameMode = 'ai' | 'two-player';

export interface Piece {
  color: PieceColor;
  isKing: boolean;
}

export interface Cell {
  row: number;
  col: number;
}

export interface Move {
  from: Cell;
  to: Cell;
  captures: Cell[];
}

export interface HistoryEntry {
  board: (Piece | null)[][];
  currentTurn: PieceColor;
  capturedRed: number;
  capturedBlack: number;
  mustContinueJump: Cell | null;
  lastMove: Move | null;
}

export interface CheckersState {
  board: (Piece | null)[][];
  currentTurn: PieceColor;
  selectedCell: Cell | null;
  legalMoves: Move[];
  legalMovesForSelected: Move[];
  lastMove: Move | null;
  capturedRed: number;
  capturedBlack: number;
  gameOver: boolean;
  winner: PieceColor | 'draw' | null;
  paused: boolean;
  started: boolean;
  mode: GameMode;
  aiThinking: boolean;
  mustContinueJump: Cell | null;
  showModeSelector: boolean;
  animatingMove: { move: Move; progress: number } | null;
  moveHistory: HistoryEntry[];
  legalMovesDirty: boolean;
}

export function createInitialBoard(): (Piece | null)[][] {
  const board: (Piece | null)[][] = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    board[r] = [];
    for (let c = 0; c < BOARD_SIZE; c++) {
      const isDark = (r + c) % 2 === 1;
      if (isDark && r < 3) {
        board[r][c] = { color: 'black', isKing: false };
      } else if (isDark && r > 4) {
        board[r][c] = { color: 'red', isKing: false };
      } else {
        board[r][c] = null;
      }
    }
  }
  return board;
}

export function createInitialState(): CheckersState {
  return {
    board: createInitialBoard(),
    currentTurn: 'red',
    selectedCell: null,
    legalMoves: [],
    legalMovesForSelected: [],
    lastMove: null,
    capturedRed: 0,
    capturedBlack: 0,
    gameOver: false,
    winner: null,
    paused: false,
    started: false,
    mode: 'ai',
    aiThinking: false,
    mustContinueJump: null,
    showModeSelector: true,
    animatingMove: null,
    moveHistory: [],
    legalMovesDirty: true,
  };
}

export function cellsEqual(a: Cell, b: Cell): boolean {
  return a.row === b.row && a.col === b.col;
}

export function cloneBoard(board: (Piece | null)[][]): (Piece | null)[][] {
  return board.map(row =>
    row.map(cell => (cell ? { color: cell.color, isKing: cell.isKing } : null))
  );
}
