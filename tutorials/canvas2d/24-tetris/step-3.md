# Step 3: Movement & Rotation

**Goal:** Add keyboard input for left/right movement and rotation with wall-kick logic so pieces can rotate near walls and other blocks.

**Time:** ~15 minutes

---

## What You'll Build

- **Left/Right movement**: Arrow keys slide the piece one cell
- **Clockwise rotation**: Up arrow rotates 90 degrees clockwise
- **Counter-clockwise rotation**: Z key rotates the other way
- **Wall kicks**: When rotation is blocked, try shifted positions before giving up
- **Collision-checked movement**: Every move is validated against walls and placed blocks

---

## Concepts

- **Try-then-commit**: Before applying any position change, check `isColliding` at the new position. Only update the piece if it fits.
- **Wall kicks**: When a rotation would cause a collision, try a series of small offsets (e.g., shift left 1, right 1, up 1). The first offset that produces a valid position wins. This prevents pieces from getting "stuck" when rotating near walls or tight spaces.
- **I-piece special kicks**: The I-piece is 4 cells wide, so it needs larger kick offsets (up to 2 cells) compared to the standard 3-wide pieces.

---

## Code

### 1. Define Wall Kick Data

**File:** `src/contexts/canvas2d/games/tetris/data/pieces.ts`

Add these exports at the bottom of the file (after the `PIECES` array):

```typescript
/** Wall kick offsets to try when rotation is blocked. [dx, dy] pairs. */
export const WALL_KICKS: readonly (readonly [number, number])[] = [
  [0, 0],
  [-1, 0],
  [1, 0],
  [-2, 0],
  [2, 0],
  [0, -1],
  [-1, -1],
  [1, -1],
  [0, 1],
  [-1, 1],
  [1, 1],
];

/** I-piece specific wall kicks */
export const I_WALL_KICKS: readonly (readonly [number, number])[] = [
  [0, 0],
  [-2, 0],
  [2, 0],
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, -2],
  [0, 1],
  [0, 2],
];
```

**What's happening:**
- Each entry is a `[dx, dy]` offset to try. The first entry `[0, 0]` means "try rotating in place first."
- If that fails, we try shifting left 1, right 1, left 2, right 2, then various up/down shifts.
- The I-piece kicks include wider horizontal offsets because the piece itself is 4 cells wide and often needs more room.
- The `dy` offsets are important too -- shifting up by 1 allows a piece to "kick" over a gap in the floor, which is a standard Tetris behavior players rely on for advanced maneuvers.

---

### 2. Add Movement and Rotation to PieceSystem

**File:** `src/contexts/canvas2d/games/tetris/systems/PieceSystem.ts`

Add three new methods to the class:

