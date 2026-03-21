# Step 1: Project Setup & Click Counter

**Goal:** Draw a clickable coin button and a currency counter that increases on every click.

**Time:** ~15 minutes

---

## What You'll Build

- **Type definitions** for the entire idle clicker game state
- **A golden coin button** in the center of the screen with a radial gradient and glow
- **A click counter** that awards coins when you click the coin
- **Floating "+1" particles** that drift upward and fade out after each click
- **Pulse animation** on the coin when clicked
- **Platform adapter** and entry point that plug into the game framework

---

## Concepts

- **Idle Clicker State**: The game tracks `coins`, `clickPower`, `totalClicks`, and an array of `ClickParticle` objects. Defining the full state type up front means we never restructure later.
- **Click Particles**: Each click spawns a small text element ("+1") that floats upward with a velocity (`vy`) and fades out over its `life` timer. This gives satisfying visual feedback.
- **Coin Pulse**: A scalar (`coinPulse`) jumps to 1.0 on click and decays back to 0 each frame. The coin radius is multiplied by `1 + coinPulse * 0.15`, creating a quick "pop" effect.
- **Radial Gradient**: The coin uses `createRadialGradient` with gold tones to look three-dimensional, plus a larger outer glow gradient for atmosphere.

---

## Code

### 1. Create Types

**File:** `src/contexts/canvas2d/games/idle-clicker/types.ts`

All the types we will need across every step, defined up front.

```typescript
/** Represents a purchasable upgrade that generates coins per second */
export interface Upgrade {
  id: string;
  name: string;
  icon: string;
  baseCost: number;
  costMultiplier: number;
  /** Coins per second this upgrade generates (per unit owned) */
  cps: number;
  owned: number;
}

/** A click particle for visual feedback */
export interface ClickParticle {
  x: number;
  y: number;
  text: string;
  alpha: number;
  vy: number;
  life: number;
}

/** Full game state for the idle clicker */
export interface IdleState {
  coins: number;
  totalCoinsEarned: number;
  totalClicks: number;
  clickPower: number;
  cps: number;
  upgrades: Upgrade[];
  particles: ClickParticle[];
  /** Center coin button bounds */
  coinButton: { x: number; y: number; radius: number };
  /** Pulse animation scalar */
  coinPulse: number;
  /** Shop scroll offset */
  shopScroll: number;
  /** Canvas dimensions */
  width: number;
  height: number;
  /** Time accumulator for auto-save */
  saveTimer: number;
  /** Whether the help overlay is visible */
  helpVisible: boolean;
}

/** localStorage key for persisting progress */
export const SAVE_KEY = 'idle_clicker_save';

/** Auto-save interval in seconds */
export const AUTO_SAVE_INTERVAL = 30;

/** Shop panel width ratio */
export const SHOP_WIDTH_RATIO = 0.32;

/** Minimum shop panel width */
export const SHOP_MIN_WIDTH = 280;

/** Maximum shop panel width */
export const SHOP_MAX_WIDTH = 420;

/** Background color tiers based on total coins earned */
export const BG_TIERS: { threshold: number; from: string; to: string }[] = [
  { threshold: 0, from: '#1a1a2e', to: '#16213e' },
  { threshold: 1_000, from: '#1a1a3e', to: '#0f3460' },
  { threshold: 100_000, from: '#1b1b4e', to: '#533483' },
  { threshold: 10_000_000, from: '#2d1b4e', to: '#e94560' },
  { threshold: 1_000_000_000, from: '#4a0e0e', to: '#ffc107' },
];
```

**What's happening:**
- `Upgrade` holds everything for a purchasable item: its base cost, cost growth multiplier, coins-per-second value, and how many the player owns. We will use this in Step 2.
- `ClickParticle` has position, display text, alpha for fade, vertical velocity, and a life timer. Particles are created on click and removed when `life <= 0`.
- `IdleState` is the single source of truth: coins, click power, CPS, upgrades array, particles, coin button bounds, animation state, and canvas dimensions. Every system and renderer reads from this one object.
- `BG_TIERS` defines background gradient milestones -- as the player earns more total coins, the background evolves through increasingly dramatic color schemes.

---

### 2. Create the Game Renderer

**File:** `src/contexts/canvas2d/games/idle-clicker/renderers/GameRenderer.ts`

Draws the gradient background, the golden coin button, and floating click particles.

