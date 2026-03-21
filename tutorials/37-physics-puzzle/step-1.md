# Step 1: Project Setup & Physics World

**Goal:** Set up a physics simulation with gravity and a ball that falls under its own weight.

**Time:** ~15 minutes

---

## What You'll Build

- **Type definitions** for rigid bodies, inventory, and full game state
- **A physics world** with constant gravity pulling objects downward
- **A ball** that spawns and falls under gravity each frame
- **A gradient background** with the ball rendered as a glowing circle
- **A game loop** driven by `requestAnimationFrame` with delta-time

---

## Concepts

- **Rigid Body Representation**: Every object in the physics world (ball, box, plank, ground, goal) shares a common `Body` interface with position, velocity, size, mass, and a `type` discriminator. Static bodies have infinite mass and never move.
- **Gravity as Acceleration**: Each frame we add `GRAVITY * dt` to a body's `vy`. This is Euler integration -- simple and good enough for a puzzle game. A `DAMPING` factor (0.98) bleeds off velocity to keep things stable.
- **Factory Function**: `makeBody()` stamps out bodies with auto-incrementing IDs and sensible defaults. Mass is derived from area (`w * h * 0.01`) so larger objects are heavier.
- **Fixed Delta-Time Cap**: We clamp `dt` to 0.05 seconds so a long pause (switching tabs) does not cause a physics explosion.

---

## Code

### 1. Create Types

**File:** `src/games/physics-puzzle/types.ts`

All shared types and constants defined up front. Later steps import from here without modification.

```typescript
export interface Body {
  id: number;
  x: number; y: number;
  vx: number; vy: number;
  w: number; h: number;
  rotation: number;
  mass: number;
  isStatic: boolean;
  color: string;
  type: 'box' | 'plank' | 'ball' | 'goal' | 'ground';
  radius?: number;
  restitution: number;
}

export interface InventoryItem {
  type: Body['type'];
  color: string;
  w: number;
  h: number;
}

export interface PuzzleState {
  bodies: Body[];
  level: number;
  solved: boolean;
  started: boolean;
  gameOver: boolean;
  dragging: number | null; // body id
  dragOffX: number;
  dragOffY: number;
  placed: number; // pieces placed count
  maxPieces: number;
  inventory: InventoryItem[];
  selectedInventory: number;
  simulating: boolean;
  score: number;
  message: string;
}

export const GRAVITY = 400;
export const DAMPING = 0.98;

let _bodyId = 0;

export function resetBodyId(): void {
  _bodyId = 0;
}

export function makeBody(
  type: Body['type'], x: number, y: number,
  w: number, h: number, isStatic: boolean, color: string,
): Body {
  return {
    id: ++_bodyId, x, y, vx: 0, vy: 0, w, h, rotation: 0,
    mass: isStatic ? Infinity : w * h * 0.01,
    isStatic, color, type, restitution: 0.3,
  };
}
```

**What's happening:**
- `Body` is the universal physics object. The `type` field lets renderers and systems treat balls, planks, boxes, and goals differently while sharing the same physics data.
- `PuzzleState` holds everything: the body list, level progression, inventory of placeable pieces, simulation toggle, and score. Defining it all now means later steps only add systems, never restructure.
- `GRAVITY = 400` means 400 pixels/second-squared downward. `DAMPING = 0.98` multiplies velocity each frame, gradually slowing things and preventing runaway energy.
- `makeBody()` auto-assigns an incrementing `id` and computes `mass` from area. Static bodies get `Infinity` mass so collisions never move them.

---

### 2. Create the Physics System

**File:** `src/games/physics-puzzle/systems/PhysicsSystem.ts`

Applies gravity and velocity integration to every non-static body.

```typescript
import type { PuzzleState } from '../types';
import { GRAVITY, DAMPING } from '../types';

export class PhysicsSystem {
  update(state: PuzzleState, dt: number): void {
    for (const b of state.bodies) {
      if (b.isStatic) continue;

      // Gravity
      b.vy += GRAVITY * dt;
      b.vx *= DAMPING;
      b.vy *= DAMPING;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
    }
  }
}
```

**What's happening:**
- We skip static bodies (ground, platforms) since they should never move.
- `b.vy += GRAVITY * dt` accelerates the body downward. This is the same as real-world `v = v + a*t`.
- Damping is applied each frame: `vx *= 0.98` bleeds 2% of horizontal speed, preventing perpetual sliding.
- Finally we integrate position: `x += vx * dt`. This is Euler integration -- not perfectly accurate, but fast and simple enough for a puzzle game.

---

### 3. Create the World Renderer

**File:** `src/games/physics-puzzle/renderers/WorldRenderer.ts`

Draws the gradient background and all physics bodies.

