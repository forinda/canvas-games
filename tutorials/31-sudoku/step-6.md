# Step 6: Difficulty Selector, Timer & Polish

**Goal:** Add clickable difficulty buttons, an elapsed timer, a number pad UI, notes indicator, and best-time tracking.

**Time:** ~15 minutes

---

## What You'll Build

- **Difficulty buttons** (Easy / Medium / Hard) at the top of the screen that generate a new puzzle
- **Timer** counting up in MM:SS format, paused when the puzzle is won
- **Number pad** -- clickable 1-9 buttons below the board with completion tracking
- **Notes mode indicator** visible in the top bar
- **Clickable Notes toggle button** next to the number pad
- **Best time tracking** per difficulty using localStorage
- **Controls hint** bar showing available keyboard shortcuts
- Complete **HUDRenderer.ts** with all UI elements

---

## Concepts

- **HUD Rendering**: The HUD (heads-up display) is drawn in two areas: a top bar for difficulty/timer/notes-indicator, and a bottom bar for the number pad and controls. Both are rendered each frame on top of the board.
- **Number Completion Count**: For each digit 1-9, count how many are placed on the board. When a digit reaches 9 placements, it is "completed" and the number pad button dims. This helps players track which numbers are finished.
- **localStorage Persistence**: We save the best completion time per difficulty. On win, compare the elapsed time with the stored best and update if faster.

---

## Code

### 1. Create the HUD Renderer

**File:** `src/games/sudoku/renderers/HUDRenderer.ts`

This file draws everything outside the board: buttons, timer, number pad, and the win overlay.

