# Step 4: Win/Loss Detection & Categories

**Goal:** Detect win/loss conditions, show game over screens, and add randomized word categories.

**Time:** ~15 minutes

---

## What You'll Build

Complete game loop with:
- **Win detection**: All letters revealed
- **Loss detection**: 6 wrong guesses
- **Multiple categories**: Animals, Countries, Foods, Sports, Technology
- **Restart functionality**: Play again with new word

---

## Concepts

- **Win Condition**: Check if all letters are guessed
- **Loss Condition**: Check if `wrongGuesses.length >= 6`
- **Word Lists**: Organize words by category
- **Random Selection**: Pick random word from random category

---

## Code

### 1. Create Word Lists

**File:** `src/contexts/canvas2d/games/hangman/data/words.ts`

```typescript
export interface WordEntry {
  word: string;
  category: string;
}

const ANIMALS: string[] = [
  'ELEPHANT', 'GIRAFFE', 'PENGUIN', 'DOLPHIN', 'CHEETAH',
  'GORILLA', 'KANGAROO', 'OCTOPUS', 'PANTHER', 'BUFFALO',
];

const COUNTRIES: string[] = [
  'BRAZIL', 'CANADA', 'FRANCE', 'GERMANY', 'JAPAN',
  'MEXICO', 'NORWAY', 'SWEDEN', 'TURKEY', 'ARGENTINA',
];

const FOODS: string[] = [
  'PIZZA', 'SUSHI', 'BURGER', 'WAFFLE', 'PRETZEL',
  'MUFFIN', 'COOKIE', 'NOODLE', 'PANCAKE', 'BURRITO',
];

const SPORTS: string[] = [
  'SOCCER', 'TENNIS', 'HOCKEY', 'BOXING', 'CRICKET',
  'CYCLING', 'FENCING', 'ROWING', 'SURFING', 'ARCHERY',
];

const TECHNOLOGY: string[] = [
  'COMPUTER', 'INTERNET', 'KEYBOARD', 'MONITOR', 'PRINTER',
  'ROUTER', 'SERVER', 'BROWSER', 'PROGRAM', 'NETWORK',
];

const ALL_CATEGORIES: { name: string; words: string[] }[] = [
  { name: 'Animals', words: ANIMALS },
  { name: 'Countries', words: COUNTRIES },
  { name: 'Foods', words: FOODS },
  { name: 'Sports', words: SPORTS },
  { name: 'Technology', words: TECHNOLOGY },
];

/** Get a random word and its category */
export function getRandomWord(): WordEntry {
  const category = ALL_CATEGORIES[Math.floor(Math.random() * ALL_CATEGORIES.length)];
  const word = category.words[Math.floor(Math.random() * category.words.length)];
  
  return { word, category: category.name };
}
```

---

### 2. Update Game System with Win/Loss Logic

**File:** `src/contexts/canvas2d/games/hangman/systems/GameSystem.ts`

```typescript
export class GameSystem implements Updatable<HangmanState> {
  processGuess(state: HangmanState, letter: string): void {
    if (state.phase !== 'playing') return;
    if (state.guessedLetters.has(letter)) return;

    state.guessedLetters.add(letter);

    if (!state.word.includes(letter)) {
      state.wrongGuesses.push(letter);
    }

    // Check lose condition
    if (state.wrongGuesses.length >= MAX_WRONG) {
      state.phase = 'lost';
      state.losses++;
      return;
    }

    // Check win condition
    const allRevealed = state.word
      .split('')
      .every((ch) => state.guessedLetters.has(ch));
    
    if (allRevealed) {
      state.phase = 'won';
      state.wins++;
    }
  }

  update(_state: HangmanState, _dt: number): void {
    // No per-frame logic
  }
}
```

**Key Points:**
- **Loss First**: Check loss before win (6 wrongs = immediate loss)
- **Win Check**: Use `Array.every()` to verify all letters guessed
- **Score Tracking**: Increment wins/losses

---

### 3. Create HUD Renderer

**File:** `src/contexts/canvas2d/games/hangman/renderers/HUDRenderer.ts`

```typescript
import type { HangmanState } from '../types';

export class HUDRenderer {
  render(ctx: CanvasRenderingContext2D, state: HangmanState): void {
    const W = state.canvasWidth;
    const H = state.canvasHeight;

    // Show stats (top-right)
    ctx.fillStyle = 'white';
    ctx.font = '20px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`Wins: ${state.wins}`, W - 20, 30);
    ctx.fillText(`Losses: ${state.losses}`, W - 20, 60);

    // Game over overlay
    if (state.phase === 'won' || state.phase === 'lost') {
      this.renderGameOver(ctx, state);
    }
  }

  private renderGameOver(ctx: CanvasRenderingContext2D, state: HangmanState): void {
    const W = state.canvasWidth;
    const H = state.canvasHeight;

    // Semi-transparent overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.fillRect(0, 0, W, H);

    // Message
    ctx.font = 'bold 56px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (state.phase === 'won') {
      ctx.fillStyle = '#00ff88';
      ctx.fillText('🎉 You Win!', W / 2, H / 2 - 60);
    } else {
      ctx.fillStyle = '#ff4444';
      ctx.fillText('💀 Game Over', W / 2, H / 2 - 60);
    }

    // Show the word
    ctx.font = '32px sans-serif';
    ctx.fillStyle = 'white';
    ctx.fillText(`The word was: ${state.word}`, W / 2, H / 2);

    // Restart hint
    ctx.font = '20px sans-serif';
    ctx.fillStyle = '#aaa';
    ctx.fillText('Press [Space] to play again', W / 2, H / 2 + 60);
  }
}
```

