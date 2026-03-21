# Step 3: Player Movement Through Walls

**Goal:** Move a player character through the maze using keyboard input, blocked by walls.

**Time:** ~15 minutes

---

## What You'll Build

- **InputSystem** that captures arrow key and WASD input and queues move directions
- **PlayerSystem** that moves the player on the grid, checking walls before allowing movement
- **Player rendering** as a coloured circle on the current cell
- **Exit marker** drawn on the goal cell so you know where to go

---

## Concepts

- **Input Queuing**: Rather than moving the player directly inside the key handler, we store the most recent direction in `pendingDir`. The PlayerSystem consumes it on the next update tick. This keeps input handling and game logic cleanly separated.
- **Wall Collision**: Before moving in a direction, we check the current cell's wall on that side. Moving right? Check `cell.walls.right`. If it is `true`, the move is blocked. If `false`, the passage is open and we update the player position.
- **Direction Mapping**: Arrow keys and WASD both map to four directions: `"up"`, `"down"`, `"left"`, `"right"`. The PlayerSystem does not care which key was pressed -- it only sees the direction.

---

## Code

### 3.1 Create the Input System

**File:** `src/games/maze-runner/systems/InputSystem.ts`

Captures keyboard input and queues a single move direction for the PlayerSystem to consume.

```typescript
import type { MazeState } from '../types';

export type MoveDirection = 'up' | 'down' | 'left' | 'right';

/**
 * Captures arrow-key and WASD input, queues a single move direction.
 * Also handles Pause (P) and restart (Space).
 */
export class InputSystem {
  private state: MazeState;
  private onReset: () => void;
  private handler: (e: KeyboardEvent) => void;

  /** The most recent queued direction (consumed by PlayerSystem) */
  pendingDir: MoveDirection | null = null;

  constructor(
    state: MazeState,
    onReset: () => void,
  ) {
    this.state = state;
    this.onReset = onReset;

    this.handler = (e: KeyboardEvent) => {
      const key = e.key;

      // Pause
      if (key === 'p' || key === 'P') {
        e.preventDefault();

        if (this.state.started && !this.state.won && !this.state.lost) {
          this.state.paused = !this.state.paused;
        }

        return;
      }

      // Restart / start
      if (key === ' ') {
        e.preventDefault();

        if (!this.state.started || this.state.won || this.state.lost) {
          this.onReset();
        }

        return;
      }

      // Movement (only when playing)
      if (
        this.state.paused ||
        this.state.won ||
        this.state.lost ||
        !this.state.started
      )
        return;

      let dir: MoveDirection | null = null;

      if (key === 'ArrowUp' || key === 'w' || key === 'W') dir = 'up';
      else if (key === 'ArrowDown' || key === 's' || key === 'S') dir = 'down';
      else if (key === 'ArrowLeft' || key === 'a' || key === 'A') dir = 'left';
      else if (key === 'ArrowRight' || key === 'd' || key === 'D') dir = 'right';

      if (dir) {
        e.preventDefault();
        this.pendingDir = dir;
      }
    };
  }

  attach(): void {
    window.addEventListener('keydown', this.handler);
  }

  detach(): void {
    window.removeEventListener('keydown', this.handler);
  }
}
```

**What's happening:**
- The constructor takes a reference to the game state (to check `paused`/`won`/`lost`) and a `onReset` callback for starting/restarting.
- Arrow keys and WASD are mapped to four direction strings. The most recent press is stored in `pendingDir`.
- Movement input is ignored if the game is paused, won, lost, or not yet started.
- `attach()` and `detach()` manage the event listener lifecycle, preventing memory leaks when the game is destroyed.

---

### 3.2 Create the Player System

**File:** `src/games/maze-runner/systems/PlayerSystem.ts`

Handles grid-based player movement with wall collision checking.

