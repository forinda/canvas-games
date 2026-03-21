# Step 3: Obstacles & Collision

**Goal:** Add stalactite/stalagmite obstacles inside the cave and implement collision detection for walls and obstacles.

**Time:** ~15 minutes

---

## What You'll Build

Building on Step 2:
- **Stalactite/stalagmite obstacles**: Rectangular obstacles that grow from the cave ceiling or floor
- **Timed spawning**: New obstacles appear at regular intervals from the right edge
- **Cave wall collision**: Helicopter dies when touching the top or bottom cave boundary
- **Obstacle collision**: AABB (axis-aligned bounding box) test between helicopter and obstacles
- **Death state**: Game freezes on crash, flash effect, score saved

---

## Concepts

- **AABB collision**: Two rectangles overlap when all four conditions are true: `rightA > leftB`, `leftA < rightB`, `bottomA > topB`, `topA < bottomB`. Fast and sufficient for rectangular shapes.
- **Segment overlap check**: The helicopter only needs to test against cave segments it horizontally overlaps, not every segment.
- **Spawn placement**: Each obstacle checks the cave boundaries at the screen's right edge and attaches to either the top or bottom wall randomly.
- **State transition**: On collision, phase changes to `dead`, which stops physics and scrolling.

---

## Code

### 1. Update ObstacleSystem — Add Obstacle Spawning

**File:** `src/contexts/canvas2d/games/helicopter/systems/ObstacleSystem.ts`

Add obstacle spawning logic alongside the existing cave generation:

```typescript
import type { HelicopterState, Obstacle } from '../types';
import {
  BASE_SCROLL_SPEED,
  SPEED_INCREMENT,
  MAX_SCROLL_SPEED,
  CAVE_SEGMENT_WIDTH,
  INITIAL_GAP,
  MIN_GAP,
  GAP_SHRINK_RATE,
  CAVE_ROUGHNESS,
  OBSTACLE_WIDTH,
  OBSTACLE_MIN_HEIGHT,
  OBSTACLE_MAX_HEIGHT,
  OBSTACLE_SPAWN_INTERVAL,
} from '../types';

export class ObstacleSystem {
  private obstacleTimer = 0;

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

    // Scroll obstacles left
    for (const obs of state.obstacles) {
      obs.x -= speed * dt;
    }

    // Remove off-screen obstacles
    state.obstacles = state.obstacles.filter((o) => o.x + o.width > -10);

    // Spawn obstacles periodically
    this.obstacleTimer += dt;
    if (this.obstacleTimer >= OBSTACLE_SPAWN_INTERVAL) {
      this.obstacleTimer = 0;
      this.spawnObstacle(state);
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

    const topDelta = (Math.random() - 0.5) * CAVE_ROUGHNESS;
    const bottomDelta = (Math.random() - 0.5) * CAVE_ROUGHNESS;

    let newTop = prevTop + topDelta;
    let newBottom = prevBottom + bottomDelta;

    if (newBottom - newTop < currentGap) {
      const mid = (newTop + newBottom) / 2;
      newTop = mid - halfGap;
      newBottom = mid + halfGap;
    }

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

  private spawnObstacle(state: HelicopterState): void {
    // Find the cave boundaries at the right edge of the screen
    const rightEdgeSeg = state.cave.find(
      (s) => s.x <= state.canvasW && s.x + CAVE_SEGMENT_WIDTH >= state.canvasW,
    );

    if (!rightEdgeSeg) return;

    const caveTop = rightEdgeSeg.top;
    const caveBottom = rightEdgeSeg.bottom;
    const availableHeight = caveBottom - caveTop;

    // Don't spawn if the gap is too small for an obstacle to be fair
    if (availableHeight < OBSTACLE_MAX_HEIGHT * 2) return;

    const obsHeight =
      OBSTACLE_MIN_HEIGHT +
      Math.random() * (OBSTACLE_MAX_HEIGHT - OBSTACLE_MIN_HEIGHT);

    // Randomly attach to ceiling (stalactite) or floor (stalagmite)
    const fromTop = Math.random() < 0.5;
    let obsY: number;

    if (fromTop) {
      obsY = caveTop; // Hangs from ceiling
    } else {
      obsY = caveBottom - obsHeight; // Grows from floor
    }

    const obstacle: Obstacle = {
      x: state.canvasW + 10,
      y: obsY,
      width: OBSTACLE_WIDTH,
      height: obsHeight,
    };

    state.obstacles.push(obstacle);
  }

  /** Fill the screen with initial cave segments */
  initCave(state: HelicopterState): void {
    state.cave = [];
    this.obstacleTimer = 0;
    const numSegments = Math.ceil(state.canvasW / CAVE_SEGMENT_WIDTH) + 4;
    for (let i = 0; i < numSegments; i++) {
      this.spawnCaveSegment(state);
    }
  }
}
```

