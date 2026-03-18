# Step 1: Project Setup & Grid Rendering

**Goal:** Display a 4×4 grid with numbered, color-coded tiles.

**Time:** ~15 minutes

---

## What You'll Build

A 4×4 grid with initial tiles (e.g., two tiles with value 2).

```
┌───────────────────────┐
│ 2048                  │
│ Score: 0              │
│                       │
│   2  ·  ·  ·         │
│   ·  ·  ·  2         │
│   ·  ·  ·  ·         │
│   ·  ·  ·  ·         │
└───────────────────────┘
```

---

## Concepts

- **4×4 Grid**: 2D array to store tiles
- **Tile Values**: Powers of 2 (2, 4, 8, 16, ..., 2048)
- **Color Mapping**: Each value has a distinct color
- **Responsive Layout**: Center grid with proper spacing

---

## Code

### 1. Create Type Definitions

**File:** `src/games/game-2048/types.ts`

```typescript
export const GRID_SIZE = 4;
export const HS_KEY = '2048_high_score';

export interface Tile {
  value: number; // 2, 4, 8, 16, ..., 2048
  row: number;
  col: number;
  prevRow: number; // For animations (added later)
  prevCol: number;
}

export interface Game2048State {
  grid: (Tile | null)[][]; // 4x4 grid
  score: number;
  highScore: number;
  bestTile: number;
  gameOver: boolean;
  won: boolean;
}

/** Create empty 4x4 grid */
export function createEmptyGrid(): (Tile | null)[][] {
  return Array.from({ length: GRID_SIZE }, () =>
    Array.from({ length: GRID_SIZE }, () => null)
  );
}
```

**Why:** 
- `grid[row][col]` stores tiles or `null` for empty cells
- Tile tracks its position for rendering

---

### 2. Create Board System

**File:** `src/games/game-2048/systems/BoardSystem.ts`

```typescript
import type { Game2048State, Tile } from '../types';
import { GRID_SIZE, createEmptyGrid } from '../types';

export class BoardSystem {
  /** Initialize game with 2 random tiles */
  init(state: Game2048State): void {
    state.grid = createEmptyGrid();
    this.spawnTile(state);
    this.spawnTile(state);
  }

  /** Spawn a tile (2 or 4) in a random empty cell */
  spawnTile(state: Game2048State): void {
    // Find all empty cells
    const emptyCells: { row: number; col: number }[] = [];
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (state.grid[r][c] === null) {
          emptyCells.push({ row: r, col: c });
        }
      }
    }

    if (emptyCells.length === 0) return;

    // Pick random empty cell
    const { row, col } = emptyCells[Math.floor(Math.random() * emptyCells.length)];

    // 90% chance of 2, 10% chance of 4
    const value = Math.random() < 0.9 ? 2 : 4;

    state.grid[row][col] = {
      value,
      row,
      col,
      prevRow: row,
      prevCol: col,
    };
  }
}
```

---

### 3. Create Board Renderer

**File:** `src/games/game-2048/renderers/BoardRenderer.ts`

