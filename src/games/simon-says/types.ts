/** Simon Says color type */
export type Color = 'red' | 'green' | 'blue' | 'yellow';

/** Game phase */
export type Phase = 'showing' | 'input' | 'gameover';

/** Full game state */
export interface SimonState {
  /** The sequence of colors the player must repeat */
  sequence: Color[];
  /** Current round (1-indexed, equals sequence length) */
  round: number;
  /** Index into sequence[] during showing or input phase */
  currentStep: number;
  /** Current game phase */
  phase: Phase;
  /** Whether the game has started */
  started: boolean;
  /** High score (longest round reached) */
  highScore: number;
  /** Which color is currently flashing (null if none) */
  activeColor: Color | null;
  /** Timer tracking flash/gap durations during showing phase (ms) */
  showTimer: number;
  /** Whether we are in the gap between flashes (no color lit) */
  inGap: boolean;
  /** Timestamp of last player input flash start */
  inputFlashTimer: number;
  /** Canvas width */
  canvasW: number;
  /** Canvas height */
  canvasH: number;
}

/** All four colors in order */
export const COLORS: Color[] = ['red', 'green', 'blue', 'yellow'];

/** Color hex values for rendering */
export const COLOR_MAP: Record<Color, string> = {
  red: '#e53935',
  green: '#43a047',
  blue: '#1e88e5',
  yellow: '#fdd835',
};

/** Dimmed color hex values when not active */
export const COLOR_DIM_MAP: Record<Color, string> = {
  red: '#7f1d1d',
  green: '#14532d',
  blue: '#1e3a5f',
  yellow: '#78350f',
};

/** Bright color hex values when flashing */
export const COLOR_BRIGHT_MAP: Record<Color, string> = {
  red: '#ff8a80',
  green: '#69f0ae',
  blue: '#82b1ff',
  yellow: '#ffff8d',
};

/** Base flash duration in ms (decreases with rounds) */
export const BASE_FLASH_DURATION = 600;

/** Minimum flash duration in ms */
export const MIN_FLASH_DURATION = 200;

/** Gap between flashes in ms */
export const GAP_DURATION = 150;

/** Duration of the player input flash in ms */
export const INPUT_FLASH_DURATION = 250;

/** Flash duration reduction per round in ms */
export const FLASH_REDUCTION_PER_ROUND = 30;

/** localStorage key for high score */
export const LS_HIGH_SCORE_KEY = 'simon_says_high_score';

/** Game theme color */
export const GAME_COLOR = '#4caf50';
