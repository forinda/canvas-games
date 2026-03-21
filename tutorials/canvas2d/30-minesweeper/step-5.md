# Step 5: Difficulties, Timer & Polish

**Goal:** Add Easy/Medium/Hard difficulty presets, an elapsed timer, a mine counter, and complete HUD overlays.

**Time:** ~15 minutes

---

## What You'll Build

- **Three difficulty levels**: Easy (9x9, 10 mines), Medium (16x16, 40 mines), Hard (30x16, 99 mines)
- **Clickable difficulty buttons** in the HUD and keyboard shortcuts (1/2/3)
- **Elapsed timer** counting seconds since the first click
- **Mine counter** showing `totalMines - flagCount`
- **Start overlay** prompting the player to click
- **Win overlay** showing completion time
- **Game over overlay** with restart prompt
- **Chord reveal** for advanced play

---

## Concepts

- **Difficulty Presets**: A `Record<Difficulty, { cols, rows, mines }>` maps difficulty names to grid configurations
- **Layout Recomputation**: When difficulty changes, the grid size changes, so `computeLayout()` must recalculate cell size and offsets
- **Timer Accumulation**: Track fractional seconds between frames. When the accumulator exceeds 1000ms, increment the timer by 1 second.

---

## Code

### 1. Final Board System

**File:** `src/contexts/canvas2d/games/minesweeper/systems/BoardSystem.ts`

Complete with timer, chord reveal, and win detection.

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
    const safeSet = new Set<string>();
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const nr = safeRow + dr; const nc = safeCol + dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) safeSet.add(`${nr},${nc}`);
      }
    }
    let placed = 0;
    while (placed < totalMines) {
      const r = Math.floor(Math.random() * rows);
      const c = Math.floor(Math.random() * cols);
      if (board[r][c].mine || safeSet.has(`${r},${c}`)) continue;
      board[r][c].mine = true; placed++;
    }
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (board[r][c].mine) continue;
        let count = 0;
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            const nr = r + dr; const nc = c + dc;
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && board[nr][nc].mine) count++;
          }
        }
        board[r][c].adjacentMines = count;
      }
    }
  }

  reveal(state: MinesweeperState, row: number, col: number): boolean {
    const cell = state.board[row][col];
    if (cell.revealed || cell.flagged) return true;
    cell.revealed = true;
    if (cell.mine) { state.status = 'lost'; this.revealAllMines(state); return false; }
    if (cell.adjacentMines === 0) this.floodFill(state, row, col);
    this.checkWin(state);
    return true;
  }

  chordReveal(state: MinesweeperState, row: number, col: number): void {
    const cell = state.board[row][col];
    if (!cell.revealed || cell.adjacentMines === 0) return;
    let flagCount = 0;
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = row + dr; const nc = col + dc;
        if (nr >= 0 && nr < state.rows && nc >= 0 && nc < state.cols) {
          if (state.board[nr][nc].flagged) flagCount++;
        }
      }
    }
    if (flagCount !== cell.adjacentMines) return;
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = row + dr; const nc = col + dc;
        if (nr >= 0 && nr < state.rows && nc >= 0 && nc < state.cols) {
          this.reveal(state, nr, nc);
        }
      }
    }
  }

  toggleFlag(state: MinesweeperState, row: number, col: number): void {
    const cell = state.board[row][col];
    if (cell.revealed) return;
    cell.flagged = !cell.flagged;
    state.flagCount += cell.flagged ? 1 : -1;
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

  private floodFill(state: MinesweeperState, row: number, col: number): void {
    const stack: [number, number][] = [[row, col]];
    while (stack.length > 0) {
      const [r, c] = stack.pop()!;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const nr = r + dr; const nc = c + dc;
          if (nr < 0 || nr >= state.rows || nc < 0 || nc >= state.cols) continue;
          const n = state.board[nr][nc];
          if (n.revealed || n.flagged || n.mine) continue;
          n.revealed = true;
          if (n.adjacentMines === 0) stack.push([nr, nc]);
        }
      }
    }
  }

  private revealAllMines(state: MinesweeperState): void {
    for (let r = 0; r < state.rows; r++)
      for (let c = 0; c < state.cols; c++)
        if (state.board[r][c].mine) state.board[r][c].revealed = true;
  }

  private checkWin(state: MinesweeperState): void {
    for (let r = 0; r < state.rows; r++)
      for (let c = 0; c < state.cols; c++)
        if (!state.board[r][c].mine && !state.board[r][c].revealed) return;
    state.status = 'won';
  }
}
```

---

### 2. Create the HUD Renderer

**File:** `src/contexts/canvas2d/games/minesweeper/renderers/HUDRenderer.ts`

Display timer, mine counter, difficulty buttons, and overlays.

```typescript
import type { MinesweeperState, Difficulty } from '../types';
import { GAME_COLOR } from '../types';

