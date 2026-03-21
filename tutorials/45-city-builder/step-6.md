# Step 6: UI & Polish

**Goal:** Add resource bars, building tooltips, a demolish tool, and a start overlay with instructions.

**Time:** ~15 minutes

---

## What You'll Build

- **Demolish tool** that removes buildings and refunds 50% of their cost
- **Building tooltips** showing stat details when hovering over placed buildings
- **Exit button** in the HUD for returning to the menu
- **Resize handler** that keeps the canvas full-screen
- **Message timer fade** for smooth status message transitions

---

## Concepts

- **Demolish as a Tool**: Rather than adding a separate "demolish mode," we treat demolish as a special action. When no building type is selected and the player clicks an occupied cell, the building is removed. This keeps the interaction model simple -- select a building to place, deselect to demolish.
- **Tooltip Rendering**: When hovering over a building (with no tool selected), we draw a floating tooltip showing the building's name, level, and stat contributions. This gives the player information without cluttering the permanent UI.
- **Refund Economics**: Demolishing refunds 50% of the building's base cost multiplied by its level. A level-2 house ($100 base) refunds $100 (100 * 2 * 0.5). This prevents exploit cycling but still rewards cleanup.
- **Clean Lifecycle**: The `onExit` callback lets the engine notify its host when the player wants to leave. Combined with `destroy()`, this ensures all event listeners are cleaned up and no memory leaks occur.

---

## Code

### 1. Add Demolish and Exit to the Input System

**File:** `src/games/city-builder/systems/InputSystem.ts`

Add demolish-on-click-empty-selection and an exit button handler.

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
  private onExit: () => void;
  private showMessage: (msg: string) => void;
  private clickHandler: (e: MouseEvent) => void;
  private moveHandler: (e: MouseEvent) => void;
  private keyHandler: (e: KeyboardEvent) => void;
  private resizeHandler: () => void;

  constructor(
    canvas: HTMLCanvasElement,
    state: CityState,
    gridSystem: GridSystem,
    statsSystem: StatsSystem,
    onExit: () => void,
    showMessage: (msg: string) => void,
  ) {
    this.canvas = canvas;
    this.state = state;
    this.gridSystem = gridSystem;
    this.statsSystem = statsSystem;
    this.onExit = onExit;
    this.showMessage = showMessage;

    this.clickHandler = (e) => this.handleClick(e);
    this.moveHandler = (e) => this.handleMove(e);
    this.keyHandler = (e) => {
      if (e.key === 'Escape') {
        this.onExit();
        return;
      }

      const num = parseInt(e.key);
      if (num >= 1 && num <= 6)
        this.state.selectedType = BUILDING_TYPES[num - 1];

      if (e.key === '+' || e.key === '=')
        this.state.speed = Math.min(3, this.state.speed + 1);
      if (e.key === '-')
        this.state.speed = Math.max(1, this.state.speed - 1);
    };
    this.resizeHandler = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
  }

  attach(): void {
    this.canvas.addEventListener('click', this.clickHandler);
    this.canvas.addEventListener('mousemove', this.moveHandler);
    window.addEventListener('keydown', this.keyHandler);
    window.addEventListener('resize', this.resizeHandler);
  }

  detach(): void {
    this.canvas.removeEventListener('click', this.clickHandler);
    this.canvas.removeEventListener('mousemove', this.moveHandler);
    window.removeEventListener('keydown', this.keyHandler);
    window.removeEventListener('resize', this.resizeHandler);
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

    // Exit button (top-left corner)
    if (x < 80 && y < 40) {
      this.onExit();
      return;
    }

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
    if (!cell) return;

    const { col, row } = cell;
    const existing = s.grid[row]?.[col];

    // If no building selected and cell has a building: demolish
    if (!s.selectedType && existing) {
      const def = BUILDING_DEFS[existing.type];
      const refund = Math.round(def.cost * existing.level * 0.5);
      s.money += refund;
      s.grid[row][col] = null;
      this.statsSystem.recalcStats(s);
      this.showMessage(`Demolished ${def.name} (+$${refund})`);
      return;
    }

    if (!s.selectedType) return;

    const def = BUILDING_DEFS[s.selectedType];

    // Upgrade existing same-type building
    if (existing && existing.type === s.selectedType) {
      const upgradeCost = Math.round(def.cost * existing.level * 0.75);
      if (s.money < upgradeCost) {
        this.showMessage(`Upgrade costs $${upgradeCost}!`);
        return;
      }
      if (existing.level >= 3) {
        this.showMessage('Max level reached!');
        return;
      }
      s.money -= upgradeCost;
      existing.level++;
      this.statsSystem.recalcStats(s);
      this.showMessage(`Upgraded to level ${existing.level}!`);
      return;
    }

    // Place new building
    if (existing) {
      this.showMessage('Cell already occupied!');
      return;
    }

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
    this.statsSystem.recalcStats(s);
  }

  private handleMove(e: MouseEvent): void {
    const { x, y } = this.getCoords(e);
    this.state.hoveredCell = this.gridSystem.pixelToCell(this.state, x, y);
  }
}
```

**What's happening:**
- **Exit button**: Clicking the top-left corner (x < 80, y < 40) calls `onExit()`. The HUD renders a "< EXIT" label in this area.
- **Demolish**: When `selectedType` is `null` and the player clicks an occupied cell, the building is removed. The refund is `baseCost * level * 0.5` -- a level-2 farm ($50 base) refunds $50.
- **Escape key**: Pressing Escape also triggers `onExit()`.
- **Resize handler**: Keeps the canvas matching the window size. This is critical for fullscreen games.
- The flow is now: exit check -> start check -> panel check -> grid click (demolish / upgrade / place).

---

### 2. Update the HUD Renderer

**File:** `src/games/city-builder/renderers/HUDRenderer.ts`

Add the exit button label and polish the start overlay.

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

    // Exit button
    ctx.fillStyle = '#666';
    ctx.textAlign = 'left';
    ctx.fillText('< EXIT', 12, cy);

    // Resource stats
    let hx = 90;
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

    // Message bar
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
    title: string, sub: string, color: string,
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
- The exit button "< EXIT" is drawn at position (12, cy) in grey. It is not a DOM element -- it is just text on the canvas. The click handler checks the same region.
- Resource stats start at x=90 (after the exit button) and space out at 80px intervals.
- The start overlay uses `shadowBlur` for a glow effect on the title text, then resets it to 0. The subtitle text is split on newlines and rendered line by line.
- Message opacity fades with `Math.min(0.7, messageTimer)` -- full opacity for the first 1.3 seconds, then linear fade to transparent.

---

### 3. Update the Engine with onExit

**File:** `src/games/city-builder/CityEngine.ts`

Accept and pass through the `onExit` callback.

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

    this.inputSystem = new InputSystem(
      canvas, this.state, this.gridSystem, this.statsSystem, onExit, showMessage
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
    this.state.messageTimer = Math.max(0, this.state.messageTimer - dt);
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
- The constructor now accepts `onExit: () => void` and passes it to `InputSystem`. This is the final engine signature matching the actual game source.
- All systems and renderers are wired together. The architecture is: Engine owns Systems and Renderers, Systems mutate State, Renderers read State.

---

### 4. Update the Platform Adapter

**File:** `src/games/city-builder/adapters/PlatformAdapter.ts`

Pass through `onExit` to the engine.

```typescript
import { CityEngine } from '../CityEngine';

