export const TRACK_WIDTH = 8;
export const MAX_SPEED = 40;
export const ACCELERATION = 15;
export const BRAKE_FORCE = 25;
export const STEER_SPEED = 2.5;
export const FRICTION = 0.97;
export const OFF_TRACK_FRICTION = 0.9;
export const AI_COUNT = 3;
export const TOTAL_LAPS = 3;

/** Track defined as a series of waypoints forming a loop */
export interface Waypoint {
	x: number;
	z: number;
}

export const TRACK_WAYPOINTS: Waypoint[] = [
	{ x: 0, z: 0 },
	{ x: 30, z: 0 },
	{ x: 50, z: 15 },
	{ x: 50, z: 40 },
	{ x: 35, z: 55 },
	{ x: 10, z: 55 },
	{ x: -10, z: 45 },
	{ x: -15, z: 25 },
	{ x: -5, z: 10 },
];

export interface Car {
	x: number;
	z: number;
	angle: number;
	speed: number;
	waypointIdx: number;
	laps: number;
	color: [number, number, number];
	isPlayer: boolean;
	name: string;
	finished: boolean;
}

export interface Racing3DState {
	player: Car;
	aiCars: Car[];
	phase: "countdown" | "racing" | "finished";
	countdown: number;
	raceTime: number;
	positions: Car[];
}