The obstacle spawner works like this:

1. A timer accumulates `dt` each frame. When it reaches `OBSTACLE_SPAWN_INTERVAL` (1400ms), we spawn one obstacle and reset the timer.
2. We find the cave segment at the screen's right edge to know where the ceiling and floor are.
3. We pick a random height between `OBSTACLE_MIN_HEIGHT` and `OBSTACLE_MAX_HEIGHT`.
4. We flip a coin: stalactite (from top) or stalagmite (from bottom).
5. If the cave gap is already too narrow (`< OBSTACLE_MAX_HEIGHT * 2`), we skip spawning to keep the game fair.

---

### 2. Create the Collision System

**File:** `src/contexts/canvas2d/games/helicopter/systems/CollisionSystem.ts`

```typescript
import type { HelicopterState } from '../types';
import { CAVE_SEGMENT_WIDTH, HS_KEY } from '../types';

export class CollisionSystem {
  update(state: HelicopterState, _dt: number): void {
    if (state.phase !== 'playing') return;

    const heli = state.helicopter;
    const heliLeft = heli.x - heli.width / 2;
    const heliRight = heli.x + heli.width / 2;
    const heliTop = heli.y - heli.height / 2;
    const heliBottom = heli.y + heli.height / 2;

    // Cave wall collision — only check segments that overlap the helicopter
    for (const seg of state.cave) {
      const segLeft = seg.x;
      const segRight = seg.x + CAVE_SEGMENT_WIDTH;

      if (heliRight > segLeft && heliLeft < segRight) {
        // Helicopter overlaps this segment horizontally
        if (heliTop < seg.top || heliBottom > seg.bottom) {
          this.die(state);
          return;
        }
      }
    }

    // Obstacle collision (AABB)
    for (const obs of state.obstacles) {
      if (
        heliRight > obs.x &&
        heliLeft < obs.x + obs.width &&
        heliBottom > obs.y &&
        heliTop < obs.y + obs.height
      ) {
        this.die(state);
        return;
      }
    }
  }

  private die(state: HelicopterState): void {
    state.phase = 'dead';
    state.holding = false;
    state.flashTimer = 150;

    const score = Math.floor(state.distance);
    if (score > state.bestScore) {
      state.bestScore = score;
      try {
        localStorage.setItem(HS_KEY, String(state.bestScore));
      } catch {
        /* noop */
      }
    }
  }
}
```

Two types of collision, both straightforward:

**Cave walls:** For each cave segment that horizontally overlaps the helicopter, check if the helicopter's top is above the segment's ceiling (`seg.top`) or its bottom is below the floor (`seg.bottom`). The helicopter is drawn centered at `(x, y)`, so we compute its bounding box as `x +/- width/2`, `y +/- height/2`.

**Obstacles:** Standard AABB test. Both the helicopter and obstacles are rectangles, so we check for overlap on both axes simultaneously.

On death:
- Phase switches to `dead`, which stops physics and scrolling.
- `flashTimer` starts a brief orange flash effect (rendered in the next step).
- If the score beats the best, we persist it to `localStorage`.

---

### 3. Update the Game Renderer — Add Obstacles

**File:** `src/contexts/canvas2d/games/helicopter/renderers/GameRenderer.ts`

