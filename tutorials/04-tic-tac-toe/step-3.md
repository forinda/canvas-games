# Step 3: Win & Draw Detection

**Goal:** Detect 3-in-a-row wins and draw conditions, then show game over screens.

**Time:** ~15 minutes

---

## What You'll Build

Win detection for all 8 possible winning combinations (3 rows, 3 columns, 2 diagonals) plus draw detection when the board is full.

```
Win Examples:
X X X │      X │   │      X │   │   
──┼───┼──    ──┼───┼──    ──┼───┼──  
  │   │        X │   │        │ X │   
──┼───┼──    ──┼───┼──    ──┼───┼──  
  │   │        X │   │        │   │ X 
(Row win)    (Col win)    (Diag win)
```

---

## Concepts

- **Win Patterns**: 8 combinations of 3 cells
- **Win Detection**: Check patterns after each move
- **Draw Detection**: Board full with no winner
- **Game Over State**: Stop accepting input after win/draw

---

## Code

### 1. Define Win Patterns

**File:** `src/games/tic-tac-toe/types.ts`

```typescript
export interface WinLine {
  cells: [number, number, number];
  progress: number; // For animation
}

export interface TicTacToeState {
  board: Cell[];
  currentPlayer: Player;
  gameOver: boolean;
  winner: Player | null; // ← NEW
  winLine: WinLine | null; // ← NEW
  isDraw: boolean; // ← NEW
  canvasWidth: number;
  canvasHeight: number;
  cellAnimations: CellAnimation[];
}

// All possible 3-in-a-row combinations
export const WIN_LINES: [number, number, number][] = [
  // Rows
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  // Columns
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  // Diagonals
  [0, 4, 8],
  [2, 4, 6],
];
```

**Why:** 
- 3 horizontal rows
- 3 vertical columns
- 2 diagonal lines
- Total: 8 possible wins

---

### 2. Implement Win Detection

**File:** `src/games/tic-tac-toe/systems/BoardSystem.ts`

```typescript
import { WIN_LINES, TOTAL_CELLS } from '../types';
import type { Cell, Player } from '../types';

export class BoardSystem implements Updatable<TicTacToeState> {
  update(state: TicTacToeState, _dt: number): void {
    // Animate cell marks
    for (const anim of state.cellAnimations) {
      if (anim.progress < 1) {
        anim.progress = Math.min(1, anim.progress + 0.06);
      }
    }

    // Animate win line
    if (state.winLine && state.winLine.progress < 1) {
      state.winLine.progress = Math.min(1, state.winLine.progress + 0.04);
    }
  }

  placeMark(state: TicTacToeState, index: number): boolean {
    if (state.board[index] !== null || state.gameOver) {
      return false;
    }

    state.board[index] = state.currentPlayer;
    state.cellAnimations.push({ cellIndex: index, progress: 0 });

    // Check for win
    const winResult = this.checkWin(state.board, state.currentPlayer);
    if (winResult) {
      state.winner = state.currentPlayer;
      state.winLine = { cells: winResult, progress: 0 };
      state.gameOver = true;
      return true;
    }

    // Check for draw
    if (this.checkDraw(state.board)) {
      state.isDraw = true;
      state.gameOver = true;
      return true;
    }

    // Switch player
    state.currentPlayer = state.currentPlayer === 'X' ? 'O' : 'X';
    return true;
  }

  /** Check if current player has won */
  checkWin(board: Cell[], player: Player): [number, number, number] | null {
    for (const line of WIN_LINES) {
      const [a, b, c] = line;
      if (board[a] === player && board[b] === player && board[c] === player) {
        return line; // Found a winning line!
      }
    }
    return null;
  }

  /** Check if board is full (draw) */
  checkDraw(board: Cell[]): boolean {
    for (let i = 0; i < TOTAL_CELLS; i++) {
      if (board[i] === null) {
        return false; // Found empty cell
      }
    }
    return true; // All cells filled
  }
}
```

**Key Points:**
- **Win Check**: After each move, check all 8 patterns
- **Draw Check**: Only run if no winner found
- **Early Return**: Stop game immediately when win/draw detected

---

### 3. Add Win Line Renderer

**File:** `src/games/tic-tac-toe/renderers/BoardRenderer.ts`

