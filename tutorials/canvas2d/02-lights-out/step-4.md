# Step 4: Move Counter & Polish

**Goal:** Add ripple animations, multiple levels, and visual polish to make the game feel professional.

**Time:** ~15 minutes

---

## What You'll Build

A polished Lights Out game with:
- **Ripple effect** when clicking cells
- **Multiple levels** with increasing difficulty
- **Smooth transitions** between levels
- **Better visual design** (cell borders, colors, shadows)

---

## Concepts

- **Animation System**: Timed visual effects
- **Level Progression**: Multiple puzzle patterns
- **Visual Polish**: Borders, shadows, color gradients

---

## Code

### 1. Update Types for Animations

**File:** `src/contexts/canvas2d/games/lights-out/types.ts`

```typescript
export interface RippleEffect {
  row: number;
  col: number;
  startTime: number;
  duration: number;
}

export type GameStatus = 'playing' | 'level-complete' | 'all-done';

export interface LightsOutState {
  board: Cell[][];
  level: number; // ← NEW: Current level index
  moves: number;
  status: GameStatus;
  offsetX: number;
  offsetY: number;
  cellSize: number;
  ripples: RippleEffect[]; // ← NEW: Active animations
  levelCompleteTime: number; // ← For auto-advance delay
}
```

---

### 2. Create Level Data

**File:** `src/contexts/canvas2d/games/lights-out/data/levels.ts`

```typescript
/** Predefined solvable patterns (0 = off, 1 = on) */
export const LEVELS: number[][][] = [
  // Level 0: Easy (cross pattern)
  [
    [0, 1, 0, 1, 0],
    [1, 1, 1, 1, 1],
    [0, 1, 0, 1, 0],
    [1, 1, 1, 1, 1],
    [0, 1, 0, 1, 0],
  ],
  
  // Level 1: Medium (checkerboard)
  [
    [1, 0, 1, 0, 1],
    [0, 1, 0, 1, 0],
    [1, 0, 1, 0, 1],
    [0, 1, 0, 1, 0],
    [1, 0, 1, 0, 1],
  ],
  
  // Level 2: Hard (diagonal)
  [
    [1, 0, 0, 0, 1],
    [0, 1, 0, 1, 0],
    [0, 0, 1, 0, 0],
    [0, 1, 0, 1, 0],
    [1, 0, 0, 0, 1],
  ],
  
  // Add more levels as needed...
];
```

**Why:** Each level is a different puzzle pattern. Players progress through them sequentially.

---

### 3. Update BoardSystem with Animations

**File:** `src/contexts/canvas2d/games/lights-out/systems/BoardSystem.ts`

```typescript
import { LEVELS } from '../data/levels';

export class BoardSystem {
  /** Load a specific level */
  loadLevel(state: LightsOutState, levelIndex: number): void {
    const pattern = LEVELS[levelIndex];
    state.board = pattern.map((row) =>
      row.map((val) => ({ on: val === 1 }))
    );
    state.moves = 0;
    state.level = levelIndex;
    state.status = 'playing';
    state.ripples = [];
    state.levelCompleteTime = 0;
  }

  toggle(state: LightsOutState, row: number, col: number): void {
    if (state.status !== 'playing') return;

    // ... existing toggle logic ...

    state.moves++;

    // Add ripple animation at click position
    state.ripples.push({
      row,
      col,
      startTime: performance.now(),
      duration: 400, // 400ms animation
    });

    // Check win
    if (this.isWin(state)) {
      if (state.level >= LEVELS.length - 1) {
        state.status = 'all-done'; // ← Beat all levels!
      } else {
        state.status = 'level-complete';
        state.levelCompleteTime = performance.now();
      }
    }
  }

  /** Advance to next level */
  nextLevel(state: LightsOutState): void {
    if (state.level < LEVELS.length - 1) {
      this.loadLevel(state, state.level + 1);
    }
  }

  /** Update animations each frame */
  update(state: LightsOutState, _dt: number): void {
    const now = performance.now();
    
    // Remove expired ripples
    state.ripples = state.ripples.filter(
      (r) => now - r.startTime < r.duration
    );
  }

  // ... isWin() unchanged ...
}
```

---

### 4. Create Board Renderer with Animations

**File:** `src/contexts/canvas2d/games/lights-out/renderers/BoardRenderer.ts`

```typescript
import type { LightsOutState } from '../types';
import { GRID_SIZE, GAME_COLOR } from '../types';

export class BoardRenderer {
  render(ctx: CanvasRenderingContext2D, state: LightsOutState): void {
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // Draw cells
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const cell = state.board[row][col];
        const x = state.offsetX + col * state.cellSize;
        const y = state.offsetY + row * state.cellSize;

        // Cell background
        ctx.fillStyle = cell.on ? GAME_COLOR : '#333';
        ctx.fillRect(
          x + 2,
          y + 2,
          state.cellSize - 4,
          state.cellSize - 4
        );

        // Cell border
        ctx.strokeStyle = cell.on ? '#fff' : '#555';
        ctx.lineWidth = 2;
        ctx.strokeRect(
          x + 2,
          y + 2,
          state.cellSize - 4,
          state.cellSize - 4
        );
      }
    }

    // Draw ripple animations
    this.renderRipples(ctx, state);
  }

  private renderRipples(ctx: CanvasRenderingContext2D, state: LightsOutState): void {
    const now = performance.now();

    for (const ripple of state.ripples) {
      const elapsed = now - ripple.startTime;
      const progress = elapsed / ripple.duration; // 0 to 1

      if (progress >= 1) continue; // Skip expired ripples

      const x = state.offsetX + ripple.col * state.cellSize + state.cellSize / 2;
      const y = state.offsetY + ripple.row * state.cellSize + state.cellSize / 2;

      const maxRadius = state.cellSize * 0.6;
      const radius = maxRadius * progress;
      const alpha = 1 - progress; // Fade out

      ctx.strokeStyle = `rgba(255, 202, 40, ${alpha})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}
