export const TERRAIN_SIZE = 64;
export const TERRAIN_SCALE = 4;
export const TERRAIN_HEIGHT = 15;
export const PLANE_SPEED = 30;
export const PITCH_SPEED = 1.5;
export const ROLL_SPEED = 2.0;
export const YAW_FROM_ROLL = 0.8;
export const MIN_ALTITUDE = 2;
export const RING_COUNT = 8;
export const RING_RADIUS = 3;

export interface Ring {
	x: number;
	y: number;
	z: number;
	collected: boolean;
}

export interface FlightState {
	planeX: number;
	planeY: number;
	planeZ: number;
	pitch: number;
	roll: number;
	yaw: number;
	speed: number;
	rings: Ring[];
	collected: number;
	totalRings: number;
	phase: "flying" | "crashed" | "won";
	timer: number;
}
