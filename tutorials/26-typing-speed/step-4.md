# Step 4: Lives & Difficulty Scaling

**Goal:** Add 3 lives that are lost when words reach the bottom, and make the game progressively harder.

**Time:** ~15 minutes

---

## What You'll Build

- **Life system** -- start with 3 hearts, lose one each time a word reaches the danger zone
- **Game over** when all lives are lost
- **Difficulty scaling** -- spawn interval decreases and word speed increases over time
- **Heart display** in the HUD showing remaining lives
- **Pause support** with the P key

---

## Concepts

- **Life Penalty on Word Escape**: Instead of silently removing words at the bottom, deduct a life
- **Progressive Difficulty**: Both spawn interval and word speed scale with elapsed time using simple linear functions
- **Speed Multiplier**: `1 + elapsed * SPEED_INCREMENT` gradually increases all word speeds
- **Game Over State**: When `lives <= 0`, freeze all updates and show the game over screen

---

## Code

### 1. Update the Word System

**File:** `src/games/typing-speed/systems/WordSystem.ts`

Add life deduction for escaped words and difficulty scaling.

```typescript
import type { TypingState, FallingWord } from '../types';
import {
  INITIAL_SPAWN_INTERVAL,
  MIN_SPAWN_INTERVAL,
  BASE_WORD_SPEED,
  SPEED_INCREMENT,
  FONT_SIZE,
} from '../types';
import { WORD_LIST } from '../data/words';

export class WordSystem {
  update(state: TypingState, dt: number): void {
    if (!state.started || state.paused || state.gameOver) return;

    // Update spawn timer
    state.spawnTimer += dt;

    // Decrease spawn interval over time
    const elapsed = state.elapsedTime / 1000;
    state.spawnInterval = Math.max(
      MIN_SPAWN_INTERVAL,
      INITIAL_SPAWN_INTERVAL - elapsed * 15,
    );

    // Spawn new word
    if (state.spawnTimer >= state.spawnInterval) {
      state.spawnTimer = 0;
      this.spawnWord(state);
    }

    // Move words downward with speed multiplier
    const speedMultiplier = 1 + elapsed * SPEED_INCREMENT;
    for (const word of state.words) {
      word.y += word.speed * speedMultiplier * (dt / 1000);
    }

    // Check for words reaching the bottom -- deduct lives
    const margin = FONT_SIZE + 80;
    const fallen: FallingWord[] = [];
    const remaining: FallingWord[] = [];

    for (const word of state.words) {
      if (word.y >= state.canvasHeight - margin) {
        fallen.push(word);
      } else {
        remaining.push(word);
      }
    }

    for (const word of fallen) {
      state.lives -= 1;
      // If the fallen word was the active word, deselect it
      if (word === state.activeWord) {
        state.activeWord = null;
        state.currentInput = '';
      }
    }

    state.words = remaining;

    if (state.lives <= 0) {
      state.lives = 0;
      state.gameOver = true;
    }
  }

  spawnWord(state: TypingState): void {
    const text = WORD_LIST[Math.floor(Math.random() * WORD_LIST.length)].toLowerCase();
    const padding = 60;
    const maxX = state.canvasWidth - padding * 2;
    const x = padding + Math.random() * maxX;

    const elapsed = state.elapsedTime / 1000;
    const speedVariance = 0.7 + Math.random() * 0.6;
    const speed = (BASE_WORD_SPEED + elapsed * 0.5) * speedVariance;

    const word: FallingWord = {
      text,
      x,
      y: -FONT_SIZE,
      speed,
      typed: '',
    };

    state.words.push(word);
  }
}
```

**What's happening:**
- `spawnInterval` decreases by 15ms per second of gameplay, from 2000ms down to a minimum of 600ms. After 90 seconds, words spawn at maximum rate.
- `speedMultiplier` starts at 1.0 and grows by 0.003 per second. After 60 seconds it is 1.18, making words fall ~18% faster.
- Each word's base speed also increases slightly with elapsed time (`+ elapsed * 0.5`).
- Words that cross the danger line deduct one life each. If the active word is lost, we clear the input state.

