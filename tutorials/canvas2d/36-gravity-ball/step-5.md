# Step 5: Multiple Levels & Polish

**Goal:** Add 15 puzzle levels with increasing complexity, a level counter in the HUD, and final polish.

**Time:** ~15 minutes

---

## What You'll Build

- **15 puzzle levels** ranging from tutorial simplicity to labyrinth complexity
- **Level counter** in the HUD showing progress through all levels
- **Help hint bar** showing all keyboard shortcuts
- **Full game loop** -- complete all 15 levels to see the win screen, then replay

---

## Concepts

- **Level Design Progression**: Good puzzle games ramp difficulty gradually. Our levels start with one-move solutions, progress to multi-step corridors, then introduce open rooms with pillars, narrow passages, and full labyrinths. Each level teaches a new spatial reasoning skill.
- **Border Helper Function**: Every level needs walls around its perimeter. The `border(w, h)` helper generates these automatically, so level definitions only need to specify interior obstacles.
- **Data-Driven Design**: All 15 levels are pure data -- arrays of wall positions, a start, and an exit. No code changes are needed to add, remove, or reorder levels. This makes the game easy to extend.
- **Polish Details**: Small touches like the help hint bar, the level count in the HUD, and the glow animation on the exit add up to a polished experience.

---

## Code

### 1. Expand Level Data to 15 Levels

**File:** `src/contexts/canvas2d/games/gravity-ball/data/levels.ts`

Replace the file with all 15 puzzle levels.