Add the obstacle drawing method and death flash effect:

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

    // Obstacles
    this.drawObstacles(ctx, state);

    // Helicopter
    this.drawHelicopter(ctx, state);

    // Death flash overlay
    if (state.flashTimer > 0) {
      const alpha = state.flashTimer / 150;
      ctx.fillStyle = `rgba(255, 100, 50, ${alpha * 0.5})`;
      ctx.fillRect(0, 0, canvasW, canvasH);
    }
  }

  private drawCave(
    ctx: CanvasRenderingContext2D,
    state: HelicopterState,
  ): void {
    const cave = state.cave;
    if (cave.length < 2) return;

    // Top wall
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

    // Bottom wall
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

  private drawObstacles(
    ctx: CanvasRenderingContext2D,
    state: HelicopterState,
  ): void {
    for (const obs of state.obstacles) {
      // Brown gradient for rocky look
      const grad = ctx.createLinearGradient(
        obs.x, obs.y, obs.x + obs.width, obs.y,
      );
      grad.addColorStop(0, '#8b4513');
      grad.addColorStop(0.5, '#a0522d');
      grad.addColorStop(1, '#8b4513');
      ctx.fillStyle = grad;
      ctx.fillRect(obs.x, obs.y, obs.width, obs.height);

      // Dark border
      ctx.strokeStyle = '#654321';
      ctx.lineWidth = 1;
      ctx.strokeRect(obs.x, obs.y, obs.width, obs.height);
    }
  }

  private drawHelicopter(
    ctx: CanvasRenderingContext2D,
    state: HelicopterState,
  ): void {
    const heli = state.helicopter;

    ctx.save();
    ctx.translate(heli.x, heli.y);

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

    ctx.beginPath();
    ctx.moveTo(0, -h / 2);
    ctx.lineTo(0, -h / 2 - 5);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(-blade1Len, -h / 2 - 5);
    ctx.lineTo(blade1Len, -h / 2 - 5);
    ctx.stroke();

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

The death flash is a simple full-screen overlay: `rgba(255, 100, 50, alpha)` where alpha fades from 0.5 to 0 over 150ms. It gives instant visual feedback that something bad happened.

---

### 4. Update the Engine — Wire in CollisionSystem

**File:** `src/contexts/canvas2d/games/helicopter/HelicopterEngine.ts`

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
import { CollisionSystem } from './systems/CollisionSystem';
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
  private collisionSystem: CollisionSystem;
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
    this.collisionSystem = new CollisionSystem();
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
    this.collisionSystem.update(this.state, dt);

    // Flash timer countdown
    if (this.state.flashTimer > 0) {
      this.state.flashTimer = Math.max(0, this.state.flashTimer - dt);
    }
  }

  private render(): void {
    this.ctx.clearRect(0, 0, this.state.canvasW, this.state.canvasH);
    this.gameRenderer.render(this.ctx, this.state);
    this.hudRenderer.render(this.ctx, this.state);
  }

  private reset(): void {
    const best = this.state.bestScore;
    const w = this.state.canvasW;
    const h = this.state.canvasH;
    const newState = this.createInitialState(w, h, best);
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

Changes from Step 2:
- Added `CollisionSystem` -- created in the constructor, called in `update()` after physics and obstacles.
- Added `flashTimer` countdown in the update loop.
- `reset()` now preserves `bestScore` so your high score survives restarts.

All other files remain unchanged from their previous versions.

---

### 5. Update the HUD — Add Death Overlay

**File:** `src/contexts/canvas2d/games/helicopter/renderers/HUDRenderer.ts`

Now the HUD shows the death screen with score:

```typescript
import type { HelicopterState } from '../types';

export class HUDRenderer {
  render(ctx: CanvasRenderingContext2D, state: HelicopterState): void {
    const { phase } = state;

    if (phase === 'playing') {
      this.drawScore(ctx, state);
    } else if (phase === 'idle') {
      this.drawIdleOverlay(ctx, state);
    } else if (phase === 'dead') {
      this.drawScore(ctx, state);
      this.drawDeathOverlay(ctx, state);
    }
  }

  private drawScore(
    ctx: CanvasRenderingContext2D,
    state: HelicopterState,
  ): void {
    const score = Math.floor(state.distance);
    const text = `${score}m`;
    const x = state.canvasW / 2;
    const y = 50;

    ctx.font = 'bold 40px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Black outline for readability
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 5;
    ctx.lineJoin = 'round';
    ctx.strokeText(text, x, y);

    ctx.fillStyle = '#66bb6a';
    ctx.fillText(text, x, y);

    // Best score in corner
    if (state.bestScore > 0) {
      ctx.font = 'bold 16px monospace';
      ctx.textAlign = 'right';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 3;
      ctx.strokeText(`Best: ${state.bestScore}m`, state.canvasW - 16, 30);
      ctx.fillStyle = '#a5d6a7';
      ctx.fillText(`Best: ${state.bestScore}m`, state.canvasW - 16, 30);
    }
  }

  private drawIdleOverlay(
    ctx: CanvasRenderingContext2D,
    state: HelicopterState,
  ): void {
    const cx = state.canvasW / 2;
    const cy = state.canvasH * 0.3;

    ctx.font = 'bold 48px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 5;
    ctx.lineJoin = 'round';
    ctx.strokeText('Helicopter', cx, cy);
    ctx.fillStyle = '#66bb6a';
    ctx.fillText('Helicopter', cx, cy);

    const alpha = 0.5 + 0.5 * Math.sin(performance.now() * 0.004);
    ctx.globalAlpha = alpha;
    ctx.font = 'bold 20px monospace';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    ctx.strokeText('Hold Space or Click to Fly', cx, state.canvasH * 0.6);
    ctx.fillStyle = '#fff';
    ctx.fillText('Hold Space or Click to Fly', cx, state.canvasH * 0.6);
    ctx.globalAlpha = 1;

    if (state.bestScore > 0) {
      ctx.font = 'bold 18px monospace';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 3;
      ctx.strokeText(`Best: ${state.bestScore}m`, cx, state.canvasH * 0.67);
      ctx.fillStyle = '#a5d6a7';
      ctx.fillText(`Best: ${state.bestScore}m`, cx, state.canvasH * 0.67);
    }
  }

  private drawDeathOverlay(
    ctx: CanvasRenderingContext2D,
    state: HelicopterState,
  ): void {
    const cx = state.canvasW / 2;
    const cy = state.canvasH / 2;
    const score = Math.floor(state.distance);

    // Dim overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fillRect(0, 0, state.canvasW, state.canvasH);

    // Panel
    const panelW = 280;
    const panelH = 200;
    const px = cx - panelW / 2;
    const py = cy - panelH / 2 - 10;

    ctx.fillStyle = '#1a3a0a';
    ctx.strokeStyle = '#66bb6a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(px, py, panelW, panelH, 12);
    ctx.fill();
    ctx.stroke();

    // "Crashed!" title
    ctx.font = 'bold 32px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ef5350';
    ctx.fillText('Crashed!', cx, py + 40);

    // Final distance
    ctx.font = 'bold 22px monospace';
    ctx.fillStyle = '#fff';
    ctx.fillText(`Distance: ${score}m`, cx, cy);

    // Best score
    ctx.font = 'bold 18px monospace';
    ctx.fillStyle = '#a5d6a7';
    ctx.fillText(`Best: ${state.bestScore}m`, cx, cy + 30);

    // New best indicator
    if (score > 0 && score >= state.bestScore) {
      ctx.font = 'bold 14px monospace';
      ctx.fillStyle = '#ffeb3b';
      ctx.fillText('NEW BEST!', cx, cy + 55);
    }

    // Pulsing restart prompt
    const alpha = 0.5 + 0.5 * Math.sin(performance.now() * 0.004);
    ctx.globalAlpha = alpha;
    ctx.font = 'bold 16px monospace';
    ctx.fillStyle = '#ccc';
    ctx.fillText('Tap or Space to Restart', cx, py + panelH - 20);
    ctx.globalAlpha = 1;
  }
}
```

---

## Test It

1. **Run:** `npm run dev`
2. **Navigate:** Select "Helicopter"
3. **Observe:**
   - Start flying -- brown rectangular obstacles appear from the right edge
   - Some hang from the ceiling (stalactites), some grow from the floor (stalagmites)
   - Fly into a cave wall -- screen flashes orange, "Crashed!" panel appears
   - Fly into an obstacle -- same death behavior
   - Your distance is displayed; best score persists across restarts
   - Press Space or click to restart -- fresh cave, score resets, best preserved
   - "NEW BEST!" appears in yellow when you beat your record

---

## Challenges

**Easy:**
- Change obstacle color from brown to red
- Make obstacles wider (30px instead of 20px)
- Reduce spawn interval to 1000ms for more obstacles

**Medium:**
- Draw obstacles as triangles (pointed stalactites/stalagmites) instead of rectangles
- Add a brief screen shake on death (offset the canvas drawing by random px for a few frames)
- Flash the obstacle that killed you in red

**Hard:**
- Implement pixel-perfect collision using the helicopter's ellipse shape
- Add breakable obstacles that shatter into particles on contact
- Create obstacle patterns (pairs of stalactite + stalagmite forming gates)

---

## What You Learned

- AABB collision detection between rectangles
- Segment-based cave collision using horizontal overlap filtering
- Obstacle spawning relative to cave boundaries
- Death state management with flash effect feedback
- `localStorage` high score persistence with error handling

**Next:** Score display, speed ramp, star background, and final polish!