```typescript
import type { TetrisState } from '../types';
import { COLS } from '../types';
import { PIECES, WALL_KICKS, I_WALL_KICKS } from '../data/pieces';
import { BoardSystem } from './BoardSystem';

export class PieceSystem {
  private boardSystem: BoardSystem;
  private bag: number[] = [];

  constructor(boardSystem: BoardSystem) {
    this.boardSystem = boardSystem;
  }

  // --- Bag and spawn methods from step 2 (unchanged) ---

  private refillBag(): void {
    const indices = [0, 1, 2, 3, 4, 5, 6];
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    this.bag.push(...indices);
  }

  private nextFromBag(): number {
    if (this.bag.length < 2) this.refillBag();
    return this.bag.shift()!;
  }

  spawnPiece(state: TetrisState): void {
    const defIndex = state.nextPieceIndex;
    state.nextPieceIndex = this.nextFromBag();

    const def = PIECES[defIndex];
    const cells = def.rotations[0];
    const maxCol = Math.max(...cells.map(([, c]) => c));
    const spawnX = Math.floor((COLS - maxCol - 1) / 2);

    state.currentPiece = {
      defIndex,
      rotation: 0,
      x: spawnX,
      y: -1,
    };

    state.dropTimer = 0;
    state.lockTimer = 0;
    state.isLocking = false;

    if (this.boardSystem.isColliding(state.board, defIndex, 0, spawnX, 0)) {
      state.gameOver = true;
    }
  }

  init(state: TetrisState): void {
    this.bag = [];
    this.refillBag();
    state.nextPieceIndex = this.nextFromBag();
    this.spawnPiece(state);
  }

  // --- NEW: Movement ---

  /** Move piece left or right, returns true if moved */
  move(state: TetrisState, dx: number): boolean {
    const piece = state.currentPiece;
    if (!piece) return false;
    if (!this.boardSystem.isColliding(state.board, piece.defIndex, piece.rotation, piece.x + dx, piece.y)) {
      piece.x += dx;
      // Reset lock timer if piece was in lock delay
      if (state.isLocking) {
        state.lockTimer = 0;
      }
      return true;
    }
    return false;
  }

  // --- NEW: Rotation with wall kicks ---

  /** Rotate piece with wall kicks, returns true if rotated */
  rotate(state: TetrisState, direction: 1 | -1 = 1): boolean {
    const piece = state.currentPiece;
    if (!piece) return false;

    const numRotations = PIECES[piece.defIndex].rotations.length;
    const newRotation = ((piece.rotation + direction) % numRotations + numRotations) % numRotations;
    const kicks = PIECES[piece.defIndex].id === 'I' ? I_WALL_KICKS : WALL_KICKS;

    for (const [dx, dy] of kicks) {
      if (!this.boardSystem.isColliding(state.board, piece.defIndex, newRotation, piece.x + dx, piece.y + dy)) {
        piece.rotation = newRotation;
        piece.x += dx;
        piece.y += dy;
        // Reset lock timer on successful rotation
        if (state.isLocking) {
          state.lockTimer = 0;
        }
        return true;
      }
    }
    return false;
  }

  // --- NEW: Soft drop (one row) ---

  /** Soft drop one row, returns true if dropped */
  softDrop(state: TetrisState): boolean {
    const piece = state.currentPiece;
    if (!piece) return false;
    if (!this.boardSystem.isColliding(state.board, piece.defIndex, piece.rotation, piece.x, piece.y + 1)) {
      piece.y++;
      state.dropTimer = 0;
      return true;
    }
    return false;
  }
}
```

**What's happening:**

`move()`:
- Checks if `piece.x + dx` (where `dx` is -1 for left, +1 for right) causes a collision.
- If no collision, updates `piece.x` and returns `true`.
- If the piece was in its lock delay (sitting on the ground), we reset the lock timer. This gives the player more time to slide the piece, matching standard Tetris behavior.

`rotate()`:
- Calculates the new rotation index using modular arithmetic. The double-modulo pattern `((n % m) + m) % m` handles negative values correctly (needed for counter-clockwise rotation).
- Selects the appropriate kick table based on whether the piece is an I-piece.
- Loops through each kick offset. For each one, checks collision at the rotated position plus the kick offset. The first non-colliding offset wins.
- If no kick works, the rotation silently fails and returns `false`.

`softDrop()`:
- Tries to move the piece down one row. Resets `dropTimer` so the next gravity tick starts fresh.

---

### 3. Create the Input System

**File:** `src/contexts/canvas2d/games/tetris/systems/InputSystem.ts`

```typescript
import type { TetrisState } from '../types';
import { PieceSystem } from './PieceSystem';

export class InputSystem {
  private state: TetrisState;
  private canvas: HTMLCanvasElement;
  private pieceSystem: PieceSystem;

  private keyDownHandler: (e: KeyboardEvent) => void;

  constructor(
    state: TetrisState,
    canvas: HTMLCanvasElement,
    pieceSystem: PieceSystem,
  ) {
    this.state = state;
    this.canvas = canvas;
    this.pieceSystem = pieceSystem;

    this.keyDownHandler = (e: KeyboardEvent) => this.handleKeyDown(e);
  }

  attach(): void {
    window.addEventListener('keydown', this.keyDownHandler);
  }

  detach(): void {
    window.removeEventListener('keydown', this.keyDownHandler);
  }

  private handleKeyDown(e: KeyboardEvent): void {
    const s = this.state;

    if (e.key === 'p' || e.key === 'P') {
      if (s.started && !s.gameOver) {
        s.paused = !s.paused;
      }
      return;
    }

    if (!s.started || s.paused || s.gameOver || s.clearingLines.length > 0) return;

    const key = e.key;

    // Move left
    if (key === 'ArrowLeft' || key === 'a') {
      this.pieceSystem.move(s, -1);
      return;
    }
    // Move right
    if (key === 'ArrowRight' || key === 'd') {
      this.pieceSystem.move(s, 1);
      return;
    }
    // Soft drop
    if (key === 'ArrowDown' || key === 's') {
      this.pieceSystem.softDrop(s);
      return;
    }
    // Rotate clockwise
    if (key === 'ArrowUp' || key === 'w' || key === 'x') {
      this.pieceSystem.rotate(s, 1);
      return;
    }
    // Rotate counter-clockwise
    if (key === 'z' || key === 'Control') {
      this.pieceSystem.rotate(s, -1);
      return;
    }
  }
}
```

