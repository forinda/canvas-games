export type PlatformType = "normal" | "moving" | "breaking" | "spring";

export type Phase = "idle" | "playing" | "dead";

export interface Player {
	x: number;
	y: number;
	vx: number;
	vy: number;
	width: number;
	height: number;
	facingRight: boolean;
}

export interface Platform {
	x: number;
	y: number;
	width: number;
	height: number;
	type: PlatformType;
	/** For moving platforms: horizontal velocity */
	moveVx: number;
	/** For moving platforms: min x bound */
	moveMinX: number;
	/** For moving platforms: max x bound */
	moveMaxX: number;
	/** For breaking platforms: has been stepped on */
	broken: boolean;
	/** For breaking platforms: fall velocity after breaking */
	breakVy: number;
	/** For spring platforms: spring animation timer */
	springTimer: number;
}

export interface DoodleState {
	player: Player;
	platforms: Platform[];
	phase: Phase;
	score: number;
	highScore: number;
	canvasW: number;
	canvasH: number;
	cameraY: number;
	maxHeight: number;
}

// Physics
export const GRAVITY = 0.0012;
export const JUMP_FORCE = -0.55;
export const SPRING_FORCE = -0.85;
export const MOVE_SPEED = 0.28;
export const FRICTION = 0.92;

// Platforms
export const PLATFORM_COUNT = 12;
export const PLATFORM_WIDTH = 70;
export const PLATFORM_HEIGHT = 15;
export const MOVING_SPEED = 0.06;

// Player
export const PLAYER_WIDTH = 30;
export const PLAYER_HEIGHT = 40;

// Storage
export const HS_KEY = "doodle_jump_highscore";
