# Step 5: Start Screen, High Score & HUD

**Goal:** Add an idle start screen with bobbing bird, a tap-to-start flow, a game over score panel with high score tracking via localStorage, and restart support.

**Time:** ~15 minutes

---

## What You'll Build

The complete game, building on Step 4:
- **Idle phase**: Bird bobs up and down, title and pulsing "Tap to Start" text
- **Tap to start**: First flap transitions from idle to playing
- **Game over panel**: Golden bordered panel showing score and best
- **"NEW!" badge**: Appears when you beat your high score
- **localStorage persistence**: Best score survives page reload
- **Restart flow**: Tap during game over resets everything to idle
- **Pulsing restart text**: "Tap to Restart" pulses below the panel

---

## Concepts

- **State Machine**: Three phases (idle, playing, dead) with clear transitions
- **Idle Animation**: `Math.sin(time)` produces smooth bobbing without physics
- **Object.assign Reset**: Copy fresh state into the existing object so system references stay valid
- **localStorage**: Persist high score with try/catch for environments that block storage

---

## Code

### 1. Update the Input System

**File:** `src/contexts/canvas2d/games/flappy-bird/systems/InputSystem.ts`

Add restart callback and dead-phase handling:

```typescript
import type { FlappyState } from '../types';
import { FLAP_FORCE } from '../types';

export class InputSystem {
  private state: FlappyState;
  private canvas: HTMLCanvasElement;
  private onExit: () => void;
  private onRestart: () => void;

  private keyHandler: (e: KeyboardEvent) => void;
  private clickHandler: (e: MouseEvent | TouchEvent) => void;

  constructor(
    state: FlappyState,
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
      // First flap: start the game
      s.phase = 'playing';
      s.bird.velocity = FLAP_FORCE;
      return;
    }

    if (s.phase === 'playing') {
      // Normal flap
      s.bird.velocity = FLAP_FORCE;
      return;
    }

    if (s.phase === 'dead') {
      // Restart: engine resets state, phase goes back to idle
      this.onRestart();
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

The `handleFlap` method is now a three-way switch on phase. The `onRestart` callback tells the engine to reset state without creating new system instances. This keeps the InputSystem's reference to `this.state` valid across restarts.

---

### 2. Update the Bird System

**File:** `src/contexts/canvas2d/games/flappy-bird/systems/BirdSystem.ts`

Add idle bobbing animation:

```typescript
import type { FlappyState } from '../types';
import { GRAVITY, TERMINAL_VELOCITY } from '../types';

