# Step 1: Project Setup & Map Rendering

**Goal:** Draw a grid-based map with a winding path from entry to exit, using a dark terrain palette and distinct path/start/end cell colors.

**Time:** ~15 minutes

---

## What You'll Build

- **16x10 tile grid** rendered with alternating dark green tones for empty cells
- **Waypoint-based path** painted in sandy brown, winding across the map
- **Start and End markers** colored green and red so the player knows where enemies enter and exit
- **Responsive layout** that reserves space for a HUD bar at the top and a tower panel at the bottom
- **Full type definitions** for every entity the game will use across all steps

---

## Concepts

- **Grid-Based Map**: The playing field is a 16-column by 10-row grid. Each cell has a type: `empty`, `path`, `tower`, `start`, or `end`. Towers can only be placed on `empty` cells.
- **Waypoint Path**: Instead of free-form pathfinding, the enemy route is defined as a series of anchor points (waypoints). Straight lines between consecutive waypoints mark path cells. This makes rendering and enemy movement predictable.
- **Cell-Size Scaling**: `cellSize = Math.min(canvasWidth / cols, availableHeight / rows)` ensures the grid fits any screen while keeping cells square.
- **Checkerboard Shading**: Alternating two very similar dark greens on empty cells (`(col + row) % 2`) adds subtle depth without distracting from gameplay.

---

## Code

### 1. Create Types

**File:** `src/contexts/canvas2d/games/tower-defense/types/index.ts`

All types for every step, defined up front so later files never need restructuring.

```typescript
// ─── Enums & Literals ─────────────────────────────────────────────────────────

export type Screen = 'menu' | 'modeSelect' | 'playing' | 'paused' | 'gameover' | 'win';
export type GameMode = 'classic' | 'endless' | 'challenge';
export type CellType = 'empty' | 'path' | 'tower' | 'start' | 'end';
export type TowerType = 'archer' | 'cannon' | 'frost' | 'sniper';
export type EnemyType = 'goblin' | 'orc' | 'ghost' | 'boss';
export type ProjectileType = 'arrow' | 'cannonball' | 'frostbolt' | 'bullet';

// ─── Grid ─────────────────────────────────────────────────────────────────────

export interface GridCoord {
  col: number;
  row: number;
}

export interface Cell {
  col: number;
  row: number;
  type: CellType;
  towerId: string | null;
}

// ─── Towers ───────────────────────────────────────────────────────────────────

export interface TowerDef {
  type: TowerType;
  name: string;
  cost: number;
  damage: number;
  range: number;
  fireInterval: number;
  projectileType: ProjectileType;
  projectileSpeed: number;
  splashRadius: number;
  slowFactor: number;
  color: string;
  icon: string;
  upgradeCostMultiplier: number;
}

export interface PlacedTower {
  id: string;
  type: TowerType;
  col: number;
  row: number;
  level: number;
  totalInvested: number;
  lastFiredAt: number;
  targetId: string | null;
}

// ─── Enemies ──────────────────────────────────────────────────────────────────

export interface EnemyDef {
  type: EnemyType;
  name: string;
  baseHp: number;
  baseSpeed: number;
  reward: number;
  color: string;
  icon: string;
  immuneToSlow: boolean;
  size: number;
}

export interface ActiveEnemy {
  id: string;
  type: EnemyType;
  hp: number;
  maxHp: number;
  speed: number;
  baseSpeed: number;
  slowUntil: number;
  reward: number;
  waypointIndex: number;
  progress: number;
  x: number;
  y: number;
  dead: boolean;
  reachedEnd: boolean;
  hpBarTimer: number;
}

// ─── Projectiles ──────────────────────────────────────────────────────────────

export interface Projectile {
  id: string;
  type: ProjectileType;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  x: number;
  y: number;
  speed: number;
  damage: number;
  splashRadius: number;
  slowFactor: number;
  targetId: string;
  done: boolean;
  color: string;
}

// ─── Waves ────────────────────────────────────────────────────────────────────

export interface SpawnGroup {
  enemyType: EnemyType;
  count: number;
  interval: number;
  hpMultiplier?: number;
  speedMultiplier?: number;
}

export interface WaveDef {
  waveNumber: number;
  groups: SpawnGroup[];
  preBossAnnounce?: boolean;
}

// ─── Particles ────────────────────────────────────────────────────────────────

export interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
  decay: number;
  done: boolean;
}

// ─── Damage Numbers ──────────────────────────────────────────────────────

export interface DamageNumber {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
  alpha: number;
  age: number;
}

// ─── Game State ───────────────────────────────────────────────────────────────

export interface GameStateData {
  screen: Screen;
  mode: GameMode;
  lives: number;
  maxLives: number;
  gold: number;
  score: number;
  highScore: number;
  currentWave: number;
  totalWaves: number;
  waveInProgress: boolean;
  betweenWaveCountdown: number;
  grid: Cell[][];
  towers: PlacedTower[];
  enemies: ActiveEnemy[];
  projectiles: Projectile[];
  particles: Particle[];
  selectedTowerType: TowerType | null;
  selectedPlacedTowerId: string | null;
  hoveredCell: GridCoord | null;
  spawnQueue: SpawnQueueItem[];
  lastSpawnTime: number;
  pausedAt: number;
  bossAnnounceUntil: number;
  damageNumbers: DamageNumber[];
  placementFail: { col: number; row: number; timer: number } | null;
  pendingSellTowerId: string | null;
}

export interface SpawnQueueItem {
  enemyType: EnemyType;
  scheduledAt: number;
  hpMultiplier: number;
  speedMultiplier: number;
}

// ─── Canvas Config ────────────────────────────────────────────────────────────

export interface CanvasConfig {
  cols: number;
  rows: number;
  hudHeight: number;
  panelHeight: number;
}
```