```typescript
import type { LevelDef } from '../types';

/**
 * 15 puzzle levels for Gravity Ball.
 * Each level requires the player to flip gravity in the right sequence
 * so the ball rolls into the exit.
 * Coordinate system: (0,0) is top-left. Walls form the boundaries and obstacles.
 */
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

  // Level 3 — Zigzag down-right-down
  {
    width: 9,
    height: 9,
    ballStart: { x: 1, y: 1 },
    exit: { x: 7, y: 7 },
    walls: [
      ...border(9, 9),
      { x: 1, y: 3 },
      { x: 2, y: 3 },
      { x: 3, y: 3 },
      { x: 5, y: 3 },
      { x: 6, y: 3 },
      { x: 7, y: 3 },
      { x: 3, y: 5 },
      { x: 4, y: 5 },
      { x: 5, y: 5 },
      { x: 5, y: 6 },
      { x: 5, y: 7 },
    ],
  },

  // Level 4 — U-turn: down, right, up, right, down
  {
    width: 11,
    height: 7,
    ballStart: { x: 1, y: 1 },
    exit: { x: 9, y: 5 },
    walls: [
      ...border(11, 7),
      { x: 3, y: 1 },
      { x: 3, y: 2 },
      { x: 3, y: 3 },
      { x: 5, y: 3 },
      { x: 5, y: 4 },
      { x: 5, y: 5 },
      { x: 7, y: 1 },
      { x: 7, y: 2 },
      { x: 7, y: 3 },
    ],
  },

  // Level 5 — Spiral inward
  {
    width: 9,
    height: 9,
    ballStart: { x: 1, y: 1 },
    exit: { x: 4, y: 4 },
    walls: [
      ...border(9, 9),
      { x: 2, y: 3 },
      { x: 3, y: 3 },
      { x: 4, y: 3 },
      { x: 5, y: 3 },
      { x: 6, y: 3 },
      { x: 6, y: 4 },
      { x: 6, y: 5 },
      { x: 6, y: 6 },
      { x: 5, y: 6 },
      { x: 4, y: 6 },
      { x: 3, y: 6 },
      { x: 3, y: 5 },
    ],
  },

  // Level 6 — Corridor maze
  {
    width: 11,
    height: 9,
    ballStart: { x: 1, y: 1 },
    exit: { x: 9, y: 7 },
    walls: [
      ...border(11, 9),
      { x: 3, y: 1 },
      { x: 3, y: 2 },
      { x: 3, y: 3 },
      { x: 3, y: 4 },
      { x: 5, y: 4 },
      { x: 5, y: 5 },
      { x: 5, y: 6 },
      { x: 5, y: 7 },
      { x: 7, y: 1 },
      { x: 7, y: 2 },
      { x: 7, y: 3 },
      { x: 7, y: 4 },
    ],
  },

  // Level 7 — Island hopping
  {
    width: 11,
    height: 9,
    ballStart: { x: 1, y: 1 },
    exit: { x: 9, y: 7 },
    walls: [
      ...border(11, 9),
      { x: 3, y: 3 },
      { x: 4, y: 3 },
      { x: 3, y: 4 },
      { x: 6, y: 5 },
      { x: 7, y: 5 },
      { x: 7, y: 6 },
      { x: 4, y: 7 },
      { x: 5, y: 7 },
    ],
  },

  // Level 8 — Narrow passages
  {
    width: 11,
    height: 11,
    ballStart: { x: 1, y: 1 },
    exit: { x: 9, y: 9 },
    walls: [
      ...border(11, 11),
      { x: 3, y: 1 },
      { x: 3, y: 2 },
      { x: 3, y: 3 },
      { x: 3, y: 5 },
      { x: 3, y: 6 },
      { x: 3, y: 7 },
      { x: 5, y: 3 },
      { x: 5, y: 4 },
      { x: 5, y: 5 },
      { x: 7, y: 5 },
      { x: 7, y: 6 },
      { x: 7, y: 7 },
      { x: 7, y: 8 },
      { x: 7, y: 9 },
      { x: 5, y: 7 },
      { x: 5, y: 8 },
      { x: 5, y: 9 },
    ],
  },

  // Level 9 — Open room with pillars
  {
    width: 11,
    height: 11,
    ballStart: { x: 1, y: 1 },
    exit: { x: 9, y: 9 },
    walls: [
      ...border(11, 11),
      { x: 3, y: 3 },
      { x: 7, y: 3 },
      { x: 5, y: 5 },
      { x: 3, y: 7 },
      { x: 7, y: 7 },
      { x: 5, y: 3 },
      { x: 5, y: 7 },
      { x: 3, y: 5 },
      { x: 7, y: 5 },
    ],
  },

  // Level 10 — Winding path
  {
    width: 13,
    height: 9,
    ballStart: { x: 1, y: 1 },
    exit: { x: 11, y: 7 },
    walls: [
      ...border(13, 9),
      { x: 2, y: 3 },
      { x: 3, y: 3 },
      { x: 4, y: 3 },
      { x: 4, y: 4 },
      { x: 6, y: 2 },
      { x: 6, y: 3 },
      { x: 6, y: 4 },
      { x: 6, y: 5 },
      { x: 8, y: 4 },
      { x: 8, y: 5 },
      { x: 8, y: 6 },
      { x: 8, y: 7 },
      { x: 10, y: 2 },
      { x: 10, y: 3 },
      { x: 10, y: 4 },
      { x: 10, y: 5 },
    ],
  },

  // Level 11 — Multi-chamber
  {
    width: 13,
    height: 11,
    ballStart: { x: 1, y: 1 },
    exit: { x: 11, y: 9 },
    walls: [
      ...border(13, 11),
      // Vertical divider with gap
      { x: 4, y: 1 },
      { x: 4, y: 2 },
      { x: 4, y: 3 },
      { x: 4, y: 5 },
      { x: 4, y: 6 },
      { x: 4, y: 7 },
      { x: 4, y: 8 },
      { x: 4, y: 9 },
      // Second divider
      { x: 8, y: 1 },
      { x: 8, y: 2 },
      { x: 8, y: 3 },
      { x: 8, y: 4 },
      { x: 8, y: 5 },
      { x: 8, y: 7 },
      { x: 8, y: 8 },
      { x: 8, y: 9 },
      // Internal obstacles
      { x: 2, y: 5 },
      { x: 6, y: 3 },
      { x: 6, y: 7 },
      { x: 10, y: 5 },
    ],
  },

  // Level 12 — Labyrinth
  {
    width: 13,
    height: 13,
    ballStart: { x: 1, y: 1 },
    exit: { x: 11, y: 11 },
    walls: [
      ...border(13, 13),
      { x: 3, y: 1 },
      { x: 3, y: 2 },
      { x: 3, y: 3 },
      { x: 3, y: 4 },
      { x: 3, y: 5 },
      { x: 5, y: 3 },
      { x: 5, y: 4 },
      { x: 5, y: 5 },
      { x: 5, y: 6 },
      { x: 5, y: 7 },
      { x: 5, y: 8 },
      { x: 5, y: 9 },
      { x: 7, y: 1 },
      { x: 7, y: 2 },
      { x: 7, y: 3 },
      { x: 7, y: 5 },
      { x: 7, y: 6 },
      { x: 7, y: 7 },
      { x: 9, y: 3 },
      { x: 9, y: 4 },
      { x: 9, y: 5 },
      { x: 9, y: 6 },
      { x: 9, y: 7 },
      { x: 9, y: 8 },
      { x: 9, y: 9 },
      { x: 9, y: 10 },
      { x: 9, y: 11 },
      { x: 3, y: 7 },
      { x: 3, y: 8 },
      { x: 3, y: 9 },
      { x: 3, y: 10 },
      { x: 3, y: 11 },
      { x: 7, y: 9 },
      { x: 7, y: 10 },
      { x: 7, y: 11 },
    ],
  },

  // Level 13 — Checkerboard obstacles
  {
    width: 11,
    height: 11,
    ballStart: { x: 1, y: 1 },
    exit: { x: 9, y: 9 },
    walls: [
      ...border(11, 11),
      { x: 2, y: 4 },
      { x: 4, y: 2 },
      { x: 4, y: 4 },
      { x: 4, y: 6 },
      { x: 4, y: 8 },
      { x: 6, y: 2 },
      { x: 6, y: 4 },
      { x: 6, y: 6 },
      { x: 6, y: 8 },
      { x: 8, y: 4 },
      { x: 8, y: 6 },
      { x: 2, y: 6 },
      { x: 2, y: 8 },
      { x: 8, y: 2 },
      { x: 8, y: 8 },
    ],
  },

  // Level 14 — Funnel
  {
    width: 13,
    height: 13,
    ballStart: { x: 1, y: 1 },
    exit: { x: 6, y: 11 },
    walls: [
      ...border(13, 13),
      { x: 2, y: 3 },
      { x: 3, y: 3 },
      { x: 9, y: 3 },
      { x: 10, y: 3 },
      { x: 3, y: 5 },
      { x: 4, y: 5 },
      { x: 8, y: 5 },
      { x: 9, y: 5 },
      { x: 4, y: 7 },
      { x: 5, y: 7 },
      { x: 7, y: 7 },
      { x: 8, y: 7 },
      { x: 5, y: 9 },
      { x: 7, y: 9 },
      { x: 6, y: 5 },
      { x: 3, y: 8 },
      { x: 9, y: 8 },
      { x: 2, y: 10 },
      { x: 10, y: 10 },
    ],
  },

  // Level 15 — Final challenge: complex maze
  {
    width: 15,
    height: 13,
    ballStart: { x: 1, y: 1 },
    exit: { x: 13, y: 11 },
    walls: [
      ...border(15, 13),
      { x: 3, y: 1 },
      { x: 3, y: 2 },
      { x: 3, y: 3 },
      { x: 3, y: 4 },
      { x: 5, y: 3 },
      { x: 5, y: 4 },
      { x: 5, y: 5 },
      { x: 5, y: 6 },
      { x: 5, y: 7 },
      { x: 7, y: 1 },
      { x: 7, y: 2 },
      { x: 7, y: 3 },
      { x: 7, y: 5 },
      { x: 7, y: 6 },
      { x: 7, y: 7 },
      { x: 7, y: 8 },
      { x: 9, y: 3 },
      { x: 9, y: 4 },
      { x: 9, y: 5 },
      { x: 9, y: 7 },
      { x: 9, y: 8 },
      { x: 9, y: 9 },
      { x: 9, y: 10 },
      { x: 9, y: 11 },
      { x: 11, y: 1 },
      { x: 11, y: 2 },
      { x: 11, y: 3 },
      { x: 11, y: 4 },
      { x: 11, y: 5 },
      { x: 11, y: 7 },
      { x: 11, y: 8 },
      { x: 11, y: 9 },
      { x: 3, y: 6 },
      { x: 3, y: 7 },
      { x: 3, y: 8 },
      { x: 3, y: 9 },
      { x: 3, y: 10 },
      { x: 3, y: 11 },
      { x: 5, y: 9 },
      { x: 5, y: 10 },
      { x: 5, y: 11 },
      { x: 13, y: 5 },
      { x: 13, y: 6 },
      { x: 13, y: 7 },
    ],
  },
];

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
```

