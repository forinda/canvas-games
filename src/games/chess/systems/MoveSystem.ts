import type { Updatable } from '@shared/Updatable.ts';
import type {
  ChessState,
  Position,
  Move,
  Piece,
  PieceType,
  PieceColor,
  Cell,
} from '../types.ts';
import { BOARD_SIZE } from '../types.ts';

function inBounds(row: number, col: number): boolean {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}

function posEq(a: Position, b: Position): boolean {
  return a.row === b.row && a.col === b.col;
}

function cloneBoard(board: Cell[][]): Cell[][] {
  return board.map((row) => row.map((cell) => (cell ? { ...cell } : null)));
}

function colToFile(col: number): string {
  return String.fromCharCode(97 + col);
}

function rowToRank(row: number): string {
  return String(BOARD_SIZE - row);
}

const PIECE_NOTATION: Record<string, string> = {
  king: 'K',
  queen: 'Q',
  rook: 'R',
  bishop: 'B',
  knight: 'N',
  pawn: '',
};

export class MoveSystem implements Updatable<ChessState> {
  update(_state: ChessState, _dt: number): void {
    // Move generation is on-demand, not per-frame
  }

  /** Get all pseudo-legal moves for a piece (ignoring check) */
  getPseudoLegalMoves(
    board: Cell[][],
    pos: Position,
    castlingRights: ChessState['castlingRights'],
    enPassantTarget: Position | null,
  ): Position[] {
    const piece = board[pos.row][pos.col];
    if (!piece) return [];

    switch (piece.type) {
      case 'pawn':
        return this.getPawnMoves(board, pos, piece, enPassantTarget);
      case 'knight':
        return this.getKnightMoves(board, pos, piece);
      case 'bishop':
        return this.getSlidingMoves(board, pos, piece, [
          [-1, -1], [-1, 1], [1, -1], [1, 1],
        ]);
      case 'rook':
        return this.getSlidingMoves(board, pos, piece, [
          [-1, 0], [1, 0], [0, -1], [0, 1],
        ]);
      case 'queen':
        return this.getSlidingMoves(board, pos, piece, [
          [-1, -1], [-1, 1], [1, -1], [1, 1],
          [-1, 0], [1, 0], [0, -1], [0, 1],
        ]);
      case 'king':
        return this.getKingMoves(board, pos, piece, castlingRights);
      default:
        return [];
    }
  }

  /** Get all legal moves for a piece (filtering out moves that leave king in check) */
  getLegalMoves(state: ChessState, pos: Position): Position[] {
    const piece = state.board[pos.row][pos.col];
    if (!piece) return [];

    const pseudoMoves = this.getPseudoLegalMoves(
      state.board,
      pos,
      state.castlingRights,
      state.enPassantTarget,
    );

    return pseudoMoves.filter((to) => {
      return !this.wouldBeInCheck(state, pos, to, piece.color);
    });
  }

