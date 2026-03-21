# Step 7: Save/Load & Final Integration

**Goal:** Persist the city to localStorage, register the game with the platform, and bring all systems together into the final build.

**Time:** ~15 minutes

---

## What You'll Build

- **Save/load system** that persists the city grid and resources to localStorage
- **Auto-save** that triggers every 30 seconds and on exit
- **Game registration** with the platform adapter pattern for menu integration
- **Complete game definition** with icon, description, help text, and controls
- **The final, complete City Builder** with all systems working together

---

## Concepts

- **Serialization**: The grid contains objects with `Building | null` entries. We serialize the grid as a flat JSON array, converting each building to a simple object (no class instances, no circular references). On load, we reconstruct the grid and recalculate stats.
- **Auto-Save Pattern**: A timer in the economy update checks if 30 seconds have passed since the last save. Combined with a save-on-exit, this ensures progress is never lost to a crash or accidental tab close.
- **Platform Adapter**: The `PlatformAdapter` implements a `GameInstance` interface with `start()` and `destroy()` methods. The `GameDefinition` provides metadata (name, icon, description, controls) so the menu can list the game without importing the engine.
- **Clean Architecture Review**: The final codebase has clear separation: `types.ts` (data), `data/buildings.ts` (configuration), `systems/` (logic), `renderers/` (display), `CityEngine.ts` (orchestration), `adapters/` (platform integration).

---

## Code

### 1. Add Save/Load to the Engine

**File:** `src/contexts/canvas2d/games/city-builder/CityEngine.ts`

Add `save()` and `load()` methods, plus auto-save in the update loop.

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

const SAVE_KEY = 'city-builder-save';
const AUTO_SAVE_INTERVAL = 30_000; // 30 seconds

