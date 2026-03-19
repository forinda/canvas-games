# Step 2: Rotating Ring Gates

**Goal:** Draw rotating ring obstacles with four colored quadrants. The ball passes through the ring opening. Gates spawn procedurally as the ball climbs.

**Time:** ~15 minutes

---

## What You'll Build

Building on step 1:
- **Ring gates** made of four colored arc segments
- **Continuous rotation** so the quadrants spin around the center
- **Procedural spawning** -- new gates appear above as the ball rises
- **Cleanup** -- gates far below the screen are removed

---

## Concepts

- **Arc drawing**: `ctx.arc()` with start/end angles for each quadrant
- **Ring shape**: Outer arc forward, inner arc backward, then `closePath`
- **World-space rotation**: `gate.rotation += speed * dt` each frame
- **Spawn-ahead pattern**: Generate gates when the ball approaches empty space above

---

## Code

### 1. Update Types

**File:** `src/games/color-switch/types.ts`

Add the Gate interface and gate constants to your existing types file:

```typescript
// ── Gate types ──────────────────────────────────────────────
export interface Gate {
  type: 'ring';
  y: number;
  rotation: number;
  colors: string[];
  scored: boolean;
}

// ── Ball ────────────────────────────────────────────────────
export interface Ball {
  x: number;
  y: number;
  velocity: number;
  radius: number;
  color: string;
}

// ── Game phase ──────────────────────────────────────────────
export type Phase = 'idle' | 'playing' | 'dead';

// ── Top-level state ─────────────────────────────────────────
export interface ColorSwitchState {
  ball: Ball;
  gates: Gate[];
  phase: Phase;
  score: number;
  bestScore: number;
  canvasW: number;
  canvasH: number;
  cameraY: number;
}

// ── Constants ───────────────────────────────────────────────
export const GAME_COLORS: string[] = [
  '#f44336', // red
  '#ffeb3b', // yellow
  '#4caf50', // green
  '#2196f3', // blue
];

export const GRAVITY = 0.0018;
export const BOUNCE_FORCE = -0.55;
export const TERMINAL_VELOCITY = 0.8;

export const BALL_RADIUS = 14;
export const BALL_START_Y_RATIO = 0.65;

export const GATE_SPACING = 260;
export const GATE_RING_OUTER = 80;
export const GATE_RING_INNER = 55;
export const GATE_ROTATION_SPEED = 0.0012;
```

`GATE_RING_OUTER` and `GATE_RING_INNER` define the ring's thickness. The gap between them (25 px) is wide enough for the ball (radius 14) to pass through the center hole.

---

### 2. Create the Gate System

**File:** `src/games/color-switch/systems/GateSystem.ts`

Handles spawning, rotation, and cleanup:

```typescript
import type { ColorSwitchState, Gate } from '../types';
import { GAME_COLORS, GATE_SPACING, GATE_ROTATION_SPEED } from '../types';

export class GateSystem {
  private nextGateY: number = 0;

  /** Reset internal counters (called on game restart) */
  reset(startY: number): void {
    this.nextGateY = startY;
  }

  update(state: ColorSwitchState, dt: number): void {
    if (state.phase !== 'playing') return;

    // Rotate existing gates
    for (const gate of state.gates) {
      gate.rotation += GATE_ROTATION_SPEED * dt;
    }

    // Generate gates ahead of the ball
    const generateAheadDistance = state.canvasH * 1.5;
    while (this.nextGateY > state.ball.y - generateAheadDistance) {
      this.spawnGate(state);
    }

    // Cleanup: remove gates that are far below the screen
    const removeBelow = state.ball.y + state.canvasH;
    state.gates = state.gates.filter((g) => g.y < removeBelow);
  }

  private spawnGate(state: ColorSwitchState): void {
    const colors = this.shuffleColors();

    const gate: Gate = {
      type: 'ring',
      y: this.nextGateY,
      rotation: Math.random() * Math.PI * 2,
      colors,
      scored: false,
    };

    state.gates.push(gate);
    this.nextGateY -= GATE_SPACING;
  }

  private shuffleColors(): string[] {
    const colors = [...GAME_COLORS];
    // Fisher-Yates shuffle
    for (let i = colors.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = colors[i];
      colors[i] = colors[j];
      colors[j] = temp;
    }
    return colors;
  }
}
```

