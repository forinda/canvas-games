# Step 3: Gravity Switching Controls

**Goal:** Press arrow keys (or WASD) to change gravity direction. The ball slides in the new direction until it hits a wall.

**Time:** ~15 minutes

---

## What You'll Build

- **InputSystem** that listens for keyboard events and queues gravity direction changes
- **Gravity direction indicator** -- an arrow drawn outside the grid showing which way gravity is pulling
- **HUD top bar** showing the current level, gravity direction label, and move counter
- **Restart control** (R key) to reset the current level

---

## Concepts

- **Queued Input**: When the player presses an arrow key, we do not immediately change gravity. Instead, we set `state.queuedGravity`. The PhysicsSystem picks it up on the next frame (only if the ball is not mid-slide). This prevents conflicting inputs during animations.
- **Input Filtering**: If the player presses the same direction as the current gravity, nothing happens -- no wasted move. Input is also blocked while the ball is sliding.
- **Gravity Arrow Indicator**: A small arrow drawn just outside the grid edge in the direction gravity is pulling. This visual cue helps players track the current direction at a glance.
- **Move Counter**: Every successful gravity change increments `state.moves`. This gives players a metric to optimize against.

---

## Code

### 1. Create the Input System

**File:** `src/games/gravity-ball/systems/InputSystem.ts`

Listens for keyboard events and writes to the shared state.

```typescript
import type { GravityState, GravityDir } from '../types';

export class InputSystem {
  private state: GravityState;
  private keyHandler: (e: KeyboardEvent) => void;

  constructor(state: GravityState) {
    this.state = state;
    this.keyHandler = (e: KeyboardEvent) => this.handleKey(e);
  }

  attach(): void {
    window.addEventListener('keydown', this.keyHandler);
  }

  detach(): void {
    window.removeEventListener('keydown', this.keyHandler);
  }

  private handleKey(e: KeyboardEvent): void {
    const key = e.key;

    // Restart
    if (key === 'r' || key === 'R') {
      this.state.restartRequested = true;
      return;
    }

    // Gravity direction — only if not currently sliding
    if (this.state.sliding) return;

    let dir: GravityDir | null = null;

    switch (key) {
      case 'ArrowUp':
      case 'w':
      case 'W':
        dir = 'up';
        break;
      case 'ArrowDown':
      case 's':
      case 'S':
        dir = 'down';
        break;
      case 'ArrowLeft':
      case 'a':
      case 'A':
        dir = 'left';
        break;
      case 'ArrowRight':
      case 'd':
      case 'D':
        dir = 'right';
        break;
    }

    if (dir !== null && dir !== this.state.gravity) {
      e.preventDefault();
      this.state.queuedGravity = dir;
    }
  }
}
```

**What's happening:**
- The constructor stores a reference to the shared `GravityState`. All input just writes to state fields -- the InputSystem never calls methods on other systems.
- `attach()` and `detach()` add/remove the keyboard listener. This is important for cleanup when the game is destroyed.
- Arrow keys and WASD both map to gravity directions. `e.preventDefault()` stops the page from scrolling when arrow keys are pressed.
- The guard `dir !== this.state.gravity` prevents the player from "wasting" a move by pressing the direction gravity is already pulling. The guard `this.state.sliding` prevents input while the ball is mid-animation.
- Pressing R sets `restartRequested = true`, which the LevelSystem (added in Step 4) will handle.

---

### 2. Create the HUD Renderer

**File:** `src/games/gravity-ball/renderers/HUDRenderer.ts`

Draws the top bar with level number, gravity direction label, and move count.

```typescript
import type { GravityState } from '../types';
import { COLORS } from '../types';

export class HUDRenderer {
  render(ctx: CanvasRenderingContext2D, state: GravityState): void {
    const W = ctx.canvas.width;
    this.drawTopBar(ctx, state, W);
  }

  private drawTopBar(
    ctx: CanvasRenderingContext2D,
    state: GravityState,
    W: number,
  ): void {
    const pad = 16;
    const y = 28;

    // Level
    ctx.font = 'bold 16px monospace';
    ctx.fillStyle = COLORS.hud;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`Level ${state.level + 1}`, pad, y);

    // Gravity direction
    const dirLabel = this.gravityLabel(state.gravity);
    ctx.font = '14px monospace';
    ctx.fillStyle = COLORS.hudDim;
    ctx.textAlign = 'center';
    ctx.fillText(`Gravity: ${dirLabel}`, W / 2, y + 2);

    // Moves count
    ctx.font = '14px monospace';
    ctx.fillStyle = COLORS.hudDim;
    ctx.textAlign = 'right';
    ctx.fillText(`Moves: ${state.moves}`, W - pad, y + 2);

    // Help hint
    ctx.font = '11px monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.textAlign = 'right';
    ctx.fillText('[R] Reset', W - pad, y + 22);
  }

  private gravityLabel(dir: string): string {
    switch (dir) {
      case 'down':  return '\u2193 Down';
      case 'up':    return '\u2191 Up';
      case 'left':  return '\u2190 Left';
      case 'right': return '\u2192 Right';
      default:      return dir;
    }
  }
}
```

