# Step 5: Simulation Loop

**Goal:** Add a tick-based economy that generates income from population, deducts upkeep, and warns about resource shortages.

**Time:** ~15 minutes

---

## What You'll Build

- **EconomySystem** that runs economic ticks at configurable speed
- **Income calculation** based on population, happiness, and factory count
- **Upkeep deduction** scaling with population size
- **Shortage warnings** for food and power displayed as status messages
- **Speed control** with 1x/2x/3x multiplier affecting tick interval

---

## Concepts

- **Tick-Based Simulation**: Rather than updating continuously, the economy runs on discrete "ticks." Every 3 seconds (at 1x speed), income is earned and upkeep is deducted. This gives the player time to react and plan between updates.
- **Speed Multiplier**: The tick interval is `3000 / speed` milliseconds. At 1x, ticks happen every 3 seconds. At 3x, every 1 second. The player controls this with +/- keys.
- **Happiness Factor**: Income scales with `happiness / 50`. At 100% happiness, income is doubled. At 25% happiness, income is halved. This makes happiness a critical economic lever, not just a cosmetic stat.
- **Factory Income**: Each factory level adds a flat $50 per tick regardless of happiness. This provides a reliable income floor but at the cost of happiness (-5 per level). The player must decide between stable factory income and population-driven tax revenue.

---

## Code

### 1. Create the Economy System

**File:** `src/contexts/canvas2d/games/city-builder/systems/EconomySystem.ts`

Runs periodic economic ticks, calculating income, upkeep, and shortage warnings.

```typescript
import type { CityState } from '../types';

export class EconomySystem {
  private lastEconTick = 0;
  private showMessage: (msg: string) => void;

  constructor(showMessage: (msg: string) => void) {
    this.showMessage = showMessage;
  }

  resetTick(now: number): void {
    this.lastEconTick = now;
  }

  update(state: CityState, _dt: number, now?: number): void {
    if (now === undefined) return;

    const econInterval = 3000 / state.speed;

    if (now - this.lastEconTick >= econInterval) {
      this.lastEconTick = now;
      state.tick++;

      // Count factory levels
      let factoryCount = 0;
      for (const row of state.grid) {
        for (const b of row) {
          if (b?.type === 'factory') factoryCount += b.level;
        }
      }

      // Income = population tax + factory output
      const hapFactor = state.happiness / 50;
      const income = Math.round(
        state.population * 2 * hapFactor + factoryCount * 50
      );

      // Upkeep = population maintenance
      const upkeep = Math.round(state.population * 0.5);

      state.money += income - upkeep;

      // Shortage warnings
      if (state.food < 0) this.showMessage('Food shortage! Build farms!');
      if (state.power < 0) this.showMessage('Power shortage! Build power plants!');
    }
  }
}
```

**What's happening:**
- `update()` is called every frame but only acts when enough time has passed for a tick. The interval is `3000 / speed` ms -- 3 seconds at 1x, 1 second at 3x.
- On each tick, we count total factory levels across the grid. A single level-3 factory counts as 3.
- Income has two components: `population * 2 * hapFactor` (tax revenue scaled by happiness) and `factoryCount * 50` (flat industrial income).
- Upkeep is `population * 0.5` -- a simple per-citizen maintenance cost. Net income = income - upkeep.
- After updating money, we check for negative food and power and display warning messages. These warnings repeat every tick while the shortage persists, keeping pressure on the player to fix the problem.

---

### 2. Update the Engine

**File:** `src/contexts/canvas2d/games/city-builder/CityEngine.ts`

Add delta time tracking and wire in the EconomySystem.

