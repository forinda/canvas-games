# Step 3: Pheromone Trails

**Goal:** Ants lay pheromone trails that evaporate over time and render as glowing dots on the ground.

**Time:** ~15 minutes

---

## What You'll Build

- **Pheromone data model** with position, strength, and type (food vs. home)
- **Pheromone dropping** at regular intervals as ants move
- **Decay and pruning** so trails fade and old pheromones are removed
- **Trail rendering** with semi-transparent colored dots that fade with strength
- **Capacity limit** to prevent memory issues from unlimited pheromone accumulation

---

## Concepts

- **Pheromone Communication**: Real ants deposit chemical trails that other ants can detect. In our simulation, each pheromone is a point with a position, strength (0-1), and type. "Home" pheromones help ants find the colony; "food" pheromones lead to food sources.
- **Exponential Decay**: Pheromone strength decreases by a fixed amount per second (`PHEROMONE_DECAY = 0.15`). A pheromone at full strength (1.0) lasts about 6.7 seconds before disappearing. This creates a natural trail that fades from newest to oldest.
- **Drop Interval**: Ants don't drop pheromones every frame -- that would flood the system. Instead, each ant has a `pheromoneTimer` that counts down. When it reaches zero, the ant drops one pheromone and resets the timer to `PHEROMONE_DROP_INTERVAL` (0.3 seconds).
- **Memory Management**: We cap pheromones at `MAX_PHEROMONES` (2000). When the array exceeds this, the oldest entries are pruned. This prevents unbounded memory growth with many ants running for a long time.

---

## Code

### 1. Add Pheromone Dropping to AntSystem

**File:** `src/contexts/canvas2d/games/ant-colony/systems/AntSystem.ts`

Add pheromone dropping and decay methods to the existing ant system.

```typescript
import type { Ant, AntColonyState, Pheromone } from '../types';
import {
  ANT_SPEED,
  COLONY_RADIUS,
  MAX_PHEROMONES,
  PHEROMONE_DECAY,
  PHEROMONE_DROP_INTERVAL,
} from '../types';

export class AntSystem {
  update(state: AntColonyState, dt: number): void {
    if (state.paused || state.gameOver) return;

    // Decay all existing pheromones
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

      // Every ant drops pheromones as it moves
      this.dropPheromone(ant, state, dt);
    }
  }

  /** Decrease pheromone strength each frame; remove dead ones */
  private decayPheromones(state: AntColonyState, dt: number): void {
    for (let i = state.pheromones.length - 1; i >= 0; i--) {
      state.pheromones[i].strength -= PHEROMONE_DECAY * dt;

      if (state.pheromones[i].strength <= 0) {
        state.pheromones.splice(i, 1);
      }
    }
  }

  /** Drop a pheromone at the ant's position on a timer */
  private dropPheromone(ant: Ant, state: AntColonyState, dt: number): void {
    ant.pheromoneTimer -= dt;

    if (ant.pheromoneTimer <= 0) {
      ant.pheromoneTimer = PHEROMONE_DROP_INTERVAL;

      // Returning ants lay "food" trails (so others can find food)
      // Outgoing ants lay "home" trails (so they can find their way back)
      const type: Pheromone['type'] = ant.returning ? 'food' : 'home';

      state.pheromones.push({
        x: ant.x,
        y: ant.y,
        strength: ant.carrying ? 1.0 : 0.5, // stronger when carrying food
        type,
      });

      // Prune oldest pheromones if over capacity
      if (state.pheromones.length > MAX_PHEROMONES) {
        state.pheromones.splice(0, state.pheromones.length - MAX_PHEROMONES);
      }
    }
  }

  /** Foragers wander freely across the map */
  private updateForager(ant: Ant, state: AntColonyState, dt: number): void {
    const speed = ANT_SPEED * dt;
    this.wander(ant, state, speed);
  }

  /** Builders wander (tunnel logic added later) */
  private updateBuilder(ant: Ant, state: AntColonyState, dt: number): void {
    const speed = ANT_SPEED * dt;
    this.wander(ant, state, speed);
  }

  /** Idle ants stay near colony at half speed */
  private updateIdle(ant: Ant, state: AntColonyState, dt: number): void {
    const speed = ANT_SPEED * 0.5 * dt;
    const d = this.dist(ant.x, ant.y, state.colony.x, state.colony.y);

    if (d > COLONY_RADIUS * 3) {
      this.moveToward(ant, state.colony.x, state.colony.y, speed);
    } else {
      this.wander(ant, state, speed);
    }
  }

  private wander(ant: Ant, state: AntColonyState, speed: number): void {
    ant.angle += (Math.random() - 0.5) * 0.6;
    ant.x += Math.cos(ant.angle) * speed;
    ant.y += Math.sin(ant.angle) * speed;

    const margin = 10;
    if (ant.x < margin) {
      ant.x = margin;
      ant.angle = Math.random() * Math.PI - Math.PI / 2;
    }
    if (ant.x > state.width - margin) {
      ant.x = state.width - margin;
      ant.angle = Math.PI + (Math.random() * Math.PI - Math.PI / 2);
    }
    if (ant.y < margin) {
      ant.y = margin;
      ant.angle = Math.random() * Math.PI;
    }
    if (ant.y > state.height - margin) {
      ant.y = state.height - margin;
      ant.angle = -Math.random() * Math.PI;
    }
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
- `decayPheromones()` iterates backwards through the array (so splicing doesn't skip entries) and subtracts `PHEROMONE_DECAY * dt` from each pheromone's strength. When strength hits zero, the pheromone is removed.
- `dropPheromone()` decrements each ant's timer by `dt`. When the timer expires, a new pheromone is created at the ant's current position. The type depends on whether the ant is returning to the colony (`food` trail) or heading outward (`home` trail).
- Carrying ants drop stronger pheromones (strength 1.0 vs 0.5). This means trails leading to confirmed food sources will be more visible and longer-lasting than exploratory trails.
- The capacity check uses `splice(0, excess)` to remove the oldest pheromones first, since newer trails are more relevant.

---

### 2. Add Pheromone Rendering to GameRenderer

**File:** `src/contexts/canvas2d/games/ant-colony/renderers/GameRenderer.ts`

Add pheromone drawing between the background and the ants so trails appear on the ground.

```typescript
import type { AntColonyState, Ant, Colony } from '../types';
import { COLONY_RADIUS } from '../types';

