# Step 1: Ant Movement & Basic Exploration

**Goal:** Create ants that wander around with smooth, natural movement.

**Time:** ~30 minutes

---

## What You'll Build

Foundation of ant behavior:
- **Ant entities**: Position, direction, and state
- **Smooth turning**: Interpolated angle changes
- **Wandering behavior**: Random direction changes with boundary bouncing
- **Colony nest**: Central home base
- **Ant rendering**: Segmented body with legs

---

## Concepts

- **Angle Interpolation**: Smooth turning instead of instant rotation
- **Vector Movement**: Position updates using `cos(angle)` and `sin(angle)`
- **Boundary Bouncing**: Keep ants within canvas bounds
- **Entity System**: Managing multiple independent agents

---

## Code

### 1. Create Types

**File:** `src/contexts/canvas2d/games/ant-colony/types.ts`

Define core types and constants:

```typescript
export interface Vec2 {
  x: number;
  y: number;
}

export interface Ant {
  x: number;
  y: number;
  angle: number; // radians
  carrying: boolean;
  task: 'forage' | 'build' | 'idle';
  targetX: number;
  targetY: number;
  returning: boolean;
  pheromoneTimer: number;
}

export interface Colony {
  x: number;
  y: number;
  food: number;
  population: number;
  maxPopulation: number;
  birthThreshold: number;
  birthProgress: number;
}

export interface FoodSource {
  x: number;
  y: number;
  amount: number;
  maxAmount: number;
  radius: number;
}

export interface Pheromone {
  x: number;
  y: number;
  strength: number;
  type: 'food' | 'home';
}

export interface TunnelSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  progress: number;
  complete: boolean;
}

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export interface TaskRatio {
  forage: number;
  build: number;
  idle: number;
}

export interface AntColonyState {
  colony: Colony;
  ants: Ant[];
  foodSources: FoodSource[];
  tunnels: TunnelSegment[];
  pheromones: Pheromone[];
  taskRatio: TaskRatio;
  season: Season;
  seasonTimer: number;
  year: number;
  elapsed: number;
  paused: boolean;
  started: boolean;
  gameOver: boolean;
  tunnelWaypoints: Vec2[];
  width: number;
  height: number;
  showHelp: boolean;
}

// Constants
export const ANT_SPEED = 60; // px/sec
export const COLONY_RADIUS = 30;
export const PICKUP_DISTANCE = 12;
export const DELIVERY_DISTANCE = 35;

export const PHEROMONE_DROP_INTERVAL = 0.3; // seconds
export const PHEROMONE_DECAY = 0.15; // per second

export const FOOD_CONSUMPTION_RATE = 0.02; // per ant per second
export const BIRTH_COST = 20;
export const AUTO_FOOD_AMOUNT = 40;
export const AUTO_FOOD_INTERVAL = 8; // seconds

export const SEASON_DURATION = 30; // seconds
export const MAX_ANTS = 200;
export const MAX_PHEROMONES = 2000;
export const STARVATION_RATE = 0.5; // ants per second

export const SEASONAL_FOOD_MULT: Record<Season, number> = {
  spring: 1.0,
  summer: 1.5,
  autumn: 0.7,
  winter: 0.0,
};
```

---

### 2. Create Ant System

**File:** `src/contexts/canvas2d/games/ant-colony/systems/AntSystem.ts`

Implement basic ant movement:

```typescript
import type { AntColonyState, Ant } from '../types';
import { ANT_SPEED } from '../types';

export class AntSystem {
  update(state: AntColonyState, dt: number): void {
    if (state.paused || state.gameOver) return;

    const dtSec = dt / 1000;

    for (const ant of state.ants) {
      this.updateAnt(ant, state, dtSec);
    }
  }

  private updateAnt(ant: Ant, state: AntColonyState, dtSec: number): void {
    // For now, all ants just wander
    this.wander(ant, state, dtSec);
  }

  private wander(ant: Ant, state: AntColonyState, dtSec: number): void {
    const { width, height } = state;

    // Random direction change (small, frequent adjustments)
    if (Math.random() < 0.05) {
      ant.angle += (Math.random() - 0.5) * 0.5;
    }

    // Move forward
    const speed = ANT_SPEED * dtSec;
    ant.x += Math.cos(ant.angle) * speed;
    ant.y += Math.sin(ant.angle) * speed;

    // Boundary bouncing
    const margin = 10;
    if (ant.x < margin) {
      ant.x = margin;
      ant.angle = Math.PI - ant.angle; // Reflect horizontally
    } else if (ant.x > width - margin) {
      ant.x = width - margin;
      ant.angle = Math.PI - ant.angle;
    }

    if (ant.y < margin) {
      ant.y = margin;
      ant.angle = -ant.angle; // Reflect vertically
    } else if (ant.y > height - margin) {
      ant.y = height - margin;
      ant.angle = -ant.angle;
    }
  }

  private moveToward(ant: Ant, targetX: number, targetY: number, speed: number): void {
    // Calculate direction to target
    const dx = targetX - ant.x;
    const dy = targetY - ant.y;
    const targetAngle = Math.atan2(dy, dx);

    // Smooth angle transition (15% blend per frame)
    let angleDiff = targetAngle - ant.angle;

    // Normalize to [-PI, PI]
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

    ant.angle += angleDiff * 0.15;

    // Move forward (don't overshoot)
    const distance = Math.sqrt(dx * dx + dy * dy);
    const actualSpeed = Math.min(speed, distance);

    ant.x += Math.cos(ant.angle) * actualSpeed;
    ant.y += Math.sin(ant.angle) * actualSpeed;
  }
}
```

