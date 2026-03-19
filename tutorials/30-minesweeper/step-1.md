# Step 1: Grid Setup & Rendering

**Goal:** Draw a 9x9 grid of unrevealed cells with a 3D raised appearance.

**Time:** ~15 minutes

---

## What You'll Build

- **9x9 grid** of covered cells centered on the canvas
- **3D raised look** for unrevealed cells using highlight/shadow edges
- **Responsive layout** that calculates cell size and centers the board
- **Board border** framing the grid
- **Dark background** with the grid as the focal point

---

## Concepts

- **3D Bevel Effect**: Draw a light stripe along the top and left edges (highlight) and a dark stripe along the bottom and right edges (shadow). This creates the classic "raised button" look.
- **Cell Size Calculation**: `Math.min(availW / cols, availH / rows)` ensures the grid fits any viewport while maintaining square cells.
- **Board Offset**: Center the grid by computing `offsetX = (W - boardW) / 2`.

---

## Code

### 1. Create Types

**File:** `src/games/minesweeper/types.ts`

```typescript
export interface Cell {
  revealed: boolean;
  flagged: boolean;
  mine: boolean;
  adjacentMines: number;
}

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface DifficultyPreset {
  cols: number;
  rows: number;
  mines: number;
}

export const DIFFICULTY_PRESETS: Record<Difficulty, DifficultyPreset> = {
  easy: { cols: 9, rows: 9, mines: 10 },
  medium: { cols: 16, rows: 16, mines: 40 },
  hard: { cols: 30, rows: 16, mines: 99 },
};

export type GameStatus = 'idle' | 'playing' | 'won' | 'lost';

export interface MinesweeperState {
  board: Cell[][];
  cols: number;
  rows: number;
  difficulty: Difficulty;
  totalMines: number;
  flagCount: number;
  status: GameStatus;
  timer: number;
  firstClick: boolean;
  offsetX: number;
  offsetY: number;
  cellSize: number;
}

export const GAME_COLOR = '#95a5a6';

export const NUMBER_COLORS: Record<number, string> = {
  1: '#2563eb', 2: '#16a34a', 3: '#dc2626', 4: '#7c3aed',
  5: '#b91c1c', 6: '#0891b2', 7: '#1e1e1e', 8: '#6b7280',
};
```

---

### 2. Create the Board Renderer

**File:** `src/games/minesweeper/renderers/BoardRenderer.ts`

Draw the grid with the 3D raised effect on unrevealed cells.

```typescript
import type { MinesweeperState } from '../types';

export class BoardRenderer {
  render(ctx: CanvasRenderingContext2D, state: MinesweeperState): void {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    // Clear background
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, W, H);

    const { board, rows, cols, offsetX, offsetY, cellSize } = state;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cell = board[r][c];
        const x = offsetX + c * cellSize;
        const y = offsetY + r * cellSize;

        // Cell background
        if (cell.revealed) {
          ctx.fillStyle = '#2a2a4a';
        } else {
          ctx.fillStyle = '#3a3a5c';
        }
        ctx.fillRect(x, y, cellSize, cellSize);

        // Cell border
        ctx.strokeStyle = '#1a1a2e';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, cellSize, cellSize);

        // Unrevealed 3D raised effect
        if (!cell.revealed) {
          // Top and left highlights (light)
          ctx.fillStyle = 'rgba(255,255,255,0.08)';
          ctx.fillRect(x, y, cellSize, 2);       // top edge
          ctx.fillRect(x, y, 2, cellSize);        // left edge
          // Bottom and right shadows (dark)
          ctx.fillStyle = 'rgba(0,0,0,0.15)';
          ctx.fillRect(x + cellSize - 2, y, 2, cellSize);  // right edge
          ctx.fillRect(x, y + cellSize - 2, cellSize, 2);  // bottom edge
        }
      }
    }

    // Board border
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 2;
    ctx.strokeRect(offsetX - 1, offsetY - 1, cols * cellSize + 2, rows * cellSize + 2);
  }
}
```

**What's happening:**
- Unrevealed cells are a lighter shade (`#3a3a5c`) than revealed cells (`#2a2a4a`).
- The 3D effect is created by 2px-wide strips: light (`rgba(255,255,255,0.08)`) on top/left, dark (`rgba(0,0,0,0.15)`) on bottom/right. This mimics the classic Windows Minesweeper look.
- A 2px border frames the entire board for a clean edge.

---

### 3. Create the Board System

**File:** `src/games/minesweeper/systems/BoardSystem.ts`

Initialize a blank board for the given difficulty.

