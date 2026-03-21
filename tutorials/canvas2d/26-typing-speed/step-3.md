# Step 3: Word Completion & Scoring

**Goal:** Destroy fully-typed words, earn points based on word length, and display the score.

**Time:** ~15 minutes

---

## What You'll Build

- **Word completion** -- when all characters are typed, the word is removed from the screen
- **Length-based scoring** -- longer words are worth more points (length x 10)
- **Score display** in a top HUD bar
- **Words completed counter** tracking how many words you have destroyed

---

## Concepts

- **Completion Detection**: Compare `typed.length` to `text.length` after each keystroke
- **Splice Removal**: Remove the completed word from the array by index
- **Score Formula**: `word.text.length * 10` rewards tackling harder (longer) words
- **HUD Overlay**: A semi-transparent bar at the top of the canvas for persistent stats

---

## Code

### 1. Update the Typing System

**File:** `src/contexts/canvas2d/games/typing-speed/systems/TypingSystem.ts`

Add word completion logic with scoring.

```typescript
import type { TypingState, FallingWord } from '../types';

export class TypingSystem {
  handleType(state: TypingState, char: string): void {
    state.totalTyped += 1;

    if (state.activeWord) {
      const nextIndex = state.activeWord.typed.length;
      const expected = state.activeWord.text[nextIndex];

      if (expected === char) {
        state.activeWord.typed += char;
        state.currentInput += char;
        state.correctTyped += 1;

        // Check if word is completed
        if (state.activeWord.typed.length === state.activeWord.text.length) {
          this.completeWord(state, state.activeWord);
        }
      } else {
        const newTarget = this.findMatchingWord(state, char);
        if (newTarget) {
          state.activeWord.typed = '';
          state.activeWord = newTarget;
          state.activeWord.typed = char;
          state.currentInput = char;
          state.correctTyped += 1;

          // Check single-letter words
          if (state.activeWord.typed.length === state.activeWord.text.length) {
            this.completeWord(state, state.activeWord);
          }
        }
      }
    } else {
      const target = this.findMatchingWord(state, char);
      if (target) {
        state.activeWord = target;
        state.activeWord.typed = char;
        state.currentInput = char;
        state.correctTyped += 1;

        if (state.activeWord.typed.length === state.activeWord.text.length) {
          this.completeWord(state, state.activeWord);
        }
      }
    }
  }

  handleBackspace(state: TypingState): void {
    if (state.activeWord && state.activeWord.typed.length > 0) {
      state.activeWord.typed = state.activeWord.typed.slice(0, -1);
      state.currentInput = state.currentInput.slice(0, -1);

      if (state.activeWord.typed.length === 0) {
        state.activeWord = null;
        state.currentInput = '';
      }
    }
  }

  private findMatchingWord(state: TypingState, char: string): FallingWord | null {
    let best: FallingWord | null = null;
    let bestY = -Infinity;

    for (const word of state.words) {
      if (word === state.activeWord) continue;
      if (word.text[0] === char && word.typed.length === 0) {
        if (word.y > bestY) {
          bestY = word.y;
          best = word;
        }
      }
    }

    return best;
  }

  private completeWord(state: TypingState, word: FallingWord): void {
    const lengthBonus = word.text.length;
    state.score += lengthBonus * 10;
    state.wordsCompleted += 1;

    // Remove the word from the active list
    const idx = state.words.indexOf(word);
    if (idx !== -1) {
      state.words.splice(idx, 1);
    }

    state.activeWord = null;
    state.currentInput = '';
  }
}
```

**What's happening:**
- After every character match, we check if `typed.length === text.length`. If so, the word is complete.
- `completeWord` adds `length * 10` to the score (a 7-letter word = 70 points) and increments `wordsCompleted`.
- The word is removed from the `words` array using `splice`, and `activeWord` is reset to `null` so the player can target a new word.
- We also check for completion on single-letter words and after switching targets.

---

### 2. Add HUD Rendering

**File:** `src/contexts/canvas2d/games/typing-speed/renderers/HUDRenderer.ts`

Display score and words completed in a top bar.

