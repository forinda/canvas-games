# Step 5: Larger Mazes & Polish

**Goal:** Make mazes grow each level, add timer scaling with completion bonuses, and wire up the final game flow.

**Time:** ~15 minutes

---

## What You'll Build

- **Increasing maze sizes** that grow by 2 cells per level (10x10, 12x12, 14x14, ...)
- **Scaled timer** that gives more time for larger mazes, plus a 15-second bonus for completing a level
- **Score calculation** based on level difficulty and remaining time
- **Full game loop** with level progression (win -> next level) and restart on loss
- **Final engine** matching the complete source at `src/contexts/canvas2d/games/maze-runner/`

---

## Concepts

- **Progressive Difficulty**: Each level increases `mazeW` and `mazeH` by `MAZE_GROW` (2). Level 1 is 10x10 (100 cells), level 2 is 12x12 (144 cells), level 5 is 18x18 (324 cells). More cells means more walls to navigate and more dead ends to get trapped in.
- **Time Scaling**: Base time is 60 seconds. Each extra cell beyond the base 100 adds 0.5 seconds. Level 2 gets `60 + 44 * 0.5 = 82` seconds. Completing a level also adds a 15-second bonus to the next level.
- **Score Formula**: `level * 100` for completing a level plus `Math.floor(timeLeft) * 10` for remaining time. This rewards both reaching higher levels and finishing quickly.
- **State Carry-Forward**: When progressing to the next level, `totalScore` accumulates and the bonus time is added. On a full restart after losing, everything resets to zero.

---

## Code

### 5.1 Final Types (unchanged)

**File:** `src/contexts/canvas2d/games/maze-runner/types.ts`

No changes from Step 1 -- the constants we defined up front now drive level progression.

```typescript
/** Walls present on each side of a cell */
export interface CellWalls {
  top: boolean;
  right: boolean;
  bottom: boolean;
  left: boolean;
}

/** A single maze cell */
export interface Cell {
  walls: CellWalls;
  visited: boolean;
}

/** Player position on the grid */
export interface GridPos {
  x: number;
  y: number;
}

/** Full mutable game state */
export interface MazeState {
  /** 2D grid of cells: grid[y][x] */
  grid: Cell[][];
  mazeW: number;
  mazeH: number;
  player: GridPos;
  exit: GridPos;
  /** Cells within this radius of the player are visible */
  revealRadius: number;
  /** Set of "x,y" keys the player has ever been near (persistent fog reveal) */
  revealed: Set<string>;
  level: number;
  timeLeft: number;
  won: boolean;
  lost: boolean;
  paused: boolean;
  started: boolean;
  /** Accumulated levels completed */
  totalScore: number;
}

/** Starting maze dimensions (grows each level) */
export const BASE_MAZE_W = 10;
export const BASE_MAZE_H = 10;
/** Maze grows by this amount each level */
export const MAZE_GROW = 2;
/** Default reveal radius in cells */
export const REVEAL_RADIUS = 3;
/** Base time in seconds for level 1 */
export const BASE_TIME = 60;
/** Extra time per additional cell beyond the base size */
export const TIME_PER_EXTRA_CELL = 0.5;
/** Bonus seconds added when completing a level */
export const COMPLETION_BONUS = 15;
/** LocalStorage key for high score */
export const HS_KEY = 'maze_runner_highscore';
```

**What's happening:**
- `MAZE_GROW = 2` means each level adds 2 to both width and height. The maze area grows quadratically: 100, 144, 196, 256, 324, ...
- `TIME_PER_EXTRA_CELL = 0.5` ensures players get proportionally more time for larger mazes, but not so much that it feels easy.
- `COMPLETION_BONUS = 15` rewards fast play -- the bonus carries into the next level.

---

### 5.2 Final Engine with Level Progression

**File:** `src/contexts/canvas2d/games/maze-runner/MazeEngine.ts`

The complete engine with growing mazes, time scaling, score tracking, and level transitions.