export class HUDRenderer {
  render(ctx: CanvasRenderingContext2D, state: MinesweeperState): void {
    const W = ctx.canvas.width; const H = ctx.canvas.height;
    this.drawTopBar(ctx, state, W);
    this.drawDifficultyButtons(ctx, state, W);

    if (state.status === 'idle') this.drawOverlay(ctx, W, H, 'MINESWEEPER', 'Click any cell to start', GAME_COLOR);
    else if (state.status === 'won') this.drawOverlay(ctx, W, H, 'YOU WIN!', `Time: ${this.formatTime(state.timer)}  |  Click or [R] to restart`, '#4ade80');
    else if (state.status === 'lost') this.drawOverlay(ctx, W, H, 'GAME OVER', 'Click or [R] to restart', '#ef4444');
  }

  private drawTopBar(ctx: CanvasRenderingContext2D, state: MinesweeperState, W: number): void {
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, W, 40);
    ctx.font = 'bold 14px monospace'; ctx.textBaseline = 'middle';

    ctx.fillStyle = '#666'; ctx.textAlign = 'left'; ctx.fillText('< EXIT', 12, 20);

    const remaining = state.totalMines - state.flagCount;
    ctx.fillStyle = '#ef4444'; ctx.textAlign = 'left';
    ctx.fillText(`Mines: ${remaining}`, 100, 20);

    ctx.fillStyle = GAME_COLOR; ctx.textAlign = 'center';
    ctx.fillText(`Time: ${this.formatTime(state.timer)}`, W / 2, 20);

    ctx.fillStyle = '#888'; ctx.textAlign = 'left';
    ctx.fillText(state.difficulty.toUpperCase(), 220, 20);
  }

  private drawDifficultyButtons(ctx: CanvasRenderingContext2D, state: MinesweeperState, W: number): void {
    const difficulties: Difficulty[] = ['easy', 'medium', 'hard'];
    const btnW = 70; const btnH = 24; const gap = 8; const btnY = 8;
    const totalW = difficulties.length * btnW + (difficulties.length - 1) * gap;
    let x = W - totalW - 12;

    for (const diff of difficulties) {
      const isActive = diff === state.difficulty;
      ctx.fillStyle = isActive ? GAME_COLOR : 'rgba(255,255,255,0.1)';
      ctx.beginPath(); ctx.roundRect(x, btnY, btnW, btnH, 4); ctx.fill();
      ctx.font = 'bold 11px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = isActive ? '#1a1a2e' : '#888';
      ctx.fillText(diff.toUpperCase(), x + btnW / 2, btnY + btnH / 2);
      x += btnW + gap;
    }
  }

  private drawOverlay(ctx: CanvasRenderingContext2D, W: number, H: number, title: string, sub: string, color: string): void {
    ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `bold ${Math.min(64, W * 0.08)}px monospace`;
    ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 20;
    ctx.fillText(title, W / 2, H * 0.38); ctx.shadowBlur = 0;
    ctx.font = `${Math.min(18, W * 0.025)}px monospace`; ctx.fillStyle = '#aaa';
    ctx.fillText(sub, W / 2, H * 0.50);
    ctx.font = `${Math.min(14, W * 0.02)}px monospace`; ctx.fillStyle = '#666';
    ctx.fillText('[1] Easy  [2] Medium  [3] Hard  [R] Restart  [ESC] Exit', W / 2, H * 0.58);
  }

  private formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60); const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
}
```

---

### 3. Final Input System

**File:** `src/contexts/canvas2d/games/minesweeper/systems/InputSystem.ts`

Add difficulty switching, chord reveal, and restart.

```typescript
import type { MinesweeperState, Difficulty } from '../types';
import type { BoardSystem } from './BoardSystem';

