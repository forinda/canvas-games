/** Represents a purchasable upgrade that generates coins per second */
export interface Upgrade {
  id: string;
  name: string;
  icon: string;
  baseCost: number;
  costMultiplier: number;
  /** Coins per second this upgrade generates (per unit owned) */
  cps: number;
  owned: number;
}

/** A click particle for visual feedback */
export interface ClickParticle {
  x: number;
  y: number;
  text: string;
  alpha: number;
  vy: number;
  life: number;
}

/** Full game state for the idle clicker */
export interface IdleState {
  coins: number;
  totalCoinsEarned: number;
  totalClicks: number;
  clickPower: number;
  cps: number;
  upgrades: Upgrade[];
  particles: ClickParticle[];
  /** Center coin button bounds */
  coinButton: { x: number; y: number; radius: number };
  /** Pulse animation scalar */
  coinPulse: number;
  /** Shop scroll offset */
  shopScroll: number;
  /** Canvas dimensions */
  width: number;
  height: number;
  /** Time accumulator for auto-save */
  saveTimer: number;
  /** Whether the help overlay is visible */
  helpVisible: boolean;
}

/** localStorage key for persisting progress */
export const SAVE_KEY = 'idle_clicker_save';

/** Auto-save interval in seconds */
export const AUTO_SAVE_INTERVAL = 30;

/** Shop panel width ratio */
export const SHOP_WIDTH_RATIO = 0.32;

/** Minimum shop panel width */
export const SHOP_MIN_WIDTH = 280;

/** Maximum shop panel width */
export const SHOP_MAX_WIDTH = 420;

/** Background color tiers based on total coins earned */
export const BG_TIERS: { threshold: number; from: string; to: string }[] = [
  { threshold: 0, from: '#1a1a2e', to: '#16213e' },
  { threshold: 1_000, from: '#1a1a3e', to: '#0f3460' },
  { threshold: 100_000, from: '#1b1b4e', to: '#533483' },
  { threshold: 10_000_000, from: '#2d1b4e', to: '#e94560' },
  { threshold: 1_000_000_000, from: '#4a0e0e', to: '#ffc107' },
];
