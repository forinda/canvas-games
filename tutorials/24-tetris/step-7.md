# Step 7: Ghost Piece, Next Preview & Polish

**Goal:** Add the ghost piece, next piece preview, DAS (Delayed Auto Shift) input, full HUD, start/pause/game-over overlays, and high score display.

**Time:** ~15 minutes

---

## What You'll Build

- **Ghost piece**: A translucent outline showing where the current piece will land
- **Next piece preview**: Small rendering of the upcoming piece to the right of the board
- **DAS input**: Holding a movement key repeats it automatically after an initial delay
- **HUD**: Score, high score, level, lines, and controls panel
- **Overlays**: Start screen, pause screen, and game over with restart
- **Reset**: Full game reset on restart

---

## Concepts

- **Ghost piece**: Drop a copy of the current piece downward until it collides, then draw it at that position with low opacity. This gives the player a visual guide for hard drops.
- **DAS (Delayed Auto Shift)**: When a movement key is held, wait 170 ms (the "delay"), then repeat the action every 50 ms (the "interval"). This mimics how real Tetris handles key repeat -- faster and more consistent than browser auto-repeat.
- **Overlay state machine**: The game cycles through states: `started=false` (title screen), `started=true` (playing), `paused=true`, and `gameOver=true`. Each state draws a different overlay.

---

## Code

### 1. Add Ghost Piece to BoardSystem

**File:** `src/games/tetris/systems/BoardSystem.ts`

Add the `getGhostY` method:

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

  removeClearedLines(state: TetrisState): void {
    const rows = state.clearingLines.sort((a, b) => a - b);
    for (const row of rows) {
      state.board.splice(row, 1);
      state.board.unshift(Array(COLS).fill(null));
    }
    state.clearingLines = [];
    state.clearTimer = 0;
  }

  // --- NEW ---

  /** Calculate the ghost piece Y position (where piece would land) */
  getGhostY(state: TetrisState): number {
    const piece = state.currentPiece;
    if (!piece) return 0;
    let ghostY = piece.y;
    while (!this.isColliding(state.board, piece.defIndex, piece.rotation, piece.x, ghostY + 1)) {
      ghostY++;
    }
    return ghostY;
  }
}
```

**What's happening:**
- `getGhostY` starts from the piece's current Y and increments until a collision is found. This is the same logic as hard drop, but we only return the position instead of moving the piece.
- The renderer will use this to draw a semi-transparent copy of the piece at the landing position.

---

### 2. Create the Full Board Renderer

**File:** `src/games/tetris/renderers/BoardRenderer.ts`

Replace the file with the complete version that includes ghost piece rendering:

```typescript
import type { TetrisState } from '../types';
import { COLS, ROWS } from '../types';
import { PIECES } from '../data/pieces';
import { BoardSystem } from '../systems/BoardSystem';

export class BoardRenderer {
  private boardSystem: BoardSystem;

