# Step 1: Project Setup & Card Grid

**Goal:** Render a grid of face-down cards on the canvas.

**Time:** ~15 minutes

---

## What You'll Build

A 4×4 grid (16 cards) displayed on the canvas. Each card appears as a blue rectangle with a "?" symbol, representing a face-down card.

```
┌─────────────────────┐
│ ?  ?  ?  ?         │
│ ?  ?  ?  ?         │
│ ?  ?  ?  ?         │
│ ?  ?  ?  ?         │
└─────────────────────┘
```

---

## Concepts

- **1D Array for 2D Grid**: Store cards in a flat array, calculate row/col from index
- **Card State**: Each card has properties: `flipped`, `matched`, `iconIndex`
- **Grid Layout**: Calculate card size and spacing for responsive design

---

## Code

### 1. Create Type Definitions

**File:** `src/games/memory-match/types.ts`

```typescript
/** Card state for a single memory card */
export interface Card {
  /** Index into the ICONS array */
  iconIndex: number;
  /** Whether the card is currently face-up */
  flipped: boolean;
  /** Whether the card has been matched and removed from play */
  matched: boolean;
  /** Row position on the board */
  row: number;
  /** Column position on the board */
  col: number;
}

export const GAME_COLOR = '#ab47bc'; // Purple theme

export interface MemoryState {
  board: Card[];
  rows: number;
  cols: number;
  cellSize: number;
  boardOffsetX: number;
  boardOffsetY: number;
}
```

**Why:**
- `iconIndex` identifies which symbol this card shows (when flipped)
- `flipped` tracks if the card is face-up or face-down
- `matched` tracks if this card has been successfully paired
- `row/col` simplify rendering calculations

---

### 2. Create Icon Data

**File:** `src/games/memory-match/data/icons.ts`

```typescript
/** 18 emoji icons used for card pairs */
export const ICONS: string[] = [
  '🐱', // cat
  '🐶', // dog
  '🦊', // fox
  '🐻', // bear
  '🦁', // lion
  '🦄', // unicorn
  '🐧', // penguin
  '🦅', // eagle
  '🐝', // bee
  '🐙', // octopus
  '🐋', // whale
  '🦋', // butterfly
  '🌻', // sunflower
  '🌲', // tree
  '🔥', // fire
  '⭐', // star
  '🌈', // rainbow
  '🚀', // rocket
];
```

**Why:** We'll use these emojis as card symbols. A 4×4 grid needs 8 pairs = 16 cards.

---

### 3. Initialize the Game Engine

**File:** `src/games/memory-match/MemoryEngine.ts`

