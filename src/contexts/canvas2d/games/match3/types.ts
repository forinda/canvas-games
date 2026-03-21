/** All gem type identifiers — 6 distinct colors */
export const GEM_TYPES = [
	"red",
	"orange",
	"yellow",
	"green",
	"blue",
	"purple",
] as const;
export type GemType = (typeof GEM_TYPES)[number];

/** Map gem type to its display colour */
export const GEM_COLORS: Record<GemType, string> = {
	red: "#ef4444",
	orange: "#f97316",
	yellow: "#eab308",
	green: "#22c55e",
	blue: "#3b82f6",
	purple: "#a855f7",
};

/** Map gem type to its glow colour */
export const GEM_GLOW: Record<GemType, string> = {
	red: "#fca5a5",
	orange: "#fdba74",
	yellow: "#fde047",
	green: "#86efac",
	blue: "#93c5fd",
	purple: "#d8b4fe",
};

export interface Gem {
	type: GemType;
	row: number;
	col: number;
	/** Pixel x position (animated) */
	x: number;
	/** Pixel y position (animated) */
	y: number;
	/** Whether the gem is currently falling */
	falling: boolean;
	/** Scale factor for match flash animation (1 = normal) */
	scale: number;
	/** Opacity (0-1), used for match removal fade */
	opacity: number;
}

export type Phase =
	| "idle"
	| "swapping"
	| "swap-back"
	| "matching"
	| "removing"
	| "falling"
	| "game-over";

export interface Match3State {
	/** 8x8 board; null cells are empty (waiting for gravity fill) */
	board: (Gem | null)[][];
	rows: number;
	cols: number;
	cellSize: number;
	boardOffsetX: number;
	boardOffsetY: number;

	/** Currently selected gem coordinates */
	selected: { row: number; col: number } | null;
	/** Swap source & target for animation */
	swapA: { row: number; col: number } | null;
	swapB: { row: number; col: number } | null;

	phase: Phase;
	phaseTimer: number;

	score: number;
	highScore: number;
	combo: number;
	movesLeft: number;
	maxMoves: number;

	/** Matched gems awaiting removal */
	matched: Set<string>;

	paused: boolean;
	started: boolean;
	gameOver: boolean;

	canvasW: number;
	canvasH: number;
}

export const ROWS = 8;
export const COLS = 8;
export const MAX_MOVES = 30;
export const HS_KEY = "match3_highscore";

/** Duration constants in ms */
export const SWAP_DURATION = 180;
export const REMOVE_DURATION = 200;
export const FALL_SPEED = 800; // pixels per second
