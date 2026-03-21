# Step 3: Color Switching & Collision

**Goal:** Add color switcher pickups between gates and implement collision detection -- matching color sections let the ball pass, wrong sections kill.

**Time:** ~15 minutes

---

## What You'll Build

Building on step 2:
- **Color switcher pickups** between gates that change the ball's color on contact
- **Ring collision detection** using angular math to find which quadrant the ball overlaps
- **Score tracking** -- each gate the ball passes above scores one point
- **Death state** when the ball touches a non-matching quadrant

---

## Concepts

- **Angular collision**: `Math.atan2(dy, dx)` relative to the gate's rotation gives the quadrant index
- **Ring overlap test**: Ball distance from center must be between inner and outer radius
- **Circle-circle pickup**: Simple distance check between ball center and switcher center
- **Color exclusion**: Pick a random color that is not the current color

---

## Code

### 1. Update Types

**File:** `src/contexts/canvas2d/games/color-switch/types.ts`

Add the ColorSwitcher interface, flashTimer to state, and switcher constants:

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

// ── Color Switcher ──────────────────────────────────────────
export interface ColorSwitcher {
  x: number;
  y: number;
  radius: number;
  rotation: number;
  consumed: boolean;
}

// ── Game phase ──────────────────────────────────────────────
export type Phase = 'idle' | 'playing' | 'dead';

// ── Top-level state ─────────────────────────────────────────
export interface ColorSwitchState {
  ball: Ball;
  gates: Gate[];
  switchers: ColorSwitcher[];
  phase: Phase;
  score: number;
  bestScore: number;
  canvasW: number;
  canvasH: number;
  flashTimer: number;
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

export const SWITCHER_RADIUS = 14;
export const SWITCHER_ROTATION_SPEED = 0.004;
```

---

### 2. Create the Collision System

**File:** `src/contexts/canvas2d/games/color-switch/systems/CollisionSystem.ts`

This is the core of Color Switch. It checks ring collisions and color switcher pickups:

```typescript
import type { ColorSwitchState, Gate } from '../types';
import {
  GAME_COLORS,
  GATE_RING_OUTER,
  GATE_RING_INNER,
} from '../types';

export class CollisionSystem {
  update(state: ColorSwitchState, _dt: number): void {
    if (state.phase !== 'playing') return;

    const ball = state.ball;
    const ballX = ball.x;
    const ballY = ball.y;
    const ballR = ball.radius;

    // Check gate collisions
    for (const gate of state.gates) {
      // Score: ball passed above gate center
      if (!gate.scored && ballY < gate.y - 30) {
        gate.scored = true;
        state.score++;
        continue;
      }

      // Only check collision when ball is near the gate vertically
      const dy = Math.abs(ballY - gate.y);
      if (dy > GATE_RING_OUTER + ballR + 5) continue;

      const hit = this.checkRingCollision(gate, ballX, ballY, ballR, state.canvasW);
      if (hit) {
        state.phase = 'dead';
        state.flashTimer = 200;
        return;
      }
    }

    // Check color switcher collisions
    for (const sw of state.switchers) {
      if (sw.consumed) continue;
      const dx = ballX - sw.x;
      const dy = ballY - sw.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < ballR + sw.radius) {
        sw.consumed = true;
        // Change ball to a random different color
        const otherColors = GAME_COLORS.filter((c) => c !== ball.color);
        ball.color = otherColors[Math.floor(Math.random() * otherColors.length)];
      }
    }
  }

  private checkRingCollision(
    gate: Gate,
    bx: number,
    by: number,
    br: number,
    canvasW: number,
  ): boolean {
    const cx = canvasW / 2;
    const dx = bx - cx;
    const dy = by - gate.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Ball is outside the ring or inside the hole -- no collision with the ring body
    if (dist > GATE_RING_OUTER + br || dist < GATE_RING_INNER - br) {
      return false;
    }

    // Ball overlaps the ring body -- determine which color quadrant
    const angle = Math.atan2(dy, dx) - gate.rotation;
    const normalizedAngle = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const quadrant = Math.floor(normalizedAngle / (Math.PI / 2)) % 4;
    const quadrantColor = gate.colors[quadrant];

    // If ball color does NOT match the quadrant, it's a death
    return quadrantColor !== this.ballColor(gate, bx, by, br, canvasW);
  }

