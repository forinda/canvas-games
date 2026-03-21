# Step 5: Word List Display & Polish

**Goal:** Show the word list with strikethrough for found words, display a timer and theme header, and build the win screen overlay.

**Time:** ~15 minutes

---

## What You'll Build

- **HUD Renderer** with theme name, timer, and keyboard shortcut hints
- **Word list panel** on the right side showing all words, with found words crossed off in their highlight color
- **Win overlay** that appears when all words are found, showing completion time
- **Help overlay** toggle for in-game instructions
- **Final entry point** and platform adapter matching the game framework

---

## Concepts

- **HUD Layout**: The top bar shows the theme name (left-aligned) and timer (right-aligned), both positioned relative to the grid's offset so they line up visually. The bottom bar shows keyboard shortcuts centered at the canvas bottom.
- **Word List Panel**: The word list renders in the space to the right of the grid. Each word is drawn in a vertical list. Found words display in their highlight color with a strikethrough line measured to the exact text width using `ctx.measureText()`.
- **Win Overlay**: A semi-transparent black overlay covers the entire canvas, with a centered panel showing the victory message, completion time, and a restart prompt. This uses `roundRect` for a polished card look.
- **Timer Formatting**: The raw `state.timer` (seconds as a float) is formatted to `MM:SS` using `Math.floor()` and `padStart()`.

---

## Code

### 1. Create the HUD Renderer

**File:** `src/games/word-search/renderers/HUDRenderer.ts`

Draws the theme header, timer, word list, bottom hints, and win overlay.

