# Step 5: Score Tracking & Polish

**Goal:** Add score tracking, mode selection, keyboard controls, and final polish.

**Time:** ~15 minutes

---

## What You'll Build

A complete Tic-Tac-Toe game with:
- **Score tracking**: Track wins for X, O, and draws
- **Mode selection**: Choose "vs AI" or "2 Players"
- **Keyboard shortcuts**: R (restart), M (mode select), ESC (exit)
- **Polish**: Smooth UI, localStorage persistence, rounded edges

---

## Concepts

- **Score Persistence**: Save scores to localStorage
- **Mode Selection Screen**: Button-based UI
- **Complete Game Loop**: Start → Play → End → Restart

---

## Code

### 1. Final Types Update

**File:** `src/contexts/canvas2d/games/tic-tac-toe/types.ts`

```typescript
export interface TicTacToeState {
  board: Cell[];
  currentPlayer: Player;
  mode: GameMode;
  gameOver: boolean;
  winner: Player | null;
  winLine: WinLine | null;
  isDraw: boolean;
  scoreX: number; // ← NEW
  scoreO: number; // ← NEW
  draws: number; // ← NEW
  canvasWidth: number;
  canvasHeight: number;
  cellAnimations: CellAnimation[];
  aiThinking: boolean;
  showModeSelect: boolean; // ← NEW: Show mode selection screen
}

export const SCORE_KEY = 'tictactoe_scores';
```

---

### 2. Add Score Tracking to BoardSystem

**File:** `src/contexts/canvas2d/games/tic-tac-toe/systems/BoardSystem.ts`

```typescript
export class BoardSystem implements Updatable<TicTacToeState> {
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
      this.updateScore(state); // ← Update score
      return true;
    }

    // Check for draw
    if (this.checkDraw(state.board)) {
      state.isDraw = true;
      state.gameOver = true;
      state.draws++; // ← Increment draws
      return true;
    }

    // Switch player
    state.currentPlayer = state.currentPlayer === 'X' ? 'O' : 'X';
    return true;
  }

  private updateScore(state: TicTacToeState): void {
    if (state.winner === 'X') {
      state.scoreX++;
    } else if (state.winner === 'O') {
      state.scoreO++;
    }
  }

  /** Reset board for a new game */
  resetBoard(state: TicTacToeState): void {
    state.board = Array(TOTAL_CELLS).fill(null);
    state.currentPlayer = 'X';
    state.gameOver = false;
    state.winner = null;
    state.winLine = null;
    state.isDraw = false;
    state.cellAnimations = [];
    state.aiThinking = false;
  }

  // ... existing methods ...
}
```

---

### 3. Add Complete HUD with Scoreboard

**File:** `src/contexts/canvas2d/games/tic-tac-toe/renderers/HUDRenderer.ts`

