# Step 3: Resource System

**Goal:** Track money, power, water/food, and happiness; buildings consume and produce resources on placement.

**Time:** ~15 minutes

---

## What You'll Build

- **StatsSystem** that recalculates population, happiness, power, and food every time a building is placed
- **Resource balancing** where houses consume power and food, farms produce food, power plants produce power
- **Stat-aware HUD** showing all five resource counters with color-coded warnings
- **Negative resource feedback** so the player sees when power or food runs out

---

## Concepts

- **Resource Aggregation**: Every time the grid changes, we iterate all buildings and sum their contributions. A house adds 10 population but consumes 2 power and 3 food. The totals start from base values (50 happiness, 10 power, 20 food) so the player has a buffer before needing infrastructure.
- **Stat Clamping**: Happiness is clamped between 0 and 100. Power and food can go negative -- this signals a shortage the player must fix.
- **Level Scaling**: Each building has a `level` field. Stats scale linearly: a level-2 farm produces 20 food instead of 10. This prepares us for upgrades in later steps.
- **Color-Coded Warnings**: Green means healthy, yellow means caution, red means crisis. The HUD colors shift automatically based on threshold values.

---

## Code

### 1. Create the Stats System

**File:** `src/games/city-builder/systems/StatsSystem.ts`

Recalculates all resource totals from the grid.

```typescript
import type { CityState } from '../types';
import { BUILDING_DEFS } from '../data/buildings';

export class StatsSystem {
  recalcStats(state: CityState): void {
    let pop = 0,
      hap = 50,
      pow = 10,
      food = 20;

    for (const row of state.grid) {
      for (const b of row) {
        if (!b) continue;

        const def = BUILDING_DEFS[b.type];

        pop += def.pop * b.level;
        hap += def.happiness * b.level;
        pow += def.power * b.level;
        food += def.food * b.level;
      }
    }

    state.population = pop;
    state.happiness = Math.max(0, Math.min(100, hap));
    state.power = pow;
    state.food = food;
  }
}
```

**What's happening:**
- We start from base values: 50 happiness, 10 power, 20 food. These represent the city's natural state before any buildings.
- For each building on the grid, we add its stat contributions multiplied by its level. A level-1 house adds `10 * 1 = 10` population and consumes `2 * 1 = 2` power.
- Happiness is clamped to 0-100 because it represents a percentage. Power and food are unclamped -- negative values mean shortage.
- This function is called every time a building is placed (and later, demolished), so the HUD always shows current totals.

---

### 2. Create the HUD Renderer

**File:** `src/games/city-builder/renderers/HUDRenderer.ts`

Draws the top bar with resource counters, speed indicator, and status messages.

```typescript
import type { CityState } from '../types';
import { HUD_HEIGHT } from '../types';

export class HUDRenderer {
  private canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
  }

  render(ctx: CanvasRenderingContext2D, state: CityState): void {
    const s = state;
    const W = this.canvas.width;
    const H = this.canvas.height;

    // HUD background
    ctx.fillStyle = '#0d1a0d';
    ctx.fillRect(0, 0, W, HUD_HEIGHT);
    ctx.fillStyle = '#2a4a2a';
    ctx.fillRect(0, HUD_HEIGHT - 2, W, 2);

    ctx.font = 'bold 13px monospace';
    ctx.textBaseline = 'middle';
    const cy = HUD_HEIGHT / 2;

    // Resource stats
    let hx = 20;
    const stats: [string, string, string][] = [
      ['\u{1F465}', `${s.population}`, '#3498db'],
      ['\u{1F4B0}', `${s.money}`, '#f1c40f'],
      ['\u{1F60A}', `${s.happiness}%`,
        s.happiness > 60 ? '#2ecc71' : s.happiness > 30 ? '#f39c12' : '#e74c3c'],
      ['\u26A1', `${s.power}`, s.power >= 0 ? '#f39c12' : '#e74c3c'],
      ['\u{1F33E}', `${s.food}`, s.food >= 0 ? '#6abf45' : '#e74c3c'],
    ];

    for (const [icon, val, color] of stats) {
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(icon, hx, cy);
      ctx.font = 'bold 12px monospace';
      ctx.fillStyle = color;
      ctx.fillText(val, hx + 22, cy);
      hx += 80;
    }

    // Speed indicator
    ctx.fillStyle = '#666';
    ctx.font = '12px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`Speed: ${'\u25B6'.repeat(s.speed)} [+/-]`, W - 12, cy);

    // Status message
    if (s.message && s.messageTimer > 0) {
      ctx.fillStyle = `rgba(0,0,0,${Math.min(0.7, s.messageTimer)})`;
      ctx.fillRect(0, HUD_HEIGHT + 4, W, 28);
      ctx.font = 'bold 13px monospace';
      ctx.fillStyle = '#f39c12';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(s.message, W / 2, HUD_HEIGHT + 18);
    }

    // Start overlay
    if (!s.started) {
      this.drawOverlay(ctx, W, H,
        'CITY BUILDER',
        'Select a building from the panel, click the grid to place.\nManage population, food, power, and happiness!',
        '#3498db');
    }
  }

  private drawOverlay(
    ctx: CanvasRenderingContext2D,
    W: number, H: number,
    title: string, sub: string, color: string
  ): void {
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `bold ${Math.min(52, W * 0.06)}px monospace`;
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 20;
    ctx.fillText(title, W / 2, H * 0.35);
    ctx.shadowBlur = 0;
    ctx.font = `${Math.min(14, W * 0.02)}px monospace`;
    ctx.fillStyle = '#aaa';
    sub.split('\n').forEach((line, i) =>
      ctx.fillText(line, W / 2, H * 0.48 + i * 22));
  }
}
```

