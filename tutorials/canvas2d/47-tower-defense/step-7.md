# Step 7: Tower Upgrades

**Goal:** Click placed towers to open an upgrade panel showing stats, upgrade costs, and sell options. Upgrade towers for more damage, range, and fire speed.

**Time:** ~15 minutes

---

## What You'll Build

- **Tower upgrade panel** that appears when clicking a placed tower, showing current stats and upgrade options
- **Three upgrade levels** with increasing stat multipliers (damage, range, fire rate)
- **Sell mechanic** with 60% refund and a double-click confirmation
- **Level stars** and range ring display for selected towers
- **Tower barrel rotation** that tracks the current target for visual flair

---

## Concepts

- **Upgrade Multipliers**: Each tower has 3 levels. Level 2 gives 1.6x damage, 1.2x range, and 0.8x fire interval (20% faster). Level 3 gives 2.5x damage, 1.4x range, and 0.6x fire interval. These compound with the base stats, so a Level 3 Sniper deals `55 * 2.5 = 138` damage per shot.
- **Upgrade Cost Scaling**: Upgrading costs `baseCost * upgradeCostMultiplier * currentLevel`. An Archer (cost 50, multiplier 1.5) costs 75 to upgrade from L1 to L2, and 150 from L2 to L3. This makes each upgrade progressively more expensive.
- **Total Investment Tracking**: Each tower tracks `totalInvested` -- the sum of its initial cost plus all upgrade costs. Selling refunds 60% of this total. This means upgrading a tower before selling it returns more gold than selling an un-upgraded one, but still at a loss.
- **Double-Click Sell Confirmation**: The sell button requires two clicks. The first click changes the button text to "Confirm?", the second click actually sells. This prevents accidental tower loss from misclicks.

---

## Code

### 1. Add Upgrade and Sell Functions

Add these functions to `GridSystem.ts` alongside `tryPlaceTower`:

```typescript
import { upgradeCost, sellRefund } from '../data/towers';
import { EconomySystem } from './EconomySystem';

/** Upgrade a tower to the next level. Returns false if max level or too expensive. */
export function tryUpgradeTower(state: GameStateData, towerId: string): boolean {
  const tower = state.towers.find(t => t.id === towerId);
  if (!tower || tower.level >= 3) return false;

  const def = TOWER_DEFS[tower.type];
  const cost = upgradeCost(def, tower.level);

  if (state.gold < cost) return false;

  tower.level++;
  tower.totalInvested += cost;
  EconomySystem.spendGold(state, cost);

  return true;
}

/** Sell a tower and refund 60% of total investment. */
export function trySellTower(state: GameStateData, towerId: string): boolean {
  const idx = state.towers.findIndex(t => t.id === towerId);
  if (idx === -1) return false;

  const tower = state.towers[idx];
  const refund = sellRefund(tower.totalInvested);

  EconomySystem.earnGold(state, refund);
  state.grid[tower.row][tower.col].type = 'empty';
  state.grid[tower.row][tower.col].towerId = null;
  state.towers.splice(idx, 1);

  if (state.selectedPlacedTowerId === towerId) {
    state.selectedPlacedTowerId = null;
  }

  return true;
}
```

**What's happening:**
- `tryUpgradeTower` finds the tower by ID, checks it isn't already max level (3), verifies the player can afford the upgrade cost, then increments the level and deducts gold.
- `totalInvested` accumulates all spending on this tower. A Level 3 Archer has invested `50 + 75 + 150 = 275` gold, so selling refunds `275 * 0.6 = 165` gold.
- `trySellTower` removes the tower from the array, resets the grid cell back to `empty`, and credits the refund. It also clears the selection if this tower was selected.
- Both functions return `boolean` so the caller knows if the action succeeded.

---

### 2. Add the Upgrade Panel to UIRenderer

Add this method to the `UIRenderer` class, called when `state.selectedPlacedTowerId` is set:

