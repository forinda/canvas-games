/** Fruit Ninja — shared types and constants */

export interface FruitType {
  name: string;
  color: string;
  innerColor: string;
  icon: string;
  radius: number;
  points: number;
}

export interface Fruit {
  type: FruitType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  rotationSpeed: number;
  sliced: boolean;
  isBomb: boolean;
  /** Unique id for tracking */
  id: number;
}

export interface FruitHalf {
  type: FruitType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  rotationSpeed: number;
  isBomb: boolean;
  /** Which half: -1 = left, 1 = right */
  side: -1 | 1;
  alpha: number;
}

export interface JuiceParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
}

export interface SlicePoint {
  x: number;
  y: number;
  time: number;
}

export interface SliceTrail {
  points: SlicePoint[];
}

export interface FruitNinjaState {
  fruits: Fruit[];
  halves: FruitHalf[];
  particles: JuiceParticle[];
  trail: SliceTrail;
  score: number;
  highScore: number;
  combo: number;
  comboTimer: number;
  lives: number;
  gameOver: boolean;
  started: boolean;
  paused: boolean;
  /** Next fruit id counter */
  nextId: number;
  /** Timer until next fruit launch wave */
  launchTimer: number;
  /** Current difficulty wave */
  wave: number;
  /** Canvas dimensions cached */
  width: number;
  height: number;
  /** Mouse state for input */
  mouseDown: boolean;
  mouseX: number;
  mouseY: number;
  /** Fruits sliced in current swipe for combo tracking */
  swipeSliceCount: number;
}

// ——— Constants ———

export const GRAVITY = 980;
export const MAX_LIVES = 3;
export const TRAIL_LIFETIME = 150; // ms a trail point lives
export const FRUIT_RADIUS = 30;
export const BOMB_RADIUS = 28;
export const COMBO_WINDOW = 600; // ms to chain combos
export const LAUNCH_INTERVAL_MIN = 0.8; // seconds
export const LAUNCH_INTERVAL_MAX = 2.0;
export const PARTICLE_COUNT = 8;
export const HS_KEY = 'fruit-ninja-hs';
