/** Rhythm Tap — shared types and constants */

export type TimingGrade = 'Perfect' | 'Good' | 'OK' | 'Miss';

export interface Circle {
  x: number;
  y: number;
  radius: number;
  /** Current outer ring radius (shrinks toward radius) */
  outerRadius: number;
  shrinkRate: number;
  spawnTime: number;
  hit: boolean;
  missed: boolean;
  /** Timing grade if hit */
  grade: TimingGrade | null;
  /** Unique id */
  id: number;
}

export interface HitEffect {
  x: number;
  y: number;
  radius: number;
  grade: TimingGrade;
  alpha: number;
  scale: number;
  time: number;
}

export interface MissEffect {
  x: number;
  y: number;
  alpha: number;
  time: number;
}

export interface RhythmState {
  circles: Circle[];
  hitEffects: HitEffect[];
  missEffects: MissEffect[];
  score: number;
  highScore: number;
  combo: number;
  maxCombo: number;
  multiplier: number;
  /** Counts for accuracy calculation */
  totalHits: number;
  perfectHits: number;
  goodHits: number;
  okHits: number;
  totalMisses: number;
  /** Round timer in seconds remaining */
  timeRemaining: number;
  gameOver: boolean;
  started: boolean;
  paused: boolean;
  /** Next circle id counter */
  nextId: number;
  /** Timer until next circle spawn (seconds) */
  spawnTimer: number;
  /** Canvas dimensions */
  width: number;
  height: number;
  /** Pending click position (consumed by CircleSystem) */
  pendingClick: { x: number; y: number } | null;
}

// ——— Constants ———

/** Total round duration in seconds */
export const ROUND_DURATION = 60;

/** Base radius for target circles */
export const CIRCLE_RADIUS = 35;

/** Outer ring starts at this multiple of CIRCLE_RADIUS */
export const OUTER_RING_MULTIPLIER = 3;

/** Time for the outer ring to shrink to the inner circle (seconds) */
export const SHRINK_DURATION = 1.5;

/** Spawn interval range (seconds) — decreases as game progresses */
export const SPAWN_INTERVAL_MIN = 0.4;
export const SPAWN_INTERVAL_MAX = 1.2;

/** Margin from edges when spawning circles */
export const SPAWN_MARGIN = 80;

/** Timing thresholds: how close outerRadius must be to radius */
export const PERFECT_THRESHOLD = 8;
export const GOOD_THRESHOLD = 20;
export const OK_THRESHOLD = 35;

/** Points awarded per grade (before multiplier) */
export const GRADE_POINTS: Record<TimingGrade, number> = {
  Perfect: 300,
  Good: 100,
  OK: 50,
  Miss: 0,
};

/** Combo multiplier tiers */
export const COMBO_MULTIPLIER_TIERS: [number, number][] = [
  [30, 8],
  [20, 4],
  [10, 3],
  [5, 2],
  [0, 1],
];

/** High score localStorage key */
export const HS_KEY = 'rhythm-tap-hs';

/** Effect duration in seconds */
export const HIT_EFFECT_DURATION = 0.6;
export const MISS_EFFECT_DURATION = 0.8;
