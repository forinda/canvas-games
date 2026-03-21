# Step 6: Obstacles & Polish

**Goal:** Add tunnel building, a full HUD with stats and task bars, start/pause/game-over screens, seasonal backgrounds, and help overlay.

**Time:** ~15 minutes

---

## What You'll Build

- **Tunnel system** where right-clicking places waypoints and builder ants dig tunnels that increase max population
- **Builder ant AI** that moves to incomplete tunnels and advances their progress
- **Seasonal backgrounds** that shift color palette with the seasons
- **HUD stats panel** showing population, food, tunnels, year, and season progress
- **Task allocation bars** with visual feedback for forage/build/idle ratios
- **Start screen, pause overlay, and game-over screen** with restart support
- **Help overlay** toggled with the `[H]` key

---

## Concepts

- **Tunnel Construction**: The player right-clicks to place tunnel waypoints. Each click creates a segment from the previous waypoint (or colony) to the new point. Builder ants move to the midpoint of incomplete tunnels and advance their `progress` (0 to 1). Completed tunnels increase the colony's max population by 15 each.
- **Seasonal Visuals**: The background gradient changes per season -- warm browns for spring/summer, darker earth tones for autumn, and cold blue-gray for winter. This provides instant visual feedback about the current season.
- **HUD Design**: Game state is communicated through a compact stats panel (top-left), task allocation bars (below stats), and a season icon (top-right). This keeps information accessible without obscuring the simulation.
- **Game State Screens**: The start screen waits for a click, the pause overlay freezes the simulation, and the game-over screen shows survival stats with a restart option.

---

## Code

### 1. Update InputSystem with Tunnel Placement and Restart

**File:** `src/games/ant-colony/systems/InputSystem.ts`

Add right-click tunnel placement and space-to-restart handling.

```typescript
import type { AntColonyState, Vec2 } from '../types';
import { COLONY_RADIUS } from '../types';

export class InputSystem {
  private state: AntColonyState;
  private canvas: HTMLCanvasElement;
  private onExit: () => void;
  private restartCb: (() => void) | null = null;

  private handleClick: (e: MouseEvent) => void;
  private handleContext: (e: MouseEvent) => void;
  private handleKey: (e: KeyboardEvent) => void;

  constructor(state: AntColonyState, canvas: HTMLCanvasElement, onExit: () => void) {
    this.state = state;
    this.canvas = canvas;
    this.onExit = onExit;

    this.handleClick = this._onClick.bind(this);
    this.handleContext = this._onContextMenu.bind(this);
    this.handleKey = this._onKeyDown.bind(this);
  }

  attach(): void {
    this.canvas.addEventListener('click', this.handleClick);
    this.canvas.addEventListener('contextmenu', this.handleContext);
    window.addEventListener('keydown', this.handleKey);
  }

  detach(): void {
    this.canvas.removeEventListener('click', this.handleClick);
    this.canvas.removeEventListener('contextmenu', this.handleContext);
    window.removeEventListener('keydown', this.handleKey);
  }

  setRestartCallback(cb: () => void): void {
    this.restartCb = cb;
  }

  /** Left click: start game or place food */
  private _onClick(e: MouseEvent): void {
    if (this.state.gameOver || this.state.showHelp) return;

    if (!this.state.started) {
      this.state.started = true;
      return;
    }

    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Don't place food on top of colony
    const dx = x - this.state.colony.x;
    const dy = y - this.state.colony.y;
    if (Math.sqrt(dx * dx + dy * dy) < COLONY_RADIUS * 2) return;

    this.state.foodSources.push({
      x, y,
      amount: 50,
      maxAmount: 50,
      radius: 14,
    });
  }

  /** Right click: place tunnel waypoint */
  private _onContextMenu(e: MouseEvent): void {
    e.preventDefault();
    if (this.state.gameOver || !this.state.started || this.state.showHelp) return;

    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const wp: Vec2 = { x, y };
    const waypoints = this.state.tunnelWaypoints;

    // Build tunnel segment from last waypoint (or colony center)
    const prev = waypoints.length > 0
      ? waypoints[waypoints.length - 1]
      : { x: this.state.colony.x, y: this.state.colony.y };

    this.state.tunnels.push({
      x1: prev.x,
      y1: prev.y,
      x2: wp.x,
      y2: wp.y,
      progress: 0,
      complete: false,
    });

    waypoints.push(wp);
  }

  private _onKeyDown(e: KeyboardEvent): void {
    const s = this.state;

    if (e.key === 'Escape') { this.onExit(); return; }
    if (e.key === 'h' || e.key === 'H') { s.showHelp = !s.showHelp; return; }
    if (e.key === 'p' || e.key === 'P') {
      if (s.started && !s.gameOver) s.paused = !s.paused;
      return;
    }

    // Restart on space when game over
    if (e.key === ' ' && s.gameOver) {
      this.restartCb?.();
      return;
    }

    // Task ratio adjustment
    if (e.key === '1') {
      s.taskRatio.forage = Math.min(1, s.taskRatio.forage + 0.1);
      this._normalizeRatios('forage');
    } else if (e.key === '2') {
      s.taskRatio.build = Math.min(1, s.taskRatio.build + 0.1);
      this._normalizeRatios('build');
    } else if (e.key === '3') {
      s.taskRatio.idle = Math.min(1, s.taskRatio.idle + 0.1);
      this._normalizeRatios('idle');
    }
  }

  /** After bumping one ratio, normalize so they sum to 1 */
  private _normalizeRatios(bumped: 'forage' | 'build' | 'idle'): void {
    const r = this.state.taskRatio;
    const total = r.forage + r.build + r.idle;

    if (total <= 0) { r.forage = 0.5; r.build = 0.3; r.idle = 0.2; return; }

    r.forage /= total;
    r.build /= total;
    r.idle /= total;

    // Clamp minimum
    const keys: ('forage' | 'build' | 'idle')[] = ['forage', 'build', 'idle'];
    for (const k of keys) {
      if (r[k] < 0.05 && k !== bumped) r[k] = 0.05;
    }

    const t2 = r.forage + r.build + r.idle;
    r.forage /= t2;
    r.build /= t2;
    r.idle /= t2;
  }
}
```

