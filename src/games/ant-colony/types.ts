// ── Ant Colony Types & Constants ─────────────────────────────────────

export type AntTask = 'forage' | 'build' | 'idle';

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export interface Vec2 {
  x: number;
  y: number;
}

export interface Ant {
  x: number;
  y: number;
  /** velocity direction in radians */
  angle: number;
  carrying: boolean;
  task: AntTask;
  /** target position (food source or tunnel waypoint) */
  targetX: number;
  targetY: number;
  /** whether ant is returning to colony */
  returning: boolean;
  /** pheromone strength left by this ant */
  pheromoneTimer: number;
}

export interface Colony {
  x: number;
  y: number;
  food: number;
  population: number;
  maxPopulation: number;
  /** food needed to birth one ant */
  birthThreshold: number;
  /** accumulated food toward next birth */
  birthProgress: number;
}

export interface FoodSource {
  x: number;
  y: number;
  amount: number;
  maxAmount: number;
  radius: number;
}

export interface TunnelSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  progress: number; // 0..1
  complete: boolean;
}

export interface Pheromone {
  x: number;
  y: number;
  strength: number; // 0..1, decays
  type: 'food' | 'home';
}

export interface TaskRatio {
  forage: number;
  build: number;
  idle: number;
}

export interface AntColonyState {
  colony: Colony;
  ants: Ant[];
  foodSources: FoodSource[];
  tunnels: TunnelSegment[];
  pheromones: Pheromone[];
  taskRatio: TaskRatio;
  season: Season;
  seasonTimer: number;
  year: number;
  elapsed: number;
  paused: boolean;
  started: boolean;
  gameOver: boolean;
  /** tunnel waypoints being placed by player */
  tunnelWaypoints: Vec2[];
  /** canvas dimensions */
  width: number;
  height: number;
  /** show help */
  showHelp: boolean;
}

// ── Constants ──

/** Duration of each season in seconds */
export const SEASON_DURATION = 30;

/** Food consumed per ant per second */
export const FOOD_CONSUMPTION_RATE = 0.02;

/** Food required to birth one ant */
export const BIRTH_COST = 20;

/** Max pheromone count before oldest are pruned */
export const MAX_PHEROMONES = 2000;

/** Pheromone decay rate per second */
export const PHEROMONE_DECAY = 0.15;

/** Pheromone drop interval in seconds */
export const PHEROMONE_DROP_INTERVAL = 0.3;

/** Ant speed in pixels/second */
export const ANT_SPEED = 60;

/** Colony visual radius */
export const COLONY_RADIUS = 30;

/** Food pickup distance */
export const PICKUP_DISTANCE = 12;

/** Colony delivery distance */
export const DELIVERY_DISTANCE = 35;

/** Max ants allowed */
export const MAX_ANTS = 200;

/** Winter food multiplier (seasonal spawn) */
export const SEASONAL_FOOD_MULT: Record<Season, number> = {
  spring: 1.0,
  summer: 1.5,
  autumn: 0.7,
  winter: 0.0,
};

/** Winter starvation damage (food deficit -> ant loss) */
export const STARVATION_RATE = 0.5;

/** Seasonal auto-spawn interval in seconds */
export const AUTO_FOOD_INTERVAL = 8;

/** How much food an auto-spawned source gets */
export const AUTO_FOOD_AMOUNT = 40;
