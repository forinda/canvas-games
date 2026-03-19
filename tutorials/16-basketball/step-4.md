# Step 4: Rim & Backboard Physics

**Goal:** Make the ball bounce off the rim and backboard with realistic collision responses and damping.

**Time:** ~15 minutes

---

## What You'll Build

- **Rim collision**: Ball bounces off left and right rim endpoints as point obstacles
- **Backboard collision**: Ball bounces off the rectangular backboard surface
- **Reflection**: Velocity reflects along the collision normal
- **Damping**: Each bounce absorbs energy so the ball does not bounce forever

---

## Concepts

- **Point collision**: Treat each rim endpoint as a small circle. When the ball overlaps, push it out and reflect velocity along the normal vector from the point to the ball center.
- **Rectangle collision**: For the backboard, check AABB overlap. If the ball enters from the left, reverse its horizontal velocity.
- **Dot-product reflection**: `v_reflected = v - 2 * (v . n) * n` where n is the surface normal.

---

## Code

### 1. Update the Physics System

**File:** `src/games/basketball/systems/PhysicsSystem.ts`

Add backboard and rim collision methods. The full file:

```typescript
import type { BasketballState } from '../types';
import {
  GRAVITY,
  BALL_RADIUS,
  BOUNCE_DAMPING,
  ROTATION_SPEED,
  RIM_THICKNESS,
} from '../types';

export class PhysicsSystem {
  update(state: BasketballState, dt: number): void {
    const ball = state.ball;
    if (!ball.inFlight) return;

    // Gravity
    ball.vy += GRAVITY * dt;

    // Integrate position
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;

    // Rotation
    ball.rotation += ball.vx * ROTATION_SPEED * dt;

    // Wall bounces
    if (ball.x - BALL_RADIUS < 0) {
      ball.x = BALL_RADIUS;
      ball.vx = Math.abs(ball.vx) * BOUNCE_DAMPING;
    }
    if (ball.x + BALL_RADIUS > state.canvasW) {
      ball.x = state.canvasW - BALL_RADIUS;
      ball.vx = -Math.abs(ball.vx) * BOUNCE_DAMPING;
    }

    // Ceiling
    if (ball.y - BALL_RADIUS < 0) {
      ball.y = BALL_RADIUS;
      ball.vy = Math.abs(ball.vy) * BOUNCE_DAMPING;
    }

    // Floor
    if (ball.y + BALL_RADIUS > state.canvasH) {
      ball.y = state.canvasH - BALL_RADIUS;
      ball.vy = -Math.abs(ball.vy) * BOUNCE_DAMPING;
      ball.vx *= 0.85;

      if (Math.abs(ball.vy) < 30) {
        ball.vy = 0;
        ball.vx *= 0.9;
      }

      if (Math.abs(ball.vx) < 5 && Math.abs(ball.vy) < 5) {
        ball.vx = 0;
        ball.vy = 0;
      }
    }

    // Backboard collision
    this.checkBackboardCollision(state);

    // Rim collision
    this.checkRimCollision(state);
  }

  private checkBackboardCollision(state: BasketballState): void {
    const ball = state.ball;
    const hoop = state.hoop;

    // Backboard rectangle: sits at the right edge of the rim
    const bbLeft = hoop.x + hoop.rimWidth / 2;
    const bbRight = bbLeft + hoop.backboardWidth;
    const bbTop = hoop.y - hoop.backboardHeight / 2;
    const bbBottom = hoop.y + hoop.backboardHeight / 2;

    // AABB overlap test
    if (
      ball.x + BALL_RADIUS > bbLeft &&
      ball.x - BALL_RADIUS < bbRight &&
      ball.y + BALL_RADIUS > bbTop &&
      ball.y - BALL_RADIUS < bbBottom
    ) {
      // Ball hit the backboard — bounce off the left face
      if (ball.vx > 0) {
        ball.x = bbLeft - BALL_RADIUS;
        ball.vx = -Math.abs(ball.vx) * BOUNCE_DAMPING;
      }
    }
  }

  private checkRimCollision(state: BasketballState): void {
    const ball = state.ball;
    const hoop = state.hoop;

    // Left rim endpoint
    const leftRimX = hoop.x - hoop.rimWidth / 2;
    const leftRimY = hoop.y;

    // Right rim endpoint
    const rightRimX = hoop.x + hoop.rimWidth / 2;
    const rightRimY = hoop.y;

    this.bounceOffPoint(ball, leftRimX, leftRimY, RIM_THICKNESS);
    this.bounceOffPoint(ball, rightRimX, rightRimY, RIM_THICKNESS);
  }

  private bounceOffPoint(
    ball: BasketballState['ball'],
    px: number,
    py: number,
    radius: number,
  ): void {
    const dx = ball.x - px;
    const dy = ball.y - py;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const minDist = BALL_RADIUS + radius;

    if (dist < minDist && dist > 0) {
      // Normal: direction from the point to the ball center
      const nx = dx / dist;
      const ny = dy / dist;

      // Push ball out of the overlap
      ball.x = px + nx * minDist;
      ball.y = py + ny * minDist;

      // Reflect velocity: v' = v - 2(v . n)n
      const dot = ball.vx * nx + ball.vy * ny;
      ball.vx -= 2 * dot * nx;
      ball.vy -= 2 * dot * ny;

      // Dampen
      ball.vx *= BOUNCE_DAMPING;
      ball.vy *= BOUNCE_DAMPING;
    }
  }
}
```

