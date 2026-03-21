# Step 5: WPM, Accuracy & Polish

**Goal:** Add real-time WPM and accuracy tracking, a stats bar, high score persistence, and start/game-over overlays.

**Time:** ~15 minutes

---

## What You'll Build

- **WPM calculation** based on words completed divided by elapsed minutes
- **Accuracy percentage** tracking correct keystrokes vs total keystrokes
- **Stats bar** below the main HUD showing WPM, accuracy, and word count
- **High score** saved to localStorage
- **Start overlay** prompting "start typing to begin"
- **Detailed game-over overlay** with WPM, accuracy, and high score

---

## Concepts

- **WPM Formula**: `wordsCompleted / (elapsedTime / 60000)` -- words per minute of actual play
- **Accuracy Formula**: `(correctTyped / totalTyped) * 100` -- percentage of keystrokes that matched
- **localStorage Persistence**: Save high score as a string, parse it back on load
- **Overlay Layering**: Draw semi-transparent overlays on top of the game for start/pause/game-over screens

---

## Code

### 1. Final HUD Renderer

**File:** `src/contexts/canvas2d/games/typing-speed/renderers/HUDRenderer.ts`

Complete HUD with stats bar, start overlay, and detailed game-over screen.

```typescript
import type { TypingState } from '../types';
import { MAX_LIVES, HS_KEY } from '../types';

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

    // Lives (right)
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ef5350';
    let livesText = '';
    for (let i = 0; i < MAX_LIVES; i++) {
      livesText += i < state.lives ? '\u2764 ' : '\u2661 ';
    }
    ctx.fillText(livesText.trim(), W - 12, 22);

    // Stats bar
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 44, W, 28);

    ctx.font = '12px monospace';
    ctx.textBaseline = 'middle';
    const statY = 58;

    // WPM
    const wpm = this.calculateWPM(state);
    ctx.fillStyle = '#4fc3f7';
    ctx.textAlign = 'left';
    ctx.fillText(`WPM: ${wpm}`, 12, statY);

    // Accuracy
    const accuracy = this.calculateAccuracy(state);
    ctx.fillStyle = '#fff176';
    ctx.textAlign = 'center';
    ctx.fillText(`Accuracy: ${accuracy}%`, W / 2, statY);

    // Words completed
    ctx.fillStyle = '#81c784';
    ctx.textAlign = 'right';
    ctx.fillText(`Words: ${state.wordsCompleted}`, W - 12, statY);

    // Overlays
    if (!state.started) {
      this.drawOverlay(ctx, W, H, 'TYPING SPEED', 'Start typing to begin!', '#00897b');
    } else if (state.gameOver) {
      this.drawGameOverOverlay(ctx, state, W, H);
    } else if (state.paused) {
      this.drawOverlay(ctx, W, H, 'PAUSED', 'Press P to resume', '#f59e0b');
    }
  }

  private calculateWPM(state: TypingState): number {
    if (state.elapsedTime < 1000) return 0;
    const minutes = state.elapsedTime / 60000;
    return Math.round(state.wordsCompleted / Math.max(minutes, 0.01));
  }

  private calculateAccuracy(state: TypingState): number {
    if (state.totalTyped === 0) return 100;
    return Math.round((state.correctTyped / state.totalTyped) * 100);
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

    ctx.font = `${Math.min(13, W * 0.02)}px monospace`;
    ctx.fillStyle = '#555';
    ctx.fillText('Press [P] to Pause  |  Press [ESC] to exit', W / 2, H * 0.58);
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

    const wpm = this.calculateWPM(state);
    const accuracy = this.calculateAccuracy(state);

    // High score check
    let highScore = 0;
    try { highScore = parseInt(localStorage.getItem(HS_KEY) ?? '0', 10) || 0; } catch { /* noop */ }
    const isNewHigh = state.score > highScore;
    if (isNewHigh) {
      try { localStorage.setItem(HS_KEY, String(state.score)); } catch { /* noop */ }
      highScore = state.score;
    }

    ctx.font = `bold ${Math.min(22, W * 0.03)}px monospace`;
    ctx.fillStyle = '#00e676';
    ctx.fillText(`Score: ${state.score}`, W / 2, H * 0.40);

    if (isNewHigh) {
      ctx.font = `bold ${Math.min(16, W * 0.022)}px monospace`;
      ctx.fillStyle = '#ffeb3b';
      ctx.fillText('NEW HIGH SCORE!', W / 2, H * 0.44);
    } else {
      ctx.font = `${Math.min(14, W * 0.02)}px monospace`;
      ctx.fillStyle = '#888';
      ctx.fillText(`High Score: ${highScore}`, W / 2, H * 0.44);
    }

    ctx.font = `${Math.min(16, W * 0.022)}px monospace`;
    ctx.fillStyle = '#4fc3f7';
    ctx.fillText(
      `WPM: ${wpm}  |  Accuracy: ${accuracy}%  |  Words: ${state.wordsCompleted}`,
      W / 2,
      H * 0.52,
    );

    ctx.font = `${Math.min(16, W * 0.022)}px monospace`;
    ctx.fillStyle = '#aaa';
    ctx.fillText('Press SPACE or ENTER to restart', W / 2, H * 0.62);

    ctx.font = `${Math.min(13, W * 0.02)}px monospace`;
    ctx.fillStyle = '#555';
    ctx.fillText('Press [ESC] to exit', W / 2, H * 0.68);
  }
}
```

