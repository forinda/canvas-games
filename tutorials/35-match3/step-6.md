# Step 6: Animations & Polish

**Goal:** Add swap tweening, pop effects, no-moves detection, start screen, and final polish.

**Time:** ~15 minutes

---

## What You'll Build

- **Smooth swap animation** with eased position interpolation between gems
- **Swap-back animation** that visually reverses invalid swaps
- **Idle gem snapping** to keep positions pixel-perfect between animations
- **Start screen** overlay requiring a click to begin
- **No-moves detection** placeholder for board reshuffle
- **Complete game** with all systems wired together

---

## Concepts

- **Tweening**: During the `'swapping'` and `'swap-back'` phases, gem pixel positions are interpolated between their start and end grid positions. An easing function (`easeInOutQuad`) makes the motion feel natural -- accelerating at the start and decelerating at the end.
- **Swap-Back Visual**: When a swap produces no match, the gems visually slide back to their original positions. We use `1 - t` for the interpolation factor so the animation plays in reverse.
- **Idle Snapping**: Between animations, gems are snapped to exact grid positions. This prevents floating-point drift from accumulating over many frames and keeps the board looking crisp.
- **Start Screen**: The game begins in a non-started state with an overlay prompting the player to click. This gives the player a moment to see the board before play begins.

---

## Code

### 6.1 Create the Animation System

**File:** `src/games/match3/systems/AnimationSystem.ts`

Drives smooth gem position updates for swapping, swap-back, and idle snapping.

```typescript
import type { Match3State } from '../types';
import { SWAP_DURATION } from '../types';

export class AnimationSystem {
  update(state: Match3State, _dt: number): void {
    const {
      board,
      cellSize,
      boardOffsetX,
      boardOffsetY,
      phase,
      phaseTimer,
      swapA,
      swapB,
    } = state;

    // Animate swap / swap-back by interpolating positions
    if ((phase === 'swapping' || phase === 'swap-back') && swapA && swapB) {
      const t = Math.min(phaseTimer / SWAP_DURATION, 1);
      const eased = this.easeInOutQuad(phase === 'swap-back' ? 1 - t : t);

      const gemA = board[swapA.row]?.[swapA.col];
      const gemB = board[swapB.row]?.[swapB.col];

      if (gemA && gemB) {
        const axTarget = boardOffsetX + swapA.col * cellSize + cellSize / 2;
        const ayTarget = boardOffsetY + swapA.row * cellSize + cellSize / 2;
        const bxTarget = boardOffsetX + swapB.col * cellSize + cellSize / 2;
        const byTarget = boardOffsetY + swapB.row * cellSize + cellSize / 2;

        // gemA is at swapA position in the array (after the data swap)
        // Interpolate from where it visually was to where it now belongs
        gemA.x = axTarget + (bxTarget - axTarget) * eased;
        gemA.y = ayTarget + (byTarget - ayTarget) * eased;
        gemB.x = bxTarget + (axTarget - bxTarget) * eased;
        gemB.y = byTarget + (ayTarget - byTarget) * eased;
      }
    }

    // Snap idle gems to their grid positions
    if (phase === 'idle' || phase === 'game-over') {
      for (let r = 0; r < state.rows; r++) {
        for (let c = 0; c < state.cols; c++) {
          const gem = board[r][c];

          if (gem && !gem.falling) {
            gem.x = boardOffsetX + c * cellSize + cellSize / 2;
            gem.y = boardOffsetY + r * cellSize + cellSize / 2;
            gem.scale = 1;
            gem.opacity = 1;
          }
        }
      }
    }
  }

  private easeInOutQuad(t: number): number {
    return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
  }
}
```

