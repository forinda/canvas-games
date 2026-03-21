# Step 4: Bird Animation & Polish

**Goal:** Add bird rotation based on velocity, animate the wing flapping, and flash the screen white on death for impact.

**Time:** ~15 minutes

---

## What You'll Build

Building on Step 3:
- **Velocity-based rotation**: Bird tilts nose-up when rising, nose-down when falling
- **Smooth rotation interpolation**: Rotation eases toward the target angle (no snapping)
- **Wing flap animation**: Wing oscillates up and down continuously
- **Death flash**: Brief white screen flash when the bird dies
- **Flash timer countdown**: Flash fades out over 150ms

---

## Concepts

- **Velocity-to-Angle Mapping**: Convert the velocity range (negative=up, positive=down) to a rotation range (-30 to +90 degrees)
- **Interpolation Smoothing**: `rotation += (target - rotation) * 0.1` each frame --- exponential ease-toward
- **Oscillating Animation**: Wing angle bounces between -1 and +1 using a direction toggle
- **Screen Flash**: Full-screen semi-transparent rect with fading alpha

---

## Code

### 1. Update the Bird System

**File:** `src/contexts/canvas2d/games/flappy-bird/systems/BirdSystem.ts`

Add rotation mapping, smooth interpolation, and wing animation:

```typescript
import type { FlappyState } from '../types';
import { GRAVITY, TERMINAL_VELOCITY } from '../types';

export class BirdSystem {
  update(state: FlappyState, dt: number): void {
    if (state.phase !== 'playing') {
      // Animate wing even when not playing (visible on idle/dead)
      this.animateWing(state, dt);
      return;
    }

    const bird = state.bird;

    // Apply gravity
    bird.velocity += GRAVITY * dt;
    if (bird.velocity > TERMINAL_VELOCITY) {
      bird.velocity = TERMINAL_VELOCITY;
    }

    // Update position
    bird.y += bird.velocity * dt;

    // Rotation: map velocity to target angle, then interpolate
    const targetRotation = this.velocityToRotation(bird.velocity);
    bird.rotation += (targetRotation - bird.rotation) * 0.1;

    // Wing animation
    this.animateWing(state, dt);
  }

  private velocityToRotation(velocity: number): number {
    // Velocity ranges from FLAP_FORCE (-0.42) to TERMINAL_VELOCITY (0.7)
    // Map to rotation: nose-up (-30deg) when rising, nose-down (90deg) when falling
    if (velocity < 0) {
      // Going up: tilt nose upward (negative angle)
      // Max upward tilt is -30 degrees
      return Math.max(velocity * 70, -30) * (Math.PI / 180);
    }
    // Going down: tilt nose downward (positive angle)
    // Max downward tilt is 90 degrees
    return Math.min(velocity * 130, 90) * (Math.PI / 180);
  }

  private animateWing(state: FlappyState, _dt: number): void {
    const bird = state.bird;
    bird.wingAngle += bird.wingDir * 0.15;
    if (bird.wingAngle > 1) bird.wingDir = -1;
    if (bird.wingAngle < -1) bird.wingDir = 1;
  }
}
```

The `velocityToRotation` method uses two different multipliers:
- **Rising** (`velocity < 0`): `velocity * 70` gives modest upward tilt, capped at -30 degrees. This prevents the bird from spinning wildly on flap.
- **Falling** (`velocity > 0`): `velocity * 130` gives aggressive downward rotation, capped at 90 degrees (straight down). Falling feels dramatic.

The `bird.rotation += (target - rotation) * 0.1` line is an exponential ease. Each frame, rotation moves 10% of the remaining distance toward the target. This creates smooth, organic tilting --- no sudden snaps.

Wing animation is simpler: `wingAngle` bounces between -1 and +1. When it hits a boundary, `wingDir` flips. The renderer uses this value to offset the wing position vertically.

---

### 2. Update the Game Renderer

**File:** `src/contexts/canvas2d/games/flappy-bird/renderers/GameRenderer.ts`

Apply bird rotation and wing offset, add death flash:

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

    // Scrolling clouds
    this.drawClouds(ctx, state);

    // Pipes
    this.drawPipes(ctx, state);

    // Ground
    this.drawGround(ctx, state);

    // Bird
    this.drawBird(ctx, state);

    // Death flash overlay
    if (state.flashTimer > 0) {
      const alpha = state.flashTimer / 150;
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.7})`;
      ctx.fillRect(0, 0, canvasW, canvasH);
    }
  }

  private drawClouds(ctx: CanvasRenderingContext2D, state: FlappyState): void {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    const offset = (state.backgroundOffset * 0.3) % (state.canvasW + 200);

    for (let i = 0; i < 4; i++) {
      const cx = ((i * 300 + 100 - offset) % (state.canvasW + 200)) - 100;
      const cy = 60 + i * 40;
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

      // Pipe body gradient
      const pipeGrad = ctx.createLinearGradient(
        pipe.x, 0, pipe.x + pipe.width, 0,
      );
      pipeGrad.addColorStop(0, '#3a8d3a');
      pipeGrad.addColorStop(0.3, '#5cbf2a');
      pipeGrad.addColorStop(0.7, '#5cbf2a');
      pipeGrad.addColorStop(1, '#3a8d3a');

      // Top pipe
      ctx.fillStyle = pipeGrad;
      ctx.fillRect(pipe.x, 0, pipe.width, gapTop);

      // Top pipe cap
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

      // Bottom pipe
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

    const groundGrad = ctx.createLinearGradient(0, gY, 0, gY + gH);
    groundGrad.addColorStop(0, '#ded895');
    groundGrad.addColorStop(0.15, '#d2b04c');
    groundGrad.addColorStop(1, '#8b6914');
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, gY, state.canvasW, gH);

    ctx.fillStyle = '#5cbf2a';
    ctx.fillRect(0, gY, state.canvasW, 6);

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
    ctx.rotate(bird.rotation);  // Now using velocity-based rotation

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

    // Wing (now animated with wingAngle)
    const wingY = r * 0.1 + bird.wingAngle * 4;
    ctx.fillStyle = '#e8b710';
    ctx.beginPath();
    ctx.ellipse(-r * 0.3, wingY, r * 0.55, r * 0.3, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#c9990a';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.restore();
  }
}
```

