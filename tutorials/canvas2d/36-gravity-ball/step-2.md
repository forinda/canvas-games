# Step 2: Gravity & Ball Physics

**Goal:** Make the ball fall in the current gravity direction, sliding across the grid until it hits a wall.

**Time:** ~15 minutes

---

## What You'll Build

- **PhysicsSystem** that slides the ball in the gravity direction until it hits a wall or boundary
- **Smooth slide animation** using `smoothstep` interpolation between start and target positions
- **Trail rendering** that shows the ball's path as fading ghost circles
- **Delta-time game loop** so animation speed is consistent across frame rates

---

## Concepts

- **Slide-to-Wall Physics**: When gravity changes, the ball does not simply move one cell. It slides continuously in that direction until it collides with a wall or the grid boundary. This is the core mechanic that makes Gravity Ball a puzzle game -- you must plan where the ball will stop.
- **Wall Collision via Set Lookup**: To find where the ball stops, we step one cell at a time in the gravity direction and check `wallSet.has("x,y")`. This is O(1) per cell checked.
- **Smoothstep Interpolation**: Instead of linearly moving the ball, we apply `t * t * (3 - 2 * t)` to the progress value. This eases in and eases out, making the slide feel polished.
- **Trail System**: Each time the ball completes a slide, we push every cell it passed through onto a trail array (capped at `MAX_TRAIL`). The renderer draws these as fading circles.

---

## Code

### 1. Create the Physics System

**File:** `src/contexts/canvas2d/games/gravity-ball/systems/PhysicsSystem.ts`

Handles gravity changes, slide target calculation, and slide animation.

```typescript
import type { GravityState, GravityDir, Pos } from '../types';
import { SLIDE_SPEED, MAX_TRAIL } from '../types';

export class PhysicsSystem {
  update(state: GravityState, dt: number): void {
    // If level is complete or game won, skip physics
    if (state.levelComplete || state.gameWon) return;

    // Process queued gravity change
    if (state.queuedGravity !== null && !state.sliding) {
      state.gravity = state.queuedGravity;
      state.queuedGravity = null;
      state.moves += 1;

      // Calculate slide target
      const target = this.findSlideTarget(state, state.ball.pos, state.gravity);

      if (target.x !== state.ball.pos.x || target.y !== state.ball.pos.y) {
        state.sliding = true;
        state.slideProgress = 0;
        state.slideFrom = { x: state.ball.pos.x, y: state.ball.pos.y };
        state.slideTo = { x: target.x, y: target.y };
      }
    }

    // Animate slide
    if (state.sliding) {
      const dx = state.slideTo.x - state.slideFrom.x;
      const dy = state.slideTo.y - state.slideFrom.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance === 0) {
        state.sliding = false;
        return;
      }

      const duration = distance / SLIDE_SPEED;
      state.slideProgress += dt / duration;

      if (state.slideProgress >= 1) {
        state.slideProgress = 1;
        state.sliding = false;

        // Add trail positions along the path
        this.addTrailAlongPath(state);

        // Snap ball to final position
        state.ball.pos.x = state.slideTo.x;
        state.ball.pos.y = state.slideTo.y;
      }
    }
  }

  private findSlideTarget(
    state: GravityState,
    from: Pos,
    dir: GravityDir,
  ): Pos {
    let dx = 0;
    let dy = 0;

    switch (dir) {
      case 'up':    dy = -1; break;
      case 'down':  dy = 1;  break;
      case 'left':  dx = -1; break;
      case 'right': dx = 1;  break;
    }

    let cx = from.x;
    let cy = from.y;

    while (true) {
      const nx = cx + dx;
      const ny = cy + dy;

      // Check bounds
      if (nx < 0 || nx >= state.gridWidth || ny < 0 || ny >= state.gridHeight) {
        break;
      }

      // Check wall collision
      if (state.wallSet.has(`${nx},${ny}`)) {
        break;
      }

      cx = nx;
      cy = ny;
    }

    return { x: cx, y: cy };
  }

  private addTrailAlongPath(state: GravityState): void {
    const sx = state.slideFrom.x;
    const sy = state.slideFrom.y;
    const ex = state.slideTo.x;
    const ey = state.slideTo.y;

    const dx = Math.sign(ex - sx);
    const dy = Math.sign(ey - sy);

    let cx = sx;
    let cy = sy;

    while (cx !== ex || cy !== ey) {
      state.ball.trail.push({ x: cx, y: cy });
      cx += dx;
      cy += dy;
    }

    // Trim trail to max length
    while (state.ball.trail.length > MAX_TRAIL) {
      state.ball.trail.shift();
    }
  }
}
```