**What's happening:**
- The top bar has three columns: level number (left), gravity direction with an arrow character (center), and move count (right).
- `gravityLabel()` converts the direction string to a display label with a Unicode arrow: `\u2193` for down, `\u2191` for up, etc.
- A subtle help hint at the bottom right reminds the player about the restart key.

---

### 3. Add Gravity Arrow to Game Renderer

**File:** `src/games/gravity-ball/renderers/GameRenderer.ts`

Add the `drawGravityArrow` method and call it from `render()`. Add this method to the existing `GameRenderer` class and add a call to it at the end of `render()`:

```typescript
// Add this call at the end of the render() method, after drawBall():
// this.drawGravityArrow(ctx, state, cellSize, offsetX, offsetY, gridW, gridH);

private drawGravityArrow(
  ctx: CanvasRenderingContext2D,
  state: GravityState,
  _cell: number,
  ox: number,
  oy: number,
  gridW: number,
  gridH: number,
): void {
  const arrowSize = 16;
  let ax: number;
  let ay: number;
  let angle: number;

  switch (state.gravity) {
    case 'down':
      ax = ox + gridW / 2;
      ay = oy + gridH + 24;
      angle = Math.PI / 2;
      break;
    case 'up':
      ax = ox + gridW / 2;
      ay = oy - 24;
      angle = -Math.PI / 2;
      break;
    case 'left':
      ax = ox - 24;
      ay = oy + gridH / 2;
      angle = Math.PI;
      break;
    case 'right':
      ax = ox + gridW + 24;
      ay = oy + gridH / 2;
      angle = 0;
      break;
  }

  ctx.save();
  ctx.translate(ax, ay);
  ctx.rotate(angle);

  // Arrow triangle shape
  ctx.fillStyle = COLORS.arrowIndicator;
  ctx.globalAlpha = 0.7;
  ctx.beginPath();
  ctx.moveTo(arrowSize, 0);
  ctx.lineTo(-arrowSize * 0.5, -arrowSize * 0.6);
  ctx.lineTo(-arrowSize * 0.5, arrowSize * 0.6);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.restore();

  // "G" label near arrow
  ctx.font = '11px monospace';
  ctx.fillStyle = COLORS.arrowIndicator;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  let lx = ax;
  let ly = ay;

  switch (state.gravity) {
    case 'down':  ly += 18; break;
    case 'up':    ly -= 18; break;
    case 'left':  lx -= 18; break;
    case 'right': lx += 18; break;
  }

  ctx.fillText('G', lx, ly);
}
```

**What's happening:**
- The arrow is positioned 24px outside the grid edge in the direction gravity is pulling. A `switch` on `state.gravity` determines both the position and the rotation angle.
- We use `ctx.save()`, `ctx.translate()`, and `ctx.rotate()` to draw a single triangle shape that points right, then rotate it to the correct orientation. This avoids computing four separate triangle shapes.
- A small "G" label is drawn 18px beyond the arrow tip so the player knows this indicator represents gravity.
- `globalAlpha = 0.7` makes the arrow semi-transparent so it does not distract from the game grid.

---

### 4. Update the Engine (Wire in Input + HUD)

**File:** `src/games/gravity-ball/GravityEngine.ts`

Add the InputSystem and HUDRenderer, and handle restart requests.