  private ballColor(
    _gate: Gate,
    _bx: number,
    _by: number,
    _br: number,
    _canvasW: number,
  ): string {
    // We need access to the ball color -- but we already have it from the caller.
    // Let's refactor to store it.
    return '';
  }
}
```

Wait -- that helper is awkward. The collision method needs the ball's color but only receives gate parameters. Let us simplify. Store the ball color at the top of `update` and reference it in the private method:

```typescript
import type { ColorSwitchState, Gate } from '../types';
import {
  GAME_COLORS,
  GATE_RING_OUTER,
  GATE_RING_INNER,
} from '../types';

export class CollisionSystem {
  private ballColor: string = '';

  update(state: ColorSwitchState, _dt: number): void {
    if (state.phase !== 'playing') return;

    const ball = state.ball;
    this.ballColor = ball.color;
    const ballX = ball.x;
    const ballY = ball.y;
    const ballR = ball.radius;

    // Check gate collisions
    for (const gate of state.gates) {
      // Score: ball passed above gate center
      if (!gate.scored && ballY < gate.y - 30) {
        gate.scored = true;
        state.score++;
        continue;
      }

      // Only check collision when ball is near the gate vertically
      const dy = Math.abs(ballY - gate.y);
      if (dy > GATE_RING_OUTER + ballR + 5) continue;

      const hit = this.checkRingCollision(gate, ballX, ballY, ballR, state.canvasW);
      if (hit) {
        state.phase = 'dead';
        state.flashTimer = 200;
        return;
      }
    }

    // Check color switcher collisions
    for (const sw of state.switchers) {
      if (sw.consumed) continue;
      const dx = ballX - sw.x;
      const dy = ballY - sw.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < ballR + sw.radius) {
        sw.consumed = true;
        // Change ball to a random different color
        const otherColors = GAME_COLORS.filter((c) => c !== ball.color);
        ball.color = otherColors[Math.floor(Math.random() * otherColors.length)];
        this.ballColor = ball.color;
      }
    }
  }

  private checkRingCollision(
    gate: Gate,
    bx: number,
    by: number,
    br: number,
    canvasW: number,
  ): boolean {
    const cx = canvasW / 2;
    const dx = bx - cx;
    const dy = by - gate.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Ball is outside the ring or inside the hole -- no collision
    if (dist > GATE_RING_OUTER + br || dist < GATE_RING_INNER - br) {
      return false;
    }

    // Ball overlaps the ring body -- determine which color quadrant
    const angle = Math.atan2(dy, dx) - gate.rotation;
    const normalizedAngle = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const quadrant = Math.floor(normalizedAngle / (Math.PI / 2)) % 4;
    const quadrantColor = gate.colors[quadrant];

    // Matching color = safe, wrong color = death
    return quadrantColor !== this.ballColor;
  }
}
```

The ring collision has two stages:

1. **Distance check** -- If the ball is farther than `GATE_RING_OUTER + ballRadius` from the center, or closer than `GATE_RING_INNER - ballRadius`, it is not touching the ring body at all.

2. **Quadrant lookup** -- Subtract the gate's rotation from the angle so we get the angle in the gate's local space. Normalize to `[0, 2pi)` and divide by `pi/2` to get a quadrant index (0-3). Look up the color for that quadrant. If it does not match the ball, the player dies.

---

### 3. Update the Gate System

**File:** `src/contexts/canvas2d/games/color-switch/systems/GateSystem.ts`

Spawn a color switcher between each pair of gates. Also rotate switchers:

```typescript
import type { ColorSwitchState, Gate, ColorSwitcher } from '../types';
import {
  GAME_COLORS,
  GATE_SPACING,
  GATE_ROTATION_SPEED,
  SWITCHER_RADIUS,
  SWITCHER_ROTATION_SPEED,
} from '../types';

export class GateSystem {
  private nextGateY: number = 0;

  reset(startY: number): void {
    this.nextGateY = startY;
  }