```

**Why:**
- Ripples expand from the clicked cell's center
- `progress` goes from 0 → 1 during the animation
- `alpha` fades from 1 → 0 (fully opaque → transparent)

---

### 5. Create HUD Renderer

**File:** `src/contexts/canvas2d/games/lights-out/renderers/HUDRenderer.ts`

```typescript
import type { LightsOutState } from '../types';
import { GAME_COLOR } from '../types';

export class HUDRenderer {
  render(ctx: CanvasRenderingContext2D, state: LightsOutState): void {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    // Top bar
    ctx.fillStyle = 'white';
    ctx.font = '20px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`Level ${state.level + 1}`, 20, 30);

    ctx.textAlign = 'right';
    ctx.fillText(`Moves: ${state.moves}`, W - 20, 30);

    // Win screen
    if (state.status === 'level-complete') {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(0, 0, W, H);

      ctx.fillStyle = GAME_COLOR;
      ctx.font = 'bold 48px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🎉 Level Complete!', W / 2, H / 2 - 30);

      ctx.fillStyle = 'white';
      ctx.font = '24px sans-serif';
      ctx.fillText(`Solved in ${state.moves} moves`, W / 2, H / 2 + 20);

      ctx.font = '20px sans-serif';
      ctx.fillStyle = '#aaa';
      ctx.fillText('Press [N] for next level', W / 2, H / 2 + 60);
    } else if (state.status === 'all-done') {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.fillRect(0, 0, W, H);

      ctx.fillStyle = GAME_COLOR;
      ctx.font = 'bold 56px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🏆 ALL LEVELS COMPLETE! 🏆', W / 2, H / 2);

      ctx.fillStyle = 'white';
      ctx.font = '24px sans-serif';
      ctx.fillText('Press [R] to restart', W / 2, H / 2 + 50);
    }
  }
}
```

---

### 6. Update Engine to Use Renderers

**File:** `src/contexts/canvas2d/games/lights-out/LightsOutEngine.ts`

```typescript
import { BoardRenderer } from './renderers/BoardRenderer';
import { HUDRenderer } from './renderers/HUDRenderer';

export class LightsOutEngine {
  private boardRenderer: BoardRenderer;
  private hudRenderer: HUDRenderer;
  private lastTime: number;

  constructor(canvas: HTMLCanvasElement, onExit: () => void) {
    // ... existing setup ...

    this.lastTime = 0;
    this.boardRenderer = new BoardRenderer();
    this.hudRenderer = new HUDRenderer();

    this.boardSystem.loadLevel(this.state, 0); // Start at level 0

    this.inputSystem = new InputSystem(
      this.state,
      canvas,
      this.boardSystem,
      onExit,
      () => this.reset(),
    );

    // ... rest of constructor ...
  }

  private loop(): void {
    if (!this.running) return;
    
    const now = performance.now();
    const dt = now - this.lastTime;
    this.lastTime = now;

    this.boardSystem.update(this.state, dt); // ← Update animations
    this.render();

    this.rafId = requestAnimationFrame(() => this.loop());
  }

  private render(): void {
    this.boardRenderer.render(this.ctx, this.state);
    this.hudRenderer.render(this.ctx, this.state);
  }

  private reset(): void {
    this.boardSystem.loadLevel(this.state, this.state.level);
  }

  // ... rest of the code ...
}
```

---

### 7. Add Next Level Control

**File:** `src/contexts/canvas2d/games/lights-out/systems/InputSystem.ts`

```typescript
private onKey(e: KeyboardEvent): void {
  if (e.key === 'r' || e.key === 'R') {
    this.onReset();
  } else if (e.key === 'n' || e.key === 'N') {
    // Advance to next level if current one is complete
    if (this.state.status === 'level-complete') {
      this.boardSystem.nextLevel(this.state);
    }
  }
}
```

---

## Test It

1. **Run:** `npm run dev`
2. **Complete Level 1**: Turn off all lights
3. **Press N**: Advance to Level 2
4. **Watch ripples**: Click cells and see the expanding circle animation
5. **Beat all levels**: See the "🏆 ALL LEVELS COMPLETE!" screen

---

## Optional Enhancements

Want to go further? Try adding:

1. **Random Levels**: Generate solvable puzzles algorithmically
2. **Timer**: Show time taken to solve each level
3. **Hint System**: Highlight cells that would reduce the most lights
4. **Sound Effects**: Add click/win sounds
5. **Mobile Support**: Implement touch events

---

## What You Learned

✅ Create timed animations with `performance.now()`  
✅ Organize rendering into separate modules  
✅ Implement level progression systems  
✅ Add visual polish (ripples, shadows, borders)  
✅ Build a complete game loop (play → win → next level)

---

## Complete!

You've built a fully functional **Lights Out** puzzle game! 🎉

**Source Code:** [`src/contexts/canvas2d/games/lights-out/`](../../src/contexts/canvas2d/games/lights-out/)

---

## Next Tutorial

→ [Memory Match](../03-memory-match/README.md) — Learn card-flip animations and pair-matching logic