**What's happening:**
- Five resource counters are drawn horizontally: population (blue), money (gold), happiness (green/yellow/red based on value), power (yellow or red if negative), food (green or red if negative).
- Each counter is an emoji icon followed by the numeric value in the appropriate color. The spacing is 80px per counter.
- The speed indicator on the right shows 1-3 play arrows and the +/- hotkey hint.
- Messages (like "Not enough money!") appear in a semi-transparent bar below the HUD and fade out as `messageTimer` decreases.
- Before the game starts, a full-screen overlay shows the title and instructions.

---

### 3. Update the Input System

**File:** `src/games/city-builder/systems/InputSystem.ts`

Add `StatsSystem` to recalculate resources after each placement.

```typescript
import type { CityState } from '../types';
import { BUILDING_DEFS, BUILDING_TYPES } from '../data/buildings';
import type { GridSystem } from './GridSystem';
import type { StatsSystem } from './StatsSystem';

export class InputSystem {
  private canvas: HTMLCanvasElement;
  private state: CityState;
  private gridSystem: GridSystem;
  private statsSystem: StatsSystem;
  private showMessage: (msg: string) => void;
  private clickHandler: (e: MouseEvent) => void;
  private moveHandler: (e: MouseEvent) => void;
  private keyHandler: (e: KeyboardEvent) => void;

  constructor(
    canvas: HTMLCanvasElement,
    state: CityState,
    gridSystem: GridSystem,
    statsSystem: StatsSystem,
    showMessage: (msg: string) => void,
  ) {
    this.canvas = canvas;
    this.state = state;
    this.gridSystem = gridSystem;
    this.statsSystem = statsSystem;
    this.showMessage = showMessage;

    this.clickHandler = (e) => this.handleClick(e);
    this.moveHandler = (e) => this.handleMove(e);
    this.keyHandler = (e) => {
      const num = parseInt(e.key);
      if (num >= 1 && num <= 6)
        this.state.selectedType = BUILDING_TYPES[num - 1];
      if (e.key === '+' || e.key === '=')
        this.state.speed = Math.min(3, this.state.speed + 1);
      if (e.key === '-')
        this.state.speed = Math.max(1, this.state.speed - 1);
    };
  }

  attach(): void {
    this.canvas.addEventListener('click', this.clickHandler);
    this.canvas.addEventListener('mousemove', this.moveHandler);
    window.addEventListener('keydown', this.keyHandler);
  }

  detach(): void {
    this.canvas.removeEventListener('click', this.clickHandler);
    this.canvas.removeEventListener('mousemove', this.moveHandler);
    window.removeEventListener('keydown', this.keyHandler);
  }

  private getCoords(e: MouseEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (this.canvas.width / rect.width),
      y: (e.clientY - rect.top) * (this.canvas.height / rect.height),
    };
  }

  private handleClick(e: MouseEvent): void {
    const { x, y } = this.getCoords(e);
    const s = this.state;

    if (!s.started) {
      s.started = true;
      return;
    }

    // Panel click
    const panelY = this.canvas.height - 90;
    if (y >= panelY) {
      const cardW = 80, pad = 10;
      for (let i = 0; i < BUILDING_TYPES.length; i++) {
        const cx = pad + i * (cardW + pad);
        if (x >= cx && x <= cx + cardW && y >= panelY + 10 && y <= panelY + 70) {
          s.selectedType = s.selectedType === BUILDING_TYPES[i] ? null : BUILDING_TYPES[i];
          return;
        }
      }
      return;
    }

    // Grid click
    const cell = this.gridSystem.pixelToCell(s, x, y);
    if (!cell || !s.selectedType) return;

    const { col, row } = cell;

    if (!this.gridSystem.isCellEmpty(s, col, row)) {
      this.showMessage('Cell already occupied!');
      return;
    }

    const def = BUILDING_DEFS[s.selectedType];
    if (s.money < def.cost) {
      this.showMessage('Not enough money!');
      return;
    }

    s.money -= def.cost;
    this.gridSystem.placeBuilding(s, {
      type: s.selectedType,
      col,
      row,
      level: 1,
    });

    // Recalculate resource totals after placement
    this.statsSystem.recalcStats(s);
  }

  private handleMove(e: MouseEvent): void {
    const { x, y } = this.getCoords(e);
    this.state.hoveredCell = this.gridSystem.pixelToCell(this.state, x, y);
  }
}
```