**What's happening:**
- `CellType` distinguishes five kinds of cells. The grid renderer will color each one differently.
- `ActiveEnemy` tracks runtime state like `waypointIndex` and `progress` so each enemy knows where it is along the path. We define these now but won't use them until Step 2.
- `GameStateData` is the single source of truth for the entire game. Every system reads and writes to this one object. Defining everything up front means we never restructure later.
- `PlacedTower` separates instance data (position, level, investment) from the blueprint (`TowerDef`), following the flyweight pattern.

---

### 2. Create the Path System

**File:** `src/contexts/canvas2d/games/tower-defense/systems/PathSystem.ts`

Defines the waypoint path and helper functions for enemy movement (used in Step 2).

```typescript
import type { GridCoord, ActiveEnemy } from '../types';

export const GRID_COLS = 16;
export const GRID_ROWS = 10;

/**
 * Path waypoints: a series of anchor points the path follows.
 * The path winds across the 16x10 grid:
 *   (0,1) -> (5,1) -> (5,7) -> (10,7) -> (10,3) -> (14,3) -> (14,8) -> (15,8)
 */
export const PATH_WAYPOINTS: GridCoord[] = [
  { col: 0, row: 1 },   // start
  { col: 5, row: 1 },
  { col: 5, row: 7 },
  { col: 10, row: 7 },
  { col: 10, row: 3 },
  { col: 14, row: 3 },
  { col: 14, row: 8 },
  { col: 15, row: 8 },  // end
];

/** Convert an enemy's waypoint position to pixel coordinates */
export function getEnemyPixelPos(
  enemy: ActiveEnemy,
  cellSize: number,
  offsetY: number,
): { x: number; y: number } {
  const wpIdx = enemy.waypointIndex;

  if (wpIdx <= 0) {
    const wp = PATH_WAYPOINTS[0];
    return {
      x: wp.col * cellSize + cellSize / 2,
      y: offsetY + wp.row * cellSize + cellSize / 2,
    };
  }

  const from = PATH_WAYPOINTS[wpIdx - 1];
  const to = PATH_WAYPOINTS[Math.min(wpIdx, PATH_WAYPOINTS.length - 1)];
  const t = enemy.progress;

  return {
    x: (from.col + (to.col - from.col) * t) * cellSize + cellSize / 2,
    y: offsetY + (from.row + (to.row - from.row) * t) * cellSize + cellSize / 2,
  };
}

/** Advance enemy along the path. Returns true if reached end. */
export function advanceEnemy(enemy: ActiveEnemy, distanceCells: number): boolean {
  let remaining = distanceCells;

  while (remaining > 0 && enemy.waypointIndex < PATH_WAYPOINTS.length) {
    const from = PATH_WAYPOINTS[enemy.waypointIndex - 1];
    const to = PATH_WAYPOINTS[enemy.waypointIndex];
    const segLen = Math.abs(to.col - from.col) + Math.abs(to.row - from.row);
    const progressLeft = 1 - enemy.progress;
    const progressNeeded = remaining / segLen;

    if (progressNeeded < progressLeft) {
      enemy.progress += progressNeeded;
      remaining = 0;
    } else {
      remaining -= progressLeft * segLen;
      enemy.waypointIndex++;
      enemy.progress = 0;

      if (enemy.waypointIndex >= PATH_WAYPOINTS.length) {
        return true;
      }
    }
  }

  return false;
}

/** Path progress score (higher = further along). Used for tower targeting. */
export function pathProgress(enemy: ActiveEnemy): number {
  return enemy.waypointIndex + enemy.progress;
}
```

