# Step 5: Goal Detection & Levels

**Goal:** Detect when the ball reaches the goal star, display a victory screen, and load the next level.

**Time:** ~15 minutes

---

## What You'll Build

- **Goal detection system** that checks ball-to-goal overlap each frame
- **Level data module** with hand-crafted levels and procedural generation for endless play
- **Level transitions** with a solved overlay and click-to-continue flow
- **Fall detection** that pauses the simulation when the ball drops off screen
- **Score tracking** that increases with each level completed

---

## Concepts

- **Goal as a Collision Check**: The goal is just another static body with `type: 'goal'`. Each frame, the GoalSystem checks if the ball overlaps the goal using the same `boxOverlap()` function from the collision system. Reusing existing collision code keeps the codebase small.
- **Level Data as Pure Functions**: `buildLevel()` takes a level number and canvas dimensions, returns a fresh `PuzzleState`. This is a pure factory function -- no side effects, easy to test, and trivial to extend with new levels.
- **Procedural Level Generation**: For levels beyond the hand-crafted ones, we generate obstacles and inventory pieces algorithmically. The goal position scales with level number, and obstacle count increases, creating natural difficulty progression.
- **State Replacement**: When loading a new level, we replace the entire `PuzzleState` object rather than mutating individual fields. This prevents stale data from leaking between levels.

---

## Code

### 1. Create the Goal System

**File:** `src/contexts/canvas2d/games/physics-puzzle/systems/GoalSystem.ts`

Checks whether the ball has reached the goal or fallen off screen.

```typescript
import type { PuzzleState } from '../types';
import { boxOverlap } from './CollisionSystem';

export class GoalSystem {
  private canvasHeight: number;

  constructor(canvasHeight: number) {
    this.canvasHeight = canvasHeight;
  }

  setCanvasHeight(h: number): void {
    this.canvasHeight = h;
  }

  update(state: PuzzleState, _dt: number): void {
    for (const b of state.bodies) {
      if (b.type !== 'ball') continue;

      const goal = state.bodies.find((g) => g.type === 'goal');

      if (goal && boxOverlap(b, goal)) {
        state.solved = true;
        state.score += 100 * state.level;
      }

      // Fall off screen
      if (b.y > this.canvasHeight + 100) {
        state.simulating = false;
        state.message = 'Ball fell! Press R to reset, or SPACE to retry.';
      }
    }
  }
}
```

**What's happening:**
- Each frame during simulation, we find the ball and check if it overlaps the goal body using `boxOverlap()`.
- On overlap, we set `state.solved = true` and award `100 * level` points. Higher levels are worth more, rewarding players who progress further.
- If the ball falls more than 100 pixels below the canvas bottom, we stop the simulation and display a retry message. This prevents the ball from falling forever and wasting CPU.
- The `canvasHeight` is stored and updatable via `setCanvasHeight()` so window resizes do not break the fall detection threshold.

---

### 2. Create the Level Data Module

**File:** `src/contexts/canvas2d/games/physics-puzzle/data/levels.ts`

Defines level layouts and generates procedural levels for endless play.