**What's happening:**
- **Levels 1-3** are tutorial levels. Level 1 is a straight drop. Level 2 requires right-then-down. Level 3 introduces a zigzag pattern.
- **Levels 4-6** teach U-turns, spirals, and corridor navigation. The player must flip gravity in the correct sequence, sometimes going "backwards" to position the ball.
- **Levels 7-9** introduce open spaces. Island hopping has small wall clusters to bounce between. The pillar room requires threading through a grid of obstacles.
- **Levels 10-12** are full mazes. Winding paths, multi-chamber rooms with narrow gaps, and a labyrinth with many dead ends.
- **Levels 13-15** are the hardest. The checkerboard forces precise sequencing. The funnel narrows the player's options. Level 15 is a large 15x13 maze that requires many gravity flips.
- The `border()` helper is placed at the end of the file but can be called anywhere thanks to JavaScript hoisting of function declarations.

---

### 2. Update the HUD Renderer (Final Polish)

**File:** `src/contexts/canvas2d/games/gravity-ball/renderers/HUDRenderer.ts`

Update the HUD to show full level count and all keyboard shortcuts.

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
- The top bar now shows `Level X / 15` using `LEVELS.length`, giving players clear progress feedback.
- The game-won overlay dynamically references `LEVELS.length` in its message, so it stays accurate if you add or remove levels.
- All overlay code from Step 4 is preserved and unchanged -- this file is now in its final form.

