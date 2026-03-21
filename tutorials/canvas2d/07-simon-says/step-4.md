# Step 4: Polish - HUD, Scoring & Keyboard Controls

**Goal:** Add professional UI overlays, high score persistence, and keyboard shortcuts.

**Time:** ~20 minutes

---

## What You'll Build

**Final Features:**
- Top bar with Round | Phase | Best Score
- Start screen with title + high score
- Game over overlay with final score
- Keyboard shortcuts (Space, R, ESC, H)
- Audio feedback (optional but recommended)
- localStorage high score persistence

```
┌──────────────────────────────────┐
│ Round: 5 | WATCH... | Best: 12  │ ← HUD
├──────────────────────────────────┤
│                                   │
│         [Simon Says]              │
│         High Score: 12            │
│         Click to Start            │ ← Start Overlay
│                                   │
└──────────────────────────────────┘
```

---

## Concepts

- **HUD Rendering**: Non-intrusive UI overlays
- **localStorage**: Persist high scores across sessions
- **Keyboard Events**: Quality-of-life shortcuts
- **Web Audio API**: Simple tone generation (optional)

---

## Code

### 1. Create HUD Renderer

**File:** `src/contexts/canvas2d/games/simon-says/renderers/HUDRenderer.ts`

```typescript
import type { SimonState } from '../types';

export class HUDRenderer {
  render(ctx: CanvasRenderingContext2D, state: SimonState): void {
    this.renderTopBar(ctx, state);

    if (!state.started) {
      this.renderStartOverlay(ctx, state);
    } else if (state.phase === 'gameover') {
      this.renderGameOverOverlay(ctx, state);
    }
  }

  private renderTopBar(ctx: CanvasRenderingContext2D, state: SimonState): void {
    if (!state.started) return; // Hide during start screen

    const W = ctx.canvas.width;

    // Background bar
    ctx.fillStyle = 'rgba(26, 26, 46, 0.9)';
    ctx.fillRect(0, 0, W, 50);

    // Text styling
    ctx.fillStyle = '#4caf50';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    // Round number
    ctx.fillText(`Round: ${state.round}`, 20, 25);

    // Phase indicator
    ctx.textAlign = 'center';
    const phaseText =
      state.phase === 'showing' ? 'WATCH...' : state.phase === 'input' ? 'YOUR TURN' : 'GAME OVER';
    const phaseColor = state.phase === 'gameover' ? '#e53935' : '#4caf50';
    ctx.fillStyle = phaseColor;
    ctx.fillText(phaseText, W / 2, 25);

    // Best score
    ctx.fillStyle = '#4caf50';
    ctx.textAlign = 'right';
    ctx.fillText(`Best: ${state.highScore}`, W - 20, 25);
  }

  private renderStartOverlay(ctx: CanvasRenderingContext2D, state: SimonState): void {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    // Semi-transparent background
    ctx.fillStyle = 'rgba(15, 15, 26, 0.95)';
    ctx.fillRect(0, 0, W, H);

    // Title
    ctx.fillStyle = '#4caf50';
    ctx.font = 'bold 64px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Simon Says', W / 2, H / 2 - 80);

    // Subtitle
    ctx.font = '24px sans-serif';
    ctx.fillStyle = '#aaa';
    ctx.fillText('Repeat the color sequence!', W / 2, H / 2 - 30);

    // High score
    if (state.highScore > 0) {
      ctx.font = 'bold 20px sans-serif';
      ctx.fillStyle = '#fdd835';
      ctx.fillText(`🏆 High Score: ${state.highScore}`, W / 2, H / 2 + 20);
    }

    // Instructions
    ctx.font = '18px sans-serif';
    ctx.fillStyle = '#fff';
    ctx.fillText('Click or press SPACE to start', W / 2, H / 2 + 80);

    ctx.fillStyle = '#666';
    ctx.font = '14px sans-serif';
    ctx.fillText('R - Restart | ESC - Exit | H - Help', W / 2, H / 2 + 120);
  }

  private renderGameOverOverlay(ctx: CanvasRenderingContext2D, state: SimonState): void {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    // Semi-transparent background
    ctx.fillStyle = 'rgba(15, 15, 26, 0.85)';
    ctx.fillRect(0, 0, W, H);

    // Game Over text
    ctx.fillStyle = '#e53935';
    ctx.font = 'bold 64px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Game Over', W / 2, H / 2 - 60);

    // Final score
    const lastSuccessfulRound = state.round - 1;
    ctx.font = '32px sans-serif';
    ctx.fillStyle = '#fff';
    ctx.fillText(`You reached round ${lastSuccessfulRound}`, W / 2, H / 2);

    // High score indicator
    if (lastSuccessfulRound > state.highScore) {
      ctx.fillStyle = '#fdd835';
      ctx.font = 'bold 24px sans-serif';
      ctx.fillText('🎉 New High Score! 🎉', W / 2, H / 2 + 40);
    }

    // Restart prompt
    ctx.fillStyle = '#aaa';
    ctx.font = '20px sans-serif';
    ctx.fillText('Click or press SPACE to restart', W / 2, H / 2 + 100);
  }
}
```

