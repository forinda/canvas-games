# Step 1: Board & Rendering

**Goal:** Draw a 7x6 Connect Four board with a blue background and circular holes.

**Time:** ~15 minutes

---

## What You'll Build

- **Dark arena background** with a centered blue game board
- **7 columns by 6 rows** grid of circular holes cut into the blue board
- **Rounded board edges** for a polished look
- **3D disc rendering** with radial gradients for red and yellow pieces
- **Board layout calculation** that centers and scales to any screen size

---

## Concepts

- **Grid-Based Layout**: `cellSize` is computed from available space, then rows/columns are drawn at `boardX + col * cellSize`
- **Circular Holes**: Dark circles drawn on top of the blue board simulate holes punched through
- **Radial Gradient Discs**: `createRadialGradient` with a highlight offset creates a convincing 3D sphere effect
- **Responsive Sizing**: `Math.min((W - 40) / COLS, (H - 140) / (ROWS + 1))` scales the board to fit any viewport

---

## Code

### 1. Create Types

**File:** `src/games/connect-four/types.ts`

```typescript
export type Cell = 'red' | 'yellow' | null;
export type Player = 'red' | 'yellow';
export type GameMode = 'ai' | '2player';

export const COLS = 7;
export const ROWS = 6;

export interface WinCell { row: number; col: number; }
export interface WinLine { cells: WinCell[]; progress: number; }

export interface DiscDrop {
  col: number;
  targetRow: number;
  currentY: number;
  player: Player;
  done: boolean;
}

export interface ConnectFourState {
  board: Cell[][];
  currentPlayer: Player;
  mode: GameMode;
  winner: Player | null;
  winLine: WinLine | null;
  isDraw: boolean;
  gameOver: boolean;
  paused: boolean;
  scoreRed: number;
  scoreYellow: number;
  draws: number;
  canvasWidth: number;
  canvasHeight: number;
  aiThinking: boolean;
  showModeSelect: boolean;
  hoverCol: number;
  animationTime: number;
  activeDrop: DiscDrop | null;
  dropQueue: { col: number; player: Player }[];
}
```

---

### 2. Create the Board Renderer

**File:** `src/games/connect-four/renderers/BoardRenderer.ts`

Draw the blue board with circular holes and any placed discs.

```typescript
import type { ConnectFourState } from '../types';
import { COLS, ROWS } from '../types';

export class BoardRenderer {
  render(ctx: CanvasRenderingContext2D, state: ConnectFourState): void {
    const W = state.canvasWidth;
    const H = state.canvasHeight;

    // Clear
    ctx.fillStyle = '#0f0f1a';
    ctx.fillRect(0, 0, W, H);

    const metrics = this.getBoardMetrics(W, H);
    const { boardX, boardY, cellSize, boardW, boardH } = metrics;
    const discRadius = cellSize * 0.38;

    // Draw board background (blue with rounded corners)
    ctx.fillStyle = '#1565c0';
    ctx.beginPath();
    ctx.roundRect(boardX - 8, boardY - 8, boardW + 16, boardH + 16, 12);
    ctx.fill();

    // Draw holes and discs
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cx = boardX + c * cellSize + cellSize / 2;
        const cy = boardY + r * cellSize + cellSize / 2;
        const cell = state.board[r][c];

        // Dark hole
        ctx.beginPath();
        ctx.arc(cx, cy, discRadius + 2, 0, Math.PI * 2);
        ctx.fillStyle = '#0a0a18';
        ctx.fill();

        if (cell !== null) {
          this.drawDisc(ctx, cx, cy, discRadius, cell);
        }
      }
    }
  }

  private drawDisc(
    ctx: CanvasRenderingContext2D,
    cx: number, cy: number, radius: number,
    player: 'red' | 'yellow',
  ): void {
    const baseColor = player === 'red' ? '#f44336' : '#ffeb3b';
    const highlightColor = player === 'red' ? '#ef9a9a' : '#fff9c4';
    const darkColor = player === 'red' ? '#c62828' : '#f9a825';

    const grad = ctx.createRadialGradient(
      cx - radius * 0.2, cy - radius * 0.2, radius * 0.1,
      cx, cy, radius,
    );
    grad.addColorStop(0, highlightColor);
    grad.addColorStop(0.6, baseColor);
    grad.addColorStop(1, darkColor);

    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
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

**What's happening:**
- The board is a single blue rounded rectangle. Dark circles are drawn on top to create the "hole" effect.
- Discs use a 3-stop radial gradient: highlight (top-left), base color (middle), dark shade (edge). The highlight is offset to simulate lighting from the upper-left.
- `getBoardMetrics` calculates the cell size to fit the viewport, then centers the board horizontally and vertically.

---

### 3. Create the Engine

**File:** `src/games/connect-four/ConnectFourEngine.ts`

```typescript
import type { ConnectFourState } from './types';
import { COLS, ROWS } from './types';
import { BoardRenderer } from './renderers/BoardRenderer';

