# Step 3: Win Detection

**Goal:** Check for four-in-a-row horizontally, vertically, and diagonally, with a glowing winning line.

**Time:** ~15 minutes

---

## What You'll Build

- **Four-direction win check** after each disc placement (horizontal, vertical, diagonal-right, diagonal-left)
- **Bidirectional counting** from the placed disc outward in both directions along each axis
- **Winning line highlight** with an animated pulsing glow around the four winning discs
- **Draw detection** when the top row is completely full with no winner
- **Game over state** that freezes input and displays the result

---

## Concepts

- **Direction Vectors**: Each direction is a `[dr, dc]` pair. Horizontal = `[0,1]`, Vertical = `[1,0]`, Diagonal = `[1,1]` and `[1,-1]`
- **Bidirectional Count**: For each direction, count matching discs in the positive direction, then the negative direction. If total >= 4, it is a win.
- **Animated Glow**: `Math.sin(animationTime * 0.005)` creates a pulsing intensity for the `shadowBlur` and stroke alpha on winning discs

---

## Code

### 1. Update the Board System

**File:** `src/contexts/canvas2d/games/connect-four/systems/BoardSystem.ts`

Add win detection and draw detection after each disc placement.

```typescript
import type { ConnectFourState, Cell, Player, WinCell } from '../types';
import { COLS, ROWS } from '../types';

const DROP_SPEED = 18;

export class BoardSystem {
  update(state: ConnectFourState, dt: number): void {
    state.animationTime += dt;

    if (state.activeDrop && !state.activeDrop.done) {
      const drop = state.activeDrop;
      drop.currentY += DROP_SPEED * (dt / 1000);

      if (drop.currentY >= drop.targetRow) {
        drop.currentY = drop.targetRow;
        drop.done = true;
        state.board[drop.targetRow][drop.col] = drop.player;

        // Check win
        const winCells = this.checkWin(state.board, drop.player, drop.targetRow, drop.col);
        if (winCells) {
          state.winner = drop.player;
          state.winLine = { cells: winCells, progress: 0 };
          state.gameOver = true;
          if (drop.player === 'red') state.scoreRed++;
          else state.scoreYellow++;
        } else if (this.checkDraw(state.board)) {
          state.isDraw = true;
          state.gameOver = true;
          state.draws++;
        } else {
          state.currentPlayer = drop.player === 'red' ? 'yellow' : 'red';
        }

        state.activeDrop = null;

        if (state.dropQueue.length > 0 && !state.gameOver) {
          const next = state.dropQueue.shift()!;
          this.startDrop(state, next.col, next.player);
        }
      }
    }

    // Animate win line glow
    if (state.winLine && state.winLine.progress < 1) {
      state.winLine.progress = Math.min(1, state.winLine.progress + 0.03);
    }
  }

  dropDisc(state: ConnectFourState, col: number, player: Player): boolean {
    if (state.gameOver || col < 0 || col >= COLS) return false;
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

  checkWin(board: Cell[][], player: Player, row: number, col: number): WinCell[] | null {
    const directions: [number, number][] = [
      [0, 1],   // horizontal
      [1, 0],   // vertical
      [1, 1],   // diagonal down-right
      [1, -1],  // diagonal down-left
    ];

    for (const [dr, dc] of directions) {
      const cells: WinCell[] = [{ row, col }];

      // Count in positive direction
      for (let i = 1; i < 4; i++) {
        const r = row + dr * i;
        const c = col + dc * i;
        if (r < 0 || r >= ROWS || c < 0 || c >= COLS) break;
        if (board[r][c] !== player) break;
        cells.push({ row: r, col: c });
      }

      // Count in negative direction
      for (let i = 1; i < 4; i++) {
        const r = row - dr * i;
        const c = col - dc * i;
        if (r < 0 || r >= ROWS || c < 0 || c >= COLS) break;
        if (board[r][c] !== player) break;
        cells.push({ row: r, col: c });
      }

      if (cells.length >= 4) return cells.slice(0, 4);
    }

    return null;
  }

  private checkDraw(board: Cell[][]): boolean {
    for (let c = 0; c < COLS; c++) {
      if (board[0][c] === null) return false;
    }
    return true;
  }

  private startDrop(state: ConnectFourState, col: number, player: Player): void {
    const row = this.getLowestEmptyRow(state.board, col);
    if (row < 0) return;
    state.activeDrop = { col, targetRow: row, currentY: -1, player, done: false };
  }
}
```