export class CityEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private state: CityState;
  private running = false;
  private rafId = 0;
  private lastTime = 0;
  private lastSaveTime = 0;

  // Systems
  private gridSystem: GridSystem;
  private economySystem: EconomySystem;
  private statsSystem: StatsSystem;
  private inputSystem: InputSystem;

  // Renderers
  private gridRenderer: GridRenderer;
  private panelRenderer: PanelRenderer;
  private hudRenderer: HUDRenderer;

  constructor(canvas: HTMLCanvasElement, onExit: () => void) {
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

    // Attempt to load saved game
    this.load();

    this.inputSystem = new InputSystem(
      canvas,
      this.state,
      this.gridSystem,
      this.statsSystem,
      () => {
        this.save();
        onExit();
      },
      showMessage,
    );

    this.gridRenderer = new GridRenderer();
    this.panelRenderer = new PanelRenderer(canvas);
    this.hudRenderer = new HUDRenderer(canvas);
  }

  start(): void {
    this.running = true;
    this.lastTime = performance.now();
    this.lastSaveTime = this.lastTime;
    this.economySystem.resetTick(this.lastTime);
    this.inputSystem.attach();
    this.loop(this.lastTime);
  }

  destroy(): void {
    this.save();
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
    this.state.messageTimer = Math.max(0, this.state.messageTimer - dt);
    this.economySystem.update(this.state, dt, now);

    // Auto-save
    if (now - this.lastSaveTime >= AUTO_SAVE_INTERVAL) {
      this.lastSaveTime = now;
      this.save();
    }
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

  private save(): void {
    try {
      const data = {
        grid: this.state.grid,
        cols: this.state.cols,
        rows: this.state.rows,
        money: this.state.money,
        tick: this.state.tick,
        speed: this.state.speed,
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch {
      // localStorage may be unavailable in some environments
    }
  }

  private load(): void {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return;

      const data = JSON.parse(raw);

      // Only restore if grid dimensions match
      if (data.cols !== this.state.cols || data.rows !== this.state.rows) return;

      this.state.grid = data.grid;
      this.state.money = data.money ?? 1000;
      this.state.tick = data.tick ?? 0;
      this.state.speed = data.speed ?? 1;
      this.state.started = true;

      // Recalculate derived stats from the loaded grid
      this.statsSystem.recalcStats(this.state);
    } catch {
      // Corrupted save -- start fresh
    }
  }
}
```

**What's happening:**
- `save()` serializes the grid, dimensions, money, tick count, and speed to localStorage under the key `'city-builder-save'`. Resources like population and happiness are *not* saved because they are derived from the grid by `StatsSystem`.
- `load()` is called in the constructor. It reads the saved data, verifies the grid dimensions match (they could differ if the player resized their window), restores the state, and recalculates stats. If anything goes wrong, it silently starts fresh.
- Auto-save runs in `update()` every 30 seconds using a timestamp comparison, just like the economy tick.
- Save-on-exit is triggered in two places: the `onExit` callback wraps the original `onExit` with a `save()` call, and `destroy()` also calls `save()`.

---

### 2. Create the Game Definition

**File:** `src/contexts/canvas2d/games/city-builder/index.ts`

Register the game with the platform, providing metadata for the menu.

```typescript
import { PlatformAdapter } from './adapters/PlatformAdapter';

export const CityBuilderGame = {
  id: 'city-builder',
  category: 'strategy' as const,
  name: 'City Builder',
  description: 'Build and manage your city!',
  icon: '\u{1F3D9}\uFE0F',
  color: '#3498db',
  help: {
    goal: 'Build a thriving city by managing population, food, power, and happiness.',
    controls: [
      { key: '1-6', action: 'Select building type' },
      { key: 'Click', action: 'Place building on grid' },
      { key: '+/-', action: 'Change game speed' },
      { key: 'ESC', action: 'Exit to menu' },
    ],
    tips: [
      'Build houses for population, farms for food, power plants for energy',
      'Factories generate income but reduce happiness',
      'Parks boost happiness -- place them near houses',
      'Watch your food and power -- shortages cause problems',
    ],
  },
  create(canvas: HTMLCanvasElement, onExit: () => void) {
    const inst = new PlatformAdapter(canvas, onExit);
    inst.start();
    return inst;
  },
};
```

**What's happening:**
- `CityBuilderGame` is the complete game definition. The `id` is used for routing, `icon` and `color` for the menu card, and `help` for the in-game help overlay.
- `create()` is a factory function: it receives a canvas and exit callback, creates the adapter, starts the game, and returns the instance. The platform calls `instance.destroy()` when the player navigates away.
- The `controls` array lists keyboard shortcuts. The `tips` array provides gameplay hints.

---

### 3. Final Architecture Overview

Here is the complete file structure and how the pieces connect:

```
src/contexts/canvas2d/games/city-builder/
  types.ts                    -- BuildingType, Building, CityState, constants
  data/buildings.ts           -- BUILDING_DEFS lookup table, BUILDING_TYPES array
  systems/
    GridSystem.ts             -- Grid creation, pixel-to-cell, placement
    StatsSystem.ts            -- Resource recalculation from grid
    EconomySystem.ts          -- Tick-based income/upkeep/warnings
    InputSystem.ts            -- Mouse + keyboard handling, demolish, upgrade
  renderers/
    GridRenderer.ts           -- Terrain, buildings, level badges, hover
    PanelRenderer.ts          -- Bottom building selection cards
    HUDRenderer.ts            -- Top resource bar, messages, start overlay
  CityEngine.ts               -- Orchestrator: init, loop, update, render, save/load
  adapters/PlatformAdapter.ts -- Thin wrapper for platform integration
  index.ts                    -- Game definition with metadata
```

**Data flow:**
1. `InputSystem` receives user events and mutates `CityState`
2. `StatsSystem` recalculates derived stats after mutations
3. `EconomySystem` runs periodic ticks to update money
4. `GridRenderer`, `PanelRenderer`, `HUDRenderer` read `CityState` and draw
5. `CityEngine` orchestrates the loop: input -> update -> render
6. Save/load serializes `CityState` to localStorage

---

## Test It

1. **Run:** `npm run dev`
2. **Open:** the City Builder game
3. **Observe:**
   - Build a city with several buildings
   - Press **Escape** or click **"< EXIT"** to leave
   - Re-open the City Builder -- your city is **restored** from localStorage
   - Wait 30+ seconds and check `localStorage.getItem('city-builder-save')` in the console -- auto-save is working
   - **Resize your window** to different dimensions, then reload -- if the grid size changed, you start fresh (dimensions mismatch)
   - Verify all features work together:
     - **Placement** with cost deduction
     - **Upgrade** by clicking same-type on existing building
     - **Demolish** by clicking with no tool selected
     - **Economy** ticking at configurable speed
     - **Resource tracking** with color-coded HUD
     - **Shortage warnings** for food and power
     - **Speed control** with +/- keys

---

## Challenges

**Easy:**
- Add a "New Game" button that clears localStorage and resets the state.
- Show a "Game saved!" message when auto-save triggers.

**Medium:**
- Save multiple cities by adding a city name prompt. Store each city under a separate localStorage key (e.g., `city-builder-save-MyCity`).

**Hard:**
- Implement import/export: add a button that copies the save data to the clipboard as a base64 string, and another button that imports a pasted string. This lets players share cities.

---

## What You Learned

- Serializing game state to localStorage with `JSON.stringify`/`JSON.parse`
- Separating persisted state (grid, money) from derived state (population, happiness)
- Implementing auto-save with a timestamp interval in the update loop
- Registering a game with the platform using a factory pattern
- The complete architecture: types, data, systems, renderers, engine, adapter

**Congratulations!** You have built a complete City Builder from scratch. You learned grid-based building placement, resource economy simulation, tick-based updates, multi-layer canvas rendering, and state persistence. Continue to [Ant Colony](../46-ant-colony/README.md) to explore emergent behavior and pheromone trail simulation!