```typescript
  private renderUpgradePanel(
    ctx: CanvasRenderingContext2D,
    state: GameStateData,
    canvasW: number,
    canvasH: number,
    input: InputSystem,
  ) {
    const tower = state.towers.find(t => t.id === state.selectedPlacedTowerId);
    if (!tower) return;

    const def = TOWER_DEFS[tower.type];
    const stats = getTowerStats(tower.type, tower.level);
    const panelW = 220;
    const panelH = 200;
    const panelX = canvasW - panelW - 12;
    const panelY2 = canvasH - this.panelHeight - panelH - 12;

    // Panel background
    ctx.fillStyle = 'rgba(10,20,10,0.95)';
    ctx.beginPath();
    ctx.roundRect(panelX, panelY2, panelW, panelH, 12);
    ctx.fill();

    ctx.strokeStyle = def.color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(panelX, panelY2, panelW, panelH, 12);
    ctx.stroke();

    // Title
    ctx.font = 'bold 16px monospace';
    ctx.fillStyle = '#eee';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`${def.icon} ${def.name}`, panelX + 14, panelY2 + 14);

    // Level stars
    ctx.font = '14px sans-serif';
    ctx.fillStyle = '#ffd700';
    ctx.textAlign = 'right';
    ctx.fillText(
      '\u2605'.repeat(tower.level) + '\u2606'.repeat(3 - tower.level),
      panelX + panelW - 14,
      panelY2 + 14,
    );

    // Stats
    const statY = panelY2 + 44;
    const lineH = 20;

    ctx.font = '12px monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#aaa';
    ctx.fillText(`DMG:  ${stats.damage}`, panelX + 14, statY);
    ctx.fillText(`RNG:  ${stats.range}px`, panelX + 14, statY + lineH);
    ctx.fillText(`SPD:  ${(1000 / stats.fireInterval).toFixed(1)}/s`, panelX + 14, statY + lineH * 2);

    if (stats.splashRadius > 0) {
      ctx.fillStyle = '#ff7043';
      ctx.fillText(`SPLASH: ${stats.splashRadius}px`, panelX + 14, statY + lineH * 3);
    }

    if (stats.slowFactor > 0) {
      ctx.fillStyle = '#4fc3f7';
      ctx.fillText(`SLOW: ${stats.slowFactor * 100}%`, panelX + 14, statY + lineH * 3);
    }

    const btnY = panelY2 + panelH - 50;
    const btnH = 32;
    const halfW = (panelW - 42) / 2;

    // Upgrade button
    const canUpgrade = tower.level < 3;
    const upCost = canUpgrade ? upgradeCost(def, tower.level) : 0;
    const canAffordUp = canUpgrade && state.gold >= upCost;
    const upBtnX = panelX + 14;

    this.drawButton(
      ctx, upBtnX, btnY, halfW, btnH,
      canUpgrade ? `\u2B06 ${upCost}\u{1F4B0}` : '\u2605 MAX',
      canAffordUp && canUpgrade,
    );
    input.upgradeRect = canAffordUp && canUpgrade
      ? { x: upBtnX, y: btnY, w: halfW, h: btnH }
      : null;

    // Sell button
    const refund = sellRefund(tower.totalInvested);
    const sellBtnX = panelX + 14 + halfW + 14;
    const isPendingSell = state.pendingSellTowerId === tower.id;
    const sellLabel = isPendingSell ? 'Confirm?' : `\u{1F4B0} ${refund}`;
    const sellColor = isPendingSell ? '#d32f2f' : '#b71c1c';

    this.drawButton(ctx, sellBtnX, btnY, halfW, btnH, sellLabel, true, sellColor);
    input.sellRect = { x: sellBtnX, y: btnY, w: halfW, h: btnH };

    // Close X button
    const closeSize = 22;
    const closeX = panelX + panelW - closeSize - 8;
    const closeY2 = panelY2 + 8;

    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.roundRect(closeX, closeY2, closeSize, closeSize, 4);
    ctx.fill();
    ctx.font = 'bold 14px monospace';
    ctx.fillStyle = '#aaa';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('\u2715', closeX + closeSize / 2, closeY2 + closeSize / 2);
    input.closePanelRect = { x: closeX, y: closeY2, w: closeSize, h: closeSize };
  }

  private drawButton(
    ctx: CanvasRenderingContext2D,
    x: number, y: number, w: number, h: number,
    label: string, active: boolean, activeColor = '#1b5e20',
  ) {
    ctx.fillStyle = active ? activeColor : '#1a1a1a';
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 6);
    ctx.fill();

    ctx.strokeStyle = active ? '#4caf50' : '#333';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 6);
    ctx.stroke();

    ctx.font = 'bold 12px monospace';
    ctx.fillStyle = active ? '#a5d6a7' : '#555';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x + w / 2, y + h / 2);
  }
```

