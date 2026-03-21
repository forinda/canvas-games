# Step 1: Bird & Gravity

**Goal:** Draw a bird on a sky background, apply gravity to pull it down, and let the player flap upward with Space or click. Stop the bird at the ground.

**Time:** ~15 minutes

---

## What You'll Build

Foundation elements:
- **Sky gradient background**: Light blue sky
- **Ground strip**: Scrolling earthy floor at the bottom
- **Bird sprite**: Yellow circle with eye, beak, and wing drawn via Canvas
- **Gravity physics**: Bird accelerates downward each frame
- **Flap input**: Space or click sets bird velocity upward
- **Ground collision**: Bird stops when it hits the floor

---

## Concepts

- **Gravity Accumulation**: `velocity += gravity * dt` each frame --- velocity grows over time, pulling the bird faster
- **Impulse Jump**: On flap, set velocity to a negative constant --- instant upward burst, then gravity takes over
- **Terminal Velocity**: Cap downward speed so the bird doesn't fall unreasonably fast
- **Delta-Time Physics**: Same `position += velocity * dt` pattern from Pong, applied vertically

---

## Code

### 1. Create Types

**File:** `src/contexts/canvas2d/games/flappy-bird/types.ts`

Define the bird, game state, and physics constants:

```typescript
export interface Bird {
  x: number;
  y: number;
  velocity: number;
  rotation: number;
  radius: number;
  wingAngle: number;
  wingDir: number;
}

export interface Pipe {
  x: number;
  gapY: number;
  width: number;
  scored: boolean;
}

export type Phase = 'idle' | 'playing' | 'dead';

export interface FlappyState {
  bird: Bird;
  pipes: Pipe[];
  phase: Phase;
  score: number;
  highScore: number;
  canvasW: number;
  canvasH: number;
  groundY: number;
  pipeTimer: number;
  flashTimer: number;
  backgroundOffset: number;
  groundOffset: number;
}

// Physics
export const GRAVITY = 0.0015;
export const FLAP_FORCE = -0.42;
export const TERMINAL_VELOCITY = 0.7;

// Pipes (used in later steps)
export const PIPE_SPEED = 0.18;
export const GAP_SIZE = 140;
export const PIPE_WIDTH = 60;
export const PIPE_SPAWN_INTERVAL = 1800;
export const PIPE_MIN_TOP = 80;

// Bird
export const BIRD_RADIUS = 16;
export const BIRD_X_RATIO = 0.22;

// Ground
export const GROUND_HEIGHT = 60;

// Storage
export const HS_KEY = 'flappy_bird_highscore';
```

The `Bird` type has a `velocity` field instead of separate `vx`/`vy` like Pong's ball. The bird only moves vertically --- its horizontal position stays fixed at 22% from the left edge. Gravity and flaps both act on this single velocity value.

---

### 2. Create the Game Renderer

**File:** `src/contexts/canvas2d/games/flappy-bird/renderers/GameRenderer.ts`

Draw sky, ground, and bird:

```typescript
import type { FlappyState } from '../types';
import { GROUND_HEIGHT } from '../types';

export class GameRenderer {
  render(ctx: CanvasRenderingContext2D, state: FlappyState): void {
    const { canvasW, canvasH } = state;

    // Sky gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, canvasH);
    skyGrad.addColorStop(0, '#4dc9f6');
    skyGrad.addColorStop(0.7, '#87ceeb');
    skyGrad.addColorStop(1, '#b0e0e6');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, canvasW, canvasH);

    // Ground
    this.drawGround(ctx, state);

    // Bird
    this.drawBird(ctx, state);
  }

  private drawGround(ctx: CanvasRenderingContext2D, state: FlappyState): void {
    const gY = state.groundY;
    const gH = GROUND_HEIGHT;

    // Ground fill
    const groundGrad = ctx.createLinearGradient(0, gY, 0, gY + gH);
    groundGrad.addColorStop(0, '#ded895');
    groundGrad.addColorStop(0.15, '#d2b04c');
    groundGrad.addColorStop(1, '#8b6914');
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, gY, state.canvasW, gH);

    // Grass strip on top
    ctx.fillStyle = '#5cbf2a';
    ctx.fillRect(0, gY, state.canvasW, 6);

    // Scrolling ground detail lines
    ctx.strokeStyle = 'rgba(139, 105, 20, 0.3)';
    ctx.lineWidth = 1;
    const offset = state.groundOffset % 40;
    for (let x = -offset; x < state.canvasW + 40; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, gY + 15);
      ctx.lineTo(x + 20, gY + gH - 10);
      ctx.stroke();
    }
  }

  private drawBird(ctx: CanvasRenderingContext2D, state: FlappyState): void {
    const bird = state.bird;

    ctx.save();
    ctx.translate(bird.x, bird.y);
    // No rotation yet --- we add that in Step 4

    const r = bird.radius;

    // Body
    ctx.fillStyle = '#f1c40f';
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#d4a017';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Belly highlight
    ctx.fillStyle = '#f9e076';
    ctx.beginPath();
    ctx.ellipse(2, 3, r * 0.55, r * 0.45, 0.2, 0, Math.PI * 2);
    ctx.fill();

    // Eye (white)
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(r * 0.4, -r * 0.25, r * 0.32, 0, Math.PI * 2);
    ctx.fill();

    // Pupil
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(r * 0.52, -r * 0.22, r * 0.16, 0, Math.PI * 2);
    ctx.fill();

    // Beak
    ctx.fillStyle = '#e74c3c';
    ctx.beginPath();
    ctx.moveTo(r * 0.7, -r * 0.05);
    ctx.lineTo(r * 1.4, r * 0.1);
    ctx.lineTo(r * 0.7, r * 0.3);
    ctx.closePath();
    ctx.fill();

    // Wing (static for now)
    ctx.fillStyle = '#e8b710';
    ctx.beginPath();
    ctx.ellipse(-r * 0.3, r * 0.1, r * 0.55, r * 0.3, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#c9990a';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.restore();
  }
}
```