```typescript
import {
  GRID,
  GAME_COLOR,
  type SudokuState,
  type Difficulty,
  DIFFICULTY_PRESETS,
} from '../types';

export class HUDRenderer {
  render(ctx: CanvasRenderingContext2D, state: SudokuState): void {
    const W = ctx.canvas.width;
    this.renderTopBar(ctx, state, W);
    this.renderNumberPad(ctx, state, W);
    this.renderOverlays(ctx, state, W);
  }

  private renderTopBar(ctx: CanvasRenderingContext2D, state: SudokuState, W: number): void {
    // Difficulty buttons
    const btnY = 8;
    const btnH = 28;
    const difficulties: Difficulty[] = ['easy', 'medium', 'hard'];
    let btnX = 10;

    for (const diff of difficulties) {
      const label = DIFFICULTY_PRESETS[diff].label;
      const btnW = label.length * 9 + 16;
      const isActive = state.difficulty === diff;

      // Button background
      ctx.fillStyle = isActive ? GAME_COLOR : '#2a2a3e';
      ctx.beginPath();
      ctx.roundRect(btnX, btnY, btnW, btnH, 6);
      ctx.fill();

      // Button border (inactive only)
      if (!isActive) {
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(btnX, btnY, btnW, btnH, 6);
        ctx.stroke();
      }

      // Button label
      ctx.fillStyle = isActive ? '#fff' : '#aaa';
      ctx.font = '13px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, btnX + btnW / 2, btnY + btnH / 2);

      btnX += btnW + 8;
    }

    // Timer (right side)
    const minutes = Math.floor(state.timer / 60);
    const seconds = state.timer % 60;
    const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

    ctx.fillStyle = '#ccc';
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(timeStr, W - 15, btnY + btnH / 2);

    // Notes mode indicator
    if (state.notesMode) {
      ctx.fillStyle = GAME_COLOR;
      ctx.font = '13px monospace';
      ctx.textAlign = 'right';
      ctx.fillText('NOTES ON', W - 80, btnY + btnH / 2);
    }
  }

  private renderNumberPad(ctx: CanvasRenderingContext2D, state: SudokuState, W: number): void {
    const { offsetY, cellSize } = state;
    const padY = offsetY + GRID * cellSize + 15;
    const padBtnSize = Math.min(cellSize, 40);
    const gap = 4;
    const padTotalW = 9 * padBtnSize + 8 * gap;
    const padStartX = (W - padTotalW) / 2;

    for (let i = 0; i < 9; i++) {
      const num = i + 1;
      const bx = padStartX + i * (padBtnSize + gap);

      // Count how many of this number are placed on the board
      let count = 0;
      for (let r = 0; r < GRID; r++) {
        for (let c = 0; c < GRID; c++) {
          if (state.board[r][c].value === num) count++;
        }
      }
      const completed = count >= 9;

      // Button background
      ctx.fillStyle = completed ? '#1a1a2e' : '#2a2a3e';
      ctx.beginPath();
      ctx.roundRect(bx, padY, padBtnSize, padBtnSize, 6);
      ctx.fill();

      // Button border
      ctx.strokeStyle = completed ? '#333' : GAME_COLOR;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(bx, padY, padBtnSize, padBtnSize, 6);
      ctx.stroke();

      // Button label
      ctx.fillStyle = completed ? '#555' : '#ddd';
      ctx.font = `bold ${Math.max(12, padBtnSize * 0.45)}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(num), bx + padBtnSize / 2, padY + padBtnSize / 2);
    }

    // Notes toggle button (to the right of number pad)
    const notesX = padStartX + padTotalW + 12;
    const notesW = 60;
    ctx.fillStyle = state.notesMode ? GAME_COLOR : '#2a2a3e';
    ctx.beginPath();
    ctx.roundRect(notesX, padY, notesW, padBtnSize, 6);
    ctx.fill();

    ctx.strokeStyle = state.notesMode ? GAME_COLOR : '#555';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(notesX, padY, notesW, padBtnSize, 6);
    ctx.stroke();

    ctx.fillStyle = state.notesMode ? '#fff' : '#aaa';
    ctx.font = '11px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Notes', notesX + notesW / 2, padY + padBtnSize / 2);

    // Controls hint bar
    const hintY = padY + padBtnSize + 14;
    ctx.fillStyle = '#555';
    ctx.font = '11px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(
      '[N] Notes  [U] Undo  [R] New  [Esc] Exit',
      W / 2,
      hintY,
    );
  }

  private renderOverlays(ctx: CanvasRenderingContext2D, state: SudokuState, W: number): void {
    if (state.status !== 'won') return;

    const H = ctx.canvas.height;

    // Dim overlay
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, W, H);

    // Victory text
    ctx.fillStyle = GAME_COLOR;
    ctx.font = 'bold 36px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Puzzle Complete!', W / 2, H / 2 - 30);

    // Time display
    const minutes = Math.floor(state.timer / 60);
    const seconds = state.timer % 60;
    const timeStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

    ctx.fillStyle = '#ccc';
    ctx.font = '18px monospace';
    ctx.fillText(`Time: ${timeStr}`, W / 2, H / 2 + 15);

    // Best time
    const bestKey = `sudoku-best-${state.difficulty}`;
    const best = localStorage.getItem(bestKey);
    if (best) {
      const bestSec = parseInt(best);
      const bMin = Math.floor(bestSec / 60);
      const bSec = bestSec % 60;
      ctx.fillStyle = '#999';
      ctx.font = '14px monospace';
      ctx.fillText(
        `Best: ${String(bMin).padStart(2, '0')}:${String(bSec).padStart(2, '0')}`,
        W / 2,
        H / 2 + 42,
      );
    }

    ctx.fillStyle = '#777';
    ctx.font = '14px monospace';
    ctx.fillText('Press [R] for a new game', W / 2, H / 2 + 70);
  }
}
```

**What's happening:**

- **Difficulty buttons** use `roundRect` for a modern pill-button look. The active difficulty renders in purple (`GAME_COLOR`), the rest in dark gray with a border.

- **Timer** formats `state.timer` (seconds) into `MM:SS` using padStart for zero-padding. Displayed on the right side of the top bar.

- **Notes mode indicator** shows "NOTES ON" in purple text to the left of the timer when active.

- **Number pad** renders 9 buttons in a row below the board. For each digit, we count how many times it appears on the board. When a digit appears 9 times (all instances placed), the button dims and the border grays out. This gives the player a quick visual read on progress.

- **Notes toggle button** sits to the right of the number pad. It lights up in purple when notes mode is active.

- **Win overlay** shows the completion time and the stored best time for the current difficulty.

---

### 2. Update the Board System

**File:** `src/games/sudoku/systems/BoardSystem.ts`

Add the timer and best-time saving.

```typescript
import {
  GRID,
  BOX,
  type SudokuState,
  type Cell,
  type UndoEntry,
} from '../types';
import { generatePuzzle } from '../data/puzzles';

export class BoardSystem {
  private timerAccum = 0;