```typescript
import type { MazeState } from './types';
import {
  BASE_MAZE_W,
  BASE_MAZE_H,
  MAZE_GROW,
  REVEAL_RADIUS,
  BASE_TIME,
  TIME_PER_EXTRA_CELL,
  COMPLETION_BONUS,
} from './types';
import { MazeGenerator } from './systems/MazeGenerator';
import { InputSystem } from './systems/InputSystem';
import { PlayerSystem } from './systems/PlayerSystem';
import { TimerSystem } from './systems/TimerSystem';
import { MazeRenderer } from './renderers/MazeRenderer';
import { HUDRenderer } from './renderers/HUDRenderer';

export class MazeEngine {
  private ctx: CanvasRenderingContext2D;
  private state: MazeState;
  private running = false;
  private rafId = 0;
  private lastTime = 0;

  private generator: MazeGenerator;
  private inputSystem: InputSystem;
  private playerSystem: PlayerSystem;
  private timerSystem: TimerSystem;
  private mazeRenderer: MazeRenderer;
  private hudRenderer: HUDRenderer;
  private resizeHandler: () => void;

  constructor(canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Initial blank state
    this.state = this.createState(1, 0);

    // Systems
    this.generator = new MazeGenerator();
    this.inputSystem = new InputSystem(
      this.state,
      () => this.handleReset(),
    );
    this.playerSystem = new PlayerSystem(this.inputSystem);
    this.timerSystem = new TimerSystem();

    // Renderers
    this.mazeRenderer = new MazeRenderer();
    this.hudRenderer = new HUDRenderer();

    // Resize
    this.resizeHandler = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
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
    const dt = now - this.lastTime;
    this.lastTime = now;

    this.playerSystem.update(this.state, dt);
    this.timerSystem.update(this.state, dt);

    this.mazeRenderer.render(this.ctx, this.state);
    this.hudRenderer.render(this.ctx, this.state);

    this.rafId = requestAnimationFrame(() => this.loop());
  }

  private handleReset(): void {
    if (!this.state.started) {
      // First start
      this.initLevel(1, 0);
    } else if (this.state.won) {
      // Next level -- carry bonus time
      const bonus = COMPLETION_BONUS;
      const nextLevel = this.state.level + 1;
      const score =
        this.state.totalScore +
        this.state.level * 100 +
        Math.floor(this.state.timeLeft) * 10;

      this.initLevel(nextLevel, score, bonus);
    } else if (this.state.lost) {
      // Full restart
      this.initLevel(1, 0);
    }
  }

  private initLevel(level: number, totalScore: number, bonusTime = 0): void {
    const newState = this.createState(level, totalScore, bonusTime);

    // Copy reference so InputSystem keeps working (it holds a ref to state)
    Object.assign(this.state, newState);

    // Generate maze
    this.generator.generate(this.state);

    // Reveal around starting position
    this.playerSystem.revealAround(this.state);
  }

  private createState(
    level: number,
    totalScore: number,
    bonusTime = 0,
  ): MazeState {
    const mazeW = BASE_MAZE_W + (level - 1) * MAZE_GROW;
    const mazeH = BASE_MAZE_H + (level - 1) * MAZE_GROW;
    const extraCells = mazeW * mazeH - BASE_MAZE_W * BASE_MAZE_H;
    const timeForLevel =
      BASE_TIME + extraCells * TIME_PER_EXTRA_CELL + bonusTime;

    return {
      grid: [],
      mazeW,
      mazeH,
      player: { x: 0, y: 0 },
      exit: { x: mazeW - 1, y: mazeH - 1 },
      revealRadius: REVEAL_RADIUS,
      revealed: new Set<string>(),
      level,
      timeLeft: timeForLevel,
      won: false,
      lost: false,
      paused: false,
      started: true,
      totalScore,
    };
  }
}
```

**What's happening:**
- `createState()` now uses the full scaling formula: `mazeW = BASE_MAZE_W + (level - 1) * MAZE_GROW`. Level 1 is 10x10, level 2 is 12x12, and so on.
- `timeForLevel` calculates extra time based on the number of cells beyond the base size: `extraCells * TIME_PER_EXTRA_CELL`. The `bonusTime` from completing the previous level is added on top.
- `handleReset()` handles three transitions:
  - **First start**: Level 1, score 0, no bonus.
  - **Win -> next level**: Increment level, accumulate score (`level * 100 + timeLeft * 10`), add 15-second completion bonus.
  - **Lose -> restart**: Back to level 1, score 0, no bonus.
- `Object.assign(this.state, newState)` updates the state object in place. This is critical because the InputSystem holds a reference to `this.state` -- if we replaced the object entirely, the InputSystem would be reading stale data.
- After generating the maze, `playerSystem.revealAround()` lights up the starting area so the player can see where to go.

---

