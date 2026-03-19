# Step 5: Line Clearing

**Goal:** Detect full rows, animate them flashing, remove them, and shift everything above down.

**Time:** ~15 minutes

---

## What You'll Build

- **Full row detection**: After locking a piece, scan the board for rows where every cell is occupied
- **Flash animation**: Cleared rows flash white for 300 ms before disappearing
- **Row collapse**: Cleared rows are removed from the board array and empty rows are added at the top
- **Pause during animation**: No gravity or input during the clear animation

---

## Concepts

- **Row scanning**: A row is full when every cell in that row is non-null. We check all 20 rows after every lock.
- **Splice and unshift**: To remove row `r`, we `splice(r, 1)` from the board array, then `unshift` a fresh empty row at the top. This naturally "drops" everything above the cleared row by one position.
- **Animation state machine**: When lines are detected, we store which rows are clearing and start a timer. The game loop skips gravity during the animation. When the timer expires, the rows are actually removed and the next piece spawns.

---

## Code

### 1. Add Line Detection to BoardSystem

**File:** `src/games/tetris/systems/BoardSystem.ts`

Add three new methods:

```typescript
import type { TetrisState, CellColor } from '../types';
import { COLS, ROWS } from '../types';
import { PIECES } from '../data/pieces';

export class BoardSystem {
  isColliding(
    board: CellColor[][],
    defIndex: number,
    rotation: number,
    x: number,
    y: number,
  ): boolean {
    const cells = PIECES[defIndex].rotations[rotation];
    for (const [row, col] of cells) {
      const bx = x + col;
      const by = y + row;
      if (bx < 0 || bx >= COLS || by >= ROWS) return true;
      if (by < 0) continue;
      if (board[by][bx] !== null) return true;
    }
    return false;
  }

  lockPiece(state: TetrisState): void {
    const piece = state.currentPiece;
    if (!piece) return;
    const def = PIECES[piece.defIndex];
    const cells = def.rotations[piece.rotation];
    for (const [row, col] of cells) {
      const bx = piece.x + col;
      const by = piece.y + row;
      if (by >= 0 && by < ROWS && bx >= 0 && bx < COLS) {
        state.board[by][bx] = def.color;
      }
    }
  }

  // --- NEW ---

  /** Find all full lines and begin clear animation, returns number of lines */
  detectAndClearLines(state: TetrisState): number {
    const fullRows: number[] = [];
    for (let r = 0; r < ROWS; r++) {
      if (state.board[r].every((cell) => cell !== null)) {
        fullRows.push(r);
      }
    }
    if (fullRows.length > 0) {
      state.clearingLines = fullRows;
      state.clearTimer = 0;
    }
    return fullRows.length;
  }

  /** Actually remove cleared lines and shift rows down */
  removeClearedLines(state: TetrisState): void {
    const rows = state.clearingLines.sort((a, b) => a - b);
    for (const row of rows) {
      state.board.splice(row, 1);
      state.board.unshift(Array(COLS).fill(null));
    }
    state.clearingLines = [];
    state.clearTimer = 0;
  }
}
```

**What's happening:**

`detectAndClearLines()`:
- Scans every row. If `every` cell is non-null, that row is full.
- Stores the row indices in `state.clearingLines` and resets the animation timer.
- Returns the count so the score system (next step) knows how many lines were cleared.

`removeClearedLines()`:
- Sorts the row indices ascending so splicing from top to bottom works correctly.
- For each row, `splice` removes it from the array and `unshift` adds a fresh empty row at the top. After processing all cleared rows, the board has the same 20-row length with the cleared rows replaced by empty ones at the top.
- Clears the animation state so the game resumes.

The key insight is that `splice` + `unshift` handles the collapse automatically. When we remove row 18 and add an empty row at index 0, everything that was at rows 0-17 shifts down by one. If multiple rows are cleared, the loop handles each one in sequence.

---

### 2. Update PieceSystem Lock and Update

**File:** `src/games/tetris/systems/PieceSystem.ts`

Modify `lockCurrentPiece` to detect lines, and update the `update` method to handle the clear animation:

```typescript
import type { TetrisState } from '../types';
import { COLS, getDropInterval } from '../types';
import { PIECES, WALL_KICKS, I_WALL_KICKS } from '../data/pieces';
import { BoardSystem } from './BoardSystem';

export class PieceSystem {
  private boardSystem: BoardSystem;
  private bag: number[] = [];

  constructor(boardSystem: BoardSystem) {
    this.boardSystem = boardSystem;
  }

  private refillBag(): void {
    const indices = [0, 1, 2, 3, 4, 5, 6];
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    this.bag.push(...indices);
  }

  private nextFromBag(): number {
    if (this.bag.length < 2) this.refillBag();
    return this.bag.shift()!;
  }

  spawnPiece(state: TetrisState): void {
    const defIndex = state.nextPieceIndex;
    state.nextPieceIndex = this.nextFromBag();
    const def = PIECES[defIndex];
    const cells = def.rotations[0];
    const maxCol = Math.max(...cells.map(([, c]) => c));
    const spawnX = Math.floor((COLS - maxCol - 1) / 2);

    state.currentPiece = {
      defIndex,
      rotation: 0,
      x: spawnX,
      y: -1,
    };
    state.dropTimer = 0;
    state.lockTimer = 0;
    state.isLocking = false;

    if (this.boardSystem.isColliding(state.board, defIndex, 0, spawnX, 0)) {
      state.gameOver = true;
    }
  }

  init(state: TetrisState): void {
    this.bag = [];
    this.refillBag();
    state.nextPieceIndex = this.nextFromBag();
    this.spawnPiece(state);
  }

  move(state: TetrisState, dx: number): boolean {
    const piece = state.currentPiece;
    if (!piece) return false;
    if (!this.boardSystem.isColliding(state.board, piece.defIndex, piece.rotation, piece.x + dx, piece.y)) {
      piece.x += dx;
      if (state.isLocking) state.lockTimer = 0;
      return true;
    }
    return false;
  }

  rotate(state: TetrisState, direction: 1 | -1 = 1): boolean {
    const piece = state.currentPiece;
    if (!piece) return false;
    const numRotations = PIECES[piece.defIndex].rotations.length;
    const newRotation = ((piece.rotation + direction) % numRotations + numRotations) % numRotations;
    const kicks = PIECES[piece.defIndex].id === 'I' ? I_WALL_KICKS : WALL_KICKS;

    for (const [dx, dy] of kicks) {
      if (!this.boardSystem.isColliding(state.board, piece.defIndex, newRotation, piece.x + dx, piece.y + dy)) {
        piece.rotation = newRotation;
        piece.x += dx;
        piece.y += dy;
        if (state.isLocking) state.lockTimer = 0;
        return true;
      }
    }
    return false;
  }

  softDrop(state: TetrisState): boolean {
    const piece = state.currentPiece;
    if (!piece) return false;
    if (!this.boardSystem.isColliding(state.board, piece.defIndex, piece.rotation, piece.x, piece.y + 1)) {
      piece.y++;
      state.dropTimer = 0;
      return true;
    }
    return false;
  }

  hardDrop(state: TetrisState): void {
    const piece = state.currentPiece;
    if (!piece) return;
    let ghostY = piece.y;
    while (!this.boardSystem.isColliding(state.board, piece.defIndex, piece.rotation, piece.x, ghostY + 1)) {
      ghostY++;
    }
    piece.y = ghostY;
    this.lockCurrentPiece(state);
  }

  /** Lock piece and handle line clears -- UPDATED */
  lockCurrentPiece(state: TetrisState): void {
    this.boardSystem.lockPiece(state);
    const linesCleared = this.boardSystem.detectAndClearLines(state);
    if (linesCleared > 0) {
      // Piece will spawn after clear animation finishes
      state.currentPiece = null;
    } else {
      this.spawnPiece(state);
    }
    state.isLocking = false;
    state.lockTimer = 0;
  }

  /** Called every frame -- UPDATED with clear animation handling */
  update(state: TetrisState, dt: number): void {
    if (!state.started || state.paused || state.gameOver) return;

    // Handle line clear animation
    if (state.clearingLines.length > 0) {
      state.clearTimer += dt;
      if (state.clearTimer >= state.clearDuration) {
        this.boardSystem.removeClearedLines(state);
        this.spawnPiece(state);
      }
      return; // no gravity during clear animation
    }

    if (!state.currentPiece) return;

    const piece = state.currentPiece;
    const interval = getDropInterval(state.level);

    // Gravity
    state.dropTimer += dt;
    if (state.dropTimer >= interval) {
      state.dropTimer -= interval;
      if (!this.boardSystem.isColliding(state.board, piece.defIndex, piece.rotation, piece.x, piece.y + 1)) {
        piece.y++;
        state.isLocking = false;
        state.lockTimer = 0;
      } else {
        state.isLocking = true;
      }
    }

    // Lock delay
    if (state.isLocking) {
      state.lockTimer += dt;
      if (state.lockTimer >= state.lockDelay) {
        this.lockCurrentPiece(state);
      }
    }
  }
}
```

**What's happening:**
- `lockCurrentPiece` now calls `detectAndClearLines` after locking the piece.
- If lines were cleared, we set `currentPiece` to `null` and let the animation play. The next piece will spawn when the animation finishes.
- If no lines were cleared, we spawn the next piece immediately as before.
- `update` checks for `clearingLines.length > 0` at the top. During a clear animation, we only advance the timer. When it expires, we remove the lines and spawn the next piece. The `return` statement ensures no gravity runs during the animation.

---

### 3. Add Flash Animation to BoardRenderer

**File:** `src/games/tetris/renderers/BoardRenderer.ts`

Update the placed-blocks loop to flash clearing rows:

```typescript
import type { TetrisState } from '../types';
import { COLS, ROWS } from '../types';
import { PIECES } from '../data/pieces';

export class BoardRenderer {
  render(ctx: CanvasRenderingContext2D, state: TetrisState): void {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    const cellSize = Math.floor(Math.min((H - 40) / ROWS, (W * 0.5) / COLS));
    const boardW = cellSize * COLS;
    const boardH = cellSize * ROWS;
    const offsetX = Math.floor((W - boardW) / 2);
    const offsetY = Math.floor((H - boardH) / 2);

    // Background
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, W, H);

    // Board background
    ctx.fillStyle = '#111122';
    ctx.fillRect(offsetX, offsetY, boardW, boardH);

    // Grid lines
    ctx.strokeStyle = '#1a1a33';
    ctx.lineWidth = 0.5;
    for (let r = 0; r <= ROWS; r++) {
      ctx.beginPath();
      ctx.moveTo(offsetX, offsetY + r * cellSize);
      ctx.lineTo(offsetX + boardW, offsetY + r * cellSize);
      ctx.stroke();
    }
    for (let c = 0; c <= COLS; c++) {
      ctx.beginPath();
      ctx.moveTo(offsetX + c * cellSize, offsetY);
      ctx.lineTo(offsetX + c * cellSize, offsetY + boardH);
      ctx.stroke();
    }

    // Placed blocks (with clear animation)
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const color = state.board[r][c];
        if (color) {
          if (state.clearingLines.includes(r)) {
            // Flash between white and original color
            const flash = Math.sin(state.clearTimer * 0.02) > 0;
            const drawColor = flash ? '#ffffff' : color;
            this.drawCell(ctx, offsetX + c * cellSize, offsetY + r * cellSize, cellSize, drawColor);
          } else {
            this.drawCell(ctx, offsetX + c * cellSize, offsetY + r * cellSize, cellSize, color);
          }
        }
      }
    }

    // Current piece
    if (state.currentPiece && state.clearingLines.length === 0) {
      const piece = state.currentPiece;
      const def = PIECES[piece.defIndex];
      const cells = def.rotations[piece.rotation];
      for (const [row, col] of cells) {
        const bx = piece.x + col;
        const by = piece.y + row;
        if (by >= 0 && by < ROWS && bx >= 0 && bx < COLS) {
          this.drawCell(ctx, offsetX + bx * cellSize, offsetY + by * cellSize, cellSize, def.color);
        }
      }
    }

    // Board border
    ctx.strokeStyle = '#334';
    ctx.lineWidth = 2;
    ctx.strokeRect(offsetX - 1, offsetY - 1, boardW + 2, boardH + 2);
  }

  drawCell(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string): void {
    const gap = 1;
    ctx.fillStyle = color;
    ctx.fillRect(x + gap, y + gap, size - gap * 2, size - gap * 2);

    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(x + gap, y + gap, size - gap * 2, 2);
    ctx.fillRect(x + gap, y + gap, 2, size - gap * 2);

    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(x + gap, y + size - gap - 2, size - gap * 2, 2);
    ctx.fillRect(x + size - gap - 2, y + gap, 2, size - gap * 2);
  }
}
```

**What's happening:**
- When drawing a placed block, we check if its row is in `clearingLines`.
- If so, we use `Math.sin(clearTimer * 0.02)` to oscillate between positive and negative values. When positive, we draw white; when negative, the original color. This creates a rapid flashing effect over the 300 ms animation.
- The current piece is hidden during the clear animation (the `clearingLines.length === 0` guard) since there is no active piece at that point anyway.

---

## Test It

1. **Run:** `npm run dev`
2. **Open:** the Tetris game
3. **Observe:**
   - Fill a complete row by placing pieces across the bottom
   - The full row flashes white rapidly for about 300 ms
   - After the flash, the row disappears and everything above drops down
   - A new piece spawns after the animation
   - Try clearing 2 or 3 rows at once -- they all flash and disappear together
   - The board stays 20 rows tall at all times

4. **Test edge cases:**
   - Clear the bottom row while blocks exist above -- they should shift down correctly
   - Clear 4 rows at once (a "Tetris") by filling 4 consecutive rows and dropping an I-piece through them

---

## Try It

- Change `clearDuration` to `1000` for a dramatic slow-motion flash.
- Change the flash color from `#ffffff` to `#ff0000` for a red flash effect.
- Log `fullRows` inside `detectAndClearLines` to verify which rows are detected.

---

## Challenges

**Easy:**
- Count how many total lines you have cleared and display it in the console.
- Change the flash to fade out (reduce alpha over time) instead of alternating.

**Medium:**
- Instead of flashing, animate the clearing rows shrinking horizontally (draw cells at reduced width based on `clearTimer`).
- Play a different animation for clearing 4 lines vs 1 line.

**Hard:**
- Implement row-by-row collapse instead of instant removal: cleared rows disappear one at a time from bottom to top with a small delay between each.

---

## What You Learned

- Row completion detection with `Array.every`
- Array splice/unshift for row collapse
- Animation state machine: detect, animate, remove, resume
- Flash effect using `Math.sin` on a timer
- Pausing game logic during animations by early-returning from `update`

**Next:** Add scoring, level progression, and speed increases.