---

### 2. Update the Input System

**File:** `src/games/typing-speed/systems/InputSystem.ts`

Add pause toggle and game over restart handling.

```typescript
import type { TypingState } from '../types';

export class InputSystem {
  private state: TypingState;
  private onType: (char: string) => void;
  private onBackspace: () => void;
  private onReset: () => void;
  private keyHandler: (e: KeyboardEvent) => void;

  constructor(
    state: TypingState,
    onType: (char: string) => void,
    onBackspace: () => void,
    onReset: () => void,
  ) {
    this.state = state;
    this.onType = onType;
    this.onBackspace = onBackspace;
    this.onReset = onReset;
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

    // Pause toggle
    if (e.key === 'p' || e.key === 'P') {
      if (s.started && !s.gameOver) {
        s.paused = !s.paused;
      }
      return;
    }

    // Game over -- restart
    if (s.gameOver) {
      if (e.key === ' ' || e.key === 'Enter') {
        this.onReset();
      }
      return;
    }

    if (s.paused) return;

    if (e.key === 'Backspace') {
      this.onBackspace();
      return;
    }

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
- The `P` key toggles `paused`. When paused, the word system stops updating and no input is processed.
- When `gameOver` is true, Space or Enter triggers the `onReset` callback.
- The constructor now accepts an `onReset` callback for game restart.

---

### 3. Update the HUD Renderer

**File:** `src/games/typing-speed/renderers/HUDRenderer.ts`

Add lives display and pause/game-over overlays.

```typescript
import type { TypingState } from '../types';
import { MAX_LIVES } from '../types';

export class HUDRenderer {
  render(ctx: CanvasRenderingContext2D, state: TypingState): void {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    // Top bar background
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, W, 44);

    ctx.textBaseline = 'middle';
    ctx.font = 'bold 14px monospace';

    // Score (center)
    ctx.fillStyle = '#00e676';
    ctx.textAlign = 'center';
    ctx.fillText(`Score: ${state.score}`, W / 2, 22);

    // Lives (right) -- hearts
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ef5350';
    let livesText = '';
    for (let i = 0; i < MAX_LIVES; i++) {
      livesText += i < state.lives ? '\u2764 ' : '\u2661 ';
    }
    ctx.fillText(livesText.trim(), W - 12, 22);

    // Words completed (left)
    ctx.fillStyle = '#81c784';
    ctx.textAlign = 'left';
    ctx.fillText(`Words: ${state.wordsCompleted}`, 12, 22);

