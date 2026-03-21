# Step 1: Grid System & Snake Drawing

**Goal:** Set up the grid-based coordinate system and render a static snake.

**Time:** ~15 minutes

---

## What You'll Build

Core visual elements:
- **Grid-based canvas**: 20px cells with subtle lines
- **Snake segment**: Single green square at center
- **Coordinate system**: Grid coords (0,0 to gridW-1, gridH-1)

---

## Concepts

- **Grid Coordinates**: Integer-based positions (not pixels)
- **Cell Rendering**: Convert grid coords → pixel positions
- **Coordinate Type**: Reusable `{x, y}` object
- **Responsive Grid**: Calculated from window size

---

## Code

### 1. Create Types

**File:** `src/contexts/canvas2d/games/snake/types.ts`

Define core types and constants:

```typescript
export type Direction = 'up' | 'down' | 'left' | 'right';

export interface Coord {
  x: number;
  y: number;
}

export interface SnakeState {
  snake: Coord[];
  dir: Direction;
  nextDir: Direction;
  food: Coord | null;
  score: number;
  highScore: number;
  speed: number;
  lastTick: number;
  started: boolean;
  gameOver: boolean;
  paused: boolean;
  gridW: number;
  gridH: number;
}

// Constants
export const CELL = 20; // pixels per grid cell
export const INITIAL_SPEED = 120; // ms per move
export const FOOD_POINTS = 10;
export const SPEED_INCREMENT = -2; // gets faster
export const MIN_SPEED = 50; // cap at 20 moves/sec
export const HS_KEY = 'snake_highscore';
```

---

### 2. Create Board Renderer

**File:** `src/contexts/canvas2d/games/snake/renderers/BoardRenderer.ts`

Render grid and snake:

```typescript
import type { SnakeState } from '../types';
import { CELL } from '../types';

export class BoardRenderer {
  render(ctx: CanvasRenderingContext2D, state: SnakeState): void {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    // Dark background
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, W, H);

    // Grid lines
    this.drawGrid(ctx, state.gridW, state.gridH);

    // Snake
    this.drawSnake(ctx, state.snake);

    // Food (when implemented)
    if (state.food) {
      this.drawFood(ctx, state.food);
    }
  }

  private drawGrid(ctx: CanvasRenderingContext2D, gridW: number, gridH: number): void {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;

    // Vertical lines
    for (let x = 0; x <= gridW; x++) {
      const px = x * CELL;
      ctx.beginPath();
      ctx.moveTo(px, 0);
      ctx.lineTo(px, gridH * CELL);
      ctx.stroke();
    }

    // Horizontal lines
    for (let y = 0; y <= gridH; y++) {
      const py = y * CELL;
      ctx.beginPath();
      ctx.moveTo(0, py);
      ctx.lineTo(gridW * CELL, py);
      ctx.stroke();
    }
  }

  private drawSnake(ctx: CanvasRenderingContext2D, snake: Coord[]): void {
    for (let i = snake.length - 1; i >= 0; i--) {
      const seg = snake[i];
      const isHead = i === 0;

      // Calculate brightness (head is brightest)
      const pct = 1 - i / snake.length;

      if (isHead) {
        // Head: bright green with glow
        ctx.shadowColor = '#4ade80';
        ctx.shadowBlur = 8;
        ctx.fillStyle = '#4ade80';
      } else {
        // Body: gradient from dark to bright
        const lightness = 30 + pct * 25; // 30% to 55%
        ctx.shadowBlur = 0;
        ctx.fillStyle = `hsl(145, 70%, ${lightness}%)`;
      }

      // Draw segment with 1px padding
      ctx.fillRect(
        seg.x * CELL + 1,
        seg.y * CELL + 1,
        CELL - 2,
        CELL - 2
      );

      ctx.shadowBlur = 0;
    }
  }

  private drawFood(ctx: CanvasRenderingContext2D, food: Coord): void {
    // Pulsing effect (will add animation later)
    const pulse = 1.0;
    const radius = (CELL / 2 - 2) * pulse;

    ctx.shadowColor = '#ef4444';
    ctx.shadowBlur = 10 * pulse;
    ctx.fillStyle = '#ef4444';

    ctx.beginPath();
    ctx.arc(
      food.x * CELL + CELL / 2,
      food.y * CELL + CELL / 2,
      radius,
      0,
      Math.PI * 2
    );
    ctx.fill();

    ctx.shadowBlur = 0;
  }
}
```

