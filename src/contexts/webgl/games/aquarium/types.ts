export const TANK_W = 12;
export const TANK_H = 8;
export const TANK_D = 10;
export const FISH_COUNT = 15;
export const FOOD_SINK_SPEED = 1.5;
export const FISH_SPEED = 2;
export const FISH_TURN_SPEED = 2;
export const SEPARATION_DIST = 1.5;
export const ALIGNMENT_DIST = 3;
export const COHESION_DIST = 4;
export const FOOD_ATTRACT_DIST = 6;

export interface Fish {
	x: number;
	y: number;
	z: number;
	vx: number;
	vy: number;
	vz: number;
	yaw: number;
	size: number;
	r: number;
	g: number;
	b: number;
	tailPhase: number;
}

export interface Food {
	x: number;
	y: number;
	z: number;
	life: number;
}

export interface AquariumState {
	fish: Fish[];
	food: Food[];
	phase: "viewing";
}
