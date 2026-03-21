# Step 1: Ship & Rotation

**Goal:** Draw a triangular spaceship in the center of the canvas that rotates with the left/right arrow keys.

**Time:** ~15 minutes

---

## What You'll Build

Foundation elements:
- **Dark space background**: Near-black canvas with faint deterministic stars
- **Triangle ship**: Classic Asteroids-style outline drawn with `ctx.rotate()`
- **Keyboard rotation**: Left/Right arrow keys spin the ship in place
- **Game loop**: `requestAnimationFrame` loop ready for physics in the next step

---

## Concepts

- **Canvas Transform Stack**: `ctx.save()`, `ctx.translate()`, `ctx.rotate()`, `ctx.restore()` to draw the ship at any angle without manually rotating each vertex
- **Angle Convention**: Angle `0` means "pointing up" (negative Y). We rotate clockwise for positive angles, matching the canvas coordinate system
- **Key Tracking Map**: A plain object `{ left, right, up, space }` updated on `keydown`/`keyup` so the game loop can poll keys every frame instead of reacting to one-off events

---

## Code

### 1. Create Types

**File:** `src/contexts/canvas2d/games/asteroids/types.ts`

Define the constants, interfaces, and state shape for the entire game. We declare everything now so we can grow into it step by step.

```typescript
// ── Constants ──────────────────────────────────────────────
export const SHIP_RADIUS = 15;
export const SHIP_ROTATION_SPEED = 0.065;

// ── Types ──────────────────────────────────────────────────
export interface Vec2 {
  x: number;
  y: number;
}

export interface Ship {
  pos: Vec2;
  vel: Vec2;
  angle: number; // radians, 0 = pointing up
  thrusting: boolean;
}

export interface AsteroidsState {
  ship: Ship;
  width: number;
  height: number;
}
```

**What's happening:**
- `Ship` stores position, velocity, angle, and whether the engine is firing. We only use `pos` and `angle` in this step; the rest is ready for Step 2.
- `SHIP_RADIUS` controls how large the triangle is. `SHIP_ROTATION_SPEED` is how many radians per frame the ship turns.
- `Vec2` is a simple `{ x, y }` pair reused across every entity in the game.

---

### 2. Create the Input System

**File:** `src/contexts/canvas2d/games/asteroids/systems/InputSystem.ts`

Track which keys are currently held down:

```typescript
import type { AsteroidsState } from '../types';

export interface InputKeys {
  left: boolean;
  right: boolean;
  up: boolean;
  space: boolean;
}

export class InputSystem {
  private state: AsteroidsState;
  readonly keys: InputKeys = { left: false, right: false, up: false, space: false };

  private keyDownHandler: (e: KeyboardEvent) => void;
  private keyUpHandler: (e: KeyboardEvent) => void;

  constructor(state: AsteroidsState) {
    this.state = state;
    this.keyDownHandler = (e) => this.handleKeyDown(e);
    this.keyUpHandler = (e) => this.handleKeyUp(e);
  }

  attach(): void {
    window.addEventListener('keydown', this.keyDownHandler);
    window.addEventListener('keyup', this.keyUpHandler);
  }

  detach(): void {
    window.removeEventListener('keydown', this.keyDownHandler);
    window.removeEventListener('keyup', this.keyUpHandler);
  }

  private handleKeyDown(e: KeyboardEvent): void {
    this.setKey(e.key, true);
  }

  private handleKeyUp(e: KeyboardEvent): void {
    this.setKey(e.key, false);
  }

  private setKey(key: string, down: boolean): void {
    switch (key) {
      case 'ArrowLeft': case 'a': case 'A': this.keys.left = down; break;
      case 'ArrowRight': case 'd': case 'D': this.keys.right = down; break;
      case 'ArrowUp': case 'w': case 'W': this.keys.up = down; break;
      case ' ': this.keys.space = down; break;
    }
  }
}
```

**What's happening:**
- We store bound handler references so `detach()` can properly clean up listeners later.
- `setKey` maps arrow keys **and** WASD to the same logical controls so both work.
- The `keys` object is `readonly` from outside but mutated internally. The physics system will read it directly each frame.

---

### 3. Create the Game Renderer

**File:** `src/contexts/canvas2d/games/asteroids/renderers/GameRenderer.ts`

Draw the starfield background and the ship:

```typescript
import type { AsteroidsState } from '../types';
import { SHIP_RADIUS } from '../types';

export class GameRenderer {
  render(ctx: CanvasRenderingContext2D, state: AsteroidsState): void {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    // Clear to space-black
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, W, H);

    // Draw stars
    this.drawStars(ctx, W, H);

    // Draw ship
    this.drawShip(ctx, state);
  }

  private drawStars(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    // Deterministic stars — same positions every frame, no flicker
    let seed = W * 137 + H * 251;
    const next = () => {
      seed = (seed * 16807 + 7) % 2147483647;
      return seed / 2147483647;
    };
    ctx.fillStyle = '#334';
    for (let i = 0; i < 120; i++) {
      const x = next() * W;
      const y = next() * H;
      const r = next() * 1.4;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawShip(ctx: CanvasRenderingContext2D, state: AsteroidsState): void {
    const ship = state.ship;

    ctx.save();
    ctx.translate(ship.pos.x, ship.pos.y);
    ctx.rotate(ship.angle);

    // Ship outline — a triangle with a notch at the back
    ctx.strokeStyle = '#9b59b6';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -SHIP_RADIUS);                       // nose (top)
    ctx.lineTo(-SHIP_RADIUS * 0.7, SHIP_RADIUS * 0.7); // bottom-left
    ctx.lineTo(0, SHIP_RADIUS * 0.4);                   // notch
    ctx.lineTo(SHIP_RADIUS * 0.7, SHIP_RADIUS * 0.7);  // bottom-right
    ctx.closePath();
    ctx.stroke();

    ctx.restore();
  }
}
```