```typescript
import type { IdleState } from '../types';
import { BG_TIERS } from '../types';

export class GameRenderer {
  render(ctx: CanvasRenderingContext2D, state: IdleState): void {
    const W = state.width;
    const H = state.height;

    // Background gradient based on progression
    const tier = this.getBackgroundTier(state.totalCoinsEarned);
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, tier.from);
    grad.addColorStop(1, tier.to);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Coin button position and size
    const cx = W / 2;
    const cy = H * 0.45;
    const baseRadius = Math.min(W, H) * 0.15;
    const pulse = 1 + state.coinPulse * 0.15;
    const r = baseRadius * pulse;

    // Update button bounds in state for hit-testing
    state.coinButton.x = cx;
    state.coinButton.y = cy;
    state.coinButton.radius = baseRadius * 1.15; // Slightly larger hitbox

    // Glow effect behind coin
    const glowGrad = ctx.createRadialGradient(cx, cy, r * 0.5, cx, cy, r * 2);
    glowGrad.addColorStop(0, 'rgba(255, 193, 7, 0.3)');
    glowGrad.addColorStop(1, 'rgba(255, 193, 7, 0)');
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 2, 0, Math.PI * 2);
    ctx.fill();

    // Coin circle with radial gradient
    const coinGrad = ctx.createRadialGradient(
      cx - r * 0.3, cy - r * 0.3, 0,
      cx, cy, r,
    );
    coinGrad.addColorStop(0, '#ffe082');
    coinGrad.addColorStop(0.5, '#ffc107');
    coinGrad.addColorStop(1, '#f57f17');
    ctx.fillStyle = coinGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    // Coin border
    ctx.strokeStyle = '#ff8f00';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();

    // Dollar sign on coin
    ctx.fillStyle = '#e65100';
    ctx.font = `bold ${Math.floor(r * 0.8)}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('$', cx, cy);

    // Inner ring detail
    ctx.strokeStyle = 'rgba(255, 224, 130, 0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.75, 0, Math.PI * 2);
    ctx.stroke();

    // "Click!" hint text below coin
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.font = `${Math.floor(Math.min(16, W * 0.03))}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('Click to earn!', cx, cy + r + 20);

    // Click particles
    for (const p of state.particles) {
      if (p.alpha <= 0) continue;
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = '#ffc107';
      ctx.font = `bold ${Math.floor(Math.min(18, W * 0.035))}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.text, p.x, p.y);
    }
    ctx.globalAlpha = 1;
  }

  private getBackgroundTier(totalCoins: number): { from: string; to: string } {
    let result = BG_TIERS[0];
    for (const tier of BG_TIERS) {
      if (totalCoins >= tier.threshold) {
        result = tier;
      }
    }
    return result;
  }
}
```

**What's happening:**
- The background uses a vertical linear gradient that changes color based on total coins earned, giving a sense of progression even when the player is not looking at the numbers.
- The coin is drawn with a three-stop radial gradient (light gold highlight at top-left, standard gold in the middle, deep amber at the edge) to create a 3D metallic look.
- A larger radial gradient behind the coin creates an atmospheric glow effect.
- The `pulse` value scales the coin radius by up to 15%, creating a satisfying pop when clicked. The inner ring and dollar sign scale together.
- Particles are drawn with `globalAlpha` set to their current `alpha` value, so they naturally fade out.

---

### 3. Create the Click System

**File:** `src/contexts/canvas2d/games/idle-clicker/systems/ClickSystem.ts`

Processes clicks, awards coins, spawns particles, and runs the pulse animation.

```typescript
import type { IdleState, ClickParticle } from '../types';

export class ClickSystem {
  private pendingClicks: { x: number; y: number }[] = [];

  /** Enqueue a click to be processed next frame */
  registerClick(x: number, y: number): void {
    this.pendingClicks.push({ x, y });
  }

  update(state: IdleState, dt: number): void {
    // Process pending clicks
    for (const click of this.pendingClicks) {
      const earned = state.clickPower;
      state.coins += earned;
      state.totalCoinsEarned += earned;
      state.totalClicks++;

      // Trigger pulse
      state.coinPulse = 1.0;

      // Spawn particle
      const particle: ClickParticle = {
        x: click.x + (Math.random() - 0.5) * 40,
        y: click.y - 10,
        text: `+${formatClickAmount(earned)}`,
        alpha: 1,
        vy: -60 - Math.random() * 40,
        life: 1.0,
      };
      state.particles.push(particle);
    }
    this.pendingClicks.length = 0;

    // Update particles
    const dtSec = dt / 1000;
    for (let i = state.particles.length - 1; i >= 0; i--) {
      const p = state.particles[i];
      p.y += p.vy * dtSec;
      p.life -= dtSec * 1.2;
      p.alpha = Math.max(0, p.life);
      if (p.life <= 0) {
        state.particles.splice(i, 1);
      }
    }

    // Decay pulse
    if (state.coinPulse > 0) {
      state.coinPulse = Math.max(0, state.coinPulse - dtSec * 5);
    }
  }
}