The bird is drawn entirely from primitives: a yellow circle body, white eye with dark pupil, red triangular beak, and an elliptical wing. All coordinates are relative to the bird center, so we only need `translate()` to position it.

---

### 3. Create the Input System

**File:** `src/contexts/canvas2d/games/flappy-bird/systems/InputSystem.ts`

Listen for Space key and mouse/touch clicks:

```typescript
import type { FlappyState } from '../types';
import { FLAP_FORCE } from '../types';

export class InputSystem {
  private state: FlappyState;
  private canvas: HTMLCanvasElement;
  private onExit: () => void;

  private keyHandler: (e: KeyboardEvent) => void;
  private clickHandler: (e: MouseEvent | TouchEvent) => void;

  constructor(
    state: FlappyState,
    canvas: HTMLCanvasElement,
    onExit: () => void,
  ) {
    this.state = state;
    this.canvas = canvas;
    this.onExit = onExit;

    this.keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        this.onExit();
        return;
      }
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        this.handleFlap();
      }
    };

    this.clickHandler = (e: MouseEvent | TouchEvent) => {
      e.preventDefault();
      this.handleFlap();
    };
  }

  private handleFlap(): void {
    const s = this.state;

    if (s.phase === 'idle') {
      // First flap starts the game
      s.phase = 'playing';
      s.bird.velocity = FLAP_FORCE;
      return;
    }

    if (s.phase === 'playing') {
      // Set velocity to flap force (instant upward impulse)
      s.bird.velocity = FLAP_FORCE;
    }
  }

  attach(): void {
    window.addEventListener('keydown', this.keyHandler);
    this.canvas.addEventListener('mousedown', this.clickHandler);
    this.canvas.addEventListener('touchstart', this.clickHandler, {
      passive: false,
    });
  }

  detach(): void {
    window.removeEventListener('keydown', this.keyHandler);
    this.canvas.removeEventListener('mousedown', this.clickHandler);
    this.canvas.removeEventListener('touchstart', this.clickHandler);
  }
}
```

Notice `handleFlap` sets `velocity = FLAP_FORCE` (a negative number, since negative Y means up in Canvas). It does not _add_ to velocity --- it _replaces_ it. This makes each flap feel consistent regardless of how fast the bird is currently falling.

---

### 4. Create the Bird System

**File:** `src/contexts/canvas2d/games/flappy-bird/systems/BirdSystem.ts`

Apply gravity and update position:

```typescript
import type { FlappyState } from '../types';
import { GRAVITY, TERMINAL_VELOCITY } from '../types';

export class BirdSystem {
  update(state: FlappyState, dt: number): void {
    if (state.phase !== 'playing') return;

    const bird = state.bird;

    // Apply gravity: velocity increases each frame
    bird.velocity += GRAVITY * dt;
    if (bird.velocity > TERMINAL_VELOCITY) {
      bird.velocity = TERMINAL_VELOCITY;
    }

    // Update position
    bird.y += bird.velocity * dt;

    // Ground collision: stop at floor
    if (bird.y + bird.radius >= state.groundY) {
      bird.y = state.groundY - bird.radius;
      bird.velocity = 0;
      state.phase = 'dead';
    }

    // Ceiling: stop bird from flying off the top
    if (bird.y - bird.radius <= 0) {
      bird.y = bird.radius;
      bird.velocity = 0;
    }
  }
}
```

The gravity loop works exactly like real physics: velocity accumulates each frame (`velocity += gravity * dt`), then position updates from velocity (`y += velocity * dt`). When the bird hits the ground, we snap it to the surface and switch phase to `'dead'`.

---

### 5. Create the Game Engine

**File:** `src/contexts/canvas2d/games/flappy-bird/FlappyEngine.ts`

Wire state, systems, and the game loop together:

```typescript
import type { FlappyState } from './types';
import {
  BIRD_RADIUS,
  BIRD_X_RATIO,
  GROUND_HEIGHT,
  PIPE_SPEED,
} from './types';
import { InputSystem } from './systems/InputSystem';
import { BirdSystem } from './systems/BirdSystem';
import { GameRenderer } from './renderers/GameRenderer';

export class FlappyEngine {
  private ctx: CanvasRenderingContext2D;
  private state: FlappyState;
  private running = false;
  private rafId = 0;
  private lastTime = 0;

  private inputSystem: InputSystem;
  private birdSystem: BirdSystem;
  private gameRenderer: GameRenderer;
  private resizeHandler: () => void;

  constructor(canvas: HTMLCanvasElement, onExit: () => void) {
    this.ctx = canvas.getContext('2d')!;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const W = canvas.width;
    const H = canvas.height;
    const groundY = H - GROUND_HEIGHT;

    this.state = {
      bird: {
        x: W * BIRD_X_RATIO,
        y: H * 0.42,
        velocity: 0,
        rotation: 0,
        radius: BIRD_RADIUS,
        wingAngle: 0,
        wingDir: 1,
      },
      pipes: [],
      phase: 'playing', // Start playing immediately for now
      score: 0,
      highScore: 0,
      canvasW: W,
      canvasH: H,
      groundY,
      pipeTimer: 0,
      flashTimer: 0,
      backgroundOffset: 0,
      groundOffset: 0,
    };

    // Systems
    this.birdSystem = new BirdSystem();
    this.gameRenderer = new GameRenderer();
    this.inputSystem = new InputSystem(this.state, canvas, onExit);

    // Resize
    this.resizeHandler = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      this.state.canvasW = canvas.width;
      this.state.canvasH = canvas.height;
      this.state.groundY = canvas.height - GROUND_HEIGHT;
      this.state.bird.x = canvas.width * BIRD_X_RATIO;
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

    // Scroll ground while playing
    if (s.phase === 'playing') {
      s.groundOffset += PIPE_SPEED * dt;
    }

    this.birdSystem.update(s, dt);
  }

  private render(): void {
    this.ctx.clearRect(0, 0, this.state.canvasW, this.state.canvasH);
    this.gameRenderer.render(this.ctx, this.state);
  }
}
```

We set `phase: 'playing'` immediately so the bird starts falling right away. In Step 5 we will add a proper idle screen. The delta-time cap `Math.min(dt, 32)` prevents physics explosions when the tab is backgrounded and gets a huge time delta on return.

---

### 6. Create Platform Adapter & Export

**File:** `src/contexts/canvas2d/games/flappy-bird/adapters/PlatformAdapter.ts`

```typescript
import type { GameInstance } from '@core/GameInterface';
import { FlappyEngine } from '../FlappyEngine';

export class PlatformAdapter implements GameInstance {
  private engine: FlappyEngine;

  constructor(canvas: HTMLCanvasElement, onExit: () => void) {
    this.engine = new FlappyEngine(canvas, onExit);
  }

  start(): void {
    this.engine.start();
  }

  destroy(): void {
    this.engine.destroy();
  }
}
```

**File:** `src/contexts/canvas2d/games/flappy-bird/index.ts`

```typescript
import type { GameDefinition } from '@core/GameInterface';
import { PlatformAdapter } from './adapters/PlatformAdapter';

export const FlappyBirdGame: GameDefinition = {
  id: 'flappy-bird',
  category: 'arcade' as const,
  name: 'Flappy Bird',
  description: 'Tap to flap through the pipes!',
  icon: '🐦',
  color: '#f1c40f',
  help: {
    goal: 'Fly through pipe gaps without hitting them or the ground.',
    controls: [
      { key: 'Space / Click', action: 'Flap upward' },
      { key: 'ESC', action: 'Exit to menu' },
    ],
    tips: [
      'Tap rhythmically for better control',
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
2. **Navigate:** Select "Flappy Bird"
3. **Observe:**
   - Blue sky gradient with brown/green ground at bottom
   - Yellow bird at 22% from left edge
   - Bird immediately begins falling (gravity)
   - Press Space or click --- bird jumps upward
   - Bird falls faster and faster between flaps (gravity accumulation)
   - Bird stops at the ground (phase switches to dead)
   - Ground has a grass strip and scrolling detail lines

---

## Challenges

**Easy:**
- Change `GRAVITY` to `0.003` and observe how much faster the bird falls
- Change `FLAP_FORCE` to `-0.6` for a stronger jump
- Make the bird larger (radius 24)

**Medium:**
- Add a second bird sprite at a different X position
- Draw clouds in the background (hint: white ellipses at various Y positions)
- Add a trail of small circles behind the bird as it moves

**Hard:**
- Implement a "double jump" --- allow flapping twice before requiring the bird to fall below a threshold
- Add particle effects when the bird hits the ground

---

## What You Learned

- Gravity accumulation: `velocity += gravity * dt` produces natural falling
- Impulse jump: replacing velocity with a constant creates snappy flaps
- Terminal velocity cap prevents unreasonable fall speeds
- Canvas `translate()` for positioning sprites drawn at the origin
- Drawing complex shapes from primitives (arcs, ellipses, triangles)

**Next:** Pipes and scrolling!