---

### 2. Add Keyboard Controls to Input System

**File:** `src/contexts/canvas2d/games/simon-says/systems/InputSystem.ts`

Add keyboard handling:

```typescript
import type { SimonState, Color } from '../types';
import { INPUT_FLASH_DURATION } from '../types';

export class InputSystem {
  private canvas: HTMLCanvasElement;
  private boundOnClick: (e: MouseEvent) => void;
  private boundOnKey: (e: KeyboardEvent) => void;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.boundOnClick = (e: MouseEvent) => this.onClick(e);
    this.boundOnKey = (e: KeyboardEvent) => this.onKeyDown(e);
  }

  attach(): void {
    this.canvas.addEventListener('click', this.boundOnClick);
    window.addEventListener('keydown', this.boundOnKey);
  }

  detach(): void {
    this.canvas.removeEventListener('click', this.boundOnClick);
    window.removeEventListener('keydown', this.boundOnKey);
  }

  /** Map click coordinates to a color quadrant */
  getClickedColor(
    clickX: number,
    clickY: number,
    centerX: number,
    centerY: number,
    size: number
  ): Color | null {
    const dx = clickX - centerX;
    const dy = clickY - centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    const innerRadius = size * 0.18;
    if (dist < innerRadius) return null;

    const outerRadius = size * 0.707;
    if (dist > outerRadius) return null;

    if (dx < 0 && dy < 0) return 'red';
    if (dx >= 0 && dy < 0) return 'green';
    if (dx < 0 && dy >= 0) return 'blue';
    if (dx >= 0 && dy >= 0) return 'yellow';

    return null;
  }

  /** Handle click events */
  private onClick(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;

    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    const W = this.canvas.width;
    const H = this.canvas.height;
    const size = Math.min(W, H) * 0.35;
    const centerX = W / 2;
    const centerY = H / 2;

    const color = this.getClickedColor(clickX, clickY, centerX, centerY, size);

    if (color) {
      if (this.onColorClick) {
        this.onColorClick(color);
      }
    } else {
      // Click in center or outside → start/restart
      if (this.onStartRequest) {
        this.onStartRequest();
      }
    }
  }

  /** Handle keyboard shortcuts */
  private onKeyDown(e: KeyboardEvent): void {
    if (e.code === 'Space') {
      e.preventDefault();
      if (this.onStartRequest) {
        this.onStartRequest();
      }
    } else if (e.code === 'KeyR') {
      if (this.onRestartRequest) {
        this.onRestartRequest();
      }
    } else if (e.code === 'Escape') {
      if (this.onExitRequest) {
        this.onExitRequest();
      }
    } else if (e.code === 'KeyH') {
      if (this.onHelpRequest) {
        this.onHelpRequest();
      }
    }
  }

  // Callbacks (set by engine)
  onColorClick?: (color: Color) => void;
  onStartRequest?: () => void;
  onRestartRequest?: () => void;
  onExitRequest?: () => void;
  onHelpRequest?: () => void;
}
```

