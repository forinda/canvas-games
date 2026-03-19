export const BOARD_SIZE = 8;

export type PieceType = 'king' | 'queen' | 'rook' | 'bishop' | 'knight' | 'pawn';
export type PieceColor = 'white' | 'black';
export type GameMode = 'ai' | '2player';

export interface Piece {
  type: PieceType;
  color: PieceColor;
}

export type Cell = Piece | null;

export interface Position {
  row: number;
  col: number;
}

export interface Move {
  from: Position;
  to: Position;
  piece: Piece;
  captured: Piece | null;
  isEnPassant: boolean;
  isCastling: 'kingside' | 'queenside' | null;
  isPromotion: boolean;
  promotedTo: PieceType | null;
  notation: string;
}

export interface CastlingRights {
  whiteKingside: boolean;
  whiteQueenside: boolean;
  blackKingside: boolean;
  blackQueenside: boolean;
}

export interface ChessState {
  board: Cell[][];
  currentPlayer: PieceColor;
  mode: GameMode;
  selectedPosition: Position | null;
  legalMoves: Position[];
  lastMove: Move | null;
  moveHistory: Move[];
  capturedByWhite: Piece[];
  capturedByBlack: Piece[];
  castlingRights: CastlingRights;
  enPassantTarget: Position | null;
  isCheck: boolean;
  isCheckmate: boolean;
  isStalemate: boolean;
  gameOver: boolean;
  showModeSelect: boolean;
  canvasWidth: number;
  canvasHeight: number;
  aiThinking: boolean;
  halfMoveClock: number;
  fullMoveNumber: number;
  animationTime: number;
  kingPositions: { white: Position; black: Position };
  pendingPromotion: { row: number; col: number } | null;
}
