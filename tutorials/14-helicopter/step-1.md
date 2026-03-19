# Step 1: Helicopter & Controls

**Goal:** Draw a helicopter with an animated rotor, and implement hold-to-rise / release-to-fall physics.

**Time:** ~15 minutes

---

## What You'll Build

Foundation elements:
- **Helicopter body**: Green ellipse with cockpit window, tail, and skids
- **Animated rotor**: Spinning blades with perspective illusion
- **Hold to rise**: Space or mouse/touch applies upward lift
- **Release to fall**: Gravity pulls the helicopter down
- **Velocity clamping**: Prevent runaway speed in either direction
- **Idle bobbing**: Gentle sine-wave hover before the game starts

---

## Concepts

- **Continuous thrust**: Unlike Flappy Bird's tap-to-flap, the helicopter uses sustained input -- hold to rise, release to fall
- **Acceleration vs velocity**: Gravity and lift modify velocity each frame; velocity modifies position
- **Rotor animation**: Incrementing an angle and using `Math.sin` / `Math.cos` to fake 3D blade rotation
- **Canvas transforms**: `translate` + `rotate` to draw the helicopter tilted based on its velocity

---

## Code

### 1. Create Types

**File:** `src/games/helicopter/types.ts`

Define all the constants and state interfaces we will need across the project. We define everything up front so later steps just import what they need.

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

A few things to notice:

- **GRAVITY is positive** (pushes `y` downward, since canvas y increases downward) and **LIFT is negative** (pushes upward). Both are small because they are multiplied by `dt` in milliseconds.
- `MIN_VELOCITY` is negative (upward cap) and `MAX_VELOCITY` is positive (downward cap).
- We declare cave, obstacle, and scoring types now even though we won't use them until later steps. This keeps the types file stable.

---

### 2. Create the Input System

**File:** `src/games/helicopter/systems/InputSystem.ts`

The input model is the core difference from Flappy Bird. Instead of discrete taps, we track whether the player is **holding** the button.

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

Key points:

- **`handlePress`** transitions from `idle` to `playing` on first press, sets `holding = true` during play, or triggers a restart after death.
- **`handleRelease`** simply clears the `holding` flag. Gravity takes over.
- We listen to both keyboard (Space) and mouse/touch so it works on mobile too.
- `{ passive: false }` on touch events lets us call `preventDefault()` to stop the page from scrolling.

---

### 3. Create the Physics System

**File:** `src/games/helicopter/systems/PhysicsSystem.ts`

This system applies gravity or lift to the helicopter's velocity each frame, then moves it.

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

The physics loop is simple:

1. If the player is holding, add `LIFT` (negative -- upward) per millisecond.
2. Otherwise add `GRAVITY` (positive -- downward) per millisecond.
3. Clamp so the helicopter cannot accelerate infinitely.
4. Move `y` by `velocity * dt`.
5. Spin the rotor.

During `idle` phase, the helicopter bobs gently using a sine wave -- a nice touch that shows the game is alive before you start.

---

### 4. Create the Game Renderer

**File:** `src/games/helicopter/renderers/GameRenderer.ts`

Draw the background and helicopter. We will add cave and obstacle rendering in later steps.