function formatClickAmount(n: number): string {
  if (n >= 1) return Math.floor(n).toString();
  return n.toFixed(1);
}
```

**What's happening:**
- Clicks are queued with `registerClick()` and processed in `update()`, separating input handling from game logic. This is a standard game pattern that prevents timing issues.
- Each click adds `clickPower` coins (starts at 1), increments the total counter, sets `coinPulse` to 1.0, and spawns a particle at the click position with slight random horizontal offset.
- Particles float upward (`vy` is negative, meaning up on screen) and fade out over 1 second. Dead particles are removed by iterating backward and splicing.
- The pulse decays at 5x speed, so it snaps back to normal in about 0.2 seconds -- fast enough to feel punchy.

---

### 4. Create the Input System

**File:** `src/contexts/canvas2d/games/idle-clicker/systems/InputSystem.ts`

Listens for mouse clicks and dispatches them to the click system.

```typescript
import type { IdleState } from '../types';

export type ClickCallback = (x: number, y: number) => void;

export class InputSystem {
  private canvas: HTMLCanvasElement;
  private state: IdleState;
  private onCoinClick: ClickCallback;
  private onExit: () => void;

  private handleClick: (e: MouseEvent) => void;
  private handleKey: (e: KeyboardEvent) => void;

  constructor(
    canvas: HTMLCanvasElement,
    state: IdleState,
    onCoinClick: ClickCallback,
    onExit: () => void,
  ) {
    this.canvas = canvas;
    this.state = state;
    this.onCoinClick = onCoinClick;
    this.onExit = onExit;

    this.handleClick = this.onClick.bind(this);
    this.handleKey = this.onKey.bind(this);
  }

  attach(): void {
    this.canvas.addEventListener('click', this.handleClick);
    window.addEventListener('keydown', this.handleKey);
  }

  detach(): void {
    this.canvas.removeEventListener('click', this.handleClick);
    window.removeEventListener('keydown', this.handleKey);
  }

  private onClick(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    // Check if click is on the coin button (circle hit-test)
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
}
```

**What's happening:**
- The input system attaches event listeners on `attach()` and removes them on `detach()`, ensuring clean teardown when the game is destroyed.
- Click hit-testing uses the classic circle formula: `dx*dx + dy*dy <= r*r`. The `coinButton` bounds are updated every frame by the renderer, so the hitbox always matches the visual.
- Mouse coordinates are translated from page space to canvas space using `getBoundingClientRect()`.
- For now we only handle coin clicks and ESC to exit. In Step 2 we will add shop click handling.

---

### 5. Create the HUD Renderer

**File:** `src/contexts/canvas2d/games/idle-clicker/renderers/HUDRenderer.ts`

Displays the coin count, click power, and total clicks.

```typescript
import type { IdleState } from '../types';

export class HUDRenderer {
  render(ctx: CanvasRenderingContext2D, state: IdleState): void {
    const W = state.width;
    const H = state.height;
    const cx = W / 2;

    // Total coins -- large display at top
    ctx.fillStyle = '#ffc107';
    ctx.font = `bold ${Math.min(42, W * 0.07)}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(`${Math.floor(state.coins)}`, cx, 30);

    // "coins" label
    ctx.fillStyle = 'rgba(255, 193, 7, 0.6)';
    ctx.font = `${Math.min(16, W * 0.03)}px monospace`;
    ctx.fillText('coins', cx, 30 + Math.min(48, W * 0.08));

    // Stats at bottom-left
    const statsX = 16;
    const statsY = H - 60;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.font = `${Math.min(12, W * 0.025)}px monospace`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`Click power: ${state.clickPower}`, statsX, statsY);
    ctx.fillText(`Total clicks: ${state.totalClicks}`, statsX, statsY + 18);

    // Controls hint
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.font = `${Math.min(11, W * 0.022)}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText('[ESC] Exit', cx, H - 16);
  }
}
```

**What's happening:**
- The coin count is displayed large and centered at the top in gold, making it the most prominent element on screen.
- Font sizes use `Math.min()` to scale with the viewport width but cap at reasonable maximums, keeping the layout readable at any resolution.
- Stats (click power, total clicks) are tucked into the bottom-left in a low-opacity white so they are available but not distracting.

---

### 6. Create the Engine

**File:** `src/contexts/canvas2d/games/idle-clicker/IdleClickerEngine.ts`

Orchestrates the game loop, wiring systems and renderers together.

```typescript
import type { IdleState } from './types';
import { InputSystem } from './systems/InputSystem';
import { ClickSystem } from './systems/ClickSystem';
import { GameRenderer } from './renderers/GameRenderer';
import { HUDRenderer } from './renderers/HUDRenderer';

export class IdleClickerEngine {
  private ctx: CanvasRenderingContext2D;
  private state: IdleState;
  private running = false;
  private rafId = 0;
  private lastTime = 0;