```typescript
import type { MazeState } from '../types';
import type { InputSystem } from './InputSystem';

/**
 * Handles grid-based player movement with wall collision.
 */
export class PlayerSystem {
  private input: InputSystem;

  constructor(input: InputSystem) {
    this.input = input;
  }

  update(state: MazeState, _dt: number): void {
    if (state.paused || state.won || state.lost || !state.started) return;

    const dir = this.input.pendingDir;

    if (!dir) return;

    this.input.pendingDir = null;

    const { player, grid } = state;
    const cell = grid[player.y][player.x];

    let nx = player.x;
    let ny = player.y;

    if (dir === 'up' && !cell.walls.top) ny -= 1;
    else if (dir === 'down' && !cell.walls.bottom) ny += 1;
    else if (dir === 'left' && !cell.walls.left) nx -= 1;
    else if (dir === 'right' && !cell.walls.right) nx += 1;

    // Only move if position actually changed (wall not blocking)
    if (nx !== player.x || ny !== player.y) {
      player.x = nx;
      player.y = ny;

      // Check win
      if (player.x === state.exit.x && player.y === state.exit.y) {
        state.won = true;
      }
    }
  }
}
```

**What's happening:**
- Each frame, `update()` checks if there is a pending direction from the InputSystem. If so, it consumes it (sets `pendingDir` back to `null`).
- Before moving, it reads the current cell's walls. For example, `dir === 'up' && !cell.walls.top` means "move up only if there is no wall on top." If the wall exists, `ny` stays the same and no movement occurs.
- After moving, it checks whether the player has reached the exit cell. If so, `state.won = true`.
- This is the core of the maze game: you can only move where walls have been removed by the generator.

---

### 3.3 Update the Renderer to Draw the Player and Exit

**File:** `src/games/maze-runner/renderers/MazeRenderer.ts`

Add the player circle and exit marker to the existing grid renderer.

```typescript
import type { MazeState } from '../types';

export class MazeRenderer {
  render(ctx: CanvasRenderingContext2D, state: MazeState): void {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    // Clear
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, W, H);

    const { grid, mazeW, mazeH, player, exit } = state;

    // Compute cell size so maze fits on screen with some padding
    const padding = 60;
    const availW = W - padding * 2;
    const availH = H - padding * 2 - 40;
    const cellSize = Math.floor(Math.min(availW / mazeW, availH / mazeH));

    const offsetX = Math.floor((W - cellSize * mazeW) / 2);
    const offsetY = Math.floor((H - cellSize * mazeH) / 2) + 20;

    // Draw cells
    for (let y = 0; y < mazeH; y++) {
      for (let x = 0; x < mazeW; x++) {
        const px = offsetX + x * cellSize;
        const py = offsetY + y * cellSize;

        // Floor tile
        ctx.fillStyle = '#222244';
        ctx.fillRect(px, py, cellSize, cellSize);

        // Exit marker
        if (x === exit.x && y === exit.y) {
          ctx.fillStyle = '#4ade80';
          ctx.fillRect(px + 2, py + 2, cellSize - 4, cellSize - 4);
          ctx.fillStyle = '#fff';
          ctx.font = `bold ${Math.floor(cellSize * 0.5)}px monospace`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('EXIT', px + cellSize / 2, py + cellSize / 2);
        }

        // Walls
        const cell = grid[y][x];
        ctx.strokeStyle = '#607d8b';
        ctx.lineWidth = 2;

        if (cell.walls.top) {
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(px + cellSize, py);
          ctx.stroke();
        }

        if (cell.walls.right) {
          ctx.beginPath();
          ctx.moveTo(px + cellSize, py);
          ctx.lineTo(px + cellSize, py + cellSize);
          ctx.stroke();
        }

        if (cell.walls.bottom) {
          ctx.beginPath();
          ctx.moveTo(px, py + cellSize);
          ctx.lineTo(px + cellSize, py + cellSize);
          ctx.stroke();
        }

        if (cell.walls.left) {
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(px, py + cellSize);
          ctx.stroke();
        }
      }
    }

    // Player
    const ppx = offsetX + player.x * cellSize + cellSize / 2;
    const ppy = offsetY + player.y * cellSize + cellSize / 2;
    const pr = cellSize * 0.35;

    ctx.fillStyle = '#ff6b6b';
    ctx.beginPath();
    ctx.arc(ppx, ppy, pr, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(ppx, ppy, pr * 0.4, 0, Math.PI * 2);
    ctx.fill();

    // Outer maze border
    ctx.strokeStyle = '#607d8b';
    ctx.lineWidth = 3;
    ctx.strokeRect(offsetX, offsetY, cellSize * mazeW, cellSize * mazeH);
  }
}
```

**What's happening:**
- The exit cell is drawn as a green rectangle with "EXIT" text. It is rendered before walls so the walls draw on top.
- The player is a red circle (`#ff6b6b`) with a small white dot in the center, positioned at the center of the player's current grid cell. The radius is 35% of the cell size.
- Both are drawn after the floor tiles but the player is drawn after the wall pass so it appears on top of everything.