```typescript
import type { GravityState } from './types';
import { InputSystem } from './systems/InputSystem';
import { PhysicsSystem } from './systems/PhysicsSystem';
import { GameRenderer } from './renderers/GameRenderer';
import { HUDRenderer } from './renderers/HUDRenderer';
import { LEVELS } from './data/levels';

export class GravityEngine {
  private ctx: CanvasRenderingContext2D;
  private state: GravityState;
  private running = false;
  private rafId = 0;
  private lastTime = 0;

  private inputSystem: InputSystem;
  private physicsSystem: PhysicsSystem;
  private gameRenderer: GameRenderer;
  private hudRenderer: HUDRenderer;
  private resizeHandler: () => void;

  constructor(canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    this.state = {
      gravity: 'down',
      ball: { pos: { x: 0, y: 0 }, trail: [] },
      exit: { x: 0, y: 0 },
      wallSet: new Set<string>(),
      walls: [],
      gridWidth: 0,
      gridHeight: 0,
      level: 0,
      moves: 0,
      sliding: false,
      slideProgress: 0,
      slideFrom: { x: 0, y: 0 },
      slideTo: { x: 0, y: 0 },
      levelComplete: false,
      gameWon: false,
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
      queuedGravity: null,
      restartRequested: false,
      advanceRequested: false,
      completeTimer: 0,
      glowPhase: 0,
    };

    // Systems
    this.physicsSystem = new PhysicsSystem();
    this.inputSystem = new InputSystem(this.state);

    // Renderers
    this.gameRenderer = new GameRenderer();
    this.hudRenderer = new HUDRenderer();

    // Load first level
    this.loadLevel(0);

    // Attach input
    this.inputSystem.attach();

    // Resize handler
    this.resizeHandler = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      this.state.canvasWidth = canvas.width;
      this.state.canvasHeight = canvas.height;
    };
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

    this.tick(dt);
    this.render();

    this.rafId = requestAnimationFrame(() => this.loop());
  }

  private tick(dt: number): void {
    // Handle restart request
    if (this.state.restartRequested) {
      this.state.restartRequested = false;
      this.loadLevel(this.state.level);
      return;
    }

    this.physicsSystem.update(this.state, dt);

    // Update glow animation
    this.state.glowPhase += dt * 2;
  }

  private render(): void {
    this.gameRenderer.render(this.ctx, this.state);
    this.hudRenderer.render(this.ctx, this.state);
  }

  private loadLevel(levelIndex: number): void {
    const level = LEVELS[levelIndex];
    this.state.level = levelIndex;
    this.state.gravity = 'down';
    this.state.moves = 0;
    this.state.sliding = false;
    this.state.slideProgress = 0;
    this.state.slideFrom = { x: 0, y: 0 };
    this.state.slideTo = { x: 0, y: 0 };
    this.state.levelComplete = false;
    this.state.gameWon = false;
    this.state.queuedGravity = null;
    this.state.restartRequested = false;
    this.state.advanceRequested = false;
    this.state.completeTimer = 0;
    this.state.glowPhase = 0;

    this.state.gridWidth = level.width;
    this.state.gridHeight = level.height;

    this.state.ball = {
      pos: { x: level.ballStart.x, y: level.ballStart.y },
      trail: [],
    };

    this.state.exit = { x: level.exit.x, y: level.exit.y };

    this.state.walls = level.walls.map((w) => ({ x: w.x, y: w.y }));
    this.state.wallSet = new Set<string>();
    for (const w of level.walls) {
      this.state.wallSet.add(`${w.x},${w.y}`);
    }
  }
}
```

**What's happening:**
- `InputSystem` is constructed with a reference to `state` and attached during construction. It is detached in `destroy()` to prevent memory leaks.
- The `tick()` method now checks `restartRequested` before running physics. If the player pressed R, we reload the current level and skip the rest of the frame.
- `render()` now calls both `gameRenderer` (grid, walls, ball) and `hudRenderer` (top bar with level/gravity/moves).
- The update/render split (`tick` + `render`) keeps logic and drawing cleanly separated.

---

## Test It

1. **Run:** `npm run dev`
2. **Open:** the Gravity Ball game in your browser
3. **Observe:**
   - The **HUD** at the top shows "Level 1", "Gravity: Down", and "Moves: 0"
   - Press **ArrowDown** (or S) -- the ball slides down from (3,1) and stops at (3,2)
   - The **gravity arrow** appears below the grid pointing downward
   - The **move counter** increments to 1
   - Press **ArrowLeft** -- the ball slides left and hits the border wall
   - The **gravity arrow** moves to the left side of the grid
   - Press **ArrowRight** during a slide -- nothing happens (input is blocked during animation)
   - Press the **same direction** as current gravity -- nothing happens (no wasted move)
   - Press **R** -- the level resets: ball returns to start, moves reset to 0, gravity resets to down
   - Try navigating the ball to the green exit at (3,5). You can reach it in 1 move: just press Down!

---

## Challenges

**Easy:**
- Add the number keys 1-4 as alternative gravity controls (1=up, 2=down, 3=left, 4=right).
- Change the arrow indicator color from `#78909c` to `#ff5722` (orange) so it stands out more.

**Medium:**
- Add a "best moves" display: track the minimum number of moves the player has used to complete the level and show it in the HUD.

**Hard:**
- Add an "undo" feature: pressing Z reverts the last gravity change. You will need to store the previous ball position, gravity direction, and move count on a stack.

---

## What You Learned

- Building an input system that writes to shared state rather than calling methods directly
- Queuing input to prevent conflicts during animations
- Drawing a rotated arrow indicator using canvas transforms (save/translate/rotate/restore)
- Rendering a HUD overlay with level info, direction labels, and move counters

**Next:** Hazards & Goal Detection -- detect when the ball reaches the exit and complete the level!
