# Step 2: Sequence Generation & Showing Phase

**Goal:** Generate random color sequences and animate them with increasing speed.

**Time:** ~20 minutes

---

## What You'll Build

The game now plays a sequence of colors, flashing each one in order:

```
Round 1: RED → (150ms gap) → Game waits for input
Round 2: RED → GREEN → Game waits for input
Round 3: RED → GREEN → BLUE → ...

Speed increases each round (600ms → 570ms → 540ms...)
```

---

## Concepts

- **Sequence Generation**: Random color arrays
- **Timer-Based Animation**: Use delta time (dt) to advance timers
- **State Machine**: Track showing phase, gaps, and transitions
- **Flash Duration Formula**: Speed increases with difficulty

---

## Code

### 1. Create Sequence System

**File:** `src/contexts/canvas2d/games/simon-says/systems/SequenceSystem.ts`

```typescript
import type { SimonState, Color } from '../types';
import {
  COLORS,
  BASE_FLASH_DURATION,
  MIN_FLASH_DURATION,
  FLASH_REDUCTION_PER_ROUND,
  GAP_DURATION,
  HS_KEY,
} from '../types';

export class SequenceSystem {
  /** Calculate flash duration based on round (decreases each round) */
  getFlashDuration(round: number): number {
    const duration = BASE_FLASH_DURATION - (round - 1) * FLASH_REDUCTION_PER_ROUND;
    return Math.max(MIN_FLASH_DURATION, duration);
  }

  /** Add a random color to the sequence */
  extendSequence(state: SimonState): void {
    const randomColor = COLORS[Math.floor(Math.random() * COLORS.length)];
    state.sequence.push(randomColor);
    state.round = state.sequence.length;
    state.currentStep = 0;
    state.phase = 'showing';
    state.showTimer = 0;
    state.inGap = false;
  }

  /** Initialize new game with first color */
  startNewGame(state: SimonState): void {
    state.sequence = [];
    state.round = 0;
    state.currentStep = 0;
    state.started = true;
    state.phase = 'showing';
    state.activeColor = null;
    state.showTimer = 0;
    state.inGap = false;

    // Add first color
    this.extendSequence(state);
  }

  /** Main update loop - handles showing phase animation */
  update(state: SimonState, dt: number): void {
    if (state.phase !== 'showing') return;

    const flashDuration = this.getFlashDuration(state.round);

    state.showTimer += dt;

    if (!state.inGap) {
      // Currently showing a color
      if (state.showTimer >= flashDuration) {
        // Flash complete → enter gap
        state.activeColor = null;
        state.showTimer = 0;
        state.inGap = true;
      } else {
        // Show current color
        state.activeColor = state.sequence[state.currentStep];
      }
    } else {
      // In gap between flashes
      if (state.showTimer >= GAP_DURATION) {
        // Gap complete → move to next color
        state.currentStep++;
        state.showTimer = 0;
        state.inGap = false;

        // Check if sequence complete
        if (state.currentStep >= state.sequence.length) {
          // All colors shown → switch to input phase
          state.phase = 'input';
          state.currentStep = 0;
          state.activeColor = null;
        }
      }
    }
  }

  /** Load high score from localStorage */
  loadHighScore(): number {
    try {
      return parseInt(localStorage.getItem(HS_KEY) ?? '0', 10) || 0;
    } catch (e) {
      return 0;
    }
  }

  /** Save high score to localStorage */
  saveHighScore(state: SimonState): void {
    const lastSuccessfulRound = state.round - 1; // Player failed on current round
    if (lastSuccessfulRound > state.highScore) {
      state.highScore = lastSuccessfulRound;
      try {
        localStorage.setItem(HS_KEY, String(state.highScore));
      } catch (e) {
        console.warn('Could not save high score');
      }
    }
  }
}
```

**Key Logic:**
- **Flash Duration**: Starts at 600ms, decreases by 30ms per round, minimum 200ms
- **Dual Timer**: Alternates between showing (`inGap = false`) and silence (`inGap = true`)
- **Sequence Loop**: Shows each color → gap → next color → ... → input phase

---

### 2. Update Game Engine with deltaTime

**File:** `src/contexts/canvas2d/games/simon-says/SimonEngine.ts`

