export type GamePhase = "start" | "playing" | "paused" | "gameover";

export interface Ball {
	x: number;
	y: number;
	vx: number;
	vy: number;
	rotation: number;
	inFlight: boolean;
}

export interface Hoop {
	x: number;
	y: number;
	rimWidth: number;
	backboardHeight: number;
	backboardWidth: number;
	netHeight: number;
}

export interface Particle {
	x: number;
	y: number;
	vx: number;
	vy: number;
	life: number;
	maxLife: number;
	color: string;
	size: number;
}

export interface AimState {
	dragging: boolean;
	startX: number;
	startY: number;
	currentX: number;
	currentY: number;
}

export interface BasketballState {
	phase: GamePhase;
	ball: Ball;
	hoop: Hoop;
	aim: AimState;
	particles: Particle[];
	score: number;
	bestScore: number;
	streak: number;
	shotClock: number;
	shotClockMax: number;
	canvasW: number;
	canvasH: number;
	lastScoredTime: number;
	showSwish: boolean;
	madeShot: boolean;
	ballPassedRim: boolean;
}

// Constants
export const GRAVITY = 980;
export const BALL_RADIUS = 18;
export const RIM_WIDTH = 70;
export const RIM_THICKNESS = 5;
export const BACKBOARD_HEIGHT = 100;
export const BACKBOARD_WIDTH = 10;
export const NET_HEIGHT = 40;
export const SHOT_CLOCK_DURATION = 30;
export const POWER_SCALE = 3.5;
export const MAX_POWER = 800;
export const BOUNCE_DAMPING = 0.55;
export const ROTATION_SPEED = 0.08;
export const HS_KEY = "basketball_highscore";
