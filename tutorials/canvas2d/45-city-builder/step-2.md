# Step 2: Building Placement

**Goal:** Select building types from a panel and place them on the grid with cost validation and hover preview.

**Time:** ~15 minutes

---

## What You'll Build

- **Building definitions** with cost, icon, color, and stat effects for 6 building types
- **Bottom panel** displaying selectable building cards with hotkey support (1-6)
- **Click-to-place** buildings on empty grid cells, deducting money
- **Hover highlight** showing green (can place) or red (occupied) preview
- **Input system** handling mouse clicks, movement, and keyboard shortcuts

---

## Concepts

- **Data-Driven Buildings**: Each building type is defined in a lookup table (`BUILDING_DEFS`) with its cost, icon, name, color, and stat modifiers. Adding a new building means adding one line to the table -- no code changes needed.
- **Selection State**: `state.selectedType` tracks which building the player has chosen. When `null`, clicks on the grid do nothing. This pattern separates "what tool am I using" from "where am I using it."
- **Cost Validation**: Before placing, we check `state.money >= def.cost`. If the player cannot afford it, we show a message and reject the placement.
- **Hover Feedback**: As the mouse moves over the grid, we convert pixel coordinates to cell coordinates and highlight that cell green (empty, can place) or red (occupied).

---

## Code

### 1. Create Building Definitions

**File:** `src/contexts/canvas2d/games/city-builder/data/buildings.ts`

A data table defining every building type in the game.

```typescript
import type { BuildingType } from '../types';

export const BUILDING_DEFS: Record<BuildingType, {
  cost: number;
  icon: string;
  name: string;
  color: string;
  pop: number;
  happiness: number;
  power: number;
  food: number;
}> = {
  house:      { cost: 100,  icon: '\u{1F3E0}', name: 'House',       color: '#4a90d9', pop: 10, happiness: 0,  power: -2, food: -3 },
  farm:       { cost: 50,   icon: '\u{1F33E}', name: 'Farm',        color: '#6abf45', pop: 0,  happiness: 2,  power: -1, food: 10 },
  factory:    { cost: 200,  icon: '\u{1F3ED}', name: 'Factory',     color: '#888',    pop: 0,  happiness: -5, power: -5, food: 0 },
  park:       { cost: 75,   icon: '\u{1F333}', name: 'Park',        color: '#2ecc71', pop: 0,  happiness: 10, power: -1, food: 0 },
  road:       { cost: 25,   icon: '\u{1F6E4}\uFE0F', name: 'Road',        color: '#555',    pop: 0,  happiness: 1,  power: 0,  food: 0 },
  powerplant: { cost: 300,  icon: '\u26A1',    name: 'Power Plant', color: '#f39c12', pop: 0,  happiness: -3, power: 30, food: 0 },
};

export const BUILDING_TYPES: BuildingType[] = ['house', 'farm', 'factory', 'park', 'road', 'powerplant'];
```

**What's happening:**
- Each building has a `cost` (deducted on placement), an emoji `icon`, a `color` for the background tint, and four stat modifiers: `pop` (population added), `happiness`, `power`, and `food`.
- Negative values mean consumption: a house uses 2 power and 3 food. A power plant produces 30 power but costs happiness.
- `BUILDING_TYPES` is an ordered array so we can map hotkeys 1-6 to building types by index.

---

### 2. Create the Panel Renderer

**File:** `src/contexts/canvas2d/games/city-builder/renderers/PanelRenderer.ts`

Draws the bottom building selection panel with cards, costs, and affordability feedback.