---

### 4. Update Engine with Random Words and Restart

**File:** `src/contexts/canvas2d/games/hangman/HangmanEngine.ts`

```typescript
import { getRandomWord } from './data/words';
import { HUDRenderer } from './renderers/HUDRenderer';

export class HangmanEngine {
  // ... existing properties ...
  private hudRenderer: HUDRenderer;

  constructor(canvas: HTMLCanvasElement) {
    // ... existing setup ...

    // Load stats from localStorage
    let wins = 0, losses = 0;
    try {
      wins = parseInt(localStorage.getItem('hangman_wins') ?? '0', 10) || 0;
      losses = parseInt(localStorage.getItem('hangman_losses') ?? '0', 10) || 0;
    } catch (e) {
      console.warn('Could not load stats');
    }

    // Get random word
    const { word, category } = getRandomWord();

    this.state = {
      word,
      category,
      guessedLetters: new Set(),
      wrongGuesses: [],
      phase: 'playing',
      wins,
      losses,
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
    };

    this.hudRenderer = new HUDRenderer();
    
    // ... rest of constructor ...
  }

  destroy(): void {
    // Save stats
    try {
      localStorage.setItem('hangman_wins', String(this.state.wins));
      localStorage.setItem('hangman_losses', String(this.state.losses));
    } catch (e) {
      console.warn('Could not save stats');
    }

    this.running = false;
    cancelAnimationFrame(this.rafId);
    this.inputSystem.detach();
  }

  private render(): void {
    const { ctx } = this;
    const W = this.state.canvasWidth;
    const H = this.state.canvasHeight;

    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, W, H);

    this.gameRenderer.render(ctx, this.state);
    this.renderCategory();
    this.renderWord();
    this.renderKeyboard();
    this.hudRenderer.render(ctx, this.state); // ← Add HUD
  }

  private reset(): void {
    const { word, category } = getRandomWord();

    this.state.word = word;
    this.state.category = category;
    this.state.guessedLetters.clear();
    this.state.wrongGuesses = [];
    this.state.phase = 'playing';
  }

  // ...existing methods...
}
```

---

### 5. Add Restart Key to InputSystem

**File:** `src/contexts/canvas2d/games/hangman/systems/InputSystem.ts`

```typescript
export class InputSystem {
  constructor(
    private state: HangmanState,
    private canvas: HTMLCanvasElement,
    private gameSystem: GameSystem,
    private onReset: () => void, // ← NEW: Restart callback
  ) {
    this.keyHandler = (e: KeyboardEvent) => this.onKey(e);
    this.clickHandler = (e: MouseEvent) => this.onClick(e);
  }

  private onKey(e: KeyboardEvent): void {
    const letter = e.key.toUpperCase();

    // Restart game
    if (e.key === ' ' || e.key === 'Enter') {
      if (this.state.phase !== 'playing') {
        this.onReset();
      }
      return;
    }

    // Guess letter
    if (ALPHABET.includes(letter)) {
      this.gameSystem.processGuess(this.state, letter);
    }
  }

  // ... rest unchanged ...
}
```

Wire the reset callback in engine:

```typescript
this.inputSystem = new InputSystem(
  this.state,
  canvas,
  this.gameSystem,
  () => this.reset(), // ← Pass reset method
);
```

---

## Test It

1. **Run:** `npm run dev`
2. **Guess letters**: Try to reveal the word
3. **Win**: Guess all letters → "🎉 You Win!" screen
4. **Lose**: Make 6 wrong guesses → "💀 Game Over" screen, word revealed
5. **Press Space**: New random word loads
6. **Check stats**: Wins/losses persist across sessions

---

## What You Learned

✅ Detect win conditions with `Array.every()`  
✅ Track and display game statistics  
✅ Organize word lists by category  
✅ Implement random selection  
✅ Persist data with localStorage  
✅ Create complete game loops (play → end → restart)

---

## Complete!

You've built a fully functional **Hangman** game! 🎉

**Source Code:** [`src/contexts/canvas2d/games/hangman/`](../../src/contexts/canvas2d/games/hangman/)

---

## Next Tutorial

→ [2048](../06-2048/README.md) — Learn grid movement, tile merging, and score animations