**What's happening:**
- `GRID_COLS = 16` and `GRID_ROWS = 10` define the map dimensions. The path winds through 8 waypoints creating an S-shaped route.
- `getEnemyPixelPos` interpolates between two consecutive waypoints using the enemy's `progress` (0-1) to produce exact pixel coordinates. The `cellSize / 2` offset centers enemies within cells.
- `advanceEnemy` moves an enemy forward by `distanceCells` each frame, automatically advancing to the next waypoint segment when one is completed. It returns `true` when the enemy exits the map.
- `pathProgress` returns a single number representing how far along the path an enemy is. Towers will use this to prioritize the enemy closest to the exit (the "first" targeting strategy).

---

### 3. Create the Grid System

**File:** `src/contexts/canvas2d/games/tower-defense/systems/GridSystem.ts`

Handles layout calculations and pixel-to-grid conversions.

```typescript
import type { Cell, GameStateData, GridCoord } from '../types';
import { GRID_COLS, GRID_ROWS } from './PathSystem';

export class GridSystem {
  cellSize: number = 0;
  gridOffsetY: number = 0;
  panelHeight: number = 0;

  /** Recalculate cell size when the canvas resizes */
  updateLayout(
    canvasWidth: number,
    canvasHeight: number,
    hudHeight: number,
    panelH: number,
  ) {
    this.panelHeight = panelH;
    this.gridOffsetY = hudHeight;
    const availH = canvasHeight - hudHeight - panelH;
    const cellByWidth = Math.floor(canvasWidth / GRID_COLS);
    const cellByHeight = Math.floor(availH / GRID_ROWS);
    this.cellSize = Math.min(cellByWidth, cellByHeight);
  }

  /** Convert pixel coordinates to a grid cell */
  pixelToCell(px: number, py: number): GridCoord | null {
    if (py < this.gridOffsetY) return null;
    const col = Math.floor(px / this.cellSize);
    const row = Math.floor((py - this.gridOffsetY) / this.cellSize);
    if (col < 0 || col >= GRID_COLS || row < 0 || row >= GRID_ROWS) return null;
    return { col, row };
  }

  /** Pixel center of a grid cell */
  cellCenter(col: number, row: number): { x: number; y: number } {
    return {
      x: col * this.cellSize + this.cellSize / 2,
      y: this.gridOffsetY + row * this.cellSize + this.cellSize / 2,
    };
  }

  /** Top-left pixel of a cell */
  cellOrigin(col: number, row: number): { x: number; y: number } {
    return {
      x: col * this.cellSize,
      y: this.gridOffsetY + row * this.cellSize,
    };
  }

  getCell(state: GameStateData, col: number, row: number): Cell | null {
    return state.grid[row]?.[col] ?? null;
  }

  canPlaceTower(state: GameStateData, col: number, row: number): boolean {
    const cell = this.getCell(state, col, row);
    if (!cell) return false;
    return cell.type === 'empty' && cell.towerId === null;
  }
}
```

**What's happening:**
- `updateLayout` takes the canvas dimensions plus reserved heights for the HUD and tower panel, then computes the largest square cell size that fits.
- `pixelToCell` translates a mouse click's pixel position into grid coordinates, returning `null` if outside the grid. This is critical for tower placement in Step 3.
- `cellCenter` and `cellOrigin` are convenience methods used by renderers to position towers, enemies, and projectiles precisely within grid cells.
- `canPlaceTower` enforces the placement rule: only `empty` cells with no existing tower are valid.

---

### 4. Create the Grid State Builder

**File:** `src/contexts/canvas2d/games/tower-defense/GameState.ts`

Builds the initial grid by walking the waypoint list and marking cells as path, start, or end.

