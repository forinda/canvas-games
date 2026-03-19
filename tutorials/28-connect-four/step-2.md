# Step 2: Drop Disc & Turns

**Goal:** Click a column to drop a disc with gravity animation, alternating between red and yellow turns.

**Time:** ~15 minutes

---

## What You'll Build

- **Column click detection** that maps mouse position to a column index
- **Gravity drop animation** where the disc falls from above the board to the lowest empty row
- **Turn alternation** between red and yellow players after each drop
- **Drop queue** to handle rapid clicks during animation
- **Turn indicator** showing whose turn it is at the bottom of the screen

---

## Concepts

- **Column Mapping**: `Math.floor((mouseX - boardX) / cellSize)` converts a pixel position to a column index
- **Animated Drop**: A `DiscDrop` object tracks `currentY` (in row-units, starting at -1) and advances toward `targetRow` at a constant speed
- **Board Placement**: The disc is only placed on the board array when the animation completes, preventing visual/logic mismatches
- **Drop Queue**: If the player clicks while an animation is running, the move is queued and processed after the current drop finishes

---

## Code

### 1. Create the Board System

**File:** `src/games/connect-four/systems/BoardSystem.ts`

Handles disc dropping, animation, and board placement.

```typescript
import type { ConnectFourState, Cell, Player } from '../types';
import { COLS, ROWS } from '../types';

const DROP_SPEED = 18; // rows per second

export class BoardSystem {
  update(state: ConnectFourState, dt: number): void {
    state.animationTime += dt;

    // Animate active disc drop
    if (state.activeDrop && !state.activeDrop.done) {
      const drop = state.activeDrop;
      drop.currentY += DROP_SPEED * (dt / 1000);

      if (drop.currentY >= drop.targetRow) {
        drop.currentY = drop.targetRow;
        drop.done = true;
        // Place the disc on the board
        state.board[drop.targetRow][drop.col] = drop.player;
        // Alternate turns
        state.currentPlayer = drop.player === 'red' ? 'yellow' : 'red';
        state.activeDrop = null;

        // Process queued drops
        if (state.dropQueue.length > 0) {
          const next = state.dropQueue.shift()!;
          this.startDrop(state, next.col, next.player);
        }
      }
    }
  }

  dropDisc(state: ConnectFourState, col: number, player: Player): boolean {
    if (state.gameOver) return false;
    if (col < 0 || col >= COLS) return false;

    const row = this.getLowestEmptyRow(state.board, col);
    if (row < 0) return false;

    if (state.activeDrop && !state.activeDrop.done) {
      state.dropQueue.push({ col, player });
      return true;
    }

    this.startDrop(state, col, player);
    return true;
  }

  getLowestEmptyRow(board: Cell[][], col: number): number {
    for (let r = ROWS - 1; r >= 0; r--) {
      if (board[r][col] === null) return r;
    }
    return -1;
  }

  private startDrop(state: ConnectFourState, col: number, player: Player): void {
    const row = this.getLowestEmptyRow(state.board, col);
    if (row < 0) return;
    state.activeDrop = {
      col, targetRow: row, currentY: -1, player, done: false,
    };
  }
}
```

**What's happening:**
- `dropDisc` finds the lowest empty row in the column. If an animation is already running, the drop is queued.
- `startDrop` creates a `DiscDrop` starting at `currentY = -1` (one row above the board).
- Each frame, `currentY` advances by `DROP_SPEED * dt`. When it reaches `targetRow`, the disc is placed on the board array and the turn alternates.

---

### 2. Create the Input System

**File:** `src/games/connect-four/systems/InputSystem.ts`

Map mouse clicks to column indices and track hover position.

