// ── Gate types ──────────────────────────────────────────────
export type GateType = 'ring' | 'bar' | 'square';

export interface Gate {
  type: GateType;
  y: number;
  rotation: number;
  colors: string[];
  scored: boolean;
}

// ── Ball ────────────────────────────────────────────────────
export interface Ball {
  x: number;
  y: number;
  velocity: number;
  radius: number;
  color: string;
}

// ── Color Switcher ──────────────────────────────────────────
export interface ColorSwitcher {
  x: number;
  y: number;
  radius: number;
  rotation: number;
  consumed: boolean;
}

// ── Game phase ──────────────────────────────────────────────
export type Phase = 'idle' | 'playing' | 'dead';

// ── Top-level state ─────────────────────────────────────────
export interface ColorSwitchState {
  ball: Ball;
  gates: Gate[];
  switchers: ColorSwitcher[];
  phase: Phase;
  score: number;
  bestScore: number;
  canvasW: number;
  canvasH: number;
  flashTimer: number;
  cameraY: number;
}

// ── Constants ───────────────────────────────────────────────
export const GAME_COLORS: string[] = [
  '#f44336', // red
  '#ffeb3b', // yellow
  '#4caf50', // green
  '#2196f3', // blue
];

export const GRAVITY = 0.0018;
export const BOUNCE_FORCE = -0.55;
export const TERMINAL_VELOCITY = 0.8;

export const BALL_RADIUS = 14;
export const BALL_START_Y_RATIO = 0.65;

export const GATE_SPACING = 260;
export const GATE_RING_OUTER = 80;
export const GATE_RING_INNER = 55;
export const GATE_BAR_WIDTH = 220;
export const GATE_BAR_HEIGHT = 20;
export const GATE_SQUARE_SIZE = 140;

export const GATE_ROTATION_SPEED = 0.0012;

export const SWITCHER_RADIUS = 14;
export const SWITCHER_ROTATION_SPEED = 0.004;

export const SCROLL_SPEED = 0.15;

export const HS_KEY = 'color_switch_highscore';
