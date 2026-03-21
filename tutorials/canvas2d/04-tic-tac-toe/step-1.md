# Step 1: Project Setup & Board Rendering

**Goal:** Draw a 3×3 Tic-Tac-Toe grid on the canvas with animated X and O marks.

**Time:** ~15 minutes

---

## What You'll Build

A clean 3×3 grid rendered in the center of the canvas, ready for gameplay.

```
     │     │     
  ───┼─────┼───  
     │     │     
  ───┼─────┼───  
     │     │     
```

---

## Concepts

- **Grid Layout**: 3×3 cells with calculated positions
- **Canvas Line Drawing**: Using `lineTo()` and `stroke()`
- **Coordinate System**: Converting cell indices to pixel positions

---

## Code

### 1. Create Type Definitions

**File:** `src/contexts/canvas2d/games/tic-tac-toe/types.ts`

```typescript
export type Cell = 'X' | 'O' | null;
export type Player = 'X' | 'O';

export interface TicTacToeState {
  board: Cell[]; // 9 cells: [0,1,2,3,4,5,6,7,8]
  currentPlayer: Player;
  gameOver: boolean;
  canvasWidth: number;
  canvasHeight: number;
}

export const GRID_SIZE = 3;
export const TOTAL_CELLS = 9;
```

**Why:** `Cell[]` stores the board state (null = empty, 'X' = player X, 'O' = player O)

---

### 2. Create Game Engine

**File:** `src/contexts/canvas2d/games/tic-tac-toe/TicTacToeEngine.ts`

```typescript
import type { TicTacToeState } from './types';
import { TOTAL_CELLS } from './types';

export class TicTacToeEngine {
  private ctx: CanvasRenderingContext2D;
  private state: TicTacToeState;
  private running: boolean;
  private rafId: number;

  constructor(canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
    this.running = false;
    this.rafId = 0;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Initialize empty board
    this.state = {
      board: Array(TOTAL_CELLS).fill(null),
      currentPlayer: 'X',
      gameOver: false,
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
    };
  }

  start(): void {
    this.running = true;
    this.loop();
  }

  destroy(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
  }

  private loop(): void {
    if (!this.running) return;
    this.render();
    this.rafId = requestAnimationFrame(() => this.loop());
  }

  private render(): void {
    const { ctx } = this;
    const W = this.state.canvasWidth;
    const H = this.state.canvasHeight;

    // Background
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, W, H);

    this.renderBoard();
  }

  private renderBoard(): void {
    const W = this.state.canvasWidth;
    const H = this.state.canvasHeight;

    // Calculate board size (60% of smaller dimension)
    const boardSize = Math.min(W, H) * 0.6;
    const cellSize = boardSize / 3;

    // Center the board
    const offsetX = (W - boardSize) / 2;
    const offsetY = (H - boardSize) / 2;

    // Draw grid lines
    this.ctx.strokeStyle = '#3a3a5c';
    this.ctx.lineWidth = 4;
    this.ctx.lineCap = 'round';

    this.ctx.beginPath();

    // Vertical lines
    for (let i = 1; i < 3; i++) {
      const x = offsetX + i * cellSize;
      this.ctx.moveTo(x, offsetY);
      this.ctx.lineTo(x, offsetY + boardSize);
    }

    // Horizontal lines
    for (let i = 1; i < 3; i++) {
      const y = offsetY + i * cellSize;
      this.ctx.moveTo(offsetX, y);
      this.ctx.lineTo(offsetX + boardSize, y);
    }

    this.ctx.stroke();
  }
}
```

**Key Points:**
- **Board Size**: 60% of the smaller screen dimension
- **Cell Size**: `boardSize / 3` for 3×3 grid
- **Centering**: Offset calculated to center the board
- **Grid Lines**: 2 vertical + 2 horizontal = 4 lines total

---

### 3. Create Platform Adapter

**File:** `src/contexts/canvas2d/games/tic-tac-toe/adapters/PlatformAdapter.ts`

```typescript
import type { GameInstance } from '@core/GameInterface';
import { TicTacToeEngine } from '../TicTacToeEngine';

export class PlatformAdapter implements GameInstance {
  private engine: TicTacToeEngine;

  constructor(canvas: HTMLCanvasElement, onExit: () => void) {
    this.engine = new TicTacToeEngine(canvas);
  }

  start(): void {
    this.engine.start();
  }

  destroy(): void {
    this.engine.destroy();
  }
}
```

---

### 4. Register the Game

**File:** `src/contexts/canvas2d/games/tic-tac-toe/index.ts`

```typescript
import type { GameDefinition } from '@core/GameInterface';
import { PlatformAdapter } from './adapters/PlatformAdapter';

export const TicTacToeGame: GameDefinition = {
  id: 'tic-tac-toe',
  name: 'Tic-Tac-Toe',
  description: 'Classic 3-in-a-row game with AI opponent',
  icon: '⭕',
  color: '#ef5350',
  category: 'puzzle',
  create(canvas, onExit) {
    const instance = new PlatformAdapter(canvas, onExit);
    instance.start();
    return instance;
  },
};
```

---

## Test It

1. **Run:** `npm run dev`
2. **Navigate:** Select "Tic-Tac-Toe" from the menu
3. **Expect:** A centered 3×3 grid with gray lines

---

## Understanding the Coordinate System

The grid uses a 0-8 index system:

```
0 │ 1 │ 2
──┼───┼──
3 │ 4 │ 5
──┼───┼──
6 │ 7 │ 8
```

To convert index → row/col:
```typescript
const row = Math.floor(index / 3);  // 0, 1, or 2
const col = index % 3;               // 0, 1, or 2
```

---

## What You Learned

✅ Calculate responsive grid layout  
✅ Draw lines with `lineCap: 'round'` for smooth edges  
✅ Center content on canvas  
✅ Structure a turn-based game engine

---

## Next Step

→ [Step 2: Placing Marks & Turns](./step-2.md) — Add click handling to place X and O marks