```typescript
import type { CityState } from './types';
import { CELL_SIZE, HUD_HEIGHT } from './types';
import { GridSystem } from './systems/GridSystem';
import { EconomySystem } from './systems/EconomySystem';
import { StatsSystem } from './systems/StatsSystem';
import { InputSystem } from './systems/InputSystem';
import { GridRenderer } from './renderers/GridRenderer';
import { PanelRenderer } from './renderers/PanelRenderer';
import { HUDRenderer } from './renderers/HUDRenderer';

export class CityEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private state: CityState;
  private running = false;
  private rafId = 0;
  private lastTime = 0;

  // Systems
  private gridSystem: GridSystem;
  private economySystem: EconomySystem;
  private statsSystem: StatsSystem;
  private inputSystem: InputSystem;

  // Renderers
  private gridRenderer: GridRenderer;
  private panelRenderer: PanelRenderer;
  private hudRenderer: HUDRenderer;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const cols = Math.floor(canvas.width / CELL_SIZE);
    const rows = Math.floor((canvas.height - HUD_HEIGHT - 100) / CELL_SIZE);

    this.gridSystem = new GridSystem();
    this.statsSystem = new StatsSystem();

    const showMessage = (msg: string) => {
      this.state.message = msg;
      this.state.messageTimer = 2;
    };

    this.economySystem = new EconomySystem(showMessage);

    this.state = {
      grid: this.gridSystem.createEmptyGrid(cols, rows),
      cols,
      rows,
      population: 0,
      money: 1000,
      happiness: 50,
      power: 10,
      food: 20,
      selectedType: null,
      hoveredCell: null,
      tick: 0,
      started: false,
      speed: 1,
      message: '',
      messageTimer: 0,
    };

    this.inputSystem = new InputSystem(
      canvas, this.state, this.gridSystem, this.statsSystem, showMessage
    );

    this.gridRenderer = new GridRenderer();
    this.panelRenderer = new PanelRenderer(canvas);
    this.hudRenderer = new HUDRenderer(canvas);
  }

  start(): void {
    this.running = true;
    this.lastTime = performance.now();
    this.economySystem.resetTick(this.lastTime);
    this.inputSystem.attach();
    this.loop(this.lastTime);
  }

  destroy(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
    this.inputSystem.detach();
  }

  private loop(timestamp: number): void {
    if (!this.running) return;

    const dt = Math.min((timestamp - this.lastTime) / 1000, 0.05);
    this.lastTime = timestamp;

    if (this.state.started) this.update(dt, timestamp);

    this.render();
    this.rafId = requestAnimationFrame((t) => this.loop(t));
  }

  private update(dt: number, now: number): void {
    // Fade out status messages
    this.state.messageTimer = Math.max(0, this.state.messageTimer - dt);
    // Run economy
    this.economySystem.update(this.state, dt, now);
  }

  private render(): void {
    const { ctx, canvas, state } = this;
    const W = canvas.width, H = canvas.height;

    ctx.fillStyle = '#1a2a1a';
    ctx.fillRect(0, 0, W, H);

    this.gridRenderer.render(ctx, state);
    this.panelRenderer.render(ctx, state);
    this.hudRenderer.render(ctx, state);
  }
}
```

**What's happening:**
- The game loop now receives `timestamp` from `requestAnimationFrame` and computes `dt` (delta time in seconds, capped at 0.05 to prevent huge jumps on tab switches).
- `update()` runs only when `state.started` is true (after the player clicks the start overlay). It fades out status messages and calls the economy system.
- `economySystem.resetTick()` is called at start to synchronize the first tick with the current time, preventing an immediate tick on game start.
- The render pipeline is unchanged -- the HUD automatically displays the updated money and tick count.

---

### 3. Understanding the Economic Cycle

Here is the complete flow of a single economic tick:

```
1. Check if enough time has passed (3000 / speed ms)
2. Increment state.tick
3. Count factory levels across the grid
4. Calculate income:
   - hapFactor = happiness / 50 (range: 0 to 2)
   - taxIncome = population * 2 * hapFactor
   - factoryIncome = factoryLevels * 50
   - totalIncome = taxIncome + factoryIncome
5. Calculate upkeep:
   - upkeep = population * 0.5
6. Update money: money += income - upkeep
7. Check for shortages and display warnings
```

**Example at tick 10:**
- 5 houses (50 pop), 2 farms, 1 factory, 1 power plant
- Happiness: 50 + 0 + 4 + (-5) + (-3) = 46%
- hapFactor: 46 / 50 = 0.92
- Tax income: 50 * 2 * 0.92 = 92
- Factory income: 1 * 50 = 50
- Total income: 142
- Upkeep: 50 * 0.5 = 25
- Net per tick: +$117

---

## Test It

1. **Run:** `npm run dev`
2. **Open:** the City Builder game
3. **Observe:**
   - Click to start, then place a few **houses** and a **factory**
   - Watch the **money counter** increase every 3 seconds as income ticks in
   - Press **+** to speed up to 2x or 3x -- ticks happen faster
   - Press **-** to slow back down
   - Place only houses (no farms) -- after a few ticks, see **"Food shortage! Build farms!"** warning
   - Let food go negative and watch the warning repeat every tick
   - Place only houses (no power plants) -- see **"Power shortage!"** warning
   - Build a healthy mix and watch money steadily grow
   - Open the browser console and verify `state.tick` increments

---

## Challenges

**Easy:**
- Change the tick interval from 3000ms to 5000ms for a slower, more strategic pace.
- Modify the upkeep formula from `0.5` to `1.0` per citizen and see how it changes the balance.

**Medium:**
- Add a "bankrupt" game-over condition: if money goes below -500, show a game-over overlay. The player must restart or load a save.

**Hard:**
- Implement happiness decay: if food or power is negative, happiness decreases by 2 per tick. If both are negative, it decreases by 5 per tick. This creates cascading crises the player must manage.

---

## What You Learned

- Implementing a tick-based simulation with configurable speed
- Calculating income from multiple sources (population tax + factory output)
- Scaling income with a happiness multiplier for strategic depth
- Using delta time for frame-independent message fading
- Warning players about resource shortages with repeating messages

**Next:** UI & Polish -- add resource bars, building tooltips, and a demolish tool!
