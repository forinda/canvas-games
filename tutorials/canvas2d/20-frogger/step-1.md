# Step 1: Grid & Frog

**Goal:** Draw the 13-row lane-based grid and place a frog at the bottom that hops one cell per arrow key press.

**Time:** ~15 minutes

---

## What You'll Build

Foundation elements:
- **13-row grid**: Goal row, river lanes, safe zone, road lanes, start zone
- **Color-coded lanes**: Each lane type has a distinct color
- **Frog sprite**: Green circle with eyes at the bottom center
- **Arrow key movement**: Hop one cell in any direction
- **Boundary clamping**: Frog stays within the grid

---

## Concepts

- **Lane-based layout**: Each row has a `kind` that determines its color and behavior
- **Grid coordinates**: Frog position stored as `(col, row)`, converted to pixels for drawing
- **Discrete movement**: One key press = one cell hop (no sub-cell positions)
- **Cell dimensions**: `cellW = canvasWidth / COLS`, `cellH = canvasHeight / ROWS`

---

## Code

### 1. Create Types

**File:** `src/contexts/canvas2d/games/frogger/types.ts`

Define the grid constants and core state shape:

```typescript
// ── Grid & layout constants ────────────────────────────────────────

export const COLS = 13;
export const ROWS = 13; // 0=goal, 1–5=river, 6=safe, 7–11=road, 12=start

// ── Lane type identifiers ──────────────────────────────────────────

export type LaneKind = 'goal' | 'river' | 'safe' | 'road' | 'start';

export type Direction = -1 | 1; // -1 = left, 1 = right

// ── Lane descriptor ────────────────────────────────────────────────

export interface LaneDescriptor {
  kind: LaneKind;
  speed: number;        // pixels-per-second (0 for static lanes)
  direction: Direction;
}

// ── Runtime objects ────────────────────────────────────────────────

export interface Frog {
  col: number;
  row: number;
}

// ── Master state ───────────────────────────────────────────────────

export interface FroggerState {
  frog: Frog;
  lanes: LaneDescriptor[];

  cellW: number;
  cellH: number;
  canvasW: number;
  canvasH: number;
}
```

---

### 2. Create Lane Data

**File:** `src/contexts/canvas2d/games/frogger/data/levels.ts`

Define the 13-row layout. Speeds are zero for now — we will add movement in later steps:

```typescript
import type { LaneDescriptor } from '../types';

export function buildLanes(): LaneDescriptor[] {
  return [
    // Row 0 — goal (lily-pad row)
    { kind: 'goal', speed: 0, direction: 1 },

    // Rows 1–5 — river
    { kind: 'river', speed: 0, direction: -1 },
    { kind: 'river', speed: 0, direction: 1 },
    { kind: 'river', speed: 0, direction: -1 },
    { kind: 'river', speed: 0, direction: 1 },
    { kind: 'river', speed: 0, direction: -1 },

    // Row 6 — safe zone (median)
    { kind: 'safe', speed: 0, direction: 1 },

    // Rows 7–11 — road
    { kind: 'road', speed: 0, direction: -1 },
    { kind: 'road', speed: 0, direction: 1 },
    { kind: 'road', speed: 0, direction: -1 },
    { kind: 'road', speed: 0, direction: 1 },
    { kind: 'road', speed: 0, direction: -1 },

    // Row 12 — start zone
    { kind: 'start', speed: 0, direction: 1 },
  ];
}
```

---

### 3. Create Game Renderer

**File:** `src/contexts/canvas2d/games/frogger/renderers/GameRenderer.ts`

Draw each lane with its color, then draw the frog:

