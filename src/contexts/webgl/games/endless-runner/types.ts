export const LANE_COUNT = 3;
export const LANE_WIDTH = 2.5;
export const PLAYER_SIZE = 0.6;
export const GROUND_SEGMENT_LEN = 6;
export const VISIBLE_SEGMENTS = 20;
export const INITIAL_SPEED = 8;
export const SPEED_INCREMENT = 0.3; // per second
export const MAX_SPEED = 25;
export const JUMP_VELOCITY = 10;
export const GRAVITY = 25;
export const LANE_SWITCH_SPEED = 12;
export const OBSTACLE_MIN_GAP = 3;

export interface Obstacle {
	lane: number;
	z: number;
	type: "block" | "low" | "tall";
	w: number;
	h: number;
	d: number;
}

export interface Collectible {
	lane: number;
	z: number;
	collected: boolean;
}

export interface RunnerState {
	/** Current lane (0 = left, 1 = center, 2 = right) */
	lane: number;
	/** Actual X position (smoothly interpolates to target lane) */
	playerX: number;
	playerY: number;
	velocityY: number;
	isGrounded: boolean;
	/** How far down the track the player has traveled */
	distance: number;
	speed: number;
	score: number;
	coins: number;
	obstacles: Obstacle[];
	collectibles: Collectible[];
	/** Next Z position for spawning obstacles */
	nextSpawnZ: number;
	phase: "playing" | "dead" | "start";
}

export function laneX(lane: number): number {
	return (lane - 1) * LANE_WIDTH;
}
