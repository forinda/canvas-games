// ── Constants ────────────────────────────────────────────────────────
export const PLAYER_RADIUS = 18;
export const PLAYER_SPEED = 220;
export const PLAYER_MAX_HP = 100;
export const BULLET_SPEED = 600;
export const BULLET_RADIUS = 4;
export const BULLET_LIFETIME = 1.5; // seconds
export const SHOOT_COOLDOWN = 0.15; // seconds between shots
export const ARENA_PADDING = 40;
export const PARTICLE_LIFETIME = 0.4;
export const HS_KEY = 'topdown_shooter_highscore';

// ── Interfaces ───────────────────────────────────────────────────────
export interface Vec2 {
  x: number;
  y: number;
}

export interface Player {
  pos: Vec2;
  hp: number;
  maxHp: number;
  radius: number;
  shootCooldown: number;
  invincibleTimer: number;
}

export interface Bullet {
  pos: Vec2;
  vel: Vec2;
  age: number;
  radius: number;
  fromPlayer: boolean;
}

export type EnemyType = 'normal' | 'fast' | 'tank' | 'ranged';

export interface Enemy {
  pos: Vec2;
  vel: Vec2;
  hp: number;
  maxHp: number;
  radius: number;
  speed: number;
  type: EnemyType;
  color: string;
  /** For ranged enemies: seconds until next shot */
  shootTimer: number;
  damage: number;
}

export interface Particle {
  pos: Vec2;
  vel: Vec2;
  age: number;
  lifetime: number;
  color: string;
  radius: number;
}

export interface WaveData {
  wave: number;
  enemiesRemaining: number;
  spawnTimer: number;
  spawnInterval: number;
  betweenWaveTimer: number;
  active: boolean;
}

export interface ShooterState {
  canvasW: number;
  canvasH: number;
  player: Player;
  bullets: Bullet[];
  enemies: Enemy[];
  particles: Particle[];
  waveData: WaveData;
  score: number;
  highScore: number;
  kills: number;
  gameOver: boolean;
  paused: boolean;
  started: boolean;
  // input state
  keys: Set<string>;
  mouse: Vec2;
  mouseDown: boolean;
}
