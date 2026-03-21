import type { PieceType, PieceColor, Cell } from "../types.ts";

export const PIECE_UNICODE: Record<PieceColor, Record<PieceType, string>> = {
	white: {
		king: "\u2654",
		queen: "\u2655",
		rook: "\u2656",
		bishop: "\u2657",
		knight: "\u2658",
		pawn: "\u2659",
	},
	black: {
		king: "\u265A",
		queen: "\u265B",
		rook: "\u265C",
		bishop: "\u265D",
		knight: "\u265E",
		pawn: "\u265F",
	},
};

export const PIECE_VALUES: Record<PieceType, number> = {
	pawn: 100,
	knight: 320,
	bishop: 330,
	rook: 500,
	queen: 900,
	king: 20000,
};

// Piece-square tables (from white's perspective; mirror for black)
export const PST_PAWN: number[][] = [
	[0, 0, 0, 0, 0, 0, 0, 0],
	[50, 50, 50, 50, 50, 50, 50, 50],
	[10, 10, 20, 30, 30, 20, 10, 10],
	[5, 5, 10, 25, 25, 10, 5, 5],
	[0, 0, 0, 20, 20, 0, 0, 0],
	[5, -5, -10, 0, 0, -10, -5, 5],
	[5, 10, 10, -20, -20, 10, 10, 5],
	[0, 0, 0, 0, 0, 0, 0, 0],
];

export const PST_KNIGHT: number[][] = [
	[-50, -40, -30, -30, -30, -30, -40, -50],
	[-40, -20, 0, 0, 0, 0, -20, -40],
	[-30, 0, 10, 15, 15, 10, 0, -30],
	[-30, 5, 15, 20, 20, 15, 5, -30],
	[-30, 0, 15, 20, 20, 15, 0, -30],
	[-30, 5, 10, 15, 15, 10, 5, -30],
	[-40, -20, 0, 5, 5, 0, -20, -40],
	[-50, -40, -30, -30, -30, -30, -40, -50],
];

export const PST_BISHOP: number[][] = [
	[-20, -10, -10, -10, -10, -10, -10, -20],
	[-10, 0, 0, 0, 0, 0, 0, -10],
	[-10, 0, 10, 10, 10, 10, 0, -10],
	[-10, 5, 5, 10, 10, 5, 5, -10],
	[-10, 0, 10, 10, 10, 10, 0, -10],
	[-10, 10, 10, 10, 10, 10, 10, -10],
	[-10, 5, 0, 0, 0, 0, 5, -10],
	[-20, -10, -10, -10, -10, -10, -10, -20],
];

export const PST_ROOK: number[][] = [
	[0, 0, 0, 0, 0, 0, 0, 0],
	[5, 10, 10, 10, 10, 10, 10, 5],
	[-5, 0, 0, 0, 0, 0, 0, -5],
	[-5, 0, 0, 0, 0, 0, 0, -5],
	[-5, 0, 0, 0, 0, 0, 0, -5],
	[-5, 0, 0, 0, 0, 0, 0, -5],
	[-5, 0, 0, 0, 0, 0, 0, -5],
	[0, 0, 0, 5, 5, 0, 0, 0],
];

export const PST_QUEEN: number[][] = [
	[-20, -10, -10, -5, -5, -10, -10, -20],
	[-10, 0, 0, 0, 0, 0, 0, -10],
	[-10, 0, 5, 5, 5, 5, 0, -10],
	[-5, 0, 5, 5, 5, 5, 0, -5],
	[0, 0, 5, 5, 5, 5, 0, -5],
	[-10, 5, 5, 5, 5, 5, 0, -10],
	[-10, 0, 5, 0, 0, 0, 0, -10],
	[-20, -10, -10, -5, -5, -10, -10, -20],
];

export const PST_KING: number[][] = [
	[-30, -40, -40, -50, -50, -40, -40, -30],
	[-30, -40, -40, -50, -50, -40, -40, -30],
	[-30, -40, -40, -50, -50, -40, -40, -30],
	[-30, -40, -40, -50, -50, -40, -40, -30],
	[-20, -30, -30, -40, -40, -30, -30, -20],
	[-10, -20, -20, -20, -20, -20, -20, -10],
	[20, 20, 0, 0, 0, 0, 20, 20],
	[20, 30, 10, 0, 0, 10, 30, 20],
];

export const PIECE_SQUARE_TABLES: Record<PieceType, number[][]> = {
	pawn: PST_PAWN,
	knight: PST_KNIGHT,
	bishop: PST_BISHOP,
	rook: PST_ROOK,
	queen: PST_QUEEN,
	king: PST_KING,
};

export function createInitialBoard(): Cell[][] {
	const board: Cell[][] = Array.from({ length: 8 }, () =>
		Array.from({ length: 8 }, () => null),
	);

	const backRank: PieceType[] = [
		"rook",
		"knight",
		"bishop",
		"queen",
		"king",
		"bishop",
		"knight",
		"rook",
	];

	for (let col = 0; col < 8; col++) {
		board[0][col] = { type: backRank[col], color: "black" };
		board[1][col] = { type: "pawn", color: "black" };
		board[6][col] = { type: "pawn", color: "white" };
		board[7][col] = { type: backRank[col], color: "white" };
	}

	return board;
}