```typescript
import type { ConnectFourState } from '../types';
import { COLS, ROWS } from '../types';

export class InputSystem {
  private canvas: HTMLCanvasElement;
  private state: ConnectFourState;
  private onColumnClick: (col: number) => void;
  private clickHandler: (e: MouseEvent) => void;
  private moveHandler: (e: MouseEvent) => void;
  private leaveHandler: () => void;

  constructor(
    canvas: HTMLCanvasElement,
    state: ConnectFourState,
    onColumnClick: (col: number) => void,
  ) {
    this.canvas = canvas;
    this.state = state;
    this.onColumnClick = onColumnClick;
    this.clickHandler = (e: MouseEvent) => this.handleClick(e);
    this.moveHandler = (e: MouseEvent) => this.handleMove(e);
    this.leaveHandler = () => { this.state.hoverCol = -1; };
  }

  attach(): void {
    this.canvas.addEventListener('click', this.clickHandler);
    this.canvas.addEventListener('mousemove', this.moveHandler);
    this.canvas.addEventListener('mouseleave', this.leaveHandler);
  }

  detach(): void {
    this.canvas.removeEventListener('click', this.clickHandler);
    this.canvas.removeEventListener('mousemove', this.moveHandler);
    this.canvas.removeEventListener('mouseleave', this.leaveHandler);
  }

  private handleClick(e: MouseEvent): void {
    if (this.state.gameOver) return;
    const rect = this.canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const col = this.getColumnAtPosition(mx);
    if (col >= 0) this.onColumnClick(col);
  }

  private handleMove(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    this.state.hoverCol = this.getColumnAtPosition(mx);
  }

  private getColumnAtPosition(mx: number): number {
    const s = this.state;
    const cellSize = Math.min((s.canvasWidth - 40) / COLS, (s.canvasHeight - 140) / (ROWS + 1));
    const boardW = cellSize * COLS;
    const boardX = (s.canvasWidth - boardW) / 2;
    const col = Math.floor((mx - boardX) / cellSize);
    return (col >= 0 && col < COLS) ? col : -1;
  }
}
```

---

### 3. Update the Board Renderer

**File:** `src/games/connect-four/renderers/BoardRenderer.ts`

Add drop animation rendering and hover preview.

```typescript
import type { ConnectFourState } from '../types';
import { COLS, ROWS } from '../types';

export class BoardRenderer {
  render(ctx: CanvasRenderingContext2D, state: ConnectFourState): void {
    const W = state.canvasWidth;
    const H = state.canvasHeight;

    ctx.fillStyle = '#0f0f1a';
    ctx.fillRect(0, 0, W, H);

    const metrics = this.getBoardMetrics(W, H);
    const { boardX, boardY, cellSize, boardW, boardH } = metrics;
    const discRadius = cellSize * 0.38;

    // Hover preview ghost disc
    if (!state.gameOver && state.hoverCol >= 0 && state.activeDrop === null) {
      const previewX = boardX + state.hoverCol * cellSize + cellSize / 2;
      const previewY = boardY - cellSize * 0.5;
      const color = state.currentPlayer === 'red' ? 'rgba(244,67,54,0.5)' : 'rgba(255,235,59,0.5)';
      ctx.beginPath();
      ctx.arc(previewX, previewY, discRadius, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    }

    // Blue board
    ctx.fillStyle = '#1565c0';
    ctx.beginPath();
    ctx.roundRect(boardX - 8, boardY - 8, boardW + 16, boardH + 16, 12);
    ctx.fill();

    // Holes and placed discs
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cx = boardX + c * cellSize + cellSize / 2;
        const cy = boardY + r * cellSize + cellSize / 2;

        ctx.beginPath();
        ctx.arc(cx, cy, discRadius + 2, 0, Math.PI * 2);
        ctx.fillStyle = '#0a0a18';
        ctx.fill();

        if (state.board[r][c] !== null) {
          this.drawDisc(ctx, cx, cy, discRadius, state.board[r][c]!);
        }
      }
    }

    // Animating drop disc
    if (state.activeDrop && !state.activeDrop.done) {
      const drop = state.activeDrop;
      const cx = boardX + drop.col * cellSize + cellSize / 2;
      const cy = boardY + drop.currentY * cellSize + cellSize / 2;
      this.drawDisc(ctx, cx, cy, discRadius, drop.player);
    }

    // Turn indicator
    this.drawTurnIndicator(ctx, state, W, H);
  }

  private drawDisc(ctx: CanvasRenderingContext2D, cx: number, cy: number, radius: number, player: 'red' | 'yellow'): void {
    const baseColor = player === 'red' ? '#f44336' : '#ffeb3b';
    const highlightColor = player === 'red' ? '#ef9a9a' : '#fff9c4';
    const darkColor = player === 'red' ? '#c62828' : '#f9a825';
    const grad = ctx.createRadialGradient(cx - radius * 0.2, cy - radius * 0.2, radius * 0.1, cx, cy, radius);
    grad.addColorStop(0, highlightColor); grad.addColorStop(0.6, baseColor); grad.addColorStop(1, darkColor);
    ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2); ctx.fillStyle = grad; ctx.fill();
  }

  private drawTurnIndicator(ctx: CanvasRenderingContext2D, state: ConnectFourState, W: number, H: number): void {
    if (state.gameOver) return;
    const color = state.currentPlayer === 'red' ? '#f44336' : '#ffeb3b';
    const name = state.currentPlayer === 'red' ? 'Red' : 'Yellow';
    ctx.font = '16px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillStyle = color;
    ctx.fillText(`${name}'s turn`, W / 2, H - 40);
  }

  private getBoardMetrics(W: number, H: number) {
    const cellSize = Math.min((W - 40) / COLS, (H - 140) / (ROWS + 1));
    const boardW = cellSize * COLS;
    const boardH = cellSize * ROWS;
    const boardX = (W - boardW) / 2;
    const boardY = (H - boardH) / 2 + 30;
    return { boardX, boardY, cellSize, boardW, boardH };
  }
}
```

---

### 4. Update the Engine

**File:** `src/games/connect-four/ConnectFourEngine.ts`

Wire input system and board system together.

```typescript
import type { ConnectFourState } from './types';
import { COLS, ROWS } from './types';
import { InputSystem } from './systems/InputSystem';
import { BoardSystem } from './systems/BoardSystem';
import { BoardRenderer } from './renderers/BoardRenderer';