```typescript
import type { HelicopterState } from '../types';

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

    // Helicopter
    this.drawHelicopter(ctx, state);
  }

  private drawHelicopter(
    ctx: CanvasRenderingContext2D,
    state: HelicopterState,
  ): void {
    const heli = state.helicopter;

    ctx.save();
    ctx.translate(heli.x, heli.y);

    // Tilt based on velocity — nose up when rising, nose down when falling
    const tilt = heli.velocity * 15;
    ctx.rotate(tilt);

    const w = heli.width;
    const h = heli.height;

    // Body — green ellipse
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

    // Tail boom
    ctx.fillStyle = '#4caf50';
    ctx.beginPath();
    ctx.moveTo(-w / 2, -h * 0.1);
    ctx.lineTo(-w * 0.85, -h * 0.08);
    ctx.lineTo(-w * 0.85, h * 0.08);
    ctx.lineTo(-w / 2, h * 0.1);
    ctx.closePath();
    ctx.fill();

    // Tail rotor (small vertical spinner)
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

    // Main rotor — two blades with perspective squash
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

    // Landing skids
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

The rotor animation deserves a closer look:

- `rotorAngle` increments every frame. We pass it through `Math.sin` and `Math.cos` to get two blade lengths.
- `Math.abs(Math.sin(angle))` oscillates between 0 and 1 -- when one blade is at full extension the other is edge-on.
- This creates the illusion of blades spinning in 3D even though we are drawing flat lines.

The velocity-based tilt (`heli.velocity * 15`) rotates the entire helicopter drawing. Rising tilts the nose up; falling tilts it down. The factor of 15 converts the small velocity value into a visible angle in radians.

---

### 5. Create the HUD Renderer

**File:** `src/games/helicopter/renderers/HUDRenderer.ts`

For this step, the HUD just shows the idle overlay with a title and start prompt.

```typescript
import type { HelicopterState } from '../types';

export class HUDRenderer {
  render(ctx: CanvasRenderingContext2D, state: HelicopterState): void {
    const { phase } = state;

    if (phase === 'idle') {
      this.drawIdleOverlay(ctx, state);
    }
  }

  private drawIdleOverlay(
    ctx: CanvasRenderingContext2D,
    state: HelicopterState,
  ): void {
    const cx = state.canvasW / 2;
    const cy = state.canvasH * 0.3;

    // Title
    ctx.font = 'bold 48px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 5;
    ctx.lineJoin = 'round';
    ctx.strokeText('Helicopter', cx, cy);
    ctx.fillStyle = '#66bb6a';
    ctx.fillText('Helicopter', cx, cy);

    // Pulsing instruction
    const alpha = 0.5 + 0.5 * Math.sin(performance.now() * 0.004);
    ctx.globalAlpha = alpha;
    ctx.font = 'bold 20px monospace';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    ctx.strokeText('Hold Space or Click to Fly', cx, state.canvasH * 0.6);
    ctx.fillStyle = '#fff';
    ctx.fillText('Hold Space or Click to Fly', cx, state.canvasH * 0.6);
    ctx.globalAlpha = 1;
  }
}
```

---

### 6. Create the Engine

**File:** `src/games/helicopter/HelicopterEngine.ts`

Wire everything together with a standard RAF game loop.

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
    this.gameRenderer = new GameRenderer();
    this.hudRenderer = new HUDRenderer();

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

Notice `Math.min(now - this.lastTime, 32)` -- this caps delta-time at 32ms. If the tab is backgrounded and comes back with a huge gap, we don't let the helicopter teleport through the cave.

---

### 7. Create the Platform Adapter and Export

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
3. **Observe:**
   - Dark gradient background fills the screen
   - Green helicopter bobs gently at center-left (idle animation)
   - "Helicopter" title and pulsing "Hold Space or Click to Fly" text
   - Hold Space -- helicopter rises, rotor spins, nose tilts up
   - Release -- helicopter falls under gravity, nose tilts down
   - Rotor blades appear to spin in 3D (perspective squash effect)
   - Smooth 60fps motion with delta-time physics

---

## Challenges

**Easy:**
- Change the helicopter color from green to blue
- Make the helicopter bigger (60x30)
- Adjust `GRAVITY` to 0.002 for heavier feel

**Medium:**
- Add exhaust particles behind the helicopter when thrusting
- Draw a second helicopter body style (boxy military look)
- Add a subtle engine hum sound while holding

**Hard:**
- Add inertia -- the helicopter keeps drifting slightly after release
- Implement a fuel gauge that depletes while holding
- Draw the helicopter using sprite sheet animation instead of vector shapes

---

## What You Learned

- Continuous hold-to-thrust input model (vs. Flappy Bird's tap)
- Acceleration-based physics: force changes velocity, velocity changes position
- Canvas `translate` + `rotate` for velocity-based tilt
- Rotor animation using sine/cosine perspective trick
- Delta-time capping to prevent physics explosions on tab-switch

**Next:** Procedural cave generation and scrolling!