Two key changes in `drawBird`:

1. **`ctx.rotate(bird.rotation)`** --- the bird now tilts based on velocity. When `save/translate/rotate` are combined, all subsequent drawing commands happen in the rotated coordinate space. The beak, eye, wing, and body all rotate together.

2. **`wingY = r * 0.1 + bird.wingAngle * 4`** --- the wing's Y offset oscillates by +/-4 pixels, creating a flapping motion. The `wingAngle` value bounces between -1 and +1, so the wing moves between `r*0.1 - 4` and `r*0.1 + 4`.

The death flash is a full-screen white rectangle with fading alpha: `alpha = flashTimer / 150` starts at ~1.0 and drops to 0 as `flashTimer` counts down. The `* 0.7` ensures it never goes fully opaque (the game remains slightly visible underneath).

---

### 3. Update the Collision System

**File:** `src/contexts/canvas2d/games/flappy-bird/systems/CollisionSystem.ts`

Set the flash timer on death:

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

    // Ceiling collision
    if (bird.y - r <= 0) {
      bird.y = r;
      bird.velocity = 0;
    }

    // Pipe collision
    for (const pipe of state.pipes) {
      const pipeLeft = pipe.x;
      const pipeRight = pipe.x + pipe.width;

      if (bird.x + r > pipeLeft && bird.x - r < pipeRight) {
        const gapTop = pipe.gapY - GAP_SIZE / 2;
        const gapBottom = pipe.gapY + GAP_SIZE / 2;

        if (bird.y - r < gapTop || bird.y + r > gapBottom) {
          this.die(state);
          return;
        }
      }
    }
  }

  private die(state: FlappyState): void {
    state.phase = 'dead';
    state.flashTimer = 150; // 150ms white flash
  }
}
```

---

### 4. Update the Game Engine

**File:** `src/contexts/canvas2d/games/flappy-bird/FlappyEngine.ts`

Add flash timer countdown in the update loop:

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

    // Countdown flash timer
    if (s.flashTimer > 0) {
      s.flashTimer = Math.max(0, s.flashTimer - dt);
    }

    // Update systems
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

The flash timer counts down every frame: `flashTimer = Math.max(0, flashTimer - dt)`. It runs independently of game phase --- even though systems stop updating when dead, the flash still fades. This pattern (timer-based effects decoupled from game logic) is useful for any temporary visual effect.

---

## Test It

1. **Run:** `npm run dev`
2. **Navigate:** Select "Flappy Bird"
3. **Observe:**
   - **Flap upward** --- bird tilts nose-up (roughly -30 degrees)
   - **Stop flapping** --- bird gradually tilts nose-down as it falls
   - Rotation is smooth, not jerky (interpolation)
   - Wing flaps continuously (oscillates up and down)
   - **Hit a pipe** --- screen flashes white briefly, then shows Game Over
   - **Hit the ground** --- same white flash
   - Flash fades smoothly over ~150ms

---

## Challenges

**Easy:**
- Change the max upward tilt to -45 degrees (modify the `-30` cap)
- Make the flash red instead of white
- Slow down wing animation (change `0.15` to `0.05`)

**Medium:**
- Add a second flash pulse (flash, fade, flash again) by using a more complex timer
- Make the bird's eye widen (larger pupil) when falling fast
- Stop wing animation when the bird is dead (check phase in `animateWing`)

**Hard:**
- Add screen shake: on death, offset all rendering by a random `(-3, 3)` for 200ms
- Add particle burst on death: spawn 10 small yellow circles that scatter outward with physics
- Make the bird tumble (continuous fast rotation) after dying before hitting the ground

---

## What You Learned

- Velocity-to-rotation mapping with different multipliers for rising vs falling
- Exponential interpolation (`+= (target - current) * factor`) for smooth easing
- Oscillating animation with a direction toggle (`wingDir` flips at boundaries)
- Full-screen flash effect with alpha fade using a countdown timer
- Timer-based visual effects that run independently of game logic

**Next:** Start screen, high scores, and the complete HUD!
