# Step 2: Thrust & Momentum

**Goal:** Add forward thrust, inertia-based movement, drag, screen wrapping, and a flickering flame effect.

**Time:** ~15 minutes

---

## What You'll Build

Building on the rotating ship from Step 1:
- **Thrust**: Up arrow accelerates the ship in the direction it is facing
- **Inertia**: The ship keeps drifting when you release the thrust key — no friction in space
- **Drag**: A small drag factor gradually slows the ship so it does not drift forever
- **Screen wrapping**: Fly off the right edge, reappear on the left (and same for all four edges)
- **Thrust flame**: A flickering orange triangle behind the ship when thrusting

---

## Concepts

- **Thrust Vector from Angle**: `vel.x += sin(angle) * thrust`, `vel.y -= cos(angle) * thrust`. We use `sin` for X and `-cos` for Y because angle `0` points up (negative Y in canvas coordinates)
- **Drag / Damping**: Multiply velocity by a factor slightly less than 1 each frame (`0.99`). This simulates very light friction so the ship eventually stops
- **Screen Wrapping**: If `pos.x > width`, set `pos.x = 0` (and vice versa). Same for Y. Every entity in Asteroids wraps

---

## Code

### 1. Add Constants to Types

**File:** `src/contexts/canvas2d/games/asteroids/types.ts`

Add the thrust and drag constants:

```typescript
// ── Constants ──────────────────────────────────────────────
export const SHIP_RADIUS = 15;
export const SHIP_THRUST = 0.12;
export const SHIP_DRAG = 0.99;
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
- `SHIP_THRUST` is the acceleration per frame when the Up key is held. At `0.12` pixels/frame^2, it takes about a second of thrusting to reach a noticeable speed.
- `SHIP_DRAG` at `0.99` means the ship retains 99% of its velocity each frame. Without thrust, it drifts to a stop after a few seconds.

---

### 2. Create the Physics System

**File:** `src/contexts/canvas2d/games/asteroids/systems/PhysicsSystem.ts`

Move rotation out of the engine and add thrust, drag, movement, and wrapping:

```typescript
import type { AsteroidsState } from '../types';
import { SHIP_THRUST, SHIP_DRAG, SHIP_ROTATION_SPEED } from '../types';
import type { InputKeys } from './InputSystem';

export class PhysicsSystem {
  private keys: InputKeys;

  constructor(keys: InputKeys) {
    this.keys = keys;
  }

  update(state: AsteroidsState): void {
    this.updateShip(state);
  }

  private updateShip(state: AsteroidsState): void {
    const ship = state.ship;
    const { width, height } = state;

    // Rotation
    if (this.keys.left) ship.angle -= SHIP_ROTATION_SPEED;
    if (this.keys.right) ship.angle += SHIP_ROTATION_SPEED;

    // Thrust
    ship.thrusting = this.keys.up;
    if (ship.thrusting) {
      ship.vel.x += Math.sin(ship.angle) * SHIP_THRUST;
      ship.vel.y -= Math.cos(ship.angle) * SHIP_THRUST;
    }

    // Drag
    ship.vel.x *= SHIP_DRAG;
    ship.vel.y *= SHIP_DRAG;

    // Move
    ship.pos.x += ship.vel.x;
    ship.pos.y += ship.vel.y;

    // Screen wrap
    ship.pos.x = this.wrap(ship.pos.x, width);
    ship.pos.y = this.wrap(ship.pos.y, height);
  }

  private wrap(val: number, max: number): number {
    if (val < 0) return val + max;
    if (val > max) return val - max;
    return val;
  }
}
```

**What's happening:**
- **Rotation** is unchanged from Step 1 but now lives in the physics system where it belongs.
- **Thrust** adds to velocity using `sin(angle)` for X and `-cos(angle)` for Y. Think of it this way: when `angle = 0` (pointing up), `sin(0) = 0` (no horizontal push) and `-cos(0) = -1` (push upward, which is negative Y in canvas).
- **Drag** multiplies both velocity components by `0.99`. This is applied every frame regardless of thrusting. The result: if you thrust and release, the ship gradually slows to a crawl.
- **Wrap** is clean: if the position goes past one edge, add or subtract the canvas dimension to pop it out the opposite side.

---

### 3. Add Thrust Flame to the Renderer

**File:** `src/contexts/canvas2d/games/asteroids/renderers/GameRenderer.ts`

Add a flame effect to `drawShip`:

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

    // Ship outline
    ctx.strokeStyle = '#9b59b6';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -SHIP_RADIUS);
    ctx.lineTo(-SHIP_RADIUS * 0.7, SHIP_RADIUS * 0.7);
    ctx.lineTo(0, SHIP_RADIUS * 0.4);
    ctx.lineTo(SHIP_RADIUS * 0.7, SHIP_RADIUS * 0.7);
    ctx.closePath();
    ctx.stroke();

    // Thrust flame — only when engine is firing
    if (ship.thrusting) {
      ctx.strokeStyle = '#f80';
      ctx.lineWidth = 1.5;
      const flicker = 0.7 + Math.random() * 0.6;
      ctx.beginPath();
      ctx.moveTo(-SHIP_RADIUS * 0.35, SHIP_RADIUS * 0.5);
      ctx.lineTo(0, SHIP_RADIUS * (0.7 + 0.5 * flicker));
      ctx.lineTo(SHIP_RADIUS * 0.35, SHIP_RADIUS * 0.5);
      ctx.stroke();
    }

    ctx.restore();
  }
}
```

