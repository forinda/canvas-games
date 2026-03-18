export interface Helicopter {
  x: number;
  y: number;
  velocity: number;
  width: number;
  height: number;
  rotorAngle: number;
}

export interface CaveSegment {
  x: number;
  top: number;
  bottom: number;
}

export interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type Phase = 'idle' | 'playing' | 'dead';

export interface HelicopterState {
  helicopter: Helicopter;
  cave: CaveSegment[];
  obstacles: Obstacle[];
  phase: Phase;
  distance: number;
  bestScore: number;
  canvasW: number;
  canvasH: number;
  scrollSpeed: number;
  holding: boolean;
  flashTimer: number;
  backgroundOffset: number;
  elapsedTime: number;
}

// Physics
export const GRAVITY = 0.0012;
export const LIFT = -0.0024;
export const MAX_VELOCITY = 0.45;
export const MIN_VELOCITY = -0.35;

// Scrolling
export const BASE_SCROLL_SPEED = 0.18;
export const SPEED_INCREMENT = 0.00001;
export const MAX_SCROLL_SPEED = 0.4;

// Cave
export const CAVE_SEGMENT_WIDTH = 20;
export const INITIAL_GAP = 260;
export const MIN_GAP = 120;
export const GAP_SHRINK_RATE = 0.003;
export const CAVE_ROUGHNESS = 18;

// Helicopter
export const HELI_WIDTH = 40;
export const HELI_HEIGHT = 20;
export const HELI_X_RATIO = 0.15;

// Obstacles
export const OBSTACLE_WIDTH = 20;
export const OBSTACLE_MIN_HEIGHT = 20;
export const OBSTACLE_MAX_HEIGHT = 60;
export const OBSTACLE_SPAWN_INTERVAL = 1400;

// Storage
export const HS_KEY = 'helicopter_best_score';
