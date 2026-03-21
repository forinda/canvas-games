/** Card state for a single memory card */
export interface Card {
	/** Index into the ICONS array */
	iconIndex: number;
	/** Whether the card is currently face-up */
	flipped: boolean;
	/** Whether the card has been matched and removed from play */
	matched: boolean;
	/** Flip animation progress: 0 = face-down, 1 = face-up */
	flipProgress: number;
	/** Row position on the board */
	row: number;
	/** Column position on the board */
	col: number;
}

export type Difficulty = "4x4" | "5x4" | "6x6";

export interface DifficultyConfig {
	rows: number;
	cols: number;
	label: string;
}

export const DIFFICULTIES: Record<Difficulty, DifficultyConfig> = {
	"4x4": { rows: 4, cols: 4, label: "4x4 (8 pairs)" },
	"5x4": { rows: 4, cols: 5, label: "5x4 (10 pairs)" },
	"6x6": { rows: 6, cols: 6, label: "6x6 (18 pairs)" },
};

export type Phase = "idle" | "one-flipped" | "two-flipped" | "checking" | "won";

export interface MemoryState {
	board: Card[];
	rows: number;
	cols: number;
	cellSize: number;
	boardOffsetX: number;
	boardOffsetY: number;

	difficulty: Difficulty;
	phase: Phase;

	/** Indices into board[] of the currently flipped (non-matched) cards */
	firstPick: number | null;
	secondPick: number | null;

	/** Timer for the 1.5s reveal before auto-flip-back */
	revealTimer: number;

	/** Total number of moves (each pair flip counts as one move) */
	moves: number;
	/** Number of matched pairs found */
	pairsFound: number;
	/** Total pairs needed to win */
	totalPairs: number;

	/** Elapsed game time in ms */
	elapsedTime: number;
	/** Whether the timer is running */
	timerRunning: boolean;

	/** Best moves from localStorage (per difficulty) */
	bestMoves: number | null;
	/** Best time from localStorage (per difficulty) */
	bestTime: number | null;

	paused: boolean;
	started: boolean;
	gameOver: boolean;

	canvasW: number;
	canvasH: number;
}

/** Duration cards stay face-up before flipping back (ms) */
export const REVEAL_DURATION = 1500;

/** Flip animation speed: progress units per ms */
export const FLIP_SPEED = 0.004;

/** localStorage key prefix */
export const LS_PREFIX = "memory_match_";

export const GAME_COLOR = "#ab47bc";
