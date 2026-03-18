export type PowerupType = 'wide' | 'multiball' | 'slow';

export type GamePhase = 'start' | 'playing' | 'paused' | 'gameover' | 'win';

export interface Brick {
  x: number;
  y: number;
  w: number;
  h: number;
  hp: number;
  maxHp: number;
  color: string;
  alive: boolean;
}

export interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
}

export interface Paddle {
  x: number;
  y: number;
  w: number;
  h: number;
  baseW: number;
}

export interface Powerup {
  x: number;
  y: number;
  w: number;
  h: number;
  vy: number;
  type: PowerupType;
  alive: boolean;
}

export interface ActiveEffect {
  type: PowerupType;
  remaining: number;
}

export interface BreakoutState {
  phase: GamePhase;
  balls: Ball[];
  paddle: Paddle;
  bricks: Brick[];
  powerups: Powerup[];
  effects: ActiveEffect[];
  score: number;
  highScore: number;
  lives: number;
  level: number;
  canvasW: number;
  canvasH: number;
  baseBallSpeed: number;
  mouseX: number;
}

// Constants
export const PADDLE_H = 14;
export const PADDLE_BASE_W = 100;
export const BALL_R = 6;
export const BALL_BASE_SPEED = 300;
export const BRICK_ROWS = 6;
export const BRICK_COLS = 10;
export const BRICK_H = 22;
export const BRICK_GAP = 3;
export const BRICK_TOP_OFFSET = 60;
export const POWERUP_SIZE = 20;
export const POWERUP_SPEED = 150;
export const POWERUP_DURATION = 8000;
export const POWERUP_DROP_CHANCE = 0.25;
export const MAX_LIVES = 3;
export const MAX_LEVEL = 5;
export const HS_KEY = 'breakout_highscore';
