export type Direction = "up" | "down" | "left" | "right" | "none";

export type GhostMode = "scatter" | "chase" | "frightened";

export type GhostName = "blinky" | "pinky" | "inky" | "clyde";

export type CellType = "wall" | "dot" | "power" | "empty" | "door";

export interface Cell {
	type: CellType;
}

export interface Position {
	x: number;
	y: number;
}

export interface PacMan {
	pos: Position;
	dir: Direction;
	nextDir: Direction;
	mouthAngle: number;
	mouthOpening: boolean;
}

export interface Ghost {
	name: GhostName;
	pos: Position;
	dir: Direction;
	mode: GhostMode;
	scatterTarget: Position;
	homePos: Position;
	color: string;
	active: boolean;
	/** Timer before ghost leaves the house */
	releaseTimer: number;
	/** When eaten and returning to house */
	eaten: boolean;
}

export interface PacManState {
	grid: Cell[][];
	gridWidth: number;
	gridHeight: number;
	pacman: PacMan;
	ghosts: Ghost[];
	score: number;
	highScore: number;
	lives: number;
	level: number;
	totalDots: number;
	dotsEaten: number;
	frightenedTimer: number;
	frightenedGhostsEaten: number;
	modeTimer: number;
	modeIndex: number;
	globalMode: "scatter" | "chase";
	gameOver: boolean;
	paused: boolean;
	started: boolean;
	won: boolean;
	/** Timestamp of current frame */
	time: number;
	/** Cell size in pixels */
	cellSize: number;
	/** Canvas offset for centering */
	offsetX: number;
	offsetY: number;
}

// Constants
export const MAZE_COLS = 28;
export const MAZE_ROWS = 31;
export const BASE_SPEED = 5.5; // cells per second
export const GHOST_SPEED = 5.0;
export const GHOST_FRIGHTENED_SPEED = 2.5;
export const GHOST_EATEN_SPEED = 10;
export const FRIGHTENED_DURATION = 8;
export const DOT_SCORE = 10;
export const POWER_SCORE = 50;
export const GHOST_EAT_SCORES = [200, 400, 800, 1600];
export const INITIAL_LIVES = 3;
export const HS_KEY = "pacman_highscore";

/** Scatter/chase mode durations in seconds: [scatter, chase, scatter, chase, ...] */
export const MODE_DURATIONS = [7, 20, 7, 20, 5, 20, 5, Infinity];
