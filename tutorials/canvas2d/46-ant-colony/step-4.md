# Step 4: Food Collection & Return

**Goal:** Ants find food sources, pick up food, carry it back to the colony, and deposit it. Food sources render as glowing green circles.

**Time:** ~15 minutes

---

## What You'll Build

- **Food source rendering** with glow, size scaling, and amount labels
- **Food detection** where forager ants sense nearby food within a vision range
- **Pickup mechanic** where ants grab one unit of food and begin returning
- **Return-to-colony** behavior with smooth steering back home
- **Food delivery** that increments the colony's food stockpile
- **Click-to-place** food sources via mouse input

---

## Concepts

- **Vision Range**: Ants don't have global knowledge of food positions. Each ant can only detect food within 400 pixels. If no food is in range, the ant continues wandering. This local awareness is what makes the simulation feel organic.
- **State Machine**: Each forager ant has two states controlled by the `returning` flag. When `returning` is false, the ant searches for food. When true, the ant heads directly to the colony. The `carrying` flag tracks whether the ant has food.
- **Nearest-First Selection**: When multiple food sources are in range, the ant targets the closest one. This is a greedy heuristic that works well -- ants naturally converge on nearby food first.
- **Food Depletion**: Each food source has an `amount` that decreases by 1 each time an ant picks up. When amount reaches zero, the source is removed by the resource system (added in step 5).

---

## Code

### 1. Add Food Collection to AntSystem

**File:** `src/contexts/canvas2d/games/ant-colony/systems/AntSystem.ts`

Replace the forager behavior with food-seeking, pickup, and return logic.

