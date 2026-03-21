# Step 3: Slide & Merge Logic

**Goal:** Implement tile sliding and merging when direction keys are pressed.

**Time:** ~25 minutes

---

## What You'll Build

Tiles slide in the pressed direction, merging adjacent tiles with the same value:

```
Before (→ RIGHT):          After:
┌──────────────┐          ┌──────────────┐
│ 2  2  ·  ·  │          │ ·  ·  ·  4  │
│ 4  ·  ·  4  │          │ ·  ·  ·  8  │
│ 2  ·  ·  2  │          │ ·  ·  ·  4  │
│ ·  ·  ·  ·  │          │ ·  ·  2  ·  │ ← new tile spawns
└──────────────┘          └──────────────┘
Score: 0                  Score: 16
```

---

## Concepts

- **Traversal Order**: Process tiles from the direction they're sliding
- **Merge Detection**: Track merged tiles to prevent double-merging
- **Move Validation**: Only spawn new tiles if a tile moved
- **Score Tracking**: Add merged tile values to score

---

## Code

### 1. Update State to Support Animation Flags

**File:** `src/contexts/canvas2d/games/game-2048/types.ts`

```typescript
export const GRID_SIZE = 4;
export const HS_KEY = '2048_high_score';

export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

export interface Tile {
  value: number;
  row: number;
  col: number;
  prevRow: number; // Previous position (for animation in Step 5)
  prevCol: number;
  mergedFrom?: Tile[] | null; // Tiles that merged into this one
  isNew?: boolean; // True for newly spawned tiles
}

export interface Game2048State {
  grid: (Tile | null)[][];
  score: number;
  highScore: number;
  bestTile: number;
  gameOver: boolean;
  won: boolean;
  direction: Direction | null;
  pendingDirection: Direction | null; // Queued move (for animation)
  animating: boolean; // True during slide animation
  animProgress: number; // 0.0 to 1.0
  animDuration: number; // Animation duration in ms
  restartRequested: boolean;
}

export function createEmptyGrid(): (Tile | null)[][] {
  return Array.from({ length: GRID_SIZE }, () =>
    Array.from({ length: GRID_SIZE }, () => null)
  );
}
```

---

### 2. Implement Slide & Merge Logic

**File:** `src/contexts/canvas2d/games/game-2048/systems/BoardSystem.ts`

