# Step 2: Player Movement & Box Pushing

**Goal:** Move the player with arrow keys, push boxes when walking into them, and block illegal moves.

**Time:** ~15 minutes

---

## What You'll Build

- **Arrow key and WASD input** for four-directional movement
- **Wall collision** -- cannot walk into walls
- **Box pushing** -- walking into a box pushes it one tile in the movement direction
- **Push validation** -- cannot push a box into a wall or another box
- **Move counter** tracking how many moves the player has made

---

## Concepts

- **Direction Vectors**: `{ dx: 0, dy: -1 }` for up, `{ dx: 1, dy: 0 }` for right, etc.
- **Two-Step Collision**: First check if the target cell is walkable. If a box is there, check if the cell *beyond* the box is also open.
- **Queued Input**: Store the direction in state, process it in the update loop. This keeps input handling separate from game logic.

---

## Code

### 1. Create the Move System

**File:** `src/contexts/canvas2d/games/sokoban/systems/MoveSystem.ts`

Process queued movement directions, handle wall collision and box pushing.

```typescript
import { Cell, type SokobanState, type Snapshot } from '../types';

export class MoveSystem {
  update(state: SokobanState, _dt: number): void {
    if (state.levelComplete || state.gameWon) return;

    const dir = state.queuedDir;
    if (!dir) return;
    state.queuedDir = null;

    const newX = state.player.x + dir.dx;
    const newY = state.player.y + dir.dy;

    // Out of bounds
    if (newX < 0 || newX >= state.width || newY < 0 || newY >= state.height) return;
    // Wall
    if (state.grid[newY][newX] === Cell.Wall) return;

    // Check for a box at the target position
    const boxIdx = state.boxes.findIndex((b) => b.x === newX && b.y === newY);

    if (boxIdx >= 0) {
      // There is a box -- can we push it?
      const pushX = newX + dir.dx;
      const pushY = newY + dir.dy;

      if (pushX < 0 || pushX >= state.width || pushY < 0 || pushY >= state.height) return;
      if (state.grid[pushY][pushX] === Cell.Wall) return;
      if (state.boxes.some((b) => b.x === pushX && b.y === pushY)) return;

      // Save snapshot for undo (will be used in Step 4)
      state.undoStack.push({
        player: { ...state.player },
        boxes: state.boxes.map((b) => ({ ...b })),
      });

      // Push box
      state.boxes[boxIdx] = { x: pushX, y: pushY };
      state.player = { x: newX, y: newY };
      state.moves++;
    } else {
      // No box -- just move
      state.undoStack.push({
        player: { ...state.player },
        boxes: state.boxes.map((b) => ({ ...b })),
      });
      state.player = { x: newX, y: newY };
      state.moves++;
    }
  }
}
```

**What's happening:**
- The player's target position is `player + dir`. If it is a wall or out of bounds, the move is rejected.
- If a box occupies the target, the push position is `target + dir`. If that cell is blocked (wall, another box, or out of bounds), the push is rejected.
- A snapshot of the current player and box positions is saved before each move for the undo system in Step 4.

---

### 2. Create the Input System

**File:** `src/contexts/canvas2d/games/sokoban/systems/InputSystem.ts`

Map arrow keys and WASD to direction vectors.

```typescript
import type { SokobanState, Dir } from '../types';

const DIR_MAP: Record<string, Dir> = {
  ArrowUp: { dx: 0, dy: -1 },
  ArrowDown: { dx: 0, dy: 1 },
  ArrowLeft: { dx: -1, dy: 0 },
  ArrowRight: { dx: 1, dy: 0 },
  w: { dx: 0, dy: -1 },
  s: { dx: 0, dy: 1 },
  a: { dx: -1, dy: 0 },
  d: { dx: 1, dy: 0 },
};

export class InputSystem {
  private handler: (e: KeyboardEvent) => void;
  private state: SokobanState;

  constructor(state: SokobanState) {
    this.state = state;
    this.handler = (e: KeyboardEvent) => this.handleKey(e);
  }

  attach(): void { window.addEventListener('keydown', this.handler); }
  detach(): void { window.removeEventListener('keydown', this.handler); }

  private handleKey(e: KeyboardEvent): void {
    if (this.state.levelComplete) return;

    // Restart
    if (e.key === 'r' || e.key === 'R') {
      e.preventDefault();
      this.state.restartRequested = true;
      return;
    }

    // Direction
    const dir = DIR_MAP[e.key];
    if (dir) {
      e.preventDefault();
      this.state.queuedDir = dir;
    }
  }
}
```

