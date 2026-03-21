# Step 2: Upgrades & Auto-Income

**Goal:** Buy upgrades that increase click value and generate passive income every second.

**Time:** ~15 minutes

---

## What You'll Build

- **8 tiers of upgrades** (Cursor, Grandma, Farm, Mine, Factory, Bank, Temple, Wizard Tower) each generating coins per second
- **A shop panel** on the right side showing all upgrades with icons, costs, and CPS values
- **An idle income system** that accumulates coins every frame based on owned upgrades
- **Click power scaling** that grows as your CPS increases
- **Shop scrolling** with the mouse wheel for when upgrades overflow the viewport

---

## Concepts

- **Coins Per Second (CPS)**: Each upgrade type produces a fixed CPS per unit owned. Total CPS is the sum of `upgrade.cps * upgrade.owned` across all upgrades. The idle system adds `totalCps * deltaTime` coins every frame.
- **Click Power Scaling**: Click power starts at 1 and gains a bonus equal to 1% of total CPS. This rewards players who invest in upgrades -- their manual clicks become more powerful too.
- **Upgrade Tiers**: Upgrades are ordered by base cost (15 to 330M) and CPS (0.1 to 44K). Each tier is roughly 10x more expensive and 5-8x more productive than the previous, creating meaningful choices about when to save for the next tier.
- **Shop Layout**: The shop occupies a fixed-width panel on the right (32% of screen, clamped between 280-420px). Items are clipped to the panel area and scrollable.

---

## Code

### 1. Create Upgrade Data

**File:** `src/contexts/canvas2d/games/idle-clicker/data/upgrades.ts`

Defines the 8 upgrade tiers with balanced cost and CPS values.

```typescript
import type { Upgrade } from '../types';

/** Default upgrade definitions -- 8 tiers */
export function createDefaultUpgrades(): Upgrade[] {
  return [
    {
      id: 'cursor',
      name: 'Cursor',
      icon: '\u{1F5B1}',
      baseCost: 15,
      costMultiplier: 1.15,
      cps: 0.1,
      owned: 0,
    },
    {
      id: 'grandma',
      name: 'Grandma',
      icon: '\u{1F475}',
      baseCost: 100,
      costMultiplier: 1.15,
      cps: 1,
      owned: 0,
    },
    {
      id: 'farm',
      name: 'Farm',
      icon: '\u{1F33E}',
      baseCost: 1_100,
      costMultiplier: 1.15,
      cps: 8,
      owned: 0,
    },
    {
      id: 'mine',
      name: 'Mine',
      icon: '\u{26CF}',
      baseCost: 12_000,
      costMultiplier: 1.15,
      cps: 47,
      owned: 0,
    },
    {
      id: 'factory',
      name: 'Factory',
      icon: '\u{1F3ED}',
      baseCost: 130_000,
      costMultiplier: 1.15,
      cps: 260,
      owned: 0,
    },
    {
      id: 'bank',
      name: 'Bank',
      icon: '\u{1F3E6}',
      baseCost: 1_400_000,
      costMultiplier: 1.15,
      cps: 1_400,
      owned: 0,
    },
    {
      id: 'temple',
      name: 'Temple',
      icon: '\u{26E9}',
      baseCost: 20_000_000,
      costMultiplier: 1.15,
      cps: 7_800,
      owned: 0,
    },
    {
      id: 'wizard',
      name: 'Wizard Tower',
      icon: '\u{1F9D9}',
      baseCost: 330_000_000,
      costMultiplier: 1.15,
      cps: 44_000,
      owned: 0,
    },
  ];
}
```

**What's happening:**
- Each upgrade is a fresh object (created inside the function, not a module-level constant) so that restarting the game gets a clean copy with `owned: 0`.
- The `costMultiplier` of 1.15 means each subsequent purchase of the same upgrade is 15% more expensive. This exponential scaling is the heart of the idle genre.
- CPS values are carefully tuned: Cursors produce 0.1/s (a tenth of a coin), while Wizard Towers produce 44,000/s. The ratio between tiers keeps all of them relevant at different stages.
- Unicode escape sequences (`\u{1F5B1}`) are used for icons so the source file stays ASCII-clean.