**What's happening:**
- `checkWin` tries all 4 directions from the just-placed disc. For each direction, it counts consecutive same-color discs in both the positive and negative direction.
- If any direction yields 4+ cells, those cells are returned as the winning line.
- `checkDraw` simply checks if every column in the top row is occupied. If no empty cell exists and no winner was found, it is a draw.
- The win line has a `progress` property that animates from 0 to 1 for a gradual glow reveal.

---

### 2. Update the Board Renderer

**File:** `src/contexts/canvas2d/games/connect-four/renderers/BoardRenderer.ts`

Add winning line glow and game-over overlay.

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

    // Hover preview
    if (!state.gameOver && state.hoverCol >= 0 && state.activeDrop === null) {
      const previewX = boardX + state.hoverCol * cellSize + cellSize / 2;
      const previewY = boardY - cellSize * 0.5;
      const color = state.currentPlayer === 'red' ? 'rgba(244,67,54,0.5)' : 'rgba(255,235,59,0.5)';
      ctx.beginPath(); ctx.arc(previewX, previewY, discRadius, 0, Math.PI * 2);
      ctx.fillStyle = color; ctx.fill();
    }

    ctx.fillStyle = '#1565c0';
    ctx.beginPath(); ctx.roundRect(boardX - 8, boardY - 8, boardW + 16, boardH + 16, 12); ctx.fill();

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cx = boardX + c * cellSize + cellSize / 2;
        const cy = boardY + r * cellSize + cellSize / 2;
        ctx.beginPath(); ctx.arc(cx, cy, discRadius + 2, 0, Math.PI * 2);
        ctx.fillStyle = '#0a0a18'; ctx.fill();
        if (state.board[r][c] !== null) {
          this.drawDisc(ctx, cx, cy, discRadius, state.board[r][c]!);
        }
      }
    }

    if (state.activeDrop && !state.activeDrop.done) {
      const drop = state.activeDrop;
      const cx = boardX + drop.col * cellSize + cellSize / 2;
      const cy = boardY + drop.currentY * cellSize + cellSize / 2;
      this.drawDisc(ctx, cx, cy, discRadius, drop.player);
    }

    // Winning line glow
    if (state.winLine) {
      this.drawWinGlow(ctx, state, boardX, boardY, cellSize, discRadius);
    }

    // Turn indicator or game over
    if (state.gameOver) {
      this.drawGameOver(ctx, state, W, H);
    } else {
      const color = state.currentPlayer === 'red' ? '#f44336' : '#ffeb3b';
      const name = state.currentPlayer === 'red' ? 'Red' : 'Yellow';
      ctx.font = '16px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.fillStyle = color; ctx.fillText(`${name}'s turn`, W / 2, H - 40);
    }
  }

  private drawWinGlow(ctx: CanvasRenderingContext2D, state: ConnectFourState, boardX: number, boardY: number, cellSize: number, discRadius: number): void {
    const wl = state.winLine!;
    const glowIntensity = 0.5 + 0.5 * Math.sin(state.animationTime * 0.005);
    const glowColor = state.winner === 'red'
      ? `rgba(255,138,128,${glowIntensity * wl.progress})`
      : `rgba(255,255,141,${glowIntensity * wl.progress})`;

    ctx.shadowColor = state.winner === 'red' ? '#ff8a80' : '#ffff8d';
    ctx.shadowBlur = 20 * wl.progress;

    for (const cell of wl.cells) {
      const cx = boardX + cell.col * cellSize + cellSize / 2;
      const cy = boardY + cell.row * cellSize + cellSize / 2;
      ctx.beginPath(); ctx.arc(cx, cy, discRadius + 4, 0, Math.PI * 2);
      ctx.strokeStyle = glowColor; ctx.lineWidth = 4; ctx.stroke();
    }
    ctx.shadowBlur = 0;
  }

  private drawGameOver(ctx: CanvasRenderingContext2D, state: ConnectFourState, W: number, H: number): void {
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, 0, W, H);
    const panelW = 320; const panelH = 140;
    const px = (W - panelW) / 2; const py = (H - panelH) / 2;

    ctx.fillStyle = '#1a1a2e';
    ctx.beginPath(); ctx.roundRect(px, py, panelW, panelH, 12); ctx.fill();
    const borderColor = state.isDraw ? '#888' : (state.winner === 'red' ? '#f44336' : '#ffeb3b');
    ctx.strokeStyle = borderColor; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(px, py, panelW, panelH, 12); ctx.stroke();

    ctx.font = 'bold 24px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (state.isDraw) {
      ctx.fillStyle = '#ccc'; ctx.fillText("It's a Draw!", W / 2, py + 50);
    } else {
      const name = state.winner === 'red' ? 'Red' : 'Yellow';
      ctx.fillStyle = borderColor; ctx.fillText(`${name} Wins!`, W / 2, py + 50);
    }
    ctx.font = '13px monospace'; ctx.fillStyle = '#777';
    ctx.fillText('Click to play again', W / 2, py + 100);
  }

  private drawDisc(ctx: CanvasRenderingContext2D, cx: number, cy: number, radius: number, player: 'red' | 'yellow'): void {
    const baseColor = player === 'red' ? '#f44336' : '#ffeb3b';
    const highlightColor = player === 'red' ? '#ef9a9a' : '#fff9c4';
    const darkColor = player === 'red' ? '#c62828' : '#f9a825';
    const grad = ctx.createRadialGradient(cx - radius * 0.2, cy - radius * 0.2, radius * 0.1, cx, cy, radius);
    grad.addColorStop(0, highlightColor); grad.addColorStop(0.6, baseColor); grad.addColorStop(1, darkColor);
    ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2); ctx.fillStyle = grad; ctx.fill();
  }

  private getBoardMetrics(W: number, H: number) {
    const cellSize = Math.min((W - 40) / COLS, (H - 140) / (ROWS + 1));
    const boardW = cellSize * COLS; const boardH = cellSize * ROWS;
    const boardX = (W - boardW) / 2; const boardY = (H - boardH) / 2 + 30;
    return { boardX, boardY, cellSize, boardW, boardH };
  }
}
```

---

## Test It

1. **Run:** `npm run dev`
2. **Open:** the Connect Four game
3. **Observe:**
   - Play alternating turns until four discs align
   - The **winning four discs pulse with a glow** effect
   - A panel appears showing "**Red Wins!**" or "**Yellow Wins!**"
   - Fill the entire board without a winner -- "**It's a Draw!**" appears
   - Click to start a new game

---

## Challenges

**Easy:**
- Change the win glow color to white for both players.
- Make the game-over panel larger.

**Medium:**
- Draw a line connecting the four winning cells (not just individual glows).

**Hard:**
- Highlight the winning disc positions with a different, brighter gradient.

---

## What You Learned

- Bidirectional win detection using direction vectors
- Checking horizontal, vertical, and both diagonal directions with the same algorithm
- Creating animated pulsing glow effects with `Math.sin` and `shadowBlur`
- Detecting draws by checking for a full board
- Displaying game-over results in a centered overlay panel

**Next:** Minimax AI opponent -- build an intelligent computer player!
