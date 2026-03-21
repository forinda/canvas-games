# Step 5: Trail Following & Optimization

**Goal:** Ants follow pheromone trails to find food faster, creating emergent optimized paths. Add colony management with population growth, food consumption, and seasonal cycles.

**Time:** ~15 minutes

---

## What You'll Build

- **Pheromone following** where ants sense nearby pheromones and steer toward the strongest signal
- **Task assignment** that distributes ants across forage/build/idle roles based on ratios
- **Colony lifecycle** with food consumption, starvation, and population growth
- **Seasonal resource system** with spring/summer abundance and winter scarcity
- **Auto-spawning food** that appears naturally based on the current season
- **Emergent path optimization** as reinforced trails become highways

---

## Concepts

- **Gradient Following**: When an ant can't see food directly, it scans nearby pheromones of type "food" (laid by returning ants). It scores each pheromone by `strength / distance` and moves toward the highest-scoring one. This creates a gradient ascent that leads wandering ants toward active food trails.
- **Emergent Behavior**: No ant knows the optimal path. But as multiple ants find food and lay strong return trails, other ants follow those trails, reinforcing them further. Over time, the colony self-organizes efficient routes -- a classic example of emergent intelligence from simple local rules.
- **Positive Feedback Loop**: Carrying ants lay stronger pheromones (1.0 vs 0.5). More ants on a trail means more reinforcement, which attracts even more ants. This positive feedback is what makes ant colony optimization so powerful.
- **Seasonal Pressure**: Food spawns abundantly in summer (1.5x rate), normally in spring, slowly in autumn (0.7x), and not at all in winter. The colony must stockpile food before winter or ants will starve.

---

## Code

### 1. Add Pheromone Following to AntSystem

**File:** `src/contexts/canvas2d/games/ant-colony/systems/AntSystem.ts`

Add pheromone sensing and task assignment to the existing ant system.

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

    // Reassign ant tasks based on current ratio
    this.assignTasks(state);

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

  /** Distribute ants across tasks based on taskRatio */
  private assignTasks(state: AntColonyState): void {
    const { ants, taskRatio } = state;
    const n = ants.length;
    if (n === 0) return;

    const forageCount = Math.round(n * taskRatio.forage);
    const buildCount = Math.round(n * taskRatio.build);

    let fi = 0;
    let bi = 0;

    for (const ant of ants) {
      if (fi < forageCount) {
        if (ant.task !== 'forage') {
          ant.task = 'forage';
          ant.returning = false;
          ant.carrying = false;
        }
        fi++;
      } else if (bi < buildCount) {
        if (ant.task !== 'build') {
          ant.task = 'build';
          ant.returning = false;
          ant.carrying = false;
        }
        bi++;
      } else {
        if (ant.task !== 'idle') {
          ant.task = 'idle';
          ant.returning = false;
          ant.carrying = false;
        }
      }
    }
  }

  /** Forager: search -> follow pheromones -> pickup -> return -> deliver */
  private updateForager(ant: Ant, state: AntColonyState, dt: number): void {
    const speed = ANT_SPEED * dt;

    if (ant.returning) {
      this.moveToward(ant, state.colony.x, state.colony.y, speed);
      const d = this.dist(ant.x, ant.y, state.colony.x, state.colony.y);

      if (d < DELIVERY_DISTANCE) {
        if (ant.carrying) {
          state.colony.food += 1;
          ant.carrying = false;
        }
        ant.returning = false;
      }
      return;
    }

    // Try to find food directly
    const nearest = this.findNearestFood(ant, state);

    if (!nearest) {
      // No food visible -- follow pheromone trails or wander
      const phTarget = this.followPheromone(ant, state, 'food');
      if (phTarget) {
        this.moveToward(ant, phTarget.x, phTarget.y, speed);
      } else {
        this.wander(ant, state, speed);
      }
      return;
    }

    this.moveToward(ant, nearest.x, nearest.y, speed);
    const d = this.dist(ant.x, ant.y, nearest.x, nearest.y);

    if (d < PICKUP_DISTANCE && nearest.amount > 0) {
      nearest.amount -= 1;
      ant.carrying = true;
      ant.returning = true;
    }
  }

  /** Scan nearby pheromones and return the best one to follow */
  private followPheromone(
    ant: Ant,
    state: AntColonyState,
    type: Pheromone['type']
  ): { x: number; y: number } | null {
    let best = null;
    let bestScore = 0;

    for (const p of state.pheromones) {
      if (p.type !== type) continue;

      const d = this.dist(ant.x, ant.y, p.x, p.y);

      // Ignore pheromones too close (already passed) or too far (out of range)
      if (d < 5 || d > 100) continue;

      // Score = strength / distance (nearby strong pheromones win)
      const score = p.strength / d;
      if (score > bestScore) {
        bestScore = score;
        best = p;
      }
    }

    return best;
  }

  private findNearestFood(ant: Ant, state: AntColonyState) {
    let best = null;
    let bestDist = Infinity;

    for (const fs of state.foodSources) {
      if (fs.amount <= 0) continue;
      const d = this.dist(ant.x, ant.y, fs.x, fs.y);
      if (d < bestDist) { bestDist = d; best = fs; }
    }

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
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
  }
}
```

**What's happening:**
- `followPheromone()` scans all pheromones of the requested type within 5-100px of the ant. It scores each by `strength / distance` -- a strong nearby pheromone scores much higher than a weak distant one. The ant steers toward the highest-scoring pheromone. The 5px minimum prevents ants from circling pheromones they just laid.
- `assignTasks()` iterates through all ants and assigns them to forage, build, or idle based on `taskRatio`. When an ant's task changes, its `returning` and `carrying` flags are reset so it starts its new behavior cleanly.
- The forager logic now has three tiers: (1) if returning with food, head to colony; (2) if food is visible within 400px, go directly to it; (3) otherwise, follow food pheromone trails or wander randomly.

---

### 2. Create the Colony System

**File:** `src/contexts/canvas2d/games/ant-colony/systems/ColonySystem.ts`

Handle food consumption, starvation, population growth, and game-over detection.

```typescript
import type { Ant, AntColonyState } from '../types';
import {
  BIRTH_COST,
  COLONY_RADIUS,
  FOOD_CONSUMPTION_RATE,
  MAX_ANTS,
  STARVATION_RATE,
} from '../types';

