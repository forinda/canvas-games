export const COLS = 10;
export const ROWS = 20;
export const HS_KEY = "tetris_highscore";

export type CellColor = string | null;

/** A 2D shape matrix: each rotation is an array of [row, col] offsets from the piece origin */
export type RotationMatrix = readonly (readonly [number, number])[];

export interface PieceDefinition {
	id: string;
	color: string;
	rotations: readonly RotationMatrix[];
}

export interface ActivePiece {
	defIndex: number; // index into PIECES array
	rotation: number; // current rotation index
	x: number; // column of origin
	y: number; // row of origin
}

export interface TetrisState {
	board: CellColor[][]; // ROWS x COLS grid, null = empty
	currentPiece: ActivePiece | null;
	nextPieceIndex: number;
	score: number;
	highScore: number;
	level: number;
	lines: number;
	gameOver: boolean;
	paused: boolean;
	started: boolean;

	// Timing
	dropTimer: number; // ms accumulated since last gravity drop
	lockTimer: number; // ms accumulated in lock delay
	lockDelay: number; // ms before piece locks (500ms)
	isLocking: boolean;

	// Line clear animation
	clearingLines: number[]; // rows being cleared (animated)
	clearTimer: number; // ms into clear animation
	clearDuration: number; // total clear animation time

	// DAS state
	dasKey: string | null;
	dasTimer: number;
	dasDelay: number; // initial delay before repeat (170ms)
	dasInterval: number; // repeat interval (50ms)
	dasReady: boolean; // passed initial delay
}

/** Create a fresh empty board */
export function createEmptyBoard(): CellColor[][] {
	return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

/** Get the drop interval in ms for a given level */
export function getDropInterval(level: number): number {
	// NES-style speed curve (approximate)
	const speeds = [
		800, 720, 630, 550, 470, 380, 300, 220, 140, 100, 80, 80, 80, 70, 70, 70,
		50, 50, 50, 30,
	];

	return speeds[Math.min(level, speeds.length - 1)] ?? 30;
}