export class InputSystem {
  private state: MinesweeperState;
  private canvas: HTMLCanvasElement;
  private boardSystem: BoardSystem;
  private onExit: () => void;
  private onReset: (difficulty?: Difficulty) => void;

  private keyHandler: (e: KeyboardEvent) => void;
  private clickHandler: (e: MouseEvent) => void;
  private contextHandler: (e: MouseEvent) => void;

  constructor(state: MinesweeperState, canvas: HTMLCanvasElement, boardSystem: BoardSystem,
    onExit: () => void, onReset: (difficulty?: Difficulty) => void) {
    this.state = state; this.canvas = canvas; this.boardSystem = boardSystem;
    this.onExit = onExit; this.onReset = onReset;
    this.keyHandler = (e) => this.handleKey(e);
    this.clickHandler = (e) => this.handleClick(e);
    this.contextHandler = (e) => this.handleRightClick(e);
  }

  attach(): void {
    window.addEventListener('keydown', this.keyHandler);
    this.canvas.addEventListener('click', this.clickHandler);
    this.canvas.addEventListener('contextmenu', this.contextHandler);
  }

  detach(): void {
    window.removeEventListener('keydown', this.keyHandler);
    this.canvas.removeEventListener('click', this.clickHandler);
    this.canvas.removeEventListener('contextmenu', this.contextHandler);
  }

  private handleKey(e: KeyboardEvent): void {
    if (e.key === 'Escape') { this.onExit(); return; }
    if (e.key === 'r' || e.key === 'R') { this.onReset(); return; }
    if (e.key === '1') { this.onReset('easy'); return; }
    if (e.key === '2') { this.onReset('medium'); return; }
    if (e.key === '3') { this.onReset('hard'); return; }
  }

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

    // Check difficulty buttons
    const diffBtn = this.getDifficultyButton(x, y);
    if (diffBtn) { this.onReset(diffBtn); return; }

    if (s.status === 'won' || s.status === 'lost') { this.onReset(); return; }

    const cell = this.getCellFromPos(x, y);
    if (!cell) return;

    if (!s.firstClick) {
      s.firstClick = true; s.status = 'playing';
      this.boardSystem.placeMines(s, cell.row, cell.col);
    }

    const boardCell = s.board[cell.row][cell.col];
    if (boardCell.revealed && boardCell.adjacentMines > 0) {
      this.boardSystem.chordReveal(s, cell.row, cell.col);
    } else {
      this.boardSystem.reveal(s, cell.row, cell.col);
    }
  }

  private handleRightClick(e: MouseEvent): void {
    e.preventDefault();
    const s = this.state;
    if (s.status === 'won' || s.status === 'lost') return;
    const { x, y } = this.getCanvasPos(e);
    const cell = this.getCellFromPos(x, y);
    if (!cell) return;
    this.boardSystem.toggleFlag(s, cell.row, cell.col);
  }

  private getDifficultyButton(x: number, y: number): Difficulty | null {
    const W = this.canvas.width;
    const btnY = 8; const btnH = 24; const btnW = 70; const gap = 8;
    const difficulties: Difficulty[] = ['easy', 'medium', 'hard'];
    const totalW = difficulties.length * btnW + (difficulties.length - 1) * gap;
    let startX = W - totalW - 12;
    for (const diff of difficulties) {
      if (x >= startX && x <= startX + btnW && y >= btnY && y <= btnY + btnH) return diff;
      startX += btnW + gap;
    }
    return null;
  }
}
```

---

### 4. Final Engine

**File:** `src/contexts/canvas2d/games/minesweeper/MinesweeperEngine.ts`

```typescript
import type { MinesweeperState, Difficulty } from './types';
import { DIFFICULTY_PRESETS } from './types';
import { BoardSystem } from './systems/BoardSystem';
import { InputSystem } from './systems/InputSystem';
import { BoardRenderer } from './renderers/BoardRenderer';
import { HUDRenderer } from './renderers/HUDRenderer';