```typescript
import type { Body, PuzzleState } from '../types';
import { makeBody, resetBodyId } from '../types';

export function buildLevel(
  level: number,
  canvasWidth: number,
  canvasHeight: number,
): PuzzleState {
  resetBodyId();
  const H = canvasHeight;
  const groundY = H - 60;
  const bodies: Body[] = [];

  // Ground
  bodies.push(makeBody('ground', 0, groundY, canvasWidth, 60, true, '#4a6741'));

  // Level designs
  if (level === 1) {
    // Simple: get ball to goal on the right. Provide planks to build a ramp.
    bodies.push(makeBody('ball', 100, groundY - 30, 30, 30, false, '#f59e0b'));
    bodies[bodies.length - 1].radius = 15;
    bodies.push(makeBody('goal', 600, groundY - 40, 40, 40, true, '#4ade80'));
    // Obstacle - gap
    bodies.push(makeBody('box', 300, groundY - 80, 40, 80, true, '#666'));

    return {
      bodies,
      level,
      solved: false,
      started: false,
      gameOver: false,
      dragging: null,
      dragOffX: 0,
      dragOffY: 0,
      placed: 0,
      maxPieces: 3,
      inventory: [
        { type: 'plank', color: '#8b5e3c', w: 120, h: 16 },
        { type: 'plank', color: '#8b5e3c', w: 80, h: 16 },
        { type: 'box', color: '#a0522d', w: 40, h: 40 },
      ],
      selectedInventory: 0,
      simulating: false,
      score: 0,
      message: 'Place pieces to guide the ball to the green goal. Press SPACE to simulate!',
    };
  } else if (level === 2) {
    bodies.push(makeBody('ball', 80, groundY - 200, 30, 30, false, '#f59e0b'));
    bodies[bodies.length - 1].radius = 15;
    bodies.push(makeBody('goal', 700, groundY - 40, 40, 40, true, '#4ade80'));
    bodies.push(makeBody('box', 200, groundY - 60, 200, 20, true, '#666'));
    bodies.push(makeBody('box', 450, groundY - 120, 30, 120, true, '#666'));

    return {
      bodies,
      level,
      solved: false,
      started: false,
      gameOver: false,
      dragging: null,
      dragOffX: 0,
      dragOffY: 0,
      placed: 0,
      maxPieces: 4,
      inventory: [
        { type: 'plank', color: '#8b5e3c', w: 150, h: 16 },
        { type: 'plank', color: '#8b5e3c', w: 100, h: 16 },
        { type: 'box', color: '#a0522d', w: 50, h: 50 },
        { type: 'box', color: '#a0522d', w: 30, h: 80 },
      ],
      selectedInventory: 0,
      simulating: false,
      score: 0,
      message: 'More obstacles! Build bridges and ramps.',
    };
  } else {
    // Procedural levels
    bodies.push(makeBody('ball', 80, groundY - 100, 30, 30, false, '#f59e0b'));
    bodies[bodies.length - 1].radius = 15;
    const goalX = 300 + level * 100;

    bodies.push(
      makeBody(
        'goal',
        Math.min(goalX, canvasWidth - 100),
        groundY - 40, 40, 40, true, '#4ade80',
      ),
    );

    for (let i = 0; i < level; i++) {
      bodies.push(
        makeBody(
          'box',
          200 + i * 150,
          groundY - 40 - i * 40,
          30 + i * 10,
          40 + i * 20,
          true,
          '#666',
        ),
      );
    }

    const inv = [];
    for (let i = 0; i < 2 + level; i++) {
      inv.push({
        type: (i % 2 === 0 ? 'plank' : 'box') as Body['type'],
        color: i % 2 === 0 ? '#8b5e3c' : '#a0522d',
        w: 60 + Math.random() * 80,
        h: i % 2 === 0 ? 16 : 30 + Math.random() * 30,
      });
    }

    return {
      bodies,
      level,
      solved: false,
      started: false,
      gameOver: false,
      dragging: null,
      dragOffX: 0,
      dragOffY: 0,
      placed: 0,
      maxPieces: inv.length,
      inventory: inv,
      selectedInventory: 0,
      simulating: false,
      score: 0,
      message: `Level ${level} — Guide the ball!`,
    };
  }
}
```

**What's happening:**
- `resetBodyId()` resets the auto-increment counter so each level starts with clean IDs.
- **Level 1** is a gentle introduction: ball on the left, goal on the right, one wall between them, three pieces to place.
- **Level 2** increases difficulty: the ball starts elevated, the goal is farther away, and there are two obstacles including a tall wall. Four pieces are available.
- **Level 3+** are procedurally generated: obstacle count equals the level number, the goal moves farther right, and inventory grows with the level. Random widths add variety.
- Each level returns a complete `PuzzleState` object with `started: false` so the title overlay shows before play begins.

---

### 3. Create the HUD Renderer

**File:** `src/contexts/canvas2d/games/physics-puzzle/renderers/HUDRenderer.ts`

Displays the level number, score, simulation status, and overlays.

```typescript
import type { PuzzleState } from '../types';

export class HUDRenderer {
  render(ctx: CanvasRenderingContext2D, state: PuzzleState): void {
    const canvas = ctx.canvas;
    const W = canvas.width;

    // HUD bar
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, W, 40);
    ctx.font = 'bold 14px monospace';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#666';
    ctx.textAlign = 'left';
    ctx.fillText('< EXIT', 12, 20);
    ctx.fillStyle = '#f59e0b';
    ctx.textAlign = 'center';
    ctx.fillText(`Level ${state.level}  |  Score: ${state.score}`, W / 2, 20);

    // Message
    if (state.message && !state.simulating) {
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(0, 44, W, 30);
      ctx.font = '13px monospace';
      ctx.fillStyle = '#ccc';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(state.message, W / 2, 59);
    }

    // Sim indicator
    if (state.simulating) {
      ctx.fillStyle = '#4ade80';
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'right';
      ctx.fillText('SIMULATING...', W - 12, 20);
    }

    // Overlays
    if (!state.started) {
      this.drawOverlay(
        ctx,
        'PHYSICS PUZZLE',
        'Click to place pieces, then SPACE to simulate!\nGuide the ball to the star.',
        '#f59e0b',
      );
    } else if (state.solved) {
      this.drawOverlay(
        ctx,
        `LEVEL ${state.level} SOLVED!`,
        `Score: ${state.score}  |  Click for next level`,
        '#4ade80',
      );
    }
  }

  private drawOverlay(
    ctx: CanvasRenderingContext2D,
    title: string,
    sub: string,
    color: string,
  ): void {
    const W = ctx.canvas.width, H = ctx.canvas.height;

    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `bold ${Math.min(48, W * 0.06)}px monospace`;
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 20;
    ctx.fillText(title, W / 2, H * 0.35);
    ctx.shadowBlur = 0;
    ctx.font = `${Math.min(14, W * 0.02)}px monospace`;
    ctx.fillStyle = '#aaa';
    const lines = sub.split('\n');
    lines.forEach((line, i) => ctx.fillText(line, W / 2, H * 0.48 + i * 22));
  }
}
```

