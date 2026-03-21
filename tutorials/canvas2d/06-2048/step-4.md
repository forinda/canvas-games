# Step 4: Win & Loss Conditions

**Goal:** Display overlays when the player reaches 2048 or runs out of moves.

**Time:** ~15 minutes

---

## What You'll Build

**Win Overlay** (reach 2048):
```
┌───────────────────────┐
│                       │
│   🎉 You Win! 🎉     │
│                       │
│   Press K to keep     │
│   playing or R to     │
│   restart             │
│                       │
└───────────────────────┘
```

**Loss Overlay** (no moves left):
```
┌───────────────────────┐
│                       │
│   Game Over           │
│   Final Score: 1024   │
│                       │
│   Press R to restart  │
│                       │
└───────────────────────┘
```

---

## Concepts

- **Win Detection**: First tile reaches 2048
- **Keep Playing**: Allow continuing after winning
- **Loss Detection**: No empty cells + no adjacent matches
- **Semi-transparent Overlay**: Show state without hiding board

---

## Code

### 1. Update State for Continue Option

**File:** `src/contexts/canvas2d/games/game-2048/types.ts`

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
  mergedFrom?: Tile[] | null;
  isNew?: boolean;
}

export interface Game2048State {
  grid: (Tile | null)[][];
  score: number;
  highScore: number;
  bestTile: number;
  gameOver: boolean;
  won: boolean;
  keepPlaying: boolean; // Continue after winning
  direction: Direction | null;
  pendingDirection: Direction | null;
  animating: boolean;
  animProgress: number;
  animDuration: number;
  restartRequested: boolean;
  continueRequested: boolean; // Press K after win
}

export function createEmptyGrid(): (Tile | null)[][] {
  return Array.from({ length: GRID_SIZE }, () =>
    Array.from({ length: GRID_SIZE }, () => null)
  );
}
```

---

### 2. Update Board System Win Logic

**File:** `src/contexts/canvas2d/games/game-2048/systems/BoardSystem.ts`

Update the `moveTiles` method to check `keepPlaying` flag:

```typescript
// Inside moveTiles(), after merging tiles:

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

  state.score += mergedTile.value;
  if (state.score > state.highScore) {
    state.highScore = state.score;
  }

  // Win detection (only first time)
  if (mergedTile.value === 2048 && !state.keepPlaying && !state.won) {
    state.won = true;
  }
}
```

Also update the `update()` method to handle continue request:

```typescript
update(state: Game2048State, dt: number): void {
  // Handle restart
  if (state.restartRequested) {
    state.restartRequested = false;
    state.score = 0;
    state.bestTile = 0;
    state.gameOver = false;
    state.won = false;
    state.keepPlaying = false; // Reset
    state.animating = false;
    state.animProgress = 1;
    state.pendingDirection = null;
    this.init(state);
    return;
  }

  // Handle continue after win
  if (state.continueRequested) {
    state.continueRequested = false;
    state.keepPlaying = true;
    return;
  }

  if (state.animating) return;

  if (state.pendingDirection) {
    const dir = state.pendingDirection;
    state.pendingDirection = null;
    this.slide(state, dir);
  }
}
```

---

### 3. Update Input System for Continue

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

    // Restart
    if (e.code === 'KeyR') {
      state.restartRequested = true;
      return;
    }

    // Continue after win
    if (e.code === 'KeyK' && state.won) {
      state.continueRequested = true;
      return;
    }

    // Normal movement
    const direction = this.keyMap.get(e.code);
    if (direction && !state.gameOver) {
      state.pendingDirection = direction;
    }
  }
}
```

---

### 4. Create Overlay Renderer

**File:** `src/contexts/canvas2d/games/game-2048/renderers/OverlayRenderer.ts`

