// ── Grid & layout constants ────────────────────────────────────────

export const COLS = 13;
export const ROWS = 13; // 0=goal, 1–5=river, 6=safe, 7–11=road, 12=start
export const GOAL_SLOTS = 5; // lily-pad slots at the top row

export const HS_KEY = "frogger_highscore";

// ── Lane type identifiers ──────────────────────────────────────────

export type LaneKind = "goal" | "river" | "safe" | "road" | "start";

export type Direction = -1 | 1; // -1 = left, 1 = right

// ── Lane descriptor (defined per level in data/levels.ts) ──────────

export interface LaneDescriptor {
	kind: LaneKind;
	speed: number; // pixels-per-second base speed (0 for safe/start/goal)
	direction: Direction;
	/** Vehicle/log templates that can appear in this lane */
	objects: LaneObjectTemplate[];
}

export interface LaneObjectTemplate {
	width: number; // in grid cells
	gap: number; // minimum gap in grid cells before next object
}

// ── Runtime objects ────────────────────────────────────────────────

export interface Frog {
	col: number;
	row: number;
	/** Pixel offsets for smooth animation (0 when idle) */
	offsetX: number;
	offsetY: number;
	/** true while hop animation is playing */
	hopping: boolean;
	hopTimer: number;
}

export interface Vehicle {
	x: number; // pixel position (left edge)
	row: number;
	width: number; // in pixels
	speed: number; // px/s (signed: negative = left)
	color: string;
}

export interface Log {
	x: number;
	row: number;
	width: number;
	speed: number; // px/s (signed)
}

export interface LilyPad {
	col: number;
	occupied: boolean;
}

// ── Master state ───────────────────────────────────────────────────

export interface FroggerState {
	frog: Frog;
	vehicles: Vehicle[];
	logs: Log[];
	lilyPads: LilyPad[];
	lanes: LaneDescriptor[];

	lives: number;
	score: number;
	highScore: number;
	level: number;
	goalsReached: number;

	cellW: number;
	cellH: number;
	canvasW: number;
	canvasH: number;

	paused: boolean;
	started: boolean;
	gameOver: boolean;
	dying: boolean;
	deathTimer: number;
	levelComplete: boolean;
	levelCompleteTimer: number;
}
