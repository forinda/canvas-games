// ── Constants ──────────────────────────────────────────────────────────────

export const CANVAS_W = 800;
export const CANVAS_H = 600;

export const PLAYER_W = 40;
export const PLAYER_H = 20;
export const PLAYER_SPEED = 300; // px / s
export const PLAYER_SHOOT_COOLDOWN = 0.4; // seconds
export const PLAYER_START_LIVES = 3;

export const ALIEN_W = 30;
export const ALIEN_H = 24;
export const ALIEN_PADDING = 14;
export const ALIEN_BASE_SPEED = 40; // px / s – increases as aliens are destroyed
export const ALIEN_DROP = 16; // px dropped when reaching edge
export const ALIEN_SHOOT_INTERVAL = 1.2; // base seconds between alien shots

export const BULLET_W = 4;
export const BULLET_H = 12;
export const PLAYER_BULLET_SPEED = -450; // negative = up
export const ALIEN_BULLET_SPEED = 250; // positive = down

export const SHIELD_COLS = 4;
export const SHIELD_BLOCK_SIZE = 4; // each shield "pixel"
export const SHIELD_W = 44; // in real pixels
export const SHIELD_H = 32;
export const SHIELD_Y = CANVAS_H - 100;

export const UFO_W = 40;
export const UFO_H = 16;
export const UFO_SPEED = 120;
export const UFO_SPAWN_INTERVAL_MIN = 15; // seconds
export const UFO_SPAWN_INTERVAL_MAX = 30;
export const UFO_POINTS = 300;

export const HUD_HEIGHT = 36;

// ── Entity types ───────────────────────────────────────────────────────────

export interface Vec2 {
  x: number;
  y: number;
}

export interface Player {
  x: number;
  y: number;
  w: number;
  h: number;
  speed: number;
  shootCooldown: number;
  cooldownLeft: number;
  alive: boolean;
  respawnTimer: number;
}

export const AlienType = {
  Small: 0,
  Medium: 1,
  Large: 2,
} as const;

export type AlienType = (typeof AlienType)[keyof typeof AlienType];

export interface Alien {
  row: number;
  col: number;
  x: number;
  y: number;
  w: number;
  h: number;
  type: AlienType;
  alive: boolean;
  points: number;
}

export interface Bullet {
  x: number;
  y: number;
  w: number;
  h: number;
  vy: number;
  fromPlayer: boolean;
  active: boolean;
}

/** A shield is a grid of boolean "pixels". When hit a pixel is removed. */
export interface Shield {
  x: number;
  y: number;
  grid: boolean[][]; // [row][col] – true = intact
  rows: number;
  cols: number;
  blockSize: number;
}

export interface UFO {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  active: boolean;
  points: number;
}

// ── Aggregate game state ───────────────────────────────────────────────────

export type GamePhase = 'playing' | 'respawning' | 'gameover' | 'levelclear' | 'paused';

export interface InvadersState {
  phase: GamePhase;
  player: Player;
  aliens: Alien[];
  bullets: Bullet[];
  shields: Shield[];
  ufo: UFO | null;
  ufoTimer: number;

  // Direction the alien block is moving (+1 = right, -1 = left)
  alienDir: 1 | -1;
  alienSpeedMultiplier: number;
  alienShootTimer: number;

  score: number;
  highScore: number;
  lives: number;
  level: number;
  levelClearTimer: number;

  // Input snapshot written by InputSystem, read by other systems
  input: {
    left: boolean;
    right: boolean;
    shoot: boolean;
    pause: boolean;
  };

  canvasW: number;
  canvasH: number;
}
