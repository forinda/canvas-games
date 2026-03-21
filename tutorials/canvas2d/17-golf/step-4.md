# Step 4: Walls & Bouncing

**Goal:** Add wall segments around and inside the course. Detect ball-wall collisions and reflect the ball with damping.

**Time:** ~15 minutes

---

## What You'll Build

Collision system:
- **Wall segments** defined by two endpoints (line segments)
- **Ball-to-line-segment** distance calculation
- **Reflection** of velocity off the wall normal
- **Push-out** so the ball does not sink into walls
- **Damping on bounce** to lose energy on each collision
- **Brown wall rendering** with round caps

---

## Concepts

- **Closest Point on Segment**: Project the ball center onto the wall line, clamp to the segment endpoints, and measure the distance. If distance < ball radius, we have a collision.
- **Normal Vector**: Points from the closest wall point toward the ball center. This is the direction to push the ball out.
- **Velocity Reflection**: `vel -= 2 * dot(vel, normal) * normal`. This mirrors the velocity across the wall surface.
- **Damping**: After reflection, multiply velocity by 0.8. The ball loses 20% of its energy on each bounce.

You already know collision and reflection from Basketball. The difference here is that walls are arbitrary line segments, not axis-aligned rectangles.

---

## Code

### 1. Update Physics System

**File:** `src/contexts/canvas2d/games/golf/systems/PhysicsSystem.ts`

Add wall collision handling:

```typescript
import type { GolfState, Wall } from '../types';
import { FRICTION, MIN_VELOCITY } from '../types';
import { COURSES } from '../data/courses';

export class PhysicsSystem {
  update(state: GolfState, _dt: number): void {
    const ball = state.ball;
    if (!state.ballMoving) return;

    const course = COURSES[state.currentHole];

    // Apply friction
    ball.vel.x *= FRICTION;
    ball.vel.y *= FRICTION;

    // Move ball
    ball.pos.x += ball.vel.x;
    ball.pos.y += ball.vel.y;

    // Wall collisions
    this.handleWallCollisions(state, course.walls);

    // Stop ball if moving very slowly
    const speed = Math.sqrt(
      ball.vel.x * ball.vel.x + ball.vel.y * ball.vel.y
    );
    if (speed < MIN_VELOCITY) {
      ball.vel.x = 0;
      ball.vel.y = 0;
      state.ballMoving = false;
    }
  }

  private handleWallCollisions(state: GolfState, walls: Wall[]): void {
    const ball = state.ball;
    const r = ball.radius;

    for (let i = 0; i < walls.length; i++) {
      const wall = walls[i];

      // Wall direction vector
      const wx = wall.x2 - wall.x1;
      const wy = wall.y2 - wall.y1;
      const len = Math.sqrt(wx * wx + wy * wy);
      if (len === 0) continue;

      // Unit direction along the wall
      const nx = wx / len;
      const ny = wy / len;

      // Vector from wall start to ball center
      const dx = ball.pos.x - wall.x1;
      const dy = ball.pos.y - wall.y1;

      // Project ball onto wall direction
      const proj = dx * nx + dy * ny;
      const clampedProj = Math.max(0, Math.min(len, proj));

      // Closest point on wall segment to ball center
      const closestX = wall.x1 + nx * clampedProj;
      const closestY = wall.y1 + ny * clampedProj;

      // Distance from ball center to closest point
      const distX = ball.pos.x - closestX;
      const distY = ball.pos.y - closestY;
      const dist = Math.sqrt(distX * distX + distY * distY);

      if (dist < r && dist > 0) {
        // Normal pointing from wall toward ball
        const normX = distX / dist;
        const normY = distY / dist;

        // Push ball out of wall
        ball.pos.x = closestX + normX * r;
        ball.pos.y = closestY + normY * r;

        // Reflect velocity across the normal
        const dot = ball.vel.x * normX + ball.vel.y * normY;
        ball.vel.x -= 2 * dot * normX;
        ball.vel.y -= 2 * dot * normY;

        // Dampen on bounce (lose 20% energy)
        ball.vel.x *= 0.8;
        ball.vel.y *= 0.8;
      }
    }
  }
}
```

Walk through the collision math for a single wall:

1. Compute the wall's direction vector and normalize it.
2. Project the ball-to-wall-start vector onto that direction. Clamp to `[0, len]` so the closest point stays on the segment.
3. The closest point is `wallStart + direction * clampedProjection`.
4. If the distance from ball center to that point is less than the ball radius, we collide.
5. The collision normal points from the closest point toward the ball. Normalize it.
6. Push the ball out so it sits exactly `radius` away from the wall.
7. Reflect velocity: subtract twice the velocity component along the normal.
8. Scale velocity by 0.8 to dampen the bounce.

---

### 2. Add Wall Drawing to Renderer

**File:** `src/contexts/canvas2d/games/golf/renderers/GameRenderer.ts`

Add `drawWalls` and call it between `drawGreen` and `drawHole`:

```typescript
import type { GolfState } from '../types';
import { COURSES } from '../data/courses';

export class GameRenderer {
  render(ctx: CanvasRenderingContext2D, state: GolfState): void {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.translate(state.courseOffsetX, state.courseOffsetY);

    const course = COURSES[state.currentHole];

    this.drawGreen(ctx, course.walls);
    this.drawWalls(ctx, state);
    this.drawHole(ctx, state);
    this.drawBall(ctx, state);

    ctx.restore();

    if (state.aiming && state.aimStart && state.aimEnd) {
      this.drawAimLine(ctx, state);
    }
  }

  private drawGreen(
    ctx: CanvasRenderingContext2D,
    walls: { x1: number; y1: number; x2: number; y2: number }[]
  ): void {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    const outerCount = Math.min(4, walls.length);
    for (let i = 0; i < outerCount; i++) {
      const w = walls[i];
      minX = Math.min(minX, w.x1, w.x2);
      minY = Math.min(minY, w.y1, w.y2);
      maxX = Math.max(maxX, w.x1, w.x2);
      maxY = Math.max(maxY, w.y1, w.y2);
    }

    ctx.fillStyle = '#2d7a3a';
    ctx.fillRect(minX, minY, maxX - minX, maxY - minY);

    ctx.strokeStyle = '#1e5c2a';
    ctx.lineWidth = 3;
    ctx.strokeRect(minX, minY, maxX - minX, maxY - minY);

    ctx.strokeStyle = 'rgba(50, 140, 60, 0.3)';
    ctx.lineWidth = 1;
    for (let y = minY; y < maxY; y += 12) {
      ctx.beginPath();
      ctx.moveTo(minX, y);
      ctx.lineTo(maxX, y);
      ctx.stroke();
    }
  }

  private drawWalls(ctx: CanvasRenderingContext2D, state: GolfState): void {
    const course = COURSES[state.currentHole];

    ctx.strokeStyle = '#5c3a1e';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';

    for (let i = 0; i < course.walls.length; i++) {
      const wall = course.walls[i];
      ctx.beginPath();
      ctx.moveTo(wall.x1, wall.y1);
      ctx.lineTo(wall.x2, wall.y2);
      ctx.stroke();
    }
  }

  private drawHole(ctx: CanvasRenderingContext2D, state: GolfState): void {
    const course = COURSES[state.currentHole];
    const hole = course.hole;

    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(hole.pos.x, hole.pos.y, hole.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#444';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(hole.pos.x, hole.pos.y, hole.radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(hole.pos.x, hole.pos.y);
    ctx.lineTo(hole.pos.x, hole.pos.y - 40);
    ctx.stroke();

    ctx.fillStyle = '#e53935';
    ctx.beginPath();
    ctx.moveTo(hole.pos.x, hole.pos.y - 40);
    ctx.lineTo(hole.pos.x + 18, hole.pos.y - 33);
    ctx.lineTo(hole.pos.x, hole.pos.y - 26);
    ctx.closePath();
    ctx.fill();
  }

  private drawBall(ctx: CanvasRenderingContext2D, state: GolfState): void {
    const ball = state.ball;

    if (state.holeSunk) return;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.beginPath();
    ctx.ellipse(
      ball.pos.x + 2, ball.pos.y + 3,
      ball.radius, ball.radius * 0.6,
      0, 0, Math.PI * 2
    );
    ctx.fill();

    const grad = ctx.createRadialGradient(
      ball.pos.x - 2, ball.pos.y - 2, 1,
      ball.pos.x, ball.pos.y, ball.radius
    );
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(1, '#ddd');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(ball.pos.x, ball.pos.y, ball.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#bbb';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.arc(ball.pos.x, ball.pos.y, ball.radius, 0, Math.PI * 2);
    ctx.stroke();
  }

  private drawAimLine(ctx: CanvasRenderingContext2D, state: GolfState): void {
    const start = state.aimStart!;
    const end = state.aimEnd!;

    const dx = start.x - end.x;
    const dy = start.y - end.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const power = Math.min(dist, 200);
    const powerRatio = power / 200;

    const ballScreenX = state.ball.pos.x + state.courseOffsetX;
    const ballScreenY = state.ball.pos.y + state.courseOffsetY;

    const angle = Math.atan2(dy, dx);
    const lineLen = 30 + powerRatio * 80;
    const endX = ballScreenX + Math.cos(angle) * lineLen;
    const endY = ballScreenY + Math.sin(angle) * lineLen;

    const r = Math.floor(255 * powerRatio);
    const g = Math.floor(255 * (1 - powerRatio));
    const color = `rgb(${r}, ${g}, 50)`;

    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(ballScreenX, ballScreenY);
    ctx.lineTo(endX, endY);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(ballScreenX, ballScreenY, 15 + powerRatio * 15, 0, Math.PI * 2);
    ctx.stroke();

    const powerPercent = Math.round(powerRatio * 100);
    ctx.font = 'bold 12px monospace';
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`${powerPercent}%`, ballScreenX, ballScreenY - 25);
  }
}
```

Walls are drawn as thick brown lines with `lineCap = 'round'` so endpoints look clean where walls meet at corners.

---

## Test It

1. **Run:** `npm run dev`
2. **Navigate:** Select "Golf"
3. **Observe:**
   - Brown wall lines outline the course boundary
   - Putt the ball toward a wall -- it bounces off
   - The bounce angle looks correct (mirrors across the wall surface)
   - The ball loses speed on each bounce (damping)
   - After multiple bounces, the ball slows and stops
   - The ball never passes through a wall
   - Corner bounces (where two walls meet) work because each wall is checked independently

---

## Challenges

**Easy:**
- Change the wall color to blue
- Increase damping to 0.6 (lose 40% energy per bounce)
- Make walls thicker (lineWidth = 8) and adjust the radius check to match

**Medium:**
- Add a bounce particle effect: spawn 3 small circles at the collision point that fade out
- Play a sound on wall collision
- Color the ball red for 200ms after a bounce

**Hard:**
- Add moving walls that slide back and forth (update wall endpoints each frame)
- Implement ball spin that affects bounce angle (slice/hook)
- Add curved walls using quadratic Bezier collision detection

---

## What You Learned

- Closest-point-on-line-segment calculation
- Ball-vs-line-segment collision detection
- Velocity reflection formula: `vel -= 2 * dot(vel, normal) * normal`
- Push-out to prevent tunneling into walls
- Energy damping on collision

**Next:** Hole detection and scoring!