export class GameRenderer {
  render(ctx: CanvasRenderingContext2D, state: AntColonyState): void {
    const { width, height } = state;

    // Background
    this.drawBackground(ctx, width, height);

    // Pheromone trails (drawn under ants)
    this.drawPheromones(ctx, state);

    // Colony nest
    this.drawColony(ctx, state.colony);

    // Ants
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
      const x = Math.random() * w;
      const y = Math.random() * h;
      ctx.fillRect(x, y, 1, 1);
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
      // Alpha scales with pheromone strength (max 0.25 for subtlety)
      const alpha = p.strength * 0.25;
      if (alpha < 0.01) continue;

      // Green for food trails, blue for home trails
      ctx.fillStyle = p.type === 'food'
        ? `rgba(0, 200, 100, ${alpha})`
        : `rgba(100, 150, 255, ${alpha})`;

      ctx.beginPath();
      ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
      ctx.fill();
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

    const colors = {
      forage: '#1a1a1a',
      build: '#3a2a1a',
      idle: '#2a2a2a',
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

    // Legs
    const legPositions = [-3, -1, 1];
    for (const lx of legPositions) {
      ctx.beginPath();
      ctx.moveTo(lx, 0);
      ctx.lineTo(lx - 1, -2.5);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(lx, 0);
      ctx.lineTo(lx - 1, 2.5);
      ctx.stroke();
    }

    // Carrying indicator
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
- `drawPheromones()` is called between background and colony/ant rendering so trails appear on the ground layer.
- Each pheromone renders as a small circle (radius 2px) with alpha proportional to its strength. At maximum strength (1.0), alpha is 0.25 -- subtle enough to not overwhelm the scene but visible enough to see trails forming.
- Food pheromones are green (`rgba(0, 200, 100, ...)`), matching the food source color. Home pheromones are blue (`rgba(100, 150, 255, ...)`). This color coding makes it easy to visually distinguish trail types.
- Pheromones below alpha 0.01 are skipped entirely to avoid unnecessary draw calls.

---

## Test It

1. **Run:** `npm run dev`
2. **Navigate:** Select "Ant Colony" and click to start
3. **Observe:**
   - Faint blue dots appear behind ants as they wander (home pheromones)
   - Trails are brightest near the ants and fade behind them
   - After ~7 seconds, the oldest parts of trails disappear completely
   - The ground develops a subtle pattern of explored vs. unexplored areas
4. **Watch the decay:**
   - Pause the game with `[P]` and notice the trails frozen in place
   - Resume and watch them continue fading
   - Trails near the colony are continuously refreshed by passing ants
5. **Performance:**
   - Even with many trails on screen, rendering stays smooth
   - Old pheromones are pruned at the 2000 cap

---

## Challenges

**Easy:**
- Change pheromone colors to red and yellow instead of green and blue
- Increase `MAX_PHEROMONES` to 5000 and observe denser trails

**Medium:**
- Make pheromone dots grow larger as they decay (radius increases from 2 to 4 as strength drops) for a "dispersing chemical" effect
- Add a pheromone "heat map" mode that draws larger, more blurred circles

**Hard:**
- Implement a grid-based pheromone system where the canvas is divided into cells and each cell accumulates pheromone strength, rather than tracking individual points
- Add wind that slowly shifts pheromone positions in one direction

---

## What You Learned

- Timer-based event dropping (pheromone interval) instead of per-frame spawning
- Backwards iteration for safe array splicing during decay
- Alpha-based rendering that ties visual intensity to data values
- Memory management with capacity limits and oldest-first pruning
- Layered rendering order (background, trails, colony, ants)

**Next:** Food collection -- ants will find food sources, pick them up, and carry them back to the colony!