```typescript
import type { MemoryState, Card } from './types';
import { GAME_COLOR } from './types';
import { ICONS } from './data/icons';

export class MemoryEngine {
  private ctx: CanvasRenderingContext2D;
  private state: MemoryState;
  private running: boolean;
  private rafId: number;

  constructor(canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
    this.running = false;
    this.rafId = 0;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Initialize 4x4 grid
    this.state = {
      board: this.createBoard(4, 4),
      rows: 4,
      cols: 4,
      cellSize: 0,
      boardOffsetX: 0,
      boardOffsetY: 0,
    };

    this.computeLayout();
  }

  /** Create a 4x4 board with 8 pairs of cards (temporarily in order) */
  private createBoard(rows: number, cols: number): Card[] {
    const totalCards = rows * cols;
    const numPairs = totalCards / 2; // 8 pairs for 4x4

    const board: Card[] = [];
    
    // Create pairs: [0,0, 1,1, 2,2, 3,3, ...]
    for (let pairIdx = 0; pairIdx < numPairs; pairIdx++) {
      for (let copy = 0; copy < 2; copy++) {
        const index = pairIdx * 2 + copy;
        const row = Math.floor(index / cols);
        const col = index % cols;

        board.push({
          iconIndex: pairIdx, // All cards start face-down
          flipped: false,
          matched: false,
          row,
          col,
        });
      }
    }

    return board;
  }

  /** Calculate card size and offsets to center the grid */
  private computeLayout(): void {
    const W = this.ctx.canvas.width;
    const H = this.ctx.canvas.height;
    const padding = 40;
    const hudHeight = 60;

    const availW = W - padding * 2;
    const availH = H - hudHeight - padding * 2;

    const cellW = Math.floor(availW / this.state.cols);
    const cellH = Math.floor(availH / this.state.rows);

    this.state.cellSize = Math.max(60, Math.min(cellW, cellH, 120));

    const boardW = this.state.cols * this.state.cellSize;
    const boardH = this.state.rows * this.state.cellSize;

    this.state.boardOffsetX = Math.floor((W - boardW) / 2);
    this.state.boardOffsetY = Math.floor(hudHeight + (H - hudHeight - boardH) / 2);
  }

  start(): void {
    this.running = true;
    this.loop();
  }

  destroy(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
  }

  private loop(): void {
    if (!this.running) return;
    this.render();
    this.rafId = requestAnimationFrame(() => this.loop());
  }

  private render(): void {
    // Background
    this.ctx.fillStyle = '#0f0f1a';
    this.ctx.fillRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);

    this.renderBoard();
  }

  private renderBoard(): void {
    for (const card of this.state.board) {
      const x = this.state.boardOffsetX + card.col * this.state.cellSize;
      const y = this.state.boardOffsetY + card.row * this.state.cellSize;
      const size = this.state.cellSize - 8; // 4px margin on each side

      // Draw card back (face-down)
      this.ctx.fillStyle = card.matched ? '#333' : GAME_COLOR;
      this.ctx.fillRect(x + 4, y + 4, size, size);

      // Draw "?" symbol for face-down cards
      if (!card.flipped && !card.matched) {
        this.ctx.fillStyle = 'white';
        this.ctx.font = `${size * 0.5}px sans-serif`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('?', x + this.state.cellSize / 2, y + this.state.cellSize / 2);
      }
    }
  }
}
```

**Key Points:**
- **1D Array**: `board[]` stores all cards linearly. Calculate row/col using `Math.floor(index / cols)` and `index % cols`
- **Layout**: Cards resize between 60–120px based on screen size
- **Rendering**: Each card is a purple rectangle with a "?" symbol

---

### 4. Create Platform Adapter

**File:** `src/games/memory-match/adapters/PlatformAdapter.ts`

```typescript
import type { GameInstance } from '@shared/GameInterface';
import { MemoryEngine } from '../MemoryEngine';

export class PlatformAdapter implements GameInstance {
  private engine: MemoryEngine;

  constructor(canvas: HTMLCanvasElement, onExit: () => void) {
    this.engine = new MemoryEngine(canvas);
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

### 5. Register the Game

**File:** `src/games/memory-match/index.ts`

```typescript
import type { GameDefinition } from '@shared/GameInterface';
import { PlatformAdapter } from './adapters/PlatformAdapter';

export const MemoryMatchGame: GameDefinition = {
  id: 'memory-match',
  name: 'Memory Match',
  description: 'Find all matching pairs of cards!',
  icon: '🃏',
  color: '#ab47bc',
  category: 'puzzle',
  create(canvas, onExit) {
    const instance = new PlatformAdapter(canvas, onExit);
    instance.start();
    return instance;
  },
};
```

---

## Test It

1. **Run:** `npm run dev`
2. **Navigate:** Select "Memory Match" from the menu
3. **Expect:** A 4×4 grid of purple cards with "?" symbols

---

## What You Learned

✅ Store a 2D grid in a 1D array  
✅ Calculate responsive card sizing and centering  
✅ Render cards with text symbols  
✅ Structure a card-based game engine

---

## Next Step

→ [Step 2: Card Flipping & Reveal](./step-2.md) — Add click detection to flip cards and show their icons