---

### 3.4 Update the Engine

**File:** `src/games/maze-runner/MazeEngine.ts`

Wire in the InputSystem and PlayerSystem.

```typescript
import type { MazeState } from './types';
import { BASE_MAZE_W, BASE_MAZE_H, BASE_TIME } from './types';
import { MazeGenerator } from './systems/MazeGenerator';
import { InputSystem } from './systems/InputSystem';
import { PlayerSystem } from './systems/PlayerSystem';
import { MazeRenderer } from './renderers/MazeRenderer';

export class MazeEngine {
  private ctx: CanvasRenderingContext2D;
  private state: MazeState;
  private running = false;
  private rafId = 0;
  private lastTime = 0;

  private generator: MazeGenerator;
  private inputSystem: InputSystem;
  private playerSystem: PlayerSystem;
  private mazeRenderer: MazeRenderer;
  private resizeHandler: () => void;

  constructor(canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Initial state
    this.state = this.createState(1);

    // Systems
    this.generator = new MazeGenerator();
    this.inputSystem = new InputSystem(
      this.state,
      () => this.handleReset(),
    );
    this.playerSystem = new PlayerSystem(this.inputSystem);

    // Renderers
    this.mazeRenderer = new MazeRenderer();

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

    this.mazeRenderer.render(this.ctx, this.state);

    this.rafId = requestAnimationFrame(() => this.loop());
  }

  private handleReset(): void {
    if (!this.state.started || this.state.won || this.state.lost) {
      this.initLevel(1);
    }
  }

  private initLevel(level: number): void {
    const newState = this.createState(level);
    Object.assign(this.state, newState);

    // Generate maze
    this.generator.generate(this.state);
  }

  private createState(level: number): MazeState {
    const mazeW = BASE_MAZE_W;
    const mazeH = BASE_MAZE_H;

    return {
      grid: [],
      mazeW,
      mazeH,
      player: { x: 0, y: 0 },
      exit: { x: mazeW - 1, y: mazeH - 1 },
      revealRadius: 3,
      revealed: new Set<string>(),
      level,
      timeLeft: BASE_TIME,
      won: false,
      lost: false,
      paused: false,
      started: true,
      totalScore: 0,
    };
  }
}
```

**What's happening:**
- The engine now creates an `InputSystem` (passing the state and a reset callback) and a `PlayerSystem` (passing the input system).
- The game loop computes delta time (`dt`) and calls `playerSystem.update()` each frame before rendering.
- `handleReset()` is called when the player presses Space. It re-initializes the level with a fresh maze.
- `initLevel()` uses `Object.assign` to update the existing state reference (so the InputSystem's reference stays valid) and generates a new maze.
- `started` is now set to `true` immediately so the player can move right away. (We will add a proper start overlay in Step 5.)

---

## Test It

1. **Run:** `pnpm dev`
2. **Open:** the Maze Runner game in your browser
3. **Observe:**
   - A **red circle** (the player) appears in the top-left corner cell
   - A **green "EXIT" marker** appears in the bottom-right corner
   - Press **arrow keys or WASD** to move through the maze
   - The player **cannot pass through walls** -- try pressing into a wall and nothing happens
   - Navigate to the EXIT cell and `state.won` is set (you will see the win overlay in Step 5)
   - Press **Space** to generate a new maze and restart

---

## Challenges

**Easy:**
- Change the player color from red to blue. Change the inner dot from white to yellow.

**Medium:**
- Add a move counter that increments each time the player successfully moves. Log it to the console.

**Hard:**
- Implement "smooth movement" by animating the player circle between cells over 100ms instead of instantly teleporting. Store a `visualX`/`visualY` that lerps toward the actual grid position each frame.

---

## What You Learned

- Separating input capture (InputSystem) from game logic (PlayerSystem) via a queued direction
- Checking wall booleans before allowing movement -- the core mechanic of a maze game
- Rendering a player circle and exit marker on the grid
- Computing delta time for frame-independent updates

**Next:** [Step 4: Fog of War & Goal](./step-4.md) -- hide unexplored areas and reveal cells only near the player, plus win/lose/pause overlays!

---
[<- Previous Step](./step-2.md) | [Back to Game README](./README.md) | [Next Step ->](./step-4.md)