---

### 2. Create the Utility Functions

**File:** `src/contexts/canvas2d/games/idle-clicker/utils.ts`

Calculates upgrade costs based on owned count.

```typescript
import type { Upgrade } from './types';

/** Calculate the current cost of an upgrade based on owned count */
export function getUpgradeCost(upgrade: Upgrade): number {
  return Math.floor(
    upgrade.baseCost * Math.pow(upgrade.costMultiplier, upgrade.owned),
  );
}
```

**What's happening:**
- The formula `baseCost * multiplier^owned` is the classic idle game cost curve. A Cursor starts at 15 coins; after buying 10, it costs `15 * 1.15^10 = 60` coins. After 50 purchases, it costs `15 * 1.15^50 = 16,367` coins.
- `Math.floor()` keeps costs as clean integers for display.

---

### 3. Create the Idle System

**File:** `src/contexts/canvas2d/games/idle-clicker/systems/IdleSystem.ts`

Recalculates CPS every frame and accumulates passive income.

```typescript
import type { IdleState } from '../types';

export class IdleSystem {
  update(state: IdleState, dt: number): void {
    const dtSec = dt / 1000;

    // Recalculate CPS from all upgrades
    let totalCps = 0;
    for (const u of state.upgrades) {
      totalCps += u.cps * u.owned;
    }
    state.cps = totalCps;

    // Add passive income
    if (totalCps > 0) {
      const earned = totalCps * dtSec;
      state.coins += earned;
      state.totalCoinsEarned += earned;
    }

    // Update click power: base 1 + 1% of CPS as bonus
    state.clickPower = 1 + totalCps * 0.01;
  }
}
```

**What's happening:**
- CPS is recalculated every frame rather than cached, so it updates instantly when the player buys an upgrade. At 60fps this loop over 8 upgrades is trivially fast.
- Passive income is `totalCps * dtSec` -- proportional to the actual elapsed time. If a frame takes 20ms, the player earns `cps * 0.02` coins. This makes income frame-rate independent.
- Click power grows with CPS: at 100 CPS, each click is worth 2 coins; at 10,000 CPS, each click is worth 101. This keeps clicking rewarding even in the late game.

---

### 4. Create the Shop Renderer

**File:** `src/contexts/canvas2d/games/idle-clicker/renderers/ShopRenderer.ts`

Draws the right-side panel with all upgrade items.