```typescript
import type { MinesweeperState, Cell } from '../types';
import { DIFFICULTY_PRESETS } from '../types';

export class BoardSystem {
  initBoard(state: MinesweeperState): void {
    const preset = DIFFICULTY_PRESETS[state.difficulty];
    state.cols = preset.cols;
    state.rows = preset.rows;
    state.totalMines = preset.mines;
    state.flagCount = 0;
    state.status = 'idle';
    state.timer = 0;
    state.firstClick = false;

    state.board = [];
    for (let r = 0; r < state.rows; r++) {
      const row: Cell[] = [];
      for (let c = 0; c < state.cols; c++) {
        row.push({ revealed: false, flagged: false, mine: false, adjacentMines: 0 });
      }
      state.board.push(row);
    }
  }

  update(_state: MinesweeperState, _dt: number): void {
    // Timer will be added in Step 5
  }
}
```

---

### 4. Create the Engine

**File:** `src/games/minesweeper/MinesweeperEngine.ts`

```typescript
import type { MinesweeperState, Difficulty } from './types';
import { DIFFICULTY_PRESETS } from './types';
import { BoardSystem } from './systems/BoardSystem';
import { BoardRenderer } from './renderers/BoardRenderer';

export class MinesweeperEngine {
  private ctx: CanvasRenderingContext2D;
  private state: MinesweeperState;
  private running = false;
  private rafId = 0;
  private boardSystem: BoardSystem;
  private boardRenderer: BoardRenderer;
  private resizeHandler: () => void;

  constructor(canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const preset = DIFFICULTY_PRESETS['easy'];
    this.state = {
      board: [], cols: preset.cols, rows: preset.rows,
      difficulty: 'easy', totalMines: preset.mines,
      flagCount: 0, status: 'idle', timer: 0, firstClick: false,
      offsetX: 0, offsetY: 0, cellSize: 0,
    };

    this.boardSystem = new BoardSystem();
    this.boardRenderer = new BoardRenderer();

    this.boardSystem.initBoard(this.state);
    this.computeLayout();

    this.resizeHandler = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      this.computeLayout();
    };
    window.addEventListener('resize', this.resizeHandler);
  }

  start(): void { this.running = true; this.loop(); }
  destroy(): void { this.running = false; cancelAnimationFrame(this.rafId); window.removeEventListener('resize', this.resizeHandler); }

  private loop(): void {
    if (!this.running) return;
    this.boardRenderer.render(this.ctx, this.state);
    this.rafId = requestAnimationFrame(() => this.loop());
  }

  private computeLayout(): void {
    const W = this.ctx.canvas.width; const H = this.ctx.canvas.height;
    const hudHeight = 50; const padding = 20;
    const availW = W - padding * 2; const availH = H - hudHeight - padding * 2;
    const cellW = Math.floor(availW / this.state.cols);
    const cellH = Math.floor(availH / this.state.rows);
    this.state.cellSize = Math.max(12, Math.min(cellW, cellH, 40));
    const boardW = this.state.cols * this.state.cellSize;
    const boardH = this.state.rows * this.state.cellSize;
    this.state.offsetX = Math.floor((W - boardW) / 2);
    this.state.offsetY = Math.floor(hudHeight + (H - hudHeight - boardH) / 2);
  }
}
```

---

### 5. Create the Entry Point

**File:** `src/games/minesweeper/index.ts`

```typescript
import { MinesweeperEngine } from './MinesweeperEngine';

export function createMinesweeper(canvas: HTMLCanvasElement): { destroy: () => void } {
  const engine = new MinesweeperEngine(canvas);
  engine.start();
  return { destroy: () => engine.destroy() };
}
```

---

## Test It

1. **Run:** `npm run dev`
2. **Open:** the Minesweeper game
3. **Observe:**
   - Dark background with a centered **9x9 grid**
   - Each cell has a **3D raised appearance** with light top/left edges and dark bottom/right edges
   - A thin **border** frames the entire board
   - The board **scales and centers** when you resize the window

---

## Challenges

**Easy:**
- Change the unrevealed cell color to a different shade.
- Make the bevel effect more pronounced by using 3px strips instead of 2px.

**Medium:**
- Add row/column numbers along the edges of the board.

**Hard:**
- Add a subtle hover effect that highlights the cell under the mouse cursor.

---

## What You Learned

- Creating a 3D bevel/raised effect with highlight and shadow strips
- Initializing a grid of cell objects with default properties
- Computing responsive board layout (cell size, offsets) from available space
- Drawing a bordered grid of square cells on canvas

**Next:** Mine placement and number calculation -- place mines and count adjacent mines!
