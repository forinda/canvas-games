# Step 4: Minimax AI

**Goal:** Build an AI opponent using the Minimax algorithm with alpha-beta pruning.

**Time:** ~15 minutes

---

## What You'll Build

- **Minimax algorithm** that recursively evaluates all possible future moves
- **Alpha-beta pruning** to skip branches that cannot affect the final decision
- **Board evaluation heuristic** that scores windows of 4 cells
- **Center column preference** for strategic advantage
- **Think delay** so the AI does not move instantly (feels more natural)

---

## Concepts

- **Minimax**: A decision-making algorithm for two-player games. The "maximizing" player (AI) picks moves that maximize the score; the "minimizing" player (human) picks moves that minimize it.
- **Alpha-Beta Pruning**: Tracks the best guaranteed scores for each player (`alpha` for max, `beta` for min). When `beta <= alpha`, the remaining branches cannot improve the result, so we skip them. This dramatically reduces computation.
- **Board Evaluation**: Score every window of 4 consecutive cells. 3 AI pieces + 1 empty = high score. 3 human pieces + 1 empty = high penalty. Mixed windows = 0.
- **Center Preference**: The center column offers the most connection opportunities, so AI discs in column 3 get a small bonus.

---

## Code

### 1. Create the AI System

**File:** `src/contexts/canvas2d/games/connect-four/systems/AISystem.ts`