**What's happening:**
- `drawStars` uses a seeded pseudo-random generator so the stars look random but are identical every frame. No array storage needed.
- `ctx.save()` / `ctx.restore()` isolates the translate + rotate so subsequent draws are unaffected.
- The ship shape is four points: a nose at `(0, -SHIP_RADIUS)`, two rear fins, and a center notch that gives the classic Asteroids silhouette.
- Because we translated to the ship's position first, all coordinates in `drawShip` are relative to the ship center. `ctx.rotate(ship.angle)` rotates the entire shape around that center.

---

### 4. Create the Engine

**File:** `src/contexts/canvas2d/games/asteroids/AsteroidsEngine.ts`

Wire the input system, renderer, and game loop together:

```typescript
import type { AsteroidsState } from './types';
import { SHIP_ROTATION_SPEED } from './types';
import { InputSystem } from './systems/InputSystem';
import { GameRenderer } from './renderers/GameRenderer';

export class AsteroidsEngine {
  private ctx: CanvasRenderingContext2D;
  private state: AsteroidsState;
  private running = false;
  private rafId = 0;

  private inputSystem: InputSystem;
  private gameRenderer: GameRenderer;

  constructor(canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    this.state = {
      ship: {
        pos: { x: canvas.width / 2, y: canvas.height / 2 },
        vel: { x: 0, y: 0 },
        angle: 0,
        thrusting: false,
      },
      width: canvas.width,
      height: canvas.height,
    };

    this.inputSystem = new InputSystem(this.state);
    this.gameRenderer = new GameRenderer();

    this.inputSystem.attach();
  }

  start(): void {
    this.running = true;
    this.loop();
  }

  destroy(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
    this.inputSystem.detach();
  }

  private loop(): void {
    if (!this.running) return;

    // Rotate ship based on held keys
    const ship = this.state.ship;
    if (this.inputSystem.keys.left) ship.angle -= SHIP_ROTATION_SPEED;
    if (this.inputSystem.keys.right) ship.angle += SHIP_ROTATION_SPEED;

    // Render
    this.gameRenderer.render(this.ctx, this.state);

    this.rafId = requestAnimationFrame(() => this.loop());
  }
}
```

**What's happening:**
- The ship starts dead center with angle `0` (pointing up).
- Each frame we check `keys.left` and `keys.right` and adjust the angle. Because rotation speed is radians per frame (~0.065 = ~3.7 degrees), it feels smooth and responsive.
- Rotation is applied **before** rendering, so the player sees immediate feedback.
- We will move the rotation logic into a PhysicsSystem in Step 2.

---

### 5. Create the Entry Point

**File:** `src/contexts/canvas2d/games/asteroids/index.ts`

Export the game so it can be launched:

```typescript
import { AsteroidsEngine } from './AsteroidsEngine';

export function createAsteroids(canvas: HTMLCanvasElement): { destroy: () => void } {
  const engine = new AsteroidsEngine(canvas);
  engine.start();
  return { destroy: () => engine.destroy() };
}
```

---

## Test It

1. **Run:** `npm run dev`
2. **Open:** the Asteroids game
3. **Observe:**
   - Dark background sprinkled with small grey stars
   - Purple triangular ship in the dead center of the screen
   - Press **Left** or **Right** arrow and watch the ship rotate smoothly
   - Release the key and the ship holds its angle
   - Press **A** or **D** as an alternative to the arrow keys

**Hold Left for a full second.** The ship should complete roughly one full rotation, confirming the rotation speed feels right for gameplay.

---

## Try It

- Change `SHIP_ROTATION_SPEED` to `0.12` for faster turning, or `0.03` for a sluggish freighter feel.
- Change the ship color from `#9b59b6` to `#0f0` for a classic green vector look.
- Add `ctx.fillStyle = '#9b59b6'; ctx.fill();` after `ctx.stroke()` in `drawShip` to make the ship solid instead of outlined.

---

## Challenges

**Easy:**
- Make the ship larger by increasing `SHIP_RADIUS` to 25.
- Change the star color from `#334` to a brighter `#aaa` for a denser galaxy.

**Medium:**
- Draw a small circle at the ship's nose to show which direction it is facing.
- Add a faint rotating ring around the ship (hint: draw an arc inside the `save/restore` block, offset from the ship's angle).

**Hard:**
- Make the ship shape an actual pentagon or hexagon instead of a triangle.
- Draw the ship as a filled polygon with a gradient fill that changes based on the current angle.

---

## What You Learned

- Canvas transform stack: `save()`, `translate()`, `rotate()`, `restore()`
- Drawing shapes relative to a local origin (the ship's center)
- Tracking held keys with `keydown`/`keyup` and polling them each frame
- Seeded pseudo-random starfield that is stable across frames
- Game loop structure with `requestAnimationFrame`

**Next:** Thrust, momentum, drag, and screen wrapping to make the ship fly!
