# Step 5: Score & Polish

**Goal:** Add a large centered score display, idle and death overlays, localStorage high score persistence, and final polish.

**Time:** ~15 minutes

---

## What You'll Build

Building on step 4:
- **Large score number** displayed behind the action during play
- **Idle overlay** with title, subtitle, and pulsing arrow prompt
- **Death overlay** with score, best score, and restart hint inside a panel
- **localStorage persistence** for the best score across sessions
- **Endless mode** -- the game already scrolls infinitely; we finalize the loop

---

## Concepts

- **HUD layering**: Score renders on top of game elements but behind overlays
- **Overlay patterns**: Semi-transparent backgrounds with centered text panels
- **localStorage**: Simple try/catch wrapper for environments where storage is unavailable
- **State reset via Object.assign**: Overwrite the existing state object so system references remain valid

---

## Code

### 1. Update Types

**File:** `src/contexts/canvas2d/games/color-switch/types.ts`

Add the high-score localStorage key constant. The full final types file:

```typescript
// ── Gate types ──────────────────────────────────────────────
export type GateType = 'ring' | 'bar' | 'square';

export interface Gate {
  type: GateType;
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
export const GATE_BAR_WIDTH = 220;
export const GATE_BAR_HEIGHT = 20;
export const GATE_SQUARE_SIZE = 140;

export const GATE_ROTATION_SPEED = 0.0012;

export const SWITCHER_RADIUS = 14;
export const SWITCHER_ROTATION_SPEED = 0.004;

export const SCROLL_SPEED = 0.15;

export const HS_KEY = 'color_switch_highscore';
```

---

### 2. Create the HUD Renderer

**File:** `src/contexts/canvas2d/games/color-switch/renderers/HUDRenderer.ts`

Three drawing modes: idle overlay, in-game score, death overlay.

```typescript
import type { ColorSwitchState } from '../types';

export class HUDRenderer {
  render(ctx: CanvasRenderingContext2D, state: ColorSwitchState): void {
    const { canvasW, canvasH } = state;

    if (state.phase === 'idle') {
      this.drawIdleOverlay(ctx, canvasW, canvasH);
    }

    if (state.phase === 'playing') {
      this.drawScore(ctx, canvasW, state.score);
    }

    if (state.phase === 'dead') {
      this.drawDeathOverlay(ctx, canvasW, canvasH, state.score, state.bestScore);
    }
  }

  private drawScore(ctx: CanvasRenderingContext2D, canvasW: number, score: number): void {
    ctx.save();
    ctx.font = 'bold 64px monospace';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(String(score), canvasW / 2, 40);
    ctx.restore();
  }

  private drawIdleOverlay(
    ctx: CanvasRenderingContext2D,
    canvasW: number,
    canvasH: number,
  ): void {
    ctx.save();

    // Title
    ctx.font = 'bold 36px monospace';
    ctx.fillStyle = '#e040fb';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Color Switch', canvasW / 2, canvasH * 0.3);

    // Subtitle
    ctx.font = '16px monospace';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.fillText('Tap or press SPACE to start', canvasW / 2, canvasH * 0.3 + 50);

    // Pulsing arrow
    const pulse = Math.sin(performance.now() * 0.004) * 5;
    ctx.font = '28px monospace';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.fillText('\u25B2', canvasW / 2, canvasH * 0.5 + pulse);

    ctx.restore();
  }

  private drawDeathOverlay(
    ctx: CanvasRenderingContext2D,
    canvasW: number,
    canvasH: number,
    score: number,
    bestScore: number,
  ): void {
    ctx.save();

    // Dim background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, canvasW, canvasH);

    // Panel
    const panelW = Math.min(300, canvasW * 0.7);
    const panelH = 220;
    const panelX = (canvasW - panelW) / 2;
    const panelY = (canvasH - panelH) / 2;

    ctx.fillStyle = '#12121f';
    ctx.beginPath();
    ctx.roundRect(panelX, panelY, panelW, panelH, 16);
    ctx.fill();

    ctx.strokeStyle = '#e040fb';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(panelX, panelY, panelW, panelH, 16);
    ctx.stroke();

    // Game Over
    ctx.font = 'bold 28px monospace';
    ctx.fillStyle = '#e040fb';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Game Over', canvasW / 2, panelY + 40);

    // Score
    ctx.font = 'bold 48px monospace';
    ctx.fillStyle = '#fff';
    ctx.fillText(String(score), canvasW / 2, panelY + 95);

    // Best
    ctx.font = '16px monospace';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.fillText(`Best: ${bestScore}`, canvasW / 2, panelY + 140);

    // Restart hint
    ctx.font = '14px monospace';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.fillText('Tap or SPACE to restart', canvasW / 2, panelY + 185);

    ctx.restore();
  }
}
```

