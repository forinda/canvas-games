# Step 2: Mine Placement & Numbers

**Goal:** Place mines randomly after the first click (ensuring safety), and calculate adjacent mine counts.

**Time:** ~15 minutes

---

## What You'll Build

- **Random mine placement** that avoids the first-clicked cell and its neighbors
- **Adjacent mine counting** for every non-mine cell (the classic 1-8 numbers)
- **First-click safety** -- mines are placed *after* the first click so you never die immediately
- **Mine rendering** with a black circle and spike lines
- **Number rendering** with the classic Minesweeper color scheme (blue for 1, green for 2, red for 3, etc.)

---

## Concepts

- **Deferred Mine Placement**: The board starts empty. Mines are placed only after the first left-click, with the clicked cell and its 8 neighbors excluded from mine placement.
- **Safe Zone**: Build a `Set` of coordinates that are off-limits for mines. This guarantees the player's first reveal is always safe and opens some space.
- **Neighbor Counting**: For each non-mine cell, count how many of its 8 neighbors contain mines. Store the result as `adjacentMines`.

---

## Code

### 1. Update the Board System

**File:** `src/games/minesweeper/systems/BoardSystem.ts`

Add mine placement and neighbor counting.

```typescript
import type { MinesweeperState, Cell } from '../types';
import { DIFFICULTY_PRESETS } from '../types';

export class BoardSystem {
  private timerAccum = 0;

  initBoard(state: MinesweeperState): void {
    const preset = DIFFICULTY_PRESETS[state.difficulty];
    state.cols = preset.cols; state.rows = preset.rows;
    state.totalMines = preset.mines; state.flagCount = 0;
    state.status = 'idle'; state.timer = 0; state.firstClick = false;
    this.timerAccum = 0;

    state.board = [];
    for (let r = 0; r < state.rows; r++) {
      const row: Cell[] = [];
      for (let c = 0; c < state.cols; c++) {
        row.push({ revealed: false, flagged: false, mine: false, adjacentMines: 0 });
      }
      state.board.push(row);
    }
  }

  placeMines(state: MinesweeperState, safeRow: number, safeCol: number): void {
    const { rows, cols, totalMines, board } = state;

    // Build safe zone: clicked cell + 8 neighbors
    const safeSet = new Set<string>();
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const nr = safeRow + dr;
        const nc = safeCol + dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
          safeSet.add(`${nr},${nc}`);
        }
      }
    }

    // Place mines randomly
    let placed = 0;
    while (placed < totalMines) {
      const r = Math.floor(Math.random() * rows);
      const c = Math.floor(Math.random() * cols);
      if (board[r][c].mine || safeSet.has(`${r},${c}`)) continue;
      board[r][c].mine = true;
      placed++;
    }

    // Calculate adjacent mine counts
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (board[r][c].mine) continue;
        let count = 0;
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            const nr = r + dr; const nc = c + dc;
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && board[nr][nc].mine) {
              count++;
            }
          }
        }
        board[r][c].adjacentMines = count;
      }
    }
  }

  update(state: MinesweeperState, dt: number): void {
    if (state.status !== 'playing') return;
    this.timerAccum += dt;
    if (this.timerAccum >= 1000) {
      const seconds = Math.floor(this.timerAccum / 1000);
      state.timer += seconds;
      this.timerAccum -= seconds * 1000;
    }
  }

  resetTimer(): void { this.timerAccum = 0; }
}
```

**What's happening:**
- `placeMines` builds a safe zone `Set` from the first-click position and its 8 neighbors. Then it randomly places mines, skipping any cell in the safe zone or already containing a mine.
- After placement, a nested loop counts adjacent mines for every non-mine cell by checking all 8 neighbors.
- The `while` loop for placement keeps trying random cells until all mines are placed. This is efficient because the grid is much larger than the mine count.

---

### 2. Update the Board Renderer

**File:** `src/games/minesweeper/renderers/BoardRenderer.ts`

Add mine and number rendering for revealed cells.