```typescript
import type { Ant, AntColonyState, Pheromone } from '../types';
import {
  ANT_SPEED,
  COLONY_RADIUS,
  DELIVERY_DISTANCE,
  MAX_PHEROMONES,
  PHEROMONE_DECAY,
  PHEROMONE_DROP_INTERVAL,
  PICKUP_DISTANCE,
} from '../types';

export class AntSystem {
  update(state: AntColonyState, dt: number): void {
    if (state.paused || state.gameOver) return;

    this.decayPheromones(state, dt);

    for (const ant of state.ants) {
      switch (ant.task) {
        case 'forage':
          this.updateForager(ant, state, dt);
          break;
        case 'build':
          this.updateBuilder(ant, state, dt);
          break;
        case 'idle':
          this.updateIdle(ant, state, dt);
          break;
      }

      this.dropPheromone(ant, state, dt);
    }
  }

  /** Full forager behavior: search -> pickup -> return -> deliver */
  private updateForager(ant: Ant, state: AntColonyState, dt: number): void {
    const speed = ANT_SPEED * dt;

    // ── Returning to colony ──
    if (ant.returning) {
      this.moveToward(ant, state.colony.x, state.colony.y, speed);
      const d = this.dist(ant.x, ant.y, state.colony.x, state.colony.y);

      if (d < DELIVERY_DISTANCE) {
        // Deliver food
        if (ant.carrying) {
          state.colony.food += 1;
          ant.carrying = false;
        }
        ant.returning = false;
      }
      return;
    }

    // ── Searching for food ──
    const nearest = this.findNearestFood(ant, state);

    if (!nearest) {
      // No food in range, wander
      this.wander(ant, state, speed);
      return;
    }

    // Move toward the nearest food source
    this.moveToward(ant, nearest.x, nearest.y, speed);
    const d = this.dist(ant.x, ant.y, nearest.x, nearest.y);

    // Pick up food when close enough
    if (d < PICKUP_DISTANCE && nearest.amount > 0) {
      nearest.amount -= 1;
      ant.carrying = true;
      ant.returning = true;
    }
  }

  /** Find the closest food source within vision range (400px) */
  private findNearestFood(ant: Ant, state: AntColonyState) {
    let best = null;
    let bestDist = Infinity;

    for (const fs of state.foodSources) {
      if (fs.amount <= 0) continue;

      const d = this.dist(ant.x, ant.y, fs.x, fs.y);
      if (d < bestDist) {
        bestDist = d;
        best = fs;
      }
    }

    // Only return food within vision range
    return bestDist < 400 ? best : null;
  }

  private updateBuilder(ant: Ant, state: AntColonyState, dt: number): void {
    const speed = ANT_SPEED * dt;
    this.wander(ant, state, speed);
  }

  private updateIdle(ant: Ant, state: AntColonyState, dt: number): void {
    const speed = ANT_SPEED * 0.5 * dt;
    const d = this.dist(ant.x, ant.y, state.colony.x, state.colony.y);

    if (d > COLONY_RADIUS * 3) {
      this.moveToward(ant, state.colony.x, state.colony.y, speed);
    } else {
      this.wander(ant, state, speed);
    }
  }

  private decayPheromones(state: AntColonyState, dt: number): void {
    for (let i = state.pheromones.length - 1; i >= 0; i--) {
      state.pheromones[i].strength -= PHEROMONE_DECAY * dt;
      if (state.pheromones[i].strength <= 0) {
        state.pheromones.splice(i, 1);
      }
    }
  }

  private dropPheromone(ant: Ant, state: AntColonyState, dt: number): void {
    ant.pheromoneTimer -= dt;
    if (ant.pheromoneTimer <= 0) {
      ant.pheromoneTimer = PHEROMONE_DROP_INTERVAL;
      const type: Pheromone['type'] = ant.returning ? 'food' : 'home';

      state.pheromones.push({
        x: ant.x,
        y: ant.y,
        strength: ant.carrying ? 1.0 : 0.5,
        type,
      });

      if (state.pheromones.length > MAX_PHEROMONES) {
        state.pheromones.splice(0, state.pheromones.length - MAX_PHEROMONES);
      }
    }
  }

  private wander(ant: Ant, state: AntColonyState, speed: number): void {
    ant.angle += (Math.random() - 0.5) * 0.6;
    ant.x += Math.cos(ant.angle) * speed;
    ant.y += Math.sin(ant.angle) * speed;

    const margin = 10;
    if (ant.x < margin) { ant.x = margin; ant.angle = Math.random() * Math.PI - Math.PI / 2; }
    if (ant.x > state.width - margin) { ant.x = state.width - margin; ant.angle = Math.PI + (Math.random() * Math.PI - Math.PI / 2); }
    if (ant.y < margin) { ant.y = margin; ant.angle = Math.random() * Math.PI; }
    if (ant.y > state.height - margin) { ant.y = state.height - margin; ant.angle = -Math.random() * Math.PI; }
  }

  private moveToward(ant: Ant, tx: number, ty: number, speed: number): void {
    const dx = tx - ant.x;
    const dy = ty - ant.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < 1) return;

    const targetAngle = Math.atan2(dy, dx);
    let angleDiff = targetAngle - ant.angle;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

    ant.angle += angleDiff * 0.15;
    const step = Math.min(speed, distance);
    ant.x += Math.cos(ant.angle) * step;
    ant.y += Math.sin(ant.angle) * step;
  }

  private dist(x1: number, y1: number, x2: number, y2: number): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
  }
}
```

