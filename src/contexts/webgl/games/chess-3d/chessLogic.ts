/**
 * Minimal chess logic for move generation and validation.
 * Simplified from the 2D chess game — no castling/en passant/promotion
 * to keep the 3D demo focused on rendering.
 */
import {
	BOARD_SIZE,
	type Cell,
	type Piece,
	type PieceColor,
	type Position,
} from "./types";

export function getLegalMoves(
	board: Cell[][],
	pos: Position,
	currentPlayer: PieceColor,
): Position[] {
	const piece = board[pos.row][pos.col];

	if (!piece || piece.color !== currentPlayer) return [];

	const pseudo = getPseudoMoves(board, pos, piece);

	// Filter out moves that leave own king in check
	return pseudo.filter((to) => {
		const testBoard = cloneBoard(board);

		testBoard[to.row][to.col] = testBoard[pos.row][pos.col];
		testBoard[pos.row][pos.col] = null;

		return !isKingInCheck(testBoard, currentPlayer);
	});
}

function getPseudoMoves(
	board: Cell[][],
	pos: Position,
	piece: Piece,
): Position[] {
	const moves: Position[] = [];
	const { row, col } = pos;

	switch (piece.type) {
		case "pawn": {
			const dir = piece.color === "white" ? -1 : 1;
			const startRow = piece.color === "white" ? 6 : 1;

			// Forward
			if (inBounds(row + dir, col) && !board[row + dir][col]) {
				moves.push({ row: row + dir, col });

				// Double move from start
				if (row === startRow && !board[row + dir * 2][col]) {
					moves.push({ row: row + dir * 2, col });
				}
			}

			// Captures
			for (const dc of [-1, 1]) {
				if (inBounds(row + dir, col + dc)) {
					const target = board[row + dir][col + dc];

					if (target && target.color !== piece.color) {
						moves.push({ row: row + dir, col: col + dc });
					}
				}
			}

			break;
		}

		case "knight":
			for (const [dr, dc] of [
				[-2, -1],
				[-2, 1],
				[-1, -2],
				[-1, 2],
				[1, -2],
				[1, 2],
				[2, -1],
				[2, 1],
			]) {
				addIfValid(board, moves, row + dr, col + dc, piece.color);
			}

			break;

		case "bishop":
			addSlidingMoves(board, moves, row, col, piece.color, [
				[-1, -1],
				[-1, 1],
				[1, -1],
				[1, 1],
			]);
			break;

		case "rook":
			addSlidingMoves(board, moves, row, col, piece.color, [
				[-1, 0],
				[1, 0],
				[0, -1],
				[0, 1],
			]);
			break;

		case "queen":
			addSlidingMoves(board, moves, row, col, piece.color, [
				[-1, -1],
				[-1, 0],
				[-1, 1],
				[0, -1],
				[0, 1],
				[1, -1],
				[1, 0],
				[1, 1],
			]);
			break;

		case "king":
			for (const [dr, dc] of [
				[-1, -1],
				[-1, 0],
				[-1, 1],
				[0, -1],
				[0, 1],
				[1, -1],
				[1, 0],
				[1, 1],
			]) {
				addIfValid(board, moves, row + dr, col + dc, piece.color);
			}

			break;
	}

	return moves;
}

function addSlidingMoves(
	board: Cell[][],
	moves: Position[],
	row: number,
	col: number,
	color: PieceColor,
	directions: [number, number][],
): void {
	for (const [dr, dc] of directions) {
		let r = row + dr;
		let c = col + dc;

		while (inBounds(r, c)) {
			const target = board[r][c];

			if (!target) {
				moves.push({ row: r, col: c });
			} else {
				if (target.color !== color) {
					moves.push({ row: r, col: c });
				}

				break;
			}

			r += dr;
			c += dc;
		}
	}
}

function addIfValid(
	board: Cell[][],
	moves: Position[],
	row: number,
	col: number,
	color: PieceColor,
): void {
	if (!inBounds(row, col)) return;

	const target = board[row][col];

	if (!target || target.color !== color) {
		moves.push({ row, col });
	}
}

function inBounds(row: number, col: number): boolean {
	return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}

export function isKingInCheck(board: Cell[][], color: PieceColor): boolean {
	// Find king
	let kingRow = -1;
	let kingCol = -1;

	for (let r = 0; r < BOARD_SIZE; r++) {
		for (let c = 0; c < BOARD_SIZE; c++) {
			const p = board[r][c];

			if (p && p.type === "king" && p.color === color) {
				kingRow = r;
				kingCol = c;
			}
		}
	}

	if (kingRow === -1) return false;

	// Check if any opponent piece attacks the king
	const opp = color === "white" ? "black" : "white";

	for (let r = 0; r < BOARD_SIZE; r++) {
		for (let c = 0; c < BOARD_SIZE; c++) {
			const p = board[r][c];

			if (!p || p.color !== opp) continue;

			const moves = getPseudoMoves(board, { row: r, col: c }, p);

			if (moves.some((m) => m.row === kingRow && m.col === kingCol)) {
				return true;
			}
		}
	}

	return false;
}

export function hasAnyLegalMove(board: Cell[][], color: PieceColor): boolean {
	for (let r = 0; r < BOARD_SIZE; r++) {
		for (let c = 0; c < BOARD_SIZE; c++) {
			const p = board[r][c];

			if (!p || p.color !== color) continue;

			if (getLegalMoves(board, { row: r, col: c }, color).length > 0) {
				return true;
			}
		}
	}

	return false;
}

export function cloneBoard(board: Cell[][]): Cell[][] {
	return board.map((row) => row.map((cell) => (cell ? { ...cell } : null)));
}

/** Simple AI: pick a random legal move */
export function getAIMove(
	board: Cell[][],
	color: PieceColor,
): { from: Position; to: Position } | null {
	const moves: { from: Position; to: Position }[] = [];

	for (let r = 0; r < BOARD_SIZE; r++) {
		for (let c = 0; c < BOARD_SIZE; c++) {
			const p = board[r][c];

			if (!p || p.color !== color) continue;

			const legal = getLegalMoves(board, { row: r, col: c }, color);

			for (const to of legal) {
				moves.push({ from: { row: r, col: c }, to });
			}
		}
	}

	if (moves.length === 0) return null;

	// Prefer captures, then random
	const captures = moves.filter((m) => board[m.to.row][m.to.col] !== null);

	if (captures.length > 0) {
		return captures[Math.floor(Math.random() * captures.length)];
	}

	return moves[Math.floor(Math.random() * moves.length)];
}
