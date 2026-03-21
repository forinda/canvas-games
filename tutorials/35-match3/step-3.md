# Step 3: Match Detection & Removal

**Goal:** Find runs of 3 or more matching gems (horizontally and vertically) and remove them from the board.

**Time:** ~15 minutes

---

## What You'll Build

- **Horizontal match detection** scanning each row for runs of 3+ same-colour gems
- **Vertical match detection** scanning each column for runs of 3+ same-colour gems
- **Phase-based state machine** that transitions from swap to match-check to removal
- **Gem removal** that sets matched cells to `null`, leaving gaps in the board
- **Swap-back logic** that reverses an invalid swap (one that creates no matches)

---

## Concepts

- **Run-Length Scanning**: Walk each row left-to-right, counting consecutive gems of the same type. When the type changes or the row ends, if the run was 3+, mark all those cells. Repeat for columns top-to-bottom.
- **Set-Based Match Tracking**: Store matched cell coordinates as `"row,col"` strings in a `Set<string>`. This naturally deduplicates cells that appear in both a horizontal and vertical match (e.g., an L-shaped or T-shaped match).
- **Phase State Machine**: Instead of doing everything in one click handler, we use a `phase` field to sequence operations: `idle -> swapping -> (removing | swap-back) -> idle`. Each phase runs for a duration (in milliseconds) and transitions to the next.
- **Swap Validation**: After a swap completes, check for matches. If none are found, swap the gems back and refund the move.

---

## Code

### 3.1 Add Match Detection to BoardSystem

**File:** `src/games/match3/systems/BoardSystem.ts`

Extend the `BoardSystem` with `findMatches`, `removeMatched`, and the phase update logic.

```typescript
import type { Gem, GemType, Match3State } from '../types';
import { GEM_TYPES, ROWS, COLS, SWAP_DURATION, REMOVE_DURATION } from '../types';

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
    }
  }

  /* ---------- private ---------- */

  private tickSwap(state: Match3State, dt: number): void {
    state.phaseTimer += dt;

    if (state.phaseTimer >= SWAP_DURATION) {
      // Swap complete — check for matches
      const matches = this.findMatches(state);

      if (matches.size > 0) {
        state.matched = matches;
        state.phase = 'removing';
        state.phaseTimer = 0;
        state.combo = 1;
      } else {
        // No match — swap back
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
      // Refund the move since the swap was invalid
      state.movesLeft++;
    }
  }

  private tickRemoving(state: Match3State, dt: number): void {
    state.phaseTimer += dt;
    const progress = Math.min(state.phaseTimer / REMOVE_DURATION, 1);

    // Animate removal: shrink and fade matched gems
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
      // For now, go back to idle. In Step 4 we add gravity.
      state.phase = 'idle';
      state.swapA = null;
      state.swapB = null;
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
- `findMatches` scans all rows and columns independently. For each row, it walks left-to-right maintaining a `run` counter. When the gem type changes, if the run was 3+, it adds all those coordinates to the set. The same logic applies vertically.
- `tickSwap` waits for `SWAP_DURATION` ms, then checks for matches. If matches exist, it transitions to `'removing'`. If not, it swaps the gems back and enters `'swap-back'`.
- `tickSwapBack` waits for `SWAP_DURATION` ms again, then returns to `'idle'` and refunds the move.
- `tickRemoving` animates matched gems over `REMOVE_DURATION` ms, shrinking their scale from 1 to 0.5 and fading opacity from 1 to 0. When complete, it sets matched cells to `null`.

---

### 3.2 Update InputSystem for Phase-Based Swapping

**File:** `src/games/match3/systems/InputSystem.ts`

The swap now triggers a phase transition instead of an immediate swap-and-snap.

```typescript
import type { Match3State } from '../types';
import type { BoardSystem } from './BoardSystem';

export class InputSystem {
  private state: Match3State;
  private canvas: HTMLCanvasElement;
  private boardSystem: BoardSystem;

