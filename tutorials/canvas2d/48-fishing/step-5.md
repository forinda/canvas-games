# Step 5: Fish Catalog & Polish

**Goal:** Add a persistent fish collection log, species discovery tracking, and final polish to complete the game.

**Time:** ~15 minutes

---

## What You'll Build

- **Catalog system** with localStorage persistence for caught fish records
- **Catalog overlay** showing all 12 species in a grid, with discovered vs. undiscovered states
- **Species counter** in the stats HUD showing discovery progress
- **Best size tracking** per species and total points accumulation
- **Complete game integration** with the platform adapter and entry point

---

## Concepts

- **Catalog Persistence**: The `CatalogSystem` serializes the catalog `Map` to JSON and stores it in `localStorage`. On load, it deserializes back into a `Map`, restoring all catch history across browser sessions.
- **Map-to-Object Serialization**: JavaScript `Map` objects cannot be directly JSON-serialized. We convert to a plain `Record<string, CatalogEntry>` for storage and back to a `Map` on load using `Object.entries()`.
- **Discovery Tracking**: Each fish species starts as "undiscovered" (shown as `??? rarity` in the catalog). Catching one reveals its name, icon, and stats. The species counter (`3/12 species discovered`) motivates completionist play.
- **Best Size Records**: Each catalog entry tracks the largest specimen caught (`bestSize`). This adds replayability -- even after discovering all species, players can chase personal records.
- **Catch Detection Pattern**: The engine detects a new catch by comparing `lastCatch` references and checking for a `reeling -> idle` phase transition. This avoids duplicating catch logic across systems.

---

## Code

### 1. Create the Catalog System

**File:** `src/contexts/canvas2d/games/fishing/systems/CatalogSystem.ts`

Manages loading, saving, and recording catches in the persistent catalog.

```typescript
import type { FishingState, CatalogEntry, CaughtFish } from '../types';
import { STORAGE_KEY } from '../types';

export class CatalogSystem {
  /** Load catalog from localStorage into state */
  load(state: FishingState): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);

      if (raw) {
        const entries: Record<string, CatalogEntry> = JSON.parse(raw);
        state.catalog = new Map(Object.entries(entries));

        // Restore totals from saved data
        let score = 0;
        let count = 0;
        for (const entry of state.catalog.values()) {
          score += entry.totalPoints;
          count += entry.count;
        }
        state.totalScore = score;
        state.totalCaught = count;
      }
    } catch {
      // Corrupted data — start fresh
      state.catalog = new Map();
    }
  }

  /** Save catalog to localStorage */
  save(state: FishingState): void {
    try {
      const obj: Record<string, CatalogEntry> = {};
      for (const [key, val] of state.catalog) {
        obj[key] = val;
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
    } catch {
      // Storage full or unavailable
    }
  }

  /** Record a caught fish in the catalog */
  recordCatch(state: FishingState, caught: CaughtFish): void {
    const key = caught.fish.name;
    const existing = state.catalog.get(key);

    if (existing) {
      existing.count += 1;
      existing.bestSize = Math.max(existing.bestSize, caught.size);
      existing.totalPoints += caught.fish.points;
    } else {
      state.catalog.set(key, {
        name: caught.fish.name,
        count: 1,
        bestSize: caught.size,
        totalPoints: caught.fish.points,
        firstCaught: caught.timestamp,
      });
    }

    this.save(state);
  }
}
```

**What's happening:**
- `load()` wraps the `localStorage.getItem` and `JSON.parse` calls in a try/catch. If the stored data is corrupted or the format has changed, the catalog gracefully resets to empty rather than crashing.
- When loading, totals (score and catch count) are rebuilt by iterating catalog entries rather than storing them separately. This ensures totals are always consistent with the catalog data.
- `recordCatch()` checks whether the species already exists in the catalog. If so, it increments the count, updates the best size if the new catch is larger, and adds points. If not, it creates a new entry with `firstCaught` set to the current timestamp.
- `save()` converts the `Map` to a plain object using a `for...of` loop over entries, then stringifies and stores it. The reverse conversion in `load()` uses `new Map(Object.entries(parsed))`.

---

### 2. Update the HUD Renderer -- Catalog Overlay

**File:** `src/contexts/canvas2d/games/fishing/renderers/HUDRenderer.ts`