**What's happening:**
- The panel floats above the tower selection bar, bordered with the tower's color. It shows the tower's icon, name, level stars (filled vs. empty), and current stats.
- Stats are computed via `getTowerStats` which applies the level multipliers. Fire speed is shown as shots per second (`1000 / fireInterval`), which is more intuitive than raw milliseconds.
- Special properties (splash, slow) are shown in their thematic colors: orange for splash, blue for slow. This helps players understand what makes each tower type unique.
- The upgrade button shows the cost or "MAX" if fully upgraded. The sell button shows the refund amount, changing to "Confirm?" on first click (tracked via `pendingSellTowerId`).
- Hit areas for upgrade, sell, and close buttons are registered on the `input` object each frame.

---

### 3. Add Selected Tower Range Ring to GridRenderer

Add this after the hover highlight in `GridRenderer.render()`:

```typescript
    // Draw selected placed tower range ring
    if (state.selectedPlacedTowerId) {
      const tower = state.towers.find(t => t.id === state.selectedPlacedTowerId);
      if (tower) {
        const center = grid.cellCenter(tower.col, tower.row);
        const stats = getTowerStats(tower.type, tower.level);

        ctx.beginPath();
        ctx.arc(center.x, center.y, stats.range, 0, Math.PI * 2);
        ctx.strokeStyle = `${TOWER_DEFS[tower.type].color}99`;
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = `${TOWER_DEFS[tower.type].color}15`;
        ctx.fill();
      }
    }
```

**What's happening:**
- When a placed tower is selected, its range is shown as a dashed circle in the tower's color. This helps players decide whether to upgrade for more range or reposition.
- The `99` hex suffix on the stroke color creates ~60% opacity. The `15` suffix on the fill creates ~8% opacity, giving a subtle coverage area fill.
- The range ring updates dynamically: upgrading the tower immediately shows the expanded range circle.

---

### 4. Add Tower Barrel Rotation to TowerRenderer

Add target tracking rotation to the tower drawing:

```typescript
    // Draw barrel rotated toward current target
    ctx.save();
    ctx.translate(center.x, center.y);

    if (tower.targetId) {
      const target = state.enemies.find(e => e.id === tower.targetId);
      if (target && !target.dead) {
        const angle = Math.atan2(target.y - center.y, target.x - center.x);
        ctx.rotate(angle + Math.PI / 2);
      }
    }

    // Barrel rectangle
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(-cs * 0.06, -r * 0.9, cs * 0.12, r * 0.9);

    ctx.restore();
```

**What's happening:**
- `ctx.save()` and `ctx.restore()` isolate the rotation transform so it only affects the barrel, not the icon or stars.
- `Math.atan2` computes the angle from the tower center to the target position. The `+ Math.PI / 2` offset is needed because the barrel rectangle points upward by default (negative Y), so we rotate 90 degrees to align with the direction vector.
- When no target exists, the barrel points straight up (default orientation). As soon as an enemy enters range, the barrel snaps to track it.

---

### 5. Add Targeting Line to TowerRenderer

Draw a subtle dashed line from tower to target:

```typescript
    // Draw attack line to current target
    if (tower.targetId) {
      const target = state.enemies.find(e => e.id === tower.targetId);
      if (target && !target.dead) {
        ctx.beginPath();
        ctx.moveTo(center.x, center.y);
        ctx.lineTo(target.x, target.y);
        ctx.strokeStyle = `${def.color}40`;
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 5]);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
```

**What's happening:**
- A thin dashed line connects the tower to its current target. The `40` hex opacity (25%) makes it visible but not distracting.
- This gives the player real-time feedback on which enemy each tower is targeting, helping them understand the "first" targeting strategy and identify coverage gaps.

---