The `while` loop in `update` is the spawn-ahead pattern. It keeps generating gates until the nearest unspawned gate is 1.5 screens above the ball. Each gate gets a shuffled copy of the four game colors so the quadrant arrangement varies.

`nextGateY` decreases each time (moving upward in world space) by `GATE_SPACING`. When the ball rises, the `while` condition triggers again and more gates appear.

---

### 3. Update the Game Renderer

**File:** `src/games/color-switch/renderers/GameRenderer.ts`

Add a ring-drawing method and call it for each gate:

```typescript
import type { ColorSwitchState } from '../types';
import { GATE_RING_OUTER, GATE_RING_INNER } from '../types';

export class GameRenderer {
  render(ctx: CanvasRenderingContext2D, state: ColorSwitchState): void {
    const { canvasW, canvasH } = state;

    // Dark background
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvasW, canvasH);

    // Subtle grid pattern
    this.drawBackground(ctx, state);

    ctx.save();
    // Apply camera offset
    ctx.translate(0, state.cameraY);

    // Draw gates
    for (const gate of state.gates) {
      this.drawRingGate(ctx, canvasW / 2, gate.y, gate.rotation, gate.colors);
    }

    // Draw ball
    this.drawBall(ctx, state);

    ctx.restore();
  }

  private drawBackground(ctx: CanvasRenderingContext2D, state: ColorSwitchState): void {
    const { canvasW, canvasH } = state;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    const gridSize = 40;
    const offsetY = (state.cameraY % gridSize + gridSize) % gridSize;

    for (let x = 0; x < canvasW; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvasH);
      ctx.stroke();
    }
    for (let y = offsetY; y < canvasH + gridSize; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvasW, y);
      ctx.stroke();
    }
  }

  private drawRingGate(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    rotation: number,
    colors: string[],
  ): void {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rotation);

    // Draw 4 colored quadrants
    for (let i = 0; i < 4; i++) {
      const startAngle = (i * Math.PI) / 2;
      const endAngle = ((i + 1) * Math.PI) / 2;

      ctx.beginPath();
      ctx.arc(0, 0, GATE_RING_OUTER, startAngle, endAngle);
      ctx.arc(0, 0, GATE_RING_INNER, endAngle, startAngle, true);
      ctx.closePath();
      ctx.fillStyle = colors[i];
      ctx.fill();

      // Subtle border between sections
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    ctx.restore();
  }

  private drawBall(ctx: CanvasRenderingContext2D, state: ColorSwitchState): void {
    const ball = state.ball;

    ctx.save();
    ctx.translate(ball.x, ball.y);

    // Glow effect
    ctx.shadowColor = ball.color;
    ctx.shadowBlur = 20;

    // Ball body
    ctx.beginPath();
    ctx.arc(0, 0, ball.radius, 0, Math.PI * 2);
    ctx.fillStyle = ball.color;
    ctx.fill();

    // Inner highlight
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(-ball.radius * 0.25, -ball.radius * 0.25, ball.radius * 0.45, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.fill();

    // Border
    ctx.beginPath();
    ctx.arc(0, 0, ball.radius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();
  }
}
```

The ring drawing technique is the key detail. For each quadrant:

1. Draw an outer arc from `startAngle` to `endAngle` (clockwise).
2. Draw an inner arc from `endAngle` back to `startAngle` (counter-clockwise via the `true` flag).
3. `closePath` connects the endpoints, forming a closed wedge shape.

This creates the ring body. The ball can pass through the center hole (radius < `GATE_RING_INNER`) without touching the ring.

---

### 4. Update the Engine

**File:** `src/games/color-switch/ColorSwitchEngine.ts`

Add the GateSystem and seed initial gates:

```typescript
import type { ColorSwitchState } from './types';
import { BALL_RADIUS, BALL_START_Y_RATIO, GAME_COLORS, GATE_SPACING } from './types';
import { InputSystem } from './systems/InputSystem';
import { PhysicsSystem } from './systems/PhysicsSystem';
import { GateSystem } from './systems/GateSystem';
import { GameRenderer } from './renderers/GameRenderer';

export class ColorSwitchEngine {
  private ctx: CanvasRenderingContext2D;
  private state: ColorSwitchState;
  private running: boolean;
  private rafId: number;
  private lastTime: number;

  private inputSystem: InputSystem;
  private physicsSystem: PhysicsSystem;
  private gateSystem: GateSystem;
  private gameRenderer: GameRenderer;
  private resizeHandler: () => void;

  constructor(canvas: HTMLCanvasElement, onExit: () => void) {
    this.ctx = canvas.getContext('2d')!;
    this.running = false;
    this.rafId = 0;
    this.lastTime = 0;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    this.state = this.createInitialState(canvas.width, canvas.height);

    // Systems
    this.physicsSystem = new PhysicsSystem();
    this.gateSystem = new GateSystem();
    this.gameRenderer = new GameRenderer();
    this.inputSystem = new InputSystem(
      this.state,
      canvas,
      onExit,
      () => this.reset(),
    );

    // Seed initial gates above the ball
    this.gateSystem.reset(this.state.ball.y - GATE_SPACING);

    // Resize
    this.resizeHandler = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      this.state.canvasW = canvas.width;
      this.state.canvasH = canvas.height;
      this.state.ball.x = canvas.width / 2;
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
    const s = this.state;

    // Idle bobbing
    if (s.phase === 'idle') {
      s.ball.y = s.canvasH * BALL_START_Y_RATIO + Math.sin(performance.now() * 0.003) * 8;
      return;
    }

    this.physicsSystem.update(s, dt);
    this.gateSystem.update(s, dt);
  }

  private render(): void {
    this.ctx.clearRect(0, 0, this.state.canvasW, this.state.canvasH);
    this.gameRenderer.render(this.ctx, this.state);
  }

  private reset(): void {
    const w = this.state.canvasW;
    const h = this.state.canvasH;
    const newState = this.createInitialState(w, h);
    Object.assign(this.state, newState);
    this.gateSystem.reset(this.state.ball.y - GATE_SPACING);
  }

  private createInitialState(canvasW: number, canvasH: number): ColorSwitchState {
    const startColor = GAME_COLORS[Math.floor(Math.random() * GAME_COLORS.length)];
    return {
      ball: {
        x: canvasW / 2,
        y: canvasH * BALL_START_Y_RATIO,
        velocity: 0,
        radius: BALL_RADIUS,
        color: startColor,
      },
      gates: [],
      phase: 'idle',
      score: 0,
      bestScore: 0,
      canvasW,
      canvasH,
      cameraY: 0,
    };
  }
}
```

The seed call `this.gateSystem.reset(this.state.ball.y - GATE_SPACING)` places the first gate one spacing unit above the ball. When `gateSystem.update` runs on the first frame, it fills in additional gates above.

---

## Test It

1. **Run:** `npm run dev`
2. **Navigate:** Select "Color Switch"
3. **Observe:**
   - Colored rings appear above the ball
   - Each ring has four colored quadrants
   - Rings rotate continuously
   - Tap to bounce upward and fly through the center hole
   - New rings appear as you climb higher
   - Rings below the screen are cleaned up (check memory in DevTools)

---

## Challenges

**Easy:**
- Double `GATE_ROTATION_SPEED` and watch the rings spin faster
- Change `GATE_SPACING` to 180 for tighter obstacle placement
- Draw only 2 colors per ring instead of 4

**Medium:**
- Alternate rotation direction (clockwise / counter-clockwise) per gate
- Add a pulsing glow around each ring
- Draw a "safe zone" indicator showing where the ball color matches

**Hard:**
- Make rings accelerate their rotation over time
- Add rings with different numbers of segments (3, 5, 6)
- Draw concentric double rings (two rings at different radii)

---

## What You Learned

- Drawing ring shapes with two opposing `ctx.arc` calls
- Procedural spawn-ahead pattern for infinite scrolling
- Fisher-Yates shuffle for randomized color arrangement
- Continuous rotation via `rotation += speed * dt`
- Memory-friendly cleanup of off-screen objects

**Next:** Color switching pickups and collision detection!