export class PlatformAdapter {
  private engine: CityEngine;

  constructor(canvas: HTMLCanvasElement, onExit: () => void) {
    this.engine = new CityEngine(canvas, onExit);
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

## Test It

1. **Run:** `npm run dev`
2. **Open:** the City Builder game
3. **Observe:**
   - Click the **start overlay** to begin
   - Place some buildings, then **deselect** the building type (click the selected card again or press its key twice)
   - With nothing selected, click on a placed building -- it is **demolished** and you get a refund message
   - Click **"< EXIT"** in the top-left or press **Escape** to exit
   - **Resize the window** and verify the canvas stays full-screen
   - Watch **status messages** fade out smoothly over 2 seconds
   - Verify the **speed indicator** shows the correct number of arrows and responds to +/-

---

## Challenges

**Easy:**
- Change the refund percentage from 50% to 75% and see how it affects gameplay strategy.
- Make the exit button text brighter on hover (track mouse position and change color when over the button area).

**Medium:**
- Add a tooltip that appears when hovering over a placed building (no tool selected): show the building name, level, and per-stat contribution in a floating box near the cursor.

**Hard:**
- Implement a confirmation dialog for demolishing expensive buildings (cost > $200). Draw a "Really demolish? Click again to confirm" message and require a second click.

---

## What You Learned

- Implementing demolish as a deselected-tool action with partial cost refund
- Adding exit handlers with both click and keyboard triggers
- Drawing a start overlay with title glow effect using canvas shadows
- Managing event listener lifecycle with attach/detach pattern
- Fading status messages using delta time and alpha interpolation

**Next:** Save/Load -- persist your city to localStorage so progress is never lost!