  /** Initialise (or re-initialise) the board for a given difficulty. */
  initBoard(state: SudokuState): void {
    const { puzzle, solution } = generatePuzzle(state.difficulty);
    state.solution = solution;
    state.board = [];
    for (let r = 0; r < GRID; r++) {
      const row: Cell[] = [];
      for (let c = 0; c < GRID; c++) {
        row.push({
          value: puzzle[r][c],
          given: puzzle[r][c] !== 0,
          notes: new Set(),
          invalid: false,
        });
      }
      state.board.push(row);
    }
    state.status = 'playing';
    state.selectedRow = -1;
    state.selectedCol = -1;
    state.notesMode = false;
    state.timer = 0;
    state.undoStack = [];
    this.timerAccum = 0;
    this.validate(state);
  }

  /** Place a number (or toggle a note) at the selected cell. */
  placeNumber(state: SudokuState, num: number): void {
    const { selectedRow: r, selectedCol: c } = state;
    if (r < 0 || c < 0 || state.status === 'won') return;
    const cell = state.board[r][c];
    if (cell.given) return;

    // Save undo entry
    const undo: UndoEntry = {
      row: r,
      col: c,
      prevValue: cell.value,
      prevNotes: new Set(cell.notes),
    };
    state.undoStack.push(undo);

    if (state.notesMode) {
      if (num === 0) {
        cell.notes.clear();
      } else {
        if (cell.notes.has(num)) {
          cell.notes.delete(num);
        } else {
          cell.notes.add(num);
        }
        cell.value = 0;
      }
    } else {
      if (num === 0) {
        cell.value = 0;
      } else {
        cell.value = num;
        cell.notes.clear();
      }
    }

    this.validate(state);
    this.checkCompletion(state);
  }

  /** Clear the selected cell. */
  clearCell(state: SudokuState): void {
    this.placeNumber(state, 0);
  }

  /** Undo last action. */
  undo(state: SudokuState): void {
    if (state.undoStack.length === 0 || state.status === 'won') return;
    const entry = state.undoStack.pop()!;
    const cell = state.board[entry.row][entry.col];
    cell.value = entry.prevValue;
    cell.notes = new Set(entry.prevNotes);
    this.validate(state);
  }

  /** Validate the entire board -- flag conflicting cells. */
  validate(state: SudokuState): void {
    for (let r = 0; r < GRID; r++) {
      for (let c = 0; c < GRID; c++) {
        state.board[r][c].invalid = false;
      }
    }

    for (let r = 0; r < GRID; r++) {
      this.flagDuplicates(
        state,
        Array.from({ length: GRID }, (_, c) => [r, c] as [number, number]),
      );
    }

    for (let c = 0; c < GRID; c++) {
      this.flagDuplicates(
        state,
        Array.from({ length: GRID }, (_, r) => [r, c] as [number, number]),
      );
    }

    for (let br = 0; br < GRID; br += BOX) {
      for (let bc = 0; bc < GRID; bc += BOX) {
        const positions: [number, number][] = [];
        for (let r = br; r < br + BOX; r++) {
          for (let c = bc; c < bc + BOX; c++) {
            positions.push([r, c]);
          }
        }
        this.flagDuplicates(state, positions);
      }
    }
  }

  private flagDuplicates(state: SudokuState, positions: [number, number][]): void {
    const seen = new Map<number, [number, number][]>();
    for (const [r, c] of positions) {
      const v = state.board[r][c].value;
      if (v === 0) continue;
      if (!seen.has(v)) seen.set(v, []);
      seen.get(v)!.push([r, c]);
    }
    for (const cells of seen.values()) {
      if (cells.length > 1) {
        for (const [r, c] of cells) {
          state.board[r][c].invalid = true;
        }
      }
    }
  }

  /** Check if the puzzle is completed. Save best time if so. */
  private checkCompletion(state: SudokuState): void {
    for (let r = 0; r < GRID; r++) {
      for (let c = 0; c < GRID; c++) {
        const cell = state.board[r][c];
        if (cell.value === 0 || cell.invalid) return;
      }
    }
    state.status = 'won';

    // Save best time to localStorage
    const bestKey = `sudoku-best-${state.difficulty}`;
    const prev = localStorage.getItem(bestKey);
    if (!prev || state.timer < parseInt(prev)) {
      localStorage.setItem(bestKey, String(state.timer));
    }
  }