```typescript
import type { Game2048State, Tile, Direction } from '../types';
import { GRID_SIZE, createEmptyGrid } from '../types';

export class BoardSystem {
  /** Initialize game with 2 random tiles */
  init(state: Game2048State): void {
    state.grid = createEmptyGrid();
    this.spawnTile(state);
    this.spawnTile(state);
    this.clearAnimFlags(state); // No animation on init
  }

  update(state: Game2048State, dt: number): void {
    // Handle restart
    if (state.restartRequested) {
      state.restartRequested = false;
      state.score = 0;
      state.bestTile = 0;
      state.gameOver = false;
      state.won = false;
      state.animating = false;
      state.animProgress = 1;
      state.pendingDirection = null;
      this.init(state);
      return;
    }

    // Skip input processing during animation (Step 5)
    if (state.animating) return;

    // Process pending move
    if (state.pendingDirection) {
      const dir = state.pendingDirection;
      state.pendingDirection = null;
      this.slide(state, dir);
    }
  }

  private slide(state: Game2048State, direction: Direction): void {
    this.clearAnimFlags(state);

    const moved = this.moveTiles(state, direction);

    if (moved) {
      this.spawnTile(state);
      this.updateBestTile(state);

      if (!this.hasMovesLeft(state)) {
        state.gameOver = true;
      }
    }
  }

  /** Core sliding algorithm */
  private moveTiles(state: Game2048State, direction: Direction): boolean {
    let moved = false;
    const grid = state.grid;

    // Build traversal order (reverse for DOWN/RIGHT)
    const rows: number[] = [];
    const cols: number[] = [];
    for (let i = 0; i < GRID_SIZE; i++) {
      rows.push(i);
      cols.push(i);
    }

    if (direction === 'DOWN') rows.reverse();
    if (direction === 'RIGHT') cols.reverse();

    // Track merged cells (prevent double-merge in one move)
    const merged = new Set<string>();

    for (const r of rows) {
      for (const c of cols) {
        const tile = grid[r][c];
        if (!tile) continue;

        let newRow = r;
        let newCol = c;

        // Find farthest empty position or merge target
        while (true) {
          const nextRow = newRow + (direction === 'DOWN' ? 1 : direction === 'UP' ? -1 : 0);
          const nextCol = newCol + (direction === 'RIGHT' ? 1 : direction === 'LEFT' ? -1 : 0);

          // Out of bounds
          if (nextRow < 0 || nextRow >= GRID_SIZE || nextCol < 0 || nextCol >= GRID_SIZE) {
            break;
          }

          const target = grid[nextRow][nextCol];

          if (!target) {
            // Empty cell, keep moving
            newRow = nextRow;
            newCol = nextCol;
          } else if (
            target.value === tile.value &&
            !merged.has(`${nextRow},${nextCol}`)
          ) {
            // Can merge
            newRow = nextRow;
            newCol = nextCol;
            break;
          } else {
            // Blocked by different tile
            break;
          }
        }

        // Move/merge tile
        if (newRow !== r || newCol !== c) {
          moved = true;
          tile.prevRow = r;
          tile.prevCol = c;

          const target = grid[newRow][newCol];

          if (target && target.value === tile.value) {
            // Merge
            const mergedTile: Tile = {
              value: tile.value * 2,
              row: newRow,
              col: newCol,
              prevRow: newRow,
              prevCol: newCol,
              mergedFrom: [
                { ...tile, prevRow: r, prevCol: c },
                { ...target, prevRow: target.row, prevCol: target.col },
              ],
              isNew: false,
            };

            grid[newRow][newCol] = mergedTile;
            grid[r][c] = null;
            merged.add(`${newRow},${newCol}`);

            // Update score
            state.score += mergedTile.value;
            if (state.score > state.highScore) {
              state.highScore = state.score;
            }

            // Win detection (Step 4 will add UI)
            if (mergedTile.value === 2048 && !state.won) {
              state.won = true;
            }
          } else {
            // Just move
            grid[r][c] = null;
            tile.row = newRow;
            tile.col = newCol;
            grid[newRow][newCol] = tile;
          }
        }
      }
    }

    return moved;
  }

  /** Spawn a tile (90% 2, 10% 4) */
  spawnTile(state: Game2048State): void {
    const empty: { r: number; c: number }[] = [];
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (!state.grid[r][c]) empty.push({ r, c });
      }
    }

    if (empty.length === 0) return;

    const { r, c } = empty[Math.floor(Math.random() * empty.length)];
    const value = Math.random() < 0.9 ? 2 : 4;

    state.grid[r][c] = {
      value,
      row: r,
      col: c,
      prevRow: r,
      prevCol: c,
      mergedFrom: null,
      isNew: true,
    };
  }

  /** Check if any moves are possible */
  private hasMovesLeft(state: Game2048State): boolean {
    const grid = state.grid;

    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        // Empty cell exists
        if (!grid[r][c]) return true;

        const val = grid[r][c]!.value;

        // Check right neighbor
        if (c < GRID_SIZE - 1) {
          const right = grid[r][c + 1];
          if (!right || right.value === val) return true;
        }

        // Check down neighbor
        if (r < GRID_SIZE - 1) {
          const down = grid[r + 1][c];
          if (!down || down.value === val) return true;
        }
      }
    }

    return false;
  }

  /** Update best tile tracker */
  private updateBestTile(state: Game2048State): void {
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const tile = state.grid[r][c];
        if (tile && tile.value > state.bestTile) {
          state.bestTile = tile.value;
        }
      }
    }
  }

  /** Clear animation flags (for Step 5) */
  private clearAnimFlags(state: Game2048State): void {
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const tile = state.grid[r][c];
        if (tile) {
          tile.prevRow = tile.row;
          tile.prevCol = tile.col;
          tile.mergedFrom = null;
          tile.isNew = false;
        }
      }
    }
  }
}
```