```typescript
import type { GameStateData, GameMode, Cell, CellType } from './types';
import { PATH_WAYPOINTS, GRID_COLS, GRID_ROWS } from './systems/PathSystem';

function buildGrid(): Cell[][] {
  const grid: Cell[][] = [];

  for (let row = 0; row < GRID_ROWS; row++) {
    grid[row] = [];
    for (let col = 0; col < GRID_COLS; col++) {
      grid[row][col] = { col, row, type: 'empty', towerId: null };
    }
  }

  // Mark waypoint cells
  for (let i = 0; i < PATH_WAYPOINTS.length; i++) {
    const wp = PATH_WAYPOINTS[i];
    let cellType: CellType = 'path';
    if (i === 0) cellType = 'start';
    else if (i === PATH_WAYPOINTS.length - 1) cellType = 'end';
    grid[wp.row][wp.col].type = cellType;
  }

  // Fill in cells between consecutive waypoints
  for (let i = 0; i < PATH_WAYPOINTS.length - 1; i++) {
    const a = PATH_WAYPOINTS[i];
    const b = PATH_WAYPOINTS[i + 1];
    const dc = Math.sign(b.col - a.col);
    const dr = Math.sign(b.row - a.row);
    let c = a.col + dc;
    let r = a.row + dr;

    while (c !== b.col || r !== b.row) {
      const t = grid[r]?.[c];
      if (t && t.type === 'empty') t.type = 'path';
      c += dc;
      r += dr;
    }
  }

  return grid;
}

export function createInitialState(mode: GameMode): GameStateData {
  return {
    screen: 'playing',
    mode,
    lives: 20,
    maxLives: 20,
    gold: 200,
    score: 0,
    highScore: 0,
    currentWave: 0,
    totalWaves: 10,
    waveInProgress: false,
    betweenWaveCountdown: 0,
    grid: buildGrid(),
    towers: [],
    enemies: [],
    projectiles: [],
    particles: [],
    selectedTowerType: null,
    selectedPlacedTowerId: null,
    hoveredCell: null,
    spawnQueue: [],
    lastSpawnTime: 0,
    pausedAt: 0,
    bossAnnounceUntil: 0,
    damageNumbers: [],
    placementFail: null,
    pendingSellTowerId: null,
  };
}
```

**What's happening:**
- `buildGrid()` creates a 10x16 two-dimensional array of cells, all starting as `empty`. It then walks the waypoint array twice: first to stamp the waypoint cells themselves, then to fill the straight-line segments between consecutive waypoints.
- The `while` loop uses `Math.sign` to step one cell at a time in the correct direction (horizontal or vertical). Since waypoints are always axis-aligned, only one of `dc`/`dr` is nonzero at a time.
- `createInitialState` bundles the freshly built grid with default game values: 20 lives, 200 gold, classic mode. Every array starts empty because no enemies, towers, or projectiles exist yet.

---

### 5. Create the Grid Renderer

**File:** `src/contexts/canvas2d/games/tower-defense/renderers/GridRenderer.ts`

Draws the map: empty cells, path, start/end markers, and grid lines.

```typescript
import type { GameStateData } from '../types';
import type { GridSystem } from '../systems/GridSystem';
import { GRID_COLS, GRID_ROWS } from '../systems/PathSystem';

const COLORS = {
  empty: '#1a2a1a',
  emptyAlt: '#182418',
  path: '#c8a96e',
  pathEdge: '#b8924a',
  start: '#2ecc71',
  end: '#e74c3c',
  hover: 'rgba(255,255,255,0.18)',
  grid: 'rgba(255,255,255,0.04)',
};

export class GridRenderer {
  render(
    ctx: CanvasRenderingContext2D,
    state: GameStateData,
    grid: GridSystem,
  ): void {
    const cs = grid.cellSize;
    const oy = grid.gridOffsetY;

    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const cell = state.grid[row][col];
        const x = col * cs;
        const y = oy + row * cs;

        // Base cell color
        let fillColor: string;
        switch (cell.type) {
          case 'path':
            fillColor = COLORS.path;
            break;
          case 'start':
            fillColor = COLORS.start;
            break;
          case 'end':
            fillColor = COLORS.end;
            break;
          default:
            fillColor = (col + row) % 2 === 0 ? COLORS.empty : COLORS.emptyAlt;
        }

        ctx.fillStyle = fillColor;
        ctx.fillRect(x, y, cs, cs);

        // Border highlights for path cells
        if (cell.type === 'path' || cell.type === 'start' || cell.type === 'end') {
          ctx.strokeStyle = COLORS.pathEdge;
          ctx.lineWidth = 1;
          ctx.strokeRect(x + 0.5, y + 0.5, cs - 1, cs - 1);
        } else {
          ctx.strokeStyle = COLORS.grid;
          ctx.lineWidth = 1;
          ctx.strokeRect(x + 0.5, y + 0.5, cs - 1, cs - 1);
        }
      }
    }

    // START and END labels
    this.drawLabel(ctx, grid, 0, 1, 'START', '#fff');
    this.drawLabel(ctx, grid, 15, 8, 'END', '#fff');
  }

  private drawLabel(
    ctx: CanvasRenderingContext2D,
    grid: GridSystem,
    col: number,
    row: number,
    text: string,
    color: string,
  ) {
    const center = grid.cellCenter(col, row);
    ctx.fillStyle = color;
    ctx.font = `bold ${Math.max(8, grid.cellSize * 0.28)}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, center.x, center.y);
  }
}
```

**What's happening:**
- The double `for` loop iterates all 160 cells. A `switch` picks the fill color: sandy brown for path, green for start, red for end, and alternating dark greens for empty terrain.
- Path cells get a slightly darker border (`#b8924a`) that creates an inset look. Empty cells get nearly invisible grid lines (`rgba(255,255,255,0.04)`) so they have structure without visual clutter.
- `drawLabel` centers text within a cell. The font scales with `cellSize` to remain readable at all resolutions.
- The `+0.5` pixel offset on `strokeRect` aligns strokes to the pixel grid, preventing blurry sub-pixel rendering on standard displays.