  /** Update timer (called each frame with dt in milliseconds). */
  update(state: SudokuState, dt: number): void {
    if (state.status !== 'playing') return;
    this.timerAccum += dt;
    if (this.timerAccum >= 1000) {
      state.timer += Math.floor(this.timerAccum / 1000);
      this.timerAccum %= 1000;
    }
  }
}
```

**What's happening:**
- **Timer**: The `update()` method accumulates delta time in milliseconds. Every time it crosses 1000ms, it increments `state.timer` by the appropriate number of seconds. The timer stops when `state.status` is not `'playing'`.
- **Best time**: On completion, we read the stored best time from `localStorage`. If there is no previous best, or the current time beats it, we save the new time. The key is per-difficulty (`sudoku-best-easy`, etc.).

---

### 3. Update the Input System

**File:** `src/games/sudoku/systems/InputSystem.ts`

Add click handling for HUD elements: difficulty buttons, number pad, and notes toggle.

```typescript
import { GRID, type SudokuState, type Difficulty, DIFFICULTY_PRESETS } from '../types';
import type { BoardSystem } from './BoardSystem';

export class InputSystem {
  private state: SudokuState;
  private canvas: HTMLCanvasElement;
  private boardSystem: BoardSystem;
  private onReset: (diff?: Difficulty) => void;

  private keyHandler: (e: KeyboardEvent) => void;
  private clickHandler: (e: MouseEvent) => void;

  constructor(
    state: SudokuState,
    canvas: HTMLCanvasElement,
    boardSystem: BoardSystem,
    onReset: (diff?: Difficulty) => void,
  ) {
    this.state = state;
    this.canvas = canvas;
    this.boardSystem = boardSystem;
    this.onReset = onReset;

    this.keyHandler = this.handleKey.bind(this);
    this.clickHandler = this.handleClick.bind(this);
  }

  attach(): void {
    window.addEventListener('keydown', this.keyHandler);
    this.canvas.addEventListener('click', this.clickHandler);
  }

  detach(): void {
    window.removeEventListener('keydown', this.keyHandler);
    this.canvas.removeEventListener('click', this.clickHandler);
  }

  private handleKey(e: KeyboardEvent): void {
    const key = e.key;

    // R to restart
    if (key === 'r' || key === 'R') {
      this.onReset();
      return;
    }

    // N to toggle notes mode
    if (key === 'n' || key === 'N') {
      this.state.notesMode = !this.state.notesMode;
      return;
    }

    // Z / Ctrl+Z for undo
    if ((key === 'z' || key === 'Z') && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      this.boardSystem.undo(this.state);
      return;
    }
    if (key === 'u' || key === 'U') {
      this.boardSystem.undo(this.state);
      return;
    }

    // Number keys 1-9
    if (key >= '1' && key <= '9') {
      this.boardSystem.placeNumber(this.state, parseInt(key));
      return;
    }

    // 0, Delete, Backspace to clear
    if (key === '0' || key === 'Delete' || key === 'Backspace') {
      this.boardSystem.clearCell(this.state);
      return;
    }

    // Arrow keys
    if (key === 'ArrowUp' && this.state.selectedRow > 0) {
      this.state.selectedRow--;
    } else if (key === 'ArrowDown' && this.state.selectedRow < GRID - 1) {
      this.state.selectedRow++;
    } else if (key === 'ArrowLeft' && this.state.selectedCol > 0) {
      this.state.selectedCol--;
    } else if (key === 'ArrowRight' && this.state.selectedCol < GRID - 1) {
      this.state.selectedCol++;
    }
  }

  private handleClick(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const s = this.state;

    // Check HUD buttons first
    if (this.handleHUDClick(mx, my)) return;

    // Check board click
    const col = Math.floor((mx - s.offsetX) / s.cellSize);
    const row = Math.floor((my - s.offsetY) / s.cellSize);

    if (row >= 0 && row < GRID && col >= 0 && col < GRID) {
      s.selectedRow = row;
      s.selectedCol = col;
    }
  }

