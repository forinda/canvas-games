# Step 2: Cave Generation

**Goal:** Generate a procedural cave with random-walk walls that scroll left, and narrow over time.

**Time:** ~15 minutes

---

## What You'll Build

Building on Step 1:
- **Procedural cave walls**: Top and bottom boundaries generated with a random walk
- **Left-scrolling terrain**: Cave segments move left each frame at scroll speed
- **Narrowing gap**: The passage shrinks as elapsed time increases
- **Edge highlights**: Green stroke along cave edges for depth
- **Segment recycling**: Off-screen segments are removed, new ones spawn at the right edge

---

## Concepts

- **Random walk**: Each new cave segment offsets its top/bottom from the previous segment by a random delta. This creates organic, jagged terrain without needing Perlin noise.
- **Segment-based terrain**: The cave is an array of `{ x, top, bottom }` objects, each `CAVE_SEGMENT_WIDTH` pixels wide. We draw them as filled polygons.
- **Gap shrinking**: `currentGap = max(MIN_GAP, INITIAL_GAP - elapsedTime * GAP_SHRINK_RATE)`. The cave starts wide and slowly squeezes the player.
- **Canvas polygon fill**: We trace a path along all segment tops, then close it to the canvas edge, and fill. Same for the bottom.

---

## Code

### 1. Create the Obstacle System (Cave Only)

**File:** `src/games/helicopter/systems/ObstacleSystem.ts`

This system handles cave generation, scrolling, and (in later steps) obstacle spawning. For now we focus on the cave.

```typescript
import type { HelicopterState } from '../types';
import {
  BASE_SCROLL_SPEED,
  SPEED_INCREMENT,
  MAX_SCROLL_SPEED,
  CAVE_SEGMENT_WIDTH,
  INITIAL_GAP,
  MIN_GAP,
  GAP_SHRINK_RATE,
  CAVE_ROUGHNESS,
} from '../types';

export class ObstacleSystem {
  update(state: HelicopterState, dt: number): void {
    if (state.phase !== 'playing') return;

    state.elapsedTime += dt;

    // Increase speed over time
    state.scrollSpeed = Math.min(
      BASE_SCROLL_SPEED + state.elapsedTime * SPEED_INCREMENT,
      MAX_SCROLL_SPEED,
    );

    const speed = state.scrollSpeed;

    // Scroll background
    state.backgroundOffset += speed * dt * 0.3;

    // Update distance (score)
    state.distance += speed * dt * 0.05;

    // Scroll cave segments left
    for (const seg of state.cave) {
      seg.x -= speed * dt;
    }

    // Remove off-screen segments
    state.cave = state.cave.filter(
      (s) => s.x + CAVE_SEGMENT_WIDTH > -CAVE_SEGMENT_WIDTH,
    );

    // Generate new cave segments at the right edge
    while (this.needsMoreCave(state)) {
      this.spawnCaveSegment(state);
    }
  }

  private needsMoreCave(state: HelicopterState): boolean {
    if (state.cave.length === 0) return true;
    const last = state.cave[state.cave.length - 1];
    return last.x + CAVE_SEGMENT_WIDTH < state.canvasW + CAVE_SEGMENT_WIDTH * 2;
  }

  private spawnCaveSegment(state: HelicopterState): void {
    const cave = state.cave;
    const currentGap = Math.max(
      MIN_GAP,
      INITIAL_GAP - state.elapsedTime * GAP_SHRINK_RATE,
    );
    const halfGap = currentGap / 2;
    const centerY = state.canvasH / 2;

    let x: number;
    let prevTop: number;
    let prevBottom: number;

    if (cave.length === 0) {
      x = 0;
      prevTop = centerY - halfGap;
      prevBottom = centerY + halfGap;
    } else {
      const last = cave[cave.length - 1];
      x = last.x + CAVE_SEGMENT_WIDTH;
      prevTop = last.top;
      prevBottom = last.bottom;
    }

    // Random walk — each wall jitters up or down
    const topDelta = (Math.random() - 0.5) * CAVE_ROUGHNESS;
    const bottomDelta = (Math.random() - 0.5) * CAVE_ROUGHNESS;

    let newTop = prevTop + topDelta;
    let newBottom = prevBottom + bottomDelta;

    // Ensure minimum gap between walls
    if (newBottom - newTop < currentGap) {
      const mid = (newTop + newBottom) / 2;
      newTop = mid - halfGap;
      newBottom = mid + halfGap;
    }

    // Keep within canvas bounds
    const margin = 10;
    if (newTop < margin) {
      newTop = margin;
      newBottom = Math.max(newBottom, newTop + currentGap);
    }
    if (newBottom > state.canvasH - margin) {
      newBottom = state.canvasH - margin;
      newTop = Math.min(newTop, newBottom - currentGap);
    }

    cave.push({ x, top: newTop, bottom: newBottom });
  }

  /** Fill the screen with initial cave segments */
  initCave(state: HelicopterState): void {
    state.cave = [];
    const numSegments = Math.ceil(state.canvasW / CAVE_SEGMENT_WIDTH) + 4;
    for (let i = 0; i < numSegments; i++) {
      this.spawnCaveSegment(state);
    }
  }
}
```

