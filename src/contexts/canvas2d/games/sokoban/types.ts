/** Cell types on the Sokoban board */
export const Cell = {
	Floor: 0,
	Wall: 1,
	Target: 2,
} as const;
export type Cell = (typeof Cell)[keyof typeof Cell];

/** Entity types that can occupy a cell */
export const Entity = {
	None: 0,
	Player: 1,
	Box: 2,
} as const;
export type Entity = (typeof Entity)[keyof typeof Entity];

/** Position on the grid */
export interface Pos {
	x: number;
	y: number;
}

/** Direction vector */
export interface Dir {
	dx: number;
	dy: number;
}

/** A snapshot for undo: player position + box positions */
export interface Snapshot {
	player: Pos;
	boxes: Pos[];
}

/** Full game state */
export interface SokobanState {
	/** 2D grid of cell types (walls, floors, targets) */
	grid: Cell[][];
	/** Width of current level grid */
	width: number;
	/** Height of current level grid */
	height: number;
	/** Player position */
	player: Pos;
	/** Box positions */
	boxes: Pos[];
	/** Current level index (0-based) */
	level: number;
	/** Number of moves made this level */
	moves: number;
	/** Undo history stack */
	undoStack: Snapshot[];
	/** Whether the current level is complete */
	levelComplete: boolean;
	/** Whether all levels are complete */
	gameWon: boolean;
	/** Whether game is paused */
	paused: boolean;
	/** Canvas width */
	canvasWidth: number;
	/** Canvas height */
	canvasHeight: number;
	/** Queued direction from input */
	queuedDir: Dir | null;
	/** Request to undo */
	undoRequested: boolean;
	/** Request to restart */
	restartRequested: boolean;
	/** Request to advance to next level */
	advanceRequested: boolean;
}

// Visual constants
export const COLORS = {
	background: "#1a1a2e",
	wall: "#4a4a6a",
	wallTop: "#5a5a7a",
	floor: "#2a2a3e",
	target: "#ff6b6b",
	targetDim: "rgba(255, 107, 107, 0.3)",
	box: "#f0a030",
	boxOnTarget: "#4ecdc4",
	boxBorder: "#c0801a",
	boxOnTargetBorder: "#35a89a",
	player: "#6c5ce7",
	playerEye: "#fff",
	hud: "#e0e0e0",
	hudDim: "#888",
	overlay: "rgba(0, 0, 0, 0.7)",
	overlayText: "#fff",
	accent: "#795548",
};

export const GAME_ID = "sokoban";
export const GAME_NAME = "Sokoban";
export const GAME_COLOR = "#795548";
export const GAME_ICON = "📦";