Add the species counter to stats and the full catalog overlay.

```typescript
// Update drawStats to include species counter:

private drawStats(ctx: CanvasRenderingContext2D, state: FishingState): void {
  ctx.font = 'bold 16px monospace';
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(`Score: ${state.totalScore}`, 16, 16);
  ctx.font = '13px monospace';
  ctx.fillStyle = '#aaa';
  ctx.fillText(`Fish caught: ${state.totalCaught}`, 16, 38);
  ctx.fillText(`Species: ${state.catalog.size}/${FISH_SPECIES.length}`, 16, 56);
}

// Add to the render() method, after the phase switch:
//   if (state.showCatalog) {
//     this.drawCatalog(ctx, state, W, H);
//   }

// Add this method:

private drawCatalog(
  ctx: CanvasRenderingContext2D, state: FishingState, W: number, H: number
): void {
  // Dim overlay
  ctx.fillStyle = 'rgba(0,0,0,0.85)';
  ctx.fillRect(0, 0, W, H);

  const panelW = Math.min(600, W * 0.8);
  const panelH = Math.min(520, H * 0.85);
  const px = (W - panelW) / 2;
  const py = (H - panelH) / 2;

  // Panel background
  ctx.fillStyle = '#12121f';
  ctx.beginPath();
  ctx.roundRect(px, py, panelW, panelH, 12);
  ctx.fill();

  // Panel border
  ctx.strokeStyle = '#0288d1';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(px, py, panelW, panelH, 12);
  ctx.stroke();

  // Title
  ctx.font = 'bold 20px monospace';
  ctx.fillStyle = '#0288d1';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('Fish Catalog', W / 2, py + 16);

  // Discovery count
  ctx.font = '12px monospace';
  ctx.fillStyle = '#888';
  ctx.fillText(
    `${state.catalog.size}/${FISH_SPECIES.length} species discovered`,
    W / 2, py + 42
  );

  // Fish grid (2 columns)
  let row = 0;
  const startY = py + 68;
  const colW = panelW / 2 - 20;

  for (let i = 0; i < FISH_SPECIES.length; i++) {
    const fish = FISH_SPECIES[i];
    const entry = state.catalog.get(fish.name);
    const col = i % 2;

    if (i % 2 === 0 && i > 0) row++;

    const fx = px + 20 + col * (colW + 20);
    const fy = startY + row * 36;

    if (fy + 36 > py + panelH - 30) break; // overflow guard

    if (entry) {
      // Discovered — show icon, name, catch count, best size
      ctx.font = '14px monospace';
      ctx.fillStyle = RARITY_COLORS[fish.rarity];
      ctx.textAlign = 'left';
      ctx.fillText(`${fish.icon} ${fish.name}`, fx, fy);

      ctx.font = '11px monospace';
      ctx.fillStyle = '#888';
      ctx.fillText(`x${entry.count}  best: ${entry.bestSize}cm`, fx + 8, fy + 18);
    } else {
      // Undiscovered — show mystery placeholder
      ctx.font = '14px monospace';
      ctx.fillStyle = '#444';
      ctx.textAlign = 'left';
      ctx.fillText(`??? ${fish.rarity}`, fx, fy);
    }
  }

  // Close hint
  ctx.font = '12px monospace';
  ctx.fillStyle = '#555';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText('Press [C] to close', W / 2, py + panelH - 8);
}
```

**What's happening:**
- The catalog overlay dims the entire screen with 85% black, then draws a centered dark panel with a blue border matching the game's theme color (`#0288d1`).
- Species are laid out in a two-column grid. Each row is 36 pixels tall, with discovered fish showing their icon, rarity-colored name, catch count (`x3`), and best size (`best: 45.2cm`).
- Undiscovered species show as `??? common` (or `??? legendary`, etc.) in dark gray, hinting at what rarity tier remains to be found without revealing the species name.
- The discovery counter at the top (`3/12 species discovered`) gives the player a clear completionist goal.
- An overflow guard (`if (fy + 36 > py + panelH - 30) break`) prevents entries from drawing outside the panel if the screen is very small.

---

### 3. Update the Engine -- Full Integration

**File:** `src/contexts/canvas2d/games/fishing/FishingEngine.ts`

Wire up the CatalogSystem and catch detection.