    // Overlays
    if (state.gameOver) {
      this.drawGameOverOverlay(ctx, state, W, H);
    } else if (state.paused) {
      this.drawOverlay(ctx, W, H, 'PAUSED', 'Press P to resume', '#f59e0b');
    }
  }

  private drawOverlay(
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
    title: string,
    sub: string,
    color: string,
  ): void {
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(0, 0, W, H);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.font = `bold ${Math.min(56, W * 0.07)}px monospace`;
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 24;
    ctx.fillText(title, W / 2, H * 0.38);
    ctx.shadowBlur = 0;

    ctx.font = `${Math.min(18, W * 0.025)}px monospace`;
    ctx.fillStyle = '#aaa';
    ctx.fillText(sub, W / 2, H * 0.50);
  }

  private drawGameOverOverlay(
    ctx: CanvasRenderingContext2D,
    state: TypingState,
    W: number,
    H: number,
  ): void {
    ctx.fillStyle = 'rgba(0,0,0,0.8)';
    ctx.fillRect(0, 0, W, H);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.font = `bold ${Math.min(56, W * 0.07)}px monospace`;
    ctx.fillStyle = '#ef5350';
    ctx.shadowColor = '#ef5350';
    ctx.shadowBlur = 20;
    ctx.fillText('GAME OVER', W / 2, H * 0.28);
    ctx.shadowBlur = 0;

    ctx.font = `bold ${Math.min(22, W * 0.03)}px monospace`;
    ctx.fillStyle = '#00e676';
    ctx.fillText(`Score: ${state.score}`, W / 2, H * 0.40);

    ctx.font = `${Math.min(16, W * 0.022)}px monospace`;
    ctx.fillStyle = '#4fc3f7';
    ctx.fillText(`Words: ${state.wordsCompleted}`, W / 2, H * 0.48);

    ctx.font = `${Math.min(16, W * 0.022)}px monospace`;
    ctx.fillStyle = '#aaa';
    ctx.fillText('Press SPACE or ENTER to restart', W / 2, H * 0.58);
  }
}
```

**What's happening:**
- Lives are shown as filled hearts (remaining) and empty hearts (lost) using Unicode characters.
- The game over overlay displays the final score and words completed, with a prompt to restart.
- The pause overlay is a simple centered title with resume instructions.
- Font sizes use `Math.min` to scale gracefully on smaller screens.

---

### 4. Update the Engine

**File:** `src/games/typing-speed/TypingEngine.ts`

Add the reset callback and wire everything together.

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

    this.state = this.createInitialState(canvas.width, canvas.height);

    this.wordSystem = new WordSystem();
    this.typingSystem = new TypingSystem();
    this.gameRenderer = new GameRenderer();
    this.hudRenderer = new HUDRenderer();

    this.inputSystem = new InputSystem(
      this.state,
      (char: string) => this.typingSystem.handleType(this.state, char),
      () => this.typingSystem.handleBackspace(this.state),
      () => this.reset(),
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

  private reset(): void {
    const w = this.state.canvasWidth;
    const h = this.state.canvasHeight;
    const newState = this.createInitialState(w, h);
    newState.started = true;
    newState.startTime = performance.now();
    Object.assign(this.state, newState);

    this.wordSystem.spawnWord(this.state);
    this.wordSystem.spawnWord(this.state);
  }

  private createInitialState(width: number, height: number): TypingState {
    return {
      words: [],
      activeWord: null,
      currentInput: '',
      score: 0,
      lives: MAX_LIVES,
      gameOver: false,
      paused: false,
      started: false,
      totalTyped: 0,
      correctTyped: 0,
      wordsCompleted: 0,
      startTime: 0,
      elapsedTime: 0,
      spawnTimer: 0,
      spawnInterval: INITIAL_SPAWN_INTERVAL,
      baseSpeed: 40,
      canvasWidth: width,
      canvasHeight: height,
    };
  }
}
```

**What's happening:**
- `createInitialState` is extracted into its own method so `reset()` can reuse it cleanly.
- `reset()` creates fresh state, marks it as started, and re-spawns initial words.
- `Object.assign(this.state, newState)` replaces all properties in-place so the InputSystem's reference to `this.state` remains valid.

---

## Test It

1. **Run:** `npm run dev`
2. **Open:** the Typing Speed game
3. **Observe:**
   - Three red hearts appear in the top-right HUD
   - When a word reaches the danger zone, **a heart empties** and the word disappears
   - After losing all 3 hearts, the **GAME OVER** screen appears with your score
   - Press **Space** or **Enter** to restart with fresh lives
   - Press **P** to pause -- the game freezes and shows a pause overlay
   - Words spawn faster and fall faster as time goes on

---

## Challenges

**Easy:**
- Change `MAX_LIVES` to 5 for a more forgiving game.
- Change the heart symbols to a different indicator (e.g., "HP: 3/3").

**Medium:**
- Flash the screen border red when a life is lost.
- Add a brief screen shake effect when a word escapes.

**Hard:**
- Implement a "shield" power-up that occasionally falls like a word. Typing it restores one life.

---

## What You Learned

- Implementing a lives system with visual heart indicators
- Penalizing missed words by deducting lives
- Progressive difficulty through spawn interval and speed scaling
- Pause and game-over overlays with restart support
- Extracting state creation into a reusable factory method

**Next:** WPM, accuracy tracking, and final polish -- stats, high score, and start/game-over overlays!