export class ColonySystem {
  update(state: AntColonyState, dt: number): void {
    const colony = state.colony;

    // ── Food consumption ──
    // Each ant eats a small amount per second
    const consumption = colony.population * FOOD_CONSUMPTION_RATE * dt;
    colony.food -= consumption;

    // ── Starvation ──
    if (colony.food < 0) {
      colony.food = 0;
      // Kill ants when food runs out
      const deaths = Math.ceil(STARVATION_RATE * dt);
      for (let i = 0; i < deaths && state.ants.length > 0; i++) {
        state.ants.pop();
        colony.population = Math.max(0, colony.population - 1);
      }
    }

    // ── Population growth (queen births) ──
    if (colony.food > BIRTH_COST * 0.5 && colony.population < MAX_ANTS) {
      colony.birthProgress += dt;
      // Birth rate scales with available food
      const birthTime = BIRTH_COST / Math.max(1, colony.food * 0.05);

      if (colony.birthProgress >= birthTime) {
        colony.birthProgress = 0;
        colony.food -= BIRTH_COST;
        if (colony.food < 0) colony.food = 0;

        this.spawnAnt(state);
      }
    }

    // ── Game over ──
    if (colony.population <= 0 && state.started) {
      state.gameOver = true;
    }

    // ── Max population grows with completed tunnels ──
    const completeTunnels = state.tunnels.filter(t => t.complete).length;
    colony.maxPopulation = 30 + completeTunnels * 15;
  }

  private spawnAnt(state: AntColonyState): void {
    const colony = state.colony;
    const angle = Math.random() * Math.PI * 2;
    const r = COLONY_RADIUS * 0.5;

    const ant: Ant = {
      x: colony.x + Math.cos(angle) * r,
      y: colony.y + Math.sin(angle) * r,
      angle: Math.random() * Math.PI * 2,
      carrying: false,
      task: 'forage',
      targetX: 0,
      targetY: 0,
      returning: false,
      pheromoneTimer: 0,
    };

    state.ants.push(ant);
    colony.population = state.ants.length;
  }
}
```

**What's happening:**
- Each ant consumes `FOOD_CONSUMPTION_RATE` (0.02) food per second. With 10 ants, that is 0.2 food/sec, so the starting 30 food lasts about 2.5 minutes without new income.
- When food hits zero, ants die at `STARVATION_RATE` (0.5 per second). This creates urgency -- the player must keep food flowing.
- Population growth requires food above `BIRTH_COST * 0.5` (10 food). The birth timer scales inversely with food reserves -- more food means faster births. Each birth costs `BIRTH_COST` (20) food.
- New ants spawn at a random position within the colony radius and immediately start foraging.

---

### 3. Create the Resource System

**File:** `src/contexts/canvas2d/games/ant-colony/systems/ResourceSystem.ts`

Handle season progression and automatic food spawning.

```typescript
import type { AntColonyState, Season } from '../types';
import {
  AUTO_FOOD_AMOUNT,
  AUTO_FOOD_INTERVAL,
  COLONY_RADIUS,
  SEASON_DURATION,
  SEASONAL_FOOD_MULT,
} from '../types';

const SEASON_ORDER: Season[] = ['spring', 'summer', 'autumn', 'winter'];

export class ResourceSystem {
  private autoFoodTimer = 0;

