# Step 4: Score, Speed & Polish

**Goal:** Add distance-based scoring, progressive speed increase, scrolling star background, localStorage best score, and final visual polish.

**Time:** ~15 minutes

---

## What You'll Build

Final polish layer:
- **Distance score**: Displayed top-center during play, accumulates with scroll speed
- **Speed ramp**: `scrollSpeed` increases from `BASE_SCROLL_SPEED` over time, capped at `MAX_SCROLL_SPEED`
- **Best score persistence**: Saved to `localStorage`, loaded on start, shown in corner and on death panel
- **Scrolling star background**: Tiny white dots drift left behind the cave for parallax depth
- **Death flash**: Orange overlay fades out on crash for instant feedback

---

## Concepts

- **Progressive difficulty**: The game gets harder not by changing physics, but by increasing scroll speed. Obstacles arrive faster, the cave narrows, and reaction time shrinks -- all from one variable.
- **Pseudo-random star field**: Instead of storing star positions, we derive them from the loop index using prime-number multipliers. Combined with `backgroundOffset`, they scroll smoothly without needing an array.
- **localStorage guard**: Always wrap `localStorage` calls in try/catch. Private browsing, full storage, or disabled cookies will throw.

---

## Code

This step touches every file to bring the game to its final form. Here is the complete codebase.

### 1. Types (unchanged)

**File:** `src/games/helicopter/types.ts`

```typescript
export interface Helicopter {
  x: number;
  y: number;
  velocity: number;
  width: number;
  height: number;
  rotorAngle: number;
}

export interface CaveSegment {
  x: number;
  top: number;
  bottom: number;
}

export interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type Phase = 'idle' | 'playing' | 'dead';

export interface HelicopterState {
  helicopter: Helicopter;
  cave: CaveSegment[];
  obstacles: Obstacle[];
  phase: Phase;
  distance: number;
  bestScore: number;
  canvasW: number;
  canvasH: number;
  scrollSpeed: number;
  holding: boolean;
  flashTimer: number;
  backgroundOffset: number;
  elapsedTime: number;
}

// Physics
export const GRAVITY = 0.0012;
export const LIFT = -0.0024;
export const MAX_VELOCITY = 0.45;
export const MIN_VELOCITY = -0.35;

// Scrolling
export const BASE_SCROLL_SPEED = 0.18;
export const SPEED_INCREMENT = 0.00001;
export const MAX_SCROLL_SPEED = 0.4;

// Cave
export const CAVE_SEGMENT_WIDTH = 20;
export const INITIAL_GAP = 260;
export const MIN_GAP = 120;
export const GAP_SHRINK_RATE = 0.003;
export const CAVE_ROUGHNESS = 18;

// Helicopter
export const HELI_WIDTH = 40;
export const HELI_HEIGHT = 20;
export const HELI_X_RATIO = 0.15;

// Obstacles
export const OBSTACLE_WIDTH = 20;
export const OBSTACLE_MIN_HEIGHT = 20;
export const OBSTACLE_MAX_HEIGHT = 60;
export const OBSTACLE_SPAWN_INTERVAL = 1400;

// Storage
export const HS_KEY = 'helicopter_best_score';
```

---

### 2. Input System (unchanged)

**File:** `src/games/helicopter/systems/InputSystem.ts`