Walk through the random-walk algorithm:

1. Each new segment starts from the previous segment's `top` and `bottom`.
2. Both walls get a random offset in the range `[-CAVE_ROUGHNESS/2, +CAVE_ROUGHNESS/2]`.
3. If the walls got too close (less than `currentGap`), we re-center them around their midpoint.
4. If either wall would go off the canvas, we clamp it and push the other wall to maintain the gap.

The `while (needsMoreCave)` loop ensures we always have cave segments extending past the right edge of the screen. As old segments scroll off the left, `filter` removes them.

---

### 2. Update the Game Renderer — Add Cave Drawing

**File:** `src/games/helicopter/renderers/GameRenderer.ts`

Replace the file with the full renderer that now draws cave walls:

```typescript
import type { HelicopterState } from '../types';
import { CAVE_SEGMENT_WIDTH } from '../types';

export class GameRenderer {
  render(ctx: CanvasRenderingContext2D, state: HelicopterState): void {
    const { canvasW, canvasH } = state;

    // Dark gradient background
    const bgGrad = ctx.createLinearGradient(0, 0, 0, canvasH);
    bgGrad.addColorStop(0, '#0a1628');
    bgGrad.addColorStop(0.5, '#122040');
    bgGrad.addColorStop(1, '#0a1628');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, canvasW, canvasH);

    // Cave walls
    this.drawCave(ctx, state);

    // Helicopter
    this.drawHelicopter(ctx, state);
  }

  private drawCave(
    ctx: CanvasRenderingContext2D,
    state: HelicopterState,
  ): void {
    const cave = state.cave;
    if (cave.length < 2) return;

    // --- Top wall (filled polygon from canvas top to cave ceiling) ---
    ctx.beginPath();
    ctx.moveTo(cave[0].x, 0);
    for (const seg of cave) {
      ctx.lineTo(seg.x, seg.top);
    }
    const lastSeg = cave[cave.length - 1];
    ctx.lineTo(lastSeg.x + CAVE_SEGMENT_WIDTH, 0);
    ctx.closePath();

    const topGrad = ctx.createLinearGradient(0, 0, 0, state.canvasH * 0.4);
    topGrad.addColorStop(0, '#2d5016');
    topGrad.addColorStop(1, '#1a3a0a');
    ctx.fillStyle = topGrad;
    ctx.fill();

    // Top wall edge highlight
    ctx.strokeStyle = '#4a8a2a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < cave.length; i++) {
      if (i === 0) {
        ctx.moveTo(cave[i].x, cave[i].top);
      } else {
        ctx.lineTo(cave[i].x, cave[i].top);
      }
    }
    ctx.stroke();

    // --- Bottom wall (filled polygon from cave floor to canvas bottom) ---
    ctx.beginPath();
    ctx.moveTo(cave[0].x, state.canvasH);
    for (const seg of cave) {
      ctx.lineTo(seg.x, seg.bottom);
    }
    ctx.lineTo(lastSeg.x + CAVE_SEGMENT_WIDTH, state.canvasH);
    ctx.closePath();

    const bottomGrad = ctx.createLinearGradient(
      0, state.canvasH * 0.6, 0, state.canvasH,
    );
    bottomGrad.addColorStop(0, '#1a3a0a');
    bottomGrad.addColorStop(1, '#2d5016');
    ctx.fillStyle = bottomGrad;
    ctx.fill();

    // Bottom wall edge highlight
    ctx.strokeStyle = '#4a8a2a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < cave.length; i++) {
      if (i === 0) {
        ctx.moveTo(cave[i].x, cave[i].bottom);
      } else {
        ctx.lineTo(cave[i].x, cave[i].bottom);
      }
    }
    ctx.stroke();
  }

  private drawHelicopter(
    ctx: CanvasRenderingContext2D,
    state: HelicopterState,
  ): void {
    const heli = state.helicopter;

    ctx.save();
    ctx.translate(heli.x, heli.y);

    // Tilt based on velocity
    const tilt = heli.velocity * 15;
    ctx.rotate(tilt);

    const w = heli.width;
    const h = heli.height;

    // Body
    ctx.fillStyle = '#66bb6a';
    ctx.beginPath();
    ctx.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#388e3c';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Cockpit window
    ctx.fillStyle = '#a5d6a7';
    ctx.beginPath();
    ctx.ellipse(w * 0.15, -h * 0.05, w * 0.15, h * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();

    // Tail
    ctx.fillStyle = '#4caf50';
    ctx.beginPath();
    ctx.moveTo(-w / 2, -h * 0.1);
    ctx.lineTo(-w * 0.85, -h * 0.08);
    ctx.lineTo(-w * 0.85, h * 0.08);
    ctx.lineTo(-w / 2, h * 0.1);
    ctx.closePath();
    ctx.fill();

    // Tail rotor
    ctx.strokeStyle = '#81c784';
    ctx.lineWidth = 2;
    const tailRotorLen = h * 0.35;
    const tailRotorAngle = heli.rotorAngle * 3;
    ctx.beginPath();
    ctx.moveTo(
      -w * 0.85 + Math.cos(tailRotorAngle) * 0,
      -h * 0.0 + Math.sin(tailRotorAngle) * tailRotorLen,
    );
    ctx.lineTo(
      -w * 0.85 - Math.cos(tailRotorAngle) * 0,
      -h * 0.0 - Math.sin(tailRotorAngle) * tailRotorLen,
    );
    ctx.stroke();

    // Main rotor
    ctx.strokeStyle = '#c8e6c9';
    ctx.lineWidth = 3;
    const rotorLen = w * 0.7;
    const rotorSin = Math.sin(heli.rotorAngle);
    const blade1Len = rotorLen * Math.abs(rotorSin);
    const blade2Len = rotorLen * Math.abs(Math.cos(heli.rotorAngle));

    // Rotor mast
    ctx.beginPath();
    ctx.moveTo(0, -h / 2);
    ctx.lineTo(0, -h / 2 - 5);
    ctx.stroke();

    // Blade 1
    ctx.beginPath();
    ctx.moveTo(-blade1Len, -h / 2 - 5);
    ctx.lineTo(blade1Len, -h / 2 - 5);
    ctx.stroke();

    // Blade 2
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-blade2Len, -h / 2 - 5);
    ctx.lineTo(blade2Len, -h / 2 - 5);
    ctx.stroke();

    // Skids
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-w * 0.15, h / 2);
    ctx.lineTo(-w * 0.2, h / 2 + 5);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(w * 0.15, h / 2);
    ctx.lineTo(w * 0.2, h / 2 + 5);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-w * 0.3, h / 2 + 5);
    ctx.lineTo(w * 0.3, h / 2 + 5);
    ctx.stroke();

    ctx.restore();
  }
}
```

