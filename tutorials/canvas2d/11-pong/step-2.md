# Step 2: Paddle System & Player Input

**Goal:** Add paddles to the court and implement keyboard controls for player movement.

**Time:** ~20 minutes

---

## What You'll Build

Paddle mechanics:
- **Two paddles**: Left (player) and right (opponent placeholder)
- **Keyboard controls**: W/S for up/down movement
- **Velocity-based movement**: Smooth acceleration
- **Boundary clamping**: Paddles stay within screen
- **Visual effects**: Rounded corners with cyan glow

---

## Concepts

- **Event Listeners**: Track pressed keys in a Set
- **Velocity Application**: `position += velocity * deltaTime`
- **Boundary Constraints**: `Math.max(min, Math.min(max, value))`
- **Input Buffering**: Held keys apply continuous force

---

## Code

### 1. Update Game Renderer with Paddles

**File:** `src/contexts/canvas2d/games/pong/renderers/GameRenderer.ts`

Add paddle rendering:

```typescript
import type { PongState, Paddle } from '../types';

export class GameRenderer {
  render(ctx: CanvasRenderingContext2D, state: PongState): void {
    const { canvasW, canvasH } = state;

    // Dark background
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, canvasW, canvasH);

    // Center line (dashed)
    this.drawCenterLine(ctx, canvasW, canvasH);

    // Paddles
    this.drawPaddle(ctx, state.leftPaddle);
    this.drawPaddle(ctx, state.rightPaddle);

    // Ball trail
    this.drawBallTrail(ctx, state.ball);

    // Ball
    this.drawBall(ctx, state.ball);
  }

  private drawCenterLine(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 10]);

    ctx.beginPath();
    ctx.moveTo(w / 2, 0);
    ctx.lineTo(w / 2, h);
    ctx.stroke();

    ctx.setLineDash([]);
  }

  private drawPaddle(ctx: CanvasRenderingContext2D, paddle: Paddle): void {
    ctx.shadowColor = '#26c6da';
    ctx.shadowBlur = 12;
    ctx.fillStyle = '#26c6da';

    // Rounded rectangle
    ctx.beginPath();
    ctx.roundRect(paddle.x, paddle.y, paddle.w, paddle.h, 4);
    ctx.fill();

    ctx.shadowBlur = 0;
  }

  private drawBallTrail(ctx: CanvasRenderingContext2D, ball: Ball): void {
    for (const t of ball.trail) {
      ctx.globalAlpha = t.alpha;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(t.x, t.y, ball.radius * 0.8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  private drawBall(ctx: CanvasRenderingContext2D, ball: Ball): void {
    ctx.shadowColor = '#fff';
    ctx.shadowBlur = 16;
    ctx.fillStyle = '#fff';

    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
  }
}
```

**Visual details:**
- Cyan color `#26c6da`: Classic arcade aesthetic
- Glow effect: 12px shadow blur
- Rounded corners: 4px radius for modern look

---

### 2. Create Input System

**File:** `src/contexts/canvas2d/games/pong/systems/InputSystem.ts`

Handle keyboard input:

```typescript
import type { PongState } from '../types';
import { PADDLE_SPEED } from '../types';

export class InputSystem {
  private pressedKeys: Set<string> = new Set();
  private onExit: () => void;

  constructor(onExit: () => void) {
    this.onExit = onExit;
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
  }

  attach(): void {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
  }

  detach(): void {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
  }

  private handleKeyDown(e: KeyboardEvent): void {
    const key = e.key.toLowerCase();
    this.pressedKeys.add(key);

    // Exit on ESC
    if (key === 'escape') {
      this.onExit();
    }

    // Prevent default for game keys
    if (['w', 's', 'arrowup', 'arrowdown', ' ', 'p'].includes(key)) {
      e.preventDefault();
    }
  }

  private handleKeyUp(e: KeyboardEvent): void {
    const key = e.key.toLowerCase();
    this.pressedKeys.delete(key);
  }

  applyInput(state: PongState): void {
    if (state.phase !== 'playing') return;

    // Left paddle (W/S keys)
    if (this.pressedKeys.has('w')) {
      state.leftPaddle.dy = -PADDLE_SPEED;
    } else if (this.pressedKeys.has('s')) {
      state.leftPaddle.dy = PADDLE_SPEED;
    } else {
      state.leftPaddle.dy = 0;
    }

    // Right paddle (Arrow keys) - for testing, will be AI later
    if (this.pressedKeys.has('arrowup')) {
      state.rightPaddle.dy = -PADDLE_SPEED;
    } else if (this.pressedKeys.has('arrowdown')) {
      state.rightPaddle.dy = PADDLE_SPEED;
    } else {
      state.rightPaddle.dy = 0;
    }
  }
}
```

