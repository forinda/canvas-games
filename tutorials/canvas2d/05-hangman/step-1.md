# Step 1: Word Display & Keyboard Input

**Goal:** Display a hidden word as underscores and capture keyboard letter guesses.

**Time:** ~15 minutes

---

## What You'll Build

A word-guessing interface showing blanks for each letter, plus a category hint.

```
Category: Animals

_ _ _ _ _ _ _ _

A B C D E F G H I J K L M
N O P Q R S T U V W X Y Z
```

---

## Concepts

- **Hidden Word**: Display `_` for each letter
- **Letter Tracking**: Track which letters have been guessed
- **Keyboard Input**: Capture A-Z key presses
- **On-Screen Keyboard**: Clickable letter buttons

---

## Code

### 1. Create Type Definitions

**File:** `src/contexts/canvas2d/games/hangman/types.ts`

```typescript
export type GamePhase = 'playing' | 'won' | 'lost';

export interface HangmanState {
  word: string; // The secret word (uppercase)
  category: string; // Hint for the player
  guessedLetters: Set<string>; // All guessed letters (A-Z)
  wrongGuesses: string[]; // Incorrect guesses only
  phase: GamePhase;
  wins: number;
  losses: number;
  canvasWidth: number;
  canvasHeight: number;
}

export const MAX_WRONG = 6; // 6 wrong guesses = game over
export const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
```

**Why:** 
- `Set<string>` for efficient letter lookups
- Separate `wrongGuesses` array to track incorrect attempts

---

### 2. Create Game Engine

**File:** `src/contexts/canvas2d/games/hangman/HangmanEngine.ts`

```typescript
import type { HangmanState } from './types';
import { ALPHABET } from './types';

export class HangmanEngine {
  private ctx: CanvasRenderingContext2D;
  private state: HangmanState;
  private running: boolean;
  private rafId: number;

  constructor(canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
    this.running = false;
    this.rafId = 0;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Start with a test word
    this.state = {
      word: 'ELEPHANT',
      category: 'Animals',
      guessedLetters: new Set(),
      wrongGuesses: [],
      phase: 'playing',
      wins: 0,
      losses: 0,
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
    };
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
    const { ctx } = this;
    const W = this.state.canvasWidth;
    const H = this.state.canvasHeight;

    // Background
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, W, H);

    this.renderCategory();
    this.renderWord();
    this.renderKeyboard();
  }

  private renderCategory(): void {
    const { ctx, state } = this;
    const W = state.canvasWidth;

    ctx.fillStyle = '#888';
    ctx.font = '20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`Category: ${state.category}`, W / 2, 50);
  }

  private renderWord(): void {
    const { ctx, state } = this;
    const W = state.canvasWidth;
    const H = state.canvasHeight;

    const letters = state.word.split('');
    const spacing = 50;
    const totalWidth = letters.length * spacing;
    const startX = (W - totalWidth) / 2;
    const y = H / 2;

    ctx.font = 'bold 48px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let i = 0; i < letters.length; i++) {
      const letter = letters[i];
      const x = startX + i * spacing + spacing / 2;

      if (state.guessedLetters.has(letter)) {
        // Show revealed letter
        ctx.fillStyle = '#00ff88';
        ctx.fillText(letter, x, y);
      } else {
        // Show blank
        ctx.fillStyle = '#fff';
        ctx.fillText('_', x, y);
      }
    }
  }

  private renderKeyboard(): void {
    const { ctx, state } = this;
    const W = state.canvasWidth;
    const H = state.canvasHeight;

    const buttonSize = 40;
    const spacing = 8;
    const lettersPerRow = 13;
    const startY = H - 150;

    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let i = 0; i < ALPHABET.length; i++) {
      const letter = ALPHABET[i];
      const row = Math.floor(i / lettersPerRow);
      const col = i % lettersPerRow;

      const rowWidth = Math.min(lettersPerRow, ALPHABET.length - row * lettersPerRow);
      const rowStartX = (W - rowWidth * (buttonSize + spacing)) / 2;

      const x = rowStartX + col * (buttonSize + spacing);
      const y = startY + row * (buttonSize + spacing);

      // Button background
      if (state.guessedLetters.has(letter)) {
        ctx.fillStyle = '#333'; // Already guessed
      } else {
        ctx.fillStyle = '#555'; // Available
      }
      ctx.fillRect(x, y, buttonSize, buttonSize);

      // Letter text
      ctx.fillStyle = state.guessedLetters.has(letter) ? '#666' : '#fff';
      ctx.fillText(letter, x + buttonSize / 2, y + buttonSize / 2);
    }
  }
}
```

**Key Points:**
- **Word Rendering**: Loop through letters, show revealed or `_`
- **Keyboard Layout**: 13 letters per row, centered
- **Button States**: Gray when guessed, lighter when available

---

### 3. Create Platform Adapter

**File:** `src/contexts/canvas2d/games/hangman/adapters/PlatformAdapter.ts`

```typescript
import type { GameInstance } from '@core/GameInterface';
import { HangmanEngine } from '../HangmanEngine';

export class PlatformAdapter implements GameInstance {
  private engine: HangmanEngine;

  constructor(canvas: HTMLCanvasElement, onExit: () => void) {
    this.engine = new HangmanEngine(canvas);
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

### 4. Register the Game

**File:** `src/contexts/canvas2d/games/hangman/index.ts`

```typescript
import type { GameDefinition } from '@core/GameInterface';
import { PlatformAdapter } from './adapters/PlatformAdapter';

export const HangmanGame: GameDefinition = {
  id: 'hangman',
  name: 'Hangman',
  description: 'Guess the word before the hangman is complete!',
  icon: '🎮',
  color: '#ff6f61',
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
2. **Navigate:** Select "Hangman" from the menu
3. **Expect:** Word "ELEPHANT" shown as `_ _ _ _ _ _ _ _`
4. **See:** Category hint and full A-Z keyboard

---

## What You Learned

✅ Display hidden words with underscores  
✅ Render an on-screen keyboard grid  
✅ Use `Set<string>` for efficient tracking  
✅ Layout multi-row button interfaces

---

## Next Step

→ [Step 2: Letter Guessing & Reveal Logic](./step-2.md) — Add keyboard/click input to guess letters
