# Step 4: Population & Zones

**Goal:** Residential zones grow population, commercial zones (factories) generate income, and building levels scale their output.

**Time:** ~15 minutes

---

## What You'll Build

- **Population growth** driven by houses -- each house adds 10 people per level
- **Income generation** from factories, scaled by population and happiness
- **Building levels** displayed as gold badges on upgraded buildings
- **Zone balancing** where too many houses without food or power creates crises
- **Level indicator** rendering on the grid for buildings above level 1

---

## Concepts

- **Zone Types as Implicit Categories**: We do not have an explicit "zone" type. Instead, each building type implicitly acts as a zone. Houses are residential (provide population), factories are industrial/commercial (generate income), farms are agricultural (provide food). This keeps the data model simple.
- **Population as a Multiplier**: Population is not just a score -- it directly drives income. More people means more tax revenue, but only if happiness is high. The formula `population * 2 * (happiness / 50)` means happy cities earn more.
- **Level Scaling**: A level-2 building produces twice the stats of a level-1. The `StatsSystem` already multiplies by `b.level`, so upgrading a farm from level 1 to 2 doubles its food output from 10 to 20.
- **Upkeep Cost**: Population has a maintenance cost of `0.5 * population` per economic tick. This prevents the player from simply spamming houses -- they need factories and happiness to stay profitable.

---

## Code

### 1. Update the Grid Renderer for Level Badges

**File:** `src/games/city-builder/renderers/GridRenderer.ts`

Add level indicators to buildings that have been upgraded above level 1.

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

          // Level badge (only for upgraded buildings)
          if (b.level > 1) {
            ctx.font = `bold ${CELL_SIZE * 0.2}px monospace`;
            ctx.fillStyle = '#ffd700';
            ctx.textAlign = 'right';
            ctx.textBaseline = 'bottom';
            ctx.fillText(`L${b.level}`, x + CELL_SIZE - 4, y + CELL_SIZE - 4);
          }
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
- The new block after the building icon checks `b.level > 1`. If the building has been upgraded, a gold `L2`, `L3`, etc. badge is drawn in the bottom-right corner of the cell.
- The badge uses `CELL_SIZE * 0.2` for font size, scaling with the cell. Gold color (`#ffd700`) makes it stand out against the dark terrain.

---

### 2. Add Upgrade Logic to the Input System

**File:** `src/games/city-builder/systems/InputSystem.ts`

When the player clicks on an existing building of the same type they have selected, upgrade it instead of rejecting the click.

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
    const existing = s.grid[row]?.[col];
    const def = BUILDING_DEFS[s.selectedType];

    // Upgrade: click same type on existing building
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
- When the player clicks a cell that already has a building of the *same* type they have selected, we attempt an upgrade instead of rejecting the click.
- Upgrade cost scales with current level: `baseCost * level * 0.75`. Upgrading a level-1 house ($100 base) costs $75. Upgrading a level-2 house costs $150.
- Maximum level is 3. Beyond that, the player gets a "Max level reached!" message.
- After upgrading, `statsSystem.recalcStats()` is called to update the resource totals with the new level.

---

### 3. Understanding the Population-Income Relationship

No new file needed here -- the relationship is already defined in `BUILDING_DEFS` and `StatsSystem`. Here is how it works:

**Population sources:**
- Houses: +10 population per level
- All other buildings: 0 population

**Income formula** (computed in the EconomySystem we build in Step 5):
```
hapFactor = happiness / 50
income = population * 2 * hapFactor + factoryCount * 50
upkeep = population * 0.5
net = income - upkeep
```

**Example scenario:**
- 3 houses (level 1): population = 30, power = 4 (10 - 6), food = 11 (20 - 9)
- 1 factory: money income = 30 * 2 * 1.0 + 50 = 110 per tick
- 1 farm: food = 21, happiness = 52%
- Upkeep: 30 * 0.5 = 15 per tick
- Net income: 110 - 15 = $95 per tick

This means the player must balance zone types: houses for population (income), farms for food, power plants for energy, and parks/farms for happiness.

---

## Test It

1. **Run:** `npm run dev`
2. **Open:** the City Builder game
3. **Observe:**
   - Place **3 houses** -- population rises to 30, power drops to 4, food drops to 11
   - Press **1** (select house) and click on an **existing house** -- it upgrades to level 2 with a gold "L2" badge
   - The upgraded house now contributes 20 population instead of 10
   - Try to upgrade past **level 3** -- see the "Max level reached!" message
   - Place **5 houses** without farms -- food goes negative and turns red
   - Add **farms** to bring food back positive
   - Add a **power plant** before power goes negative
   - Notice the **happiness counter** changes as you add parks (+10) and factories (-5)

---

## Challenges

**Easy:**
- Change the max level from 3 to 5 and adjust the upgrade cost formula.
- Add a visual change when a building reaches max level (e.g., a star icon instead of "L3").

**Medium:**
- Show the upgrade cost in the hover tooltip when hovering over an existing building of the selected type.

**Hard:**
- Implement "zone adjacency bonuses" -- a house next to a park gets +2 extra happiness. Check the 4 neighboring cells on placement and apply bonuses.

---

## What You Learned

- Population as an implicit zone mechanic driven by building type
- Upgrade system with escalating costs and level caps
- Level badges rendered conditionally on the grid
- Balancing resource production and consumption across building types

**Next:** Simulation Loop -- add a tick-based economy that generates income, deducts upkeep, and warns about shortages!
