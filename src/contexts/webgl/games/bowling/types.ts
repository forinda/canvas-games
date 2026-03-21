export const LANE_LENGTH = 20;
export const LANE_WIDTH = 3;
export const GUTTER_WIDTH = 0.5;
export const BALL_RADIUS = 0.35;
export const PIN_RADIUS = 0.12;
export const PIN_HEIGHT = 0.5;
export const BALL_MAX_SPEED = 14;
export const PIN_FALL_SPEED = 4;
export const TOTAL_FRAMES = 10;

/** Standard 10-pin triangle layout (row, col offsets from center) */
export const PIN_POSITIONS: [number, number][] = [
	// Row 1 (front)
	[0, 0],
	// Row 2
	[-0.3, -0.35],
	[-0.3, 0.35],
	// Row 3
	[-0.6, -0.7],
	[-0.6, 0],
	[-0.6, 0.7],
	// Row 4 (back)
	[-0.9, -1.05],
	[-0.9, -0.35],
	[-0.9, 0.35],
	[-0.9, 1.05],
];

export interface Pin {
	x: number;
	z: number;
	standing: boolean;
	fallAngle: number;
	fallDir: number;
}

export interface BowlingState {
	ballX: number;
	ballZ: number;
	ballVX: number;
	ballVZ: number;
	ballSpin: number;
	pins: Pin[];
	/** Aiming phase: drag direction */
	aimX: number;
	aimPower: number;
	phase: "aiming" | "rolling" | "settling" | "score" | "gameover";
	/** Current frame (1-10) */
	frame: number;
	/** Roll within frame (1 or 2; 3 for 10th frame bonus) */
	roll: number;
	/** Score per frame [frame][roll] */
	scores: number[][];
	/** Pins knocked this roll */
	knockedThisRoll: number;
	settleTimer: number;
	scoreDisplayTimer: number;
	totalScore: number;
}