**What's happening:**
- The key change from Step 2: after placing a building, we call `this.statsSystem.recalcStats(s)` to update all resource totals.
- This means placing a house immediately shows +10 population, -2 power, -3 food in the HUD. The player gets instant feedback on every building's resource impact.

---

### 4. Update the Engine

**File:** `src/games/city-builder/CityEngine.ts`

Wire in the StatsSystem and HUDRenderer, replace the placeholder HUD.

```typescript
import type { CityState } from './types';
import { CELL_SIZE, HUD_HEIGHT } from './types';
import { GridSystem } from './systems/GridSystem';
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

  private gridSystem: GridSystem;
  private statsSystem: StatsSystem;
  private inputSystem: InputSystem;
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
    this.inputSystem.attach();
    this.loop();
  }

  destroy(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
    this.inputSystem.detach();
  }

  private loop(): void {
    if (!this.running) return;
    this.render();
    this.rafId = requestAnimationFrame(() => this.loop());
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
- The engine now creates and wires `StatsSystem` and `HUDRenderer`. The placeholder HUD text from Step 1 is gone -- `HUDRenderer` draws the real resource counters.
- The render pipeline is now three layers: grid (bottom), panel (bottom bar), HUD (top bar + overlay).
- `StatsSystem` is passed to `InputSystem` so stats are recalculated on every building placement.

---

## Test It

1. **Run:** `npm run dev`
2. **Open:** the City Builder game
3. **Observe:**
   - The **HUD** shows five resource counters: population, money, happiness, power, food
   - Place a **House** (press 1, click grid) -- population jumps to 10, power drops by 2, food drops by 3
   - Place a **Farm** (press 2) -- food increases by 10, happiness increases by 2
   - Place a **Power Plant** (press 6) -- power jumps by 30 but happiness drops by 3
   - Place a **Factory** (press 3) -- happiness drops by 5, power drops by 5
   - Watch the **color coding**: happiness turns yellow below 60%, red below 30%. Power and food turn red when negative
   - Build 4 houses without farms -- food goes **negative** and turns red

---

## Challenges

**Easy:**
- Change the base happiness from 50 to 75. Notice how many more factories you can build before happiness turns red.
- Modify the farm's food output from 10 to 15 and see how it changes the food balance.

**Medium:**
- Add a tooltip that appears when hovering over a HUD counter, showing a breakdown of what is contributing to that resource (e.g., "Power: +10 base, +30 power plant, -2 house = 38").

**Hard:**
- Implement a "forecast" that shows what the resource totals would be *before* placing a building. Display the projected change next to each HUD counter when hovering over an empty cell with a building selected.

---

## What You Learned

- Aggregating building stats by iterating the entire grid on each change
- Color-coding resource values based on threshold breakpoints
- Passing systems between components (StatsSystem used by InputSystem, rendered by HUDRenderer)
- Separating stat recalculation from rendering for clean architecture

**Next:** Population & Zones -- make residential zones grow population and commercial zones generate income!
