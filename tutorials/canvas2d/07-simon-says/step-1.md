# Step 1: Project Setup & Drawing Color Quadrants

**Goal:** Draw a beautiful 4-color game board with circular layout.

**Time:** ~20 minutes

---

## What You'll Build

A Simon Says game board with 4 color quadrants arranged in a circle around a center display:

```
┌────────────────────────┐
│                        │
│    RED  |  GREEN      │
│    ─────┼─────        │
│         O              │
│    ─────┼─────        │
│   BLUE  | YELLOW      │
│                        │
└────────────────────────┘
```

---

## Concepts

- **Canvas Drawing**: Rectangles with rounded corners
- **Color Palettes**: Normal, dim, and bright states for each color
- **Coordinate Transform**: Position elements relative to canvas center
- **Typography**: Render centered text in the middle circle

---

## Code

### 1. Create Type Definitions

**File:** `src/contexts/canvas2d/games/simon-says/types.ts`

```typescript
export type Color = 'red' | 'green' | 'blue' | 'yellow';
export type Phase = 'showing' | 'input' | 'gameover';

export interface SimonState {
  sequence: Color[]; // Colors to repeat
  round: number; // Sequence length
  currentStep: number; // Index in sequence
  phase: Phase;
  started: boolean; // Game has begun
  highScore: number;

  // Animation state
  activeColor: Color | null; // Currently lit color
  showTimer: number; // Timer for showing phase
  inGap: boolean; // Between flashes
  inputFlashTimer: number; // Player click feedback
}

export const COLORS: Color[] = ['red', 'green', 'blue', 'yellow'];

// Color hex values - Normal state
export const COLOR_MAP: Record<Color, string> = {
  red: '#e53935',
  green: '#43a047',
  blue: '#1e88e5',
  yellow: '#fdd835',
};

// Dim colors (idle state)
export const COLOR_DIM_MAP: Record<Color, string> = {
  red: '#7f1d1d',
  green: '#14532d',
  blue: '#1e3a5f',
  yellow: '#78350f',
};

// Bright colors (active/lit state)
export const COLOR_BRIGHT_MAP: Record<Color, string> = {
  red: '#ff8a80',
  green: '#69f0ae',
  blue: '#82b1ff',
  yellow: '#ffff8d',
};

// Timing constants (for Step 2)
export const BASE_FLASH_DURATION = 600; // ms
export const MIN_FLASH_DURATION = 200;
export const FLASH_REDUCTION_PER_ROUND = 30;
export const GAP_DURATION = 150; // Silence between flashes
export const INPUT_FLASH_DURATION = 250;

export const HS_KEY = 'simon_says_high_score';
```

**Why 3 color states?**
- **Dim**: Idle/unlit quadrants
- **Normal**: Reference for color names
- **Bright**: Active/flashing state

---

### 2. Create Game Renderer

**File:** `src/contexts/canvas2d/games/simon-says/renderers/GameRenderer.ts`

```typescript
import type { SimonState, Color } from '../types';
import { COLOR_DIM_MAP, COLOR_BRIGHT_MAP } from '../types';

export class GameRenderer {
  render(ctx: CanvasRenderingContext2D, state: SimonState): void {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    // Clear canvas
    ctx.fillStyle = '#0f0f1a';
    ctx.fillRect(0, 0, W, H);

    // Calculate board size (responsive)
    const size = Math.min(W, H) * 0.35;
    const centerX = W / 2;
    const centerY = H / 2;

    // Draw 4 quadrants
    this.renderQuadrant(ctx, 'red', centerX, centerY, size, state.activeColor === 'red');
    this.renderQuadrant(ctx, 'green', centerX, centerY, size, state.activeColor === 'green');
    this.renderQuadrant(ctx, 'blue', centerX, centerY, size, state.activeColor === 'blue');
    this.renderQuadrant(ctx, 'yellow', centerX, centerY, size, state.activeColor === 'yellow');

    // Draw center circle
    this.renderCenterCircle(ctx, centerX, centerY, size, state);
  }

  private renderQuadrant(
    ctx: CanvasRenderingContext2D,
    color: Color,
    centerX: number,
    centerY: number,
    size: number,
    isActive: boolean
  ): void {
    // Quadrant positioning (-1, -1 = top-left; +1, -1 = top-right; etc.)
    const positions: Record<Color, [number, number]> = {
      red: [-1, -1], // Top-left
      green: [1, -1], // Top-right
      blue: [-1, 1], // Bottom-left
      yellow: [1, 1], // Bottom-right
    };

    const [dx, dy] = positions[color];
    const gap = 6; // Gap between quadrants
    const quadSize = size - gap;

    // Calculate quadrant position
    const x = centerX + (dx * gap) / 2 + (dx === -1 ? -quadSize : 0);
    const y = centerY + (dy * gap) / 2 + (dy === -1 ? -quadSize : 0);

    // Choose color based on active state
    const fillColor = isActive ? COLOR_BRIGHT_MAP[color] : COLOR_DIM_MAP[color];

    // Draw rounded rectangle
    ctx.fillStyle = fillColor;
    ctx.beginPath();
    this.roundRect(ctx, x, y, quadSize, quadSize, 16);
    ctx.fill();

    // Add glow effect when active
    if (isActive) {
      ctx.shadowBlur = 30;
      ctx.shadowColor = fillColor;
      ctx.fill();
      ctx.shadowBlur = 0; // Reset shadow
    }

    // Draw border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw color label
    ctx.fillStyle = isActive ? 'rgba(255, 255, 255, 1)' : 'rgba(255, 255, 255, 0.3)';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(color.toUpperCase(), x + quadSize / 2, y + quadSize / 2);
  }

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

    // Text (Round number or "Start")
    ctx.fillStyle = '#4caf50';
    ctx.font = 'bold 32px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (!state.started) {
      ctx.font = '20px sans-serif';
      ctx.fillText('Click to', centerX, centerY - 15);
      ctx.fillText('Start', centerX, centerY + 10);
    } else if (state.phase === 'gameover') {
      ctx.fillStyle = '#e53935';
      ctx.fillText('✗', centerX, centerY);
    } else {
      ctx.fillText(String(state.round), centerX, centerY);
    }
  }

  /** Helper to draw rounded rectangles */
  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
  ): void {
    if (w < 2 * r) r = w / 2;
    if (h < 2 * r) r = h / 2;

    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
}
```

