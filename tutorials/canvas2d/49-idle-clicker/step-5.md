# Step 5: Offline Progress & Polish

**Goal:** Calculate earnings while the player is away, save/load with localStorage, and add final polish.

**Time:** ~15 minutes

---

## What You'll Build

- **Auto-save system** that persists progress to localStorage every 30 seconds and on exit
- **Save/load logic** that serializes coins, upgrades, prestige state, and a timestamp
- **Offline earnings** calculated on load: the game figures out how much CPS income the player would have earned while away (capped at 8 hours)
- **Help overlay** with game controls and tips
- **Final save on destroy** so progress is never lost when navigating away

---

## Concepts

- **Offline Progress**: When the player returns, we calculate `elapsed = now - savedTimestamp`, compute CPS from saved upgrade data, and award `cps * elapsed` coins. This is capped at 8 hours to prevent absurd accumulation and to encourage regular play.
- **Serialization Strategy**: We only save the minimum needed to reconstruct state: coins, total earned, total clicks, upgrade `id` + `owned` pairs, prestige fields, and a timestamp. Transient data (particles, pulse, button bounds) is not saved -- it is recalculated on load.
- **Auto-Save Timer**: A timer accumulates delta-time each frame. Every 30 seconds it triggers a save. This balances between data safety (frequent saves) and performance (localStorage writes are synchronous).
- **Graceful Failure**: All localStorage operations are wrapped in try/catch. If storage is full, unavailable, or the save is corrupted, the game silently continues with a fresh state rather than crashing.

---

## Code

### 1. Update the Idle System with Save/Load

**File:** `src/contexts/canvas2d/games/idle-clicker/systems/IdleSystem.ts`

Add save, load, and auto-save timer logic.

```typescript
import type { IdleState } from '../types';
import { SAVE_KEY, AUTO_SAVE_INTERVAL } from '../types';
import { getPrestigeMultiplier } from '../utils';

export class IdleSystem {
  update(state: IdleState, dt: number): void {
    const dtSec = dt / 1000;
    const prestigeMult = getPrestigeMultiplier(state.prestigePoints);

    // Recalculate CPS from all upgrades
    let baseCps = 0;
    for (const u of state.upgrades) {
      baseCps += u.cps * u.owned;
    }
    state.cps = baseCps * prestigeMult;

    // Add passive income
    if (state.cps > 0) {
      const earned = state.cps * dtSec;
      state.coins += earned;
      state.totalCoinsEarned += earned;
      state.runCoinsEarned += earned;
    }

    // Update click power: base 1 + 1% of CPS, boosted by prestige
    state.clickPower = (1 + baseCps * 0.01) * prestigeMult;

    // Auto-save timer
    state.saveTimer += dtSec;
    if (state.saveTimer >= AUTO_SAVE_INTERVAL) {
      state.saveTimer = 0;
      this.save(state);
    }
  }

  /** Persist current progress to localStorage */
  save(state: IdleState): void {
    try {
      const data = {
        coins: state.coins,
        totalCoinsEarned: state.totalCoinsEarned,
        totalClicks: state.totalClicks,
        upgrades: state.upgrades.map((u) => ({ id: u.id, owned: u.owned })),
        prestigePoints: state.prestigePoints,
        prestigeCount: state.prestigeCount,
        runCoinsEarned: state.runCoinsEarned,
        timestamp: Date.now(),
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch {
      // Storage may be full or unavailable -- silently skip
    }
  }

  /** Load saved progress, applying offline earnings */
  load(state: IdleState): void {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return;

      const data = JSON.parse(raw) as {
        coins: number;
        totalCoinsEarned: number;
        totalClicks: number;
        upgrades: { id: string; owned: number }[];
        prestigePoints: number;
        prestigeCount: number;
        runCoinsEarned: number;
        timestamp: number;
      };

      state.totalClicks = data.totalClicks ?? 0;
      state.prestigePoints = data.prestigePoints ?? 0;
      state.prestigeCount = data.prestigeCount ?? 0;
      state.runCoinsEarned = data.runCoinsEarned ?? 0;

      // Restore upgrade owned counts
      for (const saved of data.upgrades) {
        const upgrade = state.upgrades.find((u) => u.id === saved.id);
        if (upgrade) upgrade.owned = saved.owned;
      }

      // Calculate CPS to apply offline earnings
      let totalCps = 0;
      for (const u of state.upgrades) {
        totalCps += u.cps * u.owned;
      }

      // Apply prestige multiplier to CPS
      const prestigeMult = getPrestigeMultiplier(state.prestigePoints);
      totalCps *= prestigeMult;

      // Offline earnings (capped at 8 hours)
      const elapsed = Math.min(
        (Date.now() - data.timestamp) / 1000,
        8 * 3600,
      );
      const offlineEarnings = totalCps * elapsed;

      state.coins = data.coins + offlineEarnings;
      state.totalCoinsEarned = (data.totalCoinsEarned ?? 0) + offlineEarnings;
    } catch {
      // Corrupted save -- start fresh
    }
  }
}
```

