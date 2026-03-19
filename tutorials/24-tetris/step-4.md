# Step 4: Gravity & Locking

**Goal:** Make pieces fall automatically on a timer, add hard drop (space bar), and lock pieces into the board when they land.

**Time:** ~15 minutes

---

## What You'll Build

- **Gravity timer**: Piece drops one row every N milliseconds (800 ms at level 0)
- **Soft drop**: Down arrow accelerates the fall (one row per press, resets timer)
- **Hard drop**: Space bar instantly drops the piece to the lowest valid position
- **Lock delay**: After landing, piece waits 500 ms before locking, giving you time to slide or rotate
- **Lock placement**: Piece cells are written into the board grid and a new piece spawns

---

## Concepts

- **Accumulator-based timer**: Each frame adds `dt` (milliseconds since last frame) to `dropTimer`. When it exceeds the drop interval, the piece moves down one row and the timer resets. This approach handles variable frame rates cleanly.
- **Lock delay**: When gravity tries to move the piece down but it is blocked, we start a 500 ms lock timer instead of locking immediately. Any successful move or rotation resets the lock timer, giving skilled players time for last-second adjustments.
- **Hard drop distance scoring**: The number of rows the piece travels during a hard drop is tracked for scoring (added in step 6).

---

## Code

### 1. Add Lock and Hard Drop to PieceSystem

**File:** `src/games/tetris/systems/PieceSystem.ts`

Add the `hardDrop`, `lockCurrentPiece`, and `update` methods. The full file now looks like this:

```typescript
import type { TetrisState } from '../types';
import { COLS, getDropInterval } from '../types';
import { PIECES, WALL_KICKS, I_WALL_KICKS } from '../data/pieces';
import { BoardSystem } from './BoardSystem';

export class PieceSystem {
  private boardSystem: BoardSystem;
  private bag: number[] = [];

  constructor(boardSystem: BoardSystem) {
    this.boardSystem = boardSystem;
  }

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

  move(state: TetrisState, dx: number): boolean {
    const piece = state.currentPiece;
    if (!piece) return false;
    if (!this.boardSystem.isColliding(state.board, piece.defIndex, piece.rotation, piece.x + dx, piece.y)) {
      piece.x += dx;
      if (state.isLocking) {
        state.lockTimer = 0;
      }
      return true;
    }
    return false;
  }

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
        if (state.isLocking) {
          state.lockTimer = 0;
        }
        return true;
      }
    }
    return false;
  }

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

  // --- NEW ---

  /** Hard drop: instantly move piece to lowest valid position and lock */
  hardDrop(state: TetrisState): void {
    const piece = state.currentPiece;
    if (!piece) return;

    // Find the lowest Y where the piece fits
    let ghostY = piece.y;
    while (!this.boardSystem.isColliding(state.board, piece.defIndex, piece.rotation, piece.x, ghostY + 1)) {
      ghostY++;
    }

    piece.y = ghostY;
    this.lockCurrentPiece(state);
  }

  /** Lock the current piece onto the board and spawn the next one */
  lockCurrentPiece(state: TetrisState): void {
    this.boardSystem.lockPiece(state);
    state.isLocking = false;
    state.lockTimer = 0;
    this.spawnPiece(state);
  }

  /** Called every frame -- handles gravity and lock delay */
  update(state: TetrisState, dt: number): void {
    if (!state.started || state.paused || state.gameOver || !state.currentPiece) return;

    const piece = state.currentPiece;
    const interval = getDropInterval(state.level);

    // Gravity
    state.dropTimer += dt;
    if (state.dropTimer >= interval) {
      state.dropTimer -= interval;
      if (!this.boardSystem.isColliding(state.board, piece.defIndex, piece.rotation, piece.x, piece.y + 1)) {
        piece.y++;
        state.isLocking = false;
        state.lockTimer = 0;
      } else {
        // Piece cannot drop further -- start lock timer
        state.isLocking = true;
      }
    }

    // Lock delay
    if (state.isLocking) {
      state.lockTimer += dt;
      if (state.lockTimer >= state.lockDelay) {
        this.lockCurrentPiece(state);
      }
    }
  }
}
```

**What's happening:**

`hardDrop()`:
- Starts from the piece's current Y and increments until `isColliding` reports a hit at `ghostY + 1`. This finds the lowest row where the piece still fits.
- Sets `piece.y` to that row and immediately locks the piece.

`lockCurrentPiece()`:
- Calls `boardSystem.lockPiece` to write the piece's color into the board grid.
- Resets lock state and spawns the next piece.

`update()`:
- Adds frame delta to `dropTimer`. When enough time has accumulated, attempts to move the piece down.
- If the piece can drop, it moves and any lock state is cleared.
- If the piece cannot drop (something is below it), `isLocking` is set to `true`.
- While locking, `lockTimer` accumulates. After 500 ms, the piece locks for real.

---

### 2. Add Lock to BoardSystem

**File:** `src/games/tetris/systems/BoardSystem.ts`

Add the `lockPiece` method:

