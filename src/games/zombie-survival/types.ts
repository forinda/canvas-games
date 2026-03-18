// ─── Constants ────────────────────────────────────────────────────────────────

export const ARENA_W = 1200;
export const ARENA_H = 800;
export const PLAYER_RADIUS = 14;
export const PLAYER_SPEED = 180; // px/s
export const BULLET_SPEED = 600;
export const BULLET_RADIUS = 3;
export const BULLET_DAMAGE = 25;
export const BARRICADE_SIZE = 40;
export const BARRICADE_HP = 150;
export const BARRICADE_COST = 20; // resources
export const MAX_AMMO = 30;
export const FLASHLIGHT_RANGE = 260;
export const FLASHLIGHT_ANGLE = Math.PI / 3.5; // cone half-angle

export const DAY_DURATION = 15; // seconds
export const NIGHT_DURATION = 30; // seconds

export const SCAVENGE_RATE_AMMO = 1.2; // ammo per second during day
export const SCAVENGE_RATE_RESOURCES = 4; // resources per second during day

// ─── Enums & Literals ─────────────────────────────────────────────────────────

export type Screen = 'playing' | 'paused' | 'gameover';
export type TimeOfDay = 'day' | 'night';
export type ZombieType = 'walker' | 'runner' | 'tank';

export type ZombieState =
  | 'wandering'
  | 'chasing'
  | 'attacking_player'
  | 'attacking_barricade';

// ─── Entities ─────────────────────────────────────────────────────────────────

export interface Player {
  x: number;
  y: number;
  angle: number; // facing angle (radians, toward mouse)
  hp: number;
  maxHp: number;
  ammo: number;
  maxAmmo: number;
  resources: number;
  shootCooldown: number; // seconds remaining
  invincibleTimer: number; // seconds of invincibility after hit
}

export interface Zombie {
  id: number;
  type: ZombieType;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  speed: number;
  damage: number;
  attackCooldown: number; // seconds remaining
  attackInterval: number; // seconds between attacks
  state: ZombieState;
  targetBarricadeId: number | null;
  radius: number;
  dead: boolean;
}

export interface Bullet {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  dead: boolean;
}

export interface Barricade {
  id: number;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  dead: boolean;
}

// ─── Wave Definitions ─────────────────────────────────────────────────────────

export interface WaveSpawn {
  type: ZombieType;
  count: number;
}

// ─── Particle Effect ──────────────────────────────────────────────────────────

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  decay: number;
  color: string;
  radius: number;
}

// ─── Game State ───────────────────────────────────────────────────────────────

export interface GameState {
  screen: Screen;
  player: Player;
  zombies: Zombie[];
  bullets: Bullet[];
  barricades: Barricade[];
  particles: Particle[];
  wave: number;
  timeOfDay: TimeOfDay;
  cycleTimer: number; // seconds remaining in current day/night phase
  zombiesRemainingInWave: number;
  spawnTimer: number; // seconds until next zombie spawns
  spawnQueue: WaveSpawn[];
  score: number;
  nextId: number;
  totalKills: number;
}