---

### 3. Update Game Engine

**File:** `src/contexts/canvas2d/games/simon-says/SimonEngine.ts`

```typescript
import type { SimonState, Color } from './types';
import { INPUT_FLASH_DURATION } from './types';
import { GameRenderer } from './renderers/GameRenderer';
import { HUDRenderer } from './renderers/HUDRenderer';
import { SequenceSystem } from './systems/SequenceSystem';
import { InputSystem } from './systems/InputSystem';

export class SimonEngine {
  private ctx: CanvasRenderingContext2D;
  private state: SimonState;
  private running: boolean;
  private rafId: number;
  private lastTime: number;
  private onExit: () => void;

  private gameRenderer: GameRenderer;
  private hudRenderer: HUDRenderer;
  private sequenceSystem: SequenceSystem;
  private inputSystem: InputSystem;

  constructor(canvas: HTMLCanvasElement, onExit: () => void) {
    this.ctx = canvas.getContext('2d')!;
    this.running = false;
    this.rafId = 0;
    this.lastTime = 0;
    this.onExit = onExit;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    this.sequenceSystem = new SequenceSystem();
    this.inputSystem = new InputSystem(canvas);

    const highScore = this.sequenceSystem.loadHighScore();

    this.state = {
      sequence: [],
      round: 0,
      currentStep: 0,
      phase: 'showing',
      started: false,
      highScore,
      activeColor: null,
      showTimer: 0,
      inGap: false,
      inputFlashTimer: 0,
    };

    this.gameRenderer = new GameRenderer();
    this.hudRenderer = new HUDRenderer();

    // Register input callbacks
    this.inputSystem.onColorClick = (color: Color) => this.handleColorClick(color);
    this.inputSystem.onStartRequest = () => this.handleStartRequest();
    this.inputSystem.onRestartRequest = () => this.handleRestart();
    this.inputSystem.onExitRequest = () => this.handleExit();
    this.inputSystem.onHelpRequest = () => this.handleHelp();
    this.inputSystem.attach();
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
  }

  private loop(): void {
    if (!this.running) return;

    const now = performance.now();
    const dt = now - this.lastTime;
    this.lastTime = now;

    this.update(dt);
    this.render();

    this.rafId = requestAnimationFrame(() => this.loop());
  }

  private update(dt: number): void {
    this.sequenceSystem.update(this.state, dt);
    this.updateInputFlash(dt);
  }

  private updateInputFlash(dt: number): void {
    if (this.state.inputFlashTimer > 0) {
      this.state.inputFlashTimer -= dt;
      if (this.state.inputFlashTimer <= 0) {
        this.state.inputFlashTimer = 0;
        this.state.activeColor = null;
      }
    }
  }

  private handleColorClick(color: Color): void {
    this.state.activeColor = color;
    this.state.inputFlashTimer = INPUT_FLASH_DURATION;

    const correct = this.sequenceSystem.verifyInput(this.state, color);

    if (!correct) {
      console.log('Game Over! Final Round:', this.state.round - 1);
    }
  }

  private handleStartRequest(): void {
    if (!this.state.started || this.state.phase === 'gameover') {
      this.sequenceSystem.startNewGame(this.state);
    }
  }

  private handleRestart(): void {
    this.sequenceSystem.startNewGame(this.state);
  }

  private handleExit(): void {
    this.onExit();
  }

  private handleHelp(): void {
    alert(
      'Simon Says - How to Play:\n\n' +
        '1. Watch the sequence of colors\n' +
        '2. Click the colors in the same order\n' +
        '3. Each round adds one more color\n' +
        '4. Speed increases as you progress\n\n' +
        'Controls:\n' +
        'SPACE - Start/Restart\n' +
        'R - Restart game\n' +
        'ESC - Exit to menu\n' +
        'H - Show this help'
    );
  }

  private render(): void {
    this.gameRenderer.render(this.ctx, this.state);
    this.hudRenderer.render(this.ctx, this.state); // Draw HUD last
  }
}
```

---

### 4. Update Platform Adapter

