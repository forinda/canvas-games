# Step 5: Cascades & Chain Scoring

**Goal:** Detect new matches after gems fall, create chain reactions with combo multiplier scoring.

**Time:** ~15 minutes

---

## What You'll Build

- **Cascade detection** that re-checks for matches after gravity settles
- **Chain reactions** where one match leads to falls that create more matches
- **Combo multiplier scoring** (base points x combo level) for each cascade
- **Score System** with high-score persistence to localStorage
- **HUD renderer** showing score, moves remaining, high score, and combo indicator

---

## Concepts

- **Cascading Matches**: After gravity fills gaps and gems settle, new 3+ runs may have formed. We re-run `findMatches` and, if any are found, increment the combo counter and re-enter the `'removing'` phase. This loop continues until no new matches form.
- **Combo Multiplier**: Each cascade in a chain increments `state.combo`. Points are calculated as `matchCount * 10 * combo`. A 3-gem match on the first combo scores 30, but a 3-gem cascade at combo 4 scores 120. This rewards players who plan moves that create chain reactions.
- **Score Persistence**: The high score is saved to `localStorage` using a dedicated key. On load, we read the stored value. On each score update, we check if it exceeds the high score and persist the new record.

---

## Code

### 5.1 Add Cascade Logic to BoardSystem

**File:** `src/games/match3/systems/BoardSystem.ts`

The key change is in `tickFalling`: when all gems have settled, instead of always returning to `'idle'`, we check for new matches and re-enter `'removing'` if any are found.

Update the `tickFalling` method (the rest of the file stays the same as Step 4):

```typescript
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
      // Check for cascading matches
      const matches = this.findMatches(state);

      if (matches.size > 0) {
        // New matches found — cascade!
        state.matched = matches;
        state.combo++;
        state.phase = 'removing';
        state.phaseTimer = 0;
      } else {
        // No more matches — chain complete
        state.phase = 'idle';
        state.swapA = null;
        state.swapB = null;
        state.combo = 0;

        // Check game over
        if (state.movesLeft <= 0) {
          state.phase = 'game-over';
          state.gameOver = true;
        }
      }
    }
  }
```

**What's happening:**
- After all gems have settled (`anyFalling === false`), we call `findMatches` again.
- If new matches exist, we increment `state.combo` and go back to `'removing'`. This creates the cascade loop: remove -> fall -> check -> remove -> fall -> check -> ... until no matches remain.
- The combo counter starts at 1 (set during the initial swap match) and increments with each cascade. It resets to 0 when the chain completes.

---

### 5.2 Create the Score System

**File:** `src/games/match3/systems/ScoreSystem.ts`

Awards points when matches are found, applies the combo multiplier, and persists the high score.

```typescript
import type { Match3State } from '../types';
import { HS_KEY } from '../types';

export class ScoreSystem {
  private lastMatchedCount = 0;

  update(state: Match3State, _dt: number): void {
    if (state.phase !== 'removing') return;

    const count = state.matched.size;

    if (count === 0 || count === this.lastMatchedCount) return;

    this.lastMatchedCount = count;

    // Base 10 points per gem, times combo multiplier
    const points = count * 10 * Math.max(state.combo, 1);
    state.score += points;

    // Persist high score
    if (state.score > state.highScore) {
      state.highScore = state.score;

      try {
        localStorage.setItem(HS_KEY, String(state.highScore));
      } catch {
        /* storage unavailable */
      }
    }
  }

  /** Reset tracking between rounds */
  reset(): void {
    this.lastMatchedCount = 0;
  }
}
```

**What's happening:**
- The score system only runs during the `'removing'` phase.
- It tracks `lastMatchedCount` to avoid double-counting the same set of matches across multiple frames.
- Points formula: `matchCount * 10 * combo`. A 4-gem match at combo 3 gives `4 * 10 * 3 = 120` points.
- High score is persisted to localStorage. The `try/catch` handles environments where storage is unavailable (private browsing, etc).

---

### 5.3 Create the HUD Renderer

**File:** `src/games/match3/renderers/HUDRenderer.ts`

Displays score, high score, moves remaining, and a combo indicator during cascades.