  /** Check if making a move would leave the player's king in check */
  wouldBeInCheck(
    state: ChessState,
    from: Position,
    to: Position,
    color: PieceColor,
  ): boolean {
    const testBoard = cloneBoard(state.board);
    const piece = testBoard[from.row][from.col]!;

    // Handle en passant capture
    if (
      piece.type === 'pawn' &&
      state.enPassantTarget &&
      posEq(to, state.enPassantTarget)
    ) {
      const capturedRow = color === 'white' ? to.row + 1 : to.row - 1;
      testBoard[capturedRow][to.col] = null;
    }

    // Handle castling - move the rook too
    if (piece.type === 'king' && Math.abs(to.col - from.col) === 2) {
      if (to.col > from.col) {
        // Kingside
        testBoard[from.row][5] = testBoard[from.row][7];
        testBoard[from.row][7] = null;
      } else {
        // Queenside
        testBoard[from.row][3] = testBoard[from.row][0];
        testBoard[from.row][0] = null;
      }
    }

    testBoard[to.row][to.col] = piece;
    testBoard[from.row][from.col] = null;

    // Find king position
    let kingPos: Position = { row: -1, col: -1 };
    if (piece.type === 'king') {
      kingPos = to;
    } else {
      for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
          const p = testBoard[r][c];
          if (p && p.type === 'king' && p.color === color) {
            kingPos = { row: r, col: c };
          }
        }
      }
    }

    return this.isSquareAttacked(testBoard, kingPos, color === 'white' ? 'black' : 'white');
  }

  /** Check if a square is attacked by the given color */
  isSquareAttacked(
    board: Cell[][],
    pos: Position,
    byColor: PieceColor,
  ): boolean {
    // Check knight attacks
    const knightOffsets = [
      [-2, -1], [-2, 1], [-1, -2], [-1, 2],
      [1, -2], [1, 2], [2, -1], [2, 1],
    ];
    for (const [dr, dc] of knightOffsets) {
      const r = pos.row + dr;
      const c = pos.col + dc;
      if (inBounds(r, c)) {
        const p = board[r][c];
        if (p && p.color === byColor && p.type === 'knight') return true;
      }
    }

    // Check sliding attacks (rook/queen for straight, bishop/queen for diagonal)
    const straightDirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    const diagDirs = [[-1, -1], [-1, 1], [1, -1], [1, 1]];

    for (const [dr, dc] of straightDirs) {
      let r = pos.row + dr;
      let c = pos.col + dc;
      while (inBounds(r, c)) {
        const p = board[r][c];
        if (p) {
          if (p.color === byColor && (p.type === 'rook' || p.type === 'queen')) return true;
          break;
        }
        r += dr;
        c += dc;
      }
    }

    for (const [dr, dc] of diagDirs) {
      let r = pos.row + dr;
      let c = pos.col + dc;
      while (inBounds(r, c)) {
        const p = board[r][c];
        if (p) {
          if (p.color === byColor && (p.type === 'bishop' || p.type === 'queen')) return true;
          break;
        }
        r += dr;
        c += dc;
      }
    }

    // Check pawn attacks
    const pawnDir = byColor === 'white' ? 1 : -1;
    for (const dc of [-1, 1]) {
      const r = pos.row + pawnDir;
      const c = pos.col + dc;
      if (inBounds(r, c)) {
        const p = board[r][c];
        if (p && p.color === byColor && p.type === 'pawn') return true;
      }
    }

    // Check king attacks
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const r = pos.row + dr;
        const c = pos.col + dc;
        if (inBounds(r, c)) {
          const p = board[r][c];
          if (p && p.color === byColor && p.type === 'king') return true;
        }
      }
    }

    return false;
  }

  /** Check if the given color is in check */
  isInCheck(board: Cell[][], color: PieceColor): boolean {
    let kingPos: Position | null = null;
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const p = board[r][c];
        if (p && p.type === 'king' && p.color === color) {
          kingPos = { row: r, col: c };
          break;
        }
      }
      if (kingPos) break;
    }
    if (!kingPos) return false;
    return this.isSquareAttacked(board, kingPos, color === 'white' ? 'black' : 'white');
  }

  /** Check if a player has any legal moves */
  hasLegalMoves(state: ChessState, color: PieceColor): boolean {
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const piece = state.board[r][c];
        if (piece && piece.color === color) {
          const moves = this.getLegalMoves(state, { row: r, col: c });
          if (moves.length > 0) return true;
        }
      }
    }
    return false;
  }

  /** Execute a move on the state, returns the Move object.
   *  If promotionChoice is provided, it overrides the promotion UI flow. */
  executeMove(
    state: ChessState,
    from: Position,
    to: Position,
    promotionChoice?: PieceType,
  ): Move {
    const piece = state.board[from.row][from.col]!;
    const captured = state.board[to.row][to.col];
    let isEnPassant = false;
    let isCastling: Move['isCastling'] = null;
    let isPromotion = false;
    let promotedTo: Move['promotedTo'] = null;

    // En passant detection
    if (
      piece.type === 'pawn' &&
      state.enPassantTarget &&
      posEq(to, state.enPassantTarget)
    ) {
      isEnPassant = true;
      const capturedRow = piece.color === 'white' ? to.row + 1 : to.row - 1;
      const epCaptured = state.board[capturedRow][to.col]!;
      state.board[capturedRow][to.col] = null;

      // Add captured piece
      if (piece.color === 'white') {
        state.capturedByWhite.push(epCaptured);
      } else {
        state.capturedByBlack.push(epCaptured);
      }
    }

    // Castling detection
    if (piece.type === 'king' && Math.abs(to.col - from.col) === 2) {
      if (to.col > from.col) {
        isCastling = 'kingside';
        state.board[from.row][5] = state.board[from.row][7];
        state.board[from.row][7] = null;
      } else {
        isCastling = 'queenside';
        state.board[from.row][3] = state.board[from.row][0];
        state.board[from.row][0] = null;
      }
    }

    // Pawn promotion
    const promotionRow = piece.color === 'white' ? 0 : 7;
    if (piece.type === 'pawn' && to.row === promotionRow) {
      isPromotion = true;
      // If no explicit choice provided, request one via pendingPromotion
      if (promotionChoice) {
        promotedTo = promotionChoice;
      } else {
        // Set pending promotion and place the pawn on the destination
        // so the board shows it; completePromotion will finalize it.
        state.board[to.row][to.col] = piece;
        state.board[from.row][from.col] = null;
        state.pendingPromotion = { row: to.row, col: to.col };

        // Still update en passant / captures before returning
        if (captured && !isEnPassant) {
          if (piece.color === 'white') {
            state.capturedByWhite.push(captured);
          } else {
            state.capturedByBlack.push(captured);
          }
        }
        state.enPassantTarget = null;
        this.updateCastlingRights(state, from, to);

        // Return a partial move; promotion will be completed later
        return {
          from,
          to,
          piece,
          captured: captured || (isEnPassant ? { type: 'pawn', color: piece.color === 'white' ? 'black' : 'white' } : null),
          isEnPassant,
          isCastling,
          isPromotion: true,
          promotedTo: null,
          notation: '',
        };
      }
    }

    // Handle normal capture
    if (captured && !isEnPassant) {
      if (piece.color === 'white') {
        state.capturedByWhite.push(captured);
      } else {
        state.capturedByBlack.push(captured);
      }
    }

    // Move the piece
    if (isPromotion && promotedTo) {
      state.board[to.row][to.col] = { type: promotedTo, color: piece.color };
    } else {
      state.board[to.row][to.col] = piece;
    }
    state.board[from.row][from.col] = null;

    // Update en passant target
    if (piece.type === 'pawn' && Math.abs(to.row - from.row) === 2) {
      state.enPassantTarget = {
        row: (from.row + to.row) / 2,
        col: from.col,
      };
    } else {
      state.enPassantTarget = null;
    }

    // Update castling rights
    this.updateCastlingRights(state, from, to);

    // Update king position
    if (piece.type === 'king') {
      state.kingPositions[piece.color] = { ...to };
    }

    // Build notation
    const notation = this.buildNotation(
      piece,
      from,
      to,
      captured !== null || isEnPassant,
      isCastling,
      isPromotion,
      promotedTo,
      state,
    );

    const move: Move = {
      from,
      to,
      piece,
      captured: captured || (isEnPassant ? { type: 'pawn', color: piece.color === 'white' ? 'black' : 'white' } : null),
      isEnPassant,
      isCastling,
      isPromotion,
      promotedTo,
      notation,
    };

    return move;
  }

  /** Complete a pending pawn promotion */
  completePromotion(state: ChessState, choice: PieceType): Move | null {
    const promo = state.pendingPromotion;
    if (!promo) return null;

    const piece = state.board[promo.row][promo.col];
    if (!piece) return null;

    // Replace the pawn with the chosen piece
    state.board[promo.row][promo.col] = { type: choice, color: piece.color };
    state.pendingPromotion = null;

    // Update the last move in history with the promotion choice
    const lastMove = state.moveHistory[state.moveHistory.length - 1];
    if (lastMove) {
      lastMove.promotedTo = choice;
      lastMove.notation = this.buildNotation(
        lastMove.piece,
        lastMove.from,
        lastMove.to,
        lastMove.captured !== null,
        lastMove.isCastling,
        true,
        choice,
        state,
      );
      return lastMove;
    }

    return null;
  }

  private updateCastlingRights(state: ChessState, from: Position, to: Position): void {
    // Map each corner square to the castling right it invalidates.
    // A piece leaving from OR arriving at (capturing) a corner square
    // revokes the associated castling right. King moves revoke both sides.
    const rights = state.castlingRights;
    const squares: Array<{ row: number; col: number; key: keyof typeof rights }> = [
      { row: 7, col: 0, key: 'whiteQueenside' },
      { row: 7, col: 7, key: 'whiteKingside' },
      { row: 0, col: 0, key: 'blackQueenside' },
      { row: 0, col: 7, key: 'blackKingside' },
    ];

    for (const sq of squares) {
      if (
        (from.row === sq.row && from.col === sq.col) ||
        (to.row === sq.row && to.col === sq.col)
      ) {
        rights[sq.key] = false;
      }
    }

    // King move revokes both sides
    if (from.row === 7 && from.col === 4) {
      rights.whiteKingside = false;
      rights.whiteQueenside = false;
    }
    if (from.row === 0 && from.col === 4) {
      rights.blackKingside = false;
      rights.blackQueenside = false;
    }
  }

  private buildNotation(
    piece: Piece,
    from: Position,
    to: Position,
    isCapture: boolean,
    isCastling: Move['isCastling'],
    isPromotion: boolean,
    promotedTo: Move['promotedTo'],
    state: ChessState,
  ): string {
    if (isCastling === 'kingside') return 'O-O';
    if (isCastling === 'queenside') return 'O-O-O';

    let notation = '';
    const pieceLetter = PIECE_NOTATION[piece.type];

    if (piece.type === 'pawn') {
      if (isCapture) {
        notation = colToFile(from.col) + 'x';
      }
    } else {
      notation = pieceLetter;
      // Disambiguation - simplified
      if (isCapture) {
        notation += 'x';
      }
    }

    notation += colToFile(to.col) + rowToRank(to.row);

    if (isPromotion && promotedTo) {
      notation += '=' + PIECE_NOTATION[promotedTo];
    }

    // Check / checkmate indicators
    const opponent: PieceColor = piece.color === 'white' ? 'black' : 'white';
    if (this.isInCheck(state.board, opponent)) {
      if (!this.hasLegalMoves(state, opponent)) {
        notation += '#';
      } else {
        notation += '+';
      }
    }

    return notation;
  }

  /** Get all legal moves for a color, returns array of [from, to] */
  getAllLegalMoves(state: ChessState, color: PieceColor): Array<{ from: Position; to: Position }> {
    const moves: Array<{ from: Position; to: Position }> = [];
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const piece = state.board[r][c];
        if (piece && piece.color === color) {
          const from = { row: r, col: c };
          const legalMoves = this.getLegalMoves(state, from);
          for (const to of legalMoves) {
            moves.push({ from, to });
          }
        }
      }
    }
    return moves;
  }

  private getPawnMoves(
    board: Cell[][],
    pos: Position,
    piece: Piece,
    enPassantTarget: Position | null,
  ): Position[] {
    const moves: Position[] = [];
    const dir = piece.color === 'white' ? -1 : 1;
    const startRow = piece.color === 'white' ? 6 : 1;

    // Forward one
    const fwd = pos.row + dir;
    if (inBounds(fwd, pos.col) && !board[fwd][pos.col]) {
      moves.push({ row: fwd, col: pos.col });
      // Forward two from start
      const fwd2 = pos.row + dir * 2;
      if (pos.row === startRow && !board[fwd2][pos.col]) {
        moves.push({ row: fwd2, col: pos.col });
      }
    }

    // Diagonal captures
    for (const dc of [-1, 1]) {
      const nr = pos.row + dir;
      const nc = pos.col + dc;
      if (inBounds(nr, nc)) {
        const target = board[nr][nc];
        if (target && target.color !== piece.color) {
          moves.push({ row: nr, col: nc });
        }
        // En passant
        if (enPassantTarget && enPassantTarget.row === nr && enPassantTarget.col === nc) {
          moves.push({ row: nr, col: nc });
        }
      }
    }

    return moves;
  }

  private getKnightMoves(
    board: Cell[][],
    pos: Position,
    piece: Piece,
  ): Position[] {
    const moves: Position[] = [];
    const offsets = [
      [-2, -1], [-2, 1], [-1, -2], [-1, 2],
      [1, -2], [1, 2], [2, -1], [2, 1],
    ];
    for (const [dr, dc] of offsets) {
      const r = pos.row + dr;
      const c = pos.col + dc;
      if (inBounds(r, c)) {
        const target = board[r][c];
        if (!target || target.color !== piece.color) {
          moves.push({ row: r, col: c });
        }
      }
    }
    return moves;
  }

  private getSlidingMoves(
    board: Cell[][],
    pos: Position,
    piece: Piece,
    directions: number[][],
  ): Position[] {
    const moves: Position[] = [];
    for (const [dr, dc] of directions) {
      let r = pos.row + dr;
      let c = pos.col + dc;
      while (inBounds(r, c)) {
        const target = board[r][c];
        if (!target) {
          moves.push({ row: r, col: c });
        } else {
          if (target.color !== piece.color) {
            moves.push({ row: r, col: c });
          }
          break;
        }
        r += dr;
        c += dc;
      }
    }
    return moves;
  }

  private getKingMoves(
    board: Cell[][],
    pos: Position,
    piece: Piece,
    castlingRights: ChessState['castlingRights'],
  ): Position[] {
    const moves: Position[] = [];

    // Normal king moves
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const r = pos.row + dr;
        const c = pos.col + dc;
        if (inBounds(r, c)) {
          const target = board[r][c];
          if (!target || target.color !== piece.color) {
            moves.push({ row: r, col: c });
          }
        }
      }
    }

    // Castling
    const opponent: PieceColor = piece.color === 'white' ? 'black' : 'white';
    const row = piece.color === 'white' ? 7 : 0;

    if (pos.row === row && pos.col === 4) {
      // Kingside: king traverses cols 4, 5, 6 — all must be safe
      const canKingside = piece.color === 'white'
        ? castlingRights.whiteKingside
        : castlingRights.blackKingside;
      if (
        canKingside &&
        !board[row][5] &&
        !board[row][6] &&
        board[row][7]?.type === 'rook' &&
        board[row][7]?.color === piece.color &&
        !this.isSquareAttacked(board, { row, col: 4 }, opponent) &&
        !this.isSquareAttacked(board, { row, col: 5 }, opponent) &&
        !this.isSquareAttacked(board, { row, col: 6 }, opponent)
      ) {
        moves.push({ row, col: 6 });
      }

      // Queenside: king traverses cols 4, 3, 2 — all must be safe
      const canQueenside = piece.color === 'white'
        ? castlingRights.whiteQueenside
        : castlingRights.blackQueenside;
      if (
        canQueenside &&
        !board[row][3] &&
        !board[row][2] &&
        !board[row][1] &&
        board[row][0]?.type === 'rook' &&
        board[row][0]?.color === piece.color &&
        !this.isSquareAttacked(board, { row, col: 4 }, opponent) &&
        !this.isSquareAttacked(board, { row, col: 3 }, opponent) &&
        !this.isSquareAttacked(board, { row, col: 2 }, opponent)
      ) {
        moves.push({ row, col: 2 });
      }
    }

    return moves;
  }
}