**What's happening:**
- `_onContextMenu()` prevents the browser's default right-click menu and creates a tunnel segment. The first segment starts from the colony center; subsequent segments chain from the last waypoint.
- Each tunnel has `progress: 0` and `complete: false`. Builder ants will advance the progress.
- `_normalizeRatios()` ensures task ratios always sum to 1.0 after adjustment, with a minimum 5% floor for non-bumped tasks to prevent any task from being completely eliminated.
- Space key triggers restart via a callback set by the engine.

---

### 2. Update AntSystem with Builder Behavior

**File:** `src/games/ant-colony/systems/AntSystem.ts`

Replace the builder stub with real tunnel-digging behavior.

Update the `updateBuilder` method in the existing `AntSystem`:

```typescript
/** Builder ants move to incomplete tunnels and dig */
private updateBuilder(ant: Ant, state: AntColonyState, dt: number): void {
  const speed = ANT_SPEED * dt;

  // Find first incomplete tunnel
  const tunnel = state.tunnels.find(t => !t.complete);

  if (!tunnel) {
    // No tunnels to dig, just wander
    this.wander(ant, state, speed);
    return;
  }

  // Move toward tunnel midpoint
  const mx = (tunnel.x1 + tunnel.x2) / 2;
  const my = (tunnel.y1 + tunnel.y2) / 2;

  this.moveToward(ant, mx, my, speed);

  const d = this.dist(ant.x, ant.y, mx, my);

  // Dig when close enough
  if (d < 20) {
    tunnel.progress += 0.3 * dt; // 0.3 progress per second per ant

    if (tunnel.progress >= 1) {
      tunnel.progress = 1;
      tunnel.complete = true;
    }
  }
}
```

