export interface Cell {
	letter: string;
	row: number;
	col: number;
}

export type Direction =
	| "right"
	| "left"
	| "down"
	| "up"
	| "down-right"
	| "down-left"
	| "up-right"
	| "up-left";

export interface PlacedWord {
	word: string;
	startRow: number;
	startCol: number;
	direction: Direction;
	found: boolean;
	/** Cell coordinates for this word */
	cells: { row: number; col: number }[];
}

export type GameStatus = "playing" | "won";

export interface WordSearchState {
	grid: Cell[][];
	rows: number;
	cols: number;
	placedWords: PlacedWord[];
	/** Currently selected cell indices during drag */
	selection: { row: number; col: number }[];
	/** Is the user actively dragging? */
	dragging: boolean;
	/** Start cell of current drag */
	dragStart: { row: number; col: number } | null;
	/** Current pointer position (canvas coords) for live selection line */
	pointerPos: { x: number; y: number } | null;
	status: GameStatus;
	timer: number;
	theme: string;
	/** Layout: offset and cell size for centering */
	offsetX: number;
	offsetY: number;
	cellSize: number;
	/** Found word highlight colors */
	foundColors: Map<string, string>;
}

/** Direction vectors for word placement */
export const DIRECTION_VECTORS: Record<Direction, { dr: number; dc: number }> =
	{
		right: { dr: 0, dc: 1 },
		left: { dr: 0, dc: -1 },
		down: { dr: 1, dc: 0 },
		up: { dr: -1, dc: 0 },
		"down-right": { dr: 1, dc: 1 },
		"down-left": { dr: 1, dc: -1 },
		"up-right": { dr: -1, dc: 1 },
		"up-left": { dr: -1, dc: -1 },
	};

export const GRID_ROWS = 12;
export const GRID_COLS = 12;
export const WORDS_PER_PUZZLE = 8;

export const GAME_COLOR = "#5c6bc0";

export const HIGHLIGHT_COLORS = [
	"#ef4444",
	"#f59e0b",
	"#10b981",
	"#3b82f6",
	"#8b5cf6",
	"#ec4899",
	"#06b6d4",
	"#f97316",
	"#14b8a6",
	"#a855f7",
];