```typescript
export class HUDRenderer {
  render(ctx: CanvasRenderingContext2D, state: TicTacToeState): void {
    const W = state.canvasWidth;
    const H = state.canvasHeight;

    // Mode selection screen
    if (state.showModeSelect) {
      this.renderModeSelection(ctx, state);
      return;
    }

    // Scoreboard (top-right)
    this.renderScoreboard(ctx, state);

    // Current turn indicator (top-center)
    if (!state.gameOver) {
      ctx.fillStyle = 'white';
      ctx.font = '24px sans-serif';
      ctx.textAlign = 'center';

      if (state.aiThinking) {
        ctx.fillText('AI is thinking...', W / 2, 40);
      } else {
        ctx.fillText(`Turn: ${state.currentPlayer}`, W / 2, 40);
      }
    }

    // Game mode indicator (top-left)
    ctx.fillStyle = '#888';
    ctx.font = '18px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(
      state.mode === 'ai' ? 'vs AI' : '2 Players',
      20,
      30
    );

    // Controls hint (bottom)
    ctx.fillStyle = '#666';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('[R] Restart  [M] Mode  [ESC] Exit', W / 2, H - 20);

    // Game over overlay
    if (state.gameOver) {
      this.renderGameOver(ctx, state);
    }
  }

  private renderScoreboard(ctx: CanvasRenderingContext2D, state: TicTacToeState): void {
    const W = state.canvasWidth;

    ctx.textAlign = 'right';
    ctx.font = '18px sans-serif';

    ctx.fillStyle = '#ef5350';
    ctx.fillText(`X: ${state.scoreX}`, W - 20, 30);

    ctx.fillStyle = '#888';
    ctx.fillText(`Draws: ${state.draws}`, W - 20, 55);

    ctx.fillStyle = '#42a5f5';
    ctx.fillText(`O: ${state.scoreO}`, W - 20, 80);
  }

  private renderModeSelection(ctx: CanvasRenderingContext2D, state: TicTacToeState): void {
    const W = state.canvasWidth;
    const H = state.canvasHeight;

    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
    ctx.fillRect(0, 0, W, H);

    // Title
    ctx.fillStyle = 'white';
    ctx.font = 'bold 48px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Tic-Tac-Toe', W / 2, H / 2 - 100);

    // Buttons
    const buttonWidth = 200;
    const buttonHeight = 60;
    const spacing = 20;

    // vs AI button
    const aiButtonX = W / 2 - buttonWidth / 2;
    const aiButtonY = H / 2 - buttonHeight / 2 - spacing / 2;

    ctx.fillStyle = '#ef5350';
    ctx.fillRect(aiButtonX, aiButtonY, buttonWidth, buttonHeight);
    ctx.fillStyle = 'white';
    ctx.font = '24px sans-serif';
    ctx.fillText('vs AI', W / 2, aiButtonY + buttonHeight / 2);

    // 2 Players button
    const twoPlayerButtonY = H / 2 + spacing / 2;

    ctx.fillStyle = '#42a5f5';
    ctx.fillRect(aiButtonX, twoPlayerButtonY, buttonWidth, buttonHeight);
    ctx.fillStyle = 'white';
    ctx.fillText('2 Players', W / 2, twoPlayerButtonY + buttonHeight / 2);
  }

  private renderGameOver(ctx: CanvasRenderingContext2D, state: TicTacToeState): void {
    const W = state.canvasWidth;
    const H = state.canvasHeight;

    // Semi-transparent overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, W, H);

    // Game over message
    ctx.font = 'bold 48px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (state.isDraw) {
      ctx.fillStyle = '#ffca28';
      ctx.fillText("It's a Draw!", W / 2, H / 2 - 40);
    } else if (state.winner) {
      const color = state.winner === 'X' ? '#ef5350' : '#42a5f5';
      const playerName = state.mode === 'ai' && state.winner === 'O' ? 'AI' : state.winner;
      ctx.fillStyle = color;
      ctx.fillText(`${playerName} Wins!`, W / 2, H / 2 - 40);
    }

    // Restart hint
    ctx.fillStyle = '#aaa';
    ctx.font = '20px sans-serif';
    ctx.fillText('Press [R] to restart or [M] for menu', W / 2, H / 2 + 20);
  }
}
```

---

### 4. Add Keyboard Controls

**File:** `src/contexts/canvas2d/games/tic-tac-toe/systems/InputSystem.ts`