export class BirdSystem {
  update(state: FlappyState, dt: number): void {
    if (state.phase !== 'playing') {
      // Idle bobbing: smooth sine wave, no physics
      if (state.phase === 'idle') {
        state.bird.y =
          state.canvasH * 0.42 + Math.sin(performance.now() * 0.003) * 8;
        state.bird.rotation = 0;
      }
      // Animate wing even when idle or dead
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

    // Rotation
    const targetRotation = this.velocityToRotation(bird.velocity);
    bird.rotation += (targetRotation - bird.rotation) * 0.1;

    // Wing animation
    this.animateWing(state, dt);
  }

  private velocityToRotation(velocity: number): number {
    if (velocity < 0) {
      return Math.max(velocity * 70, -30) * (Math.PI / 180);
    }
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

During idle, the bird's Y position follows `canvasH * 0.42 + sin(time) * 8` --- an 8-pixel amplitude bob centered at 42% screen height. The `* 0.003` controls frequency (about one full cycle per 2 seconds). Rotation is forced to 0 so the bird faces forward. Wing animation runs in all phases so the bird always looks alive.

---

### 3. Update the Collision System

**File:** `src/contexts/canvas2d/games/flappy-bird/systems/CollisionSystem.ts`

Add high score update and localStorage persistence on death:

```typescript
import type { FlappyState } from '../types';
import { GAP_SIZE, HS_KEY } from '../types';

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
    state.flashTimer = 150;

    // Update high score
    if (state.score > state.highScore) {
      state.highScore = state.score;
      try {
        localStorage.setItem(HS_KEY, String(state.highScore));
      } catch {
        /* localStorage may be unavailable in some environments */
      }
    }
  }
}
```

The `try/catch` around `localStorage.setItem` handles incognito mode, full storage, and sandboxed iframes where storage operations throw. The high score is always kept in memory (`state.highScore`) regardless of whether persistence succeeds.

---

### 4. Update the HUD Renderer

**File:** `src/contexts/canvas2d/games/flappy-bird/renderers/HUDRenderer.ts`

Add idle overlay, game over panel with score/best, and new-best badge:

```typescript
import type { FlappyState } from '../types';

export class HUDRenderer {
  render(ctx: CanvasRenderingContext2D, state: FlappyState): void {
    const { phase } = state;

    if (phase === 'playing') {
      this.drawScore(ctx, state);
    } else if (phase === 'idle') {
      this.drawIdleOverlay(ctx, state);
    } else if (phase === 'dead') {
      this.drawScore(ctx, state);
      this.drawDeathOverlay(ctx, state);
    }
  }

  private drawScore(ctx: CanvasRenderingContext2D, state: FlappyState): void {
    const text = String(state.score);
    const x = state.canvasW / 2;
    const y = 80;

    ctx.font = 'bold 64px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Black outline
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 6;
    ctx.lineJoin = 'round';
    ctx.strokeText(text, x, y);

    // White fill
    ctx.fillStyle = '#fff';
    ctx.fillText(text, x, y);
  }

  private drawIdleOverlay(
    ctx: CanvasRenderingContext2D,
    state: FlappyState,
  ): void {
    const cx = state.canvasW / 2;
    const cy = state.canvasH * 0.28;

    // Title
    ctx.font = 'bold 48px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 5;
    ctx.lineJoin = 'round';
    ctx.strokeText('Flappy Bird', cx, cy);
    ctx.fillStyle = '#fff';
    ctx.fillText('Flappy Bird', cx, cy);

    // Pulsing instruction text
    const alpha = 0.5 + 0.5 * Math.sin(performance.now() * 0.004);
    ctx.globalAlpha = alpha;
    ctx.font = 'bold 22px Arial, sans-serif';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    ctx.strokeText('Tap or Press Space to Start', cx, state.canvasH * 0.62);
    ctx.fillStyle = '#fff';
    ctx.fillText('Tap or Press Space to Start', cx, state.canvasH * 0.62);
    ctx.globalAlpha = 1;

    // High score (if any)
    if (state.highScore > 0) {
      ctx.font = 'bold 18px Arial, sans-serif';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 3;
      ctx.strokeText(`Best: ${state.highScore}`, cx, state.canvasH * 0.68);
      ctx.fillStyle = '#f1c40f';
      ctx.fillText(`Best: ${state.highScore}`, cx, state.canvasH * 0.68);
    }
  }

  private drawDeathOverlay(
    ctx: CanvasRenderingContext2D,
    state: FlappyState,
  ): void {
    const cx = state.canvasW / 2;
    const cy = state.canvasH / 2;

    // Dim overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.fillRect(0, 0, state.canvasW, state.canvasH);

    // Score panel background
    const panelW = 240;
    const panelH = 180;
    const px = cx - panelW / 2;
    const py = cy - panelH / 2 - 10;

    // Outer border (golden)
    ctx.fillStyle = '#deb550';
    ctx.strokeStyle = '#8b6914';
    ctx.lineWidth = 4;
    this.roundRect(ctx, px, py, panelW, panelH, 12);
    ctx.fill();
    ctx.stroke();

    // Inner panel (darker gold)
    ctx.fillStyle = '#c9960a';
    this.roundRect(ctx, px + 12, py + 12, panelW - 24, panelH - 24, 6);
    ctx.fill();

    // "Game Over" text above panel
    ctx.font = 'bold 36px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 4;
    ctx.lineJoin = 'round';
    ctx.strokeText('Game Over', cx, py - 20);
    ctx.fillStyle = '#fff';
    ctx.fillText('Game Over', cx, py - 20);

    // Score
    ctx.font = 'bold 22px Arial, sans-serif';
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    ctx.strokeText(`Score: ${state.score}`, cx, cy - 20);
    ctx.fillText(`Score: ${state.score}`, cx, cy - 20);

    // Best
    ctx.strokeText(`Best: ${state.highScore}`, cx, cy + 15);
    ctx.fillStyle = '#f1c40f';
    ctx.fillText(`Best: ${state.highScore}`, cx, cy + 15);

    // "NEW!" badge when current score beats the record
    if (state.score > 0 && state.score >= state.highScore) {
      ctx.font = 'bold 14px Arial, sans-serif';
      ctx.fillStyle = '#e74c3c';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.strokeText('NEW!', cx + 70, cy + 15);
      ctx.fillText('NEW!', cx + 70, cy + 15);
    }

    // Pulsing restart instruction
    const alpha = 0.5 + 0.5 * Math.sin(performance.now() * 0.004);
    ctx.globalAlpha = alpha;
    ctx.font = 'bold 20px Arial, sans-serif';
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    ctx.strokeText('Tap to Restart', cx, cy + panelH / 2 + 20);
    ctx.fillText('Tap to Restart', cx, cy + panelH / 2 + 20);
    ctx.globalAlpha = 1;
  }

  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
  ): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
}
```

The `roundRect` helper draws a rounded rectangle path using four `quadraticCurveTo` calls (one per corner). Canvas does have a built-in `roundRect` method in newer browsers, but the manual version works everywhere.

The pulsing text effect uses `0.5 + 0.5 * Math.sin(time * 0.004)` --- this oscillates `globalAlpha` between 0 and 1 with a ~1.5 second period. The text fades in and out continuously, drawing the player's attention.

---

### 5. Update the Game Engine

**File:** `src/contexts/canvas2d/games/flappy-bird/FlappyEngine.ts`

Add idle phase, localStorage high score loading, restart logic, and pass `onRestart` to InputSystem:

```typescript
import type { FlappyState } from './types';
import {
  BIRD_RADIUS,
  BIRD_X_RATIO,
  GROUND_HEIGHT,
  HS_KEY,
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

    // Load persisted high score
    let hs = 0;
    try {
      hs = parseInt(localStorage.getItem(HS_KEY) ?? '0', 10) || 0;
    } catch {
      /* noop */
    }

    this.state = this.createInitialState(canvas.width, canvas.height, hs);

    // Systems
    this.birdSystem = new BirdSystem();
    this.pipeSystem = new PipeSystem();
    this.collisionSystem = new CollisionSystem();
    this.gameRenderer = new GameRenderer();
    this.hudRenderer = new HUDRenderer();
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

    // Scroll background and ground while not dead
    if (s.phase !== 'dead') {
      s.backgroundOffset += PIPE_SPEED * dt * 0.5;
      s.groundOffset += PIPE_SPEED * dt;
    }

    // Flash timer countdown
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

  private reset(): void {
    const hs = this.state.highScore;
    const w = this.state.canvasW;
    const h = this.state.canvasH;
    const newState = this.createInitialState(w, h, hs);
    newState.phase = 'idle';

    // Copy into existing state object so InputSystem's reference stays valid
    Object.assign(this.state, newState);
  }

  private createInitialState(
    canvasW: number,
    canvasH: number,
    highScore: number,
  ): FlappyState {
    const groundY = canvasH - GROUND_HEIGHT;
    return {
      bird: {
        x: canvasW * BIRD_X_RATIO,
        y: canvasH * 0.42,
        velocity: 0,
        rotation: 0,
        radius: BIRD_RADIUS,
        wingAngle: 0,
        wingDir: 1,
      },
      pipes: [],
      phase: 'idle',
      score: 0,
      highScore,
      canvasW,
      canvasH,
      groundY,
      pipeTimer: 0,
      flashTimer: 0,
      backgroundOffset: 0,
      groundOffset: 0,
    };
  }
}
```

The `reset()` method creates a fresh state and uses `Object.assign(this.state, newState)` to copy all properties into the existing state object. This is critical: InputSystem holds a reference to `this.state`, and if we replaced the object (`this.state = newState`), InputSystem would still point to the old dead state. `Object.assign` mutates the existing object in-place so all references remain valid.

The `createInitialState` factory centralizes state creation. Both the constructor and `reset()` use it. High score carries over between resets because it is passed as a parameter.

---

### 6. Platform Adapter & Export (Final)

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
      'Tap rhythmically — small frequent flaps give more control',
      'The bird rotates with velocity — watch the angle',
      'Pipes have consistent gaps — stay centered',
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
3. **Observe the full game loop:**
   - **Idle screen**: Title "Flappy Bird" at top, bird bobbing gently, pulsing "Tap or Press Space to Start"
   - **Tap/Space**: Bird flaps upward, game begins, score shows "0"
   - **Gameplay**: Pipes scroll, bird responds to gravity, score increments on each clear
   - **Death**: Screen flashes white, "Game Over" panel appears with score and best
   - **New high score**: "NEW!" badge appears next to Best if you beat the record
   - **Tap again**: Returns to idle screen with high score preserved
   - **Refresh the page**: High score persists (loaded from localStorage)
   - **Resize the window**: Canvas and ground adjust, bird repositions

---

## Challenges

**Easy:**
- Change the title text to your own game name
- Change the panel color from gold to silver (`#c0c0c0` / `#808080`)
- Show the high score on the idle screen even if it is 0

**Medium:**
- Add a medal system: bronze (5+), silver (10+), gold (20+) --- draw a colored circle on the score panel
- Add a score counter animation: when score increments, briefly scale the number up then back to normal
- Add a "ready?" countdown (3, 2, 1) before pipes start spawning

**Hard:**
- Add difficulty progression: decrease `GAP_SIZE` by 2px for every 5 points scored
- Implement a replay system: record bird inputs and pipe positions, replay on the game over screen
- Add a leaderboard screen that stores the top 10 scores in localStorage

---

## What You Learned

- Three-phase state machine: idle, playing, dead with clean transitions
- `Math.sin(time)` for smooth idle bobbing without physics simulation
- `Object.assign` for in-place state reset that preserves external references
- localStorage with try/catch for safe persistence
- Rounded rectangle drawing with `quadraticCurveTo`
- Pulsing text effect with `globalAlpha` and sine wave

---

## Complete File Structure

```
src/contexts/canvas2d/games/flappy-bird/
  types.ts                        — Interfaces and constants
  FlappyEngine.ts                 — Game loop, state, system orchestration
  systems/
    InputSystem.ts                — Keyboard and touch input
    BirdSystem.ts                 — Gravity, position, rotation, wing animation
    PipeSystem.ts                 — Pipe spawning, movement, scoring
    CollisionSystem.ts            — Ground/pipe collision, death, high score
  renderers/
    GameRenderer.ts               — Sky, clouds, pipes, ground, bird
    HUDRenderer.ts                — Score, idle overlay, game over panel
  adapters/
    PlatformAdapter.ts            — GameInstance wrapper
  index.ts                        — GameDefinition export
```

**Congratulations!** You have built a complete Flappy Bird clone with gravity physics, infinite scrolling pipes, collision detection, velocity-based animation, persistent high scores, and a polished game flow.

**Next Game:** Continue to [Helicopter](../14-helicopter/README.md) --- where you will learn terrain generation and continuous thrust controls.