```typescript
import type { TetrisState, CellColor } from '../types';
import { COLS, ROWS } from '../types';
import { PIECES } from '../data/pieces';

export class BoardSystem {
  isColliding(
    board: CellColor[][],
    defIndex: number,
    rotation: number,
    x: number,
    y: number,
  ): boolean {
    const cells = PIECES[defIndex].rotations[rotation];
    for (const [row, col] of cells) {
      const bx = x + col;
      const by = y + row;
      if (bx < 0 || bx >= COLS || by >= ROWS) return true;
      if (by < 0) continue;
      if (board[by][bx] !== null) return true;
    }
    return false;
  }

  /** Place the current piece onto the board */
  lockPiece(state: TetrisState): void {
    const piece = state.currentPiece;
    if (!piece) return;
    const def = PIECES[piece.defIndex];
    const cells = def.rotations[piece.rotation];
    for (const [row, col] of cells) {
      const bx = piece.x + col;
      const by = piece.y + row;
      if (by >= 0 && by < ROWS && bx >= 0 && bx < COLS) {
        state.board[by][bx] = def.color;
      }
    }
  }
}
```

**What's happening:**
- We iterate over the 4 cells of the current piece and write the piece's color into the board at each position.
- The bounds check skips cells that are above the board (can happen if a piece locks while partially above the playfield).

---

### 3. Add Hard Drop to Input

**File:** `src/games/tetris/systems/InputSystem.ts`

Add the space bar handler:

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

    if (e.repeat) return; // we will handle repeat via DAS in step 7

    const key = e.key;

    if (key === 'ArrowLeft' || key === 'a') {
      this.pieceSystem.move(s, -1);
      return;
    }
    if (key === 'ArrowRight' || key === 'd') {
      this.pieceSystem.move(s, 1);
      return;
    }
    if (key === 'ArrowDown' || key === 's') {
      this.pieceSystem.softDrop(s);
      return;
    }
    if (key === 'ArrowUp' || key === 'w' || key === 'x') {
      this.pieceSystem.rotate(s, 1);
      return;
    }
    if (key === 'z' || key === 'Control') {
      this.pieceSystem.rotate(s, -1);
      return;
    }

    // Hard drop
    if (key === ' ') {
      e.preventDefault(); // prevent page scroll
      this.pieceSystem.hardDrop(s);
      return;
    }
  }
}
```

**What's happening:**
- Space bar calls `hardDrop`, which instantly drops and locks the piece.
- `e.preventDefault()` stops the browser from scrolling the page when space is pressed.
- We now block `e.repeat` events (browser auto-repeat from holding a key). This prevents accidental multiple hard drops. We will add proper DAS (Delayed Auto Shift) repeat in step 7.

---

### 4. Update the Engine Loop

**File:** `src/games/tetris/TetrisEngine.ts`

Add the `update` call to the game loop:

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
    const dt = now - this.lastTime;
    this.lastTime = now;

    // Update game logic
    this.pieceSystem.update(this.state, dt);

    // Render
    this.boardRenderer.render(this.ctx, this.state);

    this.rafId = requestAnimationFrame(() => this.loop());
  }
}
```

**What's happening:**
- We now compute `dt` (milliseconds since last frame) and pass it to `pieceSystem.update`.
- The update runs before rendering so the player sees the most current state each frame.

---

## Test It

1. **Run:** `npm run dev`
2. **Open:** the Tetris game
3. **Observe:**
   - The piece now falls automatically, one row every ~800 ms
   - **Down arrow** drops the piece one extra row and resets the gravity timer
   - **Space bar** slams the piece to the bottom instantly
   - After landing, the piece waits about half a second before locking (the lock delay)
   - During lock delay, you can still slide left/right or rotate
   - Once locked, the piece's blocks appear as part of the board and a new piece spawns
   - Stacking blocks to the top triggers game over (piece spawns into existing blocks)

4. **Test lock delay:**
   - Let a piece land on the bottom
   - Quickly tap Left or Right -- the lock timer resets each time
   - Wait without moving -- the piece locks after 500 ms

---

## Try It

- Change `lockDelay` to `2000` (2 seconds) for a very generous lock window, then to `100` for a frantic feel.
- Change `getDropInterval` to always return `100` and watch pieces rain down.
- Add `console.log('locked at row', piece.y)` in `lockCurrentPiece` to see where pieces land.

---

## Challenges

**Easy:**
- Display the current `dropTimer` value on screen to visualize the gravity accumulator.
- Make the lock delay shorter at higher levels (e.g., `500 - level * 20`).

**Medium:**
- Add a brief screen shake effect when a piece hard-drops (offset the canvas drawing by a few pixels for 100 ms).
- Limit lock-delay resets to 15 moves (standard "infinity" limit), then force-lock.

**Hard:**
- Implement "sonic drop" -- pressing Up moves the piece down to the landing spot but does *not* lock it, giving you time to slide at the bottom.

---

## What You Learned

- Accumulator-based gravity timer with `dt` deltas
- Lock delay pattern: start a timer when the piece can no longer drop, lock when it expires
- Resetting lock timers on movement for player-friendly behavior
- Hard drop by iterating Y downward until collision
- The full piece lifecycle: spawn, fall, lock, repeat

**Next:** Detect completed rows, clear them with an animation, and collapse the board.