**What's happening:**
- During `'swapping'`, `t` goes from 0 to 1 over `SWAP_DURATION` ms. The eased value is applied to interpolate both gems' positions. GemA slides from its original position toward gemB's position, and vice versa.
- During `'swap-back'`, we use `1 - t` instead of `t`. Since the data swap was already reversed by `BoardSystem.tickSwap`, both gems are now back in their original array slots. Using `1 - t` makes them visually slide from the "swapped" position back to their home position.
- `easeInOutQuad` starts slow, speeds up in the middle, and slows down at the end. The formula `t < 0.5 ? 2*t*t : 1 - (-2*t + 2)^2 / 2` is a standard quadratic ease-in-out.
- Idle snapping ensures that after any animation, gems are at exact integer-aligned pixel positions. This prevents sub-pixel blur.

---

### 6.2 Update the HUD Renderer with Start Screen

**File:** `src/games/match3/renderers/HUDRenderer.ts`

Add a start screen overlay that shows before the game begins.

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

    // Combo indicator
    if (state.combo > 1 && (state.phase === 'removing' || state.phase === 'falling')) {
      ctx.textAlign = 'center';
      ctx.font = `bold ${18 + state.combo * 2}px monospace`;
      ctx.fillStyle = GAME_COLOR;
      ctx.fillText(`COMBO x${state.combo}!`, W / 2, 24);
    }

    // --- Overlays ---
    if (!state.started) {
      this.drawOverlay(ctx, state, 'Match-3 Puzzle', 'Click to start  |  [H] Help');
    } else if (state.paused) {
      this.drawOverlay(ctx, state, 'PAUSED', 'Press [P] to resume');
    } else if (state.gameOver) {
      this.drawOverlay(
        ctx,
        state,
        'GAME OVER',
        `Final Score: ${state.score}  |  Press [Space] to retry`,
      );
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
- Three overlay states are now handled: not started, paused, and game over. Each shows a centred panel with a title and instruction text.
- The start screen overlay appears when `state.started` is `false`. Clicking anywhere dismisses it.

---

### 6.3 Final Engine — All Systems Wired Together

**File:** `src/games/match3/Match3Engine.ts`

The complete engine with AnimationSystem, start-screen flow, and all polish.

```typescript
import type { Match3State } from './types';
import { ROWS, COLS, MAX_MOVES, HS_KEY } from './types';
import { BoardSystem } from './systems/BoardSystem';
import { InputSystem } from './systems/InputSystem';
import { AnimationSystem } from './systems/AnimationSystem';
import { ScoreSystem } from './systems/ScoreSystem';
import { BoardRenderer } from './renderers/BoardRenderer';
import { HUDRenderer } from './renderers/HUDRenderer';

const GAME_COLOR = '#e91e63';

export class Match3Engine {
  private ctx: CanvasRenderingContext2D;
  private state: Match3State;
  private running = false;
  private rafId = 0;
  private lastTime = 0;

  private boardSystem: BoardSystem;
  private inputSystem: InputSystem;
  private animationSystem: AnimationSystem;
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
      started: false,
      gameOver: false,
      canvasW: canvas.width,
      canvasH: canvas.height,
    };

    // Systems
    this.boardSystem = new BoardSystem();
    this.animationSystem = new AnimationSystem();
    this.scoreSystem = new ScoreSystem();

    // Init board
    this.boardSystem.initBoard(this.state);

    this.inputSystem = new InputSystem(
      this.state,
      canvas,
      this.boardSystem,
      () => this.reset(),
    );

    this.boardRenderer = new BoardRenderer();
    this.hudRenderer = new HUDRenderer();

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

    if (this.state.started && !this.state.paused) {
      this.boardSystem.update(this.state, dt);
      this.animationSystem.update(this.state, dt);
      this.scoreSystem.update(this.state, dt);
    }

    this.render();
    this.rafId = requestAnimationFrame(() => this.loop());
  }

  private render(): void {
    const { ctx, state } = this;
    const W = state.canvasW;
    const H = state.canvasH;

    // Clear
    ctx.fillStyle = '#0f0f1a';
    ctx.fillRect(0, 0, W, H);

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
    s.started = true;
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

    // Snap all gems to new positions
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

### 6.4 Final InputSystem with Start-Screen Click

**File:** `src/games/match3/systems/InputSystem.ts`

Handle clicking to start the game, plus all existing input logic.

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

    // Click to start
    if (!s.started) {
      s.started = true;
      return;
    }

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

    // Perform swap
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
        if (s.started && !s.gameOver) s.paused = !s.paused;
        break;
      case ' ':
        e.preventDefault();
        if (s.gameOver) this.onReset();
        else if (!s.started) s.started = true;
        break;
    }
  }
}
```

**What's happening:**
- The first click when `!s.started` simply sets `started = true`, dismissing the start overlay.
- Space can also start the game (in addition to clicking).
- All other input logic remains the same as Step 5.

---

### 6.5 Final Platform Adapter & Entry Point

**File:** `src/games/match3/adapters/PlatformAdapter.ts`

```typescript
import { Match3Engine } from '../Match3Engine';

export class PlatformAdapter {
  private engine: Match3Engine;

  constructor(canvas: HTMLCanvasElement) {
    this.engine = new Match3Engine(canvas);
  }

  start(): void {
    this.engine.start();
  }

  destroy(): void {
    this.engine.destroy();
  }
}
```

**File:** `src/games/match3/index.ts`

```typescript
import { PlatformAdapter } from './adapters/PlatformAdapter';

export function createMatch3(canvas: HTMLCanvasElement): { destroy: () => void } {
  const adapter = new PlatformAdapter(canvas);
  adapter.start();
  return { destroy: () => adapter.destroy() };
}
```

---

## Test It

1. **Run:** `pnpm dev`
2. **Open:** the Match-3 game in your browser
3. **Observe:**
   - A **start screen** overlay appears: "Match-3 Puzzle -- Click to start"
   - **Click** or press **Space** to begin
   - **Swap two gems** and watch them **slide smoothly** to each other's positions with eased motion
   - **Invalid swaps** (no match) slide back with a smooth reverse animation, and the move is refunded
   - **Matches flash** with enhanced glow, then **shrink and fade**
   - Gems **fall smoothly** with gravity, and new gems **drop in from above**
   - **Cascading matches** trigger automatically with growing combo multipliers
   - The **HUD** shows score, high score, moves, and combo indicators
   - **Game over** overlay appears when moves reach 0, showing final score
   - **Press Space** to restart with a fresh board
   - **Press P** to pause/unpause
   - **Resize** the browser and the board re-centres and re-scales

---

## Challenges

**Easy:**
- Change `SWAP_DURATION` from 180 to 300ms to see the swap animation in slow motion.
- Change `GAME_COLOR` to a different accent colour (e.g., `'#00bcd4'` for teal).

**Medium:**
- Add a "no valid moves" detection: after each idle phase, scan all possible swaps and check if any would create a match. If none exist, reshuffle the board.
- Add particle effects when gems are removed (small coloured circles that fly outward from the gem's position).

**Hard:**
- Implement a level system: after scoring a target number of points, advance to the next level with fewer moves and a fresh board. Display the current level in the HUD.
- Add special gems (e.g., a "bomb" gem that appears when you match 4+ and clears its entire row/column when matched).

---

## What You Learned

- Tweening gem positions with an `easeInOutQuad` function for smooth swap animations
- Reversing animation direction for swap-back using `1 - t`
- Snapping idle gems to exact grid positions to prevent floating-point drift
- Building a complete game with start screen, pause, game over, and restart flow
- Structuring a game with separated systems (Board, Input, Animation, Score) and renderers (Board, HUD)

**Congratulations!** You have built a complete Match-3 puzzle game from scratch. The game features gem swapping, match detection, gravity with refill, cascading chain reactions with combo scoring, smooth animations, and a polished UI.

---
[<- Previous Step](./step-5.md) | [Back to Game README](./README.md)