**What's happening:**
- The HUD bar sits at the top with level number and score centered in amber. An exit button sits on the left.
- The `message` text appears in a banner below the HUD when the simulation is paused, showing hints or error messages like "Ball fell!"
- During simulation, a green "SIMULATING..." indicator appears on the right side of the HUD.
- Two full-screen overlays handle game flow: the title screen (before `started`) shows instructions, and the victory screen (when `solved`) shows the score and prompts clicking for the next level.
- Font sizes scale with canvas width using `Math.min()` to remain readable on small screens.

---

### 4. Update the Engine

**File:** `src/contexts/canvas2d/games/physics-puzzle/PuzzleEngine.ts`

Wire in the GoalSystem, HUDRenderer, and level data.

```typescript
import type { PuzzleState } from './types';
import { PhysicsSystem } from './systems/PhysicsSystem';
import { CollisionSystem } from './systems/CollisionSystem';
import { GoalSystem } from './systems/GoalSystem';
import { WorldRenderer } from './renderers/WorldRenderer';
import { InventoryRenderer } from './renderers/InventoryRenderer';
import { HUDRenderer } from './renderers/HUDRenderer';
import { buildLevel } from './data/levels';

export class PuzzleEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private systems: { update(state: PuzzleState, dt: number): void }[];
  private renderers: { render(ctx: CanvasRenderingContext2D, state: PuzzleState): void }[];
  private goalSystem: GoalSystem;
  state: PuzzleState;
  private rafId = 0;
  private running = false;
  private lastTime = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    this.goalSystem = new GoalSystem(canvas.height);
    this.systems = [
      new PhysicsSystem(),
      new CollisionSystem(),
      this.goalSystem,
    ];
    this.renderers = [
      new WorldRenderer(),
      new InventoryRenderer(),
      new HUDRenderer(),
    ];

    this.state = buildLevel(1, canvas.width, canvas.height);
  }

  start(): void {
    this.running = true;
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
  }

  onResize(): void {
    this.goalSystem.setCanvasHeight(this.canvas.height);
  }

  private loop(timestamp: number): void {
    if (!this.running) return;

    const dt = Math.min((timestamp - this.lastTime) / 1000, 0.05);
    this.lastTime = timestamp;

    if (this.state.simulating && !this.state.solved) {
      for (const sys of this.systems) {
        sys.update(this.state, dt);
      }
    }

    for (const renderer of this.renderers) {
      renderer.render(this.ctx, this.state);
    }

    this.rafId = requestAnimationFrame((t) => this.loop(t));
  }
}
```

**What's happening:**
- The engine now has three systems (physics, collision, goal) and three renderers (world, inventory, HUD). The system/renderer arrays make it trivial to add or remove pipeline stages.
- `buildLevel(1, ...)` initializes the first level from the data module instead of hardcoding bodies in the constructor.
- `GoalSystem` is stored separately so the engine can call `setCanvasHeight()` on resize.
- The `onResize()` method updates the goal system's fall threshold when the window changes size.

---

### 5. Update the Input System

**File:** `src/contexts/canvas2d/games/physics-puzzle/systems/InputSystem.ts`

Add level transitions: pressing Space after solving loads the next level, pressing R resets via `buildLevel()`.