  private handleClick: (e: MouseEvent) => void;
  private handleKeyDown: (e: KeyboardEvent) => void;

  constructor(
    state: Match3State,
    canvas: HTMLCanvasElement,
    boardSystem: BoardSystem,
  ) {
    this.state = state;
    this.canvas = canvas;
    this.boardSystem = boardSystem;

    this.handleClick = this.onClick.bind(this);
    this.handleKeyDown = this.onKeyDown.bind(this);
  }

  attach(): void {
    this.canvas.addEventListener('click', this.handleClick);
    window.addEventListener('keydown', this.handleKeyDown);
  }

  detach(): void {
    this.canvas.removeEventListener('click', this.handleClick);
    window.removeEventListener('keydown', this.handleKeyDown);
  }

  private onClick(e: MouseEvent): void {
    const s = this.state;

    if (s.gameOver || s.paused) return;
    if (s.phase !== 'idle') return;

    const rect = this.canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const col = Math.floor((mx - s.boardOffsetX) / s.cellSize);
    const row = Math.floor((my - s.boardOffsetY) / s.cellSize);

    if (row < 0 || row >= s.rows || col < 0 || col >= s.cols) {
      s.selected = null;
      return;
    }

    if (!s.selected) {
      s.selected = { row, col };
      return;
    }

    // Second click — must be adjacent
    const dr = Math.abs(row - s.selected.row);
    const dc = Math.abs(col - s.selected.col);
    const isAdjacent = (dr === 1 && dc === 0) || (dr === 0 && dc === 1);

    if (!isAdjacent) {
      s.selected = { row, col };
      return;
    }

    // Perform swap and enter swapping phase
    s.swapA = { row: s.selected.row, col: s.selected.col };
    s.swapB = { row, col };
    this.boardSystem.swap(s, s.swapA.row, s.swapA.col, s.swapB.row, s.swapB.col);
    s.movesLeft--;
    s.phase = 'swapping';
    s.phaseTimer = 0;
    s.selected = null;
  }

  private onKeyDown(e: KeyboardEvent): void {
    const s = this.state;

    switch (e.key.toLowerCase()) {
      case 'p':
        if (!s.gameOver) s.paused = !s.paused;
        break;
    }
  }
}
```

**What's happening:**
- Instead of immediately snapping gem positions, the click handler now sets `swapA` and `swapB` coordinates and transitions to the `'swapping'` phase.
- The `BoardSystem.update()` method (called each frame) handles the timing and match-checking.
- The phase guard `if (s.phase !== 'idle') return` prevents clicks during animations.

---

### 3.3 Update the Board Renderer for Matched Gems

**File:** `src/games/match3/renderers/BoardRenderer.ts`

Add enhanced glow for matched gems so they visually flash before disappearing.

```typescript
import type { Match3State } from '../types';
import { GEM_COLORS, GEM_GLOW, ROWS, COLS } from '../types';