```typescript
import type { WordSearchState } from '../types';
import { GAME_COLOR } from '../types';

export class HUDRenderer {
  render(ctx: CanvasRenderingContext2D, state: WordSearchState): void {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;
    const { offsetX, offsetY, cellSize, cols } = state;

    // --- Top bar: theme + timer ---
    const topY = 12;

    ctx.font = 'bold 18px monospace';
    ctx.fillStyle = GAME_COLOR;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`Theme: ${state.theme}`, offsetX, topY);

    // Timer
    const mins = Math.floor(state.timer / 60);
    const secs = Math.floor(state.timer % 60);
    const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

    ctx.textAlign = 'right';
    ctx.fillText(timeStr, offsetX + cols * cellSize, topY);

    // --- Word list on the right side ---
    const listX = offsetX + cols * cellSize + 24;
    const listMaxW = W - listX - 12;

    if (listMaxW > 60) {
      let listY = offsetY + 4;

      ctx.font = 'bold 14px monospace';
      ctx.fillStyle = GAME_COLOR;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText('WORDS', listX, listY);
      listY += 24;

      const foundCount = state.placedWords.filter((pw) => pw.found).length;

      ctx.font = '12px monospace';
      ctx.fillStyle = '#666';
      ctx.fillText(`${foundCount}/${state.placedWords.length}`, listX, listY);
      listY += 22;

      ctx.font = '13px monospace';

      for (const pw of state.placedWords) {
        if (pw.found) {
          const color = state.foundColors.get(pw.word) || GAME_COLOR;

          ctx.fillStyle = color;
          ctx.fillText(pw.word, listX, listY);

          // Strikethrough
          const textW = ctx.measureText(pw.word).width;

          ctx.strokeStyle = color;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(listX - 2, listY + 7);
          ctx.lineTo(listX + textW + 2, listY + 7);
          ctx.stroke();
        } else {
          ctx.fillStyle = '#777';
          ctx.fillText(pw.word, listX, listY);
        }

        listY += 20;
      }
    }

    // --- Bottom hints ---
    ctx.font = '12px monospace';
    ctx.fillStyle = '#444';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText('[R] Restart  [H] Help  [ESC] Exit', W / 2, H - 8);

    // --- Win overlay ---
    if (state.status === 'won') {
      this.renderWinOverlay(ctx, state);
    }
  }

  private renderWinOverlay(
    ctx: CanvasRenderingContext2D,
    state: WordSearchState,
  ): void {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, W, H);

    const panelW = Math.min(400, W * 0.6);
    const panelH = 180;
    const px = (W - panelW) / 2;
    const py = (H - panelH) / 2;

    ctx.fillStyle = '#151530';
    ctx.beginPath();
    ctx.roundRect(px, py, panelW, panelH, 12);
    ctx.fill();

    ctx.strokeStyle = GAME_COLOR;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(px, py, panelW, panelH, 12);
    ctx.stroke();

    ctx.font = 'bold 28px monospace';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('All Words Found!', W / 2, py + 50);

    const mins = Math.floor(state.timer / 60);
    const secs = Math.floor(state.timer % 60);

    ctx.font = '18px monospace';
    ctx.fillStyle = GAME_COLOR;
    ctx.fillText(
      `Time: ${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`,
      W / 2,
      py + 95,
    );

    ctx.font = '14px monospace';
    ctx.fillStyle = '#888';
    ctx.fillText('Press [R] to play again', W / 2, py + 140);
  }
}
```

**What's happening:**
- The top bar draws `Theme: Animals` (or whichever theme was selected) on the left and the elapsed time on the right, both in the game's accent color (`GAME_COLOR`).
- The word list panel starts 24px to the right of the grid. It shows a "WORDS" header, a `found/total` counter, then each word. Found words display in their highlight color with a 2px strikethrough line. Unfound words show in muted grey.
- `ctx.measureText(pw.word).width` gives the exact pixel width of each word, so the strikethrough line extends precisely from 2px before to 2px after the text.
- The `listMaxW > 60` guard prevents the word list from rendering on very narrow screens where it would overlap the grid.
- The win overlay dims the entire screen with a 70% opacity black fill, then draws a centered card with rounded corners, a victory message, the completion time, and a restart prompt.
- The bottom hint bar shows keyboard shortcuts (`[R]`, `[H]`, `[ESC]`) centered at the canvas bottom in dark grey -- visible but not distracting.

---

### 2. Final Engine with All Systems and Renderers

**File:** `src/games/word-search/WordSearchEngine.ts`

The complete engine integrating BoardSystem, WordSystem, InputSystem, BoardRenderer, and HUDRenderer.

```typescript
import type { WordSearchState } from './types';
import { GRID_ROWS, GRID_COLS } from './types';
import { BoardSystem } from './systems/BoardSystem';
import { InputSystem } from './systems/InputSystem';
import { WordSystem } from './systems/WordSystem';
import { BoardRenderer } from './renderers/BoardRenderer';
import { HUDRenderer } from './renderers/HUDRenderer';

export class WordSearchEngine {
  private ctx: CanvasRenderingContext2D;
  private state: WordSearchState;
  private running = false;
  private rafId = 0;
  private lastTime = 0;

  private boardSystem: BoardSystem;
  private wordSystem: WordSystem;
  private inputSystem: InputSystem;
  private boardRenderer: BoardRenderer;
  private hudRenderer: HUDRenderer;
  private resizeHandler: () => void;

  constructor(canvas: HTMLCanvasElement, onExit: () => void) {
    this.ctx = canvas.getContext('2d')!;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    this.state = {
      grid: [],
      rows: GRID_ROWS,
      cols: GRID_COLS,
      placedWords: [],
      selection: [],
      dragging: false,
      dragStart: null,
      pointerPos: null,
      status: 'playing',
      timer: 0,
      theme: '',
      offsetX: 0,
      offsetY: 0,
      cellSize: 0,
      foundColors: new Map(),
    };

    this.boardSystem = new BoardSystem();
    this.wordSystem = new WordSystem();
    this.boardRenderer = new BoardRenderer();
    this.hudRenderer = new HUDRenderer();

    this.inputSystem = new InputSystem(
      this.state,
      canvas,
      this.wordSystem,
      onExit,
      () => this.reset(),
    );

    this.boardSystem.initBoard(this.state);
    this.computeLayout();

    this.inputSystem.attach();

    this.resizeHandler = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      this.computeLayout();
    };
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
    this.render();

    this.rafId = requestAnimationFrame(() => this.loop());
  }

  private render(): void {
    this.boardRenderer.render(this.ctx, this.state);
    this.hudRenderer.render(this.ctx, this.state);
  }

  private reset(): void {
    this.wordSystem.reset();
    this.boardSystem.initBoard(this.state);
    this.computeLayout();
  }

  private computeLayout(): void {
    const W = this.ctx.canvas.width;
    const H = this.ctx.canvas.height;
    const topPad = 42;
    const bottomPad = 30;
    const sidePad = 20;
    const wordListWidth = Math.min(160, W * 0.2);

    const availW = W - sidePad * 2 - wordListWidth;
    const availH = H - topPad - bottomPad;

    const cellW = Math.floor(availW / this.state.cols);
    const cellH = Math.floor(availH / this.state.rows);

    this.state.cellSize = Math.max(16, Math.min(cellW, cellH, 50));

    const boardW = this.state.cols * this.state.cellSize;
    const boardH = this.state.rows * this.state.cellSize;

    this.state.offsetX = Math.floor((W - wordListWidth - boardW) / 2);
    this.state.offsetY = Math.floor(topPad + (availH - boardH) / 2);
  }
}
```

**What's happening:**
- The `render()` method now calls both `boardRenderer.render()` and `hudRenderer.render()` in order. The board draws first (background, grid, highlights, letters), then the HUD draws on top (theme, timer, word list, win overlay).
- This layered rendering approach keeps each renderer focused on its own concern.

---

### 3. Final Platform Adapter

**File:** `src/games/word-search/adapters/PlatformAdapter.ts`

```typescript
import { WordSearchEngine } from '../WordSearchEngine';

export class PlatformAdapter {
  private engine: WordSearchEngine;

  constructor(canvas: HTMLCanvasElement, onExit: () => void) {
    this.engine = new WordSearchEngine(canvas, onExit);
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

### 4. Final Entry Point

**File:** `src/games/word-search/index.ts`

```typescript
import { PlatformAdapter } from './adapters/PlatformAdapter';

export const WordSearchGame = {
  id: 'word-search',
  name: 'Word Search',
  description: 'Find hidden words in a grid of letters!',
  create(canvas: HTMLCanvasElement, onExit: () => void) {
    const instance = new PlatformAdapter(canvas, onExit);
    instance.start();
    return instance;
  },
};
```

---

## Test It

1. **Run:** `pnpm dev`
2. **Open:** the Word Search game in your browser
3. **Observe:**
   - **Theme name** displayed in the top-left (e.g., "Theme: Animals")
   - **Timer** counting up in the top-right in `MM:SS` format
   - **Word list** on the right side showing all 8 words
   - **Find a word** by dragging -- it gets crossed off in the list with a colored strikethrough
   - The **found counter** updates (e.g., "3/8")
   - **Find all words** -- the win overlay appears with "All Words Found!" and your time
   - Press **R** on the win screen to start a new puzzle
   - Press **ESC** to exit back to the menu
   - **Bottom bar** shows `[R] Restart  [H] Help  [ESC] Exit`

---

## Challenges

**Easy:**
- Change the win overlay message to include the theme name (e.g., "All Animals Found!").
- Adjust the word list font size for better readability on your screen.

**Medium:**
- Sort the word list alphabetically so players can scan it more easily.
- Add a "best time" tracker that persists across puzzles using `localStorage`.

**Hard:**
- Add difficulty levels that change the grid size: Easy (10x10, 6 words), Medium (12x12, 8 words), Hard (14x14, 10 words), with a difficulty selector on the win screen.
- Add an animated confetti effect on the win screen using small colored particles.

---

## What You Learned

- Rendering a HUD with theme name, timer, and keyboard hints positioned relative to the grid
- Drawing a word list panel with per-word color coding and precise strikethrough lines
- Building a win overlay with semi-transparent background dimming and a centered card
- Formatting time values with zero-padded minutes and seconds
- Composing multiple renderers (board + HUD) in a layered render pipeline

---

## Complete Game Architecture

Here is the final file structure for the Word Search game:

```
src/games/word-search/
  types.ts                    — Cell, PlacedWord, WordSearchState, direction vectors, constants
  data/words.ts               — Themed word lists and random theme picker
  systems/BoardSystem.ts      — Puzzle generation: word placement + random fill + timer
  systems/InputSystem.ts      — Mouse/touch drag handling + keyboard shortcuts
  systems/WordSystem.ts       — Word matching, color assignment, win detection
  renderers/BoardRenderer.ts  — Grid, letters, selection highlights, found word highlights
  renderers/HUDRenderer.ts    — Theme header, timer, word list, bottom hints, win overlay
  WordSearchEngine.ts         — Main engine: state, systems, renderers, game loop
  adapters/PlatformAdapter.ts — Thin wrapper for host integration
  index.ts                    — Public entry point
```

**Congratulations!** You have built a complete Word Search game with word placement in 8 directions, drag-to-select interaction, word matching with colored highlights, a word list with strikethrough, and a polished win screen.
