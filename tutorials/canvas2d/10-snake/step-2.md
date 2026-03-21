# Step 2: Movement & Keyboard Input

**Goal:** Make the snake move automatically and respond to arrow key controls.

**Time:** ~20 minutes

---

## What You'll Build

Movement mechanics:
- **Tick-based movement**: Snake moves one cell per interval (120ms)
- **Arrow key input**: Change direction with arrows or WASD
- **Reverse prevention**: Can't turn 180° into yourself
- **Direction queue**: Buffer input to prevent missed turns

---

## Concepts

- **Game Ticks**: Discrete time steps (not every frame)
- **Direction Validation**: Prevent illegal moves
- **Input Buffering**: Queue next direction during movement
- **Array Manipulation**: Unshift head, pop tail

---

## Code

### 1. Create Movement System

**File:** `src/contexts/canvas2d/games/snake/systems/MovementSystem.ts`

```typescript
import type { SnakeState, Coord } from '../types';

export class MovementSystem {
  update(state: SnakeState): void {
    if (state.gameOver || state.paused || !state.started) return;

    // Apply queued direction
    state.dir = state.nextDir;

    // Calculate new head position
    const head = state.snake[0];
    const newHead: Coord = { x: head.x, y: head.y };

    switch (state.dir) {
      case 'up':
        newHead.y -= 1;
        break;
      case 'down':
        newHead.y += 1;
        break;
      case 'left':
        newHead.x -= 1;
        break;
      case 'right':
        newHead.x += 1;
        break;
    }

    // Add new head to front
    state.snake.unshift(newHead);

    // Remove tail (for now - will change with food)
    state.snake.pop();
  }
}
```

**Key pattern:** `unshift` adds to front, `pop` removes from back → snake "moves" forward

---

### 2. Create Input System

**File:** `src/contexts/canvas2d/games/snake/systems/InputSystem.ts`

Handle keyboard input with reverse prevention:

```typescript
import type { SnakeState, Direction } from '../types';

export class InputSystem {
  private boundKey: (e: KeyboardEvent) => void;
  private state: SnakeState | null = null;
  private onExit: () => void;

  constructor(onExit: () => void) {
    this.onExit = onExit;
    this.boundKey = (e: KeyboardEvent) => this.handleKey(e);
  }

  attach(state: SnakeState): void {
    this.state = state;
    window.addEventListener('keydown', this.boundKey);
  }

  detach(): void {
    window.removeEventListener('keydown', this.boundKey);
    this.state = null;
  }

  private handleKey(e: KeyboardEvent): void {
    if (!this.state) return;

    const key = e.key.toLowerCase();

    // Start game on first input
    if (!this.state.started && !this.state.gameOver) {
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd'].includes(key)) {
        this.state.started = true;
      }
    }

    // Direction changes
    if (this.state.started && !this.state.gameOver && !this.state.paused) {
      let newDir: Direction | null = null;

      switch (key) {
        case 'arrowup':
        case 'w':
          newDir = 'up';
          break;
        case 'arrowdown':
        case 's':
          newDir = 'down';
          break;
        case 'arrowleft':
        case 'a':
          newDir = 'left';
          break;
        case 'arrowright':
        case 'd':
          newDir = 'right';
          break;
      }

      if (newDir) {
        // Prevent 180-degree reversal
        const opposites: Record<Direction, Direction> = {
          up: 'down',
          down: 'up',
          left: 'right',
          right: 'left',
        };

        if (opposites[newDir] !== this.state.dir) {
          this.state.nextDir = newDir;
        }
      }
    }

    // Pause toggle
    if (key === 'p' && this.state.started && !this.state.gameOver) {
      this.state.paused = !this.state.paused;
    }

    // Exit
    if (key === 'escape') {
      this.onExit();
    }

    // Restart
    if (key === ' ' && this.state.gameOver) {
      // Will implement restart in later steps
    }
  }
}
```

**Key patterns:**
- `opposites` map: Lookup table for reverse direction
- `nextDir` queue: Buffered input applied at next tick
- Start on first arrow key: Better UX than "press any key"

---

### 3. Update Game Engine with Tick System

**File:** `src/contexts/canvas2d/games/snake/SnakeEngine.ts`

Add tick-based updates:

```typescript
import type { SnakeState } from './types';
import { CELL, INITIAL_SPEED, HS_KEY } from './types';
import { BoardRenderer } from './renderers/BoardRenderer';
import { MovementSystem } from './systems/MovementSystem';
import { InputSystem } from './systems/InputSystem';

export class SnakeEngine {
  private ctx: CanvasRenderingContext2D;
  private state: SnakeState;
  private running: boolean;
  private rafId: number;

  private boardRenderer: BoardRenderer;
  private movementSystem: MovementSystem;
  private inputSystem: InputSystem;

  constructor(canvas: HTMLCanvasElement, onExit: () => void) {
    this.ctx = canvas.getContext('2d')!;
    this.running = false;
    this.rafId = 0;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const gridW = Math.floor(canvas.width / CELL);
    const gridH = Math.floor(canvas.height / CELL);

    let highScore = 0;
    try {
      highScore = parseInt(localStorage.getItem(HS_KEY) ?? '0', 10) || 0;
    } catch (e) {
      console.warn('Could not load high score');
    }

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
    this.movementSystem = new MovementSystem();
    this.inputSystem = new InputSystem(onExit);

    this.inputSystem.attach(this.state);
  }

  start(): void {
    this.running = true;
    this.state.lastTick = performance.now();
    this.loop();
  }

  destroy(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
    this.inputSystem.detach();
  }

  private loop = (): void => {
    if (!this.running) return;

    const now = performance.now();

    // Tick-based update (not every frame!)
    if (now - this.state.lastTick >= this.state.speed) {
      this.state.lastTick = now;
      this.update();
    }

    this.render();

    this.rafId = requestAnimationFrame(this.loop);
  };

  private update(): void {
    this.movementSystem.update(this.state);
  }

  private render(): void {
    this.boardRenderer.render(this.ctx, this.state);
  }
}
```

**Key patterns:**
- RAF runs at 60fps, but logic updates at `speed` interval (120ms)
- `lastTick` tracking: Accumulates time between ticks
- Render every frame: Smooth visuals even with discrete logic

---

### 4. Create HUD Renderer (Start Screen)

**File:** `src/contexts/canvas2d/games/snake/renderers/HUDRenderer.ts`

```typescript
import type { SnakeState } from '../types';

export class HUDRenderer {
  render(ctx: CanvasRenderingContext2D, state: SnakeState): void {
    if (!state.started) {
      this.drawStartScreen(ctx);
    } else if (state.paused) {
      this.drawPausedOverlay(ctx);
    }
  }

  private drawStartScreen(ctx: CanvasRenderingContext2D): void {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    ctx.fillStyle = 'rgba(15, 15, 26, 0.85)';
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = '#4ade80';
    ctx.font = 'bold 72px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('SNAKE', W / 2, H / 2 - 60);

    ctx.font = '24px sans-serif';
    ctx.fillStyle = '#fff';
    ctx.fillText('Use arrow keys or WASD to move', W / 2, H / 2 + 20);

    ctx.fillStyle = '#aaa';
    ctx.font = '18px sans-serif';
    ctx.fillText('Press any arrow key to start', W / 2, H / 2 + 70);
  }

  private drawPausedOverlay(ctx: CanvasRenderingContext2D): void {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 48px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('PAUSED', W / 2, H / 2);

    ctx.font = '20px sans-serif';
    ctx.fillStyle = '#aaa';
    ctx.fillText('Press P to resume', W / 2, H / 2 + 50);
  }
}
```

---

### 5. Update Engine to Render HUD

**File:** `src/contexts/canvas2d/games/snake/SnakeEngine.ts`

Add HUD renderer to render method:

```typescript
// In constructor, add:
import { HUDRenderer } from './renderers/HUDRenderer';

// Add field:
private hudRenderer: HUDRenderer;

// In constructor initialization:
this.hudRenderer = new HUDRenderer();

// Update render method:
private render(): void {
  this.boardRenderer.render(this.ctx, this.state);
  this.hudRenderer.render(this.ctx, this.state);
}
```

---

## Test It

1. **Run:** `npm run dev`
2. **Navigate:** Select "Snake"
3. **Start Screen:**
   - Shows "SNAKE" title with instructions
   - Press any arrow key to start
4. **Movement:**
   - Snake automatically moves right
   - Press arrow keys (or WASD) to change direction
   - Snake moves one cell every ~120ms
   - Can't reverse into yourself (try pressing opposite direction)
5. **Pause:**
   - Press **P** to pause
   - Amber "PAUSED" overlay appears
   - Press **P** again to resume

---

## Challenges

**Easy:**
- Change initial direction to up
- Change speed to 200ms (slower)
- Add initial 3-segment snake body

**Medium:**
- Add diagonal movement (8 directions)
- Implement mouse click to change direction (click left of snake = turn left)

**Hard:**
- Add "turbo mode" (hold Shift = 2x speed)
- Smooth interpolation between cells (lerp animation)

---

## What You Learned

✅ Tick-based game loops  
✅ Direction queue systems  
✅ Preventing invalid input (reverse direction)  
✅ Array manipulation (unshift/pop for movement)  
✅ Event listener attachment/cleanup  
✅ Game state triggers (started flag)

**Next:** Food spawning and growth!
