export interface PopParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
}

export interface Balloon {
  x: number;
  y: number;
  radius: number;
  color: string;
  speed: number;
  popped: boolean;
  popParticles: PopParticle[];
  /** Horizontal wobble phase offset */
  wobbleOffset: number;
}

export interface BalloonState {
  balloons: Balloon[];
  score: number;
  highScore: number;
  combo: number;
  maxCombo: number;
  comboTimer: number;
  lives: number;
  timeRemaining: number;
  phase: 'ready' | 'playing' | 'gameover';
  paused: boolean;
  particles: PopParticle[];
  spawnTimer: number;
  spawnInterval: number;
  elapsed: number;
}

// Game constants
export const MAX_LIVES = 5;
export const ROUND_DURATION = 90; // seconds
export const COMBO_WINDOW = 1500; // ms — time between pops to keep combo alive

// Spawn constants
export const SPAWN_INTERVAL_BASE = 1200; // ms
export const SPAWN_INTERVAL_MIN = 350; // ms
export const SPAWN_RAMP_RATE = 8; // ms decrease per second of elapsed time

// Balloon size range
export const BALLOON_RADIUS_MIN = 18;
export const BALLOON_RADIUS_MAX = 42;

// Speed range (pixels per second, upward)
export const BALLOON_SPEED_MIN = 60;
export const BALLOON_SPEED_MAX = 160;

// Scoring
export const BASE_POINTS = 10;
/** Bonus multiplier for small balloons: points = BASE_POINTS + SIZE_BONUS_FACTOR * (MAX_RADIUS - radius) */
export const SIZE_BONUS_FACTOR = 0.8;

export const BALLOON_COLORS = [
  '#e91e63', '#f44336', '#ff9800', '#ffeb3b',
  '#4caf50', '#2196f3', '#9c27b0', '#00bcd4',
];

export const HS_KEY = 'balloon_pop_highscore';
