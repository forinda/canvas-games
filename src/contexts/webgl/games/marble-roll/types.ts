export interface MarbleState {
	/** Marble world position */
	x: number;
	y: number;
	z: number;
	/** Marble velocity */
	vx: number;
	vy: number;
	vz: number;
	/** Platform tilt angles (radians) */
	tiltX: number;
	tiltZ: number;
	/** Target tilt from input */
	targetTiltX: number;
	targetTiltZ: number;
	/** Game phase */
	phase: "playing" | "won" | "fell";
	/** Current level */
	level: number;
	/** Collected gems */
	gems: number;
	/** Total gems in level */
	totalGems: number;
}

export interface Gem {
	x: number;
	z: number;
	collected: boolean;
}

export interface LevelData {
	/** Platform size (half-extent) */
	size: number;
	/** Goal position */
	goalX: number;
	goalZ: number;
	/** Gem positions */
	gems: Gem[];
	/** Marble start position */
	startX: number;
	startZ: number;
}

export const MARBLE_RADIUS = 0.3;
export const GRAVITY = 9.8;
export const TILT_MAX = 0.25; // max tilt angle in radians
export const TILT_SPEED = 3.0; // how fast tilt responds to input
export const FRICTION = 0.985;
export const BOUNCE_DAMPING = 0.5;

export const LEVELS: LevelData[] = [
	{
		size: 4,
		goalX: 3,
		goalZ: 3,
		gems: [
			{ x: -2, z: 1, collected: false },
			{ x: 1, z: -2, collected: false },
		],
		startX: -3,
		startZ: -3,
	},
	{
		size: 5,
		goalX: 4,
		goalZ: -4,
		gems: [
			{ x: 2, z: 2, collected: false },
			{ x: -3, z: 0, collected: false },
			{ x: 0, z: -3, collected: false },
		],
		startX: -4,
		startZ: 4,
	},
	{
		size: 6,
		goalX: -5,
		goalZ: 5,
		gems: [
			{ x: 3, z: -2, collected: false },
			{ x: -2, z: -4, collected: false },
			{ x: 0, z: 3, collected: false },
			{ x: 4, z: 1, collected: false },
		],
		startX: 5,
		startZ: -5,
	},
];