**What's happening:**
- We listen for `keydown` events globally so input works regardless of which element has focus.
- Each recognized key delegates to the appropriate `PieceSystem` method.
- We guard against input during pause, game over, and line-clear animation.
- Both arrow keys and WASD are supported. The `z` key and `Control` key provide counter-clockwise rotation, matching modern Tetris conventions.

---

### 4. Update the Engine

**File:** `src/contexts/canvas2d/games/tetris/TetrisEngine.ts`

Add the input system:

```typescript
import type { TetrisState } from './types';
import { createEmptyBoard } from './types';
import { BoardSystem } from './systems/BoardSystem';
import { PieceSystem } from './systems/PieceSystem';
import { InputSystem } from './systems/InputSystem';
import { BoardRenderer } from './renderers/BoardRenderer';

export class TetrisEngine {
  private ctx: CanvasRenderingContext2D;
  private state: TetrisState;
  private running = false;
  private rafId = 0;
  private lastTime = 0;

  private boardSystem: BoardSystem;
  private pieceSystem: PieceSystem;
  private inputSystem: InputSystem;
  private boardRenderer: BoardRenderer;
  private resizeHandler: () => void;

  constructor(canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    this.state = {
      board: createEmptyBoard(),
      currentPiece: null,
      nextPieceIndex: 0,
      score: 0,
      highScore: 0,
      level: 0,
      lines: 0,
      gameOver: false,
      paused: false,
      started: true,
      dropTimer: 0,
      lockTimer: 0,
      lockDelay: 500,
      isLocking: false,
      clearingLines: [],
      clearTimer: 0,
      clearDuration: 300,
      dasKey: null,
      dasTimer: 0,
      dasDelay: 170,
      dasInterval: 50,
      dasReady: false,
    };

    this.boardSystem = new BoardSystem();
    this.pieceSystem = new PieceSystem(this.boardSystem);
    this.inputSystem = new InputSystem(this.state, canvas, this.pieceSystem);
    this.boardRenderer = new BoardRenderer();

    this.pieceSystem.init(this.state);

    this.inputSystem.attach();

    this.resizeHandler = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
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
    this.lastTime = now;

    this.boardRenderer.render(this.ctx, this.state);

    this.rafId = requestAnimationFrame(() => this.loop());
  }
}
```

---

## Test It

1. **Run:** `npm run dev`
2. **Open:** the Tetris game
3. **Observe:**
   - The piece spawns at the top center
   - **Left/Right arrows** slide the piece one cell per press
   - **Up arrow** rotates the piece 90 degrees clockwise
   - **Z key** rotates counter-clockwise
   - The piece cannot move past the left or right walls
   - **Down arrow** drops the piece one row
   - Piece still does not fall automatically (next step adds gravity)

4. **Test wall kicks:**
   - Move an I-piece all the way to the right wall
   - Press Up to rotate -- the piece should kick left to fit
   - Try rotating a T-piece in a tight corner -- wall kicks keep it from getting stuck

---

## Try It

- Add `console.log('kick:', dx, dy)` inside the rotation loop to see which kick offset was used.
- Remove the `[0, 0]` entry from `WALL_KICKS` and notice that every rotation now shifts the piece slightly.
- Try rotating the O-piece -- it should appear unchanged because all 4 rotations are identical.

---

## Challenges

**Easy:**
- Add `console.log(piece.rotation)` after each rotation to track the rotation state.
- Map the `c` key to rotate clockwise as an alternative.

**Medium:**
- Add a visual indicator (e.g., flash the piece briefly) when a wall kick is used.
- Implement 180-degree rotation on a single keypress (hint: rotate twice, or jump by `+2`).

**Hard:**
- Implement the full SRS (Super Rotation System) wall kick tables, which use different offsets depending on which rotation transition is happening (0->1 vs 1->2, etc.).

---

## What You Learned

- Collision-checked movement: validate before committing
- Wall kick rotation: try a list of offset positions when the basic rotation is blocked
- Modular arithmetic for cycling through rotation states (handles both directions)
- Resetting lock timers on movement to give players more control time
- Separate kick tables for I-piece vs standard pieces

**Next:** Add gravity so pieces fall automatically, plus hard drop and lock delay.