```typescript
import type { HelicopterState } from '../types';

export class InputSystem {
  private state: HelicopterState;
  private canvas: HTMLCanvasElement;
  private onExit: () => void;
  private onRestart: () => void;

  private keyDownHandler: (e: KeyboardEvent) => void;
  private keyUpHandler: (e: KeyboardEvent) => void;
  private mouseDownHandler: (e: MouseEvent | TouchEvent) => void;
  private mouseUpHandler: (e: MouseEvent | TouchEvent) => void;

  constructor(
    state: HelicopterState,
    canvas: HTMLCanvasElement,
    onExit: () => void,
    onRestart: () => void,
  ) {
    this.state = state;
    this.canvas = canvas;
    this.onExit = onExit;
    this.onRestart = onRestart;

    this.keyDownHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        this.onExit();
        return;
      }
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        this.handlePress();
      }
    };

    this.keyUpHandler = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        this.handleRelease();
      }
    };

    this.mouseDownHandler = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      this.handlePress();
    };

    this.mouseUpHandler = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      this.handleRelease();
    };
  }

  private handlePress(): void {
    const s = this.state;

    if (s.phase === 'idle') {
      s.phase = 'playing';
      s.holding = true;
      return;
    }

    if (s.phase === 'playing') {
      s.holding = true;
      return;
    }

    if (s.phase === 'dead') {
      this.onRestart();
    }
  }

  private handleRelease(): void {
    if (this.state.phase === 'playing') {
      this.state.holding = false;
    }
  }

  attach(): void {
    window.addEventListener('keydown', this.keyDownHandler);
    window.addEventListener('keyup', this.keyUpHandler);
    this.canvas.addEventListener('mousedown', this.mouseDownHandler);
    this.canvas.addEventListener('mouseup', this.mouseUpHandler);
    this.canvas.addEventListener('touchstart', this.mouseDownHandler, {
      passive: false,
    });
    this.canvas.addEventListener('touchend', this.mouseUpHandler, {
      passive: false,
    });
  }

  detach(): void {
    window.removeEventListener('keydown', this.keyDownHandler);
    window.removeEventListener('keyup', this.keyUpHandler);
    this.canvas.removeEventListener('mousedown', this.mouseDownHandler);
    this.canvas.removeEventListener('mouseup', this.mouseUpHandler);
    this.canvas.removeEventListener('touchstart', this.mouseDownHandler);
    this.canvas.removeEventListener('touchend', this.mouseUpHandler);
  }
}
```

---

### 3. Physics System (unchanged)

**File:** `src/games/helicopter/systems/PhysicsSystem.ts`

```typescript
import type { HelicopterState } from '../types';
import { GRAVITY, LIFT, MAX_VELOCITY, MIN_VELOCITY } from '../types';

export class PhysicsSystem {
  update(state: HelicopterState, dt: number): void {
    if (state.phase !== 'playing') {
      // Idle bobbing
      if (state.phase === 'idle') {
        state.helicopter.y =
          state.canvasH * 0.45 + Math.sin(performance.now() * 0.003) * 8;
        state.helicopter.velocity = 0;
      }
      return;
    }

    const heli = state.helicopter;

    // Apply gravity or lift
    if (state.holding) {
      heli.velocity += LIFT * dt;
    } else {
      heli.velocity += GRAVITY * dt;
    }

    // Clamp velocity
    if (heli.velocity > MAX_VELOCITY) {
      heli.velocity = MAX_VELOCITY;
    }
    if (heli.velocity < MIN_VELOCITY) {
      heli.velocity = MIN_VELOCITY;
    }

    // Update position
    heli.y += heli.velocity * dt;

    // Animate rotor
    heli.rotorAngle += dt * 0.03;
    if (heli.rotorAngle > Math.PI * 2) {
      heli.rotorAngle -= Math.PI * 2;
    }
  }
}
```

---

### 4. Obstacle System (unchanged from Step 3)

