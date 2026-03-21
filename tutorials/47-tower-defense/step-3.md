# Step 3: Tower Placement

**Goal:** Click on empty grid cells to place towers, with a selection panel at the bottom, hover previews, and placement validation.

**Time:** ~15 minutes

---

## What You'll Build

- **Tower definitions** for four tower types: Archer, Cannon, Frost, and Sniper with distinct stats and costs
- **Tower selection panel** at the bottom of the screen showing tower cards with icons and costs
- **Click-to-place** system that validates the cell is empty and the player has enough gold
- **Hover preview** showing valid/invalid cell highlighting and range circle preview
- **Tower renderer** that draws placed towers as colored circles with emoji icons

---

## Concepts

- **Placement Validation**: Towers can only go on `empty` cells. Path, start, end, and already-occupied cells are blocked. The grid cell's `type` is checked before placement, and visual feedback (green/red hover) tells the player instantly.
- **Tower Selection State**: `selectedTowerType` in the game state tracks which tower blueprint the player wants to place. Clicking a tower card sets it; clicking an empty cell consumes it. Right-click or ESC deselects.
- **Range Preview**: When hovering with a tower selected, a dashed circle shows the tower's attack range. This helps players make informed placement decisions before spending gold.
- **Economy Gate**: Each tower has a `cost`. If `state.gold < cost`, the card appears dimmed and placement is blocked. Gold management becomes the core strategic layer.

---

## Code

### 1. Create Tower Definitions

**File:** `src/games/tower-defense/data/towers.ts`

```typescript
import type { TowerDef, TowerType } from '../types';

export const TOWER_DEFS: Record<TowerType, TowerDef> = {
  archer: {
    type: 'archer',
    name: 'Archer',
    cost: 50,
    damage: 10,
    range: 150,
    fireInterval: 600,       // ms between shots
    projectileType: 'arrow',
    projectileSpeed: 400,
    splashRadius: 0,          // single target
    slowFactor: 0,
    color: '#6d9e3f',
    icon: '\u{1F3F9}',       // bow emoji
    upgradeCostMultiplier: 1.5,
  },
  cannon: {
    type: 'cannon',
    name: 'Cannon',
    cost: 100,
    damage: 30,
    range: 120,
    fireInterval: 1800,
    projectileType: 'cannonball',
    projectileSpeed: 300,
    splashRadius: 40,         // area damage
    slowFactor: 0,
    color: '#555',
    icon: '\u{1F4A3}',
    upgradeCostMultiplier: 1.5,
  },
  frost: {
    type: 'frost',
    name: 'Frost',
    cost: 70,
    damage: 12,
    range: 140,
    fireInterval: 900,
    projectileType: 'frostbolt',
    projectileSpeed: 350,
    splashRadius: 0,
    slowFactor: 0.5,          // halve enemy speed for 2s
    color: '#4fc3f7',
    icon: '\u{2744}\u{FE0F}', // snowflake emoji
    upgradeCostMultiplier: 1.5,
  },
  sniper: {
    type: 'sniper',
    name: 'Sniper',
    cost: 120,
    damage: 55,
    range: 280,
    fireInterval: 2200,
    projectileType: 'bullet',
    projectileSpeed: 600,
    splashRadius: 0,
    slowFactor: 0,
    color: '#c0a060',
    icon: '\u{1F3AF}',
    upgradeCostMultiplier: 1.5,
  },
};

/** Stat multipliers per upgrade level */
export const UPGRADE_MULTIPLIERS: Record<
  number,
  { damage: number; range: number; fireInterval: number }
> = {
  1: { damage: 1.0, range: 1.0, fireInterval: 1.0 },
  2: { damage: 1.6, range: 1.2, fireInterval: 0.8 },
  3: { damage: 2.5, range: 1.4, fireInterval: 0.6 },
};

export function upgradeCost(def: TowerDef, currentLevel: number): number {
  return Math.round(def.cost * def.upgradeCostMultiplier * currentLevel);
}

export function sellRefund(totalInvested: number): number {
  return Math.round(totalInvested * 0.6);
}

export function getTowerStats(type: TowerType, level: number) {
  const def = TOWER_DEFS[type];
  const mul = UPGRADE_MULTIPLIERS[level] ?? UPGRADE_MULTIPLIERS[3];
  return {
    damage: Math.round(def.damage * mul.damage),
    range: Math.round(def.range * mul.range),
    fireInterval: Math.round(def.fireInterval * mul.fireInterval),
    splashRadius: def.splashRadius,
    slowFactor: def.slowFactor,
    projectileType: def.projectileType,
    projectileSpeed: def.projectileSpeed,
  };
}
```

