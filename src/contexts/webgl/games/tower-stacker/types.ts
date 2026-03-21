export const BLOCK_HEIGHT = 0.4;
export const START_SIZE = 3.0;
export const SWING_SPEED_INIT = 3.0;
export const SWING_SPEED_INC = 0.15;
export const SWING_SPEED_MAX = 10;
export const SWING_RANGE = 4.0;
export const FALL_SPEED = 12;
export const FALL_ROTATE_SPEED = 3;

export interface Block {
	x: number;
	z: number;
	w: number;
	d: number;
	y: number;
	/** Color RGB */
	r: number;
	g: number;
	b: number;
}

export interface FallingPiece {
	x: number;
	z: number;
	w: number;
	d: number;
	y: number;
	vy: number;
	rotation: number;
	r: number;
	g: number;
	b: number;
}

export interface StackerState {
	stack: Block[];
	fallingPieces: FallingPiece[];
	/** Current swinging block */
	currentX: number;
	currentZ: number;
	currentW: number;
	currentD: number;
	/** Swing axis alternates: true = X, false = Z */
	swingOnX: boolean;
	swingPos: number;
	swingSpeed: number;
	score: number;
	phase: "playing" | "dropping" | "gameover";
	/** Perfect streak bonus */
	perfectStreak: number;
}
