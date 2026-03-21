# Step 2: Keyboard Input & Word Targeting

**Goal:** Capture keyboard input and automatically target the closest matching word.

**Time:** ~15 minutes

---

## What You'll Build

- **Keyboard listener** that captures A-Z key presses
- **Auto-targeting** that locks onto the closest word (to the bottom) matching the typed letter
- **Active word highlight** with a cyan glow and background pill
- **Typed-character coloring** showing green for typed letters and white for remaining
- **Backspace support** to correct mistakes
- **Input bar** at the bottom showing what you are currently typing

---

## Concepts

- **Event-Driven Input**: Listen for `keydown` and filter to single alphabetic characters
- **Auto-Target Selection**: When no word is active, find the word closest to the bottom whose first letter matches the key pressed
- **Progressive Matching**: Each subsequent key press must match the next untyped character in the active word
- **Visual Feedback**: Split the word into typed (green) and remaining (white) portions using `measureText` for precise positioning

---

## Code

### 1. Create the Typing System

**File:** `src/contexts/canvas2d/games/typing-speed/systems/TypingSystem.ts`

Handles character matching, word targeting, and backspace logic.

```typescript
import type { TypingState, FallingWord } from '../types';

export class TypingSystem {
  handleType(state: TypingState, char: string): void {
    state.totalTyped += 1;

    // If we have an active word, try to continue typing it
    if (state.activeWord) {
      const nextIndex = state.activeWord.typed.length;
      const expected = state.activeWord.text[nextIndex];

      if (expected === char) {
        state.activeWord.typed += char;
        state.currentInput += char;
        state.correctTyped += 1;
      } else {
        // Wrong letter -- try to find a new matching word instead
        const newTarget = this.findMatchingWord(state, char);
        if (newTarget) {
          // Reset old active word progress
          state.activeWord.typed = '';
          state.activeWord = newTarget;
          state.activeWord.typed = char;
          state.currentInput = char;
          state.correctTyped += 1;
        }
        // If no match found, it counts as a miss (totalTyped already incremented)
      }
    } else {
      // No active word -- find one that starts with this character
      const target = this.findMatchingWord(state, char);
      if (target) {
        state.activeWord = target;
        state.activeWord.typed = char;
        state.currentInput = char;
        state.correctTyped += 1;
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
    // Find the closest word to the bottom that starts with the typed character
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
}
```

**What's happening:**
- `handleType` first checks if there is an active word. If the next expected character matches, progress advances.
- If the typed character does not match the active word, we search for a *different* word starting with that character. This lets the player switch targets naturally.
- `findMatchingWord` picks the word closest to the bottom (highest `y`) that starts with the typed character and has not been partially typed yet. This is the most urgent word to destroy.
- Backspace removes the last typed character. If the word is fully un-typed, it becomes deselected.

---

### 2. Create the Input System

**File:** `src/contexts/canvas2d/games/typing-speed/systems/InputSystem.ts`

Listens for keyboard events and routes them to the typing system.

```typescript
import type { TypingState } from '../types';

export class InputSystem {
  private state: TypingState;
  private onType: (char: string) => void;
  private onBackspace: () => void;
  private keyHandler: (e: KeyboardEvent) => void;

  constructor(
    state: TypingState,
    onType: (char: string) => void,
    onBackspace: () => void,
  ) {
    this.state = state;
    this.onType = onType;
    this.onBackspace = onBackspace;
    this.keyHandler = (e: KeyboardEvent) => this.handleKey(e);
  }

  attach(): void {
    window.addEventListener('keydown', this.keyHandler);
  }

  detach(): void {
    window.removeEventListener('keydown', this.keyHandler);
  }

  private handleKey(e: KeyboardEvent): void {
    const s = this.state;
    if (s.paused || s.gameOver) return;

    if (e.key === 'Backspace') {
      this.onBackspace();
      return;
    }

    // Only accept single alphabetic characters
    if (e.key.length === 1 && /^[a-zA-Z]$/.test(e.key)) {
      if (!s.started) {
        s.started = true;
        s.startTime = performance.now();
      }
      this.onType(e.key.toLowerCase());
    }
  }
}
```

**What's happening:**
- We filter to single alphabetic characters using a regex. This ignores special keys like Shift, Ctrl, etc.
- All input is lowercased since our word bank is lowercase.
- Backspace is handled as a separate action.
- If the game has not started yet, the first letter press starts it and records `startTime`.

---

### 3. Update the Game Renderer

**File:** `src/contexts/canvas2d/games/typing-speed/renderers/GameRenderer.ts`

Add active-word highlighting and typed-character coloring.