The cave drawing technique:

1. **Top wall**: Start at `(firstSegment.x, 0)`, trace along each segment's `top` value, then go to `(lastSegment.x, 0)` and close. Fill with a dark green gradient.
2. **Bottom wall**: Same idea but tracing `bottom` values down to `canvasH`.
3. **Edge highlight**: A bright green stroke along the cave edges gives depth and makes the walls readable.

---

### 3. Update the Engine — Wire in ObstacleSystem

**File:** `src/games/helicopter/HelicopterEngine.ts`

```typescript
import type { HelicopterState } from './types';
import {
  BASE_SCROLL_SPEED,
  HELI_WIDTH,
  HELI_HEIGHT,
  HELI_X_RATIO,
} from './types';
import { InputSystem } from './systems/InputSystem';
import { PhysicsSystem } from './systems/PhysicsSystem';
import { ObstacleSystem } from './systems/ObstacleSystem';
import { GameRenderer } from './renderers/GameRenderer';
import { HUDRenderer } from './renderers/HUDRenderer';

export class HelicopterEngine {
  private ctx: CanvasRenderingContext2D;
  private state: HelicopterState;
  private running = false;
  private rafId = 0;
  private lastTime = 0;

  private inputSystem: InputSystem;
  private physicsSystem: PhysicsSystem;
  private obstacleSystem: ObstacleSystem;
  private gameRenderer: GameRenderer;
  private hudRenderer: HUDRenderer;
  private resizeHandler: () => void;

  constructor(canvas: HTMLCanvasElement, onExit: () => void) {
    this.ctx = canvas.getContext('2d')!;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    this.state = this.createInitialState(canvas.width, canvas.height, 0);

    // Systems
    this.physicsSystem = new PhysicsSystem();
    this.obstacleSystem = new ObstacleSystem();
    this.gameRenderer = new GameRenderer();
    this.hudRenderer = new HUDRenderer();

    // Fill screen with initial cave
    this.obstacleSystem.initCave(this.state);

    this.inputSystem = new InputSystem(
      this.state,
      canvas,
      onExit,
      () => this.reset(),
    );

    // Resize handler
    this.resizeHandler = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      this.state.canvasW = canvas.width;
      this.state.canvasH = canvas.height;
      this.state.helicopter.x = canvas.width * HELI_X_RATIO;
    };

    this.inputSystem.attach();
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
    this.inputSystem.detach();
    window.removeEventListener('resize', this.resizeHandler);
  }

  private loop(): void {
    if (!this.running) return;

    const now = performance.now();
    const dt = Math.min(now - this.lastTime, 32);
    this.lastTime = now;

    this.update(dt);
    this.render();

    this.rafId = requestAnimationFrame(() => this.loop());
  }

  private update(dt: number): void {
    this.physicsSystem.update(this.state, dt);
    this.obstacleSystem.update(this.state, dt);
  }

  private render(): void {
    this.ctx.clearRect(0, 0, this.state.canvasW, this.state.canvasH);
    this.gameRenderer.render(this.ctx, this.state);
    this.hudRenderer.render(this.ctx, this.state);
  }

  private reset(): void {
    const w = this.state.canvasW;
    const h = this.state.canvasH;
    const newState = this.createInitialState(w, h, 0);
    newState.phase = 'idle';
    Object.assign(this.state, newState);
    this.obstacleSystem.initCave(this.state);
  }

  private createInitialState(
    canvasW: number,
    canvasH: number,
    bestScore: number,
  ): HelicopterState {
    return {
      helicopter: {
        x: canvasW * HELI_X_RATIO,
        y: canvasH * 0.45,
        velocity: 0,
        width: HELI_WIDTH,
        height: HELI_HEIGHT,
        rotorAngle: 0,
      },
      cave: [],
      obstacles: [],
      phase: 'idle',
      distance: 0,
      bestScore,
      canvasW,
      canvasH,
      scrollSpeed: BASE_SCROLL_SPEED,
      holding: false,
      flashTimer: 0,
      backgroundOffset: 0,
      elapsedTime: 0,
    };
  }
}
```

