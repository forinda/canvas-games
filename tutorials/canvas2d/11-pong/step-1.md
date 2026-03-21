# Step 1: Core Court & Ball Physics

**Goal:** Set up the Pong court and implement basic ball movement with wall bouncing.

**Time:** ~20 minutes

---

## What You'll Build

Foundation elements:
- **Dark court background**: Classic Pong aesthetic
- **Center line**: Dashed vertical divider
- **Moving ball**: White circle with velocity
- **Wall bouncing**: Ball reflects off top/bottom edges
- **Delta-time physics**: Frame-rate independent movement

---

## Concepts

- **Time-Delta Physics**: `position += velocity * deltaTime`
- **Wall Reflection**: Reverse velocity on collision
- **Canvas Coordinates**: Origin at top-left
- **Constant Velocity**: Speed × direction

---

## Code

### 1. Create Types

**File:** `src/contexts/canvas2d/games/pong/types.ts`

Define game constants and state:

```typescript
export interface Paddle {
  x: number;
  y: number;
  w: number;
  h: number;
  dy: number; // vertical velocity
}

export interface Ball {
  x: number;
  y: number;
  vx: number; // horizontal velocity
  vy: number; // vertical velocity
  radius: number;
  speed: number;
  trail: Array<{ x: number; y: number; alpha: number }>;
}

export type GameMode = 'ai' | '2p';
export type GamePhase = 'mode-select' | 'start' | 'playing' | 'paused' | 'win';
export type Winner = 'left' | 'right' | null;

export interface PongState {
  phase: GamePhase;
  mode: GameMode;
  leftPaddle: Paddle;
  rightPaddle: Paddle;
  ball: Ball;
  leftScore: number;
  rightScore: number;
  winner: Winner;
  canvasW: number;
  canvasH: number;
  rallyHits: number;
  showHelp: boolean;
}

// Constants
export const PADDLE_WIDTH = 14;
export const PADDLE_HEIGHT = 100;
export const PADDLE_SPEED = 420; // px/s
export const PADDLE_OFFSET = 30; // px from edge

export const BALL_RADIUS = 8;
export const BALL_INITIAL_SPEED = 360; // px/s
export const BALL_SPEED_INCREMENT = 20; // per paddle hit
export const BALL_MAX_SPEED = 800;
export const MAX_BOUNCE_ANGLE = Math.PI / 3; // ±60°

export const WINNING_SCORE = 11;
```

---

### 2. Create Game Renderer

**File:** `src/contexts/canvas2d/games/pong/renderers/GameRenderer.ts`

Draw court, center line, and ball:

```typescript
import type { PongState } from '../types';

export class GameRenderer {
  render(ctx: CanvasRenderingContext2D, state: PongState): void {
    const { canvasW, canvasH } = state;

    // Dark background
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, canvasW, canvasH);

    // Center line (dashed)
    this.drawCenterLine(ctx, canvasW, canvasH);

    // Ball trail
    this.drawBallTrail(ctx, state.ball);

    // Ball
    this.drawBall(ctx, state.ball);
  }

  private drawCenterLine(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 10]); // 10px dash, 10px gap

    ctx.beginPath();
    ctx.moveTo(w / 2, 0);
    ctx.lineTo(w / 2, h);
    ctx.stroke();

    ctx.setLineDash([]); // Reset dash pattern
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
- Dashed center line: Classic Pong aesthetic
- Ball trail: Fading particles behind ball (motion blur effect)
- Glow effect: Shadow blur creates luminous look

---

### 3. Create Physics System

**File:** `src/contexts/canvas2d/games/pong/systems/PhysicsSystem.ts`

Handle ball movement and wall bouncing:

```typescript
import type { PongState } from '../types';

export class PhysicsSystem {
  update(state: PongState, dt: number): void {
    if (state.phase !== 'playing') return;

    const dtSec = dt / 1000;

    this.updateBall(state, dtSec);
    this.updateBallTrail(state.ball, dt);
  }

  private updateBall(state: PongState, dtSec: number): void {
    const { ball, canvasH } = state;

    // Move ball
    ball.x += ball.vx * dtSec;
    ball.y += ball.vy * dtSec;

    // Wall collision (top/bottom)
    if (ball.y - ball.radius <= 0) {
      // Hit top wall
      ball.y = ball.radius;
      ball.vy = Math.abs(ball.vy); // Bounce down
    } else if (ball.y + ball.radius >= canvasH) {
      // Hit bottom wall
      ball.y = canvasH - ball.radius;
      ball.vy = -Math.abs(ball.vy); // Bounce up
    }

    // Side exits (will add scoring later)
    if (ball.x < 0 || ball.x > state.canvasW) {
      this.resetBall(state);
    }
  }

