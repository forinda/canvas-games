# Step 1: Ball & Bounce

**Goal:** Draw a colored ball with gravity, tap-to-bounce input, and a camera that follows the ball upward.

**Time:** ~15 minutes

---

## What You'll Build

Foundation elements:
- **Dark background** with a subtle scrolling grid
- **Colored ball** drawn with glow and inner highlight
- **Gravity** pulls the ball downward each frame
- **Tap / Space** gives the ball an upward impulse
- **Camera** smoothly follows the ball as it rises

---

## Concepts

- **Gravity accumulation**: `velocity += GRAVITY * dt` each frame
- **Impulse bounce**: On tap, set velocity to a negative constant (upward)
- **Terminal velocity**: Cap downward speed so the ball doesn't accelerate forever
- **Camera offset**: Translate the canvas so the ball stays near mid-screen

---

## Code

### 1. Create Types

**File:** `src/games/color-switch/types.ts`

Define the ball, game phase, state, and constants:

```typescript
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
```

Four constants drive the feel. `GRAVITY` is small because `dt` is in milliseconds (roughly 16 per frame). `BOUNCE_FORCE` is negative because the y-axis points downward. `TERMINAL_VELOCITY` prevents the ball from reaching ludicrous speed when falling.

---

### 2. Create the Physics System

**File:** `src/games/color-switch/systems/PhysicsSystem.ts`

Apply gravity, move the ball, and drive the camera:

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
    }
  }
}
```

The camera formula is short but important. `targetCameraY` is always negative or zero -- it shifts the world down so the ball appears near the middle of the screen. The `0.08` lerp factor gives smooth pursuit rather than a locked follow.

---

### 3. Create the Input System

**File:** `src/games/color-switch/systems/InputSystem.ts`

Listen for Space and tap. On input, set ball velocity to `BOUNCE_FORCE`:

```typescript
import type { ColorSwitchState } from '../types';
import { BOUNCE_FORCE } from '../types';

export class InputSystem {
  private state: ColorSwitchState;
  private canvas: HTMLCanvasElement;
  private onExit: () => void;
  private onRestart: () => void;

  private keyHandler: (e: KeyboardEvent) => void;
  private clickHandler: (e: MouseEvent | TouchEvent) => void;

  constructor(
    state: ColorSwitchState,
    canvas: HTMLCanvasElement,
    onExit: () => void,
    onRestart: () => void,
  ) {
    this.state = state;
    this.canvas = canvas;
    this.onExit = onExit;
    this.onRestart = onRestart;

    this.keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        this.onExit();
        return;
      }
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        this.handleTap();
      }
    };

    this.clickHandler = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      this.handleTap();
    };
  }

  private handleTap(): void {
    const s = this.state;

    if (s.phase === 'idle') {
      s.phase = 'playing';
      s.ball.velocity = BOUNCE_FORCE;
      return;
    }

    if (s.phase === 'playing') {
      s.ball.velocity = BOUNCE_FORCE;
      return;
    }

    if (s.phase === 'dead') {
      this.onRestart();
    }
  }

  attach(): void {
    window.addEventListener('keydown', this.keyHandler);
    this.canvas.addEventListener('mousedown', this.clickHandler);
    this.canvas.addEventListener('touchstart', this.clickHandler, { passive: false });
  }

  detach(): void {
    window.removeEventListener('keydown', this.keyHandler);
    this.canvas.removeEventListener('mousedown', this.clickHandler);
    this.canvas.removeEventListener('touchstart', this.clickHandler);
  }
}
```

Notice the three-phase branching inside `handleTap`. In `idle`, the first tap both starts the game and applies the initial bounce. In `playing`, every tap is a bounce. In `dead`, the tap restarts. This keeps one handler for all states.

---

### 4. Create the Game Renderer

**File:** `src/games/color-switch/renderers/GameRenderer.ts`

Draw the background, apply the camera translation, and render the ball:

```typescript
import type { ColorSwitchState } from '../types';

export class GameRenderer {
  render(ctx: CanvasRenderingContext2D, state: ColorSwitchState): void {
    const { canvasW, canvasH } = state;

    // Dark background
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvasW, canvasH);