**What's happening:**
- `update()` first checks for a queued gravity change. If one exists and the ball is not already sliding, it applies the new direction, increments the move counter, and calculates where the ball will stop.
- `findSlideTarget()` is a simple loop: starting from the ball's current cell, step one cell at a time in the gravity direction. If the next cell is a wall or out of bounds, stop. The last valid cell is the target.
- When a slide begins, `slideFrom` and `slideTo` are set, and `slideProgress` starts at 0. Each frame, progress increases based on `dt / duration`, where duration is proportional to the distance traveled.
- `addTrailAlongPath()` pushes every intermediate cell onto the trail array (not including the destination), then trims the array to `MAX_TRAIL` entries. This creates the fading breadcrumb effect.

---

### 2. Update the Game Renderer (Add Trail + Slide Animation)

**File:** `src/contexts/canvas2d/games/gravity-ball/renderers/GameRenderer.ts`

Add trail rendering and animated ball position during slides.

```typescript
import type { GravityState } from '../types';
import { COLORS } from '../types';

export class GameRenderer {
  render(ctx: CanvasRenderingContext2D, state: GravityState): void {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    // Clear background
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, W, H);

    // Calculate cell size and offset to center the grid
    const maxGridW = W * 0.8;
    const maxGridH = H * 0.75;
    const cellSize = Math.floor(
      Math.min(maxGridW / state.gridWidth, maxGridH / state.gridHeight),
    );
    const gridW = cellSize * state.gridWidth;
    const gridH = cellSize * state.gridHeight;
    const offsetX = Math.floor((W - gridW) / 2);
    const offsetY = Math.floor((H - gridH) / 2) + 20;

    // Draw grid lines
    this.drawGrid(ctx, state, cellSize, offsetX, offsetY);

    // Draw walls
    this.drawWalls(ctx, state, cellSize, offsetX, offsetY);

    // Draw exit
    this.drawExit(ctx, state, cellSize, offsetX, offsetY);

    // Draw trail
    this.drawTrail(ctx, state, cellSize, offsetX, offsetY);

    // Draw ball (with slide interpolation)
    this.drawBall(ctx, state, cellSize, offsetX, offsetY);
  }

  private drawGrid(
    ctx: CanvasRenderingContext2D,
    state: GravityState,
    cell: number,
    ox: number,
    oy: number,
  ): void {
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 1;

    for (let x = 0; x <= state.gridWidth; x++) {
      ctx.beginPath();
      ctx.moveTo(ox + x * cell, oy);
      ctx.lineTo(ox + x * cell, oy + state.gridHeight * cell);
      ctx.stroke();
    }

    for (let y = 0; y <= state.gridHeight; y++) {
      ctx.beginPath();
      ctx.moveTo(ox, oy + y * cell);
      ctx.lineTo(ox + state.gridWidth * cell, oy + y * cell);
      ctx.stroke();
    }
  }

  private drawWalls(
    ctx: CanvasRenderingContext2D,
    state: GravityState,
    cell: number,
    ox: number,
    oy: number,
  ): void {
    for (const wall of state.walls) {
      const wx = ox + wall.x * cell;
      const wy = oy + wall.y * cell;

      ctx.fillStyle = COLORS.wall;
      ctx.fillRect(wx, wy, cell, cell);

      ctx.fillStyle = COLORS.wallHighlight;
      ctx.fillRect(wx, wy, cell, 2);
      ctx.fillRect(wx, wy, 2, cell);

      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.fillRect(wx + cell - 2, wy, 2, cell);
      ctx.fillRect(wx, wy + cell - 2, cell, 2);
    }
  }

  private drawExit(
    ctx: CanvasRenderingContext2D,
    state: GravityState,
    cell: number,
    ox: number,
    oy: number,
  ): void {
    const ex = ox + state.exit.x * cell + cell / 2;
    const ey = oy + state.exit.y * cell + cell / 2;
    const glowSize = Math.sin(state.glowPhase) * 0.15 + 0.85;
    const radius = (cell / 2) * 0.7 * glowSize;

    // Outer glow
    const glowAlpha = Math.sin(state.glowPhase) * 0.2 + 0.4;
    ctx.fillStyle = `rgba(76, 175, 80, ${glowAlpha})`;
    ctx.beginPath();
    ctx.arc(ex, ey, radius * 1.6, 0, Math.PI * 2);
    ctx.fill();

    // Inner glow
    ctx.fillStyle = COLORS.exitGlow;
    ctx.beginPath();
    ctx.arc(ex, ey, radius * 1.2, 0, Math.PI * 2);
    ctx.fill();

    // Core
    ctx.fillStyle = COLORS.exit;
    ctx.beginPath();
    ctx.arc(ex, ey, radius, 0, Math.PI * 2);
    ctx.fill();

    // Diamond
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.beginPath();
    const s = radius * 0.4;
    ctx.moveTo(ex, ey - s);
    ctx.lineTo(ex + s * 0.6, ey);
    ctx.lineTo(ex, ey + s);
    ctx.lineTo(ex - s * 0.6, ey);
    ctx.closePath();
    ctx.fill();
  }

  private drawTrail(
    ctx: CanvasRenderingContext2D,
    state: GravityState,
    cell: number,
    ox: number,
    oy: number,
  ): void {
    const trail = state.ball.trail;
    const len = trail.length;

    for (let i = 0; i < len; i++) {
      const alpha = ((i + 1) / len) * 0.35;
      const size = ((i + 1) / len) * 0.4 + 0.1;

      ctx.fillStyle = `rgba(120, 144, 156, ${alpha})`;
      ctx.beginPath();
      ctx.arc(
        ox + trail[i].x * cell + cell / 2,
        oy + trail[i].y * cell + cell / 2,
        (cell / 2) * size,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
  }

  private drawBall(
    ctx: CanvasRenderingContext2D,
    state: GravityState,
    cell: number,
    ox: number,
    oy: number,
  ): void {
    let bx: number;
    let by: number;

    if (state.sliding) {
      // Interpolate position with smoothstep
      const t = state.slideProgress;
      const smooth = t * t * (3 - 2 * t);

      bx = state.slideFrom.x + (state.slideTo.x - state.slideFrom.x) * smooth;
      by = state.slideFrom.y + (state.slideTo.y - state.slideFrom.y) * smooth;
    } else {
      bx = state.ball.pos.x;
      by = state.ball.pos.y;
    }

    const px = ox + bx * cell + cell / 2;
    const py = oy + by * cell + cell / 2;
    const radius = (cell / 2) * 0.7;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.arc(px + 2, py + 2, radius, 0, Math.PI * 2);
    ctx.fill();

    // Ball gradient
    const grad = ctx.createRadialGradient(
      px - radius * 0.3,
      py - radius * 0.3,
      radius * 0.1,
      px,
      py,
      radius,
    );
    grad.addColorStop(0, COLORS.ballCore);
    grad.addColorStop(1, COLORS.ball);

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(px, py, radius, 0, Math.PI * 2);
    ctx.fill();

    // Shine
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath();
    ctx.arc(
      px - radius * 0.25,
      py - radius * 0.25,
      radius * 0.25,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
}
```