**Input pattern:**
- `Set<string>`: Efficient key tracking
- Key down adds, key up removes
- `applyInput()` reads current state each frame
- Continuous held keys = continuous velocity

---

### 3. Update Physics System with Paddle Movement

**File:** `src/contexts/canvas2d/games/pong/systems/PhysicsSystem.ts`

Add paddle physics:

```typescript
import type { PongState, Paddle } from '../types';

export class PhysicsSystem {
  update(state: PongState, dt: number): void {
    if (state.phase !== 'playing') return;

    const dtSec = dt / 1000;

    this.updatePaddles(state, dtSec);
    this.updateBall(state, dtSec);
    this.updateBallTrail(state.ball, dt);
  }

  private updatePaddles(state: PongState, dtSec: number): void {
    this.movePaddle(state.leftPaddle, state.canvasH, dtSec);
    this.movePaddle(state.rightPaddle, state.canvasH, dtSec);
  }

  private movePaddle(paddle: Paddle, canvasH: number, dtSec: number): void {
    // Apply velocity
    paddle.y += paddle.dy * dtSec;

    // Clamp to boundaries
    paddle.y = Math.max(0, Math.min(canvasH - paddle.h, paddle.y));
  }

  private updateBall(state: PongState, dtSec: number): void {
    const { ball, canvasH } = state;

    // Move ball
    ball.x += ball.vx * dtSec;
    ball.y += ball.vy * dtSec;

    // Wall collision (top/bottom)
    if (ball.y - ball.radius <= 0) {
      ball.y = ball.radius;
      ball.vy = Math.abs(ball.vy);
    } else if (ball.y + ball.radius >= canvasH) {
      ball.y = canvasH - ball.radius;
      ball.vy = -Math.abs(ball.vy);
    }

    // Side exits
    if (ball.x < 0 || ball.x > state.canvasW) {
      this.resetBall(state);
    }
  }

  private updateBallTrail(ball: Ball, dt: number): void {
    ball.trail.push({
      x: ball.x,
      y: ball.y,
      alpha: 0.6,
    });

    for (const t of ball.trail) {
      t.alpha -= 0.06;
    }

    ball.trail = ball.trail.filter(t => t.alpha > 0);

    if (ball.trail.length > 20) {
      ball.trail.shift();
    }
  }

  private resetBall(state: PongState): void {
    const { ball, canvasW, canvasH } = state;

    ball.x = canvasW / 2;
    ball.y = canvasH / 2;

    const angle = (Math.random() - 0.5) * (Math.PI / 3);
    const direction = Math.random() < 0.5 ? -1 : 1;

    ball.speed = 360;
    ball.vx = direction * Math.cos(angle) * ball.speed;
    ball.vy = Math.sin(angle) * ball.speed;

    ball.trail = [];
  }
}
```

**Clamping pattern:**
```typescript
Math.max(minY, Math.min(maxY, currentY))
```
Ensures paddle never goes above 0 or below `canvasHeight - paddleHeight`

---

### 4. Update Game Engine

**File:** `src/contexts/canvas2d/games/pong/PongEngine.ts`

Add input system:

```typescript
import type { PongState } from './types';
import {
  PADDLE_WIDTH,
  PADDLE_HEIGHT,
  PADDLE_OFFSET,
  BALL_RADIUS,
  BALL_INITIAL_SPEED,
} from './types';
import { GameRenderer } from './renderers/GameRenderer';
import { PhysicsSystem } from './systems/PhysicsSystem';
import { InputSystem } from './systems/InputSystem';

export class PongEngine {
  private ctx: CanvasRenderingContext2D;
  private state: PongState;
  private running: boolean;
  private rafId: number;
  private lastTime: number;

  private gameRenderer: GameRenderer;
  private physicsSystem: PhysicsSystem;
  private inputSystem: InputSystem;

  constructor(canvas: HTMLCanvasElement, onExit: () => void) {
    this.ctx = canvas.getContext('2d')!;
    this.running = false;
    this.rafId = 0;
    this.lastTime = 0;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const W = canvas.width;
    const H = canvas.height;

    this.state = {
      phase: 'playing',
      mode: 'ai',
      leftPaddle: {
        x: PADDLE_OFFSET,
        y: H / 2 - PADDLE_HEIGHT / 2,
        w: PADDLE_WIDTH,
        h: PADDLE_HEIGHT,
        dy: 0,
      },
      rightPaddle: {
        x: W - PADDLE_OFFSET - PADDLE_WIDTH,
        y: H / 2 - PADDLE_HEIGHT / 2,
        w: PADDLE_WIDTH,
        h: PADDLE_HEIGHT,
        dy: 0,
      },
      ball: {
        x: W / 2,
        y: H / 2,
        vx: BALL_INITIAL_SPEED,
        vy: 0,
        radius: BALL_RADIUS,
        speed: BALL_INITIAL_SPEED,
        trail: [],
      },
      leftScore: 0,
      rightScore: 0,
      winner: null,
      canvasW: W,
      canvasH: H,
      rallyHits: 0,
      showHelp: false,
    };

    this.gameRenderer = new GameRenderer();
    this.physicsSystem = new PhysicsSystem();
    this.inputSystem = new InputSystem(onExit);

    this.inputSystem.attach();
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
  }

  private loop = (): void => {
    if (!this.running) return;

    const now = performance.now();
    const dt = now - this.lastTime;
    this.lastTime = now;

    this.update(dt);
    this.render();

    this.rafId = requestAnimationFrame(this.loop);
  };

  private update(dt: number): void {
    this.inputSystem.applyInput(this.state);
    this.physicsSystem.update(this.state, dt);
  }

  private render(): void {
    this.gameRenderer.render(this.ctx, this.state);
  }
}
```

**Update order:** Input → Physics → Render

---

## Test It

1. **Run:** `npm run dev`
2. **Navigate:** Select "Pong"
3. **Controls:**
   - Press **W** to move left paddle up
   - Press **S** to move left paddle down
   - Press **Arrow Up** to move right paddle up (for testing)
   - Press **Arrow Down** to move right paddle down
4. **Movement:**
   - Paddles move smoothly at 420 px/s
   - Paddles stop at screen edges
   - Releasing key stops paddle immediately
5. **Visual:**
   - Cyan paddles with glow effect
   - Rounded corners
   - Ball still bouncing and moving

---

## Challenges

**Easy:**
- Change paddle speed to 600 px/s
- Make paddles taller (150px)
- Change paddle color to green

**Medium:**
- Add acceleration/deceleration (smooth start/stop)
- Mouse control (paddle follows mouse Y position)
- Add "boost" mode (hold Shift for 2x speed)

**Hard:**
- Analog input (paddle speed scales with how long key is held)
- Gamepad support (joystick control)
- Touch controls for mobile (drag paddle)

---

## What You Learned

✅ Event listener attachment and cleanup  
✅ Input buffering with Set data structure  
✅ Velocity-based movement  
✅ Boundary clamping with Math.max/min  
✅ Canvas roundRect for rounded corners  
✅ Shadow effects for visual polish

**Next:** Ball-paddle collision and deflection!
