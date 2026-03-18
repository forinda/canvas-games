# Step 1: Project Setup & Balloon Drawing

**Goal:** Draw beautiful balloons with gradients, highlights, and strings.

**Time:** ~15 minutes

---

## What You'll Build

Static balloons on canvas with 3D appearance:

```
        ◯  ← Highlight
       ╱│╲
      │ │ │ ← Gradient body
       ╲│╱
        │  ← String
        │
```

---

## Concepts

- **Radial Gradients**: Create 3D sphere illusion
- **Color Manipulation**: Lighten/darken for highlights
- **Bezier Curves**: Organic string shapes
- **Layered Drawing**: Shadows → body → highlights → details

---

## Code

### 1. Create Type Definitions

**File:** `src/games/balloon-pop/types.ts`

```typescript
export interface Balloon {
  x: number;
  y: number;
  radius: number;
  color: string;
  speed: number; // Upward velocity (px/s)
  wobbleOffset: number; // Phase for horizontal sway
  popped: boolean;
  popParticles: PopParticle[];
}

export interface PopParticle {
  x: number;
  y: number;
  vx: number; // Velocity X
  vy: number; // Velocity Y
  life: number; // Remaining lifetime (ms)
  color: string;
  size: number;
}

export interface BalloonState {
  balloons: Balloon[];
  score: number;
  highScore: number;
  combo: number; // Consecutive hits
  maxCombo: number; // Best combo this round
  comboTimer: number; // Time until combo resets (ms)
  lives: number; // Hearts remaining
  timeRemaining: number; // Seconds
  phase: 'ready' | 'playing' | 'gameover';
  paused: boolean;

  // Visuals
  particles: PopParticle[];

  // Spawning
  spawnTimer: number; // Time until next spawn (ms)
  spawnInterval: number; // Spawn rate (ms)
  elapsed: number; // Total time elapsed (s)
}

// Balloon constants
export const BALLOON_RADIUS_MIN = 18;
export const BALLOON_RADIUS_MAX = 42;
export const BALLOON_SPEED_MIN = 60; // px/s
export const BALLOON_SPEED_MAX = 160;

// Color palette
export const BALLOON_COLORS = [
  '#e91e63', // Pink
  '#f44336', // Red
  '#ff9800', // Orange
  '#ffeb3b', // Yellow
  '#4caf50', // Green
  '#2196f3', // Blue
  '#9c27b0', // Purple
  '#00bcd4', // Cyan
];

// Spawning (for Step 2)
export const SPAWN_INTERVAL_BASE = 1200; // ms
export const SPAWN_INTERVAL_MIN = 350;
export const SPAWN_RAMP_RATE = 8; // 8ms faster per second elapsed

// Game rules
export const GAME_DURATION = 90; // seconds
export const MAX_LIVES = 5;

// Scoring (for Step 3)
export const BASE_POINTS = 10;
export const SIZE_BONUS_FACTOR = 0.8; // Smaller = more points
export const COMBO_WINDOW = 1500; // ms to keep combo alive

export const HS_KEY = 'balloon_pop_high_score';
```

---

### 2. Create Game Renderer

**File:** `src/games/balloon-pop/renderers/GameRenderer.ts`

```typescript
import type { BalloonState, Balloon } from '../types';

export class GameRenderer {
  render(ctx: CanvasRenderingContext2D, state: BalloonState): void {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    // Clear canvas
    ctx.fillStyle = '#87ceeb'; // Sky blue
    ctx.fillRect(0, 0, W, H);

    // Draw balloons
    for (const balloon of state.balloons) {
      if (!balloon.popped) {
        this.drawBalloon(ctx, balloon);
      }
    }
  }

  private drawBalloon(ctx: CanvasRenderingContext2D, b: Balloon): void {
    const { x, y, radius, color } = b;

    // Shadow (below balloon)
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(x, y + radius + 5, radius * 0.6, radius * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // String (from knot to bottom)
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x, y + radius);
    ctx.bezierCurveTo(
      x - 4,
      y + radius + 20,
      x + 4,
      y + radius + 35,
      x - 2,
      y + radius + 50
    );
    ctx.stroke();

    // Knot (small circle at bottom of balloon)
    ctx.fillStyle = this.darken(color, 40);
    ctx.beginPath();
    ctx.ellipse(x, y + radius, radius * 0.15, radius * 0.25, 0, 0, Math.PI * 2);
    ctx.fill();

    // Balloon body (radial gradient for 3D effect)
    const bodyGrad = ctx.createRadialGradient(
      x - radius * 0.3,
      y - radius * 0.3,
      radius * 0.1, // Inner highlight point
      x,
      y,
      radius // Outer edge
    );
    bodyGrad.addColorStop(0, this.lighten(color, 60)); // Bright top-left
    bodyGrad.addColorStop(0.7, color); // Main color
    bodyGrad.addColorStop(1, this.darken(color, 40)); // Dark edges

    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    // Highlight (shiny spot)
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.ellipse(x - radius * 0.35, y - radius * 0.4, radius * 0.2, radius * 0.3, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  /** Lighten a hex color */
  private lighten(hex: string, percent: number): string {
    const num = parseInt(hex.slice(1), 16);
    const r = Math.min(255, ((num >> 16) & 0xff) + percent);
    const g = Math.min(255, ((num >> 8) & 0xff) + percent);
    const b = Math.min(255, (num & 0xff) + percent);
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  }

  /** Darken a hex color */
  private darken(hex: string, percent: number): string {
    const num = parseInt(hex.slice(1), 16);
    const r = Math.max(0, ((num >> 16) & 0xff) - percent);
    const g = Math.max(0, ((num >> 8) & 0xff) - percent);
    const b = Math.max(0, (num & 0xff) - percent);
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  }
}
```