**File:** `src/games/helicopter/systems/ObstacleSystem.ts`

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
    const rightEdgeSeg = state.cave.find(
      (s) => s.x <= state.canvasW && s.x + CAVE_SEGMENT_WIDTH >= state.canvasW,
    );

    if (!rightEdgeSeg) return;

    const caveTop = rightEdgeSeg.top;
    const caveBottom = rightEdgeSeg.bottom;
    const availableHeight = caveBottom - caveTop;

    if (availableHeight < OBSTACLE_MAX_HEIGHT * 2) return;

    const obsHeight =
      OBSTACLE_MIN_HEIGHT +
      Math.random() * (OBSTACLE_MAX_HEIGHT - OBSTACLE_MIN_HEIGHT);

    const fromTop = Math.random() < 0.5;
    let obsY: number;

    if (fromTop) {
      obsY = caveTop;
    } else {
      obsY = caveBottom - obsHeight;
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

---

### 5. Collision System (unchanged from Step 3)

**File:** `src/games/helicopter/systems/CollisionSystem.ts`

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

    // Cave wall collision
    for (const seg of state.cave) {
      const segLeft = seg.x;
      const segRight = seg.x + CAVE_SEGMENT_WIDTH;

      if (heliRight > segLeft && heliLeft < segRight) {
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

---

### 6. Game Renderer — Final Version with Stars

**File:** `src/games/helicopter/renderers/GameRenderer.ts`

The final renderer adds the scrolling star background:

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

    // Scrolling stars
    this.drawStars(ctx, state);

    // Cave walls
    this.drawCave(ctx, state);

    // Obstacles
    this.drawObstacles(ctx, state);

    // Helicopter
    this.drawHelicopter(ctx, state);

    // Death flash
    if (state.flashTimer > 0) {
      const alpha = state.flashTimer / 150;
      ctx.fillStyle = `rgba(255, 100, 50, ${alpha * 0.5})`;
      ctx.fillRect(0, 0, canvasW, canvasH);
    }
  }

  private drawStars(
    ctx: CanvasRenderingContext2D,
    state: HelicopterState,
  ): void {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    const offset = state.backgroundOffset % 200;
    for (let i = 0; i < 30; i++) {
      const sx = ((i * 67 + 13 - offset) % (state.canvasW + 20)) - 10;
      const sy = (i * 43 + 7) % state.canvasH;
      const size = (i % 3) + 1;
      ctx.fillRect(sx, sy, size, size);
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
      const grad = ctx.createLinearGradient(
        obs.x, obs.y, obs.x + obs.width, obs.y,
      );
      grad.addColorStop(0, '#8b4513');
      grad.addColorStop(0.5, '#a0522d');
      grad.addColorStop(1, '#8b4513');
      ctx.fillStyle = grad;
      ctx.fillRect(obs.x, obs.y, obs.width, obs.height);

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

The star field trick explained:

```
const sx = ((i * 67 + 13 - offset) % (state.canvasW + 20)) - 10;
const sy = (i * 43 + 7) % state.canvasH;
```

- Each star's base position is determined by `i * 67` (x) and `i * 43` (y). The prime multipliers spread them evenly without clustering.
- Subtracting `offset` (which grows with `backgroundOffset`) makes them drift left.
- The modulo wraps them around so they reappear on the right after exiting left.
- `size = (i % 3) + 1` gives stars varying sizes (1px, 2px, 3px) for depth variation.
- Only 30 stars total -- lightweight but effective.

---

### 7. HUD Renderer — Final Version

**File:** `src/games/helicopter/renderers/HUDRenderer.ts`

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

    ctx.strokeStyle = '#000';
    ctx.lineWidth = 5;
    ctx.lineJoin = 'round';
    ctx.strokeText(text, x, y);

    ctx.fillStyle = '#66bb6a';
    ctx.fillText(text, x, y);

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

    ctx.font = 'bold 32px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ef5350';
    ctx.fillText('Crashed!', cx, py + 40);

    ctx.font = 'bold 22px monospace';
    ctx.fillStyle = '#fff';
    ctx.fillText(`Distance: ${score}m`, cx, cy);

    ctx.font = 'bold 18px monospace';
    ctx.fillStyle = '#a5d6a7';
    ctx.fillText(`Best: ${state.bestScore}m`, cx, cy + 30);

    if (score > 0 && score >= state.bestScore) {
      ctx.font = 'bold 14px monospace';
      ctx.fillStyle = '#ffeb3b';
      ctx.fillText('NEW BEST!', cx, cy + 55);
    }

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

### 8. Engine — Final Version with localStorage

**File:** `src/games/helicopter/HelicopterEngine.ts`

The final engine loads the best score from `localStorage` on startup:

```typescript
import type { HelicopterState } from './types';
import {
  BASE_SCROLL_SPEED,
  HELI_WIDTH,
  HELI_HEIGHT,
  HELI_X_RATIO,
  HS_KEY,
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

    // Load best score from localStorage
    let best = 0;
    try {
      best = parseInt(localStorage.getItem(HS_KEY) ?? '0', 10) || 0;
    } catch {
      /* noop */
    }

    this.state = this.createInitialState(canvas.width, canvas.height, best);

    // Systems
    this.physicsSystem = new PhysicsSystem();
    this.obstacleSystem = new ObstacleSystem();
    this.collisionSystem = new CollisionSystem();
    this.gameRenderer = new GameRenderer();
    this.hudRenderer = new HUDRenderer();

    // Initialize cave
    this.obstacleSystem.initCave(this.state);

    this.inputSystem = new InputSystem(
      this.state,
      canvas,
      onExit,
      () => this.reset(),
    );

    // Resize
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

    // Copy into existing state so InputSystem's reference stays valid
    Object.assign(this.state, newState);

    // Re-initialize cave
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

The key addition is loading `best` from `localStorage` in the constructor and passing it to `createInitialState`. Combined with the `CollisionSystem` saving new bests on death, the high score persists across browser sessions.

Note the `Object.assign(this.state, newState)` pattern in `reset()`. The `InputSystem` holds a direct reference to `this.state`. If we replaced the object (`this.state = newState`), the input system would keep mutating the old object. By assigning into the existing object, all references stay valid.

---

### 9. Platform Adapter and Export (unchanged)

**File:** `src/games/helicopter/adapters/PlatformAdapter.ts`

```typescript
import type { GameInstance } from '@shared/GameInterface';
import { HelicopterEngine } from '../HelicopterEngine';

export class PlatformAdapter implements GameInstance {
  private engine: HelicopterEngine;

  constructor(canvas: HTMLCanvasElement, onExit: () => void) {
    this.engine = new HelicopterEngine(canvas, onExit);
  }

  start(): void {
    this.engine.start();
  }

  destroy(): void {
    this.engine.destroy();
  }
}
```

**File:** `src/games/helicopter/index.ts`

```typescript
import type { GameDefinition } from '@shared/GameInterface';
import { PlatformAdapter } from './adapters/PlatformAdapter';

export const HelicopterGame: GameDefinition = {
  id: 'helicopter',
  category: 'arcade' as const,
  name: 'Helicopter',
  description: 'Navigate a helicopter through an endless cave!',
  icon: '\u{1F681}',
  color: '#66bb6a',
  help: {
    goal: 'Fly as far as possible without crashing into cave walls or obstacles.',
    controls: [
      { key: 'Hold Space / Click', action: 'Rise (lift)' },
      { key: 'Release', action: 'Fall (gravity)' },
      { key: 'ESC', action: 'Exit to menu' },
    ],
    tips: [
      'Hold to rise, release to descend — smooth movements are key',
      'The cave narrows over time so stay alert',
      'Speed increases gradually — anticipate obstacles early',
      'Watch for stalactites and stalagmites inside the cave',
    ],
  },
  create(canvas, onExit) {
    const instance = new PlatformAdapter(canvas, onExit);
    instance.start();
    return instance;
  },
};
```

---

## Test It

1. **Run:** `npm run dev`
2. **Navigate:** Select "Helicopter"
3. **Observe the complete game:**
   - Tiny white stars drift left behind the cave walls (parallax)
   - Distance score counts up at top-center during play
   - Best score shown in top-right corner
   - Speed visibly increases over 30-60 seconds of play
   - Cave gap narrows -- the same distance feels harder later
   - Crash into anything -- orange flash, "Crashed!" panel with score
   - "NEW BEST!" appears in yellow when you beat your record
   - Close and reopen the game -- your best score is still there
   - Tap/Space to restart -- everything resets except best score

---

## Challenges

**Easy:**
- Change the star color to light blue for an underwater feel
- Show the current speed alongside the score
- Make the death panel wider to fit longer messages

**Medium:**
- Add a speed indicator bar that fills as `scrollSpeed` approaches `MAX_SCROLL_SPEED`
- Implement a "distance milestones" system that flashes at 100m, 500m, 1000m
- Add a particle trail behind the helicopter (exhaust smoke)

**Hard:**
- Add a global leaderboard using a simple REST API
- Implement a replay system that records inputs and replays the flight
- Add power-ups (shields, slow-motion) that spawn inside the cave
- Create a dual-mode where a second player controls a second helicopter

---

## What You Learned

- Distance-based scoring tied to scroll speed
- Progressive difficulty through a single increasing variable
- Pseudo-random star field using index-based positioning with prime offsets
- `localStorage` persistence with try/catch safety
- `Object.assign` pattern to reset state without breaking external references
- Full game loop architecture: Input -> Physics -> Obstacles -> Collision -> Render

---

## Architecture Recap

Here is how all the pieces fit together:

```
HelicopterEngine (game loop)
  |
  |-- InputSystem        listens for Space/Click, sets holding flag
  |-- PhysicsSystem      applies gravity/lift, moves helicopter, spins rotor
  |-- ObstacleSystem     scrolls cave + obstacles, spawns new segments/obstacles
  |-- CollisionSystem    checks helicopter vs cave walls and obstacles
  |-- GameRenderer       draws background, stars, cave, obstacles, helicopter
  |-- HUDRenderer        draws score, idle overlay, death panel
```

Each system reads and writes to the shared `HelicopterState` object. The engine calls them in order every frame. This separation keeps each file focused on one responsibility.

**Congratulations -- you have built a complete Helicopter cave-flyer game!**

**Next game:** Continue to [Doodle Jump](../15-doodle-jump/README.md) -- where you will learn vertical scrolling and platform generation.
