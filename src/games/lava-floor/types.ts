export interface Player {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  onGround: boolean;
  facingRight: boolean;
}

export interface Platform {
  x: number;
  y: number;
  w: number;
  sinkTimer: number;
  sunk: boolean;
  sinking: boolean;
  opacity: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface LavaBubble {
  x: number;
  y: number;
  radius: number;
  speed: number;
  phase: number;
}

export type Phase = 'idle' | 'playing' | 'dead';

export interface LavaState {
  player: Player;
  platforms: Platform[];
  particles: Particle[];
  lavaBubbles: LavaBubble[];
  phase: Phase;
  survivalTime: number;
  bestTime: number;
  canvasW: number;
  canvasH: number;
  lavaY: number;
  scrollSpeed: number;
  spawnTimer: number;
  flashTimer: number;
  leftHeld: boolean;
  rightHeld: boolean;
  jumpPressed: boolean;
}

// Physics
export const GRAVITY = 0.0015;
export const JUMP_FORCE = -0.55;
export const MOVE_SPEED = 0.28;
export const MAX_FALL_SPEED = 0.6;

// Platforms
export const SINK_SPEED = 0.05;
export const SINK_DELAY = 2000;
export const PLATFORM_MIN_W = 70;
export const PLATFORM_MAX_W = 130;
export const PLATFORM_HEIGHT = 14;
export const BASE_SPAWN_INTERVAL = 1800;
export const MIN_SPAWN_INTERVAL = 700;
export const SPEED_INCREASE_RATE = 0.00002;

// Player
export const PLAYER_WIDTH = 24;
export const PLAYER_HEIGHT = 32;

// Storage
export const HS_KEY = 'lava_floor_best_time';