```typescript
import type { IdleState } from '../types';
import { SHOP_WIDTH_RATIO, SHOP_MIN_WIDTH, SHOP_MAX_WIDTH } from '../types';
import { getUpgradeCost } from '../utils';

export class ShopRenderer {
  render(ctx: CanvasRenderingContext2D, state: IdleState): void {
    const W = state.width;
    const H = state.height;
    const shopW = Math.max(SHOP_MIN_WIDTH, Math.min(SHOP_MAX_WIDTH, W * SHOP_WIDTH_RATIO));
    const shopX = W - shopW;

    // Shop background
    ctx.fillStyle = 'rgba(10, 10, 20, 0.95)';
    ctx.fillRect(shopX, 0, shopW, H);

    // Left border accent
    ctx.strokeStyle = '#ffc107';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(shopX, 0);
    ctx.lineTo(shopX, H);
    ctx.stroke();

    // Header
    const headerH = 60;
    ctx.fillStyle = 'rgba(255, 193, 7, 0.1)';
    ctx.fillRect(shopX, 0, shopW, headerH);

    ctx.fillStyle = '#ffc107';
    ctx.font = `bold ${Math.min(20, shopW * 0.06)}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('UPGRADES', shopX + shopW / 2, headerH / 2);

    // Clip shop items area
    ctx.save();
    ctx.beginPath();
    ctx.rect(shopX, headerH, shopW, H - headerH);
    ctx.clip();

    // Render upgrade items
    const itemH = 72;
    const pad = 10;

    for (let i = 0; i < state.upgrades.length; i++) {
      const u = state.upgrades[i];
      const y = headerH + i * itemH - state.shopScroll;

      // Skip if off-screen
      if (y + itemH < headerH || y > H) continue;

      const cost = getUpgradeCost(u);
      const canAfford = state.coins >= cost;

      // Item background
      ctx.fillStyle = canAfford
        ? 'rgba(255, 193, 7, 0.08)'
        : 'rgba(255, 255, 255, 0.02)';
      ctx.fillRect(shopX + 4, y + 2, shopW - 8, itemH - 4);

      // Border for affordable items
      if (canAfford) {
        ctx.strokeStyle = 'rgba(255, 193, 7, 0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(shopX + 4, y + 2, shopW - 8, itemH - 4, 4);
        ctx.stroke();
      }

      // Icon
      const iconSize = Math.min(28, shopW * 0.08);
      ctx.font = `${iconSize}px serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(u.icon, shopX + pad, y + itemH / 2);

      const textX = shopX + pad + iconSize + 8;
      const maxTextW = shopW - pad * 2 - iconSize - 12;

      // Name + owned count
      ctx.fillStyle = canAfford ? '#fff' : '#666';
      ctx.font = `bold ${Math.min(14, shopW * 0.04)}px monospace`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(u.name, textX, y + 8);

      // Owned badge
      if (u.owned > 0) {
        const ownedText = `x${u.owned}`;
        const nameW = ctx.measureText(u.name).width;
        ctx.fillStyle = '#ffc107';
        ctx.font = `bold ${Math.min(12, shopW * 0.035)}px monospace`;
        ctx.fillText(ownedText, textX + nameW + 8, y + 9);
      }

      // Cost
      ctx.fillStyle = canAfford ? '#4caf50' : '#c62828';
      ctx.font = `${Math.min(12, shopW * 0.035)}px monospace`;
      ctx.textBaseline = 'middle';
      ctx.fillText(`Cost: ${cost}`, textX, y + itemH / 2 + 2);

      // CPS contribution
      ctx.fillStyle = '#888';
      ctx.font = `${Math.min(11, shopW * 0.032)}px monospace`;
      ctx.textBaseline = 'bottom';
      const totalCps = u.cps * u.owned;
      const cpsText = u.owned > 0
        ? `+${u.cps}/s each | Total: ${totalCps}/s`
        : `+${u.cps}/s each`;
      ctx.fillText(cpsText, textX, y + itemH - 6, maxTextW);
    }

    ctx.restore();
  }
}
```

**What's happening:**
- The shop panel is drawn on the right side of the screen with a dark semi-transparent background, visually separated by a gold left-border accent line.
- Each upgrade item shows four pieces of information: icon + name (with owned count badge), cost (green if affordable, red if not), and CPS contribution.
- Affordable items get a subtle gold background highlight and rounded border, making it immediately obvious what the player can buy.
- `ctx.save()` / `ctx.clip()` / `ctx.restore()` ensures upgrade items that extend beyond the panel boundaries are clipped cleanly. This is essential for scroll support.

---

### 5. Update the Input System

**File:** `src/contexts/canvas2d/games/idle-clicker/systems/InputSystem.ts`

Add shop clicking and scroll wheel support.

```typescript
import type { IdleState, Upgrade } from '../types';
import { SHOP_WIDTH_RATIO, SHOP_MIN_WIDTH, SHOP_MAX_WIDTH } from '../types';

export type ClickCallback = (x: number, y: number) => void;
export type BuyCallback = (upgrade: Upgrade) => void;

export class InputSystem {
  private canvas: HTMLCanvasElement;
  private state: IdleState;
  private onCoinClick: ClickCallback;
  private onBuyUpgrade: BuyCallback;
  private onExit: () => void;

  private handleClick: (e: MouseEvent) => void;
  private handleKey: (e: KeyboardEvent) => void;
  private handleWheel: (e: WheelEvent) => void;

  constructor(
    canvas: HTMLCanvasElement,
    state: IdleState,
    onCoinClick: ClickCallback,
    onBuyUpgrade: BuyCallback,
    onExit: () => void,
  ) {
    this.canvas = canvas;
    this.state = state;
    this.onCoinClick = onCoinClick;
    this.onBuyUpgrade = onBuyUpgrade;
    this.onExit = onExit;

    this.handleClick = this.onClick.bind(this);
    this.handleKey = this.onKey.bind(this);
    this.handleWheel = this.onWheel.bind(this);
  }

  attach(): void {
    this.canvas.addEventListener('click', this.handleClick);
    window.addEventListener('keydown', this.handleKey);
    this.canvas.addEventListener('wheel', this.handleWheel, { passive: true });
  }

  detach(): void {
    this.canvas.removeEventListener('click', this.handleClick);
    window.removeEventListener('keydown', this.handleKey);
    this.canvas.removeEventListener('wheel', this.handleWheel);
  }

  private getShopRect(): { x: number; w: number } {
    const w = Math.max(
      SHOP_MIN_WIDTH,
      Math.min(SHOP_MAX_WIDTH, this.state.width * SHOP_WIDTH_RATIO),
    );
    return { x: this.state.width - w, w };
  }

  private onClick(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    // Check if click is in shop area
    const shop = this.getShopRect();
    if (mx >= shop.x) {
      const itemH = 72;
      const headerH = 60;
      const scrolledY = my - headerH + this.state.shopScroll;
      const idx = Math.floor(scrolledY / itemH);

      if (idx >= 0 && idx < this.state.upgrades.length) {
        this.onBuyUpgrade(this.state.upgrades[idx]);
      }
      return;
    }

    // Check if click is on the coin button
    const btn = this.state.coinButton;
    const dx = mx - btn.x;
    const dy = my - btn.y;

    if (dx * dx + dy * dy <= btn.radius * btn.radius) {
      this.onCoinClick(mx, my);
    }
  }

  private onKey(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      this.onExit();
    }
  }

  private onWheel(e: WheelEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const shop = this.getShopRect();

    if (mx >= shop.x) {
      const maxScroll = Math.max(
        0,
        this.state.upgrades.length * 72 - this.state.height + 60,
      );
      this.state.shopScroll = Math.max(
        0,
        Math.min(maxScroll, this.state.shopScroll + e.deltaY),
      );
    }
  }
}
```

**What's happening:**
- Clicks to the right of the shop boundary (`mx >= shop.x`) are routed to the shop. We calculate which upgrade was clicked by converting the Y position into an item index, accounting for the header height and current scroll offset.
- Clicks outside the shop still go through the coin hit-test as before.
- Mouse wheel events over the shop area adjust `shopScroll`, clamped between 0 and the maximum scroll distance. The `{ passive: true }` option tells the browser we will not call `preventDefault()`, which improves scroll performance.

---

### 6. Update the Engine

**File:** `src/contexts/canvas2d/games/idle-clicker/IdleClickerEngine.ts`

Wire in the upgrade data, idle system, shop renderer, and buy logic.

```typescript
import type { IdleState, Upgrade } from './types';
import { createDefaultUpgrades } from './data/upgrades';
import { InputSystem } from './systems/InputSystem';
import { ClickSystem } from './systems/ClickSystem';
import { IdleSystem } from './systems/IdleSystem';
import { GameRenderer } from './renderers/GameRenderer';
import { ShopRenderer } from './renderers/ShopRenderer';
import { HUDRenderer } from './renderers/HUDRenderer';
import { getUpgradeCost } from './utils';

export class IdleClickerEngine {
  private ctx: CanvasRenderingContext2D;
  private state: IdleState;
  private running = false;
  private rafId = 0;
  private lastTime = 0;

  private inputSystem: InputSystem;
  private clickSystem: ClickSystem;
  private idleSystem: IdleSystem;

  private gameRenderer: GameRenderer;
  private shopRenderer: ShopRenderer;
  private hudRenderer: HUDRenderer;
  private resizeHandler: () => void;

  constructor(canvas: HTMLCanvasElement, onExit: () => void) {
    this.ctx = canvas.getContext('2d')!;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    this.state = {
      coins: 0,
      totalCoinsEarned: 0,
      totalClicks: 0,
      clickPower: 1,
      cps: 0,
      upgrades: createDefaultUpgrades(),
      particles: [],
      coinButton: { x: 0, y: 0, radius: 80 },
      coinPulse: 0,
      shopScroll: 0,
      width: canvas.width,
      height: canvas.height,
      saveTimer: 0,
      helpVisible: false,
    };

    this.clickSystem = new ClickSystem();
    this.idleSystem = new IdleSystem();

    this.inputSystem = new InputSystem(
      canvas,
      this.state,
      (x, y) => this.clickSystem.registerClick(x, y),
      (u) => this.buyUpgrade(u),
      onExit,
    );

    this.gameRenderer = new GameRenderer();
    this.shopRenderer = new ShopRenderer();
    this.hudRenderer = new HUDRenderer();

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
    const dt = Math.min(now - this.lastTime, 200);
    this.lastTime = now;

    this.update(dt);
    this.render();
    this.rafId = requestAnimationFrame(() => this.loop());
  }

  private update(dt: number): void {
    this.clickSystem.update(this.state, dt);
    this.idleSystem.update(this.state, dt);
  }

  private render(): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.state.width, this.state.height);
    this.gameRenderer.render(ctx, this.state);
    this.shopRenderer.render(ctx, this.state);
    this.hudRenderer.render(ctx, this.state);
  }

  private buyUpgrade(upgrade: Upgrade): void {
    const cost = getUpgradeCost(upgrade);
    if (this.state.coins >= cost) {
      this.state.coins -= cost;
      upgrade.owned++;
    }
  }
}
```

**What's happening:**
- The engine now creates upgrades via `createDefaultUpgrades()` and passes a `buyUpgrade` callback to the input system.
- `buyUpgrade()` checks affordability using `getUpgradeCost()` and deducts the cost if the player has enough coins. The upgrade's `owned` count increments, and on the next frame the idle system will recalculate CPS to include the new purchase.
- The render pipeline now includes the shop renderer between the game area and HUD, layered correctly.

---

### 7. Update the Game Renderer

**File:** `src/contexts/canvas2d/games/idle-clicker/renderers/GameRenderer.ts`

Adjust the game area to leave room for the shop panel.

```typescript
// In the render() method, replace:
//   const cx = W / 2;
// with:
import { SHOP_WIDTH_RATIO, SHOP_MIN_WIDTH, SHOP_MAX_WIDTH } from '../types';

// Then in render():
const shopW = Math.max(SHOP_MIN_WIDTH, Math.min(SHOP_MAX_WIDTH, W * SHOP_WIDTH_RATIO));
const gameW = W - shopW;

// Background fills only the game area
ctx.fillRect(0, 0, gameW, H);

// Center coin within game area (not full width)
const cx = gameW / 2;
```

Update the HUD renderer similarly to center text in the game area (left of the shop panel) rather than the full canvas width.

---

## Test It

1. **Run:** `npm run dev`
2. **Open:** the Idle Clicker game
3. **Observe:**
   - The **shop panel** appears on the right with 8 upgrades listed
   - All upgrades start **grayed out** (you cannot afford them yet)
   - Click the coin 15+ times -- the **Cursor** upgrade turns **gold-highlighted**
   - Click the Cursor upgrade -- it shows **x1** and its cost increases
   - After a moment, coins start **automatically ticking up** (0.1/s from one Cursor)
   - Buy more Cursors and watch the CPS display update below the coin
   - Your **click power** at the bottom-left grows as CPS increases
   - **Scroll the shop** with the mouse wheel if the window is small
   - Save up for a Grandma (100 coins) and notice the jump to 1.0/s per unit

---

## Challenges

**Easy:**
- Add a 9th upgrade tier (e.g., "Dragon" at base cost 5B, CPS 250,000).

**Medium:**
- Display a "CPS per second" label next to the coin count, showing the rate coins are accumulating.

**Hard:**
- Add a "Buy 10" mode: hold Shift while clicking an upgrade to buy 10 at once (calculate the total cost of 10 purchases using the geometric series formula).

---

## What You Learned

- Designing tiered upgrades with exponential cost scaling (`baseCost * multiplier^owned`)
- Building a passive income system that adds `CPS * dt` coins every frame
- Rendering a scrollable shop panel with affordability highlighting
- Connecting input events to game logic through callback functions

**Next:** Cost Scaling & Formatting -- abbreviate large numbers as K, M, B and see exponential costs in action!
