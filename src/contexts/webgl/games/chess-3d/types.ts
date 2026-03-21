export const BOARD_SIZE = 8;
export const CELL_SIZE = 1.2;
export const BOARD_Y = 0;

export type PieceType =
	| "king"
	| "queen"
	| "rook"
	| "bishop"
	| "knight"
	| "pawn";
export type PieceColor = "white" | "black";

export interface Piece {
	type: PieceType;
	color: PieceColor;
}

export type Cell = Piece | null;

export interface Position {
	row: number;
	col: number;
}

export interface Chess3DState {
	board: Cell[][];
	currentPlayer: PieceColor;
	selectedPos: Position | null;
	legalMoves: Position[];
	lastMove: { from: Position; to: Position } | null;
	isCheck: boolean;
	isCheckmate: boolean;
	isStalemate: boolean;
	gameOver: boolean;
	phase: "playing" | "gameover";
}

/** Piece heights for 3D rendering (relative units) */
export const PIECE_HEIGHTS: Record<PieceType, number> = {
	pawn: 0.5,
	rook: 0.6,
	knight: 0.65,
	bishop: 0.7,
	queen: 0.85,
	king: 0.9,
};

export function createInitialBoard(): Cell[][] {
	const board: Cell[][] = Array.from({ length: 8 }, () =>
		Array.from({ length: 8 }, () => null),
	);

	const backRow: PieceType[] = [
		"rook",
		"knight",
		"bishop",
		"queen",
		"king",
		"bishop",
		"knight",
		"rook",
	];

	for (let c = 0; c < 8; c++) {
		board[0][c] = { type: backRow[c], color: "black" };
		board[1][c] = { type: "pawn", color: "black" };
		board[6][c] = { type: "pawn", color: "white" };
		board[7][c] = { type: backRow[c], color: "white" };
	}

	return board;
}