**Key patterns:**
- **Smooth turning**: Blend toward target angle by 15% → natural curved paths
- **Boundary bouncing**: Reflect angle when hitting edges
- **Random perturbation**: Small angle changes create organic wandering

---

### 3. Create Game Renderer

**File:** `src/contexts/canvas2d/games/ant-colony/renderers/GameRenderer.ts`

Draw ants and colony:

```typescript
import type { AntColonyState, Ant, Colony } from '../types';
import { COLONY_RADIUS } from '../types';

export class GameRenderer {
  render(ctx: CanvasRenderingContext2D, state: AntColonyState): void {
    const { width, height } = state;

    // Background
    this.drawBackground(ctx, width, height);

    // Colony nest
    this.drawColony(ctx, state.colony);

    // Ants
    this.drawAnts(ctx, state.ants);
  }

  private drawBackground(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    // Earth gradient
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#5a3e28');
    grad.addColorStop(1, '#3e2a18');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Surface texture (random dots)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    for (let i = 0; i < 300; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      ctx.fillRect(x, y, 1, 1);
    }

    // Surface line (grass level)
    ctx.strokeStyle = 'rgba(100, 180, 80, 0.2)';
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 5]);
    ctx.beginPath();
    ctx.moveTo(0, 8);
    ctx.lineTo(w, 8);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  private drawColony(ctx: CanvasRenderingContext2D, colony: Colony): void {
    const { x, y } = colony;

    // Glow effect
    const glow = ctx.createRadialGradient(x, y, 0, x, y, COLONY_RADIUS + 15);
    glow.addColorStop(0, 'rgba(139, 109, 78, 0.3)');
    glow.addColorStop(1, 'rgba(139, 109, 78, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(x - 50, y - 50, 100, 100);

    // Mound
    ctx.fillStyle = '#8b6d3e';
    ctx.beginPath();
    ctx.arc(x, y, COLONY_RADIUS, 0, Math.PI * 2);
    ctx.fill();

    // Border
    ctx.strokeStyle = '#a0804a';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Entrance
    ctx.fillStyle = '#3a2a1a';
    ctx.beginPath();
    ctx.ellipse(x, y, 8, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Queen symbol
    ctx.fillStyle = '#ffd700';
    ctx.font = '20px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('♛', x, y - 40);
  }

  private drawAnts(ctx: CanvasRenderingContext2D, ants: Ant[]): void {
    for (const ant of ants) {
      this.drawAnt(ctx, ant);
    }
  }

  private drawAnt(ctx: CanvasRenderingContext2D, ant: Ant): void {
    const { x, y, angle, task } = ant;

    // Task-based coloring
    const colors = {
      forage: '#1a1a1a', // Black
      build: '#3a2a1a',  // Dark brown
      idle: '#2a2a2a',   // Dark gray
    };

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    ctx.fillStyle = colors[task];
    ctx.strokeStyle = colors[task];
    ctx.lineWidth = 0.5;

    // Head
    ctx.beginPath();
    ctx.arc(-5, 0, 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Thorax
    ctx.beginPath();
    ctx.ellipse(-2, 0, 2.5, 1.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Abdomen
    ctx.beginPath();
    ctx.ellipse(2, 0, 3, 2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Legs (3 pairs)
    const legPositions = [-3, -1, 1];
    for (const lx of legPositions) {
      // Left leg
      ctx.beginPath();
      ctx.moveTo(lx, 0);
      ctx.lineTo(lx - 1, -2.5);
      ctx.stroke();

      // Right leg
      ctx.beginPath();
      ctx.moveTo(lx, 0);
      ctx.lineTo(lx - 1, 2.5);
      ctx.stroke();
    }

    // Carrying indicator (green dot)
    if (ant.carrying) {
      ctx.fillStyle = '#4ade80';
      ctx.beginPath();
      ctx.arc(-6, 0, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }
}
```

**Visual details:**
- **Segmented body**: Head (small circle), thorax (ellipse), abdomen (larger ellipse)
- **Legs**: 6 lines extending from body
- **Rotation**: Canvas rotation positions ant at angle
- **Colony**: Mound with entrance and queen symbol

---

### 4. Create Game Engine

**File:** `src/contexts/canvas2d/games/ant-colony/AntColonyEngine.ts`

