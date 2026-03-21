# Step 4: Gravity & Refill

**Goal:** Gems fall down to fill gaps left by matches, and new gems drop in from above the board.

**Time:** ~15 minutes

---

## What You'll Build

- **Column-based gravity** that shifts gems downward to fill null cells
- **New gem spawning** above the board to refill empty top rows
- **Smooth falling animation** at a configurable speed (pixels per second)
- **Phase transition** from removing to falling, then back to idle

---

## Concepts

- **Column Gravity**: After removing matched gems, each column may have gaps (null cells). We walk each column from bottom to top with a write pointer, pulling non-null gems down. Any remaining empty slots at the top get filled with newly spawned gems.
- **Falling Animation**: Each gem has a `falling` flag and an animated `y` position. Each frame, falling gems move downward by `FALL_SPEED * (dt / 1000)` pixels. When a gem's `y` reaches its target row position, it snaps into place and stops falling.
- **Spawn Above Board**: New gems are created with their `y` set above the visible board so they appear to drop in from offscreen. Their `falling` flag is set to `true` so the animation system moves them downward.
- **Phase Flow**: The complete flow is now `idle -> swapping -> removing -> falling -> idle`. After all gems stop falling, the board is fully settled.

---

## Code

### 4.1 Add Gravity and Falling to BoardSystem

**File:** `src/contexts/canvas2d/games/match3/systems/BoardSystem.ts`

Add the `applyGravity` method and the `'falling'` phase handler.

