# Step 3: Collision & Scoring

**Goal:** Detect when the bird hits a pipe or the ground, end the game on collision, and award a point each time the bird passes through a gap.

**Time:** ~15 minutes

---

## What You'll Build

Building on Step 2:
- **Pipe collision detection**: Bird circle vs pipe rectangles (top and bottom)
- **Ground collision**: Bird touches the ground = game over
- **Ceiling bounce**: Bird stops at the top edge without dying
- **Score tracking**: +1 when the bird clears a pipe
- **Score display**: Large white number at the top center of the screen
- **Dead phase**: Everything stops scrolling on death

---

## Concepts

- **Circle-Rectangle Collision**: Check horizontal overlap first (cheap), then vertical gap check
- **Scored Flag**: Each pipe has a `scored` boolean so we only count it once
- **Phase Gating**: Systems check `state.phase` and skip updates when the game is over

---

## Code

### 1. Create the Collision System

**File:** `src/games/flappy-bird/systems/CollisionSystem.ts`

Check ground and pipe collisions, trigger death:

```typescript
import type { FlappyState } from '../types';
import { GAP_SIZE } from '../types';

export class CollisionSystem {
  update(state: FlappyState, _dt: number): void {
    if (state.phase !== 'playing') return;

    const bird = state.bird;
    const r = bird.radius;

    // Ground collision
    if (bird.y + r >= state.groundY) {
      bird.y = state.groundY - r;
      this.die(state);
      return;
    }

    // Ceiling collision (don't kill, just stop)
    if (bird.y - r <= 0) {
      bird.y = r;
      bird.velocity = 0;
    }

    // Pipe collision
    for (const pipe of state.pipes) {
      const pipeLeft = pipe.x;
      const pipeRight = pipe.x + pipe.width;

      // Step 1: Horizontal overlap?
      // Bird circle extends from (bird.x - r) to (bird.x + r)
      if (bird.x + r > pipeLeft && bird.x - r < pipeRight) {
        // Step 2: Is the bird inside the gap?
        const gapTop = pipe.gapY - GAP_SIZE / 2;
        const gapBottom = pipe.gapY + GAP_SIZE / 2;

        // If bird is above gap top or below gap bottom, it hit the pipe
        if (bird.y - r < gapTop || bird.y + r > gapBottom) {
          this.die(state);
          return;
        }
      }
    }
  }

  private die(state: FlappyState): void {
    state.phase = 'dead';
  }
}
```

The collision check works in two stages:

1. **Horizontal overlap**: Is the bird's bounding circle overlapping the pipe's X range? This is a simple range comparison. Most frames, most pipes fail this check, so we skip the more expensive vertical test.

2. **Vertical gap test**: If there is horizontal overlap, check whether the bird is fully inside the gap. The gap spans from `gapY - GAP_SIZE/2` to `gapY + GAP_SIZE/2`. If any part of the bird circle extends above the gap top or below the gap bottom, it is hitting pipe.

This is not pixel-perfect (we treat the bird as a circle but test against rectangle edges), but it feels fair in practice because the bird sprite fits tightly in its radius.

---

### 2. Add Scoring to the Pipe System

**File:** `src/games/flappy-bird/systems/PipeSystem.ts`

Add the scoring check inside the existing `update` method:

```typescript
import type { FlappyState, Pipe } from '../types';
import {
  PIPE_SPEED,
  GAP_SIZE,
  PIPE_WIDTH,
  PIPE_SPAWN_INTERVAL,
  PIPE_MIN_TOP,
} from '../types';

export class PipeSystem {
  update(state: FlappyState, dt: number): void {
    if (state.phase !== 'playing') return;

    // Accumulate spawn timer
    state.pipeTimer += dt;

    // Spawn new pipe when timer fires
    if (state.pipeTimer >= PIPE_SPAWN_INTERVAL) {
      state.pipeTimer = 0;
      this.spawnPipe(state);
    }

    // Move all pipes left
    for (const pipe of state.pipes) {
      pipe.x -= PIPE_SPEED * dt;
    }

    // Score: bird has passed the pipe's right edge
    for (const pipe of state.pipes) {
      if (!pipe.scored && pipe.x + pipe.width < state.bird.x) {
        pipe.scored = true;
        state.score++;
      }
    }

    // Remove pipes that scrolled off-screen
    state.pipes = state.pipes.filter((p) => p.x + p.width > -10);
  }

  private spawnPipe(state: FlappyState): void {
    const minGapY = PIPE_MIN_TOP + GAP_SIZE / 2;
    const maxGapY = state.groundY - PIPE_MIN_TOP - GAP_SIZE;
    const gapY = minGapY + Math.random() * (maxGapY - minGapY);

    const pipe: Pipe = {
      x: state.canvasW + 10,
      gapY,
      width: PIPE_WIDTH,
      scored: false,
    };

    state.pipes.push(pipe);
  }
}
```

The scoring condition is `pipe.x + pipe.width < state.bird.x` --- the pipe's right edge has scrolled past the bird's X position. The `scored` flag prevents counting the same pipe on subsequent frames.

---

### 3. Create the HUD Renderer

**File:** `src/games/flappy-bird/renderers/HUDRenderer.ts`

Draw the score during gameplay:

```typescript
import type { FlappyState } from '../types';

export class HUDRenderer {
  render(ctx: CanvasRenderingContext2D, state: FlappyState): void {
    if (state.phase === 'playing') {
      this.drawScore(ctx, state);
    } else if (state.phase === 'dead') {
      this.drawScore(ctx, state);
      this.drawDeathText(ctx, state);
    }
  }

  private drawScore(ctx: CanvasRenderingContext2D, state: FlappyState): void {
    const text = String(state.score);
    const x = state.canvasW / 2;
    const y = 80;

    ctx.font = 'bold 64px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Black outline for readability against sky
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 6;
    ctx.lineJoin = 'round';
    ctx.strokeText(text, x, y);

    // White fill
    ctx.fillStyle = '#fff';
    ctx.fillText(text, x, y);
  }

  private drawDeathText(
    ctx: CanvasRenderingContext2D,
    state: FlappyState,
  ): void {
    const cx = state.canvasW / 2;
    const cy = state.canvasH / 2;

    // Dim overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.fillRect(0, 0, state.canvasW, state.canvasH);

    // "Game Over" text
    ctx.font = 'bold 48px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 5;
    ctx.lineJoin = 'round';
    ctx.strokeText('Game Over', cx, cy - 30);
    ctx.fillStyle = '#fff';
    ctx.fillText('Game Over', cx, cy - 30);

    // Final score
    ctx.font = 'bold 28px Arial, sans-serif';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    ctx.strokeText(`Score: ${state.score}`, cx, cy + 20);
    ctx.fillStyle = '#fff';
    ctx.fillText(`Score: ${state.score}`, cx, cy + 20);
  }
}
```

The score uses a stroke-then-fill technique: a thick black `strokeText` drawn behind a white `fillText`. This ensures the number is readable against both the bright sky and any pipes behind it.

---

### 4. Update the Bird System

**File:** `src/games/flappy-bird/systems/BirdSystem.ts`

Move the ground/ceiling collision into CollisionSystem (remove from BirdSystem so there is one source of truth):

```typescript
import type { FlappyState } from '../types';
import { GRAVITY, TERMINAL_VELOCITY } from '../types';

export class BirdSystem {
  update(state: FlappyState, dt: number): void {
    if (state.phase !== 'playing') return;

    const bird = state.bird;

    // Apply gravity
    bird.velocity += GRAVITY * dt;
    if (bird.velocity > TERMINAL_VELOCITY) {
      bird.velocity = TERMINAL_VELOCITY;
    }

    // Update position
    bird.y += bird.velocity * dt;
  }
}
```

BirdSystem now only handles physics (gravity + position). All collision logic lives in CollisionSystem, which runs after BirdSystem in the update loop. This separation makes each system easier to reason about.

---

### 5. Update the Game Engine

**File:** `src/games/flappy-bird/FlappyEngine.ts`

Add CollisionSystem and HUDRenderer:

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
import { PipeSystem } from './systems/PipeSystem';
import { CollisionSystem } from './systems/CollisionSystem';
import { GameRenderer } from './renderers/GameRenderer';
import { HUDRenderer } from './renderers/HUDRenderer';

export class FlappyEngine {
  private ctx: CanvasRenderingContext2D;
  private state: FlappyState;
  private running = false;
  private rafId = 0;
  private lastTime = 0;

  private inputSystem: InputSystem;
  private birdSystem: BirdSystem;
  private pipeSystem: PipeSystem;
  private collisionSystem: CollisionSystem;
  private gameRenderer: GameRenderer;
  private hudRenderer: HUDRenderer;
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
      phase: 'playing',
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
    this.pipeSystem = new PipeSystem();
    this.collisionSystem = new CollisionSystem();
    this.gameRenderer = new GameRenderer();
    this.hudRenderer = new HUDRenderer();
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

    // Scroll background and ground while alive
    if (s.phase !== 'dead') {
      s.backgroundOffset += PIPE_SPEED * dt * 0.5;
      s.groundOffset += PIPE_SPEED * dt;
    }

    // Update systems in order: physics, then pipes, then collision
    this.birdSystem.update(s, dt);
    this.pipeSystem.update(s, dt);
    this.collisionSystem.update(s, dt);
  }

  private render(): void {
    this.ctx.clearRect(0, 0, this.state.canvasW, this.state.canvasH);
    this.gameRenderer.render(this.ctx, this.state);
    this.hudRenderer.render(this.ctx, this.state);
  }
}
```

System update order matters: BirdSystem moves the bird, PipeSystem moves pipes and checks scoring, then CollisionSystem tests for death. If CollisionSystem sets `phase = 'dead'`, all three systems will skip their work next frame because they all gate on `phase === 'playing'`.

---

## Test It

1. **Run:** `npm run dev`
2. **Navigate:** Select "Flappy Bird"
3. **Observe:**
   - Score "0" appears at top center
   - Flap through a pipe gap --- score increments to 1
   - Each pipe you pass adds another point
   - Fly into a pipe --- game freezes, "Game Over" overlay appears
   - Hit the ground --- same death result
   - Touching the ceiling does not kill (bird just stops, velocity resets)
   - Scrolling stops on death (pipes and ground freeze)

---

## Challenges

**Easy:**
- Make the gap larger (`GAP_SIZE = 180`) and confirm the game feels easier
- Change the score font size to 80px
- Change the death overlay color from black to dark red

**Medium:**
- Add a score sound (play an `AudioContext` beep when `pipe.scored` flips to true)
- Show the pipe number inside each gap (draw the pipe index in the gap center)
- Add a "grace period" --- ignore collisions for the first 500ms of gameplay

**Hard:**
- Implement "near miss" detection: if the bird passes within 5px of a pipe edge without dying, flash the score yellow briefly
- Add screen shake when the bird dies (offset the entire canvas draw by a random small amount for a few frames)

---

## What You Learned

- Circle-vs-rectangle collision: horizontal overlap first, then vertical gap check
- One-time scoring with a boolean flag per object
- Stroke-then-fill text rendering for readability on busy backgrounds
- System update ordering: physics before collision before rendering
- Phase gating: systems check game state and skip work when not active

**Next:** Bird animation and visual polish!