Two things changed from Step 1:

1. We create an `ObstacleSystem` and call `initCave()` in the constructor to fill the screen with cave segments before the first frame.
2. We call `this.obstacleSystem.update()` in the game loop so segments scroll and new ones spawn.
3. On `reset()`, we re-initialize the cave.

All other files (`types.ts`, `InputSystem.ts`, `PhysicsSystem.ts`, `HUDRenderer.ts`, `PlatformAdapter.ts`, `index.ts`) remain unchanged from Step 1.

---

## Test It

1. **Run:** `npm run dev`
2. **Navigate:** Select "Helicopter"
3. **Observe:**
   - Green jagged cave walls fill the top and bottom of the screen
   - Cave is static during idle -- walls are visible but not moving
   - Hold Space -- cave scrolls left, helicopter flies through the passage
   - Walls jitter organically thanks to the random walk
   - New segments appear seamlessly at the right edge
   - Play for 30+ seconds and notice the gap narrows
   - The helicopter can fly through the cave walls (no collision yet)

---

## Challenges

**Easy:**
- Change `CAVE_ROUGHNESS` to 30 for more jagged walls
- Make the initial gap wider (320 instead of 260)
- Change cave wall color to brown (`#5d4037`)

**Medium:**
- Add a second color layer inside the cave walls for depth
- Make the cave center drift up and down with a slow sine wave
- Draw grid lines on the cave floor for speed feedback

**Hard:**
- Implement Perlin noise instead of random walk for smoother terrain
- Add parallax by drawing a darker cave layer behind the main walls
- Make segments curve using quadratic bezier curves instead of straight lines

---

## What You Learned

- Random-walk terrain generation using segment arrays
- Polygon-based cave rendering with gradient fills
- Segment recycling: remove off-screen, spawn at right edge
- Gap narrowing over time for progressive difficulty
- Canvas boundary clamping to keep terrain on-screen

**Next:** Obstacles and collision detection!