```typescript
import type { ConnectFourState, Cell, Player } from '../types';
import { COLS, ROWS } from '../types';

const MAX_DEPTH = 6;
const THINK_DELAY = 500;
const SCORE_4 = 100000;
const SCORE_3 = 100;
const SCORE_2 = 10;
const SCORE_CENTER = 3;

export class AISystem {
  private pendingCol: number | null = null;
  private thinkTimer = 0;

  update(state: ConnectFourState, dt: number): void {
    if (state.mode !== 'ai') return;
    if (state.gameOver || state.currentPlayer !== 'yellow') return;
    if (state.activeDrop !== null) return;

    if (this.pendingCol === null) {
      state.aiThinking = true;
      this.pendingCol = this.findBestMove(state.board);
      this.thinkTimer = 0;
    }

    this.thinkTimer += dt;
    if (this.thinkTimer >= THINK_DELAY && this.pendingCol !== null) {
      state.aiThinking = false;
      state.dropQueue.push({ col: this.pendingCol, player: 'yellow' });
      this.pendingCol = null;
      this.thinkTimer = 0;
    }
  }

  reset(): void {
    this.pendingCol = null;
    this.thinkTimer = 0;
  }

  private findBestMove(board: Cell[][]): number {
    let bestScore = -Infinity;
    let bestCol = 3;
    const colOrder = [3, 2, 4, 1, 5, 0, 6]; // center-first for better pruning

    for (const col of colOrder) {
      const row = this.getLowestEmptyRow(board, col);
      if (row < 0) continue;

      board[row][col] = 'yellow';
      const score = this.minimax(board, MAX_DEPTH - 1, false, -Infinity, Infinity);
      board[row][col] = null;

      if (score > bestScore) {
        bestScore = score;
        bestCol = col;
      }
    }
    return bestCol;
  }

  private minimax(board: Cell[][], depth: number, isMaximizing: boolean, alpha: number, beta: number): number {
    if (this.hasWon(board, 'yellow')) return SCORE_4 + depth;
    if (this.hasWon(board, 'red')) return -(SCORE_4 + depth);
    if (this.isFull(board)) return 0;
    if (depth === 0) return this.evaluateBoard(board);

    const colOrder = [3, 2, 4, 1, 5, 0, 6];

    if (isMaximizing) {
      let maxEval = -Infinity;
      for (const col of colOrder) {
        const row = this.getLowestEmptyRow(board, col);
        if (row < 0) continue;
        board[row][col] = 'yellow';
        const evalScore = this.minimax(board, depth - 1, false, alpha, beta);
        board[row][col] = null;
        maxEval = Math.max(maxEval, evalScore);
        alpha = Math.max(alpha, evalScore);
        if (beta <= alpha) break; // Beta cutoff
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (const col of colOrder) {
        const row = this.getLowestEmptyRow(board, col);
        if (row < 0) continue;
        board[row][col] = 'red';
        const evalScore = this.minimax(board, depth - 1, true, alpha, beta);
        board[row][col] = null;
        minEval = Math.min(minEval, evalScore);
        beta = Math.min(beta, evalScore);
        if (beta <= alpha) break; // Alpha cutoff
      }
      return minEval;
    }
  }

  private evaluateBoard(board: Cell[][]): number {
    let score = 0;

    // Center column preference
    for (let r = 0; r < ROWS; r++) {
      if (board[r][3] === 'yellow') score += SCORE_CENTER;
      else if (board[r][3] === 'red') score -= SCORE_CENTER;
    }

    // Evaluate all windows of 4
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c <= COLS - 4; c++)
        score += this.evaluateWindow(board[r][c], board[r][c+1], board[r][c+2], board[r][c+3]);

    for (let c = 0; c < COLS; c++)
      for (let r = 0; r <= ROWS - 4; r++)
        score += this.evaluateWindow(board[r][c], board[r+1][c], board[r+2][c], board[r+3][c]);

    for (let r = 0; r <= ROWS - 4; r++)
      for (let c = 0; c <= COLS - 4; c++)
        score += this.evaluateWindow(board[r][c], board[r+1][c+1], board[r+2][c+2], board[r+3][c+3]);

    for (let r = 0; r <= ROWS - 4; r++)
      for (let c = 3; c < COLS; c++)
        score += this.evaluateWindow(board[r][c], board[r+1][c-1], board[r+2][c-2], board[r+3][c-3]);

    return score;
  }

  private evaluateWindow(a: Cell, b: Cell, c: Cell, d: Cell): number {
    const cells = [a, b, c, d];
    const yellow = cells.filter(x => x === 'yellow').length;
    const red = cells.filter(x => x === 'red').length;
    if (yellow > 0 && red > 0) return 0;
    if (yellow === 4) return SCORE_4;
    if (yellow === 3) return SCORE_3;
    if (yellow === 2) return SCORE_2;
    if (red === 4) return -SCORE_4;
    if (red === 3) return -SCORE_3;
    if (red === 2) return -SCORE_2;
    return 0;
  }

  private hasWon(board: Cell[][], player: Player): boolean {
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c <= COLS - 4; c++)
        if (board[r][c] === player && board[r][c+1] === player && board[r][c+2] === player && board[r][c+3] === player) return true;
    for (let c = 0; c < COLS; c++)
      for (let r = 0; r <= ROWS - 4; r++)
        if (board[r][c] === player && board[r+1][c] === player && board[r+2][c] === player && board[r+3][c] === player) return true;
    for (let r = 0; r <= ROWS - 4; r++)
      for (let c = 0; c <= COLS - 4; c++)
        if (board[r][c] === player && board[r+1][c+1] === player && board[r+2][c+2] === player && board[r+3][c+3] === player) return true;
    for (let r = 0; r <= ROWS - 4; r++)
      for (let c = 3; c < COLS; c++)
        if (board[r][c] === player && board[r+1][c-1] === player && board[r+2][c-2] === player && board[r+3][c-3] === player) return true;
    return false;
  }

  private isFull(board: Cell[][]): boolean {
    for (let c = 0; c < COLS; c++) if (board[0][c] === null) return false;
    return true;
  }

  private getLowestEmptyRow(board: Cell[][], col: number): number {
    for (let r = ROWS - 1; r >= 0; r--) if (board[r][col] === null) return r;
    return -1;
  }
}
```