---

### 3. Update the Engine

**File:** `src/contexts/canvas2d/games/sokoban/SokobanEngine.ts`

Wire input and move systems into the game loop.

```typescript
import type { SokobanState } from './types';
import { InputSystem } from './systems/InputSystem';
import { MoveSystem } from './systems/MoveSystem';
import { LevelSystem } from './systems/LevelSystem';
import { BoardRenderer } from './renderers/BoardRenderer';

export class SokobanEngine {
  private ctx: CanvasRenderingContext2D;
  private state: SokobanState;
  private running = false;
  private rafId = 0;
  private inputSystem: InputSystem;
  private moveSystem: MoveSystem;
  private levelSystem: LevelSystem;
  private boardRenderer: BoardRenderer;
  private resizeHandler: () => void;

  constructor(canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    this.state = {
      grid: [], width: 0, height: 0, player: { x: 0, y: 0 }, boxes: [],
      level: 0, moves: 0, undoStack: [], levelComplete: false, gameWon: false,
      paused: false, canvasWidth: canvas.width, canvasHeight: canvas.height,
      queuedDir: null, undoRequested: false, restartRequested: false, advanceRequested: false,
    };
    this.moveSystem = new MoveSystem();
    this.levelSystem = new LevelSystem();
    this.boardRenderer = new BoardRenderer();
    this.inputSystem = new InputSystem(this.state);
    this.levelSystem.loadLevel(this.state, 0);
    this.resizeHandler = () => {
      canvas.width = window.innerWidth; canvas.height = window.innerHeight;
      this.state.canvasWidth = canvas.width; this.state.canvasHeight = canvas.height;
    };
    this.inputSystem.attach();
    window.addEventListener('resize', this.resizeHandler);
  }

  start(): void { this.running = true; this.loop(); }
  destroy(): void { this.running = false; cancelAnimationFrame(this.rafId); this.inputSystem.detach(); window.removeEventListener('resize', this.resizeHandler); }

  private loop(): void {
    if (!this.running) return;
    // Handle restart
    if (this.state.restartRequested) {
      this.state.restartRequested = false;
      this.levelSystem.loadLevel(this.state, this.state.level);
    }
    this.moveSystem.update(this.state, 0);
    this.boardRenderer.render(this.ctx, this.state);
    this.rafId = requestAnimationFrame(() => this.loop());
  }
}
```

---

## Test It

1. **Run:** `npm run dev`
2. **Open:** the Sokoban game
3. **Observe:**
   - Press **arrow keys or WASD** -- the player moves on the grid
   - Walk into a **wall** -- nothing happens (move blocked)
   - Walk into a **box** -- the box slides one tile in that direction
   - Try to push a box into a **wall** or **another box** -- the push is blocked
   - Press **R** to restart the level from scratch

---

## Challenges

**Easy:**
- Make the player face the direction of movement by drawing the eyes offset in that direction.

**Medium:**
- Add a brief animation when pushing a box (smooth slide over 100ms).

**Hard:**
- Prevent "dead" positions where a box is pushed into a corner that is not a target.

---

## What You Learned

- Processing keyboard input as direction vectors
- Two-step collision detection (player-wall, then box-wall)
- Box pushing mechanics with push validation
- Saving state snapshots before moves (preparation for undo)
- Queued input pattern for decoupling input from logic

**Next:** Win detection and multiple levels -- solve puzzles and advance!