```typescript
import type { Gem, GemType, Match3State } from '../types';
import {
  GEM_TYPES,
  ROWS,
  COLS,
  FALL_SPEED,
  REMOVE_DURATION,
  SWAP_DURATION,
} from '../types';

export class BoardSystem {
  /** Create a board with no initial matches */
  initBoard(state: Match3State): void {
    const board: (Gem | null)[][] = [];

    for (let r = 0; r < ROWS; r++) {
      board[r] = [];
      for (let c = 0; c < COLS; c++) {
        board[r][c] = this.createGem(r, c, state, board);
      }
    }

    state.board = board;
  }

  /** Find all horizontal and vertical matches of 3+ */
  findMatches(state: Match3State): Set<string> {
    const matched = new Set<string>();
    const { board } = state;

    // Horizontal runs
    for (let r = 0; r < ROWS; r++) {
      let run = 1;

      for (let c = 1; c < COLS; c++) {
        const prev = board[r][c - 1];
        const cur = board[r][c];

        if (prev && cur && prev.type === cur.type) {
          run++;
        } else {
          if (run >= 3) {
            for (let k = c - run; k < c; k++) matched.add(`${r},${k}`);
          }
          run = 1;
        }
      }

      if (run >= 3) {
        for (let k = COLS - run; k < COLS; k++) matched.add(`${r},${k}`);
      }
    }

    // Vertical runs
    for (let c = 0; c < COLS; c++) {
      let run = 1;

      for (let r = 1; r < ROWS; r++) {
        const prev = board[r - 1][c];
        const cur = board[r][c];

        if (prev && cur && prev.type === cur.type) {
          run++;
        } else {
          if (run >= 3) {
            for (let k = r - run; k < r; k++) matched.add(`${k},${c}`);
          }
          run = 1;
        }
      }

      if (run >= 3) {
        for (let k = ROWS - run; k < ROWS; k++) matched.add(`${k},${c}`);
      }
    }

    return matched;
  }

  /** Remove matched gems (set to null) */
  removeMatched(state: Match3State): void {
    for (const key of state.matched) {
      const [r, c] = key.split(',').map(Number);
      state.board[r][c] = null;
    }
  }

  /** Apply gravity: shift gems down, generate new ones at top */
  applyGravity(state: Match3State): boolean {
    let anyFalling = false;
    const { board, cellSize, boardOffsetX, boardOffsetY } = state;

    for (let c = 0; c < COLS; c++) {
      // Walk from bottom up, shift nulls down
      let writeRow = ROWS - 1;

      for (let r = ROWS - 1; r >= 0; r--) {
        if (board[r][c] !== null) {
          const gem = board[r][c]!;

          if (r !== writeRow) {
            gem.row = writeRow;
            gem.falling = true;
            anyFalling = true;
            board[writeRow][c] = gem;
            board[r][c] = null;
          }

          gem.col = c;
          writeRow--;
        }
      }

      // Fill empty top rows with new gems (spawned above the board)
      for (let r = writeRow; r >= 0; r--) {
        const type = GEM_TYPES[Math.floor(Math.random() * GEM_TYPES.length)];
        const gem: Gem = {
          type,
          row: r,
          col: c,
          x: boardOffsetX + c * cellSize + cellSize / 2,
          // Spawn above the board so the gem falls into view
          y: boardOffsetY + (r - (writeRow - r + 1)) * cellSize + cellSize / 2,
          falling: true,
          scale: 1,
          opacity: 1,
        };

        board[r][c] = gem;
        anyFalling = true;
      }
    }

    return anyFalling;
  }

  /** Perform a swap on the board array */
  swap(
    state: Match3State,
    rA: number,
    cA: number,
    rB: number,
    cB: number,
  ): void {
    const a = state.board[rA][cA];
    const b = state.board[rB][cB];

    if (a) {
      a.row = rB;
      a.col = cB;
    }
    if (b) {
      b.row = rA;
      b.col = cA;
    }

    state.board[rA][cA] = b;
    state.board[rB][cB] = a;
  }

  /** Phase-based update — called each frame */
  update(state: Match3State, dt: number): void {
    switch (state.phase) {
      case 'swapping':
        this.tickSwap(state, dt);
        break;
      case 'swap-back':
        this.tickSwapBack(state, dt);
        break;
      case 'removing':
        this.tickRemoving(state, dt);
        break;
      case 'falling':
        this.tickFalling(state, dt);
        break;
    }
  }

  /* ---------- private phase handlers ---------- */

  private tickSwap(state: Match3State, dt: number): void {
    state.phaseTimer += dt;

    if (state.phaseTimer >= SWAP_DURATION) {
      const matches = this.findMatches(state);

      if (matches.size > 0) {
        state.matched = matches;
        state.phase = 'removing';
        state.phaseTimer = 0;
        state.combo = 1;
      } else {
        if (state.swapA && state.swapB) {
          this.swap(
            state,
            state.swapA.row,
            state.swapA.col,
            state.swapB.row,
            state.swapB.col,
          );
        }
        state.phase = 'swap-back';
        state.phaseTimer = 0;
      }
    }
  }

  private tickSwapBack(state: Match3State, dt: number): void {
    state.phaseTimer += dt;

    if (state.phaseTimer >= SWAP_DURATION) {
      state.phase = 'idle';
      state.swapA = null;
      state.swapB = null;
      state.movesLeft++;
    }
  }

  private tickRemoving(state: Match3State, dt: number): void {
    state.phaseTimer += dt;
    const progress = Math.min(state.phaseTimer / REMOVE_DURATION, 1);

    for (const key of state.matched) {
      const [r, c] = key.split(',').map(Number);
      const gem = state.board[r][c];

      if (gem) {
        gem.scale = 1 - progress * 0.5;
        gem.opacity = 1 - progress;
      }
    }

    if (progress >= 1) {
      this.removeMatched(state);
      state.matched.clear();
      this.applyGravity(state);
      state.phase = 'falling';
      state.phaseTimer = 0;
    }
  }

  private tickFalling(state: Match3State, dt: number): void {
    let anyFalling = false;
    const { board, cellSize, boardOffsetX, boardOffsetY } = state;

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const gem = board[r][c];
        if (!gem) continue;

        const targetY = boardOffsetY + r * cellSize + cellSize / 2;
        const targetX = boardOffsetX + c * cellSize + cellSize / 2;

        if (gem.falling) {
          gem.y += FALL_SPEED * (dt / 1000);
          gem.x = targetX;

          if (gem.y >= targetY) {
            gem.y = targetY;
            gem.falling = false;
          } else {
            anyFalling = true;
          }
        } else {
          gem.x = targetX;
          gem.y = targetY;
        }
      }
    }

    if (!anyFalling) {
      // All gems settled — return to idle
      state.phase = 'idle';
      state.swapA = null;
      state.swapB = null;
      state.combo = 0;

      // Check game over (out of moves)
      if (state.movesLeft <= 0) {
        state.phase = 'game-over';
        state.gameOver = true;
      }
    }
  }

  private createGem(
    row: number,
    col: number,
    state: Match3State,
    board: (Gem | null)[][],
  ): Gem {
    const { cellSize, boardOffsetX, boardOffsetY } = state;
    let type: GemType;

    do {
      type = GEM_TYPES[Math.floor(Math.random() * GEM_TYPES.length)];
    } while (this.causesMatch(board, row, col, type));

    return {
      type,
      row,
      col,
      x: boardOffsetX + col * cellSize + cellSize / 2,
      y: boardOffsetY + row * cellSize + cellSize / 2,
      falling: false,
      scale: 1,
      opacity: 1,
    };
  }

  private causesMatch(
    board: (Gem | null)[][],
    row: number,
    col: number,
    type: GemType,
  ): boolean {
    if (
      col >= 2 &&
      board[row][col - 1]?.type === type &&
      board[row][col - 2]?.type === type
    )
      return true;

    if (
      row >= 2 &&
      board[row - 1]?.[col]?.type === type &&
      board[row - 2]?.[col]?.type === type
    )
      return true;

    return false;
  }
}
```