export class MinesweeperEngine {
  private ctx: CanvasRenderingContext2D;
  private state: MinesweeperState;
  private running = false;
  private rafId = 0;
  private lastTime = 0;
  private boardSystem: BoardSystem;
  private inputSystem: InputSystem;
  private boardRenderer: BoardRenderer;
  private hudRenderer: HUDRenderer;
  private resizeHandler: () => void;

  constructor(canvas: HTMLCanvasElement, onExit: () => void) {
    this.ctx = canvas.getContext('2d')!;
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;

    const preset = DIFFICULTY_PRESETS['easy'];
    this.state = {
      board: [], cols: preset.cols, rows: preset.rows,
      difficulty: 'easy', totalMines: preset.mines,
      flagCount: 0, status: 'idle', timer: 0, firstClick: false,
      offsetX: 0, offsetY: 0, cellSize: 0,
    };

    this.boardSystem = new BoardSystem();
    this.boardRenderer = new BoardRenderer();
    this.hudRenderer = new HUDRenderer();
    this.inputSystem = new InputSystem(this.state, canvas, this.boardSystem, onExit,
      (diff?: Difficulty) => this.reset(diff));

    this.boardSystem.initBoard(this.state);
    this.computeLayout();

    this.resizeHandler = () => {
      canvas.width = window.innerWidth; canvas.height = window.innerHeight;
      this.computeLayout();
    };
    this.inputSystem.attach(); window.addEventListener('resize', this.resizeHandler);
  }

  start(): void { this.running = true; this.lastTime = performance.now(); this.loop(); }
  destroy(): void { this.running = false; cancelAnimationFrame(this.rafId); this.inputSystem.detach(); window.removeEventListener('resize', this.resizeHandler); }

  private loop(): void {
    if (!this.running) return;
    const now = performance.now(); const dt = now - this.lastTime; this.lastTime = now;
    this.boardSystem.update(this.state, dt);
    this.boardRenderer.render(this.ctx, this.state);
    this.hudRenderer.render(this.ctx, this.state);
    this.rafId = requestAnimationFrame(() => this.loop());
  }

  private reset(difficulty?: Difficulty): void {
    if (difficulty && difficulty !== this.state.difficulty) this.state.difficulty = difficulty;
    this.boardSystem.initBoard(this.state);
    this.boardSystem.resetTimer();
    this.computeLayout();
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

## Test It

1. **Run:** `npm run dev`
2. **Open:** the Minesweeper game
3. **Observe:**
   - **Start screen** shows "MINESWEEPER" with instructions
   - Click to start -- the timer begins counting
   - The **mine counter** shows remaining unflagged mines
   - The **timer** shows elapsed time in MM:SS format
   - Click the **EASY/MEDIUM/HARD** buttons or press **1/2/3** to switch difficulty
   - Win -- "**YOU WIN!**" shows your completion time
   - Lose -- "**GAME OVER**" with restart prompt
   - **Chord reveal**: click a revealed number with the right count of adjacent flags to auto-reveal remaining neighbors
   - Press **R** to restart, **ESC** to exit

---

## Challenges

**Easy:**
- Display the total number of mines on the board somewhere in the HUD.
- Change the win overlay color to gold.

**Medium:**
- Save best times per difficulty in localStorage and display them.
- Add a smiley face that changes expression on win/loss (classic Minesweeper style).

**Hard:**
- Implement a "custom" difficulty where the player can set rows, cols, and mines.
- Add an animation that reveals mines one by one on game over instead of all at once.

---

## What You Learned

- Implementing multiple difficulty presets with different grid sizes
- Building clickable difficulty buttons with hit-test detection
- Running an elapsed timer using frame-delta accumulation
- Displaying a mine counter (total mines minus flag count)
- Chord reveal for advanced gameplay
- Complete game overlays for idle, win, and loss states
- Layout recomputation when grid dimensions change

**Congratulations!** You have built a complete Minesweeper game with 3D cells, mine placement with first-click safety, flood fill, flagging, win/loss detection, three difficulty levels, a timer, and a mine counter.

This is the final game in the series. You have now built 30 complete HTML5 Canvas games from scratch!