```typescript
import type { MinesweeperState } from '../types';
import { NUMBER_COLORS } from '../types';

export class BoardRenderer {
  render(ctx: CanvasRenderingContext2D, state: MinesweeperState): void {
    const W = ctx.canvas.width; const H = ctx.canvas.height;
    ctx.fillStyle = '#1a1a2e'; ctx.fillRect(0, 0, W, H);

    const { board, rows, cols, offsetX, offsetY, cellSize } = state;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cell = board[r][c];
        const x = offsetX + c * cellSize;
        const y = offsetY + r * cellSize;

        if (cell.revealed) {
          ctx.fillStyle = cell.mine ? '#7f1d1d' : '#2a2a4a';
        } else {
          ctx.fillStyle = '#3a3a5c';
        }
        ctx.fillRect(x, y, cellSize, cellSize);
        ctx.strokeStyle = '#1a1a2e'; ctx.lineWidth = 1;
        ctx.strokeRect(x, y, cellSize, cellSize);

        if (!cell.revealed) {
          ctx.fillStyle = 'rgba(255,255,255,0.08)';
          ctx.fillRect(x, y, cellSize, 2); ctx.fillRect(x, y, 2, cellSize);
          ctx.fillStyle = 'rgba(0,0,0,0.15)';
          ctx.fillRect(x + cellSize - 2, y, 2, cellSize);
          ctx.fillRect(x, y + cellSize - 2, cellSize, 2);
        }

        const cx = x + cellSize / 2;
        const cy = y + cellSize / 2;

        if (cell.revealed) {
          if (cell.mine) {
            this.drawMine(ctx, cx, cy, cellSize);
          } else if (cell.adjacentMines > 0) {
            this.drawNumber(ctx, cx, cy, cellSize, cell.adjacentMines);
          }
        }
      }
    }

    ctx.strokeStyle = '#555'; ctx.lineWidth = 2;
    ctx.strokeRect(offsetX - 1, offsetY - 1, cols * cellSize + 2, rows * cellSize + 2);
  }

  private drawMine(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number): void {
    const r = size * 0.28;
    ctx.fillStyle = '#1e1e1e';
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();

    // Spikes
    ctx.strokeStyle = '#1e1e1e'; ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 4;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(angle) * r * 0.5, cy + Math.sin(angle) * r * 0.5);
      ctx.lineTo(cx + Math.cos(angle) * r * 1.5, cy + Math.sin(angle) * r * 1.5);
      ctx.stroke();
    }

    // Highlight dot
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.beginPath(); ctx.arc(cx - r * 0.25, cy - r * 0.25, r * 0.2, 0, Math.PI * 2); ctx.fill();
  }

  private drawNumber(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, num: number): void {
    const fontSize = Math.floor(size * 0.55);
    ctx.font = `bold ${fontSize}px monospace`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = NUMBER_COLORS[num] ?? '#fff';
    ctx.fillText(String(num), cx, cy + 1);
  }
}
```

**What's happening:**
- Mine cells get a dark red background (`#7f1d1d`). A black circle with 4 spike lines is drawn as the mine icon.
- A small white highlight dot on the mine creates a 3D spherical look.
- Numbers use the classic Minesweeper color scheme: blue (1), green (2), red (3), purple (4), etc.
- The font size scales with cell size so numbers remain readable at any zoom level.

---

### 3. Add Click Handling

**File:** `src/games/minesweeper/systems/InputSystem.ts`

Handle left clicks to trigger mine placement on first click.

```typescript
import type { MinesweeperState } from '../types';
import type { BoardSystem } from './BoardSystem';

export class InputSystem {
  private state: MinesweeperState;
  private canvas: HTMLCanvasElement;
  private boardSystem: BoardSystem;
  private clickHandler: (e: MouseEvent) => void;

  constructor(state: MinesweeperState, canvas: HTMLCanvasElement, boardSystem: BoardSystem) {
    this.state = state; this.canvas = canvas; this.boardSystem = boardSystem;
    this.clickHandler = (e: MouseEvent) => this.handleClick(e);
  }

  attach(): void { this.canvas.addEventListener('click', this.clickHandler); }
  detach(): void { this.canvas.removeEventListener('click', this.clickHandler); }

  private getCanvasPos(e: MouseEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (this.canvas.width / rect.width),
      y: (e.clientY - rect.top) * (this.canvas.height / rect.height),
    };
  }

  private getCellFromPos(x: number, y: number): { row: number; col: number } | null {
    const s = this.state;
    const col = Math.floor((x - s.offsetX) / s.cellSize);
    const row = Math.floor((y - s.offsetY) / s.cellSize);
    if (row < 0 || row >= s.rows || col < 0 || col >= s.cols) return null;
    return { row, col };
  }

  private handleClick(e: MouseEvent): void {
    const s = this.state;
    const { x, y } = this.getCanvasPos(e);
    const cell = this.getCellFromPos(x, y);
    if (!cell) return;

    // First click -- place mines and start
    if (!s.firstClick) {
      s.firstClick = true;
      s.status = 'playing';
      this.boardSystem.placeMines(s, cell.row, cell.col);
    }

    // For now, just reveal the clicked cell to see mines/numbers
    const boardCell = s.board[cell.row][cell.col];
    if (!boardCell.revealed && !boardCell.flagged) {
      boardCell.revealed = true;
    }
  }
}
```

---

### 4. Update the Engine

Wire the input system.

```typescript
// In the constructor, after creating boardSystem and boardRenderer:
this.inputSystem = new InputSystem(this.state, canvas, this.boardSystem);
this.inputSystem.attach();

// In destroy():
this.inputSystem.detach();
```

---

## Test It

1. **Run:** `npm run dev`
2. **Open:** the Minesweeper game
3. **Observe:**
   - Click any cell -- mines are placed (avoiding the clicked cell and its neighbors)
   - The clicked cell reveals its content: a **number** (colored 1-8) or **empty**
   - Click on a mine -- the mine icon appears on a dark red background
   - Numbers show how many adjacent mines exist
   - The first click is **always safe** -- never a mine

---

## Challenges

**Easy:**
- Change the mine icon from black to red.
- Make number fonts larger by changing the multiplier from 0.55 to 0.65.

**Medium:**
- Add a "question mark" state that can be toggled with right-click before flags are implemented.

**Hard:**
- Visualize the safe zone on the first click by briefly highlighting the protected cells.

---

## What You Learned

- Deferred mine placement for first-click safety
- Building a safe zone set to exclude specific positions
- Counting adjacent mines using 8-neighbor iteration
- Drawing mine icons with circles and radiating spikes
- Classic Minesweeper number color coding

**Next:** Click to reveal and flood fill -- auto-expand empty areas!