**What's happening:**
- Four towers offer distinct roles. Archers are cheap and fast. Cannons deal splash damage. Frost towers slow enemies. Snipers have extreme range and damage but fire slowly.
- `UPGRADE_MULTIPLIERS` defines how stats scale at each level. Level 3 gives 2.5x damage, 1.4x range, and 0.6x fire interval (40% faster). This makes upgrades feel impactful.
- `upgradeCost` scales with both the base cost and current level, so upgrading expensive towers costs more. `sellRefund` returns 60% of total investment, punishing reckless selling while still allowing repositioning.
- `getTowerStats` computes the effective stats for any tower at any level, used by both the combat system and the UI.

---

### 2. Add Tower Placement to GridSystem

**File:** `src/games/tower-defense/systems/GridSystem.ts`

Add the placement function below the existing `GridSystem` class.

```typescript
import type { Cell, GameStateData, GridCoord, TowerType } from '../types';
import { GRID_COLS, GRID_ROWS } from './PathSystem';
import { TOWER_DEFS } from '../data/towers';

export class GridSystem {
  cellSize: number = 0;
  gridOffsetY: number = 0;
  panelHeight: number = 0;

  updateLayout(canvasWidth: number, canvasHeight: number, hudHeight: number, panelH: number) {
    this.panelHeight = panelH;
    this.gridOffsetY = hudHeight;
    const availH = canvasHeight - hudHeight - panelH;
    const cellByWidth = Math.floor(canvasWidth / GRID_COLS);
    const cellByHeight = Math.floor(availH / GRID_ROWS);
    this.cellSize = Math.min(cellByWidth, cellByHeight);
  }

  pixelToCell(px: number, py: number): GridCoord | null {
    if (py < this.gridOffsetY) return null;
    const col = Math.floor(px / this.cellSize);
    const row = Math.floor((py - this.gridOffsetY) / this.cellSize);
    if (col < 0 || col >= GRID_COLS || row < 0 || row >= GRID_ROWS) return null;
    return { col, row };
  }

  cellCenter(col: number, row: number): { x: number; y: number } {
    return {
      x: col * this.cellSize + this.cellSize / 2,
      y: this.gridOffsetY + row * this.cellSize + this.cellSize / 2,
    };
  }

  cellOrigin(col: number, row: number): { x: number; y: number } {
    return {
      x: col * this.cellSize,
      y: this.gridOffsetY + row * this.cellSize,
    };
  }

  getCell(state: GameStateData, col: number, row: number): Cell | null {
    return state.grid[row]?.[col] ?? null;
  }

  canPlaceTower(state: GameStateData, col: number, row: number): boolean {
    const cell = this.getCell(state, col, row);
    if (!cell) return false;
    return cell.type === 'empty' && cell.towerId === null;
  }
}

/** Attempt to place a tower. Returns false if invalid or too expensive. */
export function tryPlaceTower(
  state: GameStateData,
  col: number,
  row: number,
  towerType: TowerType,
  grid: GridSystem,
): boolean {
  const def = TOWER_DEFS[towerType];

  if (state.gold < def.cost || !grid.canPlaceTower(state, col, row)) {
    // Flash the cell red to show placement failed
    state.placementFail = { col, row, timer: 0.4 };
    return false;
  }

  const id = `tower_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const tower = {
    id,
    type: towerType,
    col,
    row,
    level: 1,
    totalInvested: def.cost,
    lastFiredAt: 0,
    targetId: null,
  };

  state.towers.push(tower);
  state.grid[row][col].type = 'tower';
  state.grid[row][col].towerId = id;
  state.gold -= def.cost;

  return true;
}
```

**What's happening:**
- `tryPlaceTower` is the core placement action. It validates the cell and gold, then creates a `PlacedTower` with a unique ID, marks the grid cell as `tower`, and deducts gold.
- The unique ID uses `Date.now()` plus random characters to avoid collisions even during rapid placement.
- On failure, `placementFail` stores the cell coordinates and a 0.4-second timer. The renderer will flash that cell red to give the player feedback.
- After placement, the cell's `towerId` links back to the tower instance, enabling click-to-select for upgrades in Step 7.

---

### 3. Create the Input System

**File:** `src/games/tower-defense/systems/InputSystem.ts`

Handles mouse clicks for tower selection and grid placement, plus hover tracking.

```typescript
import type { GameStateData, TowerType } from '../types';
import type { GridSystem } from './GridSystem';
import { tryPlaceTower } from './GridSystem';