**What's happening:**
- `applyGravity` processes each column independently. It uses a write-pointer that starts at the bottom row and works upward. Non-null gems are shifted down to the write pointer position. This is the classic "compact nulls" algorithm.
- New gems spawned at the top have their `y` set to a position above the board: `(r - offset) * cellSize`. This means they start offscreen and fall into view.
- `tickFalling` moves each falling gem downward by `FALL_SPEED * dt/1000` pixels per frame. When `gem.y >= targetY`, the gem snaps to its final position and `falling` is set to `false`.
- When no gems are still falling (`anyFalling === false`), the phase transitions back to `'idle'`. If the player has run out of moves, it transitions to `'game-over'` instead.

---

## Test It

1. **Run:** `pnpm dev`
2. **Open:** the Match-3 game in your browser
3. **Observe:**
   - **Match 3+ gems** and after they fade out, the gems above them **fall down** smoothly
   - **New gems drop in from above** the board to fill the empty top rows
   - The board is always **fully filled** after gravity finishes
   - Gems fall at a consistent speed regardless of frame rate (delta-time based)
   - After all moves are used, a **game over** state is triggered
   - The full flow works: **select -> swap -> match -> remove -> fall -> settle**

---

## Challenges

**Easy:**
- Change `FALL_SPEED` from 800 to 400 pixels/second to see gems fall in slow motion.
- Add a `console.log` in `applyGravity` showing how many new gems were spawned per column.

**Medium:**
- Add a subtle bounce effect when gems land: overshoot the target `y` by a few pixels then ease back.

**Hard:**
- Instead of spawning gems with random types, implement a weighted random that slightly favours colours already on the board, making matches more likely and the game more rewarding.

---

## What You Learned

- Column-based gravity using a write-pointer compaction algorithm
- Spawning new gems above the visible board for a "dropping in" effect
- Animating falls at a constant pixel-per-second speed using delta time
- Connecting the full phase pipeline: swap, match, remove, fall, settle

**Next:** Cascades and chain scoring -- detect new matches after gravity and award combo multipliers!

---
[<- Previous Step](./step-3.md) | [Back to Game README](./README.md) | [Next Step ->](./step-5.md)
