export type HoleState = "empty" | "rising" | "up" | "sinking";

export interface Hole {
	state: HoleState;
	timer: number;
	isBomb: boolean;
	hit: boolean;
}

export interface Particle {
	x: number;
	y: number;
	vx: number;
	vy: number;
	life: number;
	color: string;
	size: number;
}

export interface HammerEffect {
	x: number;
	y: number;
	timer: number;
}

export interface WhackState {
	holes: Hole[];
	score: number;
	highScore: number;
	combo: number;
	maxCombo: number;
	timeRemaining: number;
	round: number;
	phase: "ready" | "playing" | "gameover";
	paused: boolean;
	particles: Particle[];
	hammerEffect: HammerEffect | null;
	/** Base interval (ms) between mole spawns — decreases over time */
	spawnInterval: number;
	spawnTimer: number;
}

// Layout constants
export const GRID_COLS = 3;
export const GRID_ROWS = 3;
export const HOLE_COUNT = GRID_COLS * GRID_ROWS;
export const ROUND_DURATION = 60; // seconds

// Timing constants (ms)
export const RISE_DURATION = 200;
export const UP_DURATION_BASE = 1200;
export const SINK_DURATION = 200;
export const SPAWN_INTERVAL_BASE = 1200;
export const SPAWN_INTERVAL_MIN = 400;

// Scoring
export const MOLE_POINTS = 10;
export const BOMB_PENALTY = 20;

export const HS_KEY = "whack_a_mole_highscore";