  private handleHUDClick(mx: number, my: number): boolean {
    const s = this.state;
    const W = this.canvas.width;

    // --- Number pad buttons ---
    const padY = s.offsetY + GRID * s.cellSize + 15;
    const padBtnSize = Math.min(s.cellSize, 40);
    const padTotalW = 9 * padBtnSize + 8 * 4;
    const padStartX = (W - padTotalW) / 2;

    if (my >= padY && my <= padY + padBtnSize) {
      for (let i = 0; i < 9; i++) {
        const bx = padStartX + i * (padBtnSize + 4);
        if (mx >= bx && mx <= bx + padBtnSize) {
          this.boardSystem.placeNumber(s, i + 1);
          return true;
        }
      }
    }

    // --- Notes toggle button ---
    const notesX = padStartX + padTotalW + 12;
    const notesW = 60;
    if (mx >= notesX && mx <= notesX + notesW && my >= padY && my <= padY + padBtnSize) {
      s.notesMode = !s.notesMode;
      return true;
    }

    // --- Difficulty buttons ---
    const btnY = 8;
    const btnH = 28;
    const difficulties: Difficulty[] = ['easy', 'medium', 'hard'];
    let btnX = 10;
    for (const diff of difficulties) {
      const label = DIFFICULTY_PRESETS[diff].label;
      const btnW = label.length * 9 + 16;
      if (mx >= btnX && mx <= btnX + btnW && my >= btnY && my <= btnY + btnH) {
        this.onReset(diff);
        return true;
      }
      btnX += btnW + 8;
    }

    return false;
  }
}
```

**What's happening:**
- `handleHUDClick()` runs before the board click check. It tests whether the click hit a number pad button, the notes toggle, or a difficulty button.
- **Number pad hit testing**: We calculate the same positions the HUDRenderer uses to draw the buttons, then check if the click falls inside any of them. If so, we place the corresponding digit.
- **Notes toggle**: Clicking the "Notes" button flips `notesMode`, just like pressing N.
- **Difficulty buttons**: Clicking a difficulty button calls `onReset(diff)` with the new difficulty, which regenerates the puzzle.

---

### 4. Update the Engine

**File:** `src/games/sudoku/SudokuEngine.ts`

Add the HUDRenderer to the render pipeline, wire up the timer, and pass difficulty to reset.

```typescript
import type { SudokuState, Difficulty } from './types';
import { GRID } from './types';
import { BoardSystem } from './systems/BoardSystem';
import { InputSystem } from './systems/InputSystem';
import { BoardRenderer } from './renderers/BoardRenderer';
import { HUDRenderer } from './renderers/HUDRenderer';

export class SudokuEngine {
  private ctx: CanvasRenderingContext2D;
  private state: SudokuState;
  private running = false;
  private rafId = 0;
  private lastTime = 0;

  private boardSystem: BoardSystem;
  private inputSystem: InputSystem;
  private boardRenderer: BoardRenderer;
  private hudRenderer: HUDRenderer;
  private resizeHandler: () => void;

  constructor(canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    this.state = {
      board: [],
      solution: [],
      difficulty: 'easy',
      status: 'playing',
      selectedRow: -1,
      selectedCol: -1,
      notesMode: false,
      timer: 0,
      undoStack: [],
      offsetX: 0,
      offsetY: 0,
      cellSize: 0,
      hudHeight: 44,
    };

    this.boardSystem = new BoardSystem();
    this.boardRenderer = new BoardRenderer();
    this.hudRenderer = new HUDRenderer();
    this.inputSystem = new InputSystem(
      this.state,
      canvas,
      this.boardSystem,
      (diff?: Difficulty) => this.reset(diff),
    );

    this.boardSystem.initBoard(this.state);
    this.computeLayout();

    this.resizeHandler = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      this.computeLayout();
    };

