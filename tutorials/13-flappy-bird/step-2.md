# Step 2: Pipes & Scrolling

**Goal:** Generate pipes that scroll from right to left with random gap positions. Add background scrolling and decorative clouds for depth.

**Time:** ~15 minutes

---

## What You'll Build

Building on Step 1:
- **Pipe pairs**: Top and bottom pipes with a gap between them
- **Pipe caps**: Wider lip at the pipe opening (classic Flappy Bird look)
- **Random gap placement**: Each pipe pair gets a random vertical gap position
- **Timed spawning**: New pipe every 1.8 seconds
- **Off-screen cleanup**: Remove pipes that scroll past the left edge
- **Scrolling clouds**: Slow-moving background layer for parallax depth
- **Scrolling ground**: Ground texture moves with the pipes

---

## Concepts

- **Object Pooling Pattern**: Spawn pipes into an array, remove when off-screen --- keeps memory stable
- **Timer-Based Spawning**: Accumulate `dt` into a timer, spawn when threshold reached
- **Parallax Scrolling**: Background moves slower than foreground for depth illusion
- **Gap Constraints**: Clamp random gap Y so pipes never spawn too close to ceiling or ground

---

## Code

### 1. Create the Pipe System

**File:** `src/games/flappy-bird/systems/PipeSystem.ts`