export class ConnectFourEngine {
  private ctx: CanvasRenderingContext2D;
  private state: ConnectFourState;
  private running = false;
  private rafId = 0;

  private boardRenderer: BoardRenderer;
  private resizeHandler: () => void;

  constructor(canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    this.state = {
      board: this.createEmptyBoard(),
      currentPlayer: 'red',
      mode: 'ai',
      winner: null, winLine: null, isDraw: false, gameOver: false, paused: false,
      scoreRed: 0, scoreYellow: 0, draws: 0,
      canvasWidth: canvas.width, canvasHeight: canvas.height,
      aiThinking: false, showModeSelect: false, hoverCol: -1,
      animationTime: 0, activeDrop: null, dropQueue: [],
    };

    // Place a few test discs to verify rendering
    this.state.board[5][0] = 'red';
    this.state.board[5][1] = 'yellow';
    this.state.board[5][2] = 'red';
    this.state.board[4][0] = 'yellow';

    this.boardRenderer = new BoardRenderer();

    this.resizeHandler = () => {
      canvas.width = window.innerWidth; canvas.height = window.innerHeight;
      this.state.canvasWidth = canvas.width; this.state.canvasHeight = canvas.height;
    };
    window.addEventListener('resize', this.resizeHandler);
  }

  start(): void { this.running = true; this.loop(); }

  destroy(): void {
    this.running = false; cancelAnimationFrame(this.rafId);
    window.removeEventListener('resize', this.resizeHandler);
  }

  private loop(): void {
    if (!this.running) return;
    this.boardRenderer.render(this.ctx, this.state);
    this.rafId = requestAnimationFrame(() => this.loop());
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

### 4. Create the Entry Point

**File:** `src/games/connect-four/index.ts`

```typescript
import { ConnectFourEngine } from './ConnectFourEngine';

export function createConnectFour(canvas: HTMLCanvasElement): { destroy: () => void } {
  const engine = new ConnectFourEngine(canvas);
  engine.start();
  return { destroy: () => engine.destroy() };
}
```

---

## Test It

1. **Run:** `npm run dev`
2. **Open:** the Connect Four game
3. **Observe:**
   - Dark background with a centered **blue board**
   - 7 columns and 6 rows of **dark circular holes**
   - A few test discs (red and yellow) with **3D gradient shading**
   - The board **scales and centers** when you resize the window

---

## Challenges

**Easy:**
- Change the board color from blue (`#1565c0`) to green.
- Increase the disc radius from 0.38 to 0.42 for larger discs.

**Medium:**
- Add column labels (A-G or 1-7) above the board.

**Hard:**
- Draw subtle horizontal lines between rows to make the grid structure clearer.

---

## What You Learned

- Drawing a grid-based game board with responsive sizing
- Creating 3D disc effects using radial gradients with offset highlights
- Using `roundRect` for polished board edges
- Simulating "holes" by drawing dark circles on a colored background
- Computing board metrics that adapt to any viewport size

**Next:** Drop discs into columns with gravity animation and alternating turns!