    this.inputSystem.attach();
    window.addEventListener('resize', this.resizeHandler);
  }

  start(): void {
    this.running = true;
    this.lastTime = performance.now();
    this.loop();
  }

  destroy(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
    this.inputSystem.detach();
    window.removeEventListener('resize', this.resizeHandler);
  }

  private loop(): void {
    if (!this.running) return;
    const now = performance.now();
    const dt = now - this.lastTime;
    this.lastTime = now;

    this.boardSystem.update(this.state, dt);
    this.boardRenderer.render(this.ctx, this.state);
    this.hudRenderer.render(this.ctx, this.state);

    this.rafId = requestAnimationFrame(() => this.loop());
  }

  private reset(difficulty?: Difficulty): void {
    if (difficulty && difficulty !== this.state.difficulty) {
      this.state.difficulty = difficulty;
    }
    this.boardSystem.initBoard(this.state);
    this.computeLayout();
  }

  private computeLayout(): void {
    const W = this.ctx.canvas.width;
    const H = this.ctx.canvas.height;
    const hudTop = this.state.hudHeight;
    const padding = 20;
    const bottomPad = 80;

    const availW = W - padding * 2;
    const availH = H - hudTop - bottomPad - padding;

    const cellSize = Math.max(16, Math.min(
      Math.floor(availW / GRID),
      Math.floor(availH / GRID),
      50,
    ));
    this.state.cellSize = cellSize;

    const boardW = GRID * cellSize;
    const boardH = GRID * cellSize;

    this.state.offsetX = Math.floor((W - boardW) / 2);
    this.state.offsetY = Math.floor(hudTop + (availH - boardH) / 2);
  }
}
```

**What's happening:**
- The game loop now tracks `lastTime` and computes `dt` (delta time in milliseconds) each frame. This is passed to `boardSystem.update()` to drive the timer.
- The render pipeline draws the board first, then the HUD on top.
- `reset()` accepts an optional difficulty parameter. If provided, it updates the difficulty before regenerating the puzzle.

---

### 5. Update the Board Renderer

**File:** `src/games/sudoku/renderers/BoardRenderer.ts`

Remove the win overlay from the board renderer (the HUD renderer now handles it).

```typescript
import { GRID, BOX, type SudokuState } from '../types';