  update(state: ColorSwitchState, dt: number): void {
    if (state.phase !== 'playing') return;

    // Rotate existing gates
    for (const gate of state.gates) {
      gate.rotation += GATE_ROTATION_SPEED * dt;
    }

    // Rotate existing switchers
    for (const sw of state.switchers) {
      sw.rotation += SWITCHER_ROTATION_SPEED * dt;
    }

    // Generate gates ahead of the ball
    const generateAheadDistance = state.canvasH * 1.5;
    while (this.nextGateY > state.ball.y - generateAheadDistance) {
      this.spawnGate(state);
    }

    // Cleanup off-screen objects
    const removeBelow = state.ball.y + state.canvasH;
    state.gates = state.gates.filter((g) => g.y < removeBelow);
    state.switchers = state.switchers.filter((s) => s.y < removeBelow);
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

    // Spawn a color switcher halfway between this gate and the next
    const switcher: ColorSwitcher = {
      x: state.canvasW / 2,
      y: this.nextGateY - GATE_SPACING / 2,
      radius: SWITCHER_RADIUS,
      rotation: 0,
      consumed: false,
    };
    state.switchers.push(switcher);

    this.nextGateY -= GATE_SPACING;
  }

  private shuffleColors(): string[] {
    const colors = [...GAME_COLORS];
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

Each gate now gets a companion switcher placed at `gate.y - GATE_SPACING / 2`, which is exactly halfway to the next gate above.

---

### 4. Update the Game Renderer

**File:** `src/contexts/canvas2d/games/color-switch/renderers/GameRenderer.ts`

Add switcher drawing and the death flash effect:

```typescript
import type { ColorSwitchState } from '../types';
import { GAME_COLORS, GATE_RING_OUTER, GATE_RING_INNER, SWITCHER_RADIUS } from '../types';

export class GameRenderer {
  render(ctx: CanvasRenderingContext2D, state: ColorSwitchState): void {
    const { canvasW, canvasH } = state;

    // Dark background
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvasW, canvasH);

    // Subtle grid pattern
    this.drawBackground(ctx, state);

    ctx.save();
    ctx.translate(0, state.cameraY);

    // Draw gates
    for (const gate of state.gates) {
      this.drawRingGate(ctx, canvasW / 2, gate.y, gate.rotation, gate.colors);
    }

    // Draw color switchers
    for (const sw of state.switchers) {
      if (!sw.consumed) {
        this.drawSwitcher(ctx, sw);
      }
    }

    // Draw ball
    this.drawBall(ctx, state);

    ctx.restore();

    // Death flash
    if (state.flashTimer > 0) {
      const alpha = state.flashTimer / 200;
      ctx.fillStyle = `rgba(255, 50, 50, ${alpha * 0.5})`;
      ctx.fillRect(0, 0, canvasW, canvasH);
    }
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

    for (let i = 0; i < 4; i++) {
      const startAngle = (i * Math.PI) / 2;
      const endAngle = ((i + 1) * Math.PI) / 2;

      ctx.beginPath();
      ctx.arc(0, 0, GATE_RING_OUTER, startAngle, endAngle);
      ctx.arc(0, 0, GATE_RING_INNER, endAngle, startAngle, true);
      ctx.closePath();
      ctx.fillStyle = colors[i];
      ctx.fill();

      ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    ctx.restore();
  }

  private drawSwitcher(
    ctx: CanvasRenderingContext2D,
    sw: { x: number; y: number; radius: number; rotation: number },
  ): void {
    ctx.save();
    ctx.translate(sw.x, sw.y);
    ctx.rotate(sw.rotation);

    const r = SWITCHER_RADIUS;

    // Draw 4 color segments
    for (let i = 0; i < 4; i++) {
      const startAngle = (i * Math.PI) / 2;
      const endAngle = ((i + 1) * Math.PI) / 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, r, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = GAME_COLORS[i];
      ctx.fill();
    }

    // White center dot
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.35, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();

    // Glow
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(0, 0, r + 2, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.restore();
  }

  private drawBall(ctx: CanvasRenderingContext2D, state: ColorSwitchState): void {
    const ball = state.ball;

    ctx.save();
    ctx.translate(ball.x, ball.y);

    ctx.shadowColor = ball.color;
    ctx.shadowBlur = 20;

    ctx.beginPath();
    ctx.arc(0, 0, ball.radius, 0, Math.PI * 2);
    ctx.fillStyle = ball.color;
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(-ball.radius * 0.25, -ball.radius * 0.25, ball.radius * 0.45, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(0, 0, ball.radius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();
  }
}
```

The switcher is a small 4-color pie chart with a white center dot and a faint glow ring. When consumed, `sw.consumed` is set to true and the renderer skips it.

The death flash is drawn after restoring the camera transform so it covers the full screen. Its alpha fades as `flashTimer` counts down toward zero.

---

### 5. Update the Physics System

**File:** `src/contexts/canvas2d/games/color-switch/systems/PhysicsSystem.ts`

Add flash timer countdown and death flash trigger:

```typescript
import type { ColorSwitchState } from '../types';
import { GRAVITY, TERMINAL_VELOCITY } from '../types';

export class PhysicsSystem {
  update(state: ColorSwitchState, dt: number): void {
    if (state.phase !== 'playing') return;

    const ball = state.ball;

    // Apply gravity
    ball.velocity += GRAVITY * dt;
    if (ball.velocity > TERMINAL_VELOCITY) {
      ball.velocity = TERMINAL_VELOCITY;
    }

    // Update ball position
    ball.y += ball.velocity * dt;

    // Camera follows ball when it goes above center screen
    const targetCameraY = Math.min(0, state.canvasH * 0.5 - ball.y);
    state.cameraY += (targetCameraY - state.cameraY) * 0.08;

    // Death if ball falls below screen
    const screenBallY = ball.y + state.cameraY;
    if (screenBallY > state.canvasH + 50) {
      state.phase = 'dead';
      state.flashTimer = 200;
    }
  }
}
```

---

### 6. Update the Engine

**File:** `src/contexts/canvas2d/games/color-switch/ColorSwitchEngine.ts`

Add the CollisionSystem and flashTimer handling:

```typescript
import type { ColorSwitchState } from './types';
import { BALL_RADIUS, BALL_START_Y_RATIO, GAME_COLORS, GATE_SPACING } from './types';
import { InputSystem } from './systems/InputSystem';
import { PhysicsSystem } from './systems/PhysicsSystem';
import { GateSystem } from './systems/GateSystem';
import { CollisionSystem } from './systems/CollisionSystem';
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
  private collisionSystem: CollisionSystem;
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
    this.collisionSystem = new CollisionSystem();
    this.gameRenderer = new GameRenderer();
    this.inputSystem = new InputSystem(
      this.state,
      canvas,
      onExit,
      () => this.reset(),
    );

    // Seed initial gates
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

    // Flash timer countdown
    if (s.flashTimer > 0) {
      s.flashTimer = Math.max(0, s.flashTimer - dt);
    }

    // Idle bobbing
    if (s.phase === 'idle') {
      s.ball.y = s.canvasH * BALL_START_Y_RATIO + Math.sin(performance.now() * 0.003) * 8;
      return;
    }

    this.physicsSystem.update(s, dt);
    this.gateSystem.update(s, dt);
    this.collisionSystem.update(s, dt);
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
      switchers: [],
      phase: 'idle',
      score: 0,
      bestScore: 0,
      canvasW,
      canvasH,
      flashTimer: 0,
      cameraY: 0,
    };
  }
}
```

---

## Test It

1. **Run:** `npm run dev`
2. **Navigate:** Select "Color Switch"
3. **Observe:**
   - Color switcher pickups appear between gates (small spinning 4-color circles)
   - Fly into a switcher -- ball color changes instantly
   - Pass through a ring section matching your color -- safe
   - Touch a ring section that does not match -- red flash, game stops
   - Score increments each time you clear a gate
   - Tap to restart after death

---

## Challenges

**Easy:**
- Make the death flash last longer (400 ms instead of 200)
- Always change to a specific color instead of random
- Add a console.log when the ball scores a point

**Medium:**
- Show a brief "+1" floating text when scoring
- Add particle burst when picking up a color switcher
- Highlight the matching quadrant with a subtle outline

**Hard:**
- Add "near miss" detection (ball passes close to wrong color) with a warning flash
- Implement a grace period where the ball can overlap wrong colors for 50 ms before dying
- Add a slow-motion effect when the ball enters a gate region

---

## What You Learned

- Angular collision detection using `atan2` and rotation subtraction
- Ring overlap test with inner/outer radius bounds
- Circle-circle pickup collision with distance check
- Color exclusion filtering for random color changes
- Flash timer pattern for brief visual effects

**Next:** More gate shapes -- horizontal bars and square gates!
