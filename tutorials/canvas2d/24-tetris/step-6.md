# Step 6: Scoring & Levels

**Goal:** Add a scoring system with points for line clears, soft/hard drops, level progression every 10 lines, and increasing speed.

**Time:** ~15 minutes

---

## What You'll Build

- **Line clear scoring**: 100/300/500/800 points for single/double/triple/tetris, multiplied by level
- **Soft drop bonus**: 1 point per cell dropped manually
- **Hard drop bonus**: 2 points per cell dropped
- **Level progression**: Level increases every 10 lines cleared
- **Speed curve**: Gravity interval decreases with level (800 ms down to 30 ms)
- **High score**: Persisted to localStorage

---

## Concepts

- **Level multiplier**: Base line-clear scores are multiplied by `(level + 1)`. A single at level 0 earns 100, but at level 5 it earns 600. This rewards playing at higher speeds.
- **NES speed curve**: The drop interval follows an approximation of the classic NES Tetris speed table. Each level maps to a specific interval in milliseconds. Beyond level 19, the speed caps at 30 ms (extremely fast).
- **localStorage persistence**: High scores are saved to `localStorage` and loaded on startup. We wrap access in try/catch because localStorage can throw in private browsing or when storage is full.

---

## Code

### 1. Create the Score System

**File:** `src/contexts/canvas2d/games/tetris/systems/ScoreSystem.ts`

```typescript
import type { TetrisState } from '../types';
import { HS_KEY } from '../types';

const LINE_SCORES = [0, 100, 300, 500, 800]; // 0, single, double, triple, tetris

export class ScoreSystem {
  /** Award score for cleared lines and update level */
  awardLines(state: TetrisState, linesCleared: number): void {
    if (linesCleared <= 0 || linesCleared > 4) return;

    const baseScore = LINE_SCORES[linesCleared];
    state.score += baseScore * (state.level + 1);
    state.lines += linesCleared;

    // Level up every 10 lines
    const newLevel = Math.floor(state.lines / 10);
    if (newLevel > state.level) {
      state.level = newLevel;
    }

    // High score
    if (state.score > state.highScore) {
      state.highScore = state.score;
      try {
        localStorage.setItem(HS_KEY, String(state.highScore));
      } catch {
        /* noop */
      }
    }
  }

  /** Award a small bonus for soft drops */
  awardSoftDrop(state: TetrisState, cells: number): void {
    state.score += cells;
  }

  /** Award bonus for hard drops */
  awardHardDrop(state: TetrisState, cells: number): void {
    state.score += cells * 2;
  }
}
```

**What's happening:**
- `LINE_SCORES` maps the number of cleared lines to base points. Index 0 is unused (no lines cleared means no score). The classic values are 100, 300, 500, 800.
- `awardLines` multiplies by `(level + 1)` so even level 0 gives the base score. Then it adds `linesCleared` to the total line count and checks if the player crossed a level boundary.
- Level thresholds are every 10 lines: 0 lines = level 0, 10 lines = level 1, 20 lines = level 2, etc.
- High score is checked after every score change and persisted immediately.
- `awardSoftDrop` gives 1 point per row dropped with the down arrow. It is a small reward for aggressive play.
- `awardHardDrop` gives 2 points per row. Hard drops are faster so they earn double.

---

### 2. Wire ScoreSystem into PieceSystem

**File:** `src/contexts/canvas2d/games/tetris/systems/PieceSystem.ts`

Update the constructor to accept a `ScoreSystem` and call it during soft drop, hard drop, and line clears:

```typescript
import type { TetrisState } from '../types';
import { COLS, getDropInterval } from '../types';
import { PIECES, WALL_KICKS, I_WALL_KICKS } from '../data/pieces';
import { BoardSystem } from './BoardSystem';
import { ScoreSystem } from './ScoreSystem';

export class PieceSystem {
  private boardSystem: BoardSystem;
  private scoreSystem: ScoreSystem;
  private bag: number[] = [];

  constructor(boardSystem: BoardSystem, scoreSystem: ScoreSystem) {
    this.boardSystem = boardSystem;
    this.scoreSystem = scoreSystem;
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
      if (state.isLocking) state.lockTimer = 0;
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
        if (state.isLocking) state.lockTimer = 0;
        return true;
      }
    }
    return false;
  }

  /** Soft drop -- UPDATED with score */
  softDrop(state: TetrisState): boolean {
    const piece = state.currentPiece;
    if (!piece) return false;
    if (!this.boardSystem.isColliding(state.board, piece.defIndex, piece.rotation, piece.x, piece.y + 1)) {
      piece.y++;
      state.dropTimer = 0;
      this.scoreSystem.awardSoftDrop(state, 1);
      return true;
    }
    return false;
  }

  /** Hard drop -- UPDATED with score */
  hardDrop(state: TetrisState): void {
    const piece = state.currentPiece;
    if (!piece) return;
    let ghostY = piece.y;
    while (!this.boardSystem.isColliding(state.board, piece.defIndex, piece.rotation, piece.x, ghostY + 1)) {
      ghostY++;
    }
    const distance = ghostY - piece.y;
    piece.y = ghostY;
    this.scoreSystem.awardHardDrop(state, distance);
    this.lockCurrentPiece(state);
  }

  /** Lock piece -- UPDATED with line score */
  lockCurrentPiece(state: TetrisState): void {
    this.boardSystem.lockPiece(state);
    const linesCleared = this.boardSystem.detectAndClearLines(state);
    if (linesCleared > 0) {
      this.scoreSystem.awardLines(state, linesCleared);
      state.currentPiece = null;
    } else {
      this.spawnPiece(state);
    }
    state.isLocking = false;
    state.lockTimer = 0;
  }

  update(state: TetrisState, dt: number): void {
    if (!state.started || state.paused || state.gameOver) return;

    if (state.clearingLines.length > 0) {
      state.clearTimer += dt;
      if (state.clearTimer >= state.clearDuration) {
        this.boardSystem.removeClearedLines(state);
        this.spawnPiece(state);
      }
      return;
    }

    if (!state.currentPiece) return;

    const piece = state.currentPiece;
    const interval = getDropInterval(state.level);

    state.dropTimer += dt;
    if (state.dropTimer >= interval) {
      state.dropTimer -= interval;
      if (!this.boardSystem.isColliding(state.board, piece.defIndex, piece.rotation, piece.x, piece.y + 1)) {
        piece.y++;
        state.isLocking = false;
        state.lockTimer = 0;
      } else {
        state.isLocking = true;
      }
    }

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
- `softDrop` now calls `scoreSystem.awardSoftDrop(state, 1)` for each row dropped.
- `hardDrop` calculates the distance traveled and calls `scoreSystem.awardHardDrop(state, distance)`.
- `lockCurrentPiece` calls `scoreSystem.awardLines(state, linesCleared)` when lines are cleared. This handles scoring, level-up, and high score persistence in one call.

---

### 3. Update the Engine

**File:** `src/contexts/canvas2d/games/tetris/TetrisEngine.ts`

Add the score system and load the high score from localStorage:

```typescript
import type { TetrisState } from './types';
import { HS_KEY, createEmptyBoard } from './types';
import { BoardSystem } from './systems/BoardSystem';
import { PieceSystem } from './systems/PieceSystem';
import { ScoreSystem } from './systems/ScoreSystem';
import { InputSystem } from './systems/InputSystem';
import { BoardRenderer } from './renderers/BoardRenderer';

export class TetrisEngine {
  private ctx: CanvasRenderingContext2D;
  private state: TetrisState;
  private running = false;
  private rafId = 0;
  private lastTime = 0;

  private boardSystem: BoardSystem;
  private scoreSystem: ScoreSystem;
  private pieceSystem: PieceSystem;
  private inputSystem: InputSystem;
  private boardRenderer: BoardRenderer;
  private resizeHandler: () => void;

