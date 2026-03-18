# Step 2: Keyboard Input & Movement Direction

**Goal:** Capture arrow keys and WASD to detect slide direction.

**Time:** ~10 minutes

---

## What You'll Build

Press arrow keys to detect which direction to slide tiles (movement logic comes in Step 3).

```
Arrow Keys or WASD → Direction Detected
↑ / W → UP
↓ / S → DOWN
← / A → LEFT
→ / D → RIGHT
```

---

## Concepts

- **Keyboard Events**: Listen to `keydown` events
- **Multiple Key Bindings**: Support both arrow keys and WASD
- **Direction Enum**: Clean state representation

---

## Code

### 1. Add Direction Type

**File:** `src/games/game-2048/types.ts`

```typescript
export const GRID_SIZE = 4;
export const HS_KEY = '2048_high_score';

export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

export interface Tile {
  value: number;
  row: number;
  col: number;
  prevRow: number;
  prevCol: number;
}

export interface Game2048State {
  grid: (Tile | null)[][];
  score: number;
  highScore: number;
  bestTile: number;
  gameOver: boolean;
  won: boolean;
  direction: Direction | null; // Added for input
}

export function createEmptyGrid(): (Tile | null)[][] {
  return Array.from({ length: GRID_SIZE }, () =>
    Array.from({ length: GRID_SIZE }, () => null)
  );
}
```

---

### 2. Create Input System

**File:** `src/games/game-2048/systems/InputSystem.ts`

```typescript
import type { Game2048State, Direction } from '../types';

export class InputSystem {
  private keyMap: Map<string, Direction>;

  constructor() {
    // Map keys to directions
    this.keyMap = new Map([
      ['ArrowUp', 'UP'],
      ['KeyW', 'UP'],
      ['ArrowDown', 'DOWN'],
      ['KeyS', 'DOWN'],
      ['ArrowLeft', 'LEFT'],
      ['KeyA', 'LEFT'],
      ['ArrowRight', 'RIGHT'],
      ['KeyD', 'RIGHT'],
    ]);
  }

  register(state: Game2048State): void {
    window.addEventListener('keydown', (e) => this.handleKey(e, state));
  }

  private handleKey(e: KeyboardEvent, state: Game2048State): void {
    // Prevent default for arrow keys (avoid page scroll)
    if (e.code.startsWith('Arrow')) {
      e.preventDefault();
    }

    // Check if key is mapped to a direction
    const direction = this.keyMap.get(e.code);
    if (direction) {
      state.direction = direction;
    }

    // R to restart
    if (e.code === 'KeyR') {
      state.gameOver = false;
      state.won = false;
    }
  }
}
```

**Key Points:**
- **Prevent Default**: Stop arrow keys from scrolling the page
- **Multiple Bindings**: Support both arrow keys and WASD
- **State Update**: Set `state.direction` for the game loop to process

---

### 3. Update Game Engine

**File:** `src/games/game-2048/Game2048Engine.ts`

```typescript
import type { Game2048State } from './types';
import { createEmptyGrid } from './types';
import { BoardSystem } from './systems/BoardSystem';
import { InputSystem } from './systems/InputSystem';
import { BoardRenderer } from './renderers/BoardRenderer';

export class Game2048Engine {
  private ctx: CanvasRenderingContext2D;
  private state: Game2048State;
  private running: boolean;
  private rafId: number;

  private boardSystem: BoardSystem;
  private inputSystem: InputSystem;
  private boardRenderer: BoardRenderer;

  constructor(canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
    this.running = false;
    this.rafId = 0;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

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
      direction: null, // Added
    };

    this.boardSystem = new BoardSystem();
    this.inputSystem = new InputSystem();
    this.boardRenderer = new BoardRenderer();

    this.boardSystem.init(this.state);
    this.inputSystem.register(this.state); // Register keyboard
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
    this.update();
    this.render();
    this.rafId = requestAnimationFrame(() => this.loop());
  }

  private update(): void {
    // Process direction input (Step 3 will add movement logic)
    if (this.state.direction) {
      console.log(`Direction pressed: ${this.state.direction}`);
      this.state.direction = null; // Clear after processing
    }
  }

  private render(): void {
    this.boardRenderer.render(this.ctx, this.state);
  }
}
```

**Why `console.log`?**
- Step 2 focuses on input capture
- Step 3 will replace `console.log` with actual tile sliding

---

### 4. Add HUD to Show Instructions

**File:** `src/games/game-2048/renderers/BoardRenderer.ts`

Update the `render` method to add instructions:

```typescript
import type { Game2048State } from '../types';
import { GRID_SIZE } from '../types';

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
    const offsetY = (H - boardSize) / 2 + 60;

    // Background
    ctx.fillStyle = '#0f0f1a';
    ctx.fillRect(0, 0, W, H);

    // HUD
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 32px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('2048', W / 2, 40);

    ctx.font = '18px sans-serif';
    ctx.fillStyle = '#aaa';
    ctx.fillText('Arrow Keys / WASD to move', W / 2, 70);
    ctx.fillText(`Score: ${state.score} | Best: ${state.highScore}`, W / 2, 95);

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

    ctx.fillStyle = TILE_COLORS[tile.value] || '#3c3a32';
    ctx.fillRect(x, y, tileSize, tileSize);

    ctx.fillStyle = TEXT_COLORS[tile.value] || '#f9f6f2';
    const fontSize = tile.value < 100 ? 48 : tile.value < 1000 ? 40 : 32;
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(tile.value), x + tileSize / 2, y + tileSize / 2);
  }
}
```

---

## Test It

1. **Run:** `npm run dev`
2. **Navigate:** Select "2048"
3. **Press Keys:** Arrow keys or WASD
4. **Check Console:** Should log "Direction pressed: UP/DOWN/LEFT/RIGHT"
5. **Verify:** Arrow keys don't scroll the page

---

## What You Learned

✅ Listen to keyboard events with `addEventListener('keydown')`  
✅ Map multiple keys to the same action  
✅ Prevent default browser behavior for arrow keys  
✅ Store input direction in game state for processing

---

## Next Step

→ [Step 3: Slide & Merge Logic](./step-3.md) — Implement tile sliding, merging, and new tile spawning
