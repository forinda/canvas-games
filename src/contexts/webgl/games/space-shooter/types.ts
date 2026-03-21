export const ARENA_W = 12;
export const ARENA_H = 9;
export const PLAYER_SPEED = 10;
export const BULLET_SPEED = 30;
export const BULLET_COOLDOWN = 0.15;
export const ASTEROID_SPEED_MIN = 3;
export const ASTEROID_SPEED_MAX = 8;
export const ASTEROID_SPAWN_INTERVAL_INIT = 1.2;
export const ASTEROID_SPAWN_INTERVAL_MIN = 0.3;
export const ENEMY_SPEED = 5;
export const ENEMY_SHOOT_INTERVAL = 2.0;

export interface Bullet {
	x: number;
	y: number;
	z: number;
	vz: number;
	isEnemy: boolean;
}

export interface Asteroid {
	x: number;
	y: number;
	z: number;
	vz: number;
	size: number;
	rotX: number;
	rotY: number;
	rotSpeedX: number;
	rotSpeedY: number;
	hp: number;
}

export interface Enemy {
	x: number;
	y: number;
	z: number;
	vx: number;
	shootTimer: number;
	hp: number;
}

export interface Explosion {
	x: number;
	y: number;
	z: number;
	timer: number;
	maxTime: number;
	size: number;
}

export interface ShooterState {
	playerX: number;
	playerY: number;
	bullets: Bullet[];
	asteroids: Asteroid[];
	enemies: Enemy[];
	explosions: Explosion[];
	shootCooldown: number;
	score: number;
	lives: number;
	spawnTimer: number;
	spawnInterval: number;
	waveTimer: number;
	phase: "playing" | "dead" | "start";
	invulnTimer: number;
}