```typescript
export class BoardRenderer {
  render(ctx: CanvasRenderingContext2D, state: TicTacToeState): void {
    // ... existing grid and marks rendering ...

    // Draw winning line if game is won
    if (state.winLine) {
      this.drawWinLine(ctx, state);
    }
  }

  private drawWinLine(ctx: CanvasRenderingContext2D, state: TicTacToeState): void {
    if (!state.winLine) return;

    const W = state.canvasWidth;
    const H = state.canvasHeight;
    const boardSize = Math.min(W, H) * 0.6;
    const cellSize = boardSize / 3;
    const offsetX = (W - boardSize) / 2;
    const offsetY = (H - boardSize) / 2;

    const [a, b, c] = state.winLine.cells;
    
    // Calculate start and end positions
    const startRow = Math.floor(a / 3);
    const startCol = a % 3;
    const endRow = Math.floor(c / 3);
    const endCol = c % 3;

    const x1 = offsetX + startCol * cellSize + cellSize / 2;
    const y1 = offsetY + startRow * cellSize + cellSize / 2;
    const x2 = offsetX + endCol * cellSize + cellSize / 2;
    const y2 = offsetY + endRow * cellSize + cellSize / 2;

    // Animate line drawing
    const progress = state.winLine.progress;
    const currentX = x1 + (x2 - x1) * progress;
    const currentY = y1 + (y2 - y1) * progress;

    // Draw glowing line
    ctx.strokeStyle = state.winner === 'X' ? '#ef5350' : '#42a5f5';
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.shadowBlur = 15;
    ctx.shadowColor = state.winner === 'X' ? '#ef5350' : '#42a5f5';

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(currentX, currentY);
    ctx.stroke();

    // Reset shadow
    ctx.shadowBlur = 0;
  }

  // ... existing drawX() and drawO() methods ...
}
```

**Why:**
- **Animated Line**: Draws from first to last cell in winning pattern
- **Glow Effect**: Uses `shadowBlur` for visual impact
- **Color Matching**: Red for X wins, blue for O wins

---

### 4. Create HUD Renderer

**File:** `src/games/tic-tac-toe/renderers/HUDRenderer.ts`

```typescript
import type { TicTacToeState } from '../types';

export class HUDRenderer {
  render(ctx: CanvasRenderingContext2D, state: TicTacToeState): void {
    const W = state.canvasWidth;
    const H = state.canvasHeight;

    // Show current turn
    if (!state.gameOver) {
      ctx.fillStyle = 'white';
      ctx.font = '24px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(
        `Current Turn: ${state.currentPlayer}`,
        W / 2,
        40
      );
    }

    // Show game over overlay
    if (state.gameOver) {
      this.renderGameOver(ctx, state);
    }
  }

  private renderGameOver(ctx: CanvasRenderingContext2D, state: TicTacToeState): void {
    const W = state.canvasWidth;
    const H = state.canvasHeight;

    // Semi-transparent overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, W, H);

    // Game over message
    ctx.fillStyle = 'white';
    ctx.font = 'bold 48px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (state.isDraw) {
      ctx.fillText("It's a Draw!", W / 2, H / 2 - 40);
    } else if (state.winner) {
      const color = state.winner === 'X' ? '#ef5350' : '#42a5f5';
      ctx.fillStyle = color;
      ctx.fillText(`${state.winner} Wins!`, W / 2, H / 2 - 40);
    }

    // Restart hint
    ctx.fillStyle = '#aaa';
    ctx.font = '20px sans-serif';
    ctx.fillText('Press [R] to restart', W / 2, H / 2 + 20);
  }
}
```

---

### 5. Wire HUD in Engine

**File:** `src/games/tic-tac-toe/TicTacToeEngine.ts`

```typescript
import { HUDRenderer } from './renderers/HUDRenderer';

export class TicTacToeEngine {
  // ... existing properties ...
  private hudRenderer: HUDRenderer;

  constructor(canvas: HTMLCanvasElement) {
    // ... existing setup ...

    this.state = {
      board: Array(TOTAL_CELLS).fill(null),
      currentPlayer: 'X',
      gameOver: false,
      winner: null, // ← Initialize
      winLine: null, // ← Initialize
      isDraw: false, // ← Initialize
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
      cellAnimations: [],
    };

    this.hudRenderer = new HUDRenderer(); // ← Create renderer
    
    // ... rest of constructor ...
  }

  private render(): void {
    const { ctx } = this;
    const W = this.state.canvasWidth;
    const H = this.state.canvasHeight;

    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, W, H);

    this.boardRenderer.render(ctx, this.state);
    this.hudRenderer.render(ctx, this.state); // ← Render HUD
  }
}
```

---

## Test It

1. **Run:** `npm run dev`
2. **Get 3 in a row**: Make X or O win horizontally, vertically, or diagonally
3. **Watch win animation**: Line draws across winning cells with glow
4. **Test draw**: Fill board without winner → "It's a Draw!" message
5. **Verify blocking**: After game ends, cells can't be clicked

---

## What You Learned

✅ Define win patterns with index arrays  
✅ Check all win conditions efficiently  
✅ Detect draw state (full board, no winner)  
✅ Draw animated win lines with glow effects  
✅ Create game over overlays

---

## Next Step

→ [Step 4: AI Opponent](./step-4.md) — Add an unbeatable computer player using minimax algorithm