### 5.3 Final Renderer (unchanged from Step 4)

The `MazeRenderer` and `HUDRenderer` from Step 4 work without modification for larger mazes. The `cellSize` calculation automatically scales down as `mazeW` and `mazeH` grow:

```
cellSize = Math.floor(Math.min(availW / mazeW, availH / mazeH))
```

A 10x10 maze gets large cells; an 18x18 maze gets smaller cells. The maze always fits the viewport.

The HUD already shows `Level N (WxH)` in the center, so the player can see the maze is getting bigger each level.

---

### 5.4 Final Platform Adapter and Entry Point

**File:** `src/contexts/canvas2d/games/maze-runner/adapters/PlatformAdapter.ts`

```typescript
import { MazeEngine } from '../MazeEngine';

export class PlatformAdapter {
  private engine: MazeEngine;

  constructor(canvas: HTMLCanvasElement) {
    this.engine = new MazeEngine(canvas);
  }

  start(): void {
    this.engine.start();
  }

  destroy(): void {
    this.engine.destroy();
  }
}
```

**File:** `src/contexts/canvas2d/games/maze-runner/index.ts`

```typescript
import { PlatformAdapter } from './adapters/PlatformAdapter';

export function createMazeRunner(canvas: HTMLCanvasElement): { destroy: () => void } {
  const adapter = new PlatformAdapter(canvas);
  adapter.start();
  return { destroy: () => adapter.destroy() };
}
```

---

## Test It

1. **Run:** `pnpm dev`
2. **Open:** the Maze Runner game in your browser
3. **Observe:**
   - Press **Space** to start Level 1 (10x10 maze, 60 seconds)
   - Navigate through the fog to find the green EXIT
   - On completing Level 1, the overlay shows **"Level 1 Complete!"** with your score
   - Press **Space** again and Level 2 starts: the maze is now **12x12** with more time
   - The HUD center shows the level number and maze dimensions
   - Each level gets progressively larger and more complex
   - Your **score accumulates** across levels (visible in top-right)
   - Let the timer expire to see the **"Time's Up!"** overlay with your final score
   - Press **Space** to restart from Level 1

Try to reach Level 5 (18x18). The maze is significantly more complex and the fog makes it a real challenge to find the exit in time.

---

## Challenges

**Easy:**
- Adjust `MAZE_GROW` from 2 to 3 and see how quickly the difficulty ramps up. Try 1 for a gentler curve.

**Medium:**
- Add a breadcrumb trail: track every cell the player has visited in an array and draw a small dot in each one. This helps the player avoid revisiting dead ends. Use a dimmed color like `rgba(255, 107, 107, 0.3)` for the dots.

**Hard:**
- Implement high-score persistence using `localStorage` with the `HS_KEY` constant. Show the high score on the start overlay and the lose overlay. Update it whenever the player achieves a new best.

**Expert:**
- Add a solution hint system: when the player presses a key, briefly highlight the shortest path from their current position to the exit using BFS. Show it as a faint trail for 2 seconds, then fade it out.

---

## What You Learned

- Scaling maze dimensions and timer with level progression for increasing difficulty
- Computing time allowances based on maze area with bonus carry-forward
- Managing score accumulation across levels with a time-bonus incentive
- Using `Object.assign` to update shared state references safely
- Building a complete game loop: start -> play -> win -> next level -> lose -> restart

---

## Full Game Summary

Over these 5 steps you built a complete **Maze Runner** game from scratch:

1. **Step 1** -- Set up types, a grid of fully-walled cells, and a responsive renderer
2. **Step 2** -- Carved a perfect maze using iterative depth-first search (recursive backtracking)
3. **Step 3** -- Added keyboard input and wall-collision movement with a player and exit marker
4. **Step 4** -- Implemented fog of war with persistent reveal, a countdown timer, and HUD overlays
5. **Step 5** -- Added level progression with growing mazes, time scaling, and score tracking

The key architecture patterns: **types** define all state up front, **systems** (MazeGenerator, InputSystem, PlayerSystem, TimerSystem) handle logic, and **renderers** (MazeRenderer, HUDRenderer) handle drawing. The engine orchestrates everything through a `requestAnimationFrame` loop.

**Next game:** Continue to [Match-3](../../tutorials/35-match3/README.md) -- where you will learn gem-swapping, cascade matching, and board refilling!

---
[<- Previous Step](./step-4.md) | [Back to Game README](./README.md)