    // Subtle grid pattern
    this.drawBackground(ctx, state);

    ctx.save();
    // Apply camera offset -- everything below moves with the world
    ctx.translate(0, state.cameraY);

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

The grid's horizontal lines use a `cameraY` modulo offset so they scroll smoothly while the vertical lines stay fixed. Inside `drawBall`, the `shadowBlur` creates a colored glow, and the small offset highlight arc gives the ball a 3D feel.

---

### 5. Create the Game Engine

**File:** `src/games/color-switch/ColorSwitchEngine.ts`

Wire everything together with a requestAnimationFrame loop:

```typescript
import type { ColorSwitchState } from './types';
import { BALL_RADIUS, BALL_START_Y_RATIO, GAME_COLORS } from './types';
import { InputSystem } from './systems/InputSystem';
import { PhysicsSystem } from './systems/PhysicsSystem';
import { GameRenderer } from './renderers/GameRenderer';

export class ColorSwitchEngine {
  private ctx: CanvasRenderingContext2D;
  private state: ColorSwitchState;
  private running: boolean;
  private rafId: number;
  private lastTime: number;

  private inputSystem: InputSystem;
  private physicsSystem: PhysicsSystem;
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
    this.gameRenderer = new GameRenderer();
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

    // Idle bobbing animation
    if (s.phase === 'idle') {
      s.ball.y = s.canvasH * BALL_START_Y_RATIO + Math.sin(performance.now() * 0.003) * 8;
      return;
    }

    this.physicsSystem.update(s, dt);
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

The `dt` clamp (`Math.min(now - this.lastTime, 32)`) prevents huge jumps when you tab away and come back. The idle bobbing uses a sine wave so the ball gently floats before the player taps.

---

### 6. Create the Platform Adapter and Export

**File:** `src/games/color-switch/adapters/PlatformAdapter.ts`

```typescript
import { ColorSwitchEngine } from '../ColorSwitchEngine';

export class PlatformAdapter {
  private engine: ColorSwitchEngine;

  constructor(canvas: HTMLCanvasElement, onExit: () => void) {
    this.engine = new ColorSwitchEngine(canvas, onExit);
  }

  start(): void {
    this.engine.start();
  }

  destroy(): void {
    this.engine.destroy();
  }
}
```

**File:** `src/games/color-switch/index.ts`

```typescript
import { PlatformAdapter } from './adapters/PlatformAdapter';

export const ColorSwitchGame = {
  id: 'color-switch',
  name: 'Color Switch',
  description: 'Match your ball color to pass through gates!',
  create(canvas: HTMLCanvasElement, onExit: () => void) {
    const instance = new PlatformAdapter(canvas, onExit);
    instance.start();
    return instance;
  },
};
```

---

## Test It

1. **Run:** `npm run dev`
2. **Navigate:** Select "Color Switch"
3. **Observe:**
   - Dark background with faint scrolling grid
   - Colored ball bobbing gently at screen center
   - Press Space or tap -- ball launches upward
   - Release and gravity pulls the ball back down
   - Tap repeatedly to keep rising
   - Camera smoothly follows upward movement
   - Fall off the bottom of the screen to trigger "dead" phase
   - Tap again to restart

---

## Challenges

**Easy:**
- Change `GRAVITY` to `0.003` and feel the difference
- Make the ball larger (`BALL_RADIUS = 20`)
- Pick a fixed starting color instead of random

**Medium:**
- Add a trail behind the ball (array of past positions with fading alpha)
- Tint the background darker as the ball climbs higher
- Add screen shake when the ball hits terminal velocity

**Hard:**
- Implement double-tap for a stronger bounce
- Add horizontal drift when tilting (device orientation API)
- Draw a speed-lines effect when velocity exceeds a threshold

---

## What You Learned

- Gravity as continuous velocity accumulation (`v += g * dt`)
- Impulse-based bounce by overwriting velocity on input
- Terminal velocity as a simple clamp
- Camera offset via `ctx.translate` for vertical scrolling
- Smooth camera pursuit with linear interpolation

**Next:** Rotating ring gates that the ball must pass through!
