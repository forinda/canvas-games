# Step 5: Animations & Polish

**Goal:** Add smooth tile sliding animations and spawn effects.

**Time:** ~20 minutes

---

## What You'll Build

**Smooth Animations:**
- Tiles slide from previous position to new position
- New tiles "pop in" with a scale effect
- Merged tiles briefly pulse

```
Frame 1: [2]···      Frame 2: ·[2]··      Frame 3: ··[2]·      Frame 4: ···[4]
         (start)              (25%)                (75%)              (merged)
```

---

## Concepts

- **Linear Interpolation (lerp)**: Smooth transitions between positions
- **Easing Functions**: Scale animations for tile spawns
- **Animation Progress**: Track 0.0 → 1.0 for smooth motion
- **Frame-Independent Movement**: Use delta time (dt) for consistent speed

---

## Code

### 1. Update Board System to Trigger Animations

**File:** `src/contexts/canvas2d/games/game-2048/systems/BoardSystem.ts`

Update the `slide()` method to start animations:

```typescript
private slide(state: Game2048State, direction: Direction): void {
  this.clearAnimFlags(state);

  const moved = this.moveTiles(state, direction);

  if (moved) {
    // Start animation
    state.animProgress = 0;
    state.animating = true;

    // Spawn new tile (will have isNew flag)
    this.spawnTile(state);

    this.updateBestTile(state);

    if (!this.hasMovesLeft(state)) {
      state.gameOver = true;
    }
  }
}
```

And update `update()` to advance animation progress:

```typescript
update(state: Game2048State, dt: number): void {
  // Handle restart
  if (state.restartRequested) {
    state.restartRequested = false;
    state.score = 0;
    state.bestTile = 0;
    state.gameOver = false;
    state.won = false;
    state.keepPlaying = false;
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

  // Advance animation
  if (state.animating) {
    state.animProgress += dt / state.animDuration;
    if (state.animProgress >= 1) {
      state.animProgress = 1;
      state.animating = false;
      // Clear animation flags after animation completes
      this.clearAnimFlags(state);
    }
    return; // Skip input during animation
  }

  // Process pending move
  if (state.pendingDirection) {
    const dir = state.pendingDirection;
    state.pendingDirection = null;
    this.slide(state, dir);
  }
}
```

---

### 2. Update Board Renderer for Animations

**File:** `src/contexts/canvas2d/games/game-2048/renderers/BoardRenderer.ts`

Update `drawTile()` to interpolate positions and add spawn scaling:

```typescript
import type { Game2048State, Tile } from '../types';
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
    ctx.fillText('Arrow Keys / WASD | R to restart', W / 2, 70);

    ctx.fillStyle = '#fff';
    ctx.fillText(
      `Score: ${state.score} | Best: ${state.bestTile} | High: ${state.highScore}`,
      W / 2,
      95
    );

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

    // Draw tiles (merged tiles first, then regular tiles)
    const tiles: Tile[] = [];
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const tile = state.grid[r][c];
        if (tile) tiles.push(tile);
      }
    }

    // Draw merged "from" tiles first (fading out)
    for (const tile of tiles) {
      if (tile.mergedFrom) {
        for (const fromTile of tile.mergedFrom) {
          this.drawTile(
            ctx,
            fromTile,
            offsetX,
            offsetY,
            cellSize,
            padding,
            tileSize,
            state.animProgress,
            true // isMerging
          );
        }
      }
    }

    // Draw regular tiles
    for (const tile of tiles) {
      if (!tile.mergedFrom) {
        this.drawTile(
          ctx,
          tile,
          offsetX,
          offsetY,
          cellSize,
          padding,
          tileSize,
          state.animProgress,
          false
        );
      }
    }

    // Draw merged result tiles last (on top)
    for (const tile of tiles) {
      if (tile.mergedFrom) {
        this.drawTile(
          ctx,
          tile,
          offsetX,
          offsetY,
          cellSize,
          padding,
          tileSize,
          state.animProgress,
          false
        );
      }
    }
  }

  private drawTile(
    ctx: CanvasRenderingContext2D,
    tile: Tile,
    offsetX: number,
    offsetY: number,
    cellSize: number,
    padding: number,
    tileSize: number,
    animProgress: number,
    isMerging: boolean
  ): void {
    // Interpolate position (lerp from prevRow/prevCol to row/col)
    const row = this.lerp(tile.prevRow, tile.row, animProgress);
    const col = this.lerp(tile.prevCol, tile.col, animProgress);

    const x = offsetX + col * cellSize + padding;
    const y = offsetY + row * cellSize + padding;

    // Scale animation for new tiles
    let scale = 1;
    if (tile.isNew) {
      // Pop-in effect: 0 → 1.2 → 1
      const t = animProgress;
      scale = t < 0.5 ? t * 2.4 : 1.2 - (t - 0.5) * 0.4;
    }

    // Fade out merged tiles
    let alpha = 1;
    if (isMerging) {
      alpha = 1 - animProgress; // Fade from 1 to 0
    }

    ctx.save();

    // Apply scale transform
    if (scale !== 1 || alpha !== 1) {
      const centerX = x + tileSize / 2;
      const centerY = y + tileSize / 2;

      ctx.globalAlpha = alpha;
      ctx.translate(centerX, centerY);
      ctx.scale(scale, scale);
      ctx.translate(-centerX, -centerY);
    }

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

    ctx.restore();
  }

  /** Linear interpolation */
  private lerp(start: number, end: number, t: number): number {
    return start + (end - start) * t;
  }
}
```