```typescript
import type { FroggerState } from '../types';

const ROAD_COLOR = '#555555';
const RIVER_COLOR = '#1565c0';
const GRASS_COLOR = '#388e3c';
const START_COLOR = '#2e7d32';
const GOAL_COLOR = '#1b5e20';

export class GameRenderer {
  render(ctx: CanvasRenderingContext2D, state: FroggerState): void {
    const cw = state.cellW;
    const ch = state.cellH;

    // ── Draw lanes ──────────────────────────────────────────────
    for (let row = 0; row < state.lanes.length; row++) {
      const lane = state.lanes[row];
      const y = row * ch;

      switch (lane.kind) {
        case 'road':
          ctx.fillStyle = ROAD_COLOR;
          ctx.fillRect(0, y, state.canvasW, ch);
          // Dashed lane markings
          ctx.setLineDash([cw * 0.4, cw * 0.4]);
          ctx.strokeStyle = '#999';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(0, y + ch);
          ctx.lineTo(state.canvasW, y + ch);
          ctx.stroke();
          ctx.setLineDash([]);
          break;

        case 'river':
          ctx.fillStyle = RIVER_COLOR;
          ctx.fillRect(0, y, state.canvasW, ch);
          // Water wave lines
          ctx.strokeStyle = 'rgba(255,255,255,0.12)';
          ctx.lineWidth = 1;
          for (let wx = 0; wx < state.canvasW; wx += cw * 0.8) {
            ctx.beginPath();
            ctx.moveTo(wx, y + ch * 0.5);
            ctx.quadraticCurveTo(wx + cw * 0.2, y + ch * 0.3, wx + cw * 0.4, y + ch * 0.5);
            ctx.stroke();
          }
          break;

        case 'safe':
          ctx.fillStyle = GRASS_COLOR;
          ctx.fillRect(0, y, state.canvasW, ch);
          break;

        case 'start':
          ctx.fillStyle = START_COLOR;
          ctx.fillRect(0, y, state.canvasW, ch);
          break;

        case 'goal':
          ctx.fillStyle = GOAL_COLOR;
          ctx.fillRect(0, y, state.canvasW, ch);
          break;
      }
    }

    // ── Draw frog ───────────────────────────────────────────────
    this.drawFrog(ctx, state);
  }

  private drawFrog(ctx: CanvasRenderingContext2D, state: FroggerState): void {
    const frog = state.frog;
    const cw = state.cellW;
    const ch = state.cellH;
    const fx = frog.col * cw + cw * 0.5;
    const fy = frog.row * ch + ch * 0.5;

    // Body
    const bodyR = cw * 0.35;
    ctx.fillStyle = '#66bb6a';
    ctx.beginPath();
    ctx.arc(fx, fy, bodyR, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = '#fff';
    const eyeR = cw * 0.1;
    const eyeOff = cw * 0.15;
    ctx.beginPath();
    ctx.arc(fx - eyeOff, fy - eyeOff, eyeR, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(fx + eyeOff, fy - eyeOff, eyeR, 0, Math.PI * 2);
    ctx.fill();

    // Pupils
    ctx.fillStyle = '#222';
    const pupilR = cw * 0.04;
    ctx.beginPath();
    ctx.arc(fx - eyeOff, fy - eyeOff, pupilR, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(fx + eyeOff, fy - eyeOff, pupilR, 0, Math.PI * 2);
    ctx.fill();
  }
}
```

**Visual details:**
- Road lanes: dark gray with dashed lane markings
- River lanes: blue with subtle wave lines
- Safe/start zones: shades of green
- Frog: green circle with two white eyes and dark pupils

---

### 4. Create Input System

**File:** `src/contexts/canvas2d/games/frogger/systems/InputSystem.ts`

Listen for arrow keys and WASD. Move the frog by one cell, clamped to the grid:

```typescript
import type { FroggerState } from '../types';
import { COLS, ROWS } from '../types';

export class InputSystem {
  private state: FroggerState;
  private onExit: () => void;
  private keyHandler: (e: KeyboardEvent) => void;

  constructor(state: FroggerState, onExit: () => void) {
    this.state = state;
    this.onExit = onExit;
    this.keyHandler = (e: KeyboardEvent) => this.handleKey(e);
  }

  attach(): void {
    window.addEventListener('keydown', this.keyHandler);
  }

  detach(): void {
    window.removeEventListener('keydown', this.keyHandler);
  }

  private handleKey(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      this.onExit();
      return;
    }

    let dc = 0;
    let dr = 0;

    switch (e.key) {
      case 'ArrowUp':    case 'w': case 'W': dr = -1; break;
      case 'ArrowDown':  case 's': case 'S': dr = 1;  break;
      case 'ArrowLeft':  case 'a': case 'A': dc = -1; break;
      case 'ArrowRight': case 'd': case 'D': dc = 1;  break;
      default: return;
    }

    e.preventDefault();

    const newCol = this.state.frog.col + dc;
    const newRow = this.state.frog.row + dr;

    // Clamp to grid boundaries
    if (newCol < 0 || newCol >= COLS) return;
    if (newRow < 0 || newRow >= ROWS) return;

    this.state.frog.col = newCol;
    this.state.frog.row = newRow;
  }
}
```

**Movement pattern:**
- Each key press instantly moves the frog by exactly one cell
- Boundary checks prevent the frog from leaving the grid
- `preventDefault` stops the page from scrolling

