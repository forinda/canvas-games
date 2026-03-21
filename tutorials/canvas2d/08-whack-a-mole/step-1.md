# Step 1: Project Setup & 3×3 Hole Grid

**Goal:** Draw a grassy field with 9 mole holes arranged in a 3×3 grid.

**Time:** ~15 minutes

---

## What You'll Build

A responsive game board with holes ready for moles to pop out:

```
┌──────────────────────────┐
│     Whack-a-Mole!        │
├──────────────────────────┤
│                          │
│    O    O    O           │
│                          │
│    O    O    O           │
│                          │
│    O    O    O           │
│                          │
└──────────────────────────┘
```

---

## Concepts

- **Grid Layout Math**: Calculate cell positions from rows/columns
- **Ellipse Drawing**: Create oval shapes for holes
- **Responsive Sizing**: Scale grid to fit different screen sizes
- **Background Pattern**: Create a simple grass texture

---

## Code

### 1. Create Type Definitions

**File:** `src/contexts/canvas2d/games/whack-a-mole/types.ts`

```typescript
export const GRID_COLS = 3;
export const GRID_ROWS = 3;
export const GRID_SIZE = GRID_COLS * GRID_ROWS; // 9 holes

export type HoleState = 'empty' | 'rising' | 'up' | 'sinking';
export type Phase = 'ready' | 'playing' | 'gameover';

export interface Hole {
  state: HoleState;
  timer: number; // Time in current state (ms)
  isBomb: boolean; // Whether this is a bomb instead of a mole
  hit: boolean; // Whether player hit this mole
}

export interface Particle {
  x: number;
  y: number;
  vx: number; // Velocity X
  vy: number; // Velocity Y
  life: number; // Remaining lifetime (ms)
  color: string;
  size: number;
}

export interface WhackState {
  holes: Hole[]; // 9 holes in grid
  score: number;
  highScore: number;
  combo: number; // Current streak
  maxCombo: number; // Best streak this round
  timeRemaining: number; // Seconds
  round: number;
  phase: Phase;
  paused: boolean;

  // Animation state
  particles: Particle[];
  hammerEffect: { x: number; y: number; life: number } | null;
  spawnInterval: number; // Time between mole spawns (ms)
  spawnTimer: number; // Time until next spawn
}

// Animation timing (for Step 2)
export const RISE_DURATION = 200; // ms
export const SINK_DURATION = 200;
export const UP_DURATION_BASE = 1200; // Decreases with difficulty

// Game constants
export const ROUND_DURATION = 60; // seconds
export const SPAWN_INTERVAL_BASE = 1200; // ms
export const SPAWN_INTERVAL_MIN = 400; // Fastest spawn rate

// Scoring (for Step 3)
export const MOLE_POINTS = 10;
export const BOMB_PENALTY = 20;
export const HS_KEY = 'whack_mole_high_score';
```

---

### 2. Create Game Renderer

**File:** `src/contexts/canvas2d/games/whack-a-mole/renderers/GameRenderer.ts`

```typescript
import type { WhackState } from '../types';
import { GRID_COLS, GRID_ROWS } from '../types';

export class GameRenderer {
  render(ctx: CanvasRenderingContext2D, state: WhackState): void {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    // Draw grass background
    this.drawBackground(ctx, W, H);

    // Calculate grid dimensions (centered, responsive)
    const gridSize = Math.min(W * 0.8, H * 0.65);
    const cellW = gridSize / GRID_COLS;
    const cellH = gridSize / GRID_ROWS;
    const gridX = (W - gridSize) / 2;
    const gridY = (H - gridSize) / 2 + 60; // Leave space for HUD

    // Draw holes
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const idx = row * GRID_COLS + col;
        const hole = state.holes[idx];
        const cx = gridX + col * cellW + cellW / 2;
        const cy = gridY + row * cellH + cellH / 2;

        this.drawHole(ctx, cx, cy, cellW, cellH);
      }
    }
  }

  private drawBackground(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    // Grass base
    ctx.fillStyle = '#66bb6a';
    ctx.fillRect(0, 0, W, H);

    // Add checkerboard pattern for texture
    ctx.fillStyle = 'rgba(76, 175, 80, 0.3)';
    const squareSize = 40;
    for (let y = 0; y < H; y += squareSize) {
      for (let x = 0; x < W; x += squareSize) {
        if ((x / squareSize + y / squareSize) % 2 === 0) {
          ctx.fillRect(x, y, squareSize, squareSize);
        }
      }
    }
  }

  private drawHole(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    cellW: number,
    cellH: number
  ): void {
    const holeRadiusX = cellW * 0.35;
    const holeRadiusY = cellH * 0.2;

    // Shadow/rim around hole
    ctx.fillStyle = '#1a0f05';
    ctx.beginPath();
    ctx.ellipse(cx, cy + holeRadiusY * 0.3, holeRadiusX * 1.15, holeRadiusY * 1.15, 0, 0, Math.PI * 2);
    ctx.fill();

    // Hole interior (dark brown)
    ctx.fillStyle = '#2a1a0a';
    ctx.beginPath();
    ctx.ellipse(cx, cy + holeRadiusY * 0.5, holeRadiusX, holeRadiusY, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}
```

