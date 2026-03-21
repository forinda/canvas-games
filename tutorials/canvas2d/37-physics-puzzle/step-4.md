# Step 4: Dynamic Objects & Interactions

**Goal:** Add dynamic boxes, bouncy surfaces, and seesaws so the puzzle world has richer interactions.

**Time:** ~15 minutes

---

## What You'll Build

- **Dynamic boxes** that fall under gravity and collide with the ball and each other
- **Bouncy surfaces** with high restitution that launch the ball upward
- **Dynamic-to-dynamic collision** so the ball and boxes push each other
- **Varied restitution values** for different surface types (rubber, wood, stone)
- **A richer level** with multiple interacting objects

---

## Concepts

- **Dynamic vs. Static**: Static bodies (`isStatic: true`) never move -- they are walls, ground, and platforms. Dynamic bodies have finite mass, receive gravity, and react to collisions. The collision system now needs to handle dynamic-vs-dynamic pairs, not just dynamic-vs-static.
- **Restitution Per Body**: Different materials bounce differently. A rubber bumper has `restitution: 0.9` (keeps 90% of velocity), while a wooden plank has `restitution: 0.3`. When two bodies collide, we use the moving body's restitution value.
- **Mass-Based Response**: When two dynamic objects collide, the lighter one should be pushed more. We use a simplified mass ratio: `massRatio = other.mass / (b.mass + other.mass)` to scale the velocity change.
- **Chain Reactions**: With multiple dynamic objects, dropping the ball onto a box can push the box into another object, creating Rube Goldberg-style chain reactions -- the core fun of a physics puzzle.

---

## Code

### 1. Update the Collision System

**File:** `src/contexts/canvas2d/games/physics-puzzle/systems/CollisionSystem.ts`

Extend collision handling to support dynamic-vs-dynamic interactions and per-body restitution.

```typescript
import type { Body, PuzzleState } from '../types';

export function boxOverlap(a: Body, b: Body): boolean {
  return (
    a.x < b.x + b.w && a.x + a.w > b.x &&
    a.y < b.y + b.h && a.y + a.h > b.y
  );
}

export class CollisionSystem {
  update(state: PuzzleState, _dt: number): void {
    const bodies = state.bodies;

    for (let i = 0; i < bodies.length; i++) {
      const b = bodies[i];
      if (b.isStatic) continue;

      for (let j = 0; j < bodies.length; j++) {
        if (i === j) continue;
        const other = bodies[j];

        if (!boxOverlap(b, other)) continue;

        const overlapY = b.y + b.h - other.y;
        const overlapBottom = other.y + other.h - b.y;
        const overlapLeft = b.x + b.w - other.x;
        const overlapRight = other.x + other.w - b.x;

        const minOverlap = Math.min(
          overlapY, overlapBottom, overlapLeft, overlapRight,
        );

        const bounce = b.restitution;

        if (other.isStatic) {
          // Dynamic vs Static (same as before)
          if (minOverlap === overlapY && b.vy > 0) {
            b.y = other.y - b.h;
            b.vy = -b.vy * bounce;
            b.vx *= 0.95;
          } else if (minOverlap === overlapBottom && b.vy < 0) {
            b.y = other.y + other.h;
            b.vy = -b.vy * bounce;
          } else if (minOverlap === overlapLeft) {
            b.x = other.x - b.w;
            b.vx = -b.vx * bounce;
          } else if (minOverlap === overlapRight) {
            b.x = other.x + other.w;
            b.vx = -b.vx * bounce;
          }
        } else {
          // Dynamic vs Dynamic -- use mass ratio
          const totalMass = b.mass + other.mass;
          const ratioB = other.mass / totalMass;
          const ratioO = b.mass / totalMass;

          if (minOverlap === overlapY && b.vy > 0) {
            b.y = other.y - b.h;
            const relVy = b.vy - other.vy;
            b.vy -= relVy * ratioB * (1 + bounce);
            other.vy += relVy * ratioO * (1 + bounce);
            b.vx *= 0.95;
          } else if (minOverlap === overlapBottom && b.vy < 0) {
            b.y = other.y + other.h;
            const relVy = b.vy - other.vy;
            b.vy -= relVy * ratioB * (1 + bounce);
            other.vy += relVy * ratioO * (1 + bounce);
          } else if (minOverlap === overlapLeft) {
            b.x = other.x - b.w;
            const relVx = b.vx - other.vx;
            b.vx -= relVx * ratioB * (1 + bounce);
            other.vx += relVx * ratioO * (1 + bounce);
          } else if (minOverlap === overlapRight) {
            b.x = other.x + other.w;
            const relVx = b.vx - other.vx;
            b.vx -= relVx * ratioB * (1 + bounce);
            other.vx += relVx * ratioO * (1 + bounce);
          }
        }
      }
    }
  }
}
```

**What's happening:**
- The system now handles both dynamic-vs-static and dynamic-vs-dynamic collisions. The `other.isStatic` check branches into two resolution paths.
- For dynamic-vs-dynamic, we compute the relative velocity and distribute the impulse based on mass ratios. A heavy box barely moves when hit by the ball, while the ball bounces away. Two equal-mass objects share the impulse evenly.
- The `(1 + bounce)` factor comes from the coefficient of restitution formula: a perfectly elastic collision (restitution = 1) reverses relative velocity entirely, while a perfectly inelastic collision (restitution = 0) absorbs all relative velocity.
- Position correction still snaps the first body to the surface of the second, preventing overlap from accumulating.