The in-game score is drawn at 15% opacity and 64px bold so it reads as a large watermark behind the gameplay. Players see it without it competing with the gates and ball.

The death overlay dims the entire screen at 60% opacity, then draws a rounded panel in the center. `ctx.roundRect` draws the panel shape twice -- once filled, once stroked -- to create a solid panel with a magenta border.

The idle overlay uses `performance.now()` inside `drawIdleOverlay` for the pulsing arrow. This works because the render function is called every frame, so the sine wave animates smoothly.

---

### 3. Update the Physics System

**File:** `src/contexts/canvas2d/games/color-switch/systems/PhysicsSystem.ts`

Add high score saving on death:

```typescript
import type { ColorSwitchState } from '../types';
import { GRAVITY, TERMINAL_VELOCITY, HS_KEY } from '../types';

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
      this.saveBest(state);
    }
  }

  private saveBest(state: ColorSwitchState): void {
    if (state.score > state.bestScore) {
      state.bestScore = state.score;
      try {
        localStorage.setItem(HS_KEY, String(state.bestScore));
      } catch {
        /* noop -- storage may be unavailable */
      }
    }
  }
}
```

---

### 4. Update the Collision System

**File:** `src/contexts/canvas2d/games/color-switch/systems/CollisionSystem.ts`

Add the same `saveBest` call when death occurs from a gate collision:

```typescript
import type { ColorSwitchState, Gate } from '../types';
import {
  GAME_COLORS,
  GATE_RING_OUTER,
  GATE_RING_INNER,
  GATE_BAR_WIDTH,
  GATE_BAR_HEIGHT,
  GATE_SQUARE_SIZE,
  HS_KEY,
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
      if (!gate.scored && ballY < gate.y - 30) {
        gate.scored = true;
        state.score++;
        continue;
      }

      const dy = Math.abs(ballY - gate.y);
      if (dy > GATE_RING_OUTER + ballR + 5) continue;

      const hit = this.checkGateCollision(gate, ballX, ballY, ballR, state.canvasW);
      if (hit) {
        state.phase = 'dead';
        state.flashTimer = 200;
        this.saveBest(state);
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
        const otherColors = GAME_COLORS.filter((c) => c !== ball.color);
        ball.color = otherColors[Math.floor(Math.random() * otherColors.length)];
        this.ballColor = ball.color;
      }
    }
  }

  private checkGateCollision(
    gate: Gate,
    bx: number,
    by: number,
    br: number,
    canvasW: number,
  ): boolean {
    const cx = canvasW / 2;

    if (gate.type === 'ring') {
      return this.checkRingCollision(gate, bx, by, br, cx);
    }
    if (gate.type === 'bar') {
      return this.checkBarCollision(gate, bx, by, br, cx);
    }
    if (gate.type === 'square') {
      return this.checkSquareCollision(gate, bx, by, br, cx);
    }
    return false;
  }

  private checkRingCollision(
    gate: Gate,
    bx: number,
    by: number,
    br: number,
    cx: number,
  ): boolean {
    const dx = bx - cx;
    const dy = by - gate.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > GATE_RING_OUTER + br || dist < GATE_RING_INNER - br) {
      return false;
    }

    const angle = Math.atan2(dy, dx) - gate.rotation;
    const normalizedAngle = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const quadrant = Math.floor(normalizedAngle / (Math.PI / 2)) % 4;
    const quadrantColor = gate.colors[quadrant];

    return quadrantColor !== this.ballColor;
  }

  private checkBarCollision(
    gate: Gate,
    bx: number,
    by: number,
    br: number,
    cx: number,
  ): boolean {
    const halfW = GATE_BAR_WIDTH / 2;
    const halfH = GATE_BAR_HEIGHT / 2;

    const dx = bx - cx;
    const dy = by - gate.y;
    const cos = Math.cos(-gate.rotation);
    const sin = Math.sin(-gate.rotation);
    const localX = dx * cos - dy * sin;
    const localY = dx * sin + dy * cos;

    const closestX = Math.max(-halfW, Math.min(halfW, localX));
    const closestY = Math.max(-halfH, Math.min(halfH, localY));
    const distX = localX - closestX;
    const distY = localY - closestY;

    if (distX * distX + distY * distY > br * br) {
      return false;
    }

    const sectionWidth = GATE_BAR_WIDTH / 4;
    const sectionIndex = Math.min(
      3,
      Math.max(0, Math.floor((localX + halfW) / sectionWidth)),
    );
    const sectionColor = gate.colors[sectionIndex];

    return sectionColor !== this.ballColor;
  }

  private checkSquareCollision(
    gate: Gate,
    bx: number,
    by: number,
    br: number,
    cx: number,
  ): boolean {
    const halfSize = GATE_SQUARE_SIZE / 2;
    const thickness = 18;

    const dx = bx - cx;
    const dy = by - gate.y;
    const cos = Math.cos(-gate.rotation);
    const sin = Math.sin(-gate.rotation);
    const localX = dx * cos - dy * sin;
    const localY = dx * sin + dy * cos;

    const sides = [
      { x1: -halfSize, y1: -halfSize, x2: halfSize, y2: -halfSize + thickness, colorIdx: 0 },
      { x1: halfSize - thickness, y1: -halfSize, x2: halfSize, y2: halfSize, colorIdx: 1 },
      { x1: -halfSize, y1: halfSize - thickness, x2: halfSize, y2: halfSize, colorIdx: 2 },
      { x1: -halfSize, y1: -halfSize, x2: -halfSize + thickness, y2: halfSize, colorIdx: 3 },
    ];

    for (const side of sides) {
      const closestX = Math.max(side.x1, Math.min(side.x2, localX));
      const closestY = Math.max(side.y1, Math.min(side.y2, localY));
      const distX = localX - closestX;
      const distY = localY - closestY;

      if (distX * distX + distY * distY < br * br) {
        if (gate.colors[side.colorIdx] !== this.ballColor) {
          return true;
        }
      }
    }

    return false;
  }

  private saveBest(state: ColorSwitchState): void {
    if (state.score > state.bestScore) {
      state.bestScore = state.score;
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

### 5. Update the Engine

**File:** `src/contexts/canvas2d/games/color-switch/ColorSwitchEngine.ts`

Load the best score from localStorage on startup. Add the HUDRenderer. Full final engine:

```typescript
import type { ColorSwitchState } from './types';
import {
  BALL_RADIUS,
  BALL_START_Y_RATIO,
  GAME_COLORS,
  GATE_SPACING,
  HS_KEY,
} from './types';
import { InputSystem } from './systems/InputSystem';
import { PhysicsSystem } from './systems/PhysicsSystem';
import { GateSystem } from './systems/GateSystem';
import { CollisionSystem } from './systems/CollisionSystem';
import { GameRenderer } from './renderers/GameRenderer';
import { HUDRenderer } from './renderers/HUDRenderer';

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
  private hudRenderer: HUDRenderer;
  private resizeHandler: () => void;

  constructor(canvas: HTMLCanvasElement, onExit: () => void) {
    this.ctx = canvas.getContext('2d')!;
    this.running = false;
    this.rafId = 0;
    this.lastTime = 0;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    let best = 0;
    try {
      best = parseInt(localStorage.getItem(HS_KEY) ?? '0', 10) || 0;
    } catch {
      /* noop */
    }

    this.state = this.createInitialState(canvas.width, canvas.height, best);

    // Systems
    this.physicsSystem = new PhysicsSystem();
    this.gateSystem = new GateSystem();
    this.collisionSystem = new CollisionSystem();
    this.gameRenderer = new GameRenderer();
    this.hudRenderer = new HUDRenderer();
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

    // Reset gate generation
    this.gateSystem.reset(this.state.ball.y - GATE_SPACING);
  }

  private createInitialState(
    canvasW: number,
    canvasH: number,
    bestScore: number,
  ): ColorSwitchState {
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
      bestScore,
      canvasW,
      canvasH,
      flashTimer: 0,
      cameraY: 0,
    };
  }
}
```

Key details in the final engine:

- `best` is loaded from localStorage in the constructor and passed to `createInitialState`. On reset, the current `bestScore` is carried forward so it survives across rounds.
- `Object.assign(this.state, newState)` overwrites all properties on the existing state object. This is critical because `InputSystem` holds a reference to `this.state` -- if we replaced the object entirely, the input system would still point at the old one.
- The render pipeline calls `gameRenderer` first (background, gates, ball), then `hudRenderer` on top (score, overlays). The HUD draws in screen space, not world space, so it is unaffected by the camera.

---

### 6. Create the Platform Adapter and Export

**File:** `src/contexts/canvas2d/games/color-switch/adapters/PlatformAdapter.ts`

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

**File:** `src/contexts/canvas2d/games/color-switch/index.ts`

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
3. **Verify the full game loop:**
   - **Idle screen**: Title "Color Switch" in magenta, subtitle, pulsing arrow, ball bobbing
   - **Press Space / tap**: Game starts, ball bounces upward
   - **Playing**: Large faint score at top center, gates rotating, switchers between gates
   - **Pass a gate**: Score increments
   - **Pick up a switcher**: Ball color changes
   - **Hit wrong color**: Red flash, death overlay appears
   - **Death panel**: "Game Over", score, best score, restart hint
   - **Tap again**: Restarts from idle
   - **Close and reopen**: Best score persists via localStorage

---

## Challenges

**Easy:**
- Change the score font to `'bold 80px monospace'` for an even larger display
- Make the death panel border a different color
- Show the best score on the idle screen too

**Medium:**
- Add a "New Best!" celebration when the player beats their high score
- Animate the score number counting up when a gate is passed
- Add a subtle screen shake on death

**Hard:**
- Add a combo multiplier that increases when gates are passed quickly
- Implement difficulty scaling (faster rotation, tighter spacing as score increases)
- Add particle confetti when passing through a gate at high speed

---

## What You Learned

- HUD rendering in screen space on top of a camera-translated game world
- Rounded rectangle panels with `ctx.roundRect`
- localStorage persistence with try/catch safety
- State reset via `Object.assign` to preserve system references
- Full game loop: idle -> playing -> dead -> idle

---

## Final Architecture

```
ColorSwitchEngine (game loop, state owner)
  ├── InputSystem        (keyboard + touch -> bounce / phase transitions)
  ├── PhysicsSystem      (gravity, velocity, camera, fall death)
  ├── GateSystem         (spawn, rotate, cleanup gates + switchers)
  ├── CollisionSystem    (ring/bar/square checks, color switcher pickup, scoring)
  ├── GameRenderer       (background, gates, switchers, ball, death flash)
  └── HUDRenderer        (score, idle overlay, death overlay)
```

Each system reads and writes the shared `ColorSwitchState` object. The engine calls them in order: input (via events), physics, gates, collision, then render. This separation keeps each file focused and testable.

**Congratulations -- you have built Color Switch from scratch!**
