# Step 2: Placing Marks & Turns

**Goal:** Click cells to place X or O marks, alternating turns between players.

**Time:** ~15 minutes

---

## What You'll Build

Interactive gameplay where clicking empty cells places marks (X or O) with smooth animations.

```
Click cell 0:    Click cell 4:    Click cell 2:
  X │   │          X │   │          X │   │ X
  ──┼───┼──        ──┼───┼──        ──┼───┼──
    │   │      →     │ O │      →     │ O │  
  ──┼───┼──        ──┼───┼──        ──┼───┼──
    │   │            │   │            │   │  
```

---

## Concepts

- **Click Detection**: Convert mouse coordinates to cell index
- **Turn System**: Alternate between 'X' and 'O' players
- **Drawing X and O**: Use Canvas paths to draw symbols
- **Animation**: Gradually draw marks with progress values

---

## Code

### 1. Update Types

**File:** `src/games/tic-tac-toe/types.ts`

```typescript
export interface CellAnimation {
  cellIndex: number;
  progress: number; // 0 to 1
}

export interface TicTacToeState {
  board: Cell[];
  currentPlayer: Player;
  gameOver: boolean;
  canvasWidth: number;
  canvasHeight: number;
  cellAnimations: CellAnimation[]; // ← NEW: Track animations
}
```

---

### 2. Create Board System

**File:** `src/games/tic-tac-toe/systems/BoardSystem.ts`

```typescript
import type { Updatable } from '@shared/Updatable';
import type { TicTacToeState } from '../types';
import { TOTAL_CELLS } from '../types';

export class BoardSystem implements Updatable<TicTacToeState> {
  /** Update animations each frame */
  update(state: TicTacToeState, _dt: number): void {
    // Animate all cell marks from 0 to 1
    for (const anim of state.cellAnimations) {
      if (anim.progress < 1) {
        anim.progress = Math.min(1, anim.progress + 0.06);
      }
    }
  }

  /** Place a mark (X or O) in a cell */
  placeMark(state: TicTacToeState, index: number): boolean {
    // Validate move
    if (state.board[index] !== null || state.gameOver) {
      return false;
    }

    // Place mark
    state.board[index] = state.currentPlayer;
    
    // Start animation
    state.cellAnimations.push({ cellIndex: index, progress: 0 });

    // Switch player
    state.currentPlayer = state.currentPlayer === 'X' ? 'O' : 'X';
    
    return true;
  }
}
```

**Key Points:**
- **Animation**: Progress increments by 0.06 per frame (~17 frames = 1 second at 60fps)
- **Validation**: Check if cell is empty and game isn't over
- **Turn Switch**: Toggle between 'X' and 'O'

---

### 3. Create Input System

**File:** `src/games/tic-tac-toe/systems/InputSystem.ts`

```typescript
import type { TicTacToeState } from '../types';
import { BoardSystem } from './BoardSystem';

export class InputSystem {
  private clickHandler: (e: MouseEvent) => void;

  constructor(
    private state: TicTacToeState,
    private canvas: HTMLCanvasElement,
    private boardSystem: BoardSystem,
  ) {
    this.clickHandler = (e: MouseEvent) => this.onClick(e);
  }

  attach(): void {
    this.canvas.addEventListener('click', this.clickHandler);
  }

  detach(): void {
    this.canvas.removeEventListener('click', this.clickHandler);
  }

  private onClick(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const index = this.getCellIndex(x, y);
    if (index !== null) {
      this.boardSystem.placeMark(this.state, index);
    }
  }

  private getCellIndex(x: number, y: number): number | null {
    const W = this.state.canvasWidth;
    const H = this.state.canvasHeight;
    const boardSize = Math.min(W, H) * 0.6;
    const cellSize = boardSize / 3;
    const offsetX = (W - boardSize) / 2;
    const offsetY = (H - boardSize) / 2;

    // Check if click is within board bounds
    if (x < offsetX || x > offsetX + boardSize || 
        y < offsetY || y > offsetY + boardSize) {
      return null;
    }

    // Calculate cell indices
    const col = Math.floor((x - offsetX) / cellSize);
    const row = Math.floor((y - offsetY) / cellSize);

    return row * 3 + col;
  }
}
```

---

### 4. Create Board Renderer

**File:** `src/games/tic-tac-toe/renderers/BoardRenderer.ts`