```typescript
export class InputSystem {
  private clickHandler: (e: MouseEvent) => void;
  private keyHandler: (e: KeyboardEvent) => void;

  constructor(
    private state: TicTacToeState,
    private canvas: HTMLCanvasElement,
    private boardSystem: BoardSystem,
    private onExit: () => void,
    private onReset: () => void,
  ) {
    this.clickHandler = (e: MouseEvent) => this.onClick(e);
    this.keyHandler = (e: KeyboardEvent) => this.onKey(e);
  }

  attach(): void {
    this.canvas.addEventListener('click', this.clickHandler);
    window.addEventListener('keydown', this.keyHandler);
  }

  detach(): void {
    this.canvas.removeEventListener('click', this.clickHandler);
    window.removeEventListener('keydown', this.keyHandler);
  }

  private onKey(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      this.onExit();
    } else if (e.key === 'r' || e.key === 'R') {
      this.onReset();
    } else if (e.key === 'm' || e.key === 'M') {
      this.state.showModeSelect = true;
    }
  }

  private onClick(e: MouseEvent): void {
    // Handle mode selection
    if (this.state.showModeSelect) {
      this.handleModeSelection(e);
      return;
    }

    // Handle cell click
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const index = this.getCellIndex(x, y);
    if (index !== null) {
      this.boardSystem.placeMark(this.state, index);
    }
  }

  private handleModeSelection(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const W = this.state.canvasWidth;
    const H = this.state.canvasHeight;
    const buttonWidth = 200;
    const buttonHeight = 60;
    const spacing = 20;

    const buttonX = W / 2 - buttonWidth / 2;
    const aiButtonY = H / 2 - buttonHeight / 2 - spacing / 2;
    const twoPlayerButtonY = H / 2 + spacing / 2;

    // Check AI button
    if (
      x >= buttonX && x <= buttonX + buttonWidth &&
      y >= aiButtonY && y <= aiButtonY + buttonHeight
    ) {
      this.state.mode = 'ai';
      this.state.showModeSelect = false;
      this.boardSystem.resetBoard(this.state);
    }

    // Check 2 Players button
    if (
      x >= buttonX && x <= buttonX + buttonWidth &&
      y >= twoPlayerButtonY && y <= twoPlayerButtonY + buttonHeight
    ) {
      this.state.mode = '2player';
      this.state.showModeSelect = false;
      this.boardSystem.resetBoard(this.state);
    }
  }

  // ... existing getCellIndex() method ...
}
```

---

### 5. Complete Engine Integration

**File:** `src/contexts/canvas2d/games/tic-tac-toe/TicTacToeEngine.ts`

```typescript
export class TicTacToeEngine {
  constructor(canvas: HTMLCanvasElement, onExit: () => void) {
    // ... existing setup ...

    // Load scores from localStorage
    let savedScores = { scoreX: 0, scoreO: 0, draws: 0 };
    try {
      const saved = localStorage.getItem(SCORE_KEY);
      if (saved) savedScores = JSON.parse(saved);
    } catch (e) {
      console.warn('Could not load scores');
    }

    this.state = {
      board: Array(TOTAL_CELLS).fill(null),
      currentPlayer: 'X',
      mode: 'ai',
      gameOver: false,
      winner: null,
      winLine: null,
      isDraw: false,
      scoreX: savedScores.scoreX,
      scoreO: savedScores.scoreO,
      draws: savedScores.draws,
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
      cellAnimations: [],
      aiThinking: false,
      showModeSelect: true, // ← Start with mode selection
    };

    this.inputSystem = new InputSystem(
      this.state,
      canvas,
      this.boardSystem,
      onExit,
      () => this.reset(),
    );

    // ... rest of constructor ...
  }

  private reset(): void {
    this.boardSystem.resetBoard(this.state);
  }

  destroy(): void {
    // Save scores on exit
    try {
      localStorage.setItem(SCORE_KEY, JSON.stringify({
        scoreX: this.state.scoreX,
        scoreO: this.state.scoreO,
        draws: this.state.draws,
      }));
    } catch (e) {
      console.warn('Could not save scores');
    }

    this.running = false;
    cancelAnimationFrame(this.rafId);
    this.inputSystem.detach();
  }

  // ... existing loop and render methods ...
}
```

---

## Test It

1. **Run:** `npm run dev`
2. **Mode Selection**: Click "vs AI" or "2 Players"
3. **Play games**: Win/lose/draw updates the scoreboard
4. **Keyboard shortcuts**:
   - Press **R** to restart
   - Press **M** to return to mode selection
   - Press **ESC** to exit
5. **Refresh page**: Scores persist across sessions!

---

## What You Learned

✅ Track and display game scores  
✅ Create button-based mode selection UI  
✅ Implement keyboard shortcuts  
✅ Persist data with localStorage  
✅ Build a complete game loop from start to finish

---

## Complete!

You've built a fully functional **Tic-Tac-Toe** game with an unbeatable AI! 🎉

**Source Code:** [`src/contexts/canvas2d/games/tic-tac-toe/`](../../src/contexts/canvas2d/games/tic-tac-toe/)

---

## Next Tutorial

→ [Hangman](../05-hangman/README.md) — Learn text rendering, keyboard input, and progressive drawing