**Key Points:**
- **Gradient Setup**: Inner point offset top-left for realistic lighting
- **Drawing Order**: Shadow → String → Knot → Body → Highlight
- **Bezier Curve**: Control points create natural string curve
- **Color Helpers**: Lighten/darken by adjusting RGB values

---

### 3. Create Game Engine

**File:** `src/games/balloon-pop/BalloonEngine.ts`

```typescript
import type { BalloonState, Balloon } from './types';
import {
  BALLOON_COLORS,
  BALLOON_RADIUS_MIN,
  BALLOON_RADIUS_MAX,
  GAME_DURATION,
  MAX_LIVES,
  SPAWN_INTERVAL_BASE,
  HS_KEY,
} from './types';
import { GameRenderer } from './renderers/GameRenderer';

export class BalloonEngine {
  private ctx: CanvasRenderingContext2D;
  private state: BalloonState;
  private running: boolean;
  private rafId: number;

  private gameRenderer: GameRenderer;

  constructor(canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
    this.running = false;
    this.rafId = 0;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Load high score
    let highScore = 0;
    try {
      highScore = parseInt(localStorage.getItem(HS_KEY) ?? '0', 10) || 0;
    } catch (e) {
      console.warn('Could not load high score');
    }

    // Create test balloons (for Step 1 only)
    const testBalloons: Balloon[] = [];
    for (let i = 0; i < 5; i++) {
      testBalloons.push({
        x: 150 + i * 180,
        y: 400,
        radius: BALLOON_RADIUS_MIN + (i * 6),
        color: BALLOON_COLORS[i],
        speed: 100,
        wobbleOffset: 0,
        popped: false,
        popParticles: [],
      });
    }

    this.state = {
      balloons: testBalloons,
      score: 0,
      highScore,
      combo: 0,
      maxCombo: 0,
      comboTimer: 0,
      lives: MAX_LIVES,
      timeRemaining: GAME_DURATION,
      phase: 'ready',
      paused: false,
      particles: [],
      spawnTimer: 0,
      spawnInterval: SPAWN_INTERVAL_BASE,
      elapsed: 0,
    };

    this.gameRenderer = new GameRenderer();
  }

  start(): void {
    this.running = true;
    this.loop();
  }

  destroy(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
  }

  private loop(): void {
    if (!this.running) return;
    this.render();
    this.rafId = requestAnimationFrame(() => this.loop());
  }

  private render(): void {
    this.gameRenderer.render(this.ctx, this.state);
  }
}
```

---

### 4. Platform Adapter & Registration

**File:** `src/games/balloon-pop/adapters/PlatformAdapter.ts`

```typescript
import type { GameInstance } from '@shared/GameInterface';
import { BalloonEngine } from '../BalloonEngine';

export class PlatformAdapter implements GameInstance {
  private engine: BalloonEngine;

  constructor(canvas: HTMLCanvasElement, onExit: () => void) {
    this.engine = new BalloonEngine(canvas);
  }

  start(): void {
    this.engine.start();
  }

  destroy(): void {
    this.engine.destroy();
  }
}
```

**File:** `src/games/balloon-pop/index.ts`

```typescript
import type { GameDefinition } from '@shared/GameInterface';
import { PlatformAdapter } from './adapters/PlatformAdapter';

export const BalloonPopGame: GameDefinition = {
  id: 'balloon-pop',
  name: 'Balloon Pop',
  description: 'Pop balloons before they escape!',
  icon: '🎈',
  color: '#e91e63',
  category: 'action',
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
2. **Navigate:** Select "Balloon Pop" from the menu
3. **Expect:**
   - 5 test balloons in a row
   - Different sizes and colors
   - Radial gradient (lighter top-left)
   - White highlight spot
   - Curved strings hanging down
   - Subtle shadows below

---

## Visual Breakdown

### Gradient Structure:
```
Inner (0.0): Lighten(color, 60) — Bright highlight
Middle (0.7): Original color
Outer (1.0): Darken(color, 40) — Shadowed edges
```

### String Bezier Curve:
```
Start: (x, y + radius) — Bottom of balloon
Control 1: (x - 4, y + radius + 20)
Control 2: (x + 4, y + radius + 35)
End: (x - 2, y + radius + 50)
Result: Gentle S-curve
```

---

## What You Learned

✅ Create radial gradients with `createRadialGradient()`  
✅ Draw bezier curves with `bezierCurveTo()`  
✅ Manipulate hex colors (lighten/darken)  
✅ Layer drawing with `globalAlpha`  
✅ Draw ellipses with `ellipse()` method

---

## Next Step

→ [Step 2: Floating Movement & Spawning](./step-2.md) — Make balloons float upward with physics and spawn continuously