```typescript
import type { FishingState } from './types';
import { InputSystem } from './systems/InputSystem';
import { CastingSystem } from './systems/CastingSystem';
import { FishingSystem } from './systems/FishingSystem';
import { CatalogSystem } from './systems/CatalogSystem';
import { SceneRenderer } from './renderers/SceneRenderer';
import { HUDRenderer } from './renderers/HUDRenderer';

export class FishingEngine {
  private ctx: CanvasRenderingContext2D;
  private state: FishingState;
  private running = false;
  private rafId = 0;
  private lastTime = 0;

  private inputSystem: InputSystem;
  private castingSystem: CastingSystem;
  private fishingSystem: FishingSystem;
  private catalogSystem: CatalogSystem;
  private sceneRenderer: SceneRenderer;
  private hudRenderer: HUDRenderer;
  private resizeHandler: () => void;
  private canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement, onExit: () => void) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    this.state = this.createInitialState();

    // Systems
    this.castingSystem = new CastingSystem();
    this.fishingSystem = new FishingSystem();
    this.catalogSystem = new CatalogSystem();
    this.sceneRenderer = new SceneRenderer();
    this.hudRenderer = new HUDRenderer();

    this.inputSystem = new InputSystem(
      this.state,
      canvas,
      onExit,
      () => { this.state.showCatalog = !this.state.showCatalog; },
      () => {}, // help toggle placeholder
    );

    // Load persisted catalog
    this.catalogSystem.load(this.state);

    // Resize handler
    this.resizeHandler = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      this.state.width = canvas.width;
      this.state.height = canvas.height;
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
    const dt = Math.min((now - this.lastTime) / 1000, 0.1);
    this.lastTime = now;

    this.update(dt);
    this.render();

    this.rafId = requestAnimationFrame(() => this.loop());
  }

  private update(dt: number): void {
    const s = this.state;

    s.time += dt;
    s.waterOffset += dt * 40;

    if (s.paused || s.showCatalog) return;

    // Update catch popup timer
    if (s.catchPopupTimer > 0) {
      s.catchPopupTimer -= dt;
    }

    // Track previous phase to detect catch
    const prevCatch = s.lastCatch;
    const prevPhase = s.phase;

    this.castingSystem.update(s, dt);
    this.fishingSystem.update(s, dt);

    // Detect new catch (phase went from reeling to idle with new lastCatch)
    if (s.lastCatch && s.lastCatch !== prevCatch
        && s.phase === 'idle' && prevPhase === 'reeling') {
      this.catalogSystem.recordCatch(s, s.lastCatch);
    }

    // Update bobber animation during waiting/hooking
    if (s.phase === 'waiting' || s.phase === 'hooking') {
      s.bobberBobTime += dt;
    }
  }

  private render(): void {
    this.ctx.clearRect(0, 0, this.state.width, this.state.height);
    this.sceneRenderer.render(this.ctx, this.state);
    this.hudRenderer.render(this.ctx, this.state);
  }

  private createInitialState(): FishingState {
    return {
      phase: 'idle',
      width: this.canvas.width,
      height: this.canvas.height,

      castPower: 0,
      castCharging: false,
      castDistance: 0,

      waitTimer: 0,
      waitElapsed: 0,
      bobberX: 0,
      bobberY: 0,
      bobberBobTime: 0,
      fishBiting: false,

      hookWindowTimer: 0,
      hookWindowDuration: 1.5,
      hookSuccess: false,

      reelTension: 0.5,
      reelProgress: 0,
      reelHolding: false,
      currentFish: null,
      currentFishSize: 0,
      fishFightTimer: 0,
      fishFightDir: 1,

      lastCatch: null,
      catchPopupTimer: 0,

      catalog: new Map(),
      totalScore: 0,
      totalCaught: 0,

      paused: false,
      showCatalog: false,
      time: 0,

      waterOffset: 0,
    };
  }
}
```

**What's happening:**
- The engine now creates all six components: InputSystem, CastingSystem, FishingSystem, CatalogSystem, SceneRenderer, and HUDRenderer. This is the final architecture.
- `catalogSystem.load()` runs in the constructor, restoring any previously saved catalog data before the first frame renders. The player sees their historical stats immediately.
- Catch detection uses a reference comparison pattern: `s.lastCatch !== prevCatch` checks if the FishingSystem created a new `CaughtFish` object this frame. Combined with the phase transition check (`prevPhase === 'reeling'` and `s.phase === 'idle'`), this reliably detects exactly one catch event per fish.
- When `showCatalog` is true, the update function returns early after advancing animation timers. This pauses gameplay while the catalog is open but keeps the water waves moving.