---

### How `bounceOffPoint` Works

This is the core of rim collision. Each rim endpoint is a circle with radius `RIM_THICKNESS` (5 px). The ball is a circle with radius `BALL_RADIUS` (18 px). When their distance is less than `BALL_RADIUS + RIM_THICKNESS`, they overlap.

**Step by step:**

1. **Distance check**: Compute the vector from the point to the ball center. If `dist < minDist`, there is a collision.

2. **Normal vector**: Normalize the displacement vector. This is the collision normal — it points from the obstacle toward the ball.

3. **Separation**: Move the ball along the normal so it sits exactly at `minDist` from the point. This prevents the ball from sinking into the rim.

4. **Reflection**: The dot product `v . n` gives the component of velocity along the normal. Subtracting `2 * dot * n` from v mirrors the velocity across the normal plane, like light reflecting off a surface.

5. **Damping**: Multiply the reflected velocity by `BOUNCE_DAMPING` (0.55) so the ball loses energy. Without this, the ball would bounce off the rim at full speed forever.

**Why two separate points instead of a line segment?** A real rim has thickness only at its endpoints (the hooks that hold the net). Treating each endpoint as a circle gives natural bounce angles — a ball hitting the inner edge of the rim gets deflected differently than one hitting the outer edge, based on the geometric normal. This produces realistic-feeling rim bounces with minimal code.

---

### How `checkBackboardCollision` Works

The backboard is a thin rectangle. We use an AABB (axis-aligned bounding box) overlap test:

1. Check if the ball's bounding box overlaps the backboard's bounding box in both x and y.
2. If it does AND the ball is moving rightward (`vx > 0`), the ball hit the left face of the backboard.
3. Place the ball just to the left of the backboard surface and reverse/damp horizontal velocity.

We only check `vx > 0` because the ball can only approach the backboard from the left (the court side). This avoids false bounces if the ball somehow ends up behind the backboard.

---

## Test It

1. **Run:** `npm run dev`
2. **Navigate:** Select "Basketball"
3. **Observe:**
   - Shoot the ball at the rim — it bounces off realistically
   - Ball hitting the left rim edge deflects left/down
   - Ball hitting the right rim edge deflects right/down
   - Ball hitting the backboard bounces back to the left
   - A ball that bounces off the rim can still fall through for a basket
   - Each rim/backboard bounce visibly slows the ball (damping)
   - The ball still scores if it enters the net from above after a rim bounce

---

## Challenges

**Easy:**
- Increase `RIM_THICKNESS` to 10 and see how it affects bounce angles
- Set `BOUNCE_DAMPING` to 0.9 — the ball barely loses energy on bounces
- Add a console.log when the ball hits the backboard

**Medium:**
- Play a "clang" sound on rim collision (use `AudioContext` with a short sine oscillator)
- Add a screen shake effect on backboard hits (offset the canvas briefly)
- Color the rim endpoint that was last hit (flash red for 200ms)

**Hard:**
- Add collision with the rim *line segment* (not just endpoints) for pixel-perfect bounces
- Implement angular momentum: ball spin changes based on which side of the rim it hits
- Make the net react to the ball passing through (push net strings outward)

---

## What You Learned

- Point-circle collision detection using distance checks
- Velocity reflection using the dot product and normal vector
- AABB overlap testing for rectangle collision
- Position correction to prevent objects from sinking into each other
- Bounce damping to simulate energy loss

**Next:** Shot clock, streak bonuses, and final polish!