```typescript
import type { PuzzleState } from '../types';

export class WorldRenderer {
  render(ctx: CanvasRenderingContext2D, state: PuzzleState): void {
    const canvas = ctx.canvas;
    const W = canvas.width, H = canvas.height;

    // Background
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#1a1020');
    grad.addColorStop(1, '#0a1520');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Bodies
    for (const b of state.bodies) {
      ctx.fillStyle = b.color;

      if (b.type === 'goal') {
        // Glowing goal
        ctx.shadowColor = '#4ade80';
        ctx.shadowBlur = 15;
        ctx.fillStyle = '#4ade80';
        ctx.fillRect(b.x, b.y, b.w, b.h);
        ctx.shadowBlur = 0;
        ctx.font = `${b.w}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('\u2B50', b.x + b.w / 2, b.y + b.h / 2);
      } else if (b.radius) {
        // Ball
        ctx.shadowColor = b.color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(b.x + b.w / 2, b.y + b.h / 2, b.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      } else {
        ctx.fillRect(b.x, b.y, b.w, b.h);
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.lineWidth = 1;
        ctx.strokeRect(b.x, b.y, b.w, b.h);
      }
    }
  }
}
```

**What's happening:**
- The background is a dark vertical gradient from purple-black to blue-black, giving the scene depth.
- Bodies are drawn based on their `type`. Balls use `ctx.arc()` with a glow effect via `shadowBlur`. Goals get a green glow and a star emoji. Everything else is a simple filled rectangle with a subtle white border.
- We iterate every body in the state array, so any new body added to the world automatically renders.

---

### 4. Create the Engine

**File:** `src/games/physics-puzzle/PuzzleEngine.ts`

The engine creates the initial state, wires systems and renderers, and runs the game loop.

```typescript
import type { PuzzleState } from './types';
import { makeBody, resetBodyId } from './types';
import { PhysicsSystem } from './systems/PhysicsSystem';
import { WorldRenderer } from './renderers/WorldRenderer';

export class PuzzleEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private physics: PhysicsSystem;
  private worldRenderer: WorldRenderer;
  state: PuzzleState;
  private rafId = 0;
  private running = false;
  private lastTime = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    this.physics = new PhysicsSystem();
    this.worldRenderer = new WorldRenderer();

    // Build a minimal world: ground + ball
    resetBodyId();
    const H = canvas.height;
    const groundY = H - 60;
    const bodies = [
      makeBody('ground', 0, groundY, canvas.width, 60, true, '#4a6741'),
      makeBody('ball', 200, 100, 30, 30, false, '#f59e0b'),
    ];
    bodies[1].radius = 15;

    this.state = {
      bodies,
      level: 1,
      solved: false,
      started: true,
      gameOver: false,
      dragging: null,
      dragOffX: 0,
      dragOffY: 0,
      placed: 0,
      maxPieces: 0,
      inventory: [],
      selectedInventory: 0,
      simulating: true, // auto-simulate so the ball falls
      score: 0,
      message: '',
    };
  }

  start(): void {
    this.running = true;
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
  }

  private loop(timestamp: number): void {
    if (!this.running) return;

    const dt = Math.min((timestamp - this.lastTime) / 1000, 0.05);
    this.lastTime = timestamp;

    if (this.state.simulating && !this.state.solved) {
      this.physics.update(this.state, dt);
    }

    this.worldRenderer.render(this.ctx, this.state);

    this.rafId = requestAnimationFrame((t) => this.loop(t));
  }
}
```

**What's happening:**
- The constructor creates a minimal world: a green ground bar at the bottom plus a ball near the top. The ball has `radius = 15` so the renderer draws it as a circle.
- We set `simulating: true` and `started: true` so the ball begins falling immediately -- this lets us verify our physics loop works.
- The game loop calculates `dt` (delta time in seconds), caps it at 0.05 to prevent physics explosions, runs the physics system, then renders the world.
- Later steps will add more systems (collision, goal detection) to the `update` pipeline and more renderers (HUD, inventory) to the render pipeline.

---

### 5. Create the Platform Adapter

**File:** `src/games/physics-puzzle/adapters/PlatformAdapter.ts`

A thin wrapper so the game plugs into any host page.

```typescript
import { PuzzleEngine } from '../PuzzleEngine';

export class PlatformAdapter {
  private engine: PuzzleEngine;

  constructor(canvas: HTMLCanvasElement) {
    this.engine = new PuzzleEngine(canvas);
  }

  start(): void {
    this.engine.start();
  }

  destroy(): void {
    this.engine.stop();
  }
}
```

---

### 6. Create the Entry Point

**File:** `src/games/physics-puzzle/index.ts`

```typescript
import { PlatformAdapter } from './adapters/PlatformAdapter';

export function createPhysicsPuzzle(canvas: HTMLCanvasElement): { destroy: () => void } {
  const adapter = new PlatformAdapter(canvas);
  adapter.start();
  return { destroy: () => adapter.destroy() };
}
```

---

## Test It

1. **Run:** `npm run dev`
2. **Open:** the Physics Puzzle game in your browser
3. **Observe:**
   - A dark gradient background fills the screen
   - A **green ground bar** sits at the bottom of the canvas
   - A **glowing orange ball** spawns near the top-left and **falls** under gravity
   - The ball **passes through** the ground (no collision yet!) and disappears off-screen
   - Resize the window and the canvas updates

---

## Challenges

**Easy:**
- Change `GRAVITY` to `200` and watch the ball fall in slow motion. Try `800` for a heavy-gravity world.
- Change the ball color from `#f59e0b` to `#38bdf8` for a blue ball.

**Medium:**
- Add a second ball at position `(400, 50)` and watch both fall simultaneously.

**Hard:**
- Add a `rotation` update to `PhysicsSystem` so the ball slowly spins as it falls (increment `b.rotation += b.vx * 0.01 * dt`). Then modify the renderer to use `ctx.rotate()` before drawing.

---

## What You Learned

- Defining a universal `Body` interface that all physics objects share
- Implementing Euler integration: `velocity += acceleration * dt`, then `position += velocity * dt`
- Using `requestAnimationFrame` with delta-time capping for a smooth, stable game loop
- Rendering circles with `ctx.arc()` and glow effects with `ctx.shadowBlur`

**Next:** Static platforms and collision response -- the ball will finally bounce off the ground!