```typescript
import type { SimonState } from './types';
import { GameRenderer } from './renderers/GameRenderer';
import { SequenceSystem } from './systems/SequenceSystem';

export class SimonEngine {
  private ctx: CanvasRenderingContext2D;
  private state: SimonState;
  private running: boolean;
  private rafId: number;
  private lastTime: number;

  private gameRenderer: GameRenderer;
  private sequenceSystem: SequenceSystem;

  constructor(canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
    this.running = false;
    this.rafId = 0;
    this.lastTime = 0;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    this.sequenceSystem = new SequenceSystem();

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

    // Register click to start (for now, just console log)
    canvas.addEventListener('click', () => {
      if (!this.state.started) {
        this.sequenceSystem.startNewGame(this.state);
      }
    });
  }

  start(): void {
    this.running = true;
    this.lastTime = performance.now();
    this.loop();
  }

  destroy(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
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
    // Update sequence system (handles showing phase)
    this.sequenceSystem.update(this.state, dt);
  }

  private render(): void {
    this.gameRenderer.render(this.ctx, this.state);
  }
}
```

**Changes:**
- Added `lastTime` for delta time calculation
- Added `sequenceSystem` instance
- Click listener starts game
- `update()` method calls `sequenceSystem.update()` with dt

---

### 3. Add Phase Indicator to Renderer

**File:** `src/contexts/canvas2d/games/simon-says/renderers/GameRenderer.ts`

Update the `renderCenterCircle()` method to show current phase:

```typescript
private renderCenterCircle(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  size: number,
  state: SimonState
): void {
  const radius = size * 0.18;

  // Circle background
  ctx.fillStyle = '#1a1a2e';
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fill();

  // Border
  ctx.strokeStyle = '#4caf50';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Text content
  ctx.fillStyle = '#4caf50';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  if (!state.started) {
    // Start prompt
    ctx.font = '20px sans-serif';
    ctx.fillText('Click to', centerX, centerY - 15);
    ctx.fillText('Start', centerX, centerY + 10);
  } else if (state.phase === 'gameover') {
    // Game over
    ctx.fillStyle = '#e53935';
    ctx.font = 'bold 32px sans-serif';
    ctx.fillText('✗', centerX, centerY);
  } else {
    // Show round number
    ctx.font = 'bold 32px sans-serif';
    ctx.fillText(String(state.round), centerX, centerY);

    // Show phase indicator below round number
    ctx.font = '14px sans-serif';
    ctx.fillStyle = '#aaa';
    const phaseText = state.phase === 'showing' ? 'WATCH...' : 'YOUR TURN';
    ctx.fillText(phaseText, centerX, centerY + 30);
  }
}
```

---

## Test It

1. **Run:** `npm run dev`
2. **Navigate:** Select "Simon Says"
3. **Click:** Click the center circle to start
4. **Observe:**
   - **Round 1**: One color flashes (e.g., RED)
   - **Round 2**: Two colors flash in sequence
   - **Round 3**: Three colors...
   - **Speed**: Flashes get faster each round
5. **Timing:**
   - Each flash: 600ms (Round 1), 570ms (Round 2), 540ms (Round 3)...
   - Gap between flashes: 150ms
6. **Phase Indicator**: "WATCH..." during sequence, "YOUR TURN" after

---

## How It Works

### Timing Diagram

```
Round 1 (600ms flash):
┌─────────────┬──────┬─────────────┐
│ RED (flash) │ GAP  │ "YOUR TURN" │
│   600ms     │ 150ms│   (input)   │
└─────────────┴──────┴─────────────┘

Round 2 (570ms flash):
┌──────────┬──────┬────────────┬──────┬─────────────┐
│ RED      │ GAP  │ GREEN      │ GAP  │ "YOUR TURN" │
│  570ms   │ 150ms│   570ms    │ 150ms│   (input)   │
└──────────┴──────┴────────────┴──────┴─────────────┘
```

### State Variables During Showing:

| Variable       | Purpose                              |
| -------------- | ------------------------------------ |
| `showTimer`    | Elapsed time in current flash or gap |
| `inGap`        | `false` = showing color, `true` = silent |
| `currentStep`  | Index in sequence (0...length-1)     |
| `activeColor`  | Color to render bright (or `null`)   |

### Update Loop Logic:

```typescript
if (!inGap) {
  // Showing color
  activeColor = sequence[currentStep];
  if (showTimer >= flashDuration) {
    // Done flashing → enter gap
    activeColor = null;
    inGap = true;
    showTimer = 0;
  }
} else {
  // In gap
  if (showTimer >= GAP_DURATION) {
    // Done with gap → next color
    currentStep++;
    inGap = false;
    showTimer = 0;

    if (currentStep >= sequence.length) {
      // All colors shown
      phase = 'input';
    }
  }
}
```

---

## What You Learned

✅ Generate random sequences with `Math.random()`  
✅ Implement timer-based animations with delta time  
✅ Create state machines with phases  
✅ Calculate dynamic timing (speed increases)  
✅ Coordinate multiple timers (`showTimer`, `inGap`)

---

## Next Step

→ [Step 3: Player Input & Validation](./step-3.md) — Capture clicks, validate against sequence, detect game over
