export const GRID = 9;
export const BOX = 3;
export const TOTAL_CELLS = GRID * GRID; // 81

export interface Cell {
	/** 0 = empty, 1-9 = placed number */
	value: number;
	/** true if the cell was part of the original puzzle (cannot be edited) */
	given: boolean;
	/** Pencil-mark notes (set of candidate numbers 1-9) */
	notes: Set<number>;
	/** true when the cell has a row/col/box conflict */
	invalid: boolean;
}

export type Difficulty = "easy" | "medium" | "hard";

export interface DifficultyPreset {
	label: string;
	givens: number;
}

export const DIFFICULTY_PRESETS: Record<Difficulty, DifficultyPreset> = {
	easy: { label: "Easy", givens: 35 },
	medium: { label: "Medium", givens: 28 },
	hard: { label: "Hard", givens: 22 },
};

export type GameStatus = "playing" | "won";

export interface UndoEntry {
	row: number;
	col: number;
	prevValue: number;
	prevNotes: Set<number>;
}

export interface SudokuState {
	board: Cell[][];
	/** The full solved grid for validation / hints */
	solution: number[][];
	difficulty: Difficulty;
	status: GameStatus;
	/** Currently selected cell (-1 = none) */
	selectedRow: number;
	selectedCol: number;
	/** Notes mode toggle */
	notesMode: boolean;
	/** Timer in seconds */
	timer: number;
	/** Undo stack */
	undoStack: UndoEntry[];
	/** Layout helpers */
	offsetX: number;
	offsetY: number;
	cellSize: number;
	/** HUD region height */
	hudHeight: number;
}

export const GAME_COLOR = "#7e57c2";