Initialize game state and loop:

```typescript
import type { AntColonyState, Ant } from './types';
import { COLONY_RADIUS } from './types';
import { GameRenderer } from './renderers/GameRenderer';
import { AntSystem } from './systems/AntSystem';

export class AntColonyEngine {
  private ctx: CanvasRenderingContext2D;
  private state: AntColonyState;
  private running: boolean;
  private rafId: number;
  private lastTime: number;

  private gameRenderer: GameRenderer;
  private antSystem: AntSystem;

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
      colony: {
        x: W / 2,
        y: H / 2,
        food: 30,
        population: 10,
        maxPopulation: 30,
        birthThreshold: 20,
        birthProgress: 0,
      },
      ants: [],
      foodSources: [],
      tunnels: [],
      pheromones: [],
      taskRatio: {
        forage: 0.7,
        build: 0.2,
        idle: 0.1,
      },
      season: 'spring',
      seasonTimer: 0,
      year: 1,
      elapsed: 0,
      paused: false,
      started: true, // Start immediately for now
      gameOver: false,
      tunnelWaypoints: [],
      width: W,
      height: H,
      showHelp: false,
    };

    // Spawn initial ants
    this.spawnInitialAnts();

    this.gameRenderer = new GameRenderer();
    this.antSystem = new AntSystem();
  }

  private spawnInitialAnts(): void {
    const { colony } = this.state;

    for (let i = 0; i < 10; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * COLONY_RADIUS;

      const ant: Ant = {
        x: colony.x + Math.cos(angle) * distance,
        y: colony.y + Math.sin(angle) * distance,
        angle: Math.random() * Math.PI * 2,
        carrying: false,
        task: 'forage', // All forage for now
        targetX: 0,
        targetY: 0,
        returning: false,
        pheromoneTimer: 0,
      };

      this.state.ants.push(ant);
    }
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
    let dt = now - this.lastTime;
    this.lastTime = now;

    // Cap dt to prevent huge jumps
    dt = Math.min(dt, 100);

    this.update(dt);
    this.render();

    this.rafId = requestAnimationFrame(this.loop);
  };

  private update(dt: number): void {
    this.antSystem.update(this.state, dt);
  }

  private render(): void {
    this.gameRenderer.render(this.ctx, this.state);
  }
}
```

---

### 5. Create Platform Adapter

**File:** `src/contexts/canvas2d/games/ant-colony/adapters/PlatformAdapter.ts`

```typescript
import type { GameInstance } from '@core/GameInterface';
import { AntColonyEngine } from '../AntColonyEngine';

export class PlatformAdapter implements GameInstance {
  private engine: AntColonyEngine;

  constructor(canvas: HTMLCanvasElement, onExit: () => void) {
    this.engine = new AntColonyEngine(canvas, onExit);
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

**File:** `src/contexts/canvas2d/games/ant-colony/index.ts`

```typescript
import type { GameDefinition } from '@core/GameInterface';
import { PlatformAdapter } from './adapters/PlatformAdapter';

export const AntColonyGame: GameDefinition = {
  id: 'ant-colony',
  name: 'Ant Colony',
  description: 'Manage a colony of foraging ants',
  genre: 'Simulation',
  difficulty: 'Hard',
  controls: ['mouse', 'keyboard'],
  HelpComponent: () => {
    return `
Controls:
- Left Click: Place food
- Right Click: Dig tunnel
- [1/2/3]: Adjust task ratios
- P: Pause
- ESC: Exit

Guide ants to collect food and grow your colony!
    `.trim();
  },
  instanceFactory: (canvas, onExit) => new PlatformAdapter(canvas, onExit),
};
```

---

## Test It

1. **Run:** `npm run dev`
2. **Navigate:** Select "Ant Colony"
3. **Observe:**
   - 10 ants spawn near colony center
   - Ants wander randomly with smooth turning
   - Ants bounce off screen edges
   - Colony nest visible with queen symbol
   - Earth-toned background with texture
4. **Movement:**
   - Watch ants make curved paths (smooth angle interpolation)
   - Notice how they adjust direction smoothly
   - Ants never rotate instantly

---

## Challenges

**Easy:**
- Change ant count to 20
- Make ants move faster (120 px/s)
- Change ant color to red

**Medium:**
- Add "avoid collision" behavior (ants steer away from each other)
- Make ants prefer staying near colony (within 200px)
- Add antenna animation (wiggling lines)

**Hard:**
- Implement flocking behavior (boids algorithm)
- Add shadows under ants
- Create "scout" behavior (ants explore systematically)

---

## What You Learned

✅ Entity management with arrays  
✅ Smooth angle interpolation (blend factor)  
✅ Vector-based movement (`cos/sin` from angle)  
✅ Boundary collision with reflection  
✅ Canvas rotation for oriented sprites  
✅ Segmented character rendering  
✅ Random wandering behavior

**Next:** Food collection and carrying behavior!
