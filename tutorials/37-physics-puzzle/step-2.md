# Step 2: Static Platforms & Collision

**Goal:** Add static platforms, detect axis-aligned bounding-box overlaps, and resolve collisions so the ball bounces off surfaces.

**Time:** ~15 minutes

---

## What You'll Build

- **AABB collision detection** between dynamic and static bodies
- **Collision resolution** that pushes the ball out of overlapping surfaces and reverses velocity
- **Restitution** (bounciness) so the ball loses energy with each bounce
- **Surface friction** that slows horizontal movement on landing
- **Static platforms** placed in the world to demonstrate bouncing and sliding

---

## Concepts

- **AABB Overlap Test**: Two axis-aligned rectangles overlap when `a.x < b.x + b.w` AND `a.x + a.w > b.x` AND the same for `y`. This is the fastest possible 2D collision check.
- **Minimum Penetration Resolution**: When two boxes overlap, we calculate the penetration depth on all four sides (top, bottom, left, right) and resolve along the shallowest one. This prevents the ball from tunnelling through thin platforms.
- **Restitution (Coefficient of Restitution)**: After a collision, we multiply the reflected velocity by `restitution` (0.3 = 30% energy kept). This makes the ball lose height with each bounce until it settles.
- **Friction on Landing**: When the ball lands on top of a surface, we multiply `vx *= 0.95`, simulating friction that slows horizontal sliding.

---

## Code

### 1. Create the Collision System

**File:** `src/games/physics-puzzle/systems/CollisionSystem.ts`

Detects AABB overlaps between dynamic and static bodies, then resolves them.

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
    for (const b of state.bodies) {
      if (b.isStatic) continue;

      // Collision with static bodies
      for (const other of state.bodies) {
        if (other === b || !other.isStatic) continue;

        if (boxOverlap(b, other)) {
          // Calculate penetration on all four sides
          const overlapY = b.y + b.h - other.y;        // ball bottom vs other top
          const overlapBottom = other.y + other.h - b.y; // other bottom vs ball top
          const overlapLeft = b.x + b.w - other.x;      // ball right vs other left
          const overlapRight = other.x + other.w - b.x;  // other right vs ball left

          const minOverlap = Math.min(
            overlapY, overlapBottom, overlapLeft, overlapRight,
          );

          if (minOverlap === overlapY && b.vy > 0) {
            b.y = other.y - b.h;
            b.vy = -b.vy * b.restitution;
            b.vx *= 0.95; // friction
          } else if (minOverlap === overlapBottom && b.vy < 0) {
            b.y = other.y + other.h;
            b.vy = -b.vy * b.restitution;
          } else if (minOverlap === overlapLeft) {
            b.x = other.x - b.w;
            b.vx = -b.vx * b.restitution;
          } else if (minOverlap === overlapRight) {
            b.x = other.x + other.w;
            b.vx = -b.vx * b.restitution;
          }
        }
      }
    }
  }
}
```

**What's happening:**
- `boxOverlap()` is a standalone function because the GoalSystem will reuse it later. It returns `true` when two rectangles intersect.
- For each dynamic body, we test against every static body. When they overlap, we calculate how deep the penetration is on all four sides.
- The shallowest overlap tells us which face was hit. For example, if `overlapY` is smallest and the ball is moving down (`vy > 0`), the ball landed on top of the platform. We snap it to the surface (`b.y = other.y - b.h`) and reverse its vertical velocity, scaled by restitution.
- The `b.vx *= 0.95` on top-collision simulates surface friction -- the ball gradually stops sliding after landing.

---

### 2. Wire the Collision System into the Engine

**File:** `src/games/physics-puzzle/PuzzleEngine.ts`

Update the engine to run collision detection after physics integration.

```typescript
import type { PuzzleState } from './types';
import { makeBody, resetBodyId } from './types';
import { PhysicsSystem } from './systems/PhysicsSystem';
import { CollisionSystem } from './systems/CollisionSystem';
import { WorldRenderer } from './renderers/WorldRenderer';

export class PuzzleEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private systems: { update(state: PuzzleState, dt: number): void }[];
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

    this.systems = [
      new PhysicsSystem(),
      new CollisionSystem(),
    ];
    this.worldRenderer = new WorldRenderer();

    // Build world: ground + platforms + ball
    resetBodyId();
    const H = canvas.height;
    const W = canvas.width;
    const groundY = H - 60;
    const bodies = [
      makeBody('ground', 0, groundY, W, 60, true, '#4a6741'),
      makeBody('ball', 200, 100, 30, 30, false, '#f59e0b'),
      // Static platforms to test bouncing
      makeBody('box', 150, groundY - 120, 200, 20, true, '#666'),
      makeBody('box', 450, groundY - 200, 150, 20, true, '#666'),
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
      simulating: true,
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
      for (const sys of this.systems) {
        sys.update(this.state, dt);
      }
    }

    this.worldRenderer.render(this.ctx, this.state);

    this.rafId = requestAnimationFrame((t) => this.loop(t));
  }
}
```

**What's happening:**
- The `systems` array now holds both `PhysicsSystem` and `CollisionSystem`. Each frame, physics runs first (moves bodies), then collision runs (corrects overlaps). Order matters -- integrating before resolving prevents bodies from sinking into platforms.
- Two static gray platforms are placed at different heights so the ball bounces between them on its way down to the ground.
- The loop iterates all systems with `for (const sys of this.systems)`, making it trivial to add more systems later.

---

## Test It

1. **Run:** `npm run dev`
2. **Open:** the Physics Puzzle game in your browser
3. **Observe:**
   - The ball **falls from the top** under gravity
   - It **bounces off** the upper platform, losing height each bounce (restitution)
   - It eventually **rolls off** the platform edge and falls to the next one or the ground
   - On the ground it **bounces progressively lower** until it comes to rest
   - The ball **slides slightly** on surfaces due to friction damping

---

## Challenges

**Easy:**
- Change `restitution` to `0.8` in `makeBody()` and watch the ball bounce much higher (like a rubber ball).
- Add a third platform between the existing two.

**Medium:**
- Add vertical walls on the left and right edges of the screen so the ball cannot escape horizontally.

**Hard:**
- Implement circle-vs-AABB collision instead of box-vs-box. Calculate the closest point on the rectangle to the circle center, then resolve based on the distance vs. the ball's radius. This gives more accurate bouncing off corners.

---

## What You Learned

- Implementing AABB overlap detection with four simple comparisons
- Resolving collisions using minimum penetration depth to find the correct surface
- Applying restitution to simulate energy loss on each bounce
- Ordering physics systems: integrate first, then resolve collisions

**Next:** Drawing lines on the canvas that become physical ramps the ball can roll on!