---

### 6. Create the Game Engine

**File:** `src/contexts/canvas2d/games/tower-defense/game-engine.ts`

Ties state, systems, and renderers together into a game loop.

```typescript
import type { GameStateData } from './types';
import { createInitialState } from './GameState';
import { GridSystem } from './systems/GridSystem';
import { GridRenderer } from './renderers/GridRenderer';

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private state: GameStateData;
  private grid: GridSystem;
  private gridRenderer: GridRenderer;
  private rafId = 0;
  private running = false;
  private resizeHandler: () => void;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2D context');
    this.ctx = ctx;

    this.state = createInitialState('classic');
    this.grid = new GridSystem();
    this.gridRenderer = new GridRenderer();

    this.resizeHandler = () => this.handleResize();
    this.handleResize();
    window.addEventListener('resize', this.resizeHandler);
  }

  private handleResize(): void {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    // Reserve 52px for HUD at top, 110px for tower panel at bottom
    this.grid.updateLayout(this.canvas.width, this.canvas.height, 52, 110);
  }

  start(): void {
    this.running = true;
    this.loop();
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
    window.removeEventListener('resize', this.resizeHandler);
  }

  private loop(): void {
    if (!this.running) return;
    this.render();
    this.rafId = requestAnimationFrame(() => this.loop());
  }

  private render(): void {
    const { ctx, canvas, state } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0a140a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    this.gridRenderer.render(ctx, state, this.grid);
  }
}
```

**What's happening:**
- The constructor creates the game state via `createInitialState`, which builds the grid with the path pre-marked. It also initializes the `GridSystem` for layout and the `GridRenderer` for drawing.
- `handleResize` sets the canvas to fill the entire window, then recalculates the grid layout. The 52px and 110px reserves match the HUD and tower panel heights we will add in later steps.
- The game loop is minimal for now: clear the canvas with a dark green-black (`#0a140a`), then draw the grid. No update logic is needed yet because nothing moves.
- `stop()` cleans up by cancelling the animation frame and removing the resize listener, preventing memory leaks.

---

### 7. Create the Entry Point

**File:** `src/contexts/canvas2d/games/tower-defense/index.ts`

```typescript
import { GameEngine } from './game-engine';

export function createTowerDefense(canvas: HTMLCanvasElement): { destroy: () => void } {
  const engine = new GameEngine(canvas);
  engine.start();
  return { destroy: () => engine.stop() };
}
```

---

## Test It

1. **Run:** `npm run dev`
2. **Open:** the Tower Defense game in your browser
3. **Observe:**
   - Dark green background fills the screen
   - A **16x10 grid** is visible with very subtle grid lines on empty cells
   - A **sandy brown path** winds from top-left (column 0, row 1) through an S-curve to bottom-right (column 15, row 8)
   - The **START** cell is bright green, the **END** cell is bright red, both with white labels
   - **Resize the window** and the grid rescales to fit, staying square-celled

---

## Challenges

**Easy:**
- Change `COLORS.path` to `'#8B7355'` for a darker dirt-road look and see how it changes the visual feel.
- Increase `GRID_ROWS` to 12 and add two more waypoints to create a longer winding path.

**Medium:**
- Add a second path color for "bridge" segments (e.g., when the path crosses row 5) by checking the row in the renderer and using a different fill.

**Hard:**
- Make the path cells animate with a subtle marching pattern: shift a striped overlay along the path direction each frame to suggest the direction enemies will walk.

---

## What You Learned

- Defining a complete game state type hierarchy with cells, entities, and layout
- Building a grid from waypoint data by walking axis-aligned segments
- Rendering a tile map with cell-type coloring and checkerboard shading
- Computing responsive layout that reserves space for HUD and panels

**Next:** Enemy Spawning & Pathing -- bring enemies to life and watch them march along the path!