**What's happening:**
- The exit now uses `state.glowPhase` to pulse its size and alpha. The `glowSize` oscillates between 0.70 and 1.0, and `glowAlpha` between 0.2 and 0.6, creating a gentle breathing animation.
- `drawTrail()` loops through the trail array and draws each position as a circle. Earlier positions (lower index) are smaller and more transparent. The newest trail point is the most visible.
- `drawBall()` now checks `state.sliding`. If the ball is mid-slide, it interpolates between `slideFrom` and `slideTo` using the smoothstep function. This makes the ball accelerate out of its start position and decelerate into its stop position.

---

### 3. Update the Engine (Add Delta Time + Physics)

**File:** `src/contexts/canvas2d/games/gravity-ball/GravityEngine.ts`

Add delta-time tracking and wire in the PhysicsSystem.

```typescript
import type { GravityState } from './types';
import { GameRenderer } from './renderers/GameRenderer';
import { PhysicsSystem } from './systems/PhysicsSystem';
import { LEVELS } from './data/levels';

export class GravityEngine {
  private ctx: CanvasRenderingContext2D;
  private state: GravityState;
  private running = false;
  private rafId = 0;
  private lastTime = 0;

  private gameRenderer: GameRenderer;
  private physicsSystem: PhysicsSystem;
  private resizeHandler: () => void;

  constructor(canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    this.state = {
      gravity: 'down',
      ball: { pos: { x: 0, y: 0 }, trail: [] },
      exit: { x: 0, y: 0 },
      wallSet: new Set<string>(),
      walls: [],
      gridWidth: 0,
      gridHeight: 0,
      level: 0,
      moves: 0,
      sliding: false,
      slideProgress: 0,
      slideFrom: { x: 0, y: 0 },
      slideTo: { x: 0, y: 0 },
      levelComplete: false,
      gameWon: false,
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
      queuedGravity: null,
      restartRequested: false,
      advanceRequested: false,
      completeTimer: 0,
      glowPhase: 0,
    };

    this.gameRenderer = new GameRenderer();
    this.physicsSystem = new PhysicsSystem();

    this.loadLevel(0);

    this.resizeHandler = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      this.state.canvasWidth = canvas.width;
      this.state.canvasHeight = canvas.height;
    };
    window.addEventListener('resize', this.resizeHandler);
  }

  start(): void {
    this.running = true;
    this.lastTime = performance.now();
    this.loop();
  }

  destroy(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
    window.removeEventListener('resize', this.resizeHandler);
  }

  private loop(): void {
    if (!this.running) return;

    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 1000, 0.1);
    this.lastTime = now;

    // Update physics
    this.physicsSystem.update(this.state, dt);

    // Update glow animation
    this.state.glowPhase += dt * 2;

    // Render
    this.gameRenderer.render(this.ctx, this.state);

    this.rafId = requestAnimationFrame(() => this.loop());
  }

  private loadLevel(levelIndex: number): void {
    const level = LEVELS[levelIndex];
    this.state.level = levelIndex;
    this.state.gravity = 'down';
    this.state.moves = 0;
    this.state.sliding = false;
    this.state.slideProgress = 0;
    this.state.slideFrom = { x: 0, y: 0 };
    this.state.slideTo = { x: 0, y: 0 };
    this.state.levelComplete = false;
    this.state.gameWon = false;
    this.state.queuedGravity = null;
    this.state.restartRequested = false;
    this.state.advanceRequested = false;
    this.state.completeTimer = 0;
    this.state.glowPhase = 0;

    this.state.gridWidth = level.width;
    this.state.gridHeight = level.height;

    this.state.ball = {
      pos: { x: level.ballStart.x, y: level.ballStart.y },
      trail: [],
    };

    this.state.exit = { x: level.exit.x, y: level.exit.y };

    this.state.walls = level.walls.map((w) => ({ x: w.x, y: w.y }));
    this.state.wallSet = new Set<string>();
    for (const w of level.walls) {
      this.state.wallSet.add(`${w.x},${w.y}`);
    }
  }
}
```