**Key Details:**
- **Grid Layout**: Centers a `gridSize × gridSize` area on canvas
- **Cell Positions**: `cx = gridX + col * cellW + cellW / 2` calculates center
- **Ellipse Holes**: Wider than tall (oval shape) using `ctx.ellipse()`
- **Checkered Grass**: Alternating squares for simple texture

---

### 3. Create Game Engine

**File:** `src/contexts/canvas2d/games/whack-a-mole/WhackEngine.ts`

```typescript
import type { WhackState, Hole } from './types';
import { GRID_SIZE, SPAWN_INTERVAL_BASE, ROUND_DURATION, HS_KEY } from './types';
import { GameRenderer } from './renderers/GameRenderer';

export class WhackEngine {
  private ctx: CanvasRenderingContext2D;
  private state: WhackState;
  private running: boolean;
  private rafId: number;

  private gameRenderer: GameRenderer;

  constructor(canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
    this.running = false;
    this.rafId = 0;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Load high score
    let highScore = 0;
    try {
      highScore = parseInt(localStorage.getItem(HS_KEY) ?? '0', 10) || 0;
    } catch (e) {
      console.warn('Could not load high score');
    }

    // Initialize 9 empty holes
    const holes: Hole[] = [];
    for (let i = 0; i < GRID_SIZE; i++) {
      holes.push({
        state: 'empty',
        timer: 0,
        isBomb: false,
        hit: false,
      });
    }

    this.state = {
      holes,
      score: 0,
      highScore,
      combo: 0,
      maxCombo: 0,
      timeRemaining: ROUND_DURATION,
      round: 1,
      phase: 'ready',
      paused: false,
      particles: [],
      hammerEffect: null,
      spawnInterval: SPAWN_INTERVAL_BASE,
      spawnTimer: 0,
    };

    this.gameRenderer = new GameRenderer();
  }

  start(): void {
    this.running = true;
    this.loop();
  }

  destroy(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
  }

  private loop(): void {
    if (!this.running) return;
    this.render();
    this.rafId = requestAnimationFrame(() => this.loop());
  }

  private render(): void {
    this.gameRenderer.render(this.ctx, this.state);
  }
}
```

---

### 4. Platform Adapter & Registration

**File:** `src/contexts/canvas2d/games/whack-a-mole/adapters/PlatformAdapter.ts`

```typescript
import type { GameInstance } from '@core/GameInterface';
import { WhackEngine } from '../WhackEngine';

export class PlatformAdapter implements GameInstance {
  private engine: WhackEngine;

  constructor(canvas: HTMLCanvasElement, onExit: () => void) {
    this.engine = new WhackEngine(canvas);
  }

  start(): void {
    this.engine.start();
  }

  destroy(): void {
    this.engine.destroy();
  }
}
```

**File:** `src/contexts/canvas2d/games/whack-a-mole/index.ts`

```typescript
import type { GameDefinition } from '@core/GameInterface';
import { PlatformAdapter } from './adapters/PlatformAdapter';

export const WhackAMoleGame: GameDefinition = {
  id: 'whack-a-mole',
  name: 'Whack-a-Mole',
  description: 'Hit the moles, avoid the bombs!',
  icon: '🔨',
  color: '#66bb6a',
  category: 'action',
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
2. **Navigate:** Select "Whack-a-Mole" from the menu
3. **Expect:**
   - Green grass background with checkered pattern
   - 3×3 grid of dark oval holes
   - Responsive layout (resize to test)

---

## Grid Layout Math

### How Cell Positions Are Calculated:

```
Grid Size: min(80% of width, 65% of height)
Cell Width: gridSize / 3
Cell Height: gridSize / 3

For hole (row=1, col=2):
  x = gridX + 2 * cellW + cellW/2  (center of 3rd column)
  y = gridY + 1 * cellH + cellH/2  (center of 2nd row)
```

### Index Mapping:

```
Row 0: [0, 1, 2]
Row 1: [3, 4, 5]
Row 2: [6, 7, 8]

Index = row * GRID_COLS + col
```

---

## What You Learned

✅ Draw ellipses with `ctx.ellipse()`  
✅ Calculate grid cell positions from rows/columns  
✅ Create textured backgrounds with patterns  
✅ Responsive canvas sizing  
✅ Initialize game state arrays

---

## Next Step

→ [Step 2: Mole Pop-Up & Click Detection](./step-2.md) — Animate moles rising/sinking and detect clicks
