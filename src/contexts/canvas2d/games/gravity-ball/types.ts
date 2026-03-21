/** Direction gravity can pull the ball */
export type GravityDir = "down" | "up" | "left" | "right";

/** Position on the grid */
export interface Pos {
	x: number;
	y: number;
}

/** Ball entity */
export interface Ball {
	/** Current grid position */
	pos: Pos;
	/** Previous positions for trail rendering */
	trail: Pos[];
}

/** Wall segment on the grid */
export interface Wall {
	x: number;
	y: number;
}

/** Exit marker */
export interface Exit {
	x: number;
	y: number;
}

/** Level definition */
export interface LevelDef {
	/** Grid width in cells */
	width: number;
	/** Grid height in cells */
	height: number;
	/** Ball starting position */
	ballStart: Pos;
	/** Exit position */
	exit: Exit;
	/** Wall positions */
	walls: Wall[];
}

/** Full game state */
export interface GravityState {
	/** Current gravity direction */
	gravity: GravityDir;
	/** The ball */
	ball: Ball;
	/** Exit marker */
	exit: Exit;
	/** Set of walls indexed as "x,y" for fast lookup */
	wallSet: Set<string>;
	/** Wall list for rendering */
	walls: Wall[];
	/** Grid dimensions */
	gridWidth: number;
	gridHeight: number;
	/** Current level index (0-based) */
	level: number;
	/** Number of gravity changes (moves) this level */
	moves: number;
	/** Whether the ball is currently sliding */
	sliding: boolean;
	/** Slide animation progress (0 to 1) */
	slideProgress: number;
	/** Slide start position */
	slideFrom: Pos;
	/** Slide target position */
	slideTo: Pos;
	/** Whether the current level is complete */
	levelComplete: boolean;
	/** Whether all levels are complete */
	gameWon: boolean;
	/** Canvas dimensions */
	canvasWidth: number;
	canvasHeight: number;
	/** Queued gravity direction from input */
	queuedGravity: GravityDir | null;
	/** Request to restart level */
	restartRequested: boolean;
	/** Request to advance to next level */
	advanceRequested: boolean;
	/** Level complete animation timer */
	completeTimer: number;
	/** Exit glow animation phase */
	glowPhase: number;
}

// Visual constants
export const COLORS = {
	background: "#1a1a2e",
	grid: "rgba(255, 255, 255, 0.04)",
	wall: "#546e7a",
	wallHighlight: "#78909c",
	ball: "#e0e0e0",
	ballCore: "#ffffff",
	trail: "rgba(120, 144, 156, 0.3)",
	exit: "#4caf50",
	exitGlow: "rgba(76, 175, 80, 0.4)",
	hud: "#cfd8dc",
	hudDim: "#78909c",
	overlay: "rgba(0, 0, 0, 0.75)",
	overlayText: "#ffffff",
	accent: "#78909c",
	arrowIndicator: "#78909c",
};

export const GAME_ID = "gravity-ball";
export const GAME_NAME = "Gravity Ball";
export const GAME_COLOR = "#78909c";
export const GAME_ICON = "\u26ab";

/** Slide speed: cells per second */
export const SLIDE_SPEED = 18;

/** Max trail length */
export const MAX_TRAIL = 12;