---

### 3. Final Engine (Complete Version)

**File:** `src/contexts/canvas2d/games/gravity-ball/GravityEngine.ts`

The engine is unchanged from Step 4. Here is the complete final version for reference.

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

---

### 4. Final File Structure

Here is the complete file structure of the finished game:

```
src/contexts/canvas2d/games/gravity-ball/
  types.ts                     — Type definitions and constants
  GravityEngine.ts             — Main engine (loop, systems, renderers)
  index.ts                     — Entry point
  adapters/
    PlatformAdapter.ts         — Host page adapter
  data/
    levels.ts                  — 15 puzzle level definitions
  renderers/
    GameRenderer.ts            — Grid, walls, exit, ball, trail, gravity arrow
    HUDRenderer.ts             — Top bar, level-complete overlay, game-won overlay
  systems/
    InputSystem.ts             — Keyboard input handling
    LevelSystem.ts             — Level loading, goal detection, progression
    PhysicsSystem.ts           — Slide physics, wall collision, trail generation
```

---

## Test It

1. **Run:** `npm run dev`
2. **Open:** the Gravity Ball game in your browser
3. **Observe:**
   - The HUD shows **"Level 1 / 15"**
   - Play through the first few levels to verify progression works
   - **Level 1**: Press Down (1 move)
   - **Level 2**: Navigate right, then down to reach the exit
   - **Level 3**: Zigzag through the corridors
   - Grids **scale appropriately** as levels get larger (9x9, 11x7, 13x13, 15x13)
   - The **trail** shows your path through each level
   - The **gravity arrow** updates position and direction with each flip
   - **Move counter** tracks your efficiency
   - Press **R** to restart any level with zero moves
   - Complete all 15 levels to see the **gold "You Win!" overlay**
   - Press **Space** on the win screen to restart from Level 1

---

## Challenges

**Easy:**
- Create Level 16: a 7x7 grid where the ball starts at (1,5) and the exit is at (5,1). Add a few interior walls to make it solvable in 3 moves.
- Change the win screen color from gold (`#ffd700`) to a custom color of your choice.

**Medium:**
- Add a "par" system: define an optimal move count for each level in the `LevelDef` type. Show it on the level-complete overlay as "Par: X" alongside the player's move count.
- Add a level select screen: before the game starts, show a grid of level numbers (1-15). Completed levels are highlighted. Click one to jump to it.

**Hard:**
- Add a level editor: let the player click to place/remove walls, set the ball start, and set the exit. Add an "export" button that logs the `LevelDef` JSON to the console so custom levels can be saved.
- Add an "undo move" feature (Z key) that reverses the last gravity flip, restoring the ball's previous position and decrementing the move counter.

---

## What You Learned

- Designing 15 puzzle levels with progressive difficulty from tutorials to labyrinths
- Using a `border()` helper to auto-generate perimeter walls for any grid size
- Building a data-driven level system where adding levels requires no code changes
- Completing a full game loop: play, complete, advance, win, replay

**Congratulations!** You have built a complete Gravity Ball puzzle-platformer with 15 levels, smooth physics, keyboard controls, trail rendering, and a polished HUD. The game follows a clean architecture with separate systems for input, physics, and level management, and separate renderers for the game world and HUD.
