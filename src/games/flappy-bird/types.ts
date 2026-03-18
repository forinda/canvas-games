export interface Bird {
  x: number;
  y: number;
  velocity: number;
  rotation: number;
  radius: number;
  wingAngle: number;
  wingDir: number;
}

export interface Pipe {
  x: number;
  gapY: number;
  width: number;
  scored: boolean;
}

export type Phase = 'idle' | 'playing' | 'dead';

export interface FlappyState {
  bird: Bird;
  pipes: Pipe[];
  phase: Phase;
  score: number;
  highScore: number;
  canvasW: number;
  canvasH: number;
  groundY: number;
  pipeTimer: number;
  flashTimer: number;
  backgroundOffset: number;
  groundOffset: number;
}

// Physics
export const GRAVITY = 0.0015;
export const FLAP_FORCE = -0.42;
export const TERMINAL_VELOCITY = 0.7;

// Pipes
export const PIPE_SPEED = 0.18;
export const GAP_SIZE = 140;
export const PIPE_WIDTH = 60;
export const PIPE_SPAWN_INTERVAL = 1800;
export const PIPE_MIN_TOP = 80;

// Bird
export const BIRD_RADIUS = 16;
export const BIRD_X_RATIO = 0.22;

// Ground
export const GROUND_HEIGHT = 60;

// Storage
export const HS_KEY = 'flappy_bird_highscore';