  update(state: AntColonyState, dt: number): void {
    // ── Season progression ──
    state.seasonTimer += dt;

    if (state.seasonTimer >= SEASON_DURATION) {
      state.seasonTimer = 0;
      const idx = SEASON_ORDER.indexOf(state.season);
      const nextIdx = (idx + 1) % SEASON_ORDER.length;
      state.season = SEASON_ORDER[nextIdx];

      // Increment year when spring comes again
      if (nextIdx === 0) state.year++;
    }

    // ── Remove depleted food sources ──
    for (let i = state.foodSources.length - 1; i >= 0; i--) {
      if (state.foodSources[i].amount <= 0) {
        state.foodSources.splice(i, 1);
      }
    }

    // ── Seasonal auto-spawn ──
    const mult = SEASONAL_FOOD_MULT[state.season];

    if (mult > 0) {
      this.autoFoodTimer += dt;
      const interval = AUTO_FOOD_INTERVAL / mult;

      if (this.autoFoodTimer >= interval) {
        this.autoFoodTimer = 0;
        this.spawnRandomFood(state, mult);
      }
    }
  }

  private spawnRandomFood(state: AntColonyState, mult: number): void {
    const margin = 60;
    let x: number;
    let y: number;

    // Avoid spawning on colony
    do {
      x = margin + Math.random() * (state.width - margin * 2);
      y = margin + Math.random() * (state.height - margin * 2);
    } while (
      Math.sqrt((x - state.colony.x) ** 2 + (y - state.colony.y) ** 2) < COLONY_RADIUS * 3
    );

    const amount = Math.round(AUTO_FOOD_AMOUNT * mult);

    state.foodSources.push({
      x,
      y,
      amount,
      maxAmount: amount,
      radius: 10 + Math.random() * 8,
    });
  }
}
```

**What's happening:**
- Seasons cycle every `SEASON_DURATION` seconds (30s). The order is spring, summer, autumn, winter. A full year takes 2 minutes.
- `SEASONAL_FOOD_MULT` controls how much food nature provides: summer is 1.5x, spring 1.0x, autumn 0.7x, winter 0.0x (no natural food at all).
- Auto-spawned food appears at random locations (avoiding the colony) at intervals based on `AUTO_FOOD_INTERVAL / mult`. In summer, food spawns more frequently and in larger amounts.
- Depleted food sources (amount <= 0) are cleaned up each frame.

---

### 4. Wire All Systems into the Engine

**File:** `src/contexts/canvas2d/games/ant-colony/AntColonyEngine.ts`

Update the game loop to run all three systems.

```typescript
import type { Ant, AntColonyState } from './types';
import { COLONY_RADIUS } from './types';
import { GameRenderer } from './renderers/GameRenderer';
import { AntSystem } from './systems/AntSystem';
import { ColonySystem } from './systems/ColonySystem';
import { ResourceSystem } from './systems/ResourceSystem';
import { InputSystem } from './systems/InputSystem';

export class AntColonyEngine {
  private ctx: CanvasRenderingContext2D;
  private state: AntColonyState;
  private running = false;
  private rafId = 0;
  private lastTime = 0;

  private gameRenderer: GameRenderer;
  private antSystem: AntSystem;
  private colonySystem: ColonySystem;
  private resourceSystem: ResourceSystem;
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
    this.colonySystem = new ColonySystem();
    this.resourceSystem = new ResourceSystem();
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
      this.colonySystem.update(this.state, dt);
      this.resourceSystem.update(this.state, dt);
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
      taskRatio: { forage: 0.6, build: 0.2, idle: 0.2 },
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
3. **Watch emergent pathfinding:**
   - Place a food source far from the colony
   - The first ant to find it lays a strong green trail on the way back
   - Other wandering ants detect the trail and follow it to the food
   - As more ants use the route, the trail becomes brighter and more direct
   - Over time, the path "straightens out" as ants take shortcuts
4. **Test colony lifecycle:**
   - Watch the population counter grow as food is delivered
   - Stop placing food and watch the food counter drop
   - If food hits zero, ants start dying -- the colony is under pressure
5. **Test seasons:**
   - Wait for seasons to change (30 seconds each)
   - In summer, green food circles appear automatically and are larger
   - In winter, no food spawns -- the colony must survive on reserves
   - Watch the season indicator in the top-right corner change

---

## Challenges

**Easy:**
- Change `PHEROMONE_DROP_INTERVAL` to 0.15 for denser trails
- Double the vision range from 400 to 800 pixels

**Medium:**
- Add "trail noise" where ants occasionally deviate from a pheromone trail, exploring nearby areas for potentially shorter routes
- Make the colony glow brighter when food is abundant (scale the radial gradient with food reserves)

**Hard:**
- Implement "trail evaporation boosting" where unused trails decay faster than active ones, creating a natural selection pressure toward optimal routes
- Add an "ant colony optimization" visualization that highlights the shortest discovered path between colony and each food source

---

## What You Learned

- Gradient following via `strength / distance` scoring creates effective trail tracking
- Positive feedback loops (stronger pheromones attract more ants) create emergent path optimization
- Task assignment with ratio-based distribution enables strategic workforce management
- Colony lifecycle mechanics (consumption, starvation, growth) create gameplay tension
- Seasonal cycles add long-term strategic depth to resource management

**Next:** Obstacles and polish -- add tunnels, obstacles, HUD stats, and start/pause screens!