export class BoardRenderer {
  render(ctx: CanvasRenderingContext2D, state: SudokuState): void {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    // Clear background
    ctx.fillStyle = '#0e0e1a';
    ctx.fillRect(0, 0, W, H);

    const { offsetX, offsetY, cellSize, board, selectedRow, selectedCol } = state;

    // Draw cells
    for (let r = 0; r < GRID; r++) {
      for (let c = 0; c < GRID; c++) {
        const x = offsetX + c * cellSize;
        const y = offsetY + r * cellSize;
        const cell = board[r][c];

        // Cell background
        let bg = '#1a1a2e';

        // Highlight same box as selected
        if (selectedRow >= 0 && selectedCol >= 0) {
          const selBoxR = Math.floor(selectedRow / BOX);
          const selBoxC = Math.floor(selectedCol / BOX);
          const cellBoxR = Math.floor(r / BOX);
          const cellBoxC = Math.floor(c / BOX);
          if (
            r === selectedRow ||
            c === selectedCol ||
            (cellBoxR === selBoxR && cellBoxC === selBoxC)
          ) {
            bg = '#252545';
          }
        }

        // Selected cell
        if (r === selectedRow && c === selectedCol) {
          bg = '#3a3a6a';
        }

        // Highlight cells with same value as selected
        if (
          selectedRow >= 0 &&
          selectedCol >= 0 &&
          board[selectedRow][selectedCol].value !== 0 &&
          cell.value === board[selectedRow][selectedCol].value &&
          !(r === selectedRow && c === selectedCol)
        ) {
          bg = '#2e2e55';
        }

        // Invalid/conflict highlight
        if (cell.invalid && cell.value !== 0) {
          bg = '#4a1a1a';
        }

        ctx.fillStyle = bg;
        ctx.fillRect(x, y, cellSize, cellSize);

        // Draw value
        if (cell.value !== 0) {
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          const fontSize = Math.max(12, cellSize * 0.55);
          if (cell.given) {
            ctx.font = `bold ${fontSize}px monospace`;
            ctx.fillStyle = '#e0e0e0';
          } else {
            ctx.font = `${fontSize}px monospace`;
            ctx.fillStyle = cell.invalid ? '#ff5555' : '#7e9aff';
          }
          ctx.fillText(String(cell.value), x + cellSize / 2, y + cellSize / 2 + 1);
        } else if (cell.notes.size > 0) {
          // Draw notes
          const noteSize = Math.max(7, cellSize * 0.22);
          ctx.font = `${noteSize}px monospace`;
          ctx.fillStyle = '#888';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          const third = cellSize / 3;
          for (let n = 1; n <= 9; n++) {
            if (!cell.notes.has(n)) continue;
            const nr = Math.floor((n - 1) / 3);
            const nc = (n - 1) % 3;
            const nx = x + nc * third + third / 2;
            const ny = y + nr * third + third / 2;
            ctx.fillText(String(n), nx, ny);
          }
        }
      }
    }

    // Draw grid lines
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1;
    for (let i = 0; i <= GRID; i++) {
      const y = offsetY + i * cellSize;
      ctx.beginPath();
      ctx.moveTo(offsetX, y);
      ctx.lineTo(offsetX + GRID * cellSize, y);
      ctx.stroke();
      const x = offsetX + i * cellSize;
      ctx.beginPath();
      ctx.moveTo(x, offsetY);
      ctx.lineTo(x, offsetY + GRID * cellSize);
      ctx.stroke();
    }

    // Draw thick box borders (3x3)
    ctx.strokeStyle = '#aaa';
    ctx.lineWidth = 2.5;
    for (let i = 0; i <= BOX; i++) {
      const y = offsetY + i * BOX * cellSize;
      ctx.beginPath();
      ctx.moveTo(offsetX, y);
      ctx.lineTo(offsetX + GRID * cellSize, y);
      ctx.stroke();
      const x = offsetX + i * BOX * cellSize;
      ctx.beginPath();
      ctx.moveTo(x, offsetY);
      ctx.lineTo(x, offsetY + GRID * cellSize);
      ctx.stroke();
    }

    // Outer border
    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 3;
    ctx.strokeRect(offsetX, offsetY, GRID * cellSize, GRID * cellSize);
  }
}
```

---

### 6. Unchanged Files

These files are the same as the previous step: `types.ts`, `data/puzzles.ts`, `adapters/PlatformAdapter.ts`, `index.ts`

---

## Test It

1. **Run:** `npm run dev`
2. **Open:** the Sudoku game
3. **Test difficulty switching:**
   - Click **Easy**, **Medium**, and **Hard** buttons -- observe the number of given cells changes (35, 28, 22)
   - The active button highlights in purple
4. **Test the timer:**
   - Watch the timer count up in the top-right corner (MM:SS format)
   - Complete a puzzle -- the timer stops and displays in the win overlay
5. **Test the number pad:**
   - Select a cell and **click a number button** below the board -- the digit is placed
   - Fill in all instances of a digit (e.g., all nine 5s) -- the "5" button **dims out**
6. **Test the notes button:**
   - Click the **Notes** button next to the number pad -- it lights up purple
   - Click number pad buttons -- pencil marks appear instead of values
   - Click **Notes** again to return to normal mode
7. **Test best times:**
   - Complete a puzzle and note the time
   - Press R for a new puzzle, complete it faster
   - The win overlay shows both your time and your best time
   - Refresh the page -- your best time persists (stored in localStorage)
8. **Test controls hint:**
   - Below the number pad, verify the keyboard shortcuts are listed

---

## Challenges

**Easy:**
- Add a "pause" feature: pressing P stops the timer and hides the board (shows a "Paused" overlay). Pressing P again resumes.

**Medium:**
- Show the count of remaining instances next to each number pad button (e.g., "5 (3/9)" means 3 of 9 fives are placed).

**Hard:**
- Add a hint button that reveals one correct cell from the solution. Limit to 3 hints per puzzle and display the remaining hint count.

---

## What You Learned

- Rendering clickable canvas UI elements (buttons, toggle switches) with hit testing
- Implementing a frame-based timer using delta time accumulation
- Tracking per-digit completion counts for visual progress feedback
- Using localStorage for persistent best-time records
- Separating HUD rendering from board rendering for clean architecture
- Building a complete, polished game UI with difficulty selection, timer, and overlay screens

---

## Final Summary

Over these 6 steps, you built a complete Sudoku game from scratch:

1. **Grid Setup** -- types, responsive layout, two-level grid lines
2. **Puzzle Generation** -- backtracking solver, cell removal with uniqueness checking
3. **Cell Selection & Input** -- click/keyboard interaction, selection highlighting
4. **Validation** -- row/column/box duplicate detection, conflict highlighting, win detection
5. **Notes & Undo** -- pencil marks in a 3x3 mini-grid, undo stack with state snapshots
6. **Polish** -- difficulty buttons, timer, number pad, best times, overlay screens

The backtracking algorithm you learned here is one of the most broadly useful techniques in programming. It appears in pathfinding, constraint satisfaction, puzzle solving, compiler optimization, and countless other domains. The Sudoku puzzle generator is a practical, understandable example of this powerful pattern.

**Next game:** Continue to the next tutorial to build something new!