  constructor(boardSystem: BoardSystem) {
    this.boardSystem = boardSystem;
  }

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
            const flash = Math.sin(state.clearTimer * 0.02) > 0;
            const drawColor = flash ? '#ffffff' : color;
            this.drawCell(ctx, offsetX + c * cellSize, offsetY + r * cellSize, cellSize, drawColor);
          } else {
            this.drawCell(ctx, offsetX + c * cellSize, offsetY + r * cellSize, cellSize, color);
          }
        }
      }
    }

    // Ghost piece
    if (state.currentPiece && state.clearingLines.length === 0) {
      const ghostY = this.boardSystem.getGhostY(state);
      const piece = state.currentPiece;
      const def = PIECES[piece.defIndex];
      const cells = def.rotations[piece.rotation];
      for (const [row, col] of cells) {
        const bx = piece.x + col;
        const by = ghostY + row;
        if (by >= 0 && by < ROWS && bx >= 0 && bx < COLS) {
          const px = offsetX + bx * cellSize;
          const py = offsetY + by * cellSize;
          ctx.strokeStyle = def.color;
          ctx.globalAlpha = 0.3;
          ctx.lineWidth = 2;
          ctx.strokeRect(px + 1, py + 1, cellSize - 2, cellSize - 2);
          ctx.globalAlpha = 1;
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
- The ghost piece draws *before* the current piece so the solid piece renders on top.
- Ghost cells are drawn as outlined rectangles using `strokeRect` at 30% opacity (`globalAlpha = 0.3`). This gives a clear landing guide without cluttering the board.
- We reset `globalAlpha` to 1 immediately after so it does not affect subsequent drawing.
- The `BoardRenderer` now takes a `BoardSystem` in its constructor so it can call `getGhostY`.

---

### 3. Create the HUD Renderer

**File:** `src/games/tetris/renderers/HUDRenderer.ts`

This draws score, next piece preview, controls, and overlays:

```typescript
import type { TetrisState } from '../types';
import { COLS, ROWS } from '../types';
import { PIECES } from '../data/pieces';

export class HUDRenderer {
  render(ctx: CanvasRenderingContext2D, state: TetrisState): void {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    const cellSize = Math.floor(Math.min((H - 40) / ROWS, (W * 0.5) / COLS));
    const boardW = cellSize * COLS;
    const offsetX = Math.floor((W - boardW) / 2);
    const offsetY = Math.floor((H - cellSize * ROWS) / 2);

    const rightX = offsetX + boardW + 30;
    const leftX = offsetX - 160;
    const previewCellSize = Math.floor(cellSize * 0.8);

    // --- Right panel: Score info ---
    ctx.textAlign = 'left';
    ctx.font = 'bold 14px monospace';
    ctx.fillStyle = '#667';
    ctx.fillText('SCORE', rightX, offsetY + 20);
    ctx.font = 'bold 22px monospace';
    ctx.fillStyle = '#fff';
    ctx.fillText(String(state.score), rightX, offsetY + 48);

    ctx.font = 'bold 14px monospace';
    ctx.fillStyle = '#667';
    ctx.fillText('HIGH SCORE', rightX, offsetY + 80);
    ctx.font = 'bold 18px monospace';
    ctx.fillStyle = '#ffd600';
    ctx.fillText(String(state.highScore), rightX, offsetY + 104);

    ctx.font = 'bold 14px monospace';
    ctx.fillStyle = '#667';
    ctx.fillText('LEVEL', rightX, offsetY + 140);
    ctx.font = 'bold 20px monospace';
    ctx.fillStyle = '#0f0';
    ctx.fillText(String(state.level), rightX, offsetY + 164);

    ctx.font = 'bold 14px monospace';
    ctx.fillStyle = '#667';
    ctx.fillText('LINES', rightX, offsetY + 200);
    ctx.font = 'bold 20px monospace';
    ctx.fillStyle = '#0cf';
    ctx.fillText(String(state.lines), rightX, offsetY + 224);

    // --- Next piece preview ---
    ctx.font = 'bold 14px monospace';
    ctx.fillStyle = '#667';
    ctx.fillText('NEXT', rightX, offsetY + 270);

    const nextDef = PIECES[state.nextPieceIndex];
    const nextCells = nextDef.rotations[0];
    const previewY = offsetY + 280;
    ctx.fillStyle = '#111122';
    ctx.fillRect(rightX, previewY, previewCellSize * 5, previewCellSize * 4);
    ctx.strokeStyle = '#334';
    ctx.lineWidth = 1;
    ctx.strokeRect(rightX, previewY, previewCellSize * 5, previewCellSize * 4);

    for (const [row, col] of nextCells) {
      const px = rightX + 8 + col * previewCellSize;
      const py = previewY + 8 + row * previewCellSize;
      this.drawMiniCell(ctx, px, py, previewCellSize, nextDef.color);
    }

    // --- Left panel: Controls ---
    if (leftX > 10) {
      ctx.textAlign = 'left';
      ctx.font = 'bold 14px monospace';
      ctx.fillStyle = '#667';
      ctx.fillText('CONTROLS', leftX, offsetY + 20);

      ctx.font = '12px monospace';
      ctx.fillStyle = '#556';
      const controls = [
        '\u2190 \u2192  Move',
        '\u2191     Rotate',
        '\u2193     Soft drop',
        'Space  Hard drop',
        'P      Pause',
      ];
      controls.forEach((text, i) => {
        ctx.fillText(text, leftX, offsetY + 48 + i * 22);
      });
    }

    // --- Overlays ---
    if (!state.started) {
      this.drawOverlay(ctx, W, H, 'TETRIS', 'Press Enter or Space to start', '#00bcd4');
    } else if (state.gameOver) {
      this.drawOverlay(ctx, W, H, 'GAME OVER', `Score: ${state.score}  |  Press Enter to restart`, '#ff1744');
    } else if (state.paused) {
      this.drawOverlay(ctx, W, H, 'PAUSED', 'Press P to resume', '#ffd600');
    }
  }

  private drawOverlay(
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
    title: string,
    subtitle: string,
    color: string,
  ): void {
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, W, H);

    ctx.textAlign = 'center';
    ctx.font = 'bold 48px monospace';
    ctx.fillStyle = color;
    ctx.fillText(title, W / 2, H / 2 - 20);

    ctx.font = '16px monospace';
    ctx.fillStyle = '#aab';
    ctx.fillText(subtitle, W / 2, H / 2 + 30);
  }

  private drawMiniCell(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string): void {
    ctx.fillStyle = color;
    ctx.fillRect(x + 1, y + 1, size - 2, size - 2);
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(x + 1, y + 1, size - 2, 1);
    ctx.fillRect(x + 1, y + 1, 1, size - 2);
  }
}
```

**What's happening:**
- The right panel shows score, high score, level, lines, and the next piece preview.
- The next piece is drawn in a small bordered box using the piece's spawn rotation at 80% of the normal cell size.
- The left panel shows keyboard controls, but only if there is enough room (`leftX > 10`).
- Overlays draw a semi-transparent black backdrop and centered text. The game state determines which overlay (if any) is shown.

---

### 4. Add DAS to InputSystem

**File:** `src/games/tetris/systems/InputSystem.ts`

Replace the entire file with the full DAS-enabled input system:

```typescript
import type { TetrisState } from '../types';
import { PieceSystem } from './PieceSystem';

export class InputSystem {
  private state: TetrisState;
  private canvas: HTMLCanvasElement;
  private onReset: () => void;
  private pieceSystem: PieceSystem;

  private keyDownHandler: (e: KeyboardEvent) => void;
  private keyUpHandler: (e: KeyboardEvent) => void;
  private clickHandler: (e: MouseEvent) => void;

  // DAS tracking
  private heldKeys = new Set<string>();

  constructor(
    state: TetrisState,
    canvas: HTMLCanvasElement,
    onReset: () => void,
    pieceSystem: PieceSystem,
  ) {
    this.state = state;
    this.canvas = canvas;
    this.onReset = onReset;
    this.pieceSystem = pieceSystem;

    this.keyDownHandler = (e: KeyboardEvent) => this.handleKeyDown(e);
    this.keyUpHandler = (e: KeyboardEvent) => this.handleKeyUp(e);
    this.clickHandler = (e: MouseEvent) => this.handleClick(e);
  }

  attach(): void {
    window.addEventListener('keydown', this.keyDownHandler);
    window.addEventListener('keyup', this.keyUpHandler);
    this.canvas.addEventListener('click', this.clickHandler);
  }

  detach(): void {
    window.removeEventListener('keydown', this.keyDownHandler);
    window.removeEventListener('keyup', this.keyUpHandler);
    this.canvas.removeEventListener('click', this.clickHandler);
    this.heldKeys.clear();
  }

  /** Called each frame from the engine to handle DAS repeat */
  handleDAS(dt: number): void {
    const s = this.state;
    if (!s.dasKey || !this.heldKeys.has(s.dasKey)) {
      s.dasKey = null;
      s.dasTimer = 0;
      s.dasReady = false;
      return;
    }

    s.dasTimer += dt;

    if (!s.dasReady) {
      // Waiting for initial delay
      if (s.dasTimer >= s.dasDelay) {
        s.dasReady = true;
        s.dasTimer -= s.dasDelay;
        this.executeDASAction(s.dasKey);
      }
    } else {
      // Repeating at interval
      while (s.dasTimer >= s.dasInterval) {
        s.dasTimer -= s.dasInterval;
        this.executeDASAction(s.dasKey);
      }
    }
  }

  private executeDASAction(key: string): void {
    const s = this.state;
    if (!s.started || s.paused || s.gameOver || s.clearingLines.length > 0) return;

    if (key === 'ArrowLeft' || key === 'a') {
      this.pieceSystem.move(s, -1);
    } else if (key === 'ArrowRight' || key === 'd') {
      this.pieceSystem.move(s, 1);
    } else if (key === 'ArrowDown' || key === 's') {
      this.pieceSystem.softDrop(s);
    }
  }

  private handleKeyDown(e: KeyboardEvent): void {
    const s = this.state;

    if (e.key === 'p' || e.key === 'P') {
      if (s.started && !s.gameOver) {
        s.paused = !s.paused;
      }
      return;
    }

    // Start or restart
    if (e.key === 'Enter' || e.key === ' ') {
      if (s.gameOver) {
        this.onReset();
        return;
      }
      if (!s.started) {
        s.started = true;
        return;
      }
    }

    if (!s.started || s.paused || s.gameOver || s.clearingLines.length > 0) return;

    if (e.repeat) return; // handled via DAS

    const key = e.key;

    // Movement keys with DAS
    if (key === 'ArrowLeft' || key === 'a') {
      this.pieceSystem.move(s, -1);
      this.startDAS(key);
      return;
    }
    if (key === 'ArrowRight' || key === 'd') {
      this.pieceSystem.move(s, 1);
      this.startDAS(key);
      return;
    }
    if (key === 'ArrowDown' || key === 's') {
      this.pieceSystem.softDrop(s);
      this.startDAS(key);
      return;
    }

    // Rotate
    if (key === 'ArrowUp' || key === 'w' || key === 'x') {
      this.pieceSystem.rotate(s, 1);
      return;
    }
    if (key === 'z' || key === 'Control') {
      this.pieceSystem.rotate(s, -1);
      return;
    }

    // Hard drop
    if (key === ' ') {
      e.preventDefault();
      this.pieceSystem.hardDrop(s);
      return;
    }
  }

  private handleKeyUp(e: KeyboardEvent): void {
    this.heldKeys.delete(e.key);
    if (this.state.dasKey === e.key) {
      this.state.dasKey = null;
      this.state.dasTimer = 0;
      this.state.dasReady = false;
    }
  }

  private startDAS(key: string): void {
    this.heldKeys.add(key);
    this.state.dasKey = key;
    this.state.dasTimer = 0;
    this.state.dasReady = false;
  }

  private handleClick(e: MouseEvent): void {
    const s = this.state;

    if (s.gameOver) {
      this.onReset();
      return;
    }

    if (!s.started) {
      s.started = true;
    }
  }
}
```

**What's happening:**

DAS works in two phases:
1. **Initial delay**: When a movement key is first pressed, the action fires immediately. Then the DAS timer starts counting. After 170 ms (`dasDelay`), `dasReady` becomes true and the first repeat fires.
2. **Repeat interval**: Once ready, the action repeats every 50 ms (`dasInterval`). The `while` loop handles cases where multiple repeats are due in a single frame (e.g., if `dt` is large).

The `keyup` handler clears DAS state when the key is released. Only one key can be the active DAS key at a time. If you switch from holding Left to holding Right, the new key takes over immediately.

The click handler provides mouse/touch interaction for starting and restarting the game.

---

### 5. Final Engine

**File:** `src/games/tetris/TetrisEngine.ts`

Wire everything together with the full feature set:

```typescript
import type { TetrisState } from './types';
import { HS_KEY, createEmptyBoard } from './types';
import { BoardSystem } from './systems/BoardSystem';
import { PieceSystem } from './systems/PieceSystem';
import { ScoreSystem } from './systems/ScoreSystem';
import { InputSystem } from './systems/InputSystem';
import { BoardRenderer } from './renderers/BoardRenderer';
import { HUDRenderer } from './renderers/HUDRenderer';

export class TetrisEngine {
  private ctx: CanvasRenderingContext2D;
  private state: TetrisState;
  private running = false;
  private rafId = 0;
  private lastTime = 0;

  private boardSystem: BoardSystem;
  private scoreSystem: ScoreSystem;
  private pieceSystem: PieceSystem;
  private inputSystem: InputSystem;
  private boardRenderer: BoardRenderer;
  private hudRenderer: HUDRenderer;
  private resizeHandler: () => void;

  constructor(canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    let hs = 0;
    try {
      hs = parseInt(localStorage.getItem(HS_KEY) ?? '0', 10) || 0;
    } catch {
      /* noop */
    }

    this.state = {
      board: createEmptyBoard(),
      currentPiece: null,
      nextPieceIndex: 0,
      score: 0,
      highScore: hs,
      level: 0,
      lines: 0,
      gameOver: false,
      paused: false,
      started: false, // show title screen
      dropTimer: 0,
      lockTimer: 0,
      lockDelay: 500,
      isLocking: false,
      clearingLines: [],
      clearTimer: 0,
      clearDuration: 300,
      dasKey: null,
      dasTimer: 0,
      dasDelay: 170,
      dasInterval: 50,
      dasReady: false,
    };

    // Systems
    this.boardSystem = new BoardSystem();
    this.scoreSystem = new ScoreSystem();
    this.pieceSystem = new PieceSystem(this.boardSystem, this.scoreSystem);
    this.inputSystem = new InputSystem(
      this.state,
      canvas,
      () => this.reset(),
      this.pieceSystem,
    );
    this.boardRenderer = new BoardRenderer(this.boardSystem);
    this.hudRenderer = new HUDRenderer();

    // Initialize pieces
    this.pieceSystem.init(this.state);

    // Resize
    this.resizeHandler = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    this.inputSystem.attach();
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

    // Update DAS
    if (this.state.started && !this.state.paused && !this.state.gameOver) {
      this.inputSystem.handleDAS(dt);
    }

    // Update game logic
    this.pieceSystem.update(this.state, dt);

    // Render
    this.boardRenderer.render(this.ctx, this.state);
    this.hudRenderer.render(this.ctx, this.state);

    this.rafId = requestAnimationFrame(() => this.loop());
  }

  private reset(): void {
    const s = this.state;
    s.board = createEmptyBoard();
    s.currentPiece = null;
    s.score = 0;
    s.level = 0;
    s.lines = 0;
    s.gameOver = false;
    s.paused = false;
    s.started = true;
    s.dropTimer = 0;
    s.lockTimer = 0;
    s.isLocking = false;
    s.clearingLines = [];
    s.clearTimer = 0;
    s.dasKey = null;
    s.dasTimer = 0;
    s.dasReady = false;
    this.pieceSystem.init(s);
  }
}
```

**What's happening:**
- `started` begins as `false` so the title overlay shows.
- The loop calls `inputSystem.handleDAS(dt)` every frame during active play so held keys repeat correctly.
- `reset()` restores every field to its initial value and calls `pieceSystem.init` to set up fresh pieces.
- Rendering happens in two passes: `boardRenderer` draws the playfield, then `hudRenderer` draws UI on top.

---

### 6. Final Entry Point

**File:** `src/games/tetris/index.ts`

```typescript
import { TetrisEngine } from './TetrisEngine';

export function createTetris(canvas: HTMLCanvasElement): { destroy: () => void } {
  const engine = new TetrisEngine(canvas);
  engine.start();
  return { destroy: () => engine.destroy() };
}
```

---

## Test It

1. **Run:** `npm run dev`
2. **Open:** the Tetris game
3. **Observe:**

**Title screen:**
- "TETRIS" title in cyan with "Press Enter or Space to start" below it
- The board and HUD are visible behind the overlay

**Gameplay:**
- Ghost piece (translucent outline) shows where the current piece will land
- Next piece preview box shows the upcoming piece to the right of the board
- Score updates live as you clear lines and drop pieces
- High score is shown in gold and persists across page refreshes
- Level and lines count update correctly

**DAS input:**
- Tap Left/Right for single moves
- Hold Left/Right: after a brief pause, the piece slides rapidly
- Hold Down for fast soft drop
- Release the key and movement stops immediately

**Pause:**
- Press P during gameplay -- "PAUSED" overlay appears
- Press P again to resume

**Game over:**
- Stack blocks to the top -- "GAME OVER" overlay appears with your score
- Press Enter or click to restart with a fresh board

---

## Try It

- Change `dasDelay` to `50` for instant DAS (pieces fly across the board when you hold a key).
- Change `dasInterval` to `16` for frame-perfect repeat speed.
- Set the ghost piece opacity from `0.3` to `0.6` to make it more visible.

---

## Challenges

**Easy:**
- Change the overlay colors (e.g., make the title screen green).
- Add the current level to the game over subtitle.

**Medium:**
- Add a hold system: pressing a key swaps the current piece with a "held" piece (stored separately). You can only hold once per piece.
- Add a drop trail effect: when hard-dropping, briefly flash the cells the piece passed through.

**Hard:**
- Add sound effects using the Web Audio API: a thud on lock, a chime on line clear, a fanfare on Tetris.
- Implement a countdown timer (3... 2... 1... Go!) when unpausing instead of resuming instantly.
- Add a "marathon" mode that ends after clearing 150 lines, showing total time.

---

## What You Learned

- Ghost piece calculation by simulating downward movement until collision
- Rendering semi-transparent outlines with `globalAlpha` and `strokeRect`
- DAS (Delayed Auto Shift) input with initial delay and repeat interval
- Next piece preview rendering at a smaller scale
- Overlay state machine for title, pause, and game over screens
- Full game reset by restoring every state field to initial values
- localStorage high score persistence

---

## Final Summary

Over these 7 steps you built a complete Tetris game:

1. **Board & Grid** -- 10x20 playfield with centered layout and beveled cell rendering
2. **Tetrominoes & Spawning** -- 7 pieces defined as rotation matrices, 7-bag randomizer
3. **Movement & Rotation** -- Collision-checked movement, wall kick rotation system
4. **Gravity & Locking** -- Accumulator timer, lock delay, hard drop
5. **Line Clearing** -- Full row detection, flash animation, splice/unshift collapse
6. **Scoring & Levels** -- Point table, level multiplier, speed curve, high score
7. **Ghost Piece, Next Preview & Polish** -- Ghost piece, DAS input, HUD, overlays

The game is fully playable with all the core mechanics of classic Tetris. From here you can extend it with hold pieces, T-spin detection, combo scoring, sound effects, or multiplayer.