```typescript
import type { Game2048State } from '../types';

export class OverlayRenderer {
  render(ctx: CanvasRenderingContext2D, state: Game2048State): void {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    // Show win overlay (unless player chose to keep playing)
    if (state.won && !state.keepPlaying) {
      this.drawWinOverlay(ctx, W, H);
      return;
    }

    // Show game over overlay
    if (state.gameOver) {
      this.drawLossOverlay(ctx, W, H, state.score);
    }
  }

  private drawWinOverlay(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    // Semi-transparent background
    ctx.fillStyle = 'rgba(15, 15, 26, 0.85)';
    ctx.fillRect(0, 0, W, H);

    // Win message
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 64px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🎉 You Win! 🎉', W / 2, H / 2 - 40);

    // Instructions
    ctx.fillStyle = '#fff';
    ctx.font = '24px sans-serif';
    ctx.fillText('Press K to keep playing', W / 2, H / 2 + 20);
    ctx.fillText('or R to restart', W / 2, H / 2 + 50);
  }

  private drawLossOverlay(
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
    score: number
  ): void {
    // Semi-transparent background
    ctx.fillStyle = 'rgba(15, 15, 26, 0.85)';
    ctx.fillRect(0, 0, W, H);

    // Game Over message
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 64px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Game Over', W / 2, H / 2 - 60);

    ctx.font = '32px sans-serif';
    ctx.fillStyle = '#edc22e';
    ctx.fillText(`Final Score: ${score}`, W / 2, H / 2 - 10);

    // Restart instruction
    ctx.fillStyle = '#aaa';
    ctx.font = '24px sans-serif';
    ctx.fillText('Press R to restart', W / 2, H / 2 + 40);
  }
}
```

---

### 5. Update Board Renderer to Show HUD

**File:** `src/contexts/canvas2d/games/game-2048/renderers/BoardRenderer.ts`

Update the HUD section to show "Best Tile":

```typescript
// Inside render() method, update HUD section:

// HUD
ctx.fillStyle = '#fff';
ctx.font = 'bold 32px sans-serif';
ctx.textAlign = 'center';
ctx.fillText('2048', W / 2, 40);

ctx.font = '18px sans-serif';
ctx.fillStyle = '#aaa';
ctx.fillText('Arrow Keys / WASD | R to restart', W / 2, 70);

ctx.fillStyle = '#fff';
ctx.fillText(
  `Score: ${state.score} | Best Tile: ${state.bestTile} | High Score: ${state.highScore}`,
  W / 2,
  95
);
```

---

### 6. Update Game Engine

**File:** `src/contexts/canvas2d/games/game-2048/Game2048Engine.ts`

Add the overlay renderer:

```typescript
import type { Game2048State } from './types';
import { createEmptyGrid, HS_KEY } from './types';
import { BoardSystem } from './systems/BoardSystem';
import { InputSystem } from './systems/InputSystem';
import { BoardRenderer } from './renderers/BoardRenderer';
import { OverlayRenderer } from './renderers/OverlayRenderer';

export class Game2048Engine {
  private ctx: CanvasRenderingContext2D;
  private state: Game2048State;
  private running: boolean;
  private rafId: number;
  private lastTime: number;

  private boardSystem: BoardSystem;
  private inputSystem: InputSystem;
  private boardRenderer: BoardRenderer;
  private overlayRenderer: OverlayRenderer;

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
      keepPlaying: false,
      direction: null,
      pendingDirection: null,
      animating: false,
      animProgress: 1,
      animDuration: 150,
      restartRequested: false,
      continueRequested: false,
    };

    this.boardSystem = new BoardSystem();
    this.inputSystem = new InputSystem();
    this.boardRenderer = new BoardRenderer();
    this.overlayRenderer = new OverlayRenderer();

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
    this.overlayRenderer.render(this.ctx, this.state); // Draw overlays last
  }
}
```

---

## Test It

1. **Run:** `npm run dev`
2. **Navigate:** Select "2048"
3. **Test Win:**
   - Use browser console to cheat: `state.grid[0][0] = {value: 1024, row: 0, col: 0, prevRow: 0, prevCol: 0}` and `state.grid[0][1] = {value: 1024, ...}`
   - Slide right to merge → Win overlay appears
   - **Press K**: Continue playing
   - **Press R**: Restart game
4. **Test Loss:**
   - Fill the board with unmergeable tiles
   - Verify "Game Over" overlay shows final score
5. **Test High Score:**
   - Score 100+ points, restart
   - Verify high score persists

---

## What You Learned

✅ Detect win condition (first 2048 tile)  
✅ Allow "keep playing" after winning  
✅ Detect loss condition (no moves left)  
✅ Draw semi-transparent overlays  
✅ Persist high score to `localStorage`

---

## Next Step

→ [Step 5: Animations & Polish](./step-5.md) — Add smooth sliding animations and tile spawn effects
