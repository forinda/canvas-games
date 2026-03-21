# Step 1: Project Setup & Grid Rendering

**Goal:** Draw a 5×5 grid of colored cells on the canvas.

**Time:** ~15 minutes

---

## What You'll Build

A static grid where each cell is either "on" (yellow) or "off" (dark gray). This is the visual foundation of Lights Out.

```
┌─────────────────────┐
│ 💡 💡 ⬛ 💡 ⬛ │
│ ⬛ 💡 💡 ⬛ 💡 │
│ 💡 ⬛ 💡 💡 ⬛ │
│ ⬛ 💡 ⬛ 💡 💡 │
│ 💡 ⬛ 💡 ⬛ 💡 │
└─────────────────────┘
```

---

## Concepts

- **2D Array**: Store grid state as `boolean[][]`
- **Nested Loops**: Iterate over rows and columns
- **Canvas Drawing**: Use `fillRect()` to draw cells

---

## Code

### 1. Create Type Definitions

**File:** `src/contexts/canvas2d/games/lights-out/types.ts`

```typescript
export interface Cell {
  on: boolean;
}

export const GRID_SIZE = 5;
export const GAME_COLOR = '#ffca28'; // Yellow for "on" cells

export interface LightsOutState {
  board: Cell[][];
  offsetX: number; // For centering the grid
  offsetY: number;
  cellSize: number;
}
```

**Why:** 
- `Cell` models each grid cell's state
- `GRID_SIZE` defines a 5×5 board
- `offsetX/Y` and `cellSize` handle responsive layout

---

### 2. Initialize the Grid

**File:** `src/contexts/canvas2d/games/lights-out/LightsOutEngine.ts`

```typescript
import type { LightsOutState, Cell } from './types';
import { GRID_SIZE, GAME_COLOR } from './types';

export class LightsOutEngine {
  private ctx: CanvasRenderingContext2D;
  private state: LightsOutState;
  private running: boolean;
  private rafId: number;

  constructor(canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
    this.running = false;
    this.rafId = 0;

    // Make canvas full-screen
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Initialize grid with a pattern
    this.state = {
      board: this.createBoard([
        [1, 1, 0, 1, 0],
        [0, 1, 1, 0, 1],
        [1, 0, 1, 1, 0],
        [0, 1, 0, 1, 1],
        [1, 0, 1, 0, 1],
      ]),
      offsetX: 0,
      offsetY: 0,
      cellSize: 0,
    };

    this.computeLayout();
  }

  /** Convert a number pattern to Cell objects */
  private createBoard(pattern: number[][]): Cell[][] {
    return pattern.map((row) =>
      row.map((val) => ({ on: val === 1 }))
    );
  }

  /** Calculate cell size and offsets to center the grid */
  private computeLayout(): void {
    const W = this.ctx.canvas.width;
    const H = this.ctx.canvas.height;
    const padding = 20;

    const availW = W - padding * 2;
    const availH = H - padding * 2;

    const cellW = Math.floor(availW / GRID_SIZE);
    const cellH = Math.floor(availH / GRID_SIZE);
    this.state.cellSize = Math.max(40, Math.min(cellW, cellH, 100));

    const boardW = GRID_SIZE * this.state.cellSize;
    const boardH = GRID_SIZE * this.state.cellSize;

    this.state.offsetX = Math.floor((W - boardW) / 2);
    this.state.offsetY = Math.floor((H - boardH) / 2);
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
    this.ctx.fillStyle = '#1a1a1a';
    this.ctx.fillRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
    this.renderBoard();
  }

  private renderBoard(): void {
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const cell = this.state.board[row][col];
        const x = this.state.offsetX + col * this.state.cellSize;
        const y = this.state.offsetY + row * this.state.cellSize;

        // Draw cell
        this.ctx.fillStyle = cell.on ? GAME_COLOR : '#333';
        this.ctx.fillRect(x + 2, y + 2, this.state.cellSize - 4, this.state.cellSize - 4);
      }
    }
  }
}
```

**Key Points:**
- `createBoard()` converts a numeric pattern (1 = on, 0 = off) to `Cell[][]`
- `computeLayout()` calculates cell size (40–100px) and centers the grid
- `renderBoard()` uses nested loops to draw each cell with a 2px gap

---

### 3. Create Platform Adapter

**File:** `src/contexts/canvas2d/games/lights-out/adapters/PlatformAdapter.ts`

```typescript
import type { GameInstance } from '@core/GameInterface';
import { LightsOutEngine } from '../LightsOutEngine';

export class PlatformAdapter implements GameInstance {
  private engine: LightsOutEngine;

  constructor(canvas: HTMLCanvasElement, onExit: () => void) {
    this.engine = new LightsOutEngine(canvas);
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

### 4. Register the Game

**File:** `src/contexts/canvas2d/games/lights-out/index.ts`

```typescript
import type { GameDefinition } from '@core/GameInterface';
import { PlatformAdapter } from './adapters/PlatformAdapter';

export const LightsOutGame: GameDefinition = {
  id: 'lights-out',
  name: 'Lights Out',
  description: 'Toggle lights to turn them all off!',
  icon: '💡',
  color: '#ffca28',
  category: 'puzzle',
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
2. **Navigate:** Select "Lights Out" from the menu
3. **Expect:** A 5×5 grid with yellow (on) and gray (off) cells

---

## What You Learned

✅ Create a 2D grid using nested arrays  
✅ Calculate responsive layout (centering, cell sizing)  
✅ Render cells with `fillRect()`  
✅ Use a game loop to continuously redraw the canvas

---

## Next Step

→ [Step 2: Click to Toggle](./step-2.md) — Add click detection to toggle cells and their neighbors