**What's happening:**
- `save()` serializes the minimum state needed to reconstruct the game. Upgrade data is stored as `{ id, owned }` pairs rather than full objects, so adding new upgrades in future versions does not break old saves.
- `load()` restores upgrade counts by matching on `id`, which is resilient to reordering or adding new upgrade tiers. Upgrades not found in the save data keep their default `owned: 0`.
- Offline earnings calculation: we compute CPS from restored upgrades, multiply by the prestige multiplier, then multiply by elapsed seconds since the save timestamp. The 8-hour cap (`8 * 3600` seconds = 28,800 seconds) prevents returning after a week to find trillions of coins.
- The `??` (nullish coalescing) operator provides defaults for fields that may not exist in older save formats, ensuring forward compatibility.
- Both `save()` and `load()` use bare `catch` blocks to silently handle any failure -- localStorage may be disabled, full, or contain corrupted JSON.

---

### 2. Update the Engine with Final Save and Help

**File:** `src/contexts/canvas2d/games/idle-clicker/IdleClickerEngine.ts`

Add load-on-start, save-on-exit, and help overlay integration.

```typescript
import type { IdleState, Upgrade } from './types';
import { createDefaultUpgrades } from './data/upgrades';
import { InputSystem } from './systems/InputSystem';
import { ClickSystem } from './systems/ClickSystem';
import { IdleSystem } from './systems/IdleSystem';
import { GameRenderer } from './renderers/GameRenderer';
import { ShopRenderer } from './renderers/ShopRenderer';
import { HUDRenderer } from './renderers/HUDRenderer';
import { getUpgradeCost, calcPrestigePoints } from './utils';

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
      prestigePoints: 0,
      prestigeCount: 0,
      runCoinsEarned: 0,
    };

    this.clickSystem = new ClickSystem();
    this.idleSystem = new IdleSystem();

    this.inputSystem = new InputSystem(
      canvas,
      this.state,
      (x, y) => this.clickSystem.registerClick(x, y),
      (u) => this.buyUpgrade(u),
      onExit,
      () => this.prestige(),
      () => { this.state.helpVisible = !this.state.helpVisible; },
    );

    this.gameRenderer = new GameRenderer();
    this.shopRenderer = new ShopRenderer();
    this.hudRenderer = new HUDRenderer();

    // Load saved progress (including offline earnings)
    this.idleSystem.load(this.state);

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
    // Final save on exit
    this.idleSystem.save(this.state);
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

  private prestige(): void {
    const newPoints = calcPrestigePoints(this.state.totalCoinsEarned);
    if (newPoints <= this.state.prestigePoints) return;

    this.state.prestigePoints = newPoints;
    this.state.prestigeCount++;
    this.state.coins = 0;
    this.state.runCoinsEarned = 0;
    this.state.totalClicks = 0;
    this.state.clickPower = 1;
    this.state.cps = 0;
    this.state.upgrades = createDefaultUpgrades();
    this.state.particles = [];
    this.state.coinPulse = 0;
    this.state.shopScroll = 0;
  }
}
```

**What's happening:**
- `this.idleSystem.load(this.state)` is called in the constructor, before the first frame. If a save exists, the player's coins, upgrades, and prestige are restored, plus any offline earnings are added.
- `destroy()` calls `this.idleSystem.save(this.state)` as its last action, ensuring progress is saved when the player exits the game or navigates away.
- The help toggle callback flips `state.helpVisible`, which the HUD or a help overlay renderer can check to show/hide the overlay.
- The full input system now receives callbacks for coin clicks, upgrade purchases, exit, prestige, and help toggle.

---

### 3. Update the Input System (Final Version)

**File:** `src/contexts/canvas2d/games/idle-clicker/systems/InputSystem.ts`