```typescript
import type { TypingState, FallingWord } from '../types';
import { FONT_SIZE } from '../types';

export class GameRenderer {
  render(ctx: CanvasRenderingContext2D, state: TypingState): void {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    // Dark background
    ctx.fillStyle = '#0a0e17';
    ctx.fillRect(0, 0, W, H);

    // Subtle horizontal grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.02)';
    ctx.lineWidth = 1;
    for (let y = 0; y < H; y += 60) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }

    // Draw falling words
    for (const word of state.words) {
      this.drawWord(ctx, word, word === state.activeWord);
    }

    // Danger zone at the bottom
    const gradient = ctx.createLinearGradient(0, H - 80, 0, H);
    gradient.addColorStop(0, 'rgba(255,0,0,0)');
    gradient.addColorStop(1, 'rgba(255,0,0,0.12)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, H - 80, W, 80);

    // Danger line
    ctx.strokeStyle = 'rgba(255,60,60,0.3)';
    ctx.lineWidth = 1;
    ctx.setLineDash([8, 4]);
    ctx.beginPath();
    ctx.moveTo(0, H - 80);
    ctx.lineTo(W, H - 80);
    ctx.stroke();
    ctx.setLineDash([]);

    // Input bar at bottom
    this.drawInputBar(ctx, state, W, H);
  }

  private drawWord(ctx: CanvasRenderingContext2D, word: FallingWord, isActive: boolean): void {
    const len = word.text.length;
    const color = this.getWordColor(len);

    ctx.font = `bold ${FONT_SIZE}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Glow effect for active word
    if (isActive) {
      ctx.shadowColor = '#00e5ff';
      ctx.shadowBlur = 16;

      // Draw highlight background pill
      const textWidth = ctx.measureText(word.text).width;
      ctx.fillStyle = 'rgba(0,229,255,0.08)';
      ctx.beginPath();
      ctx.roundRect(
        word.x - textWidth / 2 - 8,
        word.y - FONT_SIZE / 2 - 4,
        textWidth + 16,
        FONT_SIZE + 8,
        6,
      );
      ctx.fill();
    }

    // Draw typed vs remaining portions
    if (word.typed.length > 0) {
      const typedText = word.text.slice(0, word.typed.length);
      const remainText = word.text.slice(word.typed.length);

      const fullWidth = ctx.measureText(word.text).width;
      const typedWidth = ctx.measureText(typedText).width;
      const startX = word.x - fullWidth / 2;

      ctx.textAlign = 'left';

      // Typed portion -- bright green
      ctx.fillStyle = '#00e676';
      ctx.fillText(typedText, startX, word.y);

      // Remaining portion
      ctx.fillStyle = isActive ? '#ffffff' : color;
      ctx.fillText(remainText, startX + typedWidth, word.y);
    } else {
      ctx.fillStyle = color;
      ctx.fillText(word.text, word.x, word.y);
    }

    ctx.shadowBlur = 0;
  }

  private drawInputBar(ctx: CanvasRenderingContext2D, state: TypingState, W: number, H: number): void {
    if (!state.started || state.gameOver || state.paused) return;

    const barH = 44;
    const barY = H - barH;

    ctx.fillStyle = 'rgba(0,0,0,0.8)';
    ctx.fillRect(0, barY, W, barH);

    ctx.strokeStyle = 'rgba(0,229,255,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, barY);
    ctx.lineTo(W, barY);
    ctx.stroke();

    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (state.currentInput.length > 0) {
      ctx.fillStyle = '#00e5ff';
      ctx.fillText(state.currentInput, W / 2, barY + barH / 2);

      // Blinking cursor
      const inputW = ctx.measureText(state.currentInput).width;
      if (Math.floor(performance.now() / 500) % 2 === 0) {
        ctx.fillStyle = '#00e5ff';
        ctx.fillRect(W / 2 + inputW / 2 + 2, barY + 10, 2, barH - 20);
      }
    } else {
      ctx.fillStyle = '#555';
      ctx.fillText('Type to destroy words...', W / 2, barY + barH / 2);
    }
  }

  private getWordColor(length: number): string {
    if (length <= 3) return '#4fc3f7';
    if (length <= 4) return '#81c784';
    if (length <= 5) return '#fff176';
    if (length <= 6) return '#ffb74d';
    return '#ef5350';
  }
}
```

**What's happening:**
- The active word gets a cyan glow (`shadowBlur = 16`) and a translucent background pill drawn with `roundRect`.
- Typed characters are rendered in bright green (`#00e676`), remaining characters in white (if active) or the default difficulty color.
- The input bar at the bottom shows what you are currently typing with a blinking cursor. If empty, it displays a placeholder prompt.
- We use `measureText` to calculate exact pixel widths for splitting the word into colored portions.

---

### 4. Update the Engine

**File:** `src/contexts/canvas2d/games/typing-speed/TypingEngine.ts`

Wire in the input system and typing system.

```typescript
import type { TypingState } from './types';
import { MAX_LIVES, INITIAL_SPAWN_INTERVAL } from './types';
import { InputSystem } from './systems/InputSystem';
import { WordSystem } from './systems/WordSystem';
import { TypingSystem } from './systems/TypingSystem';
import { GameRenderer } from './renderers/GameRenderer';

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

    // Spawn initial words
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
    this.rafId = requestAnimationFrame(() => this.loop());
  }
}
```

**What's happening:**
- The `InputSystem` is constructed with two callbacks: one for character input and one for backspace.
- Both callbacks delegate to `TypingSystem` methods, passing the current state.
- `elapsedTime` is updated each frame for WPM calculations in later steps.

---

## Test It

1. **Run:** `npm run dev`
2. **Open:** the Typing Speed game
3. **Observe:**
   - Words fall from the top as before
   - **Type the first letter of a word** -- it highlights with a cyan glow and the first letter turns green
   - **Continue typing** -- more letters turn green as you match them
   - **Press Backspace** -- un-types the last character
   - **Type a different letter** -- switches to a different matching word automatically
   - The input bar at the bottom shows your current input with a blinking cursor

---

## Challenges

**Easy:**
- Change the active word glow color from cyan to purple.
- Make the typed portion use a different color (e.g., yellow instead of green).

**Medium:**
- Add a subtle scale-up animation when a word first becomes active.
- Display the target word's full text in the input bar alongside what you have typed.

**Hard:**
- When the player types a wrong letter, briefly flash the active word red before allowing re-targeting.

---

## What You Learned

- Capturing keyboard events and filtering to alphabetic characters
- Auto-targeting the most urgent word based on proximity to the danger zone
- Progressive character matching with visual feedback
- Splitting text rendering into colored portions using `measureText`
- Building a bottom input bar with blinking cursor

**Next:** Word completion and scoring -- destroy typed words and earn points!