```typescript
import type { PuzzleState } from '../types';
import type { InventorySystem } from './InventorySystem';
import { buildLevel } from '../data/levels';

export class InputSystem {
  private canvas: HTMLCanvasElement;
  private onExit: () => void;
  private getState: () => PuzzleState;
  private setState: (s: PuzzleState) => void;
  private inventory: InventorySystem;

  private keyHandler: (e: KeyboardEvent) => void;
  private clickHandler: (e: MouseEvent) => void;
  private moveHandler: (e: MouseEvent) => void;
  private upHandler: (e: MouseEvent) => void;
  private resizeHandler: () => void;

  constructor(
    canvas: HTMLCanvasElement,
    onExit: () => void,
    getState: () => PuzzleState,
    setState: (s: PuzzleState) => void,
    inventory: InventorySystem,
  ) {
    this.canvas = canvas;
    this.onExit = onExit;
    this.getState = getState;
    this.setState = setState;
    this.inventory = inventory;

    this.keyHandler = (e) => {
      if (e.key === 'Escape') this.onExit();
      if (e.key === ' ') this.toggleSim();
      if (e.key === 'r')
        this.setState(
          buildLevel(this.getState().level, this.canvas.width, this.canvas.height),
        );
    };
    this.clickHandler = (e) => this.handleClick(e);
    this.moveHandler = (e) => this.handleMove(e);
    this.upHandler = () => {
      this.getState().dragging = null;
    };
    this.resizeHandler = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
  }

  attach(): void {
    window.addEventListener('keydown', this.keyHandler);
    this.canvas.addEventListener('mousedown', this.clickHandler);
    this.canvas.addEventListener('mousemove', this.moveHandler);
    this.canvas.addEventListener('mouseup', this.upHandler);
    window.addEventListener('resize', this.resizeHandler);
  }

  detach(): void {
    window.removeEventListener('keydown', this.keyHandler);
    this.canvas.removeEventListener('mousedown', this.clickHandler);
    this.canvas.removeEventListener('mousemove', this.moveHandler);
    this.canvas.removeEventListener('mouseup', this.upHandler);
    window.removeEventListener('resize', this.resizeHandler);
  }

  private toggleSim(): void {
    const s = this.getState();

    if (s.solved) {
      const next = buildLevel(s.level + 1, this.canvas.width, this.canvas.height);
      next.started = true;
      this.setState(next);
      return;
    }

    s.simulating = !s.simulating;
    s.started = true;
  }

  private handleClick(e: MouseEvent): void {
    const { x, y } = this.getCoords(e);

    if (x < 80 && y < 40) {
      this.onExit();
      return;
    }

    const s = this.getState();

    if (!s.started) {
      s.started = true;
      return;
    }

    if (s.solved) {
      const next = buildLevel(s.level + 1, this.canvas.width, this.canvas.height);
      next.started = true;
      this.setState(next);
      return;
    }

    if (s.simulating) return;

    // Place piece from inventory
    this.inventory.placeSelected(s, x, y);
  }

  private handleMove(e: MouseEvent): void {
    const s = this.getState();

    if (s.dragging !== null) {
      const { x, y } = this.getCoords(e);
      const body = s.bodies.find((b) => b.id === s.dragging);

      if (body && !s.simulating) {
        body.x = x - s.dragOffX;
        body.y = y - s.dragOffY;
      }
    }
  }

  private getCoords(e: MouseEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (this.canvas.width / rect.width),
      y: (e.clientY - rect.top) * (this.canvas.height / rect.height),
    };
  }
}
```

**What's happening:**
- **Reset (R key)**: Calls `buildLevel()` with the current level number, creating a fresh state with all bodies and inventory reset. The `setState()` callback replaces the engine's entire state.
- **Level transition (Space after solving)**: Calls `buildLevel(level + 1, ...)` and sets `started: true` so the new level skips the title overlay and goes straight to play.
- **Click on solved screen**: Same behavior as Space -- loads the next level. This gives the player two ways to advance.
- **Exit button**: Clicking the top-left corner (within 80x40 pixels) calls `onExit()` to return to the game menu.

---

## Test It

1. **Run:** `npm run dev`
2. **Open:** the Physics Puzzle game in your browser
3. **Observe:**
   - The **title overlay** appears: "PHYSICS PUZZLE" with instructions
   - Click to dismiss the overlay and see Level 1
   - Place pieces, press **Space** to simulate
   - Guide the ball to the **green star goal** -- when they overlap, a green **"LEVEL 1 SOLVED!"** overlay appears with your score
   - Click or press Space to advance to **Level 2** with new obstacles
   - If the ball falls off screen, the message "Ball fell!" appears and simulation pauses
   - Press **R** to reset the current level with a fresh layout

---

## Challenges

**Easy:**
- Add a Level 3 hand-crafted design in `buildLevel()` with a unique obstacle arrangement.
- Change the score formula to `50 * level * (maxPieces - placed)` so using fewer pieces earns more points.

**Medium:**
- Add a timer that starts when simulation begins. Display elapsed seconds in the HUD. Award bonus points for fast solves.

**Hard:**
- Implement a "level select" screen that shows when the player presses Escape during play. Display level numbers 1 through the highest completed level, and let the player click to jump to any completed level.

---

## What You Learned

- Building a goal detection system by reusing existing collision functions
- Creating a level data module with hand-crafted and procedural level generation
- Implementing full game flow: title screen, play, victory, and level transitions
- Replacing state entirely (not mutating) when loading new levels to prevent stale data

**Next:** Undo, reset, and polish -- adding the finishing touches to make the game feel complete!