Spawn, move, and recycle pipes:

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

    // Remove pipes that scrolled off-screen
    state.pipes = state.pipes.filter((p) => p.x + p.width > -10);
  }

  private spawnPipe(state: FlappyState): void {
    // Calculate valid range for gap center
    const minGapY = PIPE_MIN_TOP + GAP_SIZE / 2;
    const maxGapY = state.groundY - PIPE_MIN_TOP - GAP_SIZE;
    const gapY = minGapY + Math.random() * (maxGapY - minGapY);

    const pipe: Pipe = {
      x: state.canvasW + 10,       // Start just off right edge
      gapY,                         // Center of the gap
      width: PIPE_WIDTH,
      scored: false,                // Used for scoring in Step 3
    };

    state.pipes.push(pipe);
  }
}
```

Each pipe stores one value, `gapY`, which is the vertical center of the gap. The top pipe extends from `y=0` down to `gapY - GAP_SIZE/2`. The bottom pipe extends from `gapY + GAP_SIZE/2` down to the ground. This is simpler than storing four separate coordinates.

The `PIPE_MIN_TOP` constant (80px) ensures gaps never appear flush against the ceiling or ground --- there is always at least 80px of pipe visible above/below the gap.

---

### 2. Update the Game Renderer

**File:** `src/games/flappy-bird/renderers/GameRenderer.ts`

Add cloud and pipe drawing methods:

```typescript
import type { FlappyState } from '../types';
import { GAP_SIZE, GROUND_HEIGHT } from '../types';

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

    // Scrolling clouds (behind pipes)
    this.drawClouds(ctx, state);

    // Pipes
    this.drawPipes(ctx, state);

    // Ground (on top of pipes)
    this.drawGround(ctx, state);

    // Bird (on top of everything)
    this.drawBird(ctx, state);
  }

  private drawClouds(ctx: CanvasRenderingContext2D, state: FlappyState): void {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    const offset = (state.backgroundOffset * 0.3) % (state.canvasW + 200);

    for (let i = 0; i < 4; i++) {
      const cx = ((i * 300 + 100 - offset) % (state.canvasW + 200)) - 100;
      const cy = 60 + i * 40;

      // Each cloud is three overlapping ellipses
      ctx.beginPath();
      ctx.ellipse(cx, cy, 60, 25, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(cx + 40, cy - 5, 40, 20, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(cx - 30, cy + 3, 35, 18, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawPipes(ctx: CanvasRenderingContext2D, state: FlappyState): void {
    for (const pipe of state.pipes) {
      const gapTop = pipe.gapY - GAP_SIZE / 2;
      const gapBottom = pipe.gapY + GAP_SIZE / 2;

      // Pipe body gradient (dark edges, bright center)
      const pipeGrad = ctx.createLinearGradient(
        pipe.x, 0, pipe.x + pipe.width, 0,
      );
      pipeGrad.addColorStop(0, '#3a8d3a');
      pipeGrad.addColorStop(0.3, '#5cbf2a');
      pipeGrad.addColorStop(0.7, '#5cbf2a');
      pipeGrad.addColorStop(1, '#3a8d3a');

      // --- Top pipe ---
      ctx.fillStyle = pipeGrad;
      ctx.fillRect(pipe.x, 0, pipe.width, gapTop);

      // Top pipe cap (wider lip)
      const capOverhang = 4;
      const capHeight = 26;
      ctx.fillStyle = '#4aa82e';
      ctx.fillRect(
        pipe.x - capOverhang,
        gapTop - capHeight,
        pipe.width + capOverhang * 2,
        capHeight,
      );
      ctx.strokeStyle = '#2d6e1e';
      ctx.lineWidth = 2;
      ctx.strokeRect(
        pipe.x - capOverhang,
        gapTop - capHeight,
        pipe.width + capOverhang * 2,
        capHeight,
      );

      // --- Bottom pipe ---
      ctx.fillStyle = pipeGrad;
      ctx.fillRect(pipe.x, gapBottom, pipe.width, state.groundY - gapBottom);

      // Bottom pipe cap
      ctx.fillStyle = '#4aa82e';
      ctx.fillRect(
        pipe.x - capOverhang,
        gapBottom,
        pipe.width + capOverhang * 2,
        capHeight,
      );
      ctx.strokeStyle = '#2d6e1e';
      ctx.lineWidth = 2;
      ctx.strokeRect(
        pipe.x - capOverhang,
        gapBottom,
        pipe.width + capOverhang * 2,
        capHeight,
      );

      // Pipe body outlines
      ctx.strokeStyle = '#2d6e1e';
      ctx.lineWidth = 2;
      ctx.strokeRect(pipe.x, 0, pipe.width, gapTop);
      ctx.strokeRect(pipe.x, gapBottom, pipe.width, state.groundY - gapBottom);
    }
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

**Drawing order matters.** Clouds go behind pipes, pipes behind the ground, and the bird on top of everything. The ground is drawn over the bottom portion of pipes so pipes appear to emerge from behind the earth.

The pipe caps use `capOverhang = 4` to extend 4px past each side of the pipe body, creating the classic wider-lip look. The gradient runs left-to-right across the pipe body --- dark edges with a bright center --- giving a cylindrical appearance.

---

### 3. Update the Game Engine

**File:** `src/games/flappy-bird/FlappyEngine.ts`

Add the PipeSystem and background scrolling:

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
import { GameRenderer } from './renderers/GameRenderer';

export class FlappyEngine {
  private ctx: CanvasRenderingContext2D;
  private state: FlappyState;
  private running = false;
  private rafId = 0;
  private lastTime = 0;

  private inputSystem: InputSystem;
  private birdSystem: BirdSystem;
  private pipeSystem: PipeSystem;
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

    // Scroll background and ground while alive
    if (s.phase !== 'dead') {
      s.backgroundOffset += PIPE_SPEED * dt * 0.5;  // Clouds scroll at half speed
      s.groundOffset += PIPE_SPEED * dt;              // Ground matches pipe speed
    }

    this.birdSystem.update(s, dt);
    this.pipeSystem.update(s, dt);
  }

  private render(): void {
    this.ctx.clearRect(0, 0, this.state.canvasW, this.state.canvasH);
    this.gameRenderer.render(this.ctx, this.state);
  }
}
```

Two scrolling speeds create a simple parallax effect: clouds move at `PIPE_SPEED * 0.5` while the ground and pipes share the full `PIPE_SPEED`. The player perceives depth even though everything is flat 2D.

---

## Test It

1. **Run:** `npm run dev`
2. **Navigate:** Select "Flappy Bird"
3. **Observe:**
   - Pipes appear from the right edge every ~1.8 seconds
   - Each pipe pair has a random gap height
   - Pipes scroll steadily to the left
   - Pipes have green gradient bodies with wider caps at the opening
   - Clouds drift slowly in the background (parallax)
   - Ground texture scrolls in sync with the pipes
   - Bird falls through pipes (no collision yet --- that is Step 3)
   - Pipes disappear after scrolling past the left edge

---

## Challenges

**Easy:**
- Change `GAP_SIZE` to 200 for easier gaps
- Change `PIPE_SPEED` to 0.3 for faster scrolling
- Change pipe color from green to blue (`#3a6daa` / `#5cb0ff`)

**Medium:**
- Vary the gap size per pipe (random between 120 and 180)
- Add a slight vertical oscillation to pipes as they scroll
- Draw pipe shadows on the ground

**Hard:**
- Make pipes speed up over time (increase `PIPE_SPEED` every 10 seconds)
- Add a second layer of distant pipes scrolling at half speed (more parallax)

---

## What You Learned

- Timer-based spawning: accumulate `dt`, spawn when threshold reached
- Object lifecycle: spawn off-screen right, scroll left, remove off-screen left
- Random range clamping: `min + Math.random() * (max - min)` within safe bounds
- Parallax scrolling: background layers at different speeds create depth
- Drawing order: background, clouds, pipes, ground, bird

**Next:** Collision detection and scoring!