**What's happening:**
- `updateForager()` is now a two-state machine. When `ant.returning` is true, the ant steers toward the colony center. When it gets within `DELIVERY_DISTANCE` (35px), it deposits its food (incrementing `colony.food`) and switches back to searching.
- When not returning, the ant calls `findNearestFood()` to scan all food sources within 400px. If one is found, the ant steers toward it. When within `PICKUP_DISTANCE` (12px), it decrements the food source's amount, sets `carrying = true`, and begins returning.
- If no food is in range, the ant falls back to wandering. This is where pheromone following will plug in (next step).
- The carrying indicator (green dot near the ant's head) is already rendered from step 1, so carrying ants are visually distinct immediately.

---

### 2. Add Food Source Rendering

**File:** `src/contexts/canvas2d/games/ant-colony/renderers/GameRenderer.ts`

Add food source drawing with glow effect, size scaling, and amount labels.

```typescript
import type { AntColonyState, Ant, Colony, FoodSource } from '../types';
import { COLONY_RADIUS } from '../types';

export class GameRenderer {
  render(ctx: CanvasRenderingContext2D, state: AntColonyState): void {
    const { width, height } = state;

    this.drawBackground(ctx, width, height);
    this.drawPheromones(ctx, state);
    this.drawFoodSources(ctx, state);
    this.drawColony(ctx, state.colony);
    this.drawAnts(ctx, state.ants);
  }

  private drawBackground(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#5a3e28');
    grad.addColorStop(1, '#3e2a18');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    for (let i = 0; i < 300; i++) {
      ctx.fillRect(Math.random() * w, Math.random() * h, 1, 1);
    }

    ctx.strokeStyle = 'rgba(100, 180, 80, 0.2)';
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 5]);
    ctx.beginPath();
    ctx.moveTo(0, 8);
    ctx.lineTo(w, 8);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  private drawPheromones(ctx: CanvasRenderingContext2D, state: AntColonyState): void {
    for (const p of state.pheromones) {
      const alpha = p.strength * 0.25;
      if (alpha < 0.01) continue;

      ctx.fillStyle = p.type === 'food'
        ? `rgba(0, 200, 100, ${alpha})`
        : `rgba(100, 150, 255, ${alpha})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /** Draw food sources with glow, scaled size, and amount label */
  private drawFoodSources(ctx: CanvasRenderingContext2D, state: AntColonyState): void {
    for (const fs of state.foodSources) {
      const ratio = fs.amount / fs.maxAmount;
      const r = fs.radius * (0.5 + 0.5 * ratio); // shrinks as food is consumed

      // Outer glow
      ctx.fillStyle = `rgba(100, 220, 80, ${0.15 * ratio})`;
      ctx.beginPath();
      ctx.arc(fs.x, fs.y, r + 8, 0, Math.PI * 2);
      ctx.fill();

      // Food circle
      ctx.fillStyle = `rgba(80, 200, 50, ${0.5 + 0.5 * ratio})`;
      ctx.beginPath();
      ctx.arc(fs.x, fs.y, r, 0, Math.PI * 2);
      ctx.fill();

      // Amount label
      if (fs.amount > 0) {
        ctx.font = '9px monospace';
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${Math.ceil(fs.amount)}`, fs.x, fs.y);
      }
    }
  }

  private drawColony(ctx: CanvasRenderingContext2D, colony: Colony): void {
    const { x, y } = colony;

    const glow = ctx.createRadialGradient(x, y, 0, x, y, COLONY_RADIUS + 15);
    glow.addColorStop(0, 'rgba(139, 109, 78, 0.3)');
    glow.addColorStop(1, 'rgba(139, 109, 78, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(x - 50, y - 50, 100, 100);

    ctx.fillStyle = '#8b6d3e';
    ctx.beginPath();
    ctx.arc(x, y, COLONY_RADIUS, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#a0804a';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#3a2a1a';
    ctx.beginPath();
    ctx.ellipse(x, y, 8, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffd700';
    ctx.font = '20px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('\u265B', x, y - 40);
  }

  private drawAnts(ctx: CanvasRenderingContext2D, ants: Ant[]): void {
    for (const ant of ants) {
      this.drawAnt(ctx, ant);
    }
  }

  private drawAnt(ctx: CanvasRenderingContext2D, ant: Ant): void {
    const { x, y, angle, task } = ant;
    const colors = { forage: '#1a1a1a', build: '#3a2a1a', idle: '#2a2a2a' };

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    ctx.fillStyle = colors[task];
    ctx.strokeStyle = colors[task];
    ctx.lineWidth = 0.5;

    ctx.beginPath(); ctx.arc(-5, 0, 1.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(-2, 0, 2.5, 1.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(2, 0, 3, 2, 0, 0, Math.PI * 2); ctx.fill();

    for (const lx of [-3, -1, 1]) {
      ctx.beginPath(); ctx.moveTo(lx, 0); ctx.lineTo(lx - 1, -2.5); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(lx, 0); ctx.lineTo(lx - 1, 2.5); ctx.stroke();
    }

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

**What's happening:**
- Food sources have three visual layers: an outer glow (large, faint circle), the food body (smaller, brighter), and a text label showing remaining amount.
- The `ratio` (current amount / max amount) drives both the visual radius and opacity. As ants consume food, the circle shrinks and becomes more transparent -- a clear visual cue that the source is depleting.
- The radius formula `fs.radius * (0.5 + 0.5 * ratio)` means even a nearly-empty source is still visible (half its original size), so ants don't seem to pick up invisible food.

---

### 3. Add Input System for Placing Food

**File:** `src/contexts/canvas2d/games/ant-colony/systems/InputSystem.ts`

Handle mouse clicks to place food sources on the map.

```typescript
import type { AntColonyState } from '../types';
import { COLONY_RADIUS } from '../types';

export class InputSystem {
  private state: AntColonyState;
  private canvas: HTMLCanvasElement;
  private onExit: () => void;

  private handleClick: (e: MouseEvent) => void;
  private handleKey: (e: KeyboardEvent) => void;

  constructor(state: AntColonyState, canvas: HTMLCanvasElement, onExit: () => void) {
    this.state = state;
    this.canvas = canvas;
    this.onExit = onExit;

    this.handleClick = this._onClick.bind(this);
    this.handleKey = this._onKeyDown.bind(this);
  }

  attach(): void {
    this.canvas.addEventListener('click', this.handleClick);
    window.addEventListener('keydown', this.handleKey);
  }

  detach(): void {
    this.canvas.removeEventListener('click', this.handleClick);
    window.removeEventListener('keydown', this.handleKey);
  }

  /** Left click: place food source */
  private _onClick(e: MouseEvent): void {
    if (this.state.gameOver || this.state.showHelp) return;

    if (!this.state.started) {
      this.state.started = true;
      return;
    }

    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Don't place food on top of colony
    const dx = x - this.state.colony.x;
    const dy = y - this.state.colony.y;
    if (Math.sqrt(dx * dx + dy * dy) < COLONY_RADIUS * 2) return;

    this.state.foodSources.push({
      x,
      y,
      amount: 50,
      maxAmount: 50,
      radius: 14,
    });
  }

  private _onKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Escape') { this.onExit(); return; }
    if (e.key === 'p' || e.key === 'P') {
      if (this.state.started && !this.state.gameOver) this.state.paused = !this.state.paused;
      return;
    }
    if (e.key === 'h' || e.key === 'H') {
      this.state.showHelp = !this.state.showHelp;
      return;
    }

    // Task ratio keys
    if (e.key === '1') {
      this.state.taskRatio.forage = Math.min(1, this.state.taskRatio.forage + 0.1);
      this.normalizeRatios();
    } else if (e.key === '2') {
      this.state.taskRatio.build = Math.min(1, this.state.taskRatio.build + 0.1);
      this.normalizeRatios();
    } else if (e.key === '3') {
      this.state.taskRatio.idle = Math.min(1, this.state.taskRatio.idle + 0.1);
      this.normalizeRatios();
    }
  }

  private normalizeRatios(): void {
    const r = this.state.taskRatio;
    const total = r.forage + r.build + r.idle;
    if (total <= 0) { r.forage = 0.5; r.build = 0.3; r.idle = 0.2; return; }
    r.forage /= total;
    r.build /= total;
    r.idle /= total;
  }

  setRestartCallback(cb: () => void): void {
    (this as any)._restartCb = cb;
  }
}
```

**What's happening:**
- `_onClick()` converts the mouse event to canvas coordinates using `getBoundingClientRect()`. It prevents placing food on top of the colony (within 2x the colony radius).
- Each placed food source has 50 units of food, a max of 50, and a 14px visual radius.
- The first click starts the game (when `started` is false). Subsequent clicks place food.

---

### 4. Wire Input System into the Engine

**File:** `src/contexts/canvas2d/games/ant-colony/AntColonyEngine.ts`

Add the input system alongside the existing systems.

```typescript
import type { Ant, AntColonyState } from './types';
import { COLONY_RADIUS } from './types';
import { GameRenderer } from './renderers/GameRenderer';
import { AntSystem } from './systems/AntSystem';
import { InputSystem } from './systems/InputSystem';

export class AntColonyEngine {
  private ctx: CanvasRenderingContext2D;
  private state: AntColonyState;
  private running = false;
  private rafId = 0;
  private lastTime = 0;

  private gameRenderer: GameRenderer;
  private antSystem: AntSystem;
  private inputSystem: InputSystem;
  private resizeHandler: () => void;

  constructor(canvas: HTMLCanvasElement, onExit: () => void) {
    this.ctx = canvas.getContext('2d')!;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    this.state = this.createInitialState(cx, cy, canvas.width, canvas.height);

    this.gameRenderer = new GameRenderer();
    this.antSystem = new AntSystem();
    this.inputSystem = new InputSystem(this.state, canvas, onExit);
    this.inputSystem.attach();

    this.resizeHandler = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      this.state.width = canvas.width;
      this.state.height = canvas.height;
    };
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
    const dt = Math.min((now - this.lastTime) / 1000, 0.1);
    this.lastTime = now;

    if (this.state.started && !this.state.paused && !this.state.gameOver) {
      this.state.elapsed += dt;
      this.antSystem.update(this.state, dt);
    }

    this.gameRenderer.render(this.ctx, this.state);
    this.rafId = requestAnimationFrame(() => this.loop());
  }

  private createInitialState(
    cx: number, cy: number, width: number, height: number
  ): AntColonyState {
    const initialAnts: Ant[] = [];

    for (let i = 0; i < 10; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = COLONY_RADIUS * 0.5;

      initialAnts.push({
        x: cx + Math.cos(angle) * r,
        y: cy + Math.sin(angle) * r,
        angle: Math.random() * Math.PI * 2,
        carrying: false,
        task: 'forage',
        targetX: 0,
        targetY: 0,
        returning: false,
        pheromoneTimer: Math.random(),
      });
    }

    return {
      colony: {
        x: cx, y: cy,
        food: 30,
        population: 10,
        maxPopulation: 30,
        birthThreshold: 20,
        birthProgress: 0,
      },
      ants: initialAnts,
      foodSources: [],
      tunnels: [],
      pheromones: [],
      taskRatio: { forage: 0.7, build: 0.2, idle: 0.1 },
      season: 'spring',
      seasonTimer: 0,
      year: 1,
      elapsed: 0,
      paused: false,
      started: false,
      gameOver: false,
      tunnelWaypoints: [],
      width,
      height,
      showHelp: false,
    };
  }
}
```

---

## Test It

1. **Run:** `npm run dev`
2. **Navigate:** Select "Ant Colony" and click to start
3. **Place food:** Click anywhere on the map to place a green food source
4. **Watch collection:**
   - Ants wander until they come within 400px of a food source
   - When an ant detects food, it curves toward the green circle
   - Upon reaching the food, a green dot appears at the ant's head (carrying)
   - The ant turns around and steers back to the colony
   - At the colony, the carrying indicator disappears and the food count increases
   - The food source number decreases and the circle shrinks
5. **Place multiple foods:**
   - Put food in different locations and watch ants distribute across them
   - Notice ants target the nearest available food source
   - Observe green "food" pheromone trails forming as carrying ants return

---

## Challenges

**Easy:**
- Change the food amount from 50 to 100 per source
- Make food sources appear as squares instead of circles

**Medium:**
- Add a "food radar" that draws a faint line from each forager ant to the food source it is targeting
- Make ants move 50% faster when carrying food (they are motivated!)

**Hard:**
- Implement "food memory" where an ant remembers the last food location it visited and returns there if the food is not yet depleted
- Add a food chain where larger food sources split into smaller ones when half-consumed

---

## What You Learned

- State machine pattern for ant behavior (searching vs. returning)
- Nearest-neighbor search with vision range filtering
- Distance-based pickup and delivery mechanics
- Visual feedback through size scaling, opacity, and carrying indicators
- Mouse-to-canvas coordinate conversion for interactive food placement

**Next:** Trail following -- ants will sense and follow pheromone gradients to find food faster!