**Key Logic:**
1. **Traversal Order**: Process from farthest edge first (e.g., RIGHT → start from rightmost column)
2. **Merge Tracking**: Use `Set<string>` to prevent a tile from merging twice in one move
3. **Move Validation**: Return `true` if any tile moved → spawn new tile
4. **Game Over**: Check if no empty cells and no adjacent matching tiles

---

### 3. Update Input System to Queue Moves

**File:** `src/contexts/canvas2d/games/game-2048/systems/InputSystem.ts`

```typescript
import type { Game2048State, Direction } from '../types';

export class InputSystem {
  private keyMap: Map<string, Direction>;

  constructor() {
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
    if (e.code.startsWith('Arrow')) {
      e.preventDefault();
    }

    const direction = this.keyMap.get(e.code);
    if (direction && !state.gameOver) {
      state.pendingDirection = direction; // Queue move
    }

    if (e.code === 'KeyR') {
      state.restartRequested = true;
    }
  }
}
```

---

### 4. Update Game Engine

**File:** `src/contexts/canvas2d/games/game-2048/Game2048Engine.ts`

```typescript
import type { Game2048State } from './types';
import { createEmptyGrid, HS_KEY } from './types';
import { BoardSystem } from './systems/BoardSystem';
import { InputSystem } from './systems/InputSystem';
import { BoardRenderer } from './renderers/BoardRenderer';

export class Game2048Engine {
  private ctx: CanvasRenderingContext2D;
  private state: Game2048State;
  private running: boolean;
  private rafId: number;
  private lastTime: number;

  private boardSystem: BoardSystem;
  private inputSystem: InputSystem;
  private boardRenderer: BoardRenderer;

  constructor(canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
    this.running = false;
    this.rafId = 0;
    this.lastTime = 0;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    let highScore = 0;
    try {
      highScore = parseInt(localStorage.getItem(HS_KEY) ?? '0', 10) || 0;
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
      direction: null,
      pendingDirection: null,
      animating: false,
      animProgress: 1,
      animDuration: 150, // ms (for Step 5)
      restartRequested: false,
    };

    this.boardSystem = new BoardSystem();
    this.inputSystem = new InputSystem();
    this.boardRenderer = new BoardRenderer();

    this.boardSystem.init(this.state);
    this.inputSystem.register(this.state);
  }

  start(): void {
    this.running = true;
    this.lastTime = performance.now();
    this.loop();
  }

  destroy(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);

    // Save high score
    try {
      localStorage.setItem(HS_KEY, String(this.state.highScore));
    } catch (e) {
      console.warn('Could not save high score');
    }
  }

  private loop(): void {
    if (!this.running) return;

    const now = performance.now();
    const dt = now - this.lastTime;
    this.lastTime = now;

    this.update(dt);
    this.render();

    this.rafId = requestAnimationFrame(() => this.loop());
  }

  private update(dt: number): void {
    this.boardSystem.update(this.state, dt);
  }

  private render(): void {
    this.boardRenderer.render(this.ctx, this.state);
  }
}
```

---

## Test It

1. **Run:** `npm run dev`
2. **Navigate:** Select "2048"
3. **Test Movements:**
   - **→ RIGHT**: All tiles slide to the right edge
   - **2 + 2 → 4**: Tiles merge when sliding into each other
   - **Score**: Score increases by merged tile value (4, 8, 16, etc.)
4. **Test Edge Cases:**
   - **No Empty Space**: Move should fail, no new tile spawns
   - **Multiple Merges**: `2 2 2 2` → RIGHT → `· · 4 4`
5. **Press R**: Restart game with 2 new tiles

---

## Key Behaviors

✅ **Tiles slide until blocked** by another tile or edge  
✅ **Adjacent same-value tiles merge** into their sum  
✅ **Merged tiles can't merge again** in the same move  
✅ **New tile spawns** only if a tile moved  
✅ **Score updates** when tiles merge

---

## What You Learned

✅ Implement traversal order based on direction  
✅ Use a `Set` to track merged cells  
✅ Validate moves before spawning  
✅ Check game-over condition (no empty cells + no adjacent matches)

---

## Next Step

→ [Step 4: Win & Loss Conditions](./step-4.md) — Show overlays when the player reaches 2048 or runs out of moves
