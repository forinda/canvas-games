# Step 2: Click to Toggle

**Goal:** Click a cell to toggle it **and its 4 orthogonal neighbors** (up/down/left/right).

**Time:** ~15 minutes

---

## What You'll Build

The core mechanic: clicking a cell flips its state plus its neighbors. This is what makes Lights Out challenging!

```
Click center cell:       Result:
💡 💡 💡              ⬛ ⬛ ⬛
💡 💡 💡    →         ⬛ ⬛ ⬛
💡 💡 💡              ⬛ ⬛ ⬛
         (5 cells toggled)
```

---

## Concepts

- **Mouse Coordinates**: Convert `clientX/Y` to grid row/column
- **Toggle Logic**: Flip the clicked cell + 4 neighbors
- **Boundary Checks**: Don't toggle cells outside the grid

---

## Code

### 1. Update Types

**File:** `src/games/lights-out/types.ts`

```typescript
export interface LightsOutState {
  board: Cell[][];
  moves: number; // ← NEW: Track number of clicks
  offsetX: number;
  offsetY: number;
  cellSize: number;
}
```

---

### 2. Create Board System

**File:** `src/games/lights-out/systems/BoardSystem.ts`

```typescript
import type { LightsOutState } from '../types';
import { GRID_SIZE } from '../types';

export class BoardSystem {
  /** Toggle the clicked cell and its 4 orthogonal neighbors */
  toggle(state: LightsOutState, row: number, col: number): void {
    // Define 5 cells to toggle: center + up/down/left/right
    const directions = [
      [0, 0],   // Center (the clicked cell)
      [-1, 0],  // Up
      [1, 0],   // Down
      [0, -1],  // Left
      [0, 1],   // Right
    ];

    for (const [dr, dc] of directions) {
      const nr = row + dr;
      const nc = col + dc;

      // Only toggle if within bounds
      if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE) {
        state.board[nr][nc].on = !state.board[nr][nc].on;
      }
    }

    state.moves++;
  }
}
```

**Why:**
- **5 cells** are toggled: the center + 4 neighbors
- **Boundary check** prevents toggling non-existent cells (e.g., clicking a corner only affects 3 cells)

---

### 3. Create Input System

**File:** `src/games/lights-out/systems/InputSystem.ts`

```typescript
import type { LightsOutState } from '../types';
import { GRID_SIZE } from '../types';
import { BoardSystem } from './BoardSystem';

export class InputSystem {
  private boardSystem: BoardSystem;
  private clickHandler: (e: MouseEvent) => void;

  constructor(
    private state: LightsOutState,
    private canvas: HTMLCanvasElement,
    boardSystem: BoardSystem,
  ) {
    this.boardSystem = boardSystem;

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

    // Convert pixel coordinates to grid coordinates
    const col = Math.floor((x - this.state.offsetX) / this.state.cellSize);
    const row = Math.floor((y - this.state.offsetY) / this.state.cellSize);

    // Validate click is within grid bounds
    if (row >= 0 && row < GRID_SIZE && col >= 0 && col < GRID_SIZE) {
      this.boardSystem.toggle(this.state, row, col);
    }
  }
}
```

**Key Points:**
- `getBoundingClientRect()` converts page coordinates to canvas coordinates
- Subtract `offsetX/Y` and divide by `cellSize` to get grid indices
- Validate the click is inside the 5×5 grid

---

### 4. Wire Up Input System

**File:** `src/games/lights-out/LightsOutEngine.ts`

```typescript
import { BoardSystem } from './systems/BoardSystem';
import { InputSystem } from './systems/InputSystem';

export class LightsOutEngine {
  // ... existing code ...
  private boardSystem: BoardSystem;
  private inputSystem: InputSystem;

  constructor(canvas: HTMLCanvasElement) {
    // ... existing initialization ...

    this.state = {
      board: this.createBoard([...]),
      moves: 0, // ← Initialize moves counter
      offsetX: 0,
      offsetY: 0,
      cellSize: 0,
    };

    this.boardSystem = new BoardSystem();
    this.inputSystem = new InputSystem(
      this.state,
      canvas,
      this.boardSystem,
    );

    this.inputSystem.attach(); // ← Start listening to clicks
    this.computeLayout();
  }

  destroy(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
    this.inputSystem.detach(); // ← Remove event listeners
  }

  private render(): void {
    this.ctx.fillStyle = '#1a1a1a';
    this.ctx.fillRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
    this.renderBoard();
    this.renderHUD(); // ← NEW: Show moves counter
  }

  private renderHUD(): void {
    this.ctx.fillStyle = 'white';
    this.ctx.font = '20px sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(
      `Moves: ${this.state.moves}`,
      this.ctx.canvas.width / 2,
      30,
    );
  }

  // ... rest of the code ...
}
```

---

## Test It

1. **Run:** `npm run dev`
2. **Click a cell**: The cell and its neighbors should flip
3. **Click a corner**: Only 3 cells flip (corner + 2 neighbors)
4. **Moves counter**: Should increment with each click

---

## Expected Behavior

| Action | Result |
|--------|--------|
| Click center cell | 5 cells toggle (center + 4 neighbors) |
| Click edge cell | 4 cells toggle (edge + 3 neighbors) |
| Click corner cell | 3 cells toggle (corner + 2 neighbors) |
| Moves counter | Increments by 1 each click |

---

## What You Learned

✅ Convert mouse coordinates to grid indices  
✅ Toggle multiple cells with boundary checks  
✅ Attach/detach event listeners properly  
✅ Display a simple HUD (moves counter)

---

## Next Step

→ [Step 3: Win Detection & Restart](./step-3.md) — Detect when all lights are off and add a restart button