```typescript
import type { TicTacToeState } from '../types';

export class BoardRenderer {
  render(ctx: CanvasRenderingContext2D, state: TicTacToeState): void {
    const W = state.canvasWidth;
    const H = state.canvasHeight;
    const boardSize = Math.min(W, H) * 0.6;
    const cellSize = boardSize / 3;
    const offsetX = (W - boardSize) / 2;
    const offsetY = (H - boardSize) / 2;

    // Draw grid lines
    ctx.strokeStyle = '#3a3a5c';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();

    for (let i = 1; i < 3; i++) {
      const x = offsetX + i * cellSize;
      ctx.moveTo(x, offsetY);
      ctx.lineTo(x, offsetY + boardSize);

      const y = offsetY + i * cellSize;
      ctx.moveTo(offsetX, y);
      ctx.lineTo(offsetX + boardSize, y);
    }

    ctx.stroke();

    // Draw X and O marks
    for (let i = 0; i < 9; i++) {
      const mark = state.board[i];
      if (mark === null) continue;

      const row = Math.floor(i / 3);
      const col = i % 3;
      const x = offsetX + col * cellSize + cellSize / 2;
      const y = offsetY + row * cellSize + cellSize / 2;

      // Find animation for this cell
      const anim = state.cellAnimations.find(a => a.cellIndex === i);
      const progress = anim ? anim.progress : 1;

      if (mark === 'X') {
        this.drawX(ctx, x, y, cellSize * 0.3, progress);
      } else {
        this.drawO(ctx, x, y, cellSize * 0.3, progress);
      }
    }
  }

  private drawX(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, progress: number): void {
    ctx.strokeStyle = '#ef5350'; // Red
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';

    const p = Math.min(1, progress * 2); // First diagonal: 0-0.5 → 0-1

    ctx.beginPath();
    ctx.moveTo(x - size, y - size);
    ctx.lineTo(x - size + p * size * 2, y - size + p * size * 2);
    ctx.stroke();

    if (progress > 0.5) {
      const p2 = (progress - 0.5) * 2; // Second diagonal: 0.5-1 → 0-1
      ctx.beginPath();
      ctx.moveTo(x + size, y - size);
      ctx.lineTo(x + size - p2 * size * 2, y - size + p2 * size * 2);
      ctx.stroke();
    }
  }

  private drawO(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, progress: number): void {
    ctx.strokeStyle = '#42a5f5'; // Blue
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';

    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2 * progress);
    ctx.stroke();
  }
}
```

**Key Points:**
- **X Drawing**: Two diagonal lines, animated sequentially
- **O Drawing**: Circle arc from 0 to `2π * progress`
- **Centering**: Marks drawn at cell center: `x + cellSize / 2`

---

### 5. Wire Everything in Engine

**File:** `src/games/tic-tac-toe/TicTacToeEngine.ts`

```typescript
import { BoardSystem } from './systems/BoardSystem';
import { InputSystem } from './systems/InputSystem';
import { BoardRenderer } from './renderers/BoardRenderer';

export class TicTacToeEngine {
  // ... existing properties ...
  private boardSystem: BoardSystem;
  private inputSystem: InputSystem;
  private boardRenderer: BoardRenderer;

  constructor(canvas: HTMLCanvasElement) {
    // ... existing setup ...

    this.state = {
      board: Array(TOTAL_CELLS).fill(null),
      currentPlayer: 'X',
      gameOver: false,
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
      cellAnimations: [], // ← Initialize animations array
    };

    this.boardSystem = new BoardSystem();
    this.boardRenderer = new BoardRenderer();
    this.inputSystem = new InputSystem(
      this.state,
      canvas,
      this.boardSystem,
    );

    this.inputSystem.attach();
  }

  destroy(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
    this.inputSystem.detach(); // ← Clean up
  }

  private loop(): void {
    if (!this.running) return;

    this.boardSystem.update(this.state, 16); // ← Update animations
    this.render();

    this.rafId = requestAnimationFrame(() => this.loop());
  }

  private render(): void {
    const { ctx } = this;
    const W = this.state.canvasWidth;
    const H = this.state.canvasHeight;

    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, W, H);

    this.boardRenderer.render(ctx, this.state); // ← Use renderer
  }
}
```

---

## Test It

1. **Run:** `npm run dev`
2. **Click cells**: X appears, then O, alternating
3. **Watch animations**: Marks draw smoothly from 0% to 100%
4. **Try clicking filled cells**: Nothing happens (validation works)

---

## What You Learned

✅ Convert mouse clicks to grid indices  
✅ Implement turn-based gameplay  
✅ Draw X and O symbols with Canvas paths  
✅ Animate drawing with progress values  
✅ Separate input, logic, and rendering

---

## Next Step

→ [Step 3: Win & Draw Detection](./step-3.md) — Check for 3-in-a-row and detect draws