export class BoardRenderer {
  render(ctx: CanvasRenderingContext2D, state: Match3State): void {
    const { board, cellSize, boardOffsetX, boardOffsetY, selected, matched } = state;

    // Board background
    ctx.fillStyle = '#1a1a2e';
    ctx.beginPath();
    ctx.roundRect(
      boardOffsetX - 4,
      boardOffsetY - 4,
      COLS * cellSize + 8,
      ROWS * cellSize + 8,
      12,
    );
    ctx.fill();

    // Grid lines (subtle)
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;

    for (let r = 0; r <= ROWS; r++) {
      ctx.beginPath();
      ctx.moveTo(boardOffsetX, boardOffsetY + r * cellSize);
      ctx.lineTo(boardOffsetX + COLS * cellSize, boardOffsetY + r * cellSize);
      ctx.stroke();
    }

    for (let c = 0; c <= COLS; c++) {
      ctx.beginPath();
      ctx.moveTo(boardOffsetX + c * cellSize, boardOffsetY);
      ctx.lineTo(boardOffsetX + c * cellSize, boardOffsetY + ROWS * cellSize);
      ctx.stroke();
    }

    // Selected highlight
    if (selected) {
      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.fillRect(
        boardOffsetX + selected.col * cellSize,
        boardOffsetY + selected.row * cellSize,
        cellSize,
        cellSize,
      );
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.strokeRect(
        boardOffsetX + selected.col * cellSize + 1,
        boardOffsetY + selected.row * cellSize + 1,
        cellSize - 2,
        cellSize - 2,
      );
    }

    // Gems
    const radius = cellSize * 0.38;

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const gem = board[r][c];
        if (!gem) continue;

        ctx.save();
        ctx.globalAlpha = gem.opacity;

        const cx = gem.x;
        const cy = gem.y;
        const drawRadius = radius * gem.scale;

        // Enhanced glow for matched gems
        const isMatched = matched.has(`${r},${c}`);

        if (isMatched) {
          ctx.shadowColor = GEM_GLOW[gem.type];
          ctx.shadowBlur = 20;
        } else {
          ctx.shadowColor = GEM_GLOW[gem.type];
          ctx.shadowBlur = 8;
        }

        // Main circle with radial gradient
        const gradient = ctx.createRadialGradient(
          cx - drawRadius * 0.3,
          cy - drawRadius * 0.3,
          drawRadius * 0.1,
          cx,
          cy,
          drawRadius,
        );
        gradient.addColorStop(0, GEM_GLOW[gem.type]);
        gradient.addColorStop(1, GEM_COLORS[gem.type]);

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(cx, cy, drawRadius, 0, Math.PI * 2);
        ctx.fill();

        // Specular highlight
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.beginPath();
        ctx.ellipse(
          cx - drawRadius * 0.2,
          cy - drawRadius * 0.25,
          drawRadius * 0.35,
          drawRadius * 0.2,
          -0.5,
          0,
          Math.PI * 2,
        );
        ctx.fill();

        ctx.restore();
      }
    }
  }
}
```

**What's happening:**
- Matched gems get `shadowBlur = 20` (instead of the normal 8), creating a bright flash effect before they fade out.
- The `isMatched` check uses `matched.has(\`${r},${c}\`)` to test against the set of matched coordinates.
- Since `gem.scale` and `gem.opacity` are being animated by the `tickRemoving` method, the renderer automatically shows the shrink-and-fade effect.

---

### 3.4 Update the Engine with Delta Time

**File:** `src/games/match3/Match3Engine.ts`

Add `lastTime` tracking and pass `dt` to `boardSystem.update()`.

```typescript
import type { Match3State } from './types';
import { ROWS, COLS, MAX_MOVES } from './types';
import { BoardSystem } from './systems/BoardSystem';
import { InputSystem } from './systems/InputSystem';
import { BoardRenderer } from './renderers/BoardRenderer';

export class Match3Engine {
  private ctx: CanvasRenderingContext2D;
  private state: Match3State;
  private running = false;
  private rafId = 0;
  private lastTime = 0;

  private boardSystem: BoardSystem;
  private inputSystem: InputSystem;
  private boardRenderer: BoardRenderer;
  private resizeHandler: () => void;

  constructor(canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const cellSize = Math.floor(
      Math.min((canvas.width - 80) / COLS, (canvas.height - 120) / ROWS),
    );
    const boardW = COLS * cellSize;
    const boardH = ROWS * cellSize;

    this.state = {
      board: [],
      rows: ROWS,
      cols: COLS,
      cellSize,
      boardOffsetX: (canvas.width - boardW) / 2,
      boardOffsetY: (canvas.height - boardH) / 2 + 24,
      selected: null,
      swapA: null,
      swapB: null,
      phase: 'idle',
      phaseTimer: 0,
      score: 0,
      highScore: 0,
      combo: 0,
      movesLeft: MAX_MOVES,
      maxMoves: MAX_MOVES,
      matched: new Set(),
      paused: false,
      started: true,
      gameOver: false,
      canvasW: canvas.width,
      canvasH: canvas.height,
    };

    this.boardSystem = new BoardSystem();
    this.boardRenderer = new BoardRenderer();

    this.boardSystem.initBoard(this.state);

    this.inputSystem = new InputSystem(
      this.state,
      canvas,
      this.boardSystem,
    );
    this.inputSystem.attach();

    this.resizeHandler = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      this.recalcLayout(canvas);
    };
    window.addEventListener('resize', this.resizeHandler);
  }

  start(): void {
    this.running = true;
    this.lastTime = performance.now();
    this.loop();
  }

  destroy(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
    this.inputSystem.detach();
    window.removeEventListener('resize', this.resizeHandler);
  }

  private loop(): void {
    if (!this.running) return;

    const now = performance.now();
    const dt = now - this.lastTime;
    this.lastTime = now;

    if (!this.state.paused) {
      this.boardSystem.update(this.state, dt);
    }

    this.render();
    this.rafId = requestAnimationFrame(() => this.loop());
  }

  private render(): void {
    const { ctx, state } = this;

    ctx.fillStyle = '#0f0f1a';
    ctx.fillRect(0, 0, state.canvasW, state.canvasH);

    this.boardRenderer.render(ctx, state);
  }

  private recalcLayout(canvas: HTMLCanvasElement): void {
    const s = this.state;
    s.canvasW = canvas.width;
    s.canvasH = canvas.height;
    s.cellSize = Math.floor(
      Math.min((canvas.width - 80) / COLS, (canvas.height - 120) / ROWS),
    );
    const boardW = COLS * s.cellSize;
    const boardH = ROWS * s.cellSize;

    s.boardOffsetX = (canvas.width - boardW) / 2;
    s.boardOffsetY = (canvas.height - boardH) / 2 + 24;

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const gem = s.board[r]?.[c];
        if (gem) {
          gem.x = s.boardOffsetX + c * s.cellSize + s.cellSize / 2;
          gem.y = s.boardOffsetY + r * s.cellSize + s.cellSize / 2;
        }
      }
    }
  }
}
```

**What's happening:**
- `performance.now()` gives a high-resolution timestamp. The difference `dt` is the milliseconds since the last frame.
- `boardSystem.update(state, dt)` is called every frame (when not paused) to advance the phase timer and handle state transitions.
- This is the standard game loop pattern: update state based on elapsed time, then render the current state.

---

## Test It

1. **Run:** `pnpm dev`
2. **Open:** the Match-3 game in your browser
3. **Observe:**
   - **Swap two adjacent gems** that form a line of 3+ matching colours
   - Matched gems **flash brightly** then **shrink and fade** out over 200ms
   - The matched cells become **empty gaps** on the board (dark holes)
   - **Swap two gems that do not create a match** and they swap back automatically; the move is refunded
   - Gems **cannot be clicked** during the swap/removal animation (phase guard)

---

## Challenges

**Easy:**
- Change `REMOVE_DURATION` from 200 to 500ms to see the fade-out animation in slow motion.
- Log `matches.size` after `findMatches` to see how many gems were matched at once.

**Medium:**
- Modify `findMatches` to also detect diagonal runs of 3+ (top-left to bottom-right and top-right to bottom-left).

**Hard:**
- Add visual feedback for invalid swaps: flash the two gems red briefly before swapping them back.

---

## What You Learned

- Run-length scanning to detect horizontal and vertical matches of 3+
- Using a `Set<string>` to deduplicate overlapping matches
- Building a phase-based state machine with timed transitions
- Animating gem removal with scale and opacity interpolation
- Validating swaps and reverting invalid ones with move refunding

**Next:** Gravity and refill -- make gems fall down to fill gaps, and spawn new gems from the top!

---
[<- Previous Step](./step-2.md) | [Back to Game README](./README.md) | [Next Step ->](./step-4.md)