**What's happening:**
- The flame is a small orange triangle drawn behind the ship's notch.
- `flicker` randomizes the flame length each frame between `0.7` and `1.3`, creating a convincing engine sputter.
- Because the flame is drawn inside the same `save/restore` block as the ship, it rotates with the ship automatically.

---

### 4. Update the Engine

**File:** `src/contexts/canvas2d/games/asteroids/AsteroidsEngine.ts`

Replace the inline rotation with the PhysicsSystem:

```typescript
import type { AsteroidsState } from './types';
import { InputSystem } from './systems/InputSystem';
import { PhysicsSystem } from './systems/PhysicsSystem';
import { GameRenderer } from './renderers/GameRenderer';

export class AsteroidsEngine {
  private ctx: CanvasRenderingContext2D;
  private state: AsteroidsState;
  private running = false;
  private rafId = 0;

  private inputSystem: InputSystem;
  private physicsSystem: PhysicsSystem;
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
    this.physicsSystem = new PhysicsSystem(this.inputSystem.keys);
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

    this.physicsSystem.update(this.state);
    this.gameRenderer.render(this.ctx, this.state);

    this.rafId = requestAnimationFrame(() => this.loop());
  }
}
```

**What's happening:**
- The engine is now clean: one line to update physics, one line to render.
- `PhysicsSystem` receives a reference to `inputSystem.keys` so it can read which keys are held each frame.
- Rotation logic that was inline in Step 1 now lives in `PhysicsSystem.updateShip()`.

---

## Test It

1. **Run:** `npm run dev`
2. **Open:** the Asteroids game
3. **Observe:**
   - Ship rotates with Left/Right as before
   - Press **Up** and the ship accelerates forward with a flickering orange flame
   - Release Up and the ship **keeps drifting** — this is inertia!
   - The ship gradually slows down thanks to drag
   - Fly off any edge and the ship reappears on the opposite side
   - Rotate 180 degrees and thrust to brake (thrust opposite to your drift direction)

**Try this:** Point up, thrust for one second, then rotate 90 degrees right and thrust again. The ship should curve — its old upward momentum mixes with the new rightward thrust.

---

## Try It

- Set `SHIP_DRAG` to `1.0` for true zero-friction space (the ship never slows down).
- Set `SHIP_DRAG` to `0.95` for heavy friction that feels like driving on ice.
- Set `SHIP_THRUST` to `0.3` and `SHIP_DRAG` to `0.98` for a fast, twitchy ship.

---

## Challenges

**Easy:**
- Make the flame change color from orange to yellow to white based on how long you have been thrusting (count thrust frames).
- Add a second, smaller flame inside the first for a "double flame" effect.

**Medium:**
- Add a speed cap so the ship cannot exceed a maximum velocity. Hint: compute `Math.sqrt(vel.x*vel.x + vel.y*vel.y)` and scale down if it exceeds the cap.
- Draw a faint trail behind the ship by storing the last 20 positions and drawing small dots with decreasing alpha.

**Hard:**
- Implement "hyperspace": press Shift to teleport the ship to a random position with zero velocity. Add a 30% chance of exploding on arrival.
- Add a minimap in the corner that shows a zoomed-out view of the ship's position on the screen.

---

## What You Learned

- Thrust vectors using `sin(angle)` and `cos(angle)` to convert an angle into X/Y acceleration
- Inertia: adding to velocity each frame instead of setting position directly
- Drag as a simple velocity multiplier (`vel *= 0.99`)
- Screen wrapping by checking bounds and adding/subtracting the canvas dimension
- Flame rendering with random flicker for visual polish

**Next:** Firing bullets in the direction the ship is facing!
