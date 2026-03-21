# Step 4: Hazards & Goal Detection

**Goal:** Detect when the ball reaches the exit to complete the level. Show a level-complete overlay with the move count, and let the player advance to the next level.

**Time:** ~15 minutes

---

## What You'll Build

- **LevelSystem** that checks if the ball has reached the exit and triggers level completion
- **Level-complete overlay** with a fade-in animation, congratulations text, and move count
- **Advance controls** -- press Space or Enter to go to the next level after completing one
- **Second puzzle level** to test level progression

---

## Concepts

- **Goal Detection**: After each slide completes (when `sliding` becomes `false`), we check if the ball's position matches the exit position. If yes, the level is complete. This simple coordinate comparison works because the ball always snaps to integer grid positions.
- **Level State Machine**: The game has three states: `playing` (normal), `levelComplete` (overlay shown, waiting for input), and `gameWon` (all levels done). The LevelSystem manages transitions between these states.
- **Overlay Animation**: The completion overlay uses `completeTimer` to fade in. The background darkens from 0 to 75% opacity over 0.375 seconds, and text appears after 0.3 seconds. This staged reveal feels more polished than an instant popup.
- **Level Progression**: When the player presses Space/Enter after completing a level, `advanceRequested` is set. The LevelSystem responds by loading the next level (or restarting from level 0 if all are complete).

---

## Code

### 1. Create the Level System

**File:** `src/games/gravity-ball/systems/LevelSystem.ts`

Handles goal detection, level completion, restart, and advancement.

```typescript
import type { GravityState } from '../types';
import { LEVELS } from '../data/levels';

export class LevelSystem {
  update(state: GravityState, dt: number): void {
    // Handle restart request
    if (state.restartRequested) {
      state.restartRequested = false;
      this.loadLevel(state, state.level);
      return;
    }

    // Handle advance request
    if (state.advanceRequested) {
      state.advanceRequested = false;

      if (state.gameWon) {
        // Restart from level 0
        this.loadLevel(state, 0);
      } else if (state.levelComplete) {
        this.loadLevel(state, state.level + 1);
      }

      return;
    }

    // Check if ball reached exit
    if (!state.levelComplete && !state.gameWon && !state.sliding) {
      if (
        state.ball.pos.x === state.exit.x &&
        state.ball.pos.y === state.exit.y
      ) {
        if (state.level >= LEVELS.length - 1) {
          state.gameWon = true;
        } else {
          state.levelComplete = true;
        }

        state.completeTimer = 0;
      }
    }

    // Update complete animation timer
    if (state.levelComplete || state.gameWon) {
      state.completeTimer += dt;
    }

    // Update glow animation
    state.glowPhase += dt * 2;
  }

  loadLevel(state: GravityState, levelIndex: number): void {
    if (levelIndex >= LEVELS.length) {
      levelIndex = 0;
    }

    const level = LEVELS[levelIndex];

    state.level = levelIndex;
    state.gravity = 'down';
    state.moves = 0;
    state.sliding = false;
    state.slideProgress = 0;
    state.slideFrom = { x: 0, y: 0 };
    state.slideTo = { x: 0, y: 0 };
    state.levelComplete = false;
    state.gameWon = false;
    state.queuedGravity = null;
    state.restartRequested = false;
    state.advanceRequested = false;
    state.completeTimer = 0;
    state.glowPhase = 0;

    state.gridWidth = level.width;
    state.gridHeight = level.height;

    state.ball = {
      pos: { x: level.ballStart.x, y: level.ballStart.y },
      trail: [],
    };

    state.exit = { x: level.exit.x, y: level.exit.y };

    state.walls = level.walls.map((w) => ({ x: w.x, y: w.y }));
    state.wallSet = new Set<string>();

    for (const w of level.walls) {
      state.wallSet.add(`${w.x},${w.y}`);
    }
  }
}
```

**What's happening:**
- `update()` runs every frame. It processes requests first (restart, advance), then checks for goal completion, then ticks animation timers.
- Goal detection checks three conditions: the level is not already complete, the ball is not mid-slide, and the ball position matches the exit position. This runs every frame but is essentially free (two integer comparisons).
- If the player is on the last level when they reach the exit, `gameWon` is set instead of `levelComplete`. This triggers a different overlay message.
- `loadLevel()` is a full state reset. It copies level data, clears all flags, and rebuilds the wall set. This method is called for initial load, restart, and advancement.

---

### 2. Update the Input System (Add Advance Controls)