```typescript
import type { Match3State } from '../types';

const GAME_COLOR = '#e91e63';

export class HUDRenderer {
  render(ctx: CanvasRenderingContext2D, state: Match3State): void {
    const W = state.canvasW;

    // --- Top HUD bar ---
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, W, 48);

    ctx.font = 'bold 16px monospace';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';

    // Score
    ctx.fillStyle = GAME_COLOR;
    ctx.fillText('SCORE', 16, 24);
    ctx.fillStyle = '#fff';
    ctx.fillText(String(state.score), 90, 24);

    // High score
    ctx.fillStyle = '#888';
    ctx.fillText(`HI: ${state.highScore}`, 200, 24);

    // Moves
    ctx.textAlign = 'right';
    ctx.fillStyle = state.movesLeft <= 5 ? '#ef4444' : '#4ade80';
    ctx.fillText(`MOVES: ${state.movesLeft}`, W - 16, 24);

    // Combo indicator (during cascades)
    if (state.combo > 1 && (state.phase === 'removing' || state.phase === 'falling')) {
      ctx.textAlign = 'center';
      ctx.font = `bold ${18 + state.combo * 2}px monospace`;
      ctx.fillStyle = GAME_COLOR;
      ctx.fillText(`COMBO x${state.combo}!`, W / 2, 24);
    }

    // --- Overlay screens ---
    if (state.gameOver) {
      this.drawOverlay(
        ctx,
        state,
        'GAME OVER',
        `Final Score: ${state.score}  |  Press [Space] to retry`,
      );
    } else if (state.paused) {
      this.drawOverlay(ctx, state, 'PAUSED', 'Press [P] to resume');
    }
  }

  private drawOverlay(
    ctx: CanvasRenderingContext2D,
    state: Match3State,
    title: string,
    subtitle: string,
  ): void {
    const W = state.canvasW;
    const H = state.canvasH;

    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, W, H);

    const panelW = Math.min(400, W * 0.7);
    const panelH = 160;
    const px = (W - panelW) / 2;
    const py = (H - panelH) / 2;

    ctx.fillStyle = '#12121f';
    ctx.beginPath();
    ctx.roundRect(px, py, panelW, panelH, 12);
    ctx.fill();

    ctx.strokeStyle = GAME_COLOR;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(px, py, panelW, panelH, 12);
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.font = 'bold 28px monospace';
    ctx.fillStyle = GAME_COLOR;
    ctx.fillText(title, W / 2, py + 55);

    ctx.font = '14px monospace';
    ctx.fillStyle = '#aaa';
    ctx.fillText(subtitle, W / 2, py + 105);
  }
}
```

**What's happening:**
- The HUD bar is a semi-transparent black strip across the top of the screen.
- Score is displayed in the game's accent pink (`#e91e63`), high score in grey, and moves in green (or red when 5 or fewer remain).
- The combo indicator only appears during active cascades (`combo > 1` during `'removing'` or `'falling'` phases). Its font size grows with the combo level for visual emphasis.
- The overlay method draws a centred modal panel with rounded corners, used for game-over and pause screens.

---

### 5.4 Wire Everything into the Engine

**File:** `src/games/match3/Match3Engine.ts`

Add the ScoreSystem, HUDRenderer, high-score loading, and restart support.

