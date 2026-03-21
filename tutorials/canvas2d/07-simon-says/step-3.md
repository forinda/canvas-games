# Step 3: Player Input & Validation

**Goal:** Detect which quadrant the player clicked and validate it against the sequence.

**Time:** ~20 minutes

---

## What You'll Build

Players can now:
- Click colored quadrants during the "YOUR TURN" phase
- See instant feedback (quadrant lights up)
- **Win** if they repeat the entire sequence correctly
- **Lose** if they click the wrong color

```
Sequence: RED → GREEN → BLUE
Player clicks: RED ✓ → GREEN ✓ → BLUE ✓ → Next Round!
Player clicks: RED ✓ → YELLOW ✗ → GAME OVER
```

---

## Concepts

- **Hit Detection**: Map mouse coordinates to quadrants
- **Circular Exclusion**: Ignore clicks inside center circle
- **Input Validation**: Compare player clicks to expected sequence
- **Visual Feedback**: Flash clicked quadrant for 250ms

---

## Code

### 1. Create Input System

**File:** `src/contexts/canvas2d/games/simon-says/systems/InputSystem.ts`

```typescript
import type { SimonState, Color } from '../types';
import { INPUT_FLASH_DURATION } from '../types';

export class InputSystem {
  private canvas: HTMLCanvasElement;
  private boundOnClick: (e: MouseEvent) => void;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.boundOnClick = (e: MouseEvent) => this.onClick(e);
  }

  attach(): void {
    this.canvas.addEventListener('click', this.boundOnClick);
  }

  detach(): void {
    this.canvas.removeEventListener('click', this.boundOnClick);
  }

  /** Map click coordinates to a color quadrant */
  getClickedColor(
    clickX: number,
    clickY: number,
    centerX: number,
    centerY: number,
    size: number
  ): Color | null {
    // Calculate relative position from center
    const dx = clickX - centerX;
    const dy = clickY - centerY;

    // Distance from center
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Inner exclusion zone (center circle)
    const innerRadius = size * 0.18;
    if (dist < innerRadius) return null;

    // Outer boundary (board edge)
    const outerRadius = size * 0.707; // √2 / 2 ≈ 0.707 (diagonal)
    if (dist > outerRadius) return null;

    // Determine quadrant based on dx/dy signs
    if (dx < 0 && dy < 0) return 'red'; // Top-left
    if (dx >= 0 && dy < 0) return 'green'; // Top-right
    if (dx < 0 && dy >= 0) return 'blue'; // Bottom-left
    if (dx >= 0 && dy >= 0) return 'yellow'; // Bottom-right

    return null;
  }

  /** Handle click events */
  private onClick(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;

    // Convert screen coordinates to canvas coordinates
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;

    const W = this.canvas.width;
    const H = this.canvas.height;
    const size = Math.min(W, H) * 0.35;
    const centerX = W / 2;
    const centerY = H / 2;

    const color = this.getClickedColor(clickX, clickY, centerX, centerY, size);

    if (color) {
      // Trigger click callback (will be set by engine)
      if (this.onColorClick) {
        this.onColorClick(color);
      }
    }
  }

  // Callback for color clicks (set by engine)
  onColorClick?: (color: Color) => void;
}
```

**Key Logic:**
- **Coordinate Transform**: Convert screen pixels to canvas coordinates
- **Distance Check**: Ignore clicks inside center circle
- **Quadrant Detection**: Use `dx/dy` signs to determine quadrant

---

### 2. Add Input Validation to Sequence System

**File:** `src/contexts/canvas2d/games/simon-says/systems/SequenceSystem.ts`

Add this method to the `SequenceSystem` class:

```typescript
/** Verify player input against expected sequence */
verifyInput(state: SimonState, color: Color): boolean {
  // Only accept input during input phase
  if (state.phase !== 'input') return false;

  const expectedColor = state.sequence[state.currentStep];

  if (color !== expectedColor) {
    // Wrong color!
    state.phase = 'gameover';
    this.saveHighScore(state);
    return false;
  }

  // Correct color
  state.currentStep++;

  // Check if sequence complete
  if (state.currentStep >= state.sequence.length) {
    // Round complete → prepare next round
    state.currentStep = 0;
    this.extendSequence(state);
  }

  return true;
}
```

---

### 3. Update Game Engine to Handle Input