**File:** `src/games/gravity-ball/systems/InputSystem.ts`

Add Space/Enter handling for level advancement.

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

    // Advance on level complete or game won
    if (key === ' ' || key === 'Enter') {
      if (this.state.levelComplete || this.state.gameWon) {
        this.state.advanceRequested = true;
      }
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
- Space and Enter now set `advanceRequested = true`, but only when the level is complete or the game is won. During normal gameplay, these keys do nothing.
- The order of checks matters: restart is checked first, then advance, then gravity. This ensures R always works regardless of game state.

---

### 3. Update the HUD Renderer (Add Overlays)

**File:** `src/games/gravity-ball/renderers/HUDRenderer.ts`

Add level-complete and game-won overlays.

```typescript
import type { GravityState } from '../types';
import { COLORS } from '../types';
import { LEVELS } from '../data/levels';

export class HUDRenderer {
  render(ctx: CanvasRenderingContext2D, state: GravityState): void {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    this.drawTopBar(ctx, state, W);

    if (state.levelComplete) {
      this.drawLevelCompleteOverlay(ctx, state, W, H);
    }

    if (state.gameWon) {
      this.drawGameWonOverlay(ctx, state, W, H);
    }
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
    ctx.fillText(`Level ${state.level + 1} / ${LEVELS.length}`, pad, y);

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

  private drawLevelCompleteOverlay(
    ctx: CanvasRenderingContext2D,
    state: GravityState,
    W: number,
    H: number,
  ): void {
    const alpha = Math.min(state.completeTimer * 2, 0.75);

    ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
    ctx.fillRect(0, 0, W, H);

    if (state.completeTimer > 0.3) {
      ctx.font = 'bold 36px monospace';
      ctx.fillStyle = COLORS.exit;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Level Complete!', W / 2, H / 2 - 30);

      ctx.font = '18px monospace';
      ctx.fillStyle = COLORS.hud;
      ctx.fillText(`Moves: ${state.moves}`, W / 2, H / 2 + 15);

      ctx.font = '14px monospace';
      ctx.fillStyle = COLORS.hudDim;
      ctx.fillText(
        'Press [Space] or [Enter] for next level',
        W / 2,
        H / 2 + 50,
      );
    }
  }

  private drawGameWonOverlay(
    ctx: CanvasRenderingContext2D,
    state: GravityState,
    W: number,
    H: number,
  ): void {
    const alpha = Math.min(state.completeTimer * 2, 0.85);

    ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
    ctx.fillRect(0, 0, W, H);

    if (state.completeTimer > 0.3) {
      ctx.font = 'bold 40px monospace';
      ctx.fillStyle = '#ffd700';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('You Win!', W / 2, H / 2 - 40);

      ctx.font = '20px monospace';
      ctx.fillStyle = COLORS.hud;
      ctx.fillText(`All ${LEVELS.length} levels completed!`, W / 2, H / 2 + 10);

      ctx.font = '14px monospace';
      ctx.fillStyle = COLORS.hudDim;
      ctx.fillText(
        'Press [Space] to play again',
        W / 2,
        H / 2 + 50,
      );
    }
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
- `drawLevelCompleteOverlay()` first draws a black rectangle over the entire canvas. Its alpha ramps from 0 to 0.75 over 0.375 seconds (`completeTimer * 2`), creating a smooth fade-in.
- Text only appears after `completeTimer > 0.3` -- a brief delay so the darkening is visible before text pops in. The title is green (`COLORS.exit`), the move count is light grey, and the prompt is dimmed.
- `drawGameWonOverlay()` is similar but uses gold (`#ffd700`) for the "You Win!" title and a slightly darker backdrop (0.85 alpha).
- The HUD top bar now shows `Level X / Y` using `LEVELS.length` so it automatically updates when we add more levels.

---

### 4. Add a Second Level

**File:** `src/games/gravity-ball/data/levels.ts`

Add Level 2 so we can test level progression.

```typescript
import type { LevelDef } from '../types';

/** Helper: generate border walls for a grid of given width x height */
function border(w: number, h: number): { x: number; y: number }[] {
  const result: { x: number; y: number }[] = [];

  for (let x = 0; x < w; x++) {
    result.push({ x, y: 0 });
    result.push({ x, y: h - 1 });
  }

  for (let y = 1; y < h - 1; y++) {
    result.push({ x: 0, y });
    result.push({ x: w - 1, y });
  }

  return result;
}

export const LEVELS: LevelDef[] = [
  // Level 1 — Tutorial: simple drop down to exit
  {
    width: 7,
    height: 7,
    ballStart: { x: 3, y: 1 },
    exit: { x: 3, y: 5 },
    walls: [
      ...border(7, 7),
      { x: 2, y: 3 },
      { x: 4, y: 3 },
    ],
  },

  // Level 2 — Go right then down
  {
    width: 9,
    height: 7,
    ballStart: { x: 1, y: 1 },
    exit: { x: 7, y: 5 },
    walls: [
      ...border(9, 7),
      { x: 3, y: 1 },
      { x: 3, y: 2 },
      { x: 3, y: 3 },
      { x: 5, y: 3 },
      { x: 5, y: 4 },
      { x: 5, y: 5 },
    ],
  },
];
```

**What's happening:**
- Level 2 is a wider 9x7 grid. The ball starts at (1,1) and must reach the exit at (7,5). Two vertical wall segments at x=3 and x=5 create corridors that the player must navigate around.
- The solution requires multiple gravity flips: down, right, down (or similar). This forces the player to think about where the ball will stop before flipping.

---

### 5. Update the Engine (Use LevelSystem)

**File:** `src/games/gravity-ball/GravityEngine.ts`

Replace the inline `loadLevel` and restart handling with the LevelSystem.

```typescript
import type { GravityState } from './types';
import { InputSystem } from './systems/InputSystem';
import { PhysicsSystem } from './systems/PhysicsSystem';
import { LevelSystem } from './systems/LevelSystem';
import { GameRenderer } from './renderers/GameRenderer';
import { HUDRenderer } from './renderers/HUDRenderer';

export class GravityEngine {
  private ctx: CanvasRenderingContext2D;
  private state: GravityState;
  private running = false;
  private rafId = 0;
  private lastTime = 0;

  private inputSystem: InputSystem;
  private physicsSystem: PhysicsSystem;
  private levelSystem: LevelSystem;
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
    this.levelSystem = new LevelSystem();
    this.inputSystem = new InputSystem(this.state);

    // Renderers
    this.gameRenderer = new GameRenderer();
    this.hudRenderer = new HUDRenderer();

    // Load first level
    this.levelSystem.loadLevel(this.state, 0);

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
    this.physicsSystem.update(this.state, dt);
    this.levelSystem.update(this.state, dt);
  }

  private render(): void {
    this.gameRenderer.render(this.ctx, this.state);
    this.hudRenderer.render(this.ctx, this.state);
  }
}
```

**What's happening:**
- The engine no longer has its own `loadLevel()` method or restart handling. All level logic is now in `LevelSystem`, which is cleaner and follows the single-responsibility principle.
- `tick()` calls both `physicsSystem.update()` and `levelSystem.update()` in order. Physics runs first (processes slides), then the level system checks for goal completion and handles requests.
- The `LevelSystem.update()` also handles the `glowPhase` increment, so we removed it from the engine's tick.

---

## Test It

1. **Run:** `npm run dev`
2. **Open:** the Gravity Ball game in your browser
3. **Observe:**
   - The HUD shows **"Level 1 / 2"**
   - Navigate the ball to the green exit (press ArrowDown on Level 1)
   - A **dark overlay fades in** with "Level Complete!" in green
   - Your **move count** is displayed
   - Press **Space** or **Enter** -- Level 2 loads with a new, wider grid
   - Complete Level 2 and see the **"You Win!"** overlay in gold
   - Press **Space** to restart from Level 1
   - Press **R** at any time to reset the current level

---

## Challenges

**Easy:**
- Change the level-complete overlay color from green to blue (`'#42a5f5'`).
- Increase the text delay from 0.3 to 0.6 seconds for a more dramatic reveal.

**Medium:**
- Add a star rating on the level-complete overlay: 3 stars if moves <= 2, 2 stars if moves <= 4, 1 star otherwise. Draw them as yellow Unicode stars.

**Hard:**
- Add a "death" mechanic: mark certain cells as spikes in the level definition. If the ball slides through or stops on a spike, restart the level automatically with a brief red flash effect.

---

## What You Learned

- Implementing goal detection by comparing ball position to exit position
- Building a level state machine with playing, complete, and won states
- Creating animated overlays with timed fade-in and delayed text
- Separating level management into its own system for clean architecture

**Next:** Multiple Levels & Polish -- add 15 puzzle levels, a death animation, and a move counter!