```typescript
import type { Match3State } from './types';
import { ROWS, COLS, MAX_MOVES, HS_KEY } from './types';
import { BoardSystem } from './systems/BoardSystem';
import { InputSystem } from './systems/InputSystem';
import { ScoreSystem } from './systems/ScoreSystem';
import { BoardRenderer } from './renderers/BoardRenderer';
import { HUDRenderer } from './renderers/HUDRenderer';

export class Match3Engine {
  private ctx: CanvasRenderingContext2D;
  private state: Match3State;
  private running = false;
  private rafId = 0;
  private lastTime = 0;

  private boardSystem: BoardSystem;
  private inputSystem: InputSystem;
  private scoreSystem: ScoreSystem;
  private boardRenderer: BoardRenderer;
  private hudRenderer: HUDRenderer;
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

    let hs = 0;
    try {
      hs = parseInt(localStorage.getItem(HS_KEY) ?? '0', 10) || 0;
    } catch {
      /* noop */
    }

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
      highScore: hs,
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
    this.scoreSystem = new ScoreSystem();
    this.boardRenderer = new BoardRenderer();
    this.hudRenderer = new HUDRenderer();

    this.boardSystem.initBoard(this.state);

    this.inputSystem = new InputSystem(
      this.state,
      canvas,
      this.boardSystem,
      () => this.reset(),
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
      this.scoreSystem.update(this.state, dt);
    }

    this.render();
    this.rafId = requestAnimationFrame(() => this.loop());
  }

  private render(): void {
    const { ctx, state } = this;

    ctx.fillStyle = '#0f0f1a';
    ctx.fillRect(0, 0, state.canvasW, state.canvasH);

    this.boardRenderer.render(ctx, state);
    this.hudRenderer.render(ctx, state);
  }

  private reset(): void {
    const s = this.state;
    s.score = 0;
    s.movesLeft = MAX_MOVES;
    s.combo = 0;
    s.phase = 'idle';
    s.phaseTimer = 0;
    s.selected = null;
    s.swapA = null;
    s.swapB = null;
    s.matched.clear();
    s.gameOver = false;
    this.scoreSystem.reset();
    this.boardSystem.initBoard(s);
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

---

### 5.5 Update InputSystem for Restart

**File:** `src/games/match3/systems/InputSystem.ts`

Add the `onReset` callback and Space key handling.

```typescript
import type { Match3State } from '../types';
import type { BoardSystem } from './BoardSystem';

export class InputSystem {
  private state: Match3State;
  private canvas: HTMLCanvasElement;
  private boardSystem: BoardSystem;
  private onReset: () => void;

  private handleClick: (e: MouseEvent) => void;
  private handleKeyDown: (e: KeyboardEvent) => void;

  constructor(
    state: Match3State,
    canvas: HTMLCanvasElement,
    boardSystem: BoardSystem,
    onReset: () => void,
  ) {
    this.state = state;
    this.canvas = canvas;
    this.boardSystem = boardSystem;
    this.onReset = onReset;

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

    const dr = Math.abs(row - s.selected.row);
    const dc = Math.abs(col - s.selected.col);
    const isAdjacent = (dr === 1 && dc === 0) || (dr === 0 && dc === 1);

    if (!isAdjacent) {
      s.selected = { row, col };
      return;
    }

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
      case ' ':
        e.preventDefault();
        if (s.gameOver) this.onReset();
        break;
    }
  }
}
```

**What's happening:**
- The `onReset` callback is passed from the engine and called when Space is pressed during game over.
- `e.preventDefault()` on Space prevents the page from scrolling.

---

## Test It

1. **Run:** `pnpm dev`
2. **Open:** the Match-3 game in your browser
3. **Observe:**
   - **Score** appears in the top-left HUD bar, **moves** in the top-right
   - Make a match and watch the **score increase** by `matchCount * 10`
   - Create a match near the bottom of the board -- after gravity, if new matches form, you see a **COMBO x2!** (or higher) indicator and the multiplier is applied
   - **High score** persists across page reloads (check localStorage)
   - When **moves reach 0**, the game-over overlay appears with your final score
   - Press **Space** to restart with a fresh board and reset score
   - Moves counter turns **red** when 5 or fewer remain

---

## Challenges

**Easy:**
- Change the base points from 10 to 25 per gem and observe how scores grow faster.
- Make the combo text pulse by adding a `Math.sin(Date.now() / 100)` offset to the font size.

**Medium:**
- Add a "cascade preview" that highlights cells where new matches will form after gravity (before they actually match).

**Hard:**
- Implement a "streak bonus" that awards extra points when the player makes matches on consecutive turns without a failed swap.

---

## What You Learned

- Cascade detection by re-checking for matches after gravity settles
- Building a self-reinforcing loop: remove -> fall -> check -> remove -> ...
- Combo multiplier scoring with `matchCount * 10 * combo`
- Persisting high scores to localStorage with error handling
- Rendering a HUD with score, moves, high score, and dynamic combo text

**Next:** Animations and polish -- smooth swap tweening, pop effects, no-moves detection, and start/pause overlays!

---
[<- Previous Step](./step-4.md) | [Back to Game README](./README.md) | [Next Step ->](./step-6.md)