```typescript
import type { CityState } from '../types';
import { BUILDING_DEFS, BUILDING_TYPES } from '../data/buildings';

export class PanelRenderer {
  private canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
  }

  render(ctx: CanvasRenderingContext2D, state: CityState): void {
    const s = state;
    const W = this.canvas.width;
    const H = this.canvas.height;

    const panelY = H - 90;

    // Panel background
    ctx.fillStyle = '#0d1a0d';
    ctx.fillRect(0, panelY, W, 90);
    ctx.fillStyle = '#2a4a2a';
    ctx.fillRect(0, panelY, W, 2);

    const cardW = 80;
    const cardH = 60;
    const pad = 10;

    BUILDING_TYPES.forEach((type, i) => {
      const def = BUILDING_DEFS[type];
      const cx = pad + i * (cardW + pad);
      const cy = panelY + 15;
      const selected = s.selectedType === type;
      const canAfford = s.money >= def.cost;

      // Card background
      ctx.fillStyle = selected ? '#1a3d1a' : canAfford ? '#141e14' : '#1a1a1a';
      ctx.beginPath();
      ctx.roundRect(cx, cy, cardW, cardH, 6);
      ctx.fill();

      // Card border
      ctx.strokeStyle = selected ? def.color : '#2a3a2a';
      ctx.lineWidth = selected ? 2 : 1;
      ctx.beginPath();
      ctx.roundRect(cx, cy, cardW, cardH, 6);
      ctx.stroke();

      // Icon, name, cost
      ctx.globalAlpha = canAfford ? 1 : 0.4;
      ctx.font = `${cardW * 0.3}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(def.icon, cx + cardW / 2, cy + 4);

      ctx.font = 'bold 10px monospace';
      ctx.fillStyle = canAfford ? '#ccc' : '#555';
      ctx.fillText(def.name, cx + cardW / 2, cy + 30);

      ctx.font = '9px monospace';
      ctx.fillStyle = canAfford ? '#f1c40f' : '#555';
      ctx.fillText(`$${def.cost}`, cx + cardW / 2, cy + 44);
      ctx.globalAlpha = 1;
    });

    // Hotkey hints
    ctx.font = '10px monospace';
    ctx.fillStyle = '#333';
    ctx.textAlign = 'left';
    ctx.fillText('[1-6] Select building  |  Click grid to place', pad, H - 6);
  }
}
```

**What's happening:**
- The panel sits in the bottom 90 pixels. Each building gets an 80x60 card with rounded corners.
- The selected building gets a brighter background and a colored border matching the building's theme color.
- Buildings the player cannot afford are dimmed to 40% opacity. The cost label turns from gold to grey.
- Hotkey hints at the very bottom remind the player of keyboard shortcuts.

---

### 3. Update the Grid Renderer

**File:** `src/contexts/canvas2d/games/city-builder/renderers/GridRenderer.ts`

Add building icons and hover highlights to the existing terrain renderer.

```typescript
import type { CityState } from '../types';
import { CELL_SIZE, HUD_HEIGHT } from '../types';
import { BUILDING_DEFS } from '../data/buildings';