**What's happening:**
- The stats bar shows live WPM, accuracy, and words completed below the main HUD bar.
- WPM is calculated as `wordsCompleted / minutes`. It starts at 0 and updates in real-time.
- The game-over screen checks localStorage for a high score and displays "NEW HIGH SCORE!" if beaten.
- The start overlay tells the player to begin typing. The first keypress starts the timer.

---

### 2. Final Engine

**File:** `src/contexts/canvas2d/games/typing-speed/TypingEngine.ts`

Complete engine with start screen, ESC to exit, and high score.

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
  private onExit: () => void;

  private inputSystem: InputSystem;
  private wordSystem: WordSystem;
  private typingSystem: TypingSystem;
  private gameRenderer: GameRenderer;
  private hudRenderer: HUDRenderer;
  private resizeHandler: () => void;

  constructor(canvas: HTMLCanvasElement, onExit: () => void) {
    this.ctx = canvas.getContext('2d')!;
    this.onExit = onExit;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    this.state = this.createInitialState(canvas.width, canvas.height);

    this.wordSystem = new WordSystem();
    this.typingSystem = new TypingSystem();
    this.gameRenderer = new GameRenderer();
    this.hudRenderer = new HUDRenderer();

    this.inputSystem = new InputSystem(
      this.state,
      (char: string) => this.handleType(char),
      () => this.handleBackspace(),
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

    this.render();
    this.rafId = requestAnimationFrame(() => this.loop());
  }

  private render(): void {
    this.gameRenderer.render(this.ctx, this.state);
    this.hudRenderer.render(this.ctx, this.state);
  }

  private handleType(char: string): void {
    this.typingSystem.handleType(this.state, char);
  }

  private handleBackspace(): void {
    this.typingSystem.handleBackspace(this.state);
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

---

### 3. Create the Entry Point

**File:** `src/contexts/canvas2d/games/typing-speed/index.ts`

```typescript
import { TypingEngine } from './TypingEngine';

export function createTypingSpeed(canvas: HTMLCanvasElement, onExit: () => void): { destroy: () => void } {
  const engine = new TypingEngine(canvas, onExit);
  engine.start();
  return { destroy: () => engine.destroy() };
}
```

---

## Test It

1. **Run:** `npm run dev`
2. **Open:** the Typing Speed game
3. **Observe:**
   - **Start screen** shows "TYPING SPEED" with "Start typing to begin!"
   - Type any letter to start -- words begin falling, timer starts
   - The **stats bar** shows live WPM, accuracy percentage, and words completed
   - WPM increases as you type faster; accuracy drops if you make mistakes
   - Lose all 3 lives -- the **game over screen** shows your score, WPM, accuracy, and high score
   - If you beat your high score, a yellow "NEW HIGH SCORE!" message appears
   - Press **Space/Enter** to restart, **P** to pause, **ESC** to exit

---

## Challenges

**Easy:**
- Display the elapsed time in the stats bar formatted as `MM:SS`.
- Change the start overlay color theme.

**Medium:**
- Add a "streak" counter that tracks consecutive words completed without a miss.
- Show a brief animation when beating the high score.

**Hard:**
- Implement difficulty modes (Easy/Medium/Hard) that adjust base speed and spawn interval.
- Add a leaderboard that stores the top 5 scores in localStorage.

---

## What You Learned

- Calculating WPM from words completed and elapsed time
- Tracking accuracy as a ratio of correct to total keystrokes
- Persisting high scores with localStorage
- Building layered overlays for start, pause, and game-over states
- Creating a complete, polished typing game with progressive difficulty

**Congratulations!** You have built a complete Typing Speed game with falling words, auto-targeting, scoring, lives, difficulty scaling, WPM tracking, accuracy stats, and high score persistence.

**Next game:** [Rhythm Tap](../27-rhythm-tap/step-1.md) -- tap circles in time as rings shrink!