---

### 2. Update the Engine with Dynamic Objects

**File:** `src/contexts/canvas2d/games/physics-puzzle/PuzzleEngine.ts`

Add dynamic boxes and a bouncy surface to the initial world.

```typescript
import type { PuzzleState } from './types';
import { makeBody, resetBodyId } from './types';
import { PhysicsSystem } from './systems/PhysicsSystem';
import { CollisionSystem } from './systems/CollisionSystem';
import { WorldRenderer } from './renderers/WorldRenderer';
import { InventoryRenderer } from './renderers/InventoryRenderer';

export class PuzzleEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private systems: { update(state: PuzzleState, dt: number): void }[];
  private renderers: { render(ctx: CanvasRenderingContext2D, state: PuzzleState): void }[];
  state: PuzzleState;
  private rafId = 0;
  private running = false;
  private lastTime = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    this.systems = [
      new PhysicsSystem(),
      new CollisionSystem(),
    ];
    this.renderers = [
      new WorldRenderer(),
      new InventoryRenderer(),
    ];

    resetBodyId();
    const H = canvas.height;
    const W = canvas.width;
    const groundY = H - 60;
    const bodies = [
      makeBody('ground', 0, groundY, W, 60, true, '#4a6741'),
      // Ball
      makeBody('ball', 100, groundY - 30, 30, 30, false, '#f59e0b'),
      // Goal
      makeBody('goal', 600, groundY - 40, 40, 40, true, '#4ade80'),
      // Static wall obstacle
      makeBody('box', 300, groundY - 80, 40, 80, true, '#666'),
      // Dynamic box (will be pushed by the ball)
      makeBody('box', 450, groundY - 40, 40, 40, false, '#a0522d'),
      // Bouncy bumper (high restitution)
      makeBody('box', 200, groundY - 20, 80, 20, true, '#e74c3c'),
    ];
    bodies[1].radius = 15;
    // Make the dynamic box heavier
    bodies[4].mass = 2.0;
    // Make the bumper bouncy
    bodies[5].restitution = 0.9;

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
      maxPieces: 3,
      inventory: [
        { type: 'plank', color: '#8b5e3c', w: 120, h: 16 },
        { type: 'plank', color: '#8b5e3c', w: 80, h: 16 },
        { type: 'box', color: '#a0522d', w: 40, h: 40 },
      ],
      selectedInventory: 0,
      simulating: false,
      score: 0,
      message: 'Place pieces, then SPACE to simulate! Red = bouncy!',
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
      for (const sys of this.systems) {
        sys.update(this.state, dt);
      }
    }

    for (const renderer of this.renderers) {
      renderer.render(this.ctx, this.state);
    }

    this.rafId = requestAnimationFrame((t) => this.loop(t));
  }
}
```

**What's happening:**
- A **dynamic brown box** sits between the wall and the goal. When the ball reaches it, both objects exchange momentum -- the ball might push the box toward the goal, or bounce off depending on the angle.
- A **red bouncy bumper** near the left has `restitution: 0.9`. If the ball hits it, it launches back upward with almost full velocity -- like a pinball bumper.
- The dynamic box has `mass = 2.0` (heavier than the ball's default ~9.0 from `30 * 30 * 0.01`), demonstrating how mass affects collision response.
- The world is getting richer: static obstacles, dynamic objects, and different surface types all interact through the same collision system.

---

## Test It

1. **Run:** `npm run dev`
2. **Open:** the Physics Puzzle game in your browser
3. **Observe:**
   - The scene has a ball, a static wall, a **dynamic brown box**, and a **red bouncy bumper**
   - Place planks to create a ramp, then press **Space** to simulate
   - Watch the ball **push the dynamic box** when they collide -- both bodies react
   - If the ball hits the **red bumper**, it bounces much higher than off normal surfaces
   - The brown box slides along the ground with friction after being pushed
   - Try different piece placements to get the ball and box to interact in interesting ways

---

## Challenges

**Easy:**
- Change the bouncy bumper's restitution to `1.0` for a perfectly elastic bounce (the ball returns to its original height).
- Add a second dynamic box and watch chain reactions.

**Medium:**
- Create a "seesaw" by placing a dynamic plank balanced on a small static pivot box. When the ball lands on one end, the other end should tilt up.

**Hard:**
- Implement a simple angular velocity: when a dynamic box is hit on one side, it should start rotating. Add a `angularVel` field to `Body` and update `rotation` in the physics system. Use `ctx.rotate()` in the renderer.

---

## What You Learned

- Resolving dynamic-vs-dynamic collisions using mass ratios for realistic momentum transfer
- Using per-body restitution to create different surface types (rubber, wood, stone)
- Building chain reactions where one collision triggers another
- Understanding the coefficient of restitution formula: `(1 + e) * relativeVelocity`

**Next:** Goal detection and level progression -- completing puzzles and loading new ones!