export class InputSystem {
  private canvas: HTMLCanvasElement;
  private grid: GridSystem;
  private getState: () => GameStateData;

  // UI hit areas (populated by renderers each frame)
  towerCardRects: { type: string; x: number; y: number; w: number; h: number }[] = [];
  startWaveRect: { x: number; y: number; w: number; h: number } | null = null;

  private clickHandler: (e: MouseEvent) => void;
  private moveHandler: (e: MouseEvent) => void;
  private contextHandler: (e: MouseEvent) => void;
  private keyHandler: (e: KeyboardEvent) => void;

  constructor(canvas: HTMLCanvasElement, grid: GridSystem, getState: () => GameStateData) {
    this.canvas = canvas;
    this.grid = grid;
    this.getState = getState;

    this.clickHandler = (e: MouseEvent) => this.handleClick(e);
    this.moveHandler = (e: MouseEvent) => this.handleMouseMove(e);
    this.contextHandler = (e: MouseEvent) => {
      e.preventDefault();
      const state = this.getState();
      state.selectedTowerType = null;
    };
    this.keyHandler = (e: KeyboardEvent) => {
      const state = this.getState();
      if (e.key === 'Escape') {
        state.selectedTowerType = null;
        state.selectedPlacedTowerId = null;
      }
    };

    canvas.addEventListener('click', this.clickHandler);
    canvas.addEventListener('mousemove', this.moveHandler);
    canvas.addEventListener('contextmenu', this.contextHandler);
    window.addEventListener('keydown', this.keyHandler);
  }

  destroy(): void {
    this.canvas.removeEventListener('click', this.clickHandler);
    this.canvas.removeEventListener('mousemove', this.moveHandler);
    this.canvas.removeEventListener('contextmenu', this.contextHandler);
    window.removeEventListener('keydown', this.keyHandler);
  }

  private getCanvasCoords(e: MouseEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }

  private handleMouseMove(e: MouseEvent): void {
    const { x, y } = this.getCanvasCoords(e);
    const state = this.getState();
    state.hoveredCell = this.grid.pixelToCell(x, y);
  }

  private handleClick(e: MouseEvent): void {
    const { x, y } = this.getCanvasCoords(e);
    const state = this.getState();

    if (state.screen !== 'playing') return;

    // Check tower card clicks
    for (const card of this.towerCardRects) {
      if (x >= card.x && x <= card.x + card.w && y >= card.y && y <= card.y + card.h) {
        if (state.selectedTowerType === card.type) {
          state.selectedTowerType = null;
        } else {
          state.selectedTowerType = card.type as TowerType;
        }
        return;
      }
    }

    // Check grid click for tower placement
    const cell = this.grid.pixelToCell(x, y);
    if (!cell) {
      state.selectedTowerType = null;
      return;
    }

    const gridCell = state.grid[cell.row]?.[cell.col];
    if (!gridCell) return;

    // If a tower type is selected and cell is empty, try to place
    if (state.selectedTowerType && gridCell.type === 'empty') {
      tryPlaceTower(state, cell.col, cell.row, state.selectedTowerType, this.grid);
      return;
    }

    // Clicking a tower cell selects it (for upgrades in later steps)
    if (gridCell.type === 'tower' && gridCell.towerId) {
      state.selectedPlacedTowerId = gridCell.towerId;
      state.selectedTowerType = null;
      return;
    }

    state.selectedTowerType = null;
  }
}
```

**What's happening:**
- `getCanvasCoords` converts DOM `clientX`/`clientY` to canvas pixel coordinates, accounting for CSS scaling. Without this, clicks would be offset on hi-DPI screens.
- `handleClick` cascades through priorities: first check UI buttons (tower cards), then check the grid. Tower card clicks toggle `selectedTowerType`. Grid clicks attempt placement if a tower type is selected.
- `handleMouseMove` updates `hoveredCell` every frame so the grid renderer can show the green/red hover highlight.
- The context menu handler (`contextmenu`) deselects the current tower, giving the player a quick way to cancel placement. ESC does the same via the keyboard handler.

---

### 4. Create the Tower Renderer

**File:** `src/games/tower-defense/renderers/TowerRenderer.ts`

```typescript
import type { GameStateData, PlacedTower } from '../types';
import type { GridSystem } from '../systems/GridSystem';
import { TOWER_DEFS } from '../data/towers';

export class TowerRenderer {
  render(ctx: CanvasRenderingContext2D, state: GameStateData, grid: GridSystem): void {
    for (const tower of state.towers) {
      this.drawTower(ctx, tower, grid, state);
    }
  }