**What's happening:**
- Builder ants find the first incomplete tunnel and move toward its midpoint. When within 20px, they advance `progress` at 0.3 per second.
- Multiple builders working the same tunnel stack their digging speed. Three builders complete a tunnel in about 1 second.
- Once progress reaches 1.0, the tunnel is marked complete. The colony system automatically increases `maxPopulation` by 15 for each completed tunnel.
- If no tunnels exist, builders wander like any other ant.

---

### 3. Create the Full GameRenderer with Seasonal Backgrounds and Tunnels

**File:** `src/games/ant-colony/renderers/GameRenderer.ts`

Add seasonal background colors and tunnel rendering.

```typescript
import type { AntColonyState, Ant, Colony } from '../types';
import { COLONY_RADIUS } from '../types';

export class GameRenderer {
  render(ctx: CanvasRenderingContext2D, state: AntColonyState): void {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    this.drawBackground(ctx, W, H, state);
    this.drawPheromones(ctx, state);
    this.drawTunnels(ctx, state);
    this.drawFoodSources(ctx, state);
    this.drawColony(ctx, state);
    this.drawAnts(ctx, state);
  }

  /** Seasonal background gradient */
  private drawBackground(
    ctx: CanvasRenderingContext2D, W: number, H: number, state: AntColonyState
  ): void {
    const seasonColors: Record<string, [string, string]> = {
      spring: ['#5a3e28', '#3e2a18'],
      summer: ['#6b4226', '#4a2e1a'],
      autumn: ['#5c3d1e', '#3a2510'],
      winter: ['#3e3e4a', '#2a2a34'],
    };
    const [c1, c2] = seasonColors[state.season] || seasonColors.summer;

    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, c1);
    grad.addColorStop(1, c2);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Dirt texture (deterministic dots)
    ctx.fillStyle = 'rgba(0,0,0,0.08)';
    const seed = 42;
    for (let i = 0; i < 300; i++) {
      const rx = ((seed * (i + 1) * 16807) % 2147483647) / 2147483647;
      const ry = ((seed * (i + 1) * 48271) % 2147483647) / 2147483647;
      ctx.beginPath();
      ctx.arc(rx * W, ry * H, 1 + Math.random() * 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Surface line at top
    ctx.strokeStyle = '#7a9a5a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 8);
    for (let x = 0; x < W; x += 20) {
      ctx.lineTo(x, 6 + Math.sin(x * 0.05) * 3);
    }
    ctx.stroke();
  }

  private drawPheromones(ctx: CanvasRenderingContext2D, state: AntColonyState): void {
    for (const p of state.pheromones) {
      const alpha = p.strength * 0.25;
      if (alpha < 0.01) continue;

      ctx.fillStyle = p.type === 'food'
        ? `rgba(0,200,100,${alpha})`
        : `rgba(100,150,255,${alpha})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /** Draw tunnels with progress and completion glow */
  private drawTunnels(ctx: CanvasRenderingContext2D, state: AntColonyState): void {
    for (const t of state.tunnels) {
      const alpha = t.complete ? 0.9 : 0.3 + t.progress * 0.5;

      ctx.strokeStyle = `rgba(80,60,40,${alpha})`;
      ctx.lineWidth = t.complete ? 10 : 6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(t.x1, t.y1);

      // Draw only up to the current progress point
      const px = t.x1 + (t.x2 - t.x1) * t.progress;
      const py = t.y1 + (t.y2 - t.y1) * t.progress;
      ctx.lineTo(px, py);
      ctx.stroke();

      // Completed tunnels get an inner glow
      if (t.complete) {
        ctx.strokeStyle = 'rgba(139,109,78,0.5)';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(t.x1, t.y1);
        ctx.lineTo(t.x2, t.y2);
        ctx.stroke();
      }
    }
  }

  private drawFoodSources(ctx: CanvasRenderingContext2D, state: AntColonyState): void {
    for (const fs of state.foodSources) {
      const ratio = fs.amount / fs.maxAmount;
      const r = fs.radius * (0.5 + 0.5 * ratio);

      ctx.fillStyle = `rgba(100,220,80,${0.15 * ratio})`;
      ctx.beginPath();
      ctx.arc(fs.x, fs.y, r + 8, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = `rgba(80,200,50,${0.5 + 0.5 * ratio})`;
      ctx.beginPath();
      ctx.arc(fs.x, fs.y, r, 0, Math.PI * 2);
      ctx.fill();

      if (fs.amount > 0) {
        ctx.font = '9px monospace';
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${Math.ceil(fs.amount)}`, fs.x, fs.y);
      }
    }
  }

  private drawColony(ctx: CanvasRenderingContext2D, state: AntColonyState): void {
    const { x, y } = state.colony;

    // Outer glow
    const grad = ctx.createRadialGradient(x, y, 5, x, y, COLONY_RADIUS + 15);
    grad.addColorStop(0, 'rgba(180,120,60,0.6)');
    grad.addColorStop(0.6, 'rgba(140,90,40,0.3)');
    grad.addColorStop(1, 'rgba(100,60,20,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, COLONY_RADIUS + 15, 0, Math.PI * 2);
    ctx.fill();

    // Colony mound
    ctx.fillStyle = '#8b6d3e';
    ctx.beginPath();
    ctx.arc(x, y, COLONY_RADIUS, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#a0804a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, COLONY_RADIUS, 0, Math.PI * 2);
    ctx.stroke();

    // Entrance hole
    ctx.fillStyle = '#2a1a0a';
    ctx.beginPath();
    ctx.ellipse(x, y + 5, 8, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Crown icon
    ctx.font = '14px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffd700';
    ctx.fillText('\u265B', x, y - 10);
  }

  private drawAnts(ctx: CanvasRenderingContext2D, state: AntColonyState): void {
    for (const ant of state.ants) {
      ctx.save();
      ctx.translate(ant.x, ant.y);
      ctx.rotate(ant.angle);

      const color = ant.task === 'forage' ? '#1a1a1a'
        : ant.task === 'build' ? '#3a2a1a'
        : '#2a2a2a';

      ctx.fillStyle = color;

      // Thorax
      ctx.beginPath();
      ctx.ellipse(-2, 0, 2.5, 1.5, 0, 0, Math.PI * 2);
      ctx.fill();
      // Abdomen
      ctx.beginPath();
      ctx.ellipse(2, 0, 3, 2, 0, 0, Math.PI * 2);
      ctx.fill();
      // Head
      ctx.beginPath();
      ctx.arc(-5, 0, 1.5, 0, Math.PI * 2);
      ctx.fill();

      // Legs
      ctx.strokeStyle = color;
      ctx.lineWidth = 0.5;
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath(); ctx.moveTo(i * 2, 0); ctx.lineTo(i * 2 - 1, -3); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(i * 2, 0); ctx.lineTo(i * 2 - 1, 3); ctx.stroke();
      }

      // Carrying indicator
      if (ant.carrying) {
        ctx.fillStyle = '#50c832';
        ctx.beginPath();
        ctx.arc(-6, 0, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }
}
```

**What's happening:**
- `drawBackground()` now uses a `seasonColors` lookup to shift the gradient. Winter uses cold blue-gray (`#3e3e4a`), summer uses warm browns (`#6b4226`), giving immediate visual feedback about the current season.
- Dirt texture uses deterministic pseudo-random positions (seeded) so dots don't flicker each frame, unlike the random dots in earlier steps.
- `drawTunnels()` draws each tunnel segment as a thick rounded line. Incomplete tunnels only draw up to their `progress` point, creating an animation of the tunnel being dug. Completed tunnels get a warm inner glow.
- The colony now uses a multi-stop radial gradient for a richer glow effect.

---

### 4. Create the HUD Renderer

**File:** `src/games/ant-colony/renderers/HUDRenderer.ts`

Draw stats, task bars, season indicator, and overlay screens.

```typescript
import type { AntColonyState } from '../types';

const GAME_COLOR = '#6d4c41';

export class HUDRenderer {
  render(ctx: CanvasRenderingContext2D, state: AntColonyState): void {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    // Stats panel (top-left)
    this.drawStatsPanel(ctx, state);

    // Task allocation bars
    this.drawTaskBars(ctx, state);

    // Season indicator (top-right)
    this.drawSeason(ctx, state, W);

    // Start screen
    if (!state.started) {
      this.drawStartScreen(ctx, W, H);
      return;
    }

    // Paused overlay
    if (state.paused) {
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(0, 0, W, H);
      ctx.font = 'bold 32px monospace';
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('PAUSED', W / 2, H / 2);
      ctx.font = '14px monospace';
      ctx.fillStyle = '#aaa';
      ctx.fillText('Press [P] to resume', W / 2, H / 2 + 30);
    }

    // Game over screen
    if (state.gameOver) {
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(0, 0, W, H);
      ctx.font = 'bold 36px monospace';
      ctx.fillStyle = '#e74c3c';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('COLONY COLLAPSED', W / 2, H / 2 - 20);
      ctx.font = '16px monospace';
      ctx.fillStyle = '#ccc';
      ctx.fillText(
        `Survived ${state.year} year${state.year !== 1 ? 's' : ''}`,
        W / 2, H / 2 + 20,
      );
      ctx.font = '13px monospace';
      ctx.fillStyle = '#888';
      ctx.fillText('Press [Space] to restart', W / 2, H / 2 + 50);
    }

    // Bottom hint bar
    if (!state.showHelp && !state.gameOver && !state.paused) {
      ctx.font = '11px monospace';
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText('[H] Help  |  [P] Pause  |  [ESC] Exit', W / 2, H - 8);
    }
  }

  /** Top-left stats: population, food, tunnels, year, season progress */
  private drawStatsPanel(ctx: CanvasRenderingContext2D, state: AntColonyState): void {
    const x = 12;
    let y = 16;
    const lh = 18;

    // Panel background
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath();
    ctx.roundRect(6, 4, 170, 100, 8);
    ctx.fill();

    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    // Population
    ctx.fillStyle = '#ffd700';
    ctx.fillText(`Population: ${state.colony.population}`, x, y);
    y += lh;

    // Food
    ctx.fillStyle = '#50c832';
    ctx.fillText(`Food: ${Math.floor(state.colony.food)}`, x, y);
    y += lh;

    // Tunnels
    ctx.fillStyle = '#c8a060';
    const tunnelsDone = state.tunnels.filter(t => t.complete).length;
    ctx.fillText(`Tunnels: ${tunnelsDone}/${state.tunnels.length}`, x, y);
    y += lh;

    // Year and season
    ctx.fillStyle = '#aaa';
    ctx.fillText(`Year ${state.year} - ${state.season}`, x, y);
    y += lh;

    // Season progress
    ctx.fillStyle = '#777';
    const pct = Math.floor((state.seasonTimer / 30) * 100);
    ctx.fillText(`Season progress: ${pct}%`, x, y);
  }

  /** Task allocation bars below the stats panel */
  private drawTaskBars(ctx: CanvasRenderingContext2D, state: AntColonyState): void {
    const x = 12;
    const y = 114;
    const barW = 150;
    const barH = 8;
    const gap = 14;

    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath();
    ctx.roundRect(6, y - 6, 170, 60, 8);
    ctx.fill();

    const tasks = [
      { label: 'Forage', key: '1', value: state.taskRatio.forage, color: '#4ade80' },
      { label: 'Build',  key: '2', value: state.taskRatio.build,  color: '#f59e0b' },
      { label: 'Idle',   key: '3', value: state.taskRatio.idle,   color: '#94a3b8' },
    ];

    for (let i = 0; i < tasks.length; i++) {
      const t = tasks[i];
      const by = y + i * gap;

      // Label
      ctx.font = '9px monospace';
      ctx.fillStyle = '#aaa';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(`[${t.key}] ${t.label}`, x, by);

      // Bar background
      const bx = x + 80;
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      ctx.fillRect(bx, by + 1, barW - 80, barH);

      // Bar fill
      ctx.fillStyle = t.color;
      ctx.fillRect(bx, by + 1, (barW - 80) * t.value, barH);

      // Percentage
      ctx.fillStyle = '#ccc';
      ctx.font = '8px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`${Math.round(t.value * 100)}%`, x + barW + 12, by + 1);
    }
  }

  /** Season emoji indicator in top-right */
  private drawSeason(ctx: CanvasRenderingContext2D, state: AntColonyState, W: number): void {
    const seasonIcons: Record<string, string> = {
      spring: '\u{1F331}',
      summer: '\u{2600}\uFE0F',
      autumn: '\u{1F342}',
      winter: '\u{2744}\uFE0F',
    };

    ctx.font = '20px serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.fillText(seasonIcons[state.season] || '', W - 14, 10);
  }

  /** Start screen overlay */
  private drawStartScreen(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, W, H);

    ctx.font = 'bold 36px monospace';
    ctx.fillStyle = GAME_COLOR;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('\u{1F41C} Ant Colony', W / 2, H / 2 - 40);

    ctx.font = '16px monospace';
    ctx.fillStyle = '#ccc';
    ctx.fillText('Click anywhere to start', W / 2, H / 2 + 10);

    ctx.font = '12px monospace';
    ctx.fillStyle = '#888';
    ctx.fillText('Left-click to place food | Right-click to dig tunnels', W / 2, H / 2 + 40);
    ctx.fillText('[1/2/3] Adjust task ratios | [H] Help', W / 2, H / 2 + 58);
  }
}
```

**What's happening:**
- `drawStatsPanel()` renders a semi-transparent rounded-rect background with five stats: population (gold), food (green), tunnels (amber), year/season (gray), and season progress percentage.
- `drawTaskBars()` shows three horizontal progress bars for forage/build/idle ratios. Each bar has a label, key hint, filled portion, and percentage label. The colors match the task identity (green=forage, amber=build, gray=idle).
- `drawSeason()` places a seasonal emoji in the top-right corner for at-a-glance season identification.
- The start screen shows the game title, instructions, and waits for a click. The game-over screen displays survival stats and a restart prompt.

---

### 5. Final Engine Assembly

**File:** `src/games/ant-colony/AntColonyEngine.ts`

Wire the HUD renderer and restart callback into the engine.

```typescript
import type { Ant, AntColonyState } from './types';
import { COLONY_RADIUS } from './types';
import { InputSystem } from './systems/InputSystem';
import { AntSystem } from './systems/AntSystem';
import { ColonySystem } from './systems/ColonySystem';
import { ResourceSystem } from './systems/ResourceSystem';
import { GameRenderer } from './renderers/GameRenderer';
import { HUDRenderer } from './renderers/HUDRenderer';

export class AntColonyEngine {
  private ctx: CanvasRenderingContext2D;
  private state: AntColonyState;
  private running = false;
  private rafId = 0;
  private lastTime = 0;

  private inputSystem: InputSystem;
  private antSystem: AntSystem;
  private colonySystem: ColonySystem;
  private resourceSystem: ResourceSystem;
  private gameRenderer: GameRenderer;
  private hudRenderer: HUDRenderer;
  private resizeHandler: () => void;

  constructor(canvas: HTMLCanvasElement, onExit: () => void) {
    this.ctx = canvas.getContext('2d')!;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    this.state = this.createInitialState(cx, cy, canvas.width, canvas.height);

    // Systems
    this.antSystem = new AntSystem();
    this.colonySystem = new ColonySystem();
    this.resourceSystem = new ResourceSystem();
    this.inputSystem = new InputSystem(this.state, canvas, onExit);
    this.inputSystem.setRestartCallback(() => this.restart());

    // Renderers
    this.gameRenderer = new GameRenderer();
    this.hudRenderer = new HUDRenderer();

    // Resize
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

    if (this.state.started && !this.state.paused && !this.state.gameOver) {
      this.state.elapsed += dt;
      this.antSystem.update(this.state, dt);
      this.colonySystem.update(this.state, dt);
      this.resourceSystem.update(this.state, dt);
    }

    this.render();
    this.rafId = requestAnimationFrame(() => this.loop());
  }

  private render(): void {
    this.gameRenderer.render(this.ctx, this.state);
    this.hudRenderer.render(this.ctx, this.state);
  }

  private restart(): void {
    const canvas = this.ctx.canvas;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    Object.assign(
      this.state,
      this.createInitialState(cx, cy, canvas.width, canvas.height),
    );
    this.state.started = true;
  }

  private createInitialState(
    cx: number, cy: number, width: number, height: number
  ): AntColonyState {
    const initialAnts: Ant[] = [];

    for (let i = 0; i < 10; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = COLONY_RADIUS * 0.5;

      initialAnts.push({
        x: cx + Math.cos(angle) * r,
        y: cy + Math.sin(angle) * r,
        angle: Math.random() * Math.PI * 2,
        carrying: false,
        task: 'forage',
        targetX: 0,
        targetY: 0,
        returning: false,
        pheromoneTimer: Math.random(),
      });
    }

    return {
      colony: {
        x: cx, y: cy,
        food: 30,
        population: 10,
        maxPopulation: 30,
        birthThreshold: 20,
        birthProgress: 0,
      },
      ants: initialAnts,
      foodSources: [],
      tunnels: [],
      pheromones: [],
      taskRatio: { forage: 0.6, build: 0.2, idle: 0.2 },
      season: 'spring',
      seasonTimer: 0,
      year: 1,
      elapsed: 0,
      paused: false,
      started: false,
      gameOver: false,
      tunnelWaypoints: [],
      width,
      height,
      showHelp: false,
    };
  }
}
```

---

## Test It

1. **Run:** `npm run dev`
2. **Navigate:** Select "Ant Colony"
3. **Start screen:** See the title overlay with control hints. Click to start.
4. **Place food:** Left-click to add food sources. Watch ants collect and deliver.
5. **Dig tunnels:** Right-click several locations to create tunnel waypoints. Watch builder ants (brown) move to tunnels and dig. See the progress bar extend along the tunnel line.
6. **Monitor HUD:**
   - Population counter grows as ants breed
   - Food counter fluctuates with collection and consumption
   - Tunnel counter shows completed/total
   - Season changes every 30 seconds with matching background color
7. **Adjust task ratios:**
   - Press `[2]` to increase builders -- more ants go to tunnels
   - Press `[1]` to increase foragers -- more ants collect food
   - Watch the colored bars update in real-time
8. **Survive winter:** Stop placing food before winter arrives. Watch the colony consume reserves. If food runs out, ants start dying. If all ants die, the game-over screen appears.
9. **Restart:** Press `[Space]` on the game-over screen to start a fresh colony.
10. **Pause:** Press `[P]` to freeze the simulation.

---

## Challenges

**Easy:**
- Change the game-over text color from red to orange
- Make tunnels dig faster (increase progress rate from 0.3 to 0.6 per second)

**Medium:**
- Add obstacle rocks that block ant movement (ants must path around them)
- Make the background show falling snowflakes during winter using animated particles
- Add a minimap in the corner showing ant positions as dots

**Hard:**
- Implement a speed control system (0.5x, 1x, 2x, 4x) that multiplies the dt passed to all systems
- Add multiple colonies that compete for the same food sources
- Create a "replay" system that records the simulation state each second and lets you scrub through the timeline

---

## What You Learned

- Tunnel construction with progressive dig animation and multi-ant cooperation
- Seasonal visual theming with palette-shifted backgrounds
- HUD design with stats panels, progress bars, and overlay screens
- Game state management: start, playing, paused, game-over, and restart transitions
- Right-click context menu prevention for custom in-game actions
- Complete game loop architecture: input, update (ant/colony/resource systems), render (game/HUD layers)

**Congratulations!** You have built a complete Ant Colony simulation with emergent pathfinding behavior, pheromone communication, seasonal cycles, tunnel building, and colony management. The simple rules you implemented -- wander, sense, follow, deposit -- combine to create complex, intelligent-looking behavior. This is the power of agent-based simulation!
