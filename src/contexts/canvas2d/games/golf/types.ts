export interface Vec2 {
	x: number;
	y: number;
}

export interface Ball {
	pos: Vec2;
	vel: Vec2;
	radius: number;
}

export interface Hole {
	pos: Vec2;
	radius: number;
}

export interface Wall {
	x1: number;
	y1: number;
	x2: number;
	y2: number;
}

export type ObstacleShape = "rect" | "circle";

export interface Obstacle {
	shape: ObstacleShape;
	x: number;
	y: number;
	width: number;
	height: number;
	radius?: number;
}

export interface Slope {
	x: number;
	y: number;
	width: number;
	height: number;
	dirX: number;
	dirY: number;
	strength: number;
}

export interface CourseData {
	par: number;
	ballStart: Vec2;
	hole: Hole;
	walls: Wall[];
	obstacles: Obstacle[];
	slopes: Slope[];
}

export interface GolfState {
	ball: Ball;
	currentHole: number;
	totalHoles: number;
	strokes: number;
	strokesPerHole: number[];
	parPerHole: number[];
	totalScore: number;
	aiming: boolean;
	aimStart: Vec2 | null;
	aimEnd: Vec2 | null;
	ballMoving: boolean;
	holeSunk: boolean;
	sunkTimer: number;
	gameComplete: boolean;
	paused: boolean;
	canvasWidth: number;
	canvasHeight: number;
	courseOffsetX: number;
	courseOffsetY: number;
	courseWidth: number;
	courseHeight: number;
	showHelp: boolean;
}

export const FRICTION = 0.985;
export const MAX_POWER = 18;
export const BALL_RADIUS = 6;
export const HOLE_RADIUS = 10;
export const SINK_SPEED_THRESHOLD = 3.5;
export const SINK_DISTANCE_THRESHOLD = 8;
export const SUNK_DISPLAY_TIME = 1500;
export const POWER_SCALE = 0.08;
export const COURSE_WIDTH = 400;
export const COURSE_HEIGHT = 600;
export const COURSE_PADDING = 30;
export const MIN_VELOCITY = 0.05;
