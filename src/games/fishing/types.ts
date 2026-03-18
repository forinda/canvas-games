/** Rarity tiers for fish species */
export type FishRarity = 'common' | 'uncommon' | 'rare' | 'legendary';

/** Catch phase state machine */
export type CatchPhase = 'idle' | 'casting' | 'waiting' | 'hooking' | 'reeling';

/** Definition of a fish species */
export interface Fish {
  name: string;
  rarity: FishRarity;
  /** Min/max size in cm */
  sizeRange: [number, number];
  icon: string;
  color: string;
  /** Base points awarded on catch */
  points: number;
  /** Probability weight (lower = rarer) */
  weight: number;
  /** How hard the fish fights (0-1), affects reel tension */
  fight: number;
}

/** A specific caught fish instance */
export interface CaughtFish {
  fish: Fish;
  size: number;
  timestamp: number;
}

/** Serializable catalog entry for localStorage */
export interface CatalogEntry {
  name: string;
  count: number;
  bestSize: number;
  totalPoints: number;
  firstCaught: number;
}

/** Complete game state */
export interface FishingState {
  phase: CatchPhase;
  /** Canvas dimensions */
  width: number;
  height: number;

  /* Casting */
  castPower: number;       // 0-1 power meter
  castCharging: boolean;
  castDistance: number;     // resulting distance 0-1

  /* Waiting */
  waitTimer: number;       // seconds until bite
  waitElapsed: number;
  bobberX: number;
  bobberY: number;
  bobberBobTime: number;   // animation accumulator
  fishBiting: boolean;

  /* Hooking */
  hookWindowTimer: number; // seconds remaining to click
  hookWindowDuration: number;
  hookSuccess: boolean;

  /* Reeling */
  reelTension: number;     // 0-1, green zone is 0.3-0.7
  reelProgress: number;    // 0-1, fish reeled in
  reelHolding: boolean;
  currentFish: Fish | null;
  currentFishSize: number;
  fishFightTimer: number;
  fishFightDir: number;    // -1 or 1

  /* Results */
  lastCatch: CaughtFish | null;
  catchPopupTimer: number;

  /* Catalog / Score */
  catalog: Map<string, CatalogEntry>;
  totalScore: number;
  totalCaught: number;

  /* UI */
  paused: boolean;
  showCatalog: boolean;
  time: number;            // total elapsed time for animations

  /* Water animation */
  waterOffset: number;
}

export const RARITY_COLORS: Record<FishRarity, string> = {
  common: '#aaaaaa',
  uncommon: '#4fc3f7',
  rare: '#ab47bc',
  legendary: '#ffd54f',
};

export const STORAGE_KEY = 'fishing_catalog';
export const SCORE_KEY = 'fishing_highscore';