**Key Animations:**
- **Position Interpolation**: `lerp(prevRow, row, animProgress)` smoothly moves tiles
- **Spawn Effect**: New tiles scale from 0 → 1.2 → 1 (overshoot for bounce)
- **Merge Fade**: Old tiles fade out while new merged tile appears
- **Layering**: Draw merged "from" tiles first, merged result tiles last (on top)

---

### 3. Input Queueing During Animation

**File:** `src/contexts/canvas2d/games/game-2048/systems/InputSystem.ts`

Already implemented in Step 2! No changes needed. The `pendingDirection` is queued during animation and processed when `animating = false`.

---

## Test It

1. **Run:** `npm run dev`
2. **Navigate:** Select "2048"
3. **Test Sliding:**
   - Press arrow keys → tiles smoothly slide to new positions
   - **Timing**: Animation should take ~150ms
4. **Test Spawn:**
   - Watch new tiles after each move → they "pop in" with a scale effect
5. **Test Merge:**
   - Merge two tiles → both originals fade out while merged tile appears
6. **Test Input Queue:**
   - Press multiple keys quickly → moves queue and execute in order

---

## Performance Tips

**Reduce Overdraw:**
- Draw empty cells once
- Draw tiles in layers (merging tiles → regular tiles → merged results)

**Smooth at 60 FPS:**
- `animDuration = 150ms` (9 frames at 60 FPS)
- Use `requestAnimationFrame` for frame timing

**Canvas State Management:**
- Use `ctx.save()` and `ctx.restore()` for transforms
- Reset `globalAlpha` to avoid affecting other draws

---

## What You Learned

✅ Linear interpolation (lerp) for smooth motion  
✅ Easing with scale overshoot (0 → 1.2 → 1)  
✅ Fade animations with `globalAlpha`  
✅ Canvas transforms (`translate`, `scale`)  
✅ Frame-independent animation with delta time  
✅ Input queueing during animation

---

## Congratulations! 🎉

You've built a complete 2048 game with:
- ✅ 4×4 grid rendering
- ✅ Keyboard input (arrow keys + WASD)
- ✅ Tile sliding and merging logic
- ✅ Win/loss conditions with overlays
- ✅ Smooth animations and spawn effects
- ✅ High score persistence

---

## Next Challenges

**Easy:**
- Add sound effects (merge, spawn, win)
- Touch support for mobile (swipe gestures)

**Medium:**
- Undo last move (store history)
- Custom themes (color picker)
- Auto-solver AI (Monte Carlo simulation)

**Hard:**
- Leaderboard with backend API
- 5×5 or 6×6 grid mode
- Multiplayer (race to 2048)

---

## What You Learned Overall

✅ 2D grid algorithms (traversal, merging)  
✅ State-driven animations  
✅ Input handling with key mapping  
✅ Canvas transforms and alpha blending  
✅ localStorage for persistence  
✅ Game state management (win/loss/continue)

**Great job!** 🚀