```typescript
import type { TypingState } from '../types';

export class HUDRenderer {
  render(ctx: CanvasRenderingContext2D, state: TypingState): void {
    const W = ctx.canvas.width;

    // Top bar background
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, W, 44);

    ctx.textBaseline = 'middle';
    ctx.font = 'bold 14px monospace';

    // Score (center)
    ctx.fillStyle = '#00e676';
    ctx.textAlign = 'center';
    ctx.fillText(`Score: ${state.score}`, W / 2, 22);

    // Words completed (right)
    ctx.fillStyle = '#81c784';
    ctx.textAlign = 'right';
    ctx.fillText(`Words: ${state.wordsCompleted}`, W - 12, 22);
  }
}
```

**What's happening:**
- A semi-transparent black bar across the top provides contrast for the HUD text.
- Score is centered in green, words completed count is on the right.
- The font is bold monospace at 14px -- readable but unobtrusive.

---

### 3. Update the Engine

**File:** `src/contexts/canvas2d/games/typing-speed/TypingEngine.ts`

Add the HUD renderer to the render pipeline.

```typescript
import type { TypingState } from './types';
import { MAX_LIVES, INITIAL_SPAWN_INTERVAL } from './types';
import { InputSystem } from './systems/InputSystem';
import { WordSystem } from './systems/WordSystem';
import { TypingSystem } from './systems/TypingSystem';
import { GameRenderer } from './renderers/GameRenderer';
import { HUDRenderer } from './renderers/HUDRenderer';

export class TypingEngine {
  private ctx: CanvasRenderingContext2D;
  private state: TypingState;
  private running = false;
  private rafId = 0;
  private lastTime = 0;

  private inputSystem: InputSystem;
  private wordSystem: WordSystem;
  private typingSystem: TypingSystem;
  private gameRenderer: GameRenderer;
  private hudRenderer: HUDRenderer;
  private resizeHandler: () => void;

  constructor(canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    this.state = {
      words: [],
      activeWord: null,
      currentInput: '',
      score: 0,
      lives: MAX_LIVES,
      gameOver: false,
      paused: false,
      started: true,
      totalTyped: 0,
      correctTyped: 0,
      wordsCompleted: 0,
      startTime: performance.now(),
      elapsedTime: 0,
      spawnTimer: 0,
      spawnInterval: INITIAL_SPAWN_INTERVAL,
      baseSpeed: 40,
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
    };

    this.wordSystem = new WordSystem();
    this.typingSystem = new TypingSystem();
    this.gameRenderer = new GameRenderer();
    this.hudRenderer = new HUDRenderer();

    this.inputSystem = new InputSystem(
      this.state,
      (char: string) => this.typingSystem.handleType(this.state, char),
      () => this.typingSystem.handleBackspace(this.state),
    );

    this.resizeHandler = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      this.state.canvasWidth = canvas.width;
      this.state.canvasHeight = canvas.height;
    };

    this.inputSystem.attach();
    window.addEventListener('resize', this.resizeHandler);

    this.wordSystem.spawnWord(this.state);
    this.wordSystem.spawnWord(this.state);
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
    const dt = Math.min(now - this.lastTime, 100);
    this.lastTime = now;

    if (this.state.started && !this.state.paused && !this.state.gameOver) {
      this.state.elapsedTime = now - this.state.startTime;
      this.wordSystem.update(this.state, dt);
    }

    this.gameRenderer.render(this.ctx, this.state);
    this.hudRenderer.render(this.ctx, this.state);

    this.rafId = requestAnimationFrame(() => this.loop());
  }
}
```

---

## Test It

1. **Run:** `npm run dev`
2. **Open:** the Typing Speed game
3. **Observe:**
   - Type a word completely -- it **disappears** from the screen
   - The **Score** in the HUD increases (e.g., typing "the" = 30 points, "about" = 50 points)
   - The **Words** counter increments with each completed word
   - After completing a word, the input bar clears and you can target a new word immediately

**Try completing several words rapidly.** The score should climb quickly for longer words.

---

## Challenges

**Easy:**
- Change the scoring formula to `length * 15` for higher scores.
- Display the score with comma separators (e.g., `1,500`).

**Medium:**
- Add a brief green flash effect on the screen when a word is completed.
- Show "+70" floating text at the word's last position that fades upward.

**Hard:**
- Implement a combo system: completing words within 2 seconds of each other increases a multiplier that boosts score.

---

## What You Learned

- Detecting word completion by comparing typed and full text lengths
- Removing completed entities from an array with `splice`
- Length-based scoring that rewards tackling harder targets
- Rendering a persistent HUD overlay with game statistics
- Resetting input state after word completion

**Next:** Lives and difficulty scaling -- lose lives when words escape, and watch the game speed up over time!