**What's happening:**
- The loop now tracks `lastTime` and computes `dt` (delta time in seconds). We clamp it to 0.1s maximum to prevent huge jumps if the tab was backgrounded.
- `physicsSystem.update(state, dt)` is called every frame. It processes any queued gravity change, advances the slide animation, and snaps the ball to its target when the slide completes.
- `glowPhase` increments by `dt * 2` so the exit pulses roughly once per 3 seconds.
- To test sliding, you can temporarily add `this.state.queuedGravity = 'down';` after `loadLevel(0)`. The ball will slide from (3,1) down to (3,2) -- stopping just before the wall at (2,3)/(4,3) row. We will add proper keyboard input in the next step.

---

## Test It

1. **Run:** `npm run dev`
2. **Open:** the Gravity Ball game in your browser
3. **Temporarily test:** Add this line right after `this.loadLevel(0)` in the engine constructor:
   ```typescript
   this.state.queuedGravity = 'down';
   ```
4. **Observe:**
   - The ball **smoothly slides downward** from (3,1) and stops at (3,2) -- the cell just above the wall gap
   - A **trail** of fading grey circles appears along the path the ball traveled
   - The **exit marker pulses** with a gentle green glow animation
   - The slide uses **smoothstep easing** -- it accelerates at the start and decelerates at the end
5. **Remove** the temporary test line when done

---

## Challenges

**Easy:**
- Change `SLIDE_SPEED` from `18` to `8` to see the ball slide more slowly. Try `30` for a snappier feel.
- Change `MAX_TRAIL` to `4` for a short trail, or `20` for a long one.

**Medium:**
- Replace the smoothstep function `t * t * (3 - 2 * t)` with a linear interpolation (just use `t` directly). Notice how the movement feels more robotic without easing.

**Hard:**
- Add a "bounce" effect: when the ball reaches its target, have it overshoot by 0.1 cells and spring back. You will need to add a `bouncing` state and a small secondary animation.

---

## What You Learned

- Implementing slide-to-wall physics with a step-by-step collision scan
- Animating movement with delta-time and smoothstep interpolation
- Building a trail system that records and renders the ball's path
- Using `Set<string>` for O(1) wall collision lookups

**Next:** Gravity Switching Controls -- let the player press arrow keys to change gravity direction!
