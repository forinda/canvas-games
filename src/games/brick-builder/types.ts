/** Grid cell size in pixels */
export const CELL_SIZE = 32;

/** Grid dimensions in cells */
export const GRID_COLS = 20;
export const GRID_ROWS = 18;

/** Palette panel width */
export const PALETTE_WIDTH = 180;

/** HUD bar height at top */
export const HUD_HEIGHT = 48;

/** Available brick colors */
export const BRICK_COLORS: readonly string[] = [
  '#e53935', // red
  '#fb8c00', // orange
  '#fdd835', // yellow
  '#43a047', // green
  '#1e88e5', // blue
  '#8e24aa', // purple
  '#00acc1', // cyan
  '#f5f5f5', // white
];

/** A brick template: width and height in grid units */
export interface BrickTemplate {
  id: string;
  label: string;
  w: number;
  h: number;
}

/** A placed brick on the grid */
export interface Brick {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  id: number;
}

/** Full game state */
export interface BrickBuilderState {
  /** All placed bricks */
  bricks: Brick[];

  /** Currently selected brick template index */
  selectedTemplateIndex: number;

  /** Currently selected color index */
  selectedColorIndex: number;

  /** Whether the current template is rotated (w/h swapped) */
  rotated: boolean;

  /** Mouse position in canvas coordinates */
  mouseX: number;
  mouseY: number;

  /** Whether mouse is over the grid area */
  mouseOnGrid: boolean;

  /** Snapped grid cell for hover preview */
  hoverGridX: number;
  hoverGridY: number;

  /** Running brick id counter */
  nextBrickId: number;

  /** Total bricks placed (lifetime counter) */
  totalPlaced: number;

  /** Canvas dimensions */
  canvasWidth: number;
  canvasHeight: number;

  /** Grid offset (top-left pixel of the grid area) */
  gridOffsetX: number;
  gridOffsetY: number;

  /** Help overlay visible */
  helpVisible: boolean;
}

/** Create a fresh default state */
export function createInitialState(): BrickBuilderState {
  return {
    bricks: [],
    selectedTemplateIndex: 0,
    selectedColorIndex: 0,
    rotated: false,
    mouseX: 0,
    mouseY: 0,
    mouseOnGrid: false,
    hoverGridX: 0,
    hoverGridY: 0,
    nextBrickId: 1,
    totalPlaced: 0,
    canvasWidth: 0,
    canvasHeight: 0,
    gridOffsetX: 0,
    gridOffsetY: 0,
    helpVisible: false,
  };
}
