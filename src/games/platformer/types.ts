export interface Platform {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  type: 'solid' | 'moving' | 'crumble';
  origX?: number;
  moveRange?: number;
  moveSpeed?: number;
  crumbleTimer?: number;
}

export interface Coin {
  x: number;
  y: number;
  collected: boolean;
}

export interface Enemy {
  x: number;
  y: number;
  w: number;
  h: number;
  speed: number;
  dir: number;
  minX: number;
  maxX: number;
}

export interface PlatState {
  // Player
  px: number;
  py: number;
  vx: number;
  vy: number;
  pw: number;
  ph: number;
  onGround: boolean;
  jumping: boolean;
  facing: number;
  // World
  platforms: Platform[];
  coins: Coin[];
  enemies: Enemy[];
  // Camera
  camX: number;
  camY: number;
  // Game
  score: number;
  lives: number;
  level: number;
  gameOver: boolean;
  won: boolean;
  started: boolean;
  goalX: number;
  goalY: number;
}

export const GRAVITY = 1200;
export const JUMP_SPEED = -480;
export const MOVE_SPEED = 260;
export const PLAYER_W = 24;
export const PLAYER_H = 32;