**File:** `src/contexts/canvas2d/games/simon-says/SimonEngine.ts`

```typescript
import type { SimonState, Color } from './types';
import { INPUT_FLASH_DURATION } from './types';
import { GameRenderer } from './renderers/GameRenderer';
import { SequenceSystem } from './systems/SequenceSystem';
import { InputSystem } from './systems/InputSystem';

export class SimonEngine {
  private ctx: CanvasRenderingContext2D;
  private state: SimonState;
  private running: boolean;
  private rafId: number;
  private lastTime: number;

  private gameRenderer: GameRenderer;
  private sequenceSystem: SequenceSystem;
  private inputSystem: InputSystem;

  constructor(canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
    this.running = false;
    this.rafId = 0;
    this.lastTime = 0;

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

    // Register input callback
    this.inputSystem.onColorClick = (color: Color) => this.handleColorClick(color);
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
    // Update sequence system (handles showing phase)
    this.sequenceSystem.update(this.state, dt);

    // Update input flash timer (visual feedback)
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
    // Start game if not started
    if (!this.state.started) {
      this.sequenceSystem.startNewGame(this.state);
      return;
    }

    // Show visual feedback (light up clicked quadrant)
    this.state.activeColor = color;
    this.state.inputFlashTimer = INPUT_FLASH_DURATION;

    // Verify input
    const correct = this.sequenceSystem.verifyInput(this.state, color);

    if (!correct) {
      // Wrong click → will show game over on next frame
      console.log('Game Over! Final Round:', this.state.round - 1);
    }
  }

  private render(): void {
    this.gameRenderer.render(this.ctx, this.state);
  }
}
```

**Changes:**
- Created `InputSystem` instance
- Registered `onColorClick` callback
- Added `updateInputFlash()` to fade out clicked quadrant
- `handleColorClick()` validates input and triggers visual feedback

---

## Test It

1. **Run:** `npm run dev`
2. **Navigate:** Select "Simon Says"
3. **Start:** Click center circle
4. **Watch:** RED flashes
5. **Click:** Click RED quadrant → lights up briefly
6. **Success:** Next round starts (RED → GREEN)
7. **Test Wrong Click:**
   - Watch sequence: RED → GREEN
   - Click: RED ✓
   - Click: BLUE ✗ (wrong!)
   - Verify: Center circle shows "✗"
8. **Test Sequence Completion:**
   - Complete a round correctly
   - Verify: Next round auto-starts with one more color

---

## How Click Detection Works

### Coordinate Mapping

```
Screen Space            Canvas Space          Quadrant Detection
┌─────────────┐        ┌─────────────┐        ┌─────────────┐
│ Click @ 500,│        │ Click @ 400,│        │  dx < 0     │
│         300 │   →    │         240 │   →    │  dy < 0     │
│ (pixels)    │        │ (scaled)    │        │  = RED      │
└─────────────┘        └─────────────┘        └─────────────┘
```

### Steps:
1. **Get screen coordinates**: `e.clientX, e.clientY`
2. **Convert to canvas**: Account for scaling (canvas size vs displayed size)
3. **Calculate distance**: `√(dx² + dy²)` from center
4. **Filter center**: Ignore clicks inside circle (`dist < innerRadius`)
5. **Map to quadrant**: Use `dx/dy` signs

### Quadrant Mapping:

```
     dx < 0  │  dx ≥ 0
─────────────┼─────────────
dy < 0   RED │ GREEN
─────────────┼─────────────
dy ≥ 0  BLUE │ YELLOW
```

---

## Input Flash Timing

**Visual Feedback Pattern:**
```
1. Player clicks → activeColor = clicked color
2. inputFlashTimer = 250ms
3. Each frame: inputFlashTimer -= dt
4. When timer reaches 0: activeColor = null
```

**Result:** Quadrant stays lit for 250ms, then returns to dim state.

---

## What You Learned

✅ Map mouse coordinates to game regions  
✅ Use polar coordinates for circular hit detection  
✅ Validate sequential input against stored data  
✅ Implement visual feedback with timers  
✅ Coordinate transforms (screen → canvas space)

---

## Next Step

→ [Step 4: Polish - HUD, Scoring & Keyboard Controls](./step-4.md) — Add UI overlays, high score persistence, and keyboard shortcuts