  constructor(canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    let hs = 0;
    try {
      hs = parseInt(localStorage.getItem(HS_KEY) ?? '0', 10) || 0;
    } catch {
      /* noop */
    }

    this.state = {
      board: createEmptyBoard(),
      currentPiece: null,
      nextPieceIndex: 0,
      score: 0,
      highScore: hs,
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
    this.scoreSystem = new ScoreSystem();
    this.pieceSystem = new PieceSystem(this.boardSystem, this.scoreSystem);
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

    this.pieceSystem.update(this.state, dt);
    this.boardRenderer.render(this.ctx, this.state);

    this.rafId = requestAnimationFrame(() => this.loop());
  }
}
```

---

### 4. Display Score on Screen

We need to show the score, level, and lines somewhere. Add a simple HUD drawing at the end of `BoardRenderer.render`, or create a quick text overlay. For now, add this at the end of the `render` method in `BoardRenderer.ts`, just before the closing brace:

```typescript
    // --- HUD text (temporary -- will move to HUDRenderer in step 7) ---
    const rightX = offsetX + boardW + 30;

    ctx.textAlign = 'left';
    ctx.font = 'bold 14px monospace';
    ctx.fillStyle = '#667';
    ctx.fillText('SCORE', rightX, offsetY + 20);
    ctx.font = 'bold 22px monospace';
    ctx.fillStyle = '#fff';
    ctx.fillText(String(state.score), rightX, offsetY + 48);

    ctx.font = 'bold 14px monospace';
    ctx.fillStyle = '#667';
    ctx.fillText('LEVEL', rightX, offsetY + 80);
    ctx.font = 'bold 20px monospace';
    ctx.fillStyle = '#0f0';
    ctx.fillText(String(state.level), rightX, offsetY + 104);

    ctx.font = 'bold 14px monospace';
    ctx.fillStyle = '#667';
    ctx.fillText('LINES', rightX, offsetY + 140);
    ctx.font = 'bold 20px monospace';
    ctx.fillStyle = '#0cf';
    ctx.fillText(String(state.lines), rightX, offsetY + 164);
```

**What's happening:**
- We draw score, level, and lines to the right of the board.
- Each label uses a dim gray (`#667`) and each value uses a bright color.
- This is temporary placement. In step 7 we will move this into a dedicated `HUDRenderer` class.

---

## Test It

1. **Run:** `npm run dev`
2. **Open:** the Tetris game
3. **Observe:**
   - Score, Level, and Lines display to the right of the board
   - Clearing a single line adds 100 points (at level 0)
   - Clearing 4 lines at once adds 800 points
   - Every 10 lines cleared, the level increases by 1
   - After leveling up, pieces fall noticeably faster
   - Hard-dropping a piece from high up adds 2 points per row traveled
   - Soft-dropping adds 1 point per row
   - The score persists as high score across page refreshes

4. **Test level speed:**
   - Play until level 5 -- gravity should be roughly twice as fast as level 0
   - At level 9+, pieces fall nearly instantly

---

## Try It

- Change `LINE_SCORES` to `[0, 200, 600, 1000, 1600]` for double points.
- Temporarily set `state.level = 15` in the constructor to experience high-level speed.
- Clear 10 lines and verify the level changes from 0 to 1.

---

## Challenges

**Easy:**
- Display the high score alongside the current score.
- Show the current `getDropInterval` value on screen so players can see the speed.

**Medium:**
- Award a "back-to-back" bonus: if the player clears a Tetris (4 lines) twice in a row, give 1.5x points for the second one.
- Add a combo system: consecutive piece locks that each clear at least one line give increasing bonus points.

**Hard:**
- Implement the "T-spin" bonus: detect when a T-piece is rotated into a tight spot using a wall kick, and award bonus points for the subsequent line clear.

---

## What You Learned

- Table-driven scoring with an array indexed by line count
- Level multiplier for escalating rewards
- Drop distance scoring for soft and hard drops
- Level-up threshold based on total lines cleared
- localStorage persistence with error handling
- NES-style speed curve as a lookup table

**Next:** Add ghost piece preview, next piece display, DAS input, and full polish.