Add prestige and help toggle callbacks.

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
  private onPrestige: () => void;
  private onToggleHelp: () => void;

  private handleClick: (e: MouseEvent) => void;
  private handleKey: (e: KeyboardEvent) => void;
  private handleWheel: (e: WheelEvent) => void;

  constructor(
    canvas: HTMLCanvasElement,
    state: IdleState,
    onCoinClick: ClickCallback,
    onBuyUpgrade: BuyCallback,
    onExit: () => void,
    onPrestige: () => void,
    onToggleHelp: () => void,
  ) {
    this.canvas = canvas;
    this.state = state;
    this.onCoinClick = onCoinClick;
    this.onBuyUpgrade = onBuyUpgrade;
    this.onExit = onExit;
    this.onPrestige = onPrestige;
    this.onToggleHelp = onToggleHelp;

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
    } else if (e.key === 'p' || e.key === 'P') {
      this.onPrestige();
    } else if (e.key === 'h' || e.key === 'H') {
      this.onToggleHelp();
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
- The input system now handles all keyboard shortcuts: ESC (exit), P (prestige), and H (help toggle).
- Each key maps to a callback provided by the engine, keeping the input system decoupled from game logic. The input system does not know what "prestige" means -- it just calls the callback.

---

### 4. Create the Help Data

**File:** `src/contexts/canvas2d/games/idle-clicker/data/help.ts`

Define the help overlay content.

```typescript
export interface GameHelp {
  goal: string;
  controls: { key: string; action: string }[];
  tips: string[];
}

export const IDLE_CLICKER_HELP: GameHelp = {
  goal: 'Click to earn coins, buy upgrades, and build a passive income empire!',
  controls: [
    { key: 'Left Click (Coin)', action: 'Earn coins' },
    { key: 'Left Click (Shop)', action: 'Buy upgrade' },
    { key: 'Scroll Wheel', action: 'Scroll shop panel' },
    { key: 'P', action: 'Prestige (reset for multiplier)' },
    { key: 'H', action: 'Toggle help overlay' },
    { key: 'ESC', action: 'Exit to menu' },
  ],
  tips: [
    'Each upgrade produces coins per second automatically',
    'Upgrade costs increase with each purchase (cost x 1.15)',
    'Click power grows with your CPS -- buy upgrades to click harder',
    'Progress auto-saves every 30 seconds and on exit',
    'You earn offline income (up to 8 hours) when you return',
    'Background color evolves as your total earnings grow',
    'Prestige resets progress but gives a permanent income multiplier',
  ],
};
```

**What's happening:**
- The help data is a simple data structure with a goal description, control mappings, and gameplay tips. This can be rendered by a reusable help overlay component.
- Tips cover the core mechanics: CPS, cost scaling, click power growth, auto-save, offline earnings, visual progression, and prestige. Each tip gives the player a concrete piece of knowledge to improve their play.

---

## Test It

1. **Run:** `npm run dev`
2. **Open:** the Idle Clicker game
3. **Test auto-save:**
   - Play for 30+ seconds (buy some upgrades, accumulate coins)
   - **Refresh the page** -- your coins, upgrades, and prestige should be **fully restored**
   - The coin count may be slightly higher than when you left due to offline earnings
4. **Test offline earnings:**
   - Note your current coins and CPS
   - Close the browser tab and wait **60 seconds**
   - Reopen the game -- you should have earned roughly `CPS * 60` additional coins
   - The offline cap is 8 hours, so even closing overnight will award progress
5. **Test save-on-exit:**
   - Buy an upgrade and immediately press ESC or navigate away
   - Reopen the game -- the upgrade purchase is preserved (saved on destroy)
6. **Test prestige persistence:**
   - Prestige (press P when available), then refresh
   - Your prestige points and multiplier should persist across page loads
7. **Test help overlay:**
   - Press **H** to toggle the help overlay
   - Verify all controls and tips are displayed
8. **Test corrupted save:**
   - Open DevTools, go to Application > Local Storage
   - Manually corrupt the `idle_clicker_save` value (e.g., set it to "broken")
   - Refresh -- the game should start fresh without crashing

---

## Challenges

**Easy:**
- Change the auto-save interval from 30 seconds to 10 seconds and verify saves happen more frequently.
- Add a "Last saved: Xs ago" display in the HUD.

**Medium:**
- Show an "Offline earnings: +X coins" notification when the game loads with offline progress, displayed for 5 seconds before fading out.

**Hard:**
- Add an export/import system: a button that copies the save data to the clipboard as a Base64 string, and an input field that accepts a pasted string to restore progress. This lets players transfer saves between devices.

---

## What You Learned

- Serializing game state to localStorage with minimal data (only what cannot be recalculated)
- Calculating offline earnings from saved CPS and elapsed time, with a sensible cap
- Implementing auto-save with a frame-based timer and final save on destroy
- Handling save/load failures gracefully with try/catch
- Building a complete idle clicker with all core mechanics: clicking, upgrades, passive income, cost scaling, number formatting, prestige, and persistence

**Congratulations!** You have built a complete Idle Clicker game with all the core mechanics of the genre. Continue to [Brick Builder](../50-brick-builder/README.md) to learn 3D-style stacking and creative building tools!
