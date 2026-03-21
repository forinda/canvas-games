// ── Constants ──────────────────────────────────────────────
export const HS_KEY = "asteroids_highscore";
export const SHIP_RADIUS = 15;
export const SHIP_THRUST = 0.12;
export const SHIP_DRAG = 0.99;
export const SHIP_ROTATION_SPEED = 0.065;
export const BULLET_SPEED = 7;
export const BULLET_LIFETIME = 60; // frames
export const MAX_BULLETS = 8;
export const SHOOT_COOLDOWN = 150; // ms
export const INVULN_DURATION = 3000; // ms
export const ASTEROID_SPEEDS: Record<AsteroidSize, number> = {
	large: 1.2,
	medium: 2.0,
	small: 3.2,
};
export const ASTEROID_RADII: Record<AsteroidSize, number> = {
	large: 40,
	medium: 22,
	small: 12,
};
export const ASTEROID_SCORES: Record<AsteroidSize, number> = {
	large: 20,
	medium: 50,
	small: 100,
};
export const STARTING_LIVES = 3;
export const INITIAL_ASTEROIDS = 4;

// ── Types ──────────────────────────────────────────────────
export type AsteroidSize = "large" | "medium" | "small";

export interface Vec2 {
	x: number;
	y: number;
}

export interface Ship {
	pos: Vec2;
	vel: Vec2;
	angle: number; // radians, 0 = pointing up
	thrusting: boolean;
}

export interface Asteroid {
	pos: Vec2;
	vel: Vec2;
	size: AsteroidSize;
	radius: number;
	vertices: number; // count of polygon vertices
	offsets: number[]; // per-vertex radius jitter
}

export interface Bullet {
	pos: Vec2;
	vel: Vec2;
	life: number; // frames remaining
}

export interface Particle {
	pos: Vec2;
	vel: Vec2;
	life: number;
	maxLife: number;
	radius: number;
	color: string;
}

export interface AsteroidsState {
	ship: Ship;
	asteroids: Asteroid[];
	bullets: Bullet[];
	particles: Particle[];
	score: number;
	highScore: number;
	lives: number;
	wave: number;
	gameOver: boolean;
	paused: boolean;
	started: boolean;
	invulnUntil: number; // timestamp
	lastShot: number; // timestamp
	width: number;
	height: number;
}