export class GridRenderer {
  render(ctx: CanvasRenderingContext2D, state: CityState): void {
    const s = state;

    for (let row = 0; row < s.rows; row++) {
      for (let col = 0; col < s.cols; col++) {
        const x = col * CELL_SIZE;
        const y = HUD_HEIGHT + row * CELL_SIZE;
        const b = s.grid[row][col];

        // Checkerboard terrain
        ctx.fillStyle = (col + row) % 2 === 0 ? '#1a2a1a' : '#172417';
        ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);

        // Cell border
        ctx.strokeStyle = 'rgba(255,255,255,0.04)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 0.5, y + 0.5, CELL_SIZE - 1, CELL_SIZE - 1);

        // Draw building if present
        if (b) {
          const def = BUILDING_DEFS[b.type];

          // Tinted background
          ctx.fillStyle = `${def.color}44`;
          ctx.fillRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4);

          // Building icon
          ctx.font = `${CELL_SIZE * 0.55}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(def.icon, x + CELL_SIZE / 2, y + CELL_SIZE / 2);
        }
      }
    }

    // Hover highlight
    if (s.hoveredCell && s.selectedType) {
      const { col, row } = s.hoveredCell;
      const x = col * CELL_SIZE;
      const y = HUD_HEIGHT + row * CELL_SIZE;
      const canPlace = s.grid[row]?.[col] === null;

      ctx.fillStyle = canPlace
        ? 'rgba(60,255,120,0.15)'
        : 'rgba(255,60,60,0.15)';
      ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
    }
  }
}
```

**What's happening:**
- After drawing each terrain tile, we check if a building exists in that cell. If so, we draw a translucent colored background (`def.color + '44'` for ~27% alpha) and the building's emoji icon centered in the cell.
- The hover highlight only appears when the player has a building type selected. Green overlay means the cell is empty (placement allowed), red means occupied.

---

### 4. Create the Input System

**File:** `src/contexts/canvas2d/games/city-builder/systems/InputSystem.ts`

Handles mouse clicks (panel selection, grid placement), mouse movement (hover), and keyboard shortcuts.

```typescript
import type { CityState } from '../types';
import { BUILDING_DEFS, BUILDING_TYPES } from '../data/buildings';
import type { GridSystem } from './GridSystem';

export class InputSystem {
  private canvas: HTMLCanvasElement;
  private state: CityState;
  private gridSystem: GridSystem;
  private showMessage: (msg: string) => void;
  private clickHandler: (e: MouseEvent) => void;
  private moveHandler: (e: MouseEvent) => void;
  private keyHandler: (e: KeyboardEvent) => void;

  constructor(
    canvas: HTMLCanvasElement,
    state: CityState,
    gridSystem: GridSystem,
    showMessage: (msg: string) => void,
  ) {
    this.canvas = canvas;
    this.state = state;
    this.gridSystem = gridSystem;
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

    // Building panel click
    const panelY = this.canvas.height - 90;
    if (y >= panelY) {
      const cardW = 80;
      const pad = 10;
      for (let i = 0; i < BUILDING_TYPES.length; i++) {
        const cx = pad + i * (cardW + pad);
        if (x >= cx && x <= cx + cardW && y >= panelY + 10 && y <= panelY + 70) {
          s.selectedType = s.selectedType === BUILDING_TYPES[i] ? null : BUILDING_TYPES[i];
          return;
        }
      }
      return;
    }

    // Grid click -- place building
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
  }

  private handleMove(e: MouseEvent): void {
    const { x, y } = this.getCoords(e);
    this.state.hoveredCell = this.gridSystem.pixelToCell(this.state, x, y);
  }
}
```

**What's happening:**
- `getCoords()` converts mouse event positions to canvas coordinates, accounting for CSS scaling via `getBoundingClientRect()`.
- On click, we first check if the game has started (click anywhere to begin). Then we check if the click is in the panel area -- if so, toggle building selection. Otherwise we attempt grid placement.
- Grid placement validates: is a building selected? Is the cell empty? Can the player afford it? Only if all pass do we deduct money and place the building.
- `handleMove()` continuously updates `state.hoveredCell` so the renderer can show the hover highlight.
- Keyboard shortcuts: 1-6 select buildings, +/- change game speed.

---

### 5. Update the Engine

**File:** `src/contexts/canvas2d/games/city-builder/CityEngine.ts`

Wire in the input system and panel renderer.

```typescript
import type { CityState } from './types';
import { CELL_SIZE, HUD_HEIGHT } from './types';
import { GridSystem } from './systems/GridSystem';
import { InputSystem } from './systems/InputSystem';
import { GridRenderer } from './renderers/GridRenderer';
import { PanelRenderer } from './renderers/PanelRenderer';

export class CityEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private state: CityState;
  private running = false;
  private rafId = 0;

  private gridSystem: GridSystem;
  private inputSystem: InputSystem;
  private gridRenderer: GridRenderer;
  private panelRenderer: PanelRenderer;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const cols = Math.floor(canvas.width / CELL_SIZE);
    const rows = Math.floor((canvas.height - HUD_HEIGHT - 100) / CELL_SIZE);

    this.gridSystem = new GridSystem();

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

    this.inputSystem = new InputSystem(canvas, this.state, this.gridSystem, showMessage);
    this.gridRenderer = new GridRenderer();
    this.panelRenderer = new PanelRenderer(canvas);
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

    // HUD placeholder
    ctx.fillStyle = '#0d1a0d';
    ctx.fillRect(0, 0, W, HUD_HEIGHT);
    ctx.fillStyle = '#2a4a2a';
    ctx.fillRect(0, HUD_HEIGHT - 2, W, 2);
    ctx.font = 'bold 13px monospace';
    ctx.fillStyle = '#3498db';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`CITY BUILDER  |  $${state.money}`, W / 2, HUD_HEIGHT / 2);

    this.gridRenderer.render(ctx, state);
    this.panelRenderer.render(ctx, state);
  }
}
```

**What's happening:**
- We added `InputSystem` to handle all user interaction and `PanelRenderer` to draw the building panel.
- The HUD now shows the player's money so they can track spending as they place buildings.
- `start()` calls `inputSystem.attach()` to register event listeners; `destroy()` calls `detach()` to clean them up.
- The render order matters: background, then grid (with buildings), then panel on top.

---

## Test It

1. **Run:** `npm run dev`
2. **Open:** the City Builder game in your browser
3. **Observe:**
   - Click anywhere to dismiss the start overlay
   - **Bottom panel** shows 6 building cards with icons, names, and costs
   - Press **1** to select House, then click an empty grid cell -- a house icon appears
   - Press **2** for Farm, **6** for Power Plant, etc.
   - **Hover** over cells to see green/red placement preview
   - Try placing on an **occupied cell** -- see the "Cell already occupied!" message
   - Spend all your money and notice cards become **dimmed** when unaffordable

---

## Challenges

**Easy:**
- Click a selected building card again to deselect it. Verify the hover highlight disappears.
- Press keys 1-6 rapidly and watch the panel selection update.

**Medium:**
- Add a 7th building type (e.g., `hospital` with cost 250, +5 happiness, -3 power). You only need to add one line to `BUILDING_DEFS` and update the type union.

**Hard:**
- Implement right-click to demolish a building, refunding 50% of its cost. You will need to add a new handler in `InputSystem` and clear the grid cell.

---

## What You Learned

- Defining building types as a data table for easy extension
- Rendering a selectable panel with affordability feedback
- Handling multi-region click targets (panel vs. grid)
- Converting pixel coordinates to grid coordinates for placement
- Validating placement conditions before mutating state

**Next:** Resource System -- track power, food, and happiness as buildings consume and produce resources!