**Key patterns:**
- Grid coords → pixels: `coord * CELL`
- 1px padding: `+1` offset, `-2` size
- Loop backwards: Render tail first, head last (for glow effect)
- HSL colors: Easy brightness gradient with same hue

---

### 3. Create Game Engine

**File:** `src/contexts/canvas2d/games/snake/SnakeEngine.ts`

Initialize state and render loop:

```typescript
import type { SnakeState } from './types';
import { CELL, INITIAL_SPEED, HS_KEY } from './types';
import { BoardRenderer } from './renderers/BoardRenderer';

export class SnakeEngine {
  private ctx: CanvasRenderingContext2D;
  private state: SnakeState;
  private running: boolean;
  private rafId: number;

  private boardRenderer: BoardRenderer;

  constructor(canvas: HTMLCanvasElement, onExit: () => void) {
    this.ctx = canvas.getContext('2d')!;
    this.running = false;
    this.rafId = 0;

    // Full window canvas
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Calculate grid dimensions
    const gridW = Math.floor(canvas.width / CELL);
    const gridH = Math.floor(canvas.height / CELL);

    // Load high score
    let highScore = 0;
    try {
      highScore = parseInt(localStorage.getItem(HS_KEY) ?? '0', 10) || 0;
    } catch (e) {
      console.warn('Could not load high score');
    }

    // Initial snake at center
    const centerX = Math.floor(gridW / 2);
    const centerY = Math.floor(gridH / 2);

    this.state = {
      snake: [{ x: centerX, y: centerY }],
      dir: 'right',
      nextDir: 'right',
      food: null,
      score: 0,
      highScore,
      speed: INITIAL_SPEED,
      lastTick: 0,
      started: false,
      gameOver: false,
      paused: false,
      gridW,
      gridH,
    };

    this.boardRenderer = new BoardRenderer();
  }

  start(): void {
    this.running = true;
    this.loop();
  }

  destroy(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
  }

  private loop = (): void => {
    if (!this.running) return;

    this.render();

    this.rafId = requestAnimationFrame(this.loop);
  };

  private render(): void {
    this.boardRenderer.render(this.ctx, this.state);
  }
}
```

**Key patterns:**
- Grid dimensions: `Math.floor(pixels / CELL)`
- Center position: `Math.floor(gridSize / 2)`
- State-driven: Single source of truth
- RAF loop: Smooth 60fps rendering

---

### 4. Create Platform Adapter

**File:** `src/contexts/canvas2d/games/snake/adapters/PlatformAdapter.ts`

```typescript
import type { GameInstance } from '@core/GameInterface';
import { SnakeEngine } from '../SnakeEngine';

export class PlatformAdapter implements GameInstance {
  private engine: SnakeEngine;

  constructor(canvas: HTMLCanvasElement, onExit: () => void) {
    this.engine = new SnakeEngine(canvas, onExit);
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

### 5. Update Game Export

**File:** `src/contexts/canvas2d/games/snake/index.ts`

```typescript
import type { GameDefinition } from '@core/GameInterface';
import { PlatformAdapter } from './adapters/PlatformAdapter';

export const SnakeGame: GameDefinition = {
  id: 'snake',
  name: 'Snake',
  description: 'Classic snake game with growing segments',
  genre: 'Arcade',
  difficulty: 'Medium',
  controls: ['keyboard'],
  HelpComponent: () => {
    return `
Controls:
- Arrow Keys / WASD: Move
- P: Pause
- ESC: Exit

Rules:
- Eat food to grow longer
- Avoid walls and your own body
- Game speeds up as you grow
    `.trim();
  },
  instanceFactory: (canvas, onExit) => new PlatformAdapter(canvas, onExit),
};
```

---

## Test It

1. **Run:** `npm run dev`
2. **Navigate:** Select "Snake"
3. **Observe:**
   - Dark background with subtle grid lines
   - Single bright green square at center (snake head)
   - Grid cells are 20px × 20px
   - Clean 1px padding around square

---

## Challenges

**Easy:**
- Change cell size to 30px
- Start snake at different position (top-left)
- Change snake color to blue

**Medium:**
- Add 3-segment initial snake (head + 2 body)
- Center grid perfectly (handle partial cells at edges)

**Hard:**
- Make grid responsive to window resize
- Add border around entire grid area

---

## What You Learned

✅ Grid-based coordinate systems  
✅ Converting grid coords to pixel positions  
✅ Canvas rendering with padding  
✅ HSL color gradients  
✅ Shadow effects (glow)  
✅ Responsive canvas setup

**Next:** Movement and keyboard input!