**What's happening:**
- `findBestMove` tries each column (center-first) and picks the one with the highest minimax score.
- The minimax recursion alternates between maximizing (AI/yellow) and minimizing (human/red) players.
- Alpha-beta pruning: when the minimizer already has a better option (`beta <= alpha`), we skip remaining branches. This turns an O(7^6) search into something much faster.
- `evaluateBoard` scores every possible window of 4 cells in all 4 directions. Three-in-a-row with an open space is worth 100 points. This guides the AI toward winning positions.
- `THINK_DELAY` of 500ms prevents the AI from moving instantly, which would feel jarring.

---

### 2. Update the Engine

**File:** `src/contexts/canvas2d/games/connect-four/ConnectFourEngine.ts`

Add the AI system to the update loop.

```typescript
import type { ConnectFourState, GameMode } from './types';
import { COLS, ROWS } from './types';
import { InputSystem } from './systems/InputSystem';
import { BoardSystem } from './systems/BoardSystem';
import { AISystem } from './systems/AISystem';
import { BoardRenderer } from './renderers/BoardRenderer';

export class ConnectFourEngine {
  private ctx: CanvasRenderingContext2D;
  private state: ConnectFourState;
  private running = false;
  private rafId = 0;
  private lastTime = 0;

  private inputSystem: InputSystem;
  private boardSystem: BoardSystem;
  private aiSystem: AISystem;
  private boardRenderer: BoardRenderer;
  private resizeHandler: () => void;

  constructor(canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    this.state = {
      board: this.createEmptyBoard(),
      currentPlayer: 'red', mode: 'ai',
      winner: null, winLine: null, isDraw: false, gameOver: false, paused: false,
      scoreRed: 0, scoreYellow: 0, draws: 0,
      canvasWidth: canvas.width, canvasHeight: canvas.height,
      aiThinking: false, showModeSelect: false, hoverCol: -1,
      animationTime: 0, activeDrop: null, dropQueue: [],
    };

    this.boardSystem = new BoardSystem();
    this.aiSystem = new AISystem();
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
    this.aiSystem.update(this.state, dt);

    // Process queued AI drops
    if (this.state.activeDrop === null && this.state.dropQueue.length > 0 && !this.state.gameOver) {
      const next = this.state.dropQueue.shift()!;
      this.boardSystem.dropDisc(this.state, next.col, next.player);
    }

    this.boardRenderer.render(this.ctx, this.state);
    this.rafId = requestAnimationFrame(() => this.loop());
  }

  private onColumnClick(col: number): void {
    if (this.state.gameOver || this.state.aiThinking || this.state.activeDrop !== null) return;
    if (this.state.mode === 'ai' && this.state.currentPlayer === 'yellow') return;
    this.boardSystem.dropDisc(this.state, col, this.state.currentPlayer);
  }

  private createEmptyBoard(): (null)[][] {
    const board: (null)[][] = [];
    for (let r = 0; r < ROWS; r++) { const row: null[] = []; for (let c = 0; c < COLS; c++) row.push(null); board.push(row); }
    return board;
  }
}
```

---

## Test It

1. **Run:** `npm run dev`
2. **Open:** the Connect Four game
3. **Observe:**
   - You play as **Red** (first turn)
   - After your drop, the AI **thinks for ~0.5 seconds** then drops its yellow disc
   - The AI **blocks your winning moves** and **seeks its own connections**
   - The AI **prefers the center column** when no immediate threat exists
   - Try to win -- the AI is quite strong at depth 6!

---

## Challenges

**Easy:**
- Change `MAX_DEPTH` to 4 for an easier AI, or 8 for a harder one.
- Change `THINK_DELAY` to 200 for faster AI responses.

**Medium:**
- Add a "thinking..." indicator that shows while the AI is computing.

**Hard:**
- Implement difficulty levels by varying `MAX_DEPTH` (Easy=2, Medium=4, Hard=6).

---

## What You Learned

- The Minimax algorithm for adversarial game tree search
- Alpha-beta pruning to dramatically reduce the search space
- Board evaluation heuristics using sliding windows of 4 cells
- Center-column preference as a strategic bonus
- Implementing a think delay for natural-feeling AI responses

**Next:** Game modes, score tracking, hover preview, and full polish!