  private updateBallTrail(ball: Ball, dt: number): void {
    // Add current position to trail
    ball.trail.push({
      x: ball.x,
      y: ball.y,
      alpha: 0.6,
    });

    // Fade trail particles
    for (const t of ball.trail) {
      t.alpha -= 0.06;
    }

    // Remove invisible particles
    ball.trail = ball.trail.filter(t => t.alpha > 0);

    // Limit trail length (performance)
    if (ball.trail.length > 20) {
      ball.trail.shift();
    }
  }

  private resetBall(state: PongState): void {
    const { ball, canvasW, canvasH } = state;

    // Center position
    ball.x = canvasW / 2;
    ball.y = canvasH / 2;

    // Random angle (-30° to +30°)
    const angle = (Math.random() - 0.5) * (Math.PI / 3);

    // Random direction (left or right)
    const direction = Math.random() < 0.5 ? -1 : 1;

    // Reset speed
    ball.speed = 360;

    // Set velocity
    ball.vx = direction * Math.cos(angle) * ball.speed;
    ball.vy = Math.sin(angle) * ball.speed;

    // Clear trail
    ball.trail = [];
  }
}
```

**Physics patterns:**
- Delta-time: `position += velocity * deltaTime` (frame-rate independent)
- Wall bounce: Reverse velocity component perpendicular to wall
- Ball reset: Random angle and direction for variety

---

### 4. Create Game Engine

**File:** `src/contexts/canvas2d/games/pong/PongEngine.ts`

Initialize state and game loop:

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

export class PongEngine {
  private ctx: CanvasRenderingContext2D;
  private state: PongState;
  private running: boolean;
  private rafId: number;
  private lastTime: number;

  private gameRenderer: GameRenderer;
  private physicsSystem: PhysicsSystem;

  constructor(canvas: HTMLCanvasElement, onExit: () => void) {
    this.ctx = canvas.getContext('2d')!;
    this.running = false;
    this.rafId = 0;
    this.lastTime = 0;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const W = canvas.width;
    const H = canvas.height;

    // Initialize state
    this.state = {
      phase: 'playing', // Start in playing mode for now
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
  }

  start(): void {
    this.running = true;
    this.lastTime = performance.now();
    this.loop();
  }

  destroy(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
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
    this.physicsSystem.update(this.state, dt);
  }

  private render(): void {
    this.gameRenderer.render(this.ctx, this.state);
  }
}
```

**Key patterns:**
- Full-screen canvas
- 60fps RAF loop
- Delta-time between frames
- Systems update state, renderer displays it

---

### 5. Create Platform Adapter

**File:** `src/contexts/canvas2d/games/pong/adapters/PlatformAdapter.ts`

```typescript
import type { GameInstance } from '@core/GameInterface';
import { PongEngine } from '../PongEngine';

export class PlatformAdapter implements GameInstance {
  private engine: PongEngine;

  constructor(canvas: HTMLCanvasElement, onExit: () => void) {
    this.engine = new PongEngine(canvas, onExit);
  }

  start(): void {
    this.engine.start();
  }

  destroy(): void {
    this.engine.destroy();
  }
}
```

---

### 6. Update Game Export

**File:** `src/contexts/canvas2d/games/pong/index.ts`

```typescript
import type { GameDefinition } from '@core/GameInterface';
import { PlatformAdapter } from './adapters/PlatformAdapter';

export const PongGame: GameDefinition = {
  id: 'pong',
  name: 'Pong',
  description: 'Classic arcade tennis game',
  genre: 'Sports',
  difficulty: 'Easy',
  controls: ['keyboard'],
  HelpComponent: () => {
    return `
Controls:
- W/S: Move left paddle
- P: Pause
- ESC: Exit

Rules:
- Hit the ball with your paddle
- First to 11 points wins
    `.trim();
  },
  instanceFactory: (canvas, onExit) => new PlatformAdapter(canvas, onExit),
};
```

---

## Test It

1. **Run:** `npm run dev`
2. **Navigate:** Select "Pong"
3. **Observe:**
   - Dark background with dashed center line
   - White ball moving from center
   - Ball bounces off top and bottom walls
   - Ball resets to center when exiting left/right
   - Fading trail effect behind ball
   - Smooth motion at 60fps

---

## Challenges

**Easy:**
- Change ball speed to 500 px/s
- Make ball larger (12px radius)
- Change background color to dark green

**Medium:**
- Add multiple balls (3 at once)
- Make walls "sticky" (ball slows before bouncing)
- Add sound effect on wall bounce

**Hard:**
- Gravity effect (ball pulled downward)
- Curved trajectory based on spin
- Screen shake on wall impact

---

## What You Learned

✅ Delta-time physics for frame-rate independence  
✅ 2D velocity vectors (vx, vy)  
✅ Wall collision detection and reflection  
✅ Particle trail effects with alpha fading  
✅ Canvas rendering with glow effects  
✅ Random angle generation for variety

**Next:** Paddle system and player input!