  private inputSystem: InputSystem;
  private clickSystem: ClickSystem;
  private gameRenderer: GameRenderer;
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
      upgrades: [],
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
    this.inputSystem = new InputSystem(
      canvas,
      this.state,
      (x, y) => this.clickSystem.registerClick(x, y),
      onExit,
    );

    this.gameRenderer = new GameRenderer();
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

    this.clickSystem.update(this.state, dt);

    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.state.width, this.state.height);
    this.gameRenderer.render(ctx, this.state);
    this.hudRenderer.render(ctx, this.state);

    this.rafId = requestAnimationFrame(() => this.loop());
  }
}
```

**What's happening:**
- The constructor wires everything together: canvas context, initial state, input system with a callback to `clickSystem.registerClick`, and both renderers.
- `dt` is capped at 200ms to prevent huge jumps if the browser tab is backgrounded. This is important for any game that multiplies values by delta time.
- The game loop runs update (click system) then render (game area, HUD) on every animation frame.
- `destroy()` cleans up all listeners and cancels the animation frame, preventing memory leaks.

---

### 7. Create the Platform Adapter

**File:** `src/contexts/canvas2d/games/idle-clicker/adapters/PlatformAdapter.ts`

```typescript
import { IdleClickerEngine } from '../IdleClickerEngine';

export class PlatformAdapter {
  private engine: IdleClickerEngine;

  constructor(canvas: HTMLCanvasElement, onExit: () => void) {
    this.engine = new IdleClickerEngine(canvas, onExit);
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

### 8. Create the Entry Point

**File:** `src/contexts/canvas2d/games/idle-clicker/index.ts`

```typescript
import { PlatformAdapter } from './adapters/PlatformAdapter';

export function createIdleClicker(
  canvas: HTMLCanvasElement,
  onExit: () => void,
): { destroy: () => void } {
  const adapter = new PlatformAdapter(canvas, onExit);
  adapter.start();
  return { destroy: () => adapter.destroy() };
}
```

---

## Test It

1. **Run:** `npm run dev`
2. **Open:** the Idle Clicker game in your browser
3. **Observe:**
   - Dark gradient background filling the viewport
   - A **golden coin** with a radial gradient, dollar sign, and soft glow centered on screen
   - **"Click to earn!"** hint text below the coin
   - Click the coin -- the counter at the top jumps by 1 and **"+1" particles** float upward and fade
   - The coin **pulses** (grows slightly then snaps back) on each click
   - **Click power** and **total clicks** counters update at the bottom-left
   - **Resize the window** and the coin repositions to stay centered

---

## Challenges

**Easy:**
- Change the coin's dollar sign to a different symbol (like a diamond or star emoji).
- Adjust the particle fade speed by changing the `1.2` multiplier in `ClickSystem` and observe the difference.

**Medium:**
- Add a second particle color that alternates between gold and white on every other click.

**Hard:**
- Make the coin slowly rotate by tracking an angle in state and applying `ctx.rotate()` before drawing the dollar sign.

---

## What You Learned

- Defining a comprehensive game state type with player stats, animation state, and UI bounds
- Drawing a radial-gradient coin with glow, border, and inner ring details
- Implementing a click-and-particle system with queued input processing
- Building a game loop with delta-time capping and clean teardown

**Next:** Upgrades & Auto-Income -- buy generators that increase click value and produce coins passively every second!