---

### 5. Create Game Engine

**File:** `src/contexts/canvas2d/games/frogger/FroggerEngine.ts`

Initialize state, wire up systems, and run the render loop:

```typescript
import type { FroggerState } from './types';
import { COLS, ROWS } from './types';
import { buildLanes } from './data/levels';
import { InputSystem } from './systems/InputSystem';
import { GameRenderer } from './renderers/GameRenderer';

export class FroggerEngine {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private state: FroggerState;
  private running: boolean;
  private rafId: number;

  private inputSystem: InputSystem;
  private gameRenderer: GameRenderer;

  constructor(canvas: HTMLCanvasElement, onExit: () => void) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.running = false;
    this.rafId = 0;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const cellW = canvas.width / COLS;
    const cellH = canvas.height / ROWS;

    this.state = {
      frog: {
        col: Math.floor(COLS / 2),
        row: ROWS - 1,
      },
      lanes: buildLanes(),
      cellW,
      cellH,
      canvasW: canvas.width,
      canvasH: canvas.height,
    };

    this.inputSystem = new InputSystem(this.state, onExit);
    this.gameRenderer = new GameRenderer();
  }

  start(): void {
    this.running = true;
    this.inputSystem.attach();
    this.loop();
  }

  destroy(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
    this.inputSystem.detach();
  }

  private loop = (): void => {
    if (!this.running) return;

    this.render();
    this.rafId = requestAnimationFrame(this.loop);
  };

  private render(): void {
    this.ctx.clearRect(0, 0, this.state.canvasW, this.state.canvasH);
    this.gameRenderer.render(this.ctx, this.state);
  }
}
```

---

### 6. Create Platform Adapter

**File:** `src/contexts/canvas2d/games/frogger/adapters/PlatformAdapter.ts`

```typescript
import type { GameInstance } from '@core/GameInterface';
import { FroggerEngine } from '../FroggerEngine';

export class PlatformAdapter implements GameInstance {
  private engine: FroggerEngine;

  constructor(canvas: HTMLCanvasElement, onExit: () => void) {
    this.engine = new FroggerEngine(canvas, onExit);
  }

  start(): void {
    this.engine.start();
  }

  destroy(): void {
    this.engine.destroy();
  }
}
```

---

### 7. Create Game Export

**File:** `src/contexts/canvas2d/games/frogger/index.ts`

```typescript
import type { GameDefinition } from '@core/GameInterface';
import { PlatformAdapter } from './adapters/PlatformAdapter';

export const FroggerGame: GameDefinition = {
  id: 'frogger',
  name: 'Frogger',
  description: 'Guide the frog across busy roads and rivers!',
  icon: '🐸',
  color: '#4caf50',
  category: 'arcade' as const,
  help: {
    goal: 'Guide the frog across traffic and rivers to reach all 5 lily pads.',
    controls: [
      { key: 'Arrow Keys / WASD', action: 'Hop one cell in that direction' },
      { key: 'ESC', action: 'Exit to menu' },
    ],
    tips: [
      'Use arrow keys or WASD to move one cell at a time',
    ],
  },
  create(canvas, onExit) {
    const instance = new PlatformAdapter(canvas, onExit);
    instance.start();
    return instance;
  },
};
```

---

## Test It

1. **Run:** `npm run dev`
2. **Navigate:** Select "Frogger"
3. **Observe:**
   - 13 colored rows: dark green goal at top, blue river lanes, green safe zone, gray road lanes, green start zone at bottom
   - Frog (green circle with eyes) centered on the bottom row
   - Arrow keys / WASD hop the frog one cell at a time
   - Frog cannot move outside the grid boundaries
   - Dashed lane markings on road, wave lines on river

---

## Challenges

**Easy:**
- Change the frog color to yellow
- Make the grid 15 columns wide instead of 13
- Add a darker border around each lane

**Medium:**
- Add a hop animation (frog slides between cells over 100ms)
- Draw grid lines over the entire board
- Make the frog face the direction it last moved

**Hard:**
- Add a subtle bounce effect to the frog on each hop
- Draw grass tufts on the safe zone and start zone
- Animate the river wave lines

---

## What You Learned

- Lane-based level layout with a `LaneDescriptor` array
- Grid coordinate system: `col`/`row` mapped to pixel positions
- Discrete one-cell movement via keyboard input
- Canvas drawing with multiple fill styles per lane type
- Boundary clamping to keep the player inside the grid

**Next:** Road lanes with scrolling vehicles!