**File:** `src/contexts/canvas2d/games/simon-says/adapters/PlatformAdapter.ts`

```typescript
import type { GameInstance } from '@core/GameInterface';
import { SimonEngine } from '../SimonEngine';

export class PlatformAdapter implements GameInstance {
  private engine: SimonEngine;

  constructor(canvas: HTMLCanvasElement, onExit: () => void) {
    this.engine = new SimonEngine(canvas, onExit);
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

### 5. Optional: Add Audio Feedback

**File:** `src/contexts/canvas2d/games/simon-says/systems/AudioSystem.ts` (Optional)

```typescript
import type { Color } from '../types';

export class AudioSystem {
  private audioCtx: AudioContext | null;

  constructor() {
    this.audioCtx = null;
  }

  /** Initialize audio context (must be called after user interaction) */
  init(): void {
    if (!this.audioCtx) {
      this.audioCtx = new AudioContext();
    }
  }

  /** Play a tone for a color */
  playTone(color: Color, duration: number = 200): void {
    if (!this.audioCtx) this.init();
    if (!this.audioCtx) return;

    // Frequency mapping for each color
    const frequencies: Record<Color, number> = {
      red: 329.63, // E4
      green: 392, // G4
      blue: 261.63, // C4
      yellow: 440, // A4
    };

    const freq = frequencies[color];
    const now = this.audioCtx.currentTime;

    // Create oscillator
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.value = freq;

    // Envelope (fade out)
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + duration / 1000);

    osc.connect(gain);
    gain.connect(this.audioCtx.destination);

    osc.start(now);
    osc.stop(now + duration / 1000);
  }
}
```

To use audio, add to `SimonEngine`:
```typescript
private audioSystem: AudioSystem;

constructor(...) {
  // ...
  this.audioSystem = new AudioSystem();
}

private handleColorClick(color: Color): void {
  this.audioSystem.playTone(color); // Add this line
  // ... rest of the method
}
```

---

## Test It

1. **Run:** `npm run dev`
2. **Navigate:** Select "Simon Says"
3. **Test Start Screen:**
   - See title, high score, instructions
   - Press **SPACE** or click to start
4. **Test HUD:**
   - Top bar shows: Round | Phase | Best Score
   - Phase changes: "WATCH..." → "YOUR TURN"
5. **Test Game Over:**
   - Fail a round
   - See overlay with final score
   - Press **SPACE** to restart
6. **Test Keyboard:**
   - **R** → Restart game
   - **ESC** → Exit to menu
   - **H** → Show help dialog
7. **Test High Score:**
   - Beat your high score
   - Restart game
   - Verify high score persists

---

## What You Learned

✅ Create HUD overlays with semi-transparent backgrounds  
✅ Persist data with localStorage  
✅ Handle keyboard events for shortcuts  
✅ Use Web Audio API for sound effects (optional)  
✅ Coordinate multiple renderers (game + HUD)  
✅ Build professional UI feedback

---

## Congratulations! 🎉

You've built a complete Simon Says game with:
- ✅ Beautiful 4-color circular board
- ✅ Sequence generation with increasing difficulty
- ✅ Input validation and game over detection
- ✅ Professional HUD and overlays
- ✅ High score persistence
- ✅ Keyboard shortcuts
- ✅ Audio feedback (optional)

---

## Next Challenges

**Easy:**
- Add different difficulty modes (slow/fast/insane)
- Color-blind mode (different patterns instead of colors)
- Mobile touch support

**Medium:**
- Multiplayer mode (take turns)
- Practice mode (no game over, just watch/repeat)
- Custom color palettes

**Hard:**
- Leaderboard with backend API
- Replay system (save/share sequences)
- AI solver (show optimal play)

---

## What You Learned Overall

✅ Timer-based animations with delta time  
✅ State machines for game phases  
✅ Hit detection with polar coordinates  
✅ Sequential input validation  
✅ localStorage patterns  
✅ Keyboard event handling  
✅ Canvas rendering optimization  
✅ Professional UI/UX design

**Great job!** 🚀