**Key Points:**
- **Positioning**: Uses `[dx, dy]` multipliers for quadrant offsets
- **Gap**: 6px spacing between quadrants
- **Rounded Corners**: Custom `roundRect()` helper
- **Glow Effect**: `shadowBlur` for active quadrants

---

### 3. Create Game Engine

**File:** `src/contexts/canvas2d/games/simon-says/SimonEngine.ts`

```typescript
import type { SimonState } from './types';
import { GameRenderer } from './renderers/GameRenderer';

export class SimonEngine {
  private ctx: CanvasRenderingContext2D;
  private state: SimonState;
  private running: boolean;
  private rafId: number;

  private gameRenderer: GameRenderer;

  constructor(canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
    this.running = false;
    this.rafId = 0;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Load high score
    let highScore = 0;
    try {
      highScore = parseInt(localStorage.getItem('simon_says_high_score') ?? '0', 10) || 0;
    } catch (e) {
      console.warn('Could not load high score');
    }

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
    this.gameRenderer.render(this.ctx, this.state);
  }
}
```

---

### 4. Platform Adapter & Registration

**File:** `src/contexts/canvas2d/games/simon-says/adapters/PlatformAdapter.ts`

```typescript
import type { GameInstance } from '@core/GameInterface';
import { SimonEngine } from '../SimonEngine';

export class PlatformAdapter implements GameInstance {
  private engine: SimonEngine;

  constructor(canvas: HTMLCanvasElement, onExit: () => void) {
    this.engine = new SimonEngine(canvas);
  }

  start(): void {
    this.engine.start();
  }

  destroy(): void {
    this.engine.destroy();
  }
}
```

**File:** `src/contexts/canvas2d/games/simon-says/index.ts`

```typescript
import type { GameDefinition } from '@core/GameInterface';
import { PlatformAdapter } from './adapters/PlatformAdapter';

export const SimonSaysGame: GameDefinition = {
  id: 'simon-says',
  name: 'Simon Says',
  description: 'Repeat the color sequence!',
  icon: '🎨',
  color: '#4caf50',
  category: 'memory',
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
2. **Navigate:** Select "Simon Says" from the menu
3. **Expect:**
   - 4 colored quadrants (dim/idle state)
   - Center circle with "Click to Start" text
   - Responsive sizing (resize browser to test)

---

## Styling Details

**Colors When Dim:**
- Red: `#7f1d1d` (dark red)
- Green: `#14532d` (dark green)
- Blue: `#1e3a5f` (dark blue)
- Yellow: `#78350f` (dark amber)

**Layout Math:**
- Board size: `35%` of smallest viewport dimension
- Each quadrant: `(size - 6px) / 2`
- Center circle radius: `18%` of board size

---

## What You Learned

✅ Draw rounded rectangles with `arcTo()`  
✅ Position elements relative to canvas center  
✅ Create color palettes with dim/bright states  
✅ Add glow effects with `shadowBlur`  
✅ Render centered text in circles

---

## Next Step

→ [Step 2: Sequence Generation & Showing Phase](./step-2.md) — Animate the color sequence with timers