  private drawTower(
    ctx: CanvasRenderingContext2D,
    tower: PlacedTower,
    grid: GridSystem,
    state: GameStateData,
  ) {
    const def = TOWER_DEFS[tower.type];
    const center = grid.cellCenter(tower.col, tower.row);
    const cs = grid.cellSize;
    const r = cs * 0.38;
    const isSelected = state.selectedPlacedTowerId === tower.id;

    // Shadow
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 6;

    // Base circle
    ctx.beginPath();
    ctx.arc(center.x, center.y, r, 0, Math.PI * 2);
    ctx.fillStyle = def.color;
    ctx.fill();

    // Selection ring
    if (isSelected) {
      ctx.beginPath();
      ctx.arc(center.x, center.y, r + 3, 0, Math.PI * 2);
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    ctx.shadowBlur = 0;

    // Level stars
    const starY = center.y + r + 5;
    ctx.fillStyle = '#ffd700';
    ctx.font = `${Math.max(6, cs * 0.18)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('\u2605'.repeat(tower.level), center.x, starY);

    // Icon emoji
    ctx.font = `${Math.max(10, cs * 0.36)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(def.icon, center.x, center.y);
  }
}
```

**What's happening:**
- Each placed tower is drawn as a colored circle (using `def.color`) with its emoji icon centered. The radius is 38% of cell size, leaving visual breathing room.
- Selected towers get a white ring around them, clearly showing which tower is active for the upgrade panel (added in Step 7).
- Gold stars below the tower show its current level. Level 1 = one star, up to three stars at max level. The stars use `\u2605` (black star character).
- The drop shadow (`shadowBlur = 6`) gives towers a lifted appearance, separating them from the flat grid.

---

### 5. Create the UI Renderer (Tower Panel)

**File:** `src/games/tower-defense/renderers/UIRenderer.ts`

Draws the tower selection panel at the bottom of the screen.

```typescript
import type { GameStateData, TowerType } from '../types';
import type { InputSystem } from '../systems/InputSystem';
import { TOWER_DEFS, getTowerStats } from '../data/towers';
import type { GridSystem } from '../systems/GridSystem';

const TOWER_ORDER: TowerType[] = ['archer', 'cannon', 'frost', 'sniper'];

export class UIRenderer {
  readonly panelHeight = 110;

  render(
    ctx: CanvasRenderingContext2D,
    state: GameStateData,
    canvasW: number,
    canvasH: number,
    grid: GridSystem,
    input: InputSystem,
  ): void {
    const panelY = canvasH - this.panelHeight;

    // Panel background
    ctx.fillStyle = '#0d1a0d';
    ctx.fillRect(0, panelY, canvasW, this.panelHeight);
    ctx.fillStyle = '#2a4a2a';
    ctx.fillRect(0, panelY, canvasW, 2);

    // Tower cards
    const cardW = 100;
    const cardH = 88;
    const cardPad = 10;
    const cardY = panelY + (this.panelHeight - cardH) / 2;

    input.towerCardRects = [];

    TOWER_ORDER.forEach((type, i) => {
      const def = TOWER_DEFS[type];
      const cardX = cardPad + i * (cardW + cardPad);
      const isSelected = state.selectedTowerType === type;
      const canAfford = state.gold >= def.cost;

      // Card background
      ctx.fillStyle = isSelected ? '#1a3d1a' : canAfford ? '#162816' : '#1a1a1a';
      ctx.beginPath();
      ctx.roundRect(cardX, cardY, cardW, cardH, 8);
      ctx.fill();

      // Border
      ctx.strokeStyle = isSelected ? def.color : canAfford ? '#2a5a2a' : '#333';
      ctx.lineWidth = isSelected ? 2.5 : 1.5;
      ctx.beginPath();
      ctx.roundRect(cardX, cardY, cardW, cardH, 8);
      ctx.stroke();

      // Icon
      ctx.font = `${Math.min(28, cardH * 0.32)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.globalAlpha = canAfford ? 1 : 0.4;
      ctx.fillText(def.icon, cardX + cardW / 2, cardY + 8);
      ctx.globalAlpha = 1;

      // Name
      ctx.font = 'bold 12px monospace';
      ctx.fillStyle = canAfford ? '#eee' : '#555';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(def.name, cardX + cardW / 2, cardY + 42);

      // Cost
      ctx.font = '11px monospace';
      ctx.fillStyle = canAfford ? '#f1c40f' : '#555';
      ctx.fillText(`\u{1F4B0} ${def.cost}`, cardX + cardW / 2, cardY + 58);

      // Selected glow
      if (isSelected) {
        ctx.shadowColor = def.color;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.roundRect(cardX, cardY, cardW, cardH, 8);
        ctx.strokeStyle = def.color;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      input.towerCardRects.push({ type, x: cardX, y: cardY, w: cardW, h: cardH });
    });
  }
}
```

**What's happening:**
- Four tower cards are laid out horizontally in the bottom panel. Each shows the tower's icon, name, and gold cost.
- Cards the player cannot afford are dimmed (alpha 0.4, gray border). The selected card glows with the tower's color using `shadowBlur`.
- `input.towerCardRects` is populated each frame with the exact pixel rectangles of each card. The input system uses these for click detection. This pattern avoids hard-coding UI positions.
- The panel has a dark background with a green accent line at the top, matching the game's military color scheme.

---

### 6. Update Grid Renderer for Hover

Add hover highlighting and range preview to the existing grid renderer.

```typescript
// Add these to the end of GridRenderer.render(), after drawing labels:

    // Hover highlight
    if (state.hoveredCell) {
      const { col, row } = state.hoveredCell;
      const cell = state.grid[row]?.[col];
      if (cell) {
        const x = col * cs;
        const y = oy + row * cs;

        let hoverColor = 'rgba(255,255,255,0.18)';
        if (state.selectedTowerType) {
          hoverColor = cell.type === 'empty'
            ? 'rgba(60,255,120,0.22)'   // green = valid
            : 'rgba(255,60,60,0.22)';    // red = invalid
        }

        ctx.fillStyle = hoverColor;
        ctx.fillRect(x, y, cs, cs);
      }
    }

    // Range preview when hovering with a tower selected
    if (state.selectedTowerType && state.hoveredCell) {
      const { col, row } = state.hoveredCell;
      const cell = state.grid[row]?.[col];
      if (cell && cell.type === 'empty') {
        const center = grid.cellCenter(col, row);
        const stats = getTowerStats(state.selectedTowerType, 1);

        ctx.beginPath();
        ctx.arc(center.x, center.y, stats.range, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255,255,255,0.25)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(255,255,255,0.05)';
        ctx.fill();
      }
    }
```

**What's happening:**
- When no tower is selected, hovering shows a neutral white overlay. With a tower selected, the hover turns green on valid cells and red on invalid cells, giving instant feedback.
- The range preview draws a dashed circle showing exactly how far the tower will be able to shoot. The `setLineDash([6, 4])` creates a military-style dashed ring.
- The range area is filled with a very subtle white (`0.05` alpha) so the player can see the coverage zone without it being distracting.

---

### 7. Update the Game Engine

Wire in the input system, tower renderer, and UI renderer.

```typescript
// Add to constructor:
this.input = new InputSystem(canvas, this.grid, () => this.state);
this.towerRenderer = new TowerRenderer();
this.uiRenderer = new UIRenderer();

// Update render():
this.gridRenderer.render(ctx, state, this.grid);
this.towerRenderer.render(ctx, state, this.grid);
this.enemyRenderer.render(ctx, state, this.grid.cellSize);
this.uiRenderer.render(ctx, state, canvas.width, canvas.height, this.grid, this.input);

// Add to stop():
this.input.destroy();
```

---

## Test It

1. **Run:** `npm run dev`
2. **Open:** the Tower Defense game in your browser
3. **Observe:**
   - A **tower selection panel** appears at the bottom with four tower cards
   - **Click a tower card** to select it (it glows with the tower's color)
   - **Hover over the grid** and see green/red cell highlighting
   - **Hover over an empty cell** and see the dashed range circle preview
   - **Click an empty cell** to place the tower. Gold decreases. A tower with its icon appears.
   - **Try placing on a path cell** -- the cell flashes red and nothing is placed
   - **Right-click** to deselect the current tower type
   - **Click a placed tower** and a white selection ring appears

---

## Challenges

**Easy:**
- Change the Archer's cost to 30 and see how quickly you can fill the board with cheap towers.
- Change the range preview from a dashed circle to a solid circle with more opacity.

**Medium:**
- Add a tower count display to each card showing how many of that type are currently placed (e.g., "Archer x3").

**Hard:**
- Implement a "ghost tower" preview: when hovering with a tower selected on a valid cell, draw a semi-transparent version of the tower (with its icon) at that position before the player clicks.

---

## What You Learned

- Implementing click-to-place with placement validation and visual feedback
- Building a UI panel with interactive tower cards and hit-testing
- Showing range previews with dashed circles to aid player decision-making
- Connecting an input system to game state through a getter function pattern

**Next:** Tower Shooting & Projectiles -- make those towers actually fire at enemies!