export class ConnectFourEngine {
  private ctx: CanvasRenderingContext2D;
  private state: ConnectFourState;
  private running = false;
  private rafId = 0;
  private lastTime = 0;

  private inputSystem: InputSystem;
  private boardSystem: BoardSystem;
  private boardRenderer: BoardRenderer;
  private resizeHandler: () => void;

  constructor(canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    this.state = {
      board: this.createEmptyBoard(),
      currentPlayer: 'red', mode: '2player',
      winner: null, winLine: null, isDraw: false, gameOver: false, paused: false,
      scoreRed: 0, scoreYellow: 0, draws: 0,
      canvasWidth: canvas.width, canvasHeight: canvas.height,
      aiThinking: false, showModeSelect: false, hoverCol: -1,
      animationTime: 0, activeDrop: null, dropQueue: [],
    };

    this.boardSystem = new BoardSystem();
    this.boardRenderer = new BoardRenderer();
    this.inputSystem = new InputSystem(canvas, this.state, (col) => this.onColumnClick(col));

    this.resizeHandler = () => {
      canvas.width = window.innerWidth; canvas.height = window.innerHeight;
      this.state.canvasWidth = canvas.width; this.state.canvasHeight = canvas.height;
    };

    this.inputSystem.attach();
    window.addEventListener('resize', this.resizeHandler);
  }

  start(): void { this.running = true; this.lastTime = performance.now(); this.loop(); }

  destroy(): void {
    this.running = false; cancelAnimationFrame(this.rafId);
    this.inputSystem.detach(); window.removeEventListener('resize', this.resizeHandler);
  }

  private loop(): void {
    if (!this.running) return;
    const now = performance.now();
    const dt = now - this.lastTime;
    this.lastTime = now;
    this.boardSystem.update(this.state, dt);
    this.boardRenderer.render(this.ctx, this.state);
    this.rafId = requestAnimationFrame(() => this.loop());
  }

  private onColumnClick(col: number): void {
    if (this.state.gameOver || this.state.activeDrop !== null) return;
    this.boardSystem.dropDisc(this.state, col, this.state.currentPlayer);
  }

  private createEmptyBoard(): (null)[][] {
    const board: (null)[][] = [];
    for (let r = 0; r < ROWS; r++) {
      const row: null[] = [];
      for (let c = 0; c < COLS; c++) row.push(null);
      board.push(row);
    }
    return board;
  }
}
```

---

## Test It

1. **Run:** `npm run dev`
2. **Open:** the Connect Four game
3. **Observe:**
   - Hover over a column -- a **ghost disc** appears above the board in the current player's color
   - Click a column -- a disc **drops with gravity animation** to the lowest empty row
   - The turn **alternates** between Red and Yellow
   - The **turn indicator** at the bottom shows whose turn it is
   - Click rapidly -- moves are **queued** and played in order

---

## Challenges

**Easy:**
- Change `DROP_SPEED` to 10 for a slower, more dramatic drop.
- Change the ghost disc opacity from 0.5 to 0.3.

**Medium:**
- Add a bounce effect when the disc lands (overshoot by 0.1 rows, then snap back).

**Hard:**
- Add column highlighting -- draw a subtle vertical stripe on the hovered column.

---

## What You Learned

- Mapping mouse positions to grid columns
- Animating disc drops with frame-rate independent speed
- Implementing a drop queue for handling rapid input during animations
- Drawing ghost preview discs for hover feedback
- Alternating turns between two players

**Next:** Win detection -- check for four in a row with a glowing winning line!