---

### 4. Create the Platform Adapter

**File:** `src/contexts/canvas2d/games/fishing/adapters/PlatformAdapter.ts`

The final adapter accepts an `onExit` callback.

```typescript
import { FishingEngine } from '../FishingEngine';

export class PlatformAdapter {
  private engine: FishingEngine;

  constructor(canvas: HTMLCanvasElement, onExit: () => void) {
    this.engine = new FishingEngine(canvas, onExit);
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

### 5. Create the Entry Point

**File:** `src/contexts/canvas2d/games/fishing/index.ts`

Exports the game definition for the platform menu.

```typescript
import { PlatformAdapter } from './adapters/PlatformAdapter';

export const FishingGame = {
  id: 'fishing',
  name: 'Fishing',
  description: 'Cast your line, hook fish, and complete your catalog!',
  icon: '🎣',
  color: '#0288d1',
  create(canvas: HTMLCanvasElement, onExit: () => void) {
    const instance = new PlatformAdapter(canvas, onExit);
    instance.start();
    return instance;
  },
};
```

---

## Test It

1. **Run:** `npm run dev`
2. **Open:** the Fishing game in your browser
3. **Test the complete game:**
   - **Catch a few fish** using the full cast -> wait -> hook -> reel flow
   - Press **[C]** to open the **Fish Catalog** -- see your discovered species with catch counts and best sizes
   - Notice **undiscovered species** shown as `??? common`, `??? rare`, etc.
   - Check the **species counter** in the top-left: `Species: 2/12`
   - **Refresh the browser** and verify your catalog data persists (score, catch count, species)
   - Try **long casts** (release at 80%+ power) to encounter uncommon and rare fish
   - Catch a **rare or legendary** fish -- notice the rarity-colored border on the catch popup
   - Open the catalog again and see the new species revealed with its icon and stats
   - Try to **beat your best size** for a species you have already caught
   - Press **[ESC]** to exit back to the game menu

---

## Challenges

**Easy:**
- Add a "NEW!" badge next to a species the first time it appears in the catalog (check if `entry.count === 1`).
- Change the catalog panel border color to gold (`#ffd54f`) when all 12 species are discovered.

**Medium:**
- Add a "total play time" stat that persists in localStorage alongside the catalog, showing hours and minutes spent fishing.

**Hard:**
- Implement a "daily challenge" system: each day, one random species gives double points. Display a highlighted entry in the catalog and a banner on the main screen.

---

## What You Learned

- Persisting game data with `localStorage` using Map-to-Object serialization
- Building a discovery/collection system with revealed vs. hidden entries
- Detecting game events (catches) through reference comparison and phase transitions
- Creating a full-screen overlay UI with a scrollable grid layout
- Structuring a complete game with six decoupled components: InputSystem, CastingSystem, FishingSystem, CatalogSystem, SceneRenderer, and HUDRenderer

---

## Complete Architecture

Here is the final file structure for the Fishing game:

```
src/contexts/canvas2d/games/fishing/
  types.ts                    — State types, Fish interface, rarity colors
  FishingEngine.ts            — Main engine: loop, update, render, catch detection
  index.ts                    — Game definition and entry point
  adapters/
    PlatformAdapter.ts        — Thin wrapper for host platform integration
  data/
    fish.ts                   — 12 fish species + weighted random picker
  renderers/
    SceneRenderer.ts          — Sky, water, dock, fisher, line, bobber
    HUDRenderer.ts            — Stats, power meter, hook alert, tension bar, catalog
  systems/
    InputSystem.ts            — Keyboard/mouse → state flags
    CastingSystem.ts          — Power oscillation + bobber positioning
    FishingSystem.ts          — Wait/hook/reel logic + catch/fail
    CatalogSystem.ts          — localStorage persistence + catch recording
```

Congratulations -- you have built a complete fishing game with cast mechanics, a tension minigame, fish AI, and a persistent collection system!

**Next Game:** Continue to [Idle Clicker](../49-idle-clicker/README.md) -- where you will learn exponential scaling and offline progress!