```typescript
import type { Game2048State } from '../types';
import { GRID_SIZE } from '../types';

// Color scheme for tiles
const TILE_COLORS: Record<number, string> = {
  2: '#eee4da',
  4: '#ede0c8',
  8: '#f2b179',
  16: '#f59563',
  32: '#f67c5f',
  64: '#f65e3b',
  128: '#edcf72',
  256: '#edcc61',
  512: '#edc850',
  1024: '#edc53f',
  2048: '#edc22e',
};

const TEXT_COLORS: Record<number, string> = {
  2: '#776e65',
  4: '#776e65',
};

export class BoardRenderer {
  render(ctx: CanvasRenderingContext2D, state: Game2048State): void {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;
    const boardSize = Math.min(W, H) * 0.75;
    const cellSize = boardSize / GRID_SIZE;
    const padding = 10;
    const tileSize = cellSize - padding * 2;
    const offsetX = (W - boardSize) / 2;
    const offsetY = (H - boardSize) / 2 + 60; // Leave space for HUD

    // Background
    ctx.fillStyle = '#0f0f1a';
    ctx.fillRect(0, 0, W, H);

    // Board background
    ctx.fillStyle = '#bbada0';
    ctx.fillRect(offsetX, offsetY, boardSize, boardSize);

    // Draw empty cells
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const x = offsetX + c * cellSize + padding;
        const y = offsetY + r * cellSize + padding;

        ctx.fillStyle = '#cdc1b4';
        ctx.fillRect(x, y, tileSize, tileSize);
      }
    }

    // Draw tiles
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const tile = state.grid[r][c];
        if (tile) {
          this.drawTile(ctx, tile, offsetX, offsetY, cellSize, padding, tileSize);
        }
      }
    }
  }

  private drawTile(
    ctx: CanvasRenderingContext2D,
    tile: { value: number; row: number; col: number },
    offsetX: number,
    offsetY: number,
    cellSize: number,
    padding: number,
    tileSize: number
  ): void {
    const x = offsetX + tile.col * cellSize + padding;
    const y = offsetY + tile.row * cellSize + padding;

    // Tile background
    ctx.fillStyle = TILE_COLORS[tile.value] || '#3c3a32';
    ctx.fillRect(x, y, tileSize, tileSize);

    // Tile text
    ctx.fillStyle = TEXT_COLORS[tile.value] || '#f9f6f2';
    const fontSize = tile.value < 100 ? 48 : tile.value < 1000 ? 40 : 32;
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(tile.value), x + tileSize / 2, y + tileSize / 2);
  }
}
```

**Key Points:**
- **Color Mapping**: Lighter colors for low values, warmer/gold for high values
- **Text Size**: Smaller font for 3-4 digit numbers
- **Empty Cells**: Lighter background shows where tiles can spawn

---

### 4. Create Game Engine

**File:** `src/games/game-2048/Game2048Engine.ts`

```typescript
import type { Game2048State } from './types';
import { createEmptyGrid } from './types';
import { BoardSystem } from './systems/BoardSystem';
import { BoardRenderer } from './renderers/BoardRenderer';

export class Game2048Engine {
  private ctx: CanvasRenderingContext2D;
  private state: Game2048State;
  private running: boolean;
  private rafId: number;

  private boardSystem: BoardSystem;
  private boardRenderer: BoardRenderer;

  constructor(canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
    this.running = false;
    this.rafId = 0;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Load high score
    let highScore = 0;
    try {
      highScore = parseInt(localStorage.getItem('2048_high_score') ?? '0', 10) || 0;
    } catch (e) {
      console.warn('Could not load high score');
    }

    this.state = {
      grid: createEmptyGrid(),
      score: 0,
      highScore,
      bestTile: 0,
      gameOver: false,
      won: false,
    };

    this.boardSystem = new BoardSystem();
    this.boardRenderer = new BoardRenderer();

    this.boardSystem.init(this.state);
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
    this.boardRenderer.render(this.ctx, this.state);
  }
}
```

---

### 5. Platform Adapter & Registration

**File:** `src/games/game-2048/adapters/PlatformAdapter.ts`

```typescript
import type { GameInstance } from '@shared/GameInterface';
import { Game2048Engine } from '../Game2048Engine';

export class PlatformAdapter implements GameInstance {
  private engine: Game2048Engine;

  constructor(canvas: HTMLCanvasElement, onExit: () => void) {
    this.engine = new Game2048Engine(canvas);
  }

  start(): void {
    this.engine.start();
  }

  destroy(): void {
    this.engine.destroy();
  }
}
```

**File:** `src/games/game-2048/index.ts`

```typescript
import type { GameDefinition } from '@shared/GameInterface';
import { PlatformAdapter } from './adapters/PlatformAdapter';

export const Game2048: GameDefinition = {
  id: '2048',
  name: '2048',
  description: 'Slide tiles to reach 2048!',
  icon: '🎯',
  color: '#edc22e',
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
2. **Navigate:** Select "2048" from the menu
3. **Expect:** A 4×4 grid with 2 tiles (value 2 or 4) in random positions

---

## What You Learned

✅ Create a 2D grid with `Array.from()`  
✅ Map tile values to colors  
✅ Render centered, responsive layouts  
✅ Initialize game with random tiles

---

## Next Step

→ [Step 2: Slide & Merge Logic](./step-2.md) — Implement tile sliding and merging in one direction
