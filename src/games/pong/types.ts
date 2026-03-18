// ─── Constants ───────────────────────────────────────────────────────────────
export const PADDLE_WIDTH = 14;
export const PADDLE_HEIGHT = 100;
export const PADDLE_MARGIN = 30;
export const PADDLE_SPEED = 420;

export const BALL_RADIUS = 8;
export const BALL_BASE_SPEED = 360;
export const BALL_SPEED_INCREMENT = 20; // added each rally hit
export const BALL_MAX_SPEED = 800;

export const WINNING_SCORE = 11;

export const CENTER_LINE_DASH = [10, 10];

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Paddle {
  x: number;
  y: number;
  w: number;
  h: number;
  dy: number; // current velocity
}

export interface BallTrail {
  x: number;
  y: number;
  alpha: number;
}

export interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  speed: number;
  trail: BallTrail[];
}

export type GamePhase = 'mode-select' | 'start' | 'playing' | 'paused' | 'win';
export type GameMode = 'ai' | '2p';

export interface PongState {
  phase: GamePhase;
  mode: GameMode;
  leftPaddle: Paddle;
  rightPaddle: Paddle;
  ball: Ball;
  leftScore: number;
  rightScore: number;
  winner: 'left' | 'right' | null;
  canvasW: number;
  canvasH: number;
  rallyHits: number; // count of paddle hits in current rally
  showHelp: boolean;
}