### 6. Wire Upgrade/Sell into the Input System

Add upgrade, sell, and close panel handling to `handleClick`:

```typescript
    // In handleClick(), before tower card checks:
    if (state.selectedPlacedTowerId) {
      if (this.upgradeRect && this.hitTest(x, y, this.upgradeRect)) {
        tryUpgradeTower(state, state.selectedPlacedTowerId);
        return;
      }

      if (this.sellRect && this.hitTest(x, y, this.sellRect)) {
        if (state.pendingSellTowerId === state.selectedPlacedTowerId) {
          // Second click -- confirm sell
          trySellTower(state, state.selectedPlacedTowerId);
          state.selectedPlacedTowerId = null;
          state.pendingSellTowerId = null;
        } else {
          // First click -- set pending
          state.pendingSellTowerId = state.selectedPlacedTowerId;
        }
        return;
      }

      if (this.closePanelRect && this.hitTest(x, y, this.closePanelRect)) {
        state.selectedPlacedTowerId = null;
        state.pendingSellTowerId = null;
        return;
      }
    }
```

Add the `upgradeRect`, `sellRect`, and `closePanelRect` properties to the InputSystem class:

```typescript
  upgradeRect: { x: number; y: number; w: number; h: number } | null = null;
  sellRect: { x: number; y: number; w: number; h: number } | null = null;
  closePanelRect: { x: number; y: number; w: number; h: number } | null = null;
```

**What's happening:**
- The upgrade button triggers `tryUpgradeTower`, which handles all validation internally.
- The sell button uses a two-stage confirmation. First click sets `pendingSellTowerId` to the tower's ID, which changes the button label to "Confirm?". Second click checks if `pendingSellTowerId` matches and calls `trySellTower`.
- The close button clears both the selection and any pending sell confirmation, fully resetting the panel state.
- The `hitTest` helper checks if a point is within a rectangle, reused for all button clicks.

---

### 7. Update the UIRenderer.render() to Show the Panel

At the end of `UIRenderer.render()`, add:

```typescript
    // Upgrade panel (when a placed tower is selected)
    if (state.selectedPlacedTowerId) {
      this.renderUpgradePanel(ctx, state, canvasW, canvasH, input);
    }
```

---

## Test It

1. **Run:** `npm run dev`
2. **Open:** the Tower Defense game in your browser
3. **Observe:**
   - Place a tower, then **click it** -- a stats panel appears showing damage, range, and fire speed
   - A **dashed range ring** in the tower's color shows its coverage area
   - The **tower barrel rotates** to track the nearest enemy
   - A **dashed targeting line** connects the tower to its current target
   - Click the **upgrade button** -- gold is spent, the level star fills, and stats increase
   - The **range ring grows larger** after upgrading (1.2x at L2, 1.4x at L3)
   - At **Level 3**, the upgrade button shows "MAX"
   - Click the **sell button** once -- it changes to "Confirm?"
   - Click again -- the tower is removed and 60% of total investment is refunded
   - Click the **X button** or press **ESC** to close the panel without selling

---

## Challenges

**Easy:**
- Change `sellRefund` to return 80% instead of 60% and see how it changes your strategy (hint: it makes repositioning nearly free).
- Add a fourth upgrade level with 3.5x damage and 1.6x range.

**Medium:**
- Show "next level" stats preview in the upgrade panel: display the stat changes that will happen after upgrading (e.g., "DMG: 10 -> 16") in green text.

**Hard:**
- Implement tower specialization: at Level 2, offer two upgrade paths. For example, an Archer could become a "Rapid Archer" (2x fire rate, same damage) or a "Heavy Archer" (2x damage, same fire rate). Store the chosen path and modify `getTowerStats` accordingly.

---

## What You Learned

- Implementing a multi-level upgrade system with stat multipliers
- Building a detail panel UI with stats, buttons, and hit-area registration
- Adding sell confirmation with a two-click safety pattern
- Drawing range rings and targeting lines for visual feedback
- Rotating tower elements toward targets using `atan2` and canvas transforms
- Tracking total investment for fair sell refunds

**Next:** Step 8 will add Lives, UI polish, menu screens, pause, and the victory screen to complete the game!
