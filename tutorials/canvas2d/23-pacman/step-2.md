# Step 2: Pac-Man Movement

**Goal:** Move Pac-Man through the maze using arrow keys with direction queuing and smooth animation between cells.

**Time:** ~15 minutes

---

## What You'll Build

A controllable Pac-Man that feels responsive:
- **Arrow key input** with WASD alternative
- **Direction queuing**: press a direction before reaching a turn and it executes at the next valid intersection
- **Grid-based collision**: Pac-Man cannot walk through walls or the ghost door
- **Smooth sub-cell movement**: Pac-Man glides between grid cells rather than snapping
- **Grid snapping**: auto-align to the grid axis perpendicular to movement direction
- **Yellow circle Pac-Man** placeholder (animated mouth comes in Step 7)

---

## Concepts

- **Direction Queuing**: Store the player's desired direction in `nextDir`. Each frame, check if `nextDir` leads to a walkable cell. If so, switch `dir` to `nextDir`. This means the player can press Left while still moving Up, and the turn happens automatically at the next corridor.
- **Sub-Cell Collision Check**: To decide if a direction is walkable, look 0.55 cells ahead of the current position and `Math.round` to the target tile. The 0.55 threshold prevents Pac-Man from needing to be perfectly centered before a turn is accepted.
- **Perpendicular Snap**: When moving left/right, snap the Y position to the nearest integer if within 0.15 cells. This keeps Pac-Man centered in corridors and prevents drifting.

---

## Code

### 1. Create the Input System

**File:** `src/contexts/canvas2d/games/pacman/systems/InputSystem.ts`

Map arrow keys and WASD to directions. Store the desired direction in state.

```typescript
import type { PacManState, Direction } from '../types';

export class InputSystem {
  private state: PacManState;
  private keyHandler: (e: KeyboardEvent) => void;

  constructor(state: PacManState) {
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

    const dirMap: Record<string, Direction> = {
      ArrowUp: 'up',
      ArrowDown: 'down',
      ArrowLeft: 'left',
      ArrowRight: 'right',
      w: 'up', W: 'up',
      s: 'down', S: 'down',
      a: 'left', A: 'left',
      d: 'right', D: 'right',
    };

    if (dirMap[key]) {
      e.preventDefault();
      if (!this.state.started) {
        this.state.started = true;
      }
      this.state.pacman.nextDir = dirMap[key];
      return;
    }

    if (key === 'p' || key === 'P') {
      if (this.state.started && !this.state.gameOver && !this.state.won) {
        this.state.paused = !this.state.paused;
      }
    }
  }
}
```

**What's happening:**
- `dirMap` translates both arrow keys and WASD to our `Direction` type. This covers both keyboard layouts in one lookup.
- We set `nextDir` rather than `dir` directly. The `PlayerSystem` will validate the turn before applying it. This is the **direction queuing** pattern.
- The first arrow key press also sets `started = true`, which will unfreeze the game loop in later steps.
- `e.preventDefault()` stops arrow keys from scrolling the page.

---

### 2. Create the Player System

**File:** `src/contexts/canvas2d/games/pacman/systems/PlayerSystem.ts`

Move Pac-Man through the grid each frame. Handle direction changes, wall collision, and grid snapping.

```typescript
import type { PacManState, Direction, Position } from '../types';
import { BASE_SPEED } from '../types';

export class PlayerSystem {
  update(state: PacManState, dt: number): void {
    if (state.paused || state.gameOver || !state.started || state.won) return;

    const pac = state.pacman;
    const speed = BASE_SPEED * dt;

    // Try queued direction first
    if (pac.nextDir !== 'none' && pac.nextDir !== pac.dir) {
      if (this.canMove(state, pac.pos, pac.nextDir)) {
        pac.dir = pac.nextDir;
      }
    }

    // Move in current direction
    if (pac.dir !== 'none' && this.canMove(state, pac.pos, pac.dir)) {
      const delta = this.dirToDelta(pac.dir);
      pac.pos.x += delta.x * speed;
      pac.pos.y += delta.y * speed;

      // Tunnel wrap
      if (pac.pos.x < -0.5) pac.pos.x = state.gridWidth - 0.5;
      if (pac.pos.x > state.gridWidth - 0.5) pac.pos.x = -0.5;
    }

    // Snap to grid on the perpendicular axis
    this.snapToGrid(pac);
  }

  private canMove(state: PacManState, pos: Position, dir: Direction): boolean {
    const delta = this.dirToDelta(dir);
    const nextX = Math.round(pos.x + delta.x * 0.55);
    const nextY = Math.round(pos.y + delta.y * 0.55);

    // Allow tunnel (off-screen horizontally)
    if (nextX < 0 || nextX >= state.gridWidth) return true;
    if (nextY < 0 || nextY >= state.gridHeight) return false;

    const cell = state.grid[nextY][nextX];
    return cell.type !== 'wall' && cell.type !== 'door';
  }

  private dirToDelta(dir: Direction): Position {
    switch (dir) {
      case 'up':    return { x: 0, y: -1 };
      case 'down':  return { x: 0, y: 1 };
      case 'left':  return { x: -1, y: 0 };
      case 'right': return { x: 1, y: 0 };
      default:      return { x: 0, y: 0 };
    }
  }

  private snapToGrid(pac: { pos: Position; dir: Direction }): void {
    const threshold = 0.15;
    const cx = Math.round(pac.pos.x);
    const cy = Math.round(pac.pos.y);

    if (pac.dir === 'left' || pac.dir === 'right') {
      if (Math.abs(pac.pos.y - cy) < threshold) pac.pos.y = cy;
    }
    if (pac.dir === 'up' || pac.dir === 'down') {
      if (Math.abs(pac.pos.x - cx) < threshold) pac.pos.x = cx;
    }
  }
}
```

**What's happening:**
- **Direction queuing check**: Before moving, we test if `nextDir` leads to a valid cell. If so, we switch `dir`. Otherwise Pac-Man continues in the current direction. The player's input is never lost -- it stays in `nextDir` until it can be applied.
- **`canMove`**: Looks 0.55 cells ahead in the desired direction and rounds to the nearest tile. The 0.55 value means Pac-Man can start turning slightly before reaching the exact center of an intersection. This makes controls feel snappy rather than sluggish.
- **Wall and door blocking**: Pac-Man cannot enter `wall` or `door` cells. The ghost door is one-way for ghosts only.
- **Tunnel wrapping**: When `pos.x` goes below -0.5, it wraps to the right edge. When it exceeds `gridWidth - 0.5`, it wraps to the left. The 0.5 offset means Pac-Man fully disappears on one side before appearing on the other.
- **`snapToGrid`**: If moving horizontally, snap Y to the nearest integer (and vice versa). The 0.15-cell threshold prevents visible jumping while still correcting drift. Without this, Pac-Man would slowly drift off-center and miss turns.

---

### 3. Add Pac-Man Rendering

**File:** `src/contexts/canvas2d/games/pacman/renderers/GameRenderer.ts`

Add a `renderPacMan` method and call it from `render`. For now we draw a simple yellow circle. The animated mouth comes in Step 7.

```typescript
import type { PacManState } from '../types';

export class GameRenderer {
  render(ctx: CanvasRenderingContext2D, state: PacManState): void {
    const { cellSize: cs, offsetX: ox, offsetY: oy } = state;

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    this.renderMaze(ctx, state, cs, ox, oy);
    this.renderDots(ctx, state, cs, ox, oy);
    this.renderPacMan(ctx, state, cs, ox, oy);
  }

  // --- renderMaze, drawWallBorders, renderDots unchanged from Step 1 ---

  private renderMaze(
    ctx: CanvasRenderingContext2D,
    state: PacManState,
    cs: number,
    ox: number,
    oy: number,
  ): void {
    ctx.fillStyle = '#1a1a7e';
    ctx.strokeStyle = '#3333ff';
    ctx.lineWidth = 2;

    for (let y = 0; y < state.gridHeight; y++) {
      for (let x = 0; x < state.gridWidth; x++) {
        const cell = state.grid[y][x];
        if (cell.type === 'wall') {
          const px = ox + x * cs;
          const py = oy + y * cs;
          ctx.fillRect(px, py, cs, cs);
          this.drawWallBorders(ctx, state, x, y, px, py, cs);
        } else if (cell.type === 'door') {
          const px = ox + x * cs;
          const py = oy + y * cs;
          ctx.fillStyle = '#ff88ff';
          ctx.fillRect(px, py + cs * 0.35, cs, cs * 0.3);
          ctx.fillStyle = '#1a1a7e';
        }
      }
    }
  }

  private drawWallBorders(
    ctx: CanvasRenderingContext2D,
    state: PacManState,
    x: number,
    y: number,
    px: number,
    py: number,
    cs: number,
  ): void {
    const isWall = (cx: number, cy: number) => {
      if (cx < 0 || cx >= state.gridWidth || cy < 0 || cy >= state.gridHeight) return true;
      return state.grid[cy][cx].type === 'wall';
    };

    ctx.strokeStyle = '#3333ff';
    ctx.lineWidth = 1.5;

    if (!isWall(x, y - 1)) { ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + cs, py); ctx.stroke(); }
    if (!isWall(x, y + 1)) { ctx.beginPath(); ctx.moveTo(px, py + cs); ctx.lineTo(px + cs, py + cs); ctx.stroke(); }
    if (!isWall(x - 1, y)) { ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, py + cs); ctx.stroke(); }
    if (!isWall(x + 1, y)) { ctx.beginPath(); ctx.moveTo(px + cs, py); ctx.lineTo(px + cs, py + cs); ctx.stroke(); }
  }

  private renderDots(
    ctx: CanvasRenderingContext2D,
    state: PacManState,
    cs: number,
    ox: number,
    oy: number,
  ): void {
    const time = state.time;

    for (let y = 0; y < state.gridHeight; y++) {
      for (let x = 0; x < state.gridWidth; x++) {
        const cell = state.grid[y][x];
        const cx = ox + x * cs + cs / 2;
        const cy = oy + y * cs + cs / 2;

        if (cell.type === 'dot') {
          ctx.fillStyle = '#ffcc99';
          ctx.beginPath();
          ctx.arc(cx, cy, cs * 0.12, 0, Math.PI * 2);
          ctx.fill();
        } else if (cell.type === 'power') {
          const pulse = 0.6 + 0.4 * Math.sin(time * 6);
          const radius = cs * 0.3 * pulse;
          ctx.fillStyle = '#ffcc99';
          ctx.beginPath();
          ctx.arc(cx, cy, radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  private renderPacMan(
    ctx: CanvasRenderingContext2D,
    state: PacManState,
    cs: number,
    ox: number,
    oy: number,
  ): void {
    const pac = state.pacman;
    const cx = ox + pac.pos.x * cs + cs / 2;
    const cy = oy + pac.pos.y * cs + cs / 2;
    const radius = cs * 0.45;

    // Simple yellow circle for now
    ctx.fillStyle = '#ffff00';
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
  }
}
```

**What's happening:**
- Pac-Man's pixel position is computed from `pac.pos.x` (a floating-point grid coordinate) multiplied by `cellSize`, plus the canvas offset. Because `pos.x` changes smoothly each frame, the circle glides between cells.
- The radius is `cs * 0.45` -- slightly smaller than a full cell so Pac-Man fits comfortably inside corridors.
- We draw Pac-Man **after** dots so he renders on top when passing through a dot cell.

---

### 4. Update the Engine

**File:** `src/contexts/canvas2d/games/pacman/PacManEngine.ts`

Add the `InputSystem` and `PlayerSystem` to the engine. Update the game loop to call `playerSystem.update()`.

```typescript
import type { PacManState, Cell } from './types';
import { MAZE_COLS, MAZE_ROWS, INITIAL_LIVES } from './types';
import { MAZE_DATA } from './data/maze';
import { InputSystem } from './systems/InputSystem';
import { PlayerSystem } from './systems/PlayerSystem';
import { GameRenderer } from './renderers/GameRenderer';

export class PacManEngine {
  private ctx: CanvasRenderingContext2D;
  private state: PacManState;
  private running = false;
  private rafId = 0;
  private lastTime = 0;

  private inputSystem: InputSystem;
  private playerSystem: PlayerSystem;
  private gameRenderer: GameRenderer;
  private resizeHandler: () => void;

  constructor(canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    this.state = this.buildInitialState(canvas);

    this.playerSystem = new PlayerSystem();
    this.inputSystem = new InputSystem(this.state);
    this.gameRenderer = new GameRenderer();

    this.resizeHandler = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      this.updateCellSize(canvas);
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
    const dt = Math.min((now - this.lastTime) / 1000, 0.1);
    this.lastTime = now;
    this.state.time = now / 1000;

    if (this.state.started && !this.state.paused) {
      this.playerSystem.update(this.state, dt);
    }

    this.gameRenderer.render(this.ctx, this.state);

    this.rafId = requestAnimationFrame(() => this.loop());
  }

  // --- buildInitialState, computeCellSize, updateCellSize unchanged from Step 1 ---

  private buildInitialState(canvas: HTMLCanvasElement): PacManState {
    const grid: Cell[][] = [];
    let totalDots = 0;
    let playerStart = { x: 13.5, y: 23 };

    for (let y = 0; y < MAZE_ROWS; y++) {
      const row: Cell[] = [];
      const line = MAZE_DATA[y] || '';
      for (let x = 0; x < MAZE_COLS; x++) {
        const ch = line[x] || ' ';
        let type: Cell['type'] = 'empty';
        switch (ch) {
          case '#': type = 'wall'; break;
          case '.': type = 'dot'; totalDots++; break;
          case 'o': type = 'power'; totalDots++; break;
          case '-': type = 'door'; break;
          case 'P': playerStart = { x, y }; type = 'empty'; break;
          case 'G': type = 'empty'; break;
        }
        row.push({ type });
      }
      grid.push(row);
    }

    const cs = this.computeCellSize(canvas.width, canvas.height);
    const offsetX = (canvas.width - MAZE_COLS * cs) / 2;
    const offsetY = (canvas.height - MAZE_ROWS * cs) / 2 + 10;

    return {
      grid,
      gridWidth: MAZE_COLS,
      gridHeight: MAZE_ROWS,
      pacman: {
        pos: { ...playerStart },
        dir: 'none',
        nextDir: 'none',
        mouthAngle: 0.4,
        mouthOpening: true,
      },
      ghosts: [],
      score: 0,
      highScore: 0,
      lives: INITIAL_LIVES,
      level: 1,
      totalDots,
      dotsEaten: 0,
      frightenedTimer: 0,
      frightenedGhostsEaten: 0,
      modeTimer: 0,
      modeIndex: 0,
      globalMode: 'scatter',
      gameOver: false,
      paused: false,
      started: false,
      won: false,
      time: 0,
      cellSize: cs,
      offsetX,
      offsetY,
    };
  }

  private computeCellSize(w: number, h: number): number {
    const maxW = (w - 20) / MAZE_COLS;
    const maxH = (h - 60) / MAZE_ROWS;
    return Math.floor(Math.min(maxW, maxH));
  }

  private updateCellSize(canvas: HTMLCanvasElement): void {
    const cs = this.computeCellSize(canvas.width, canvas.height);
    this.state.cellSize = cs;
    this.state.offsetX = (canvas.width - MAZE_COLS * cs) / 2;
    this.state.offsetY = (canvas.height - MAZE_ROWS * cs) / 2 + 10;
  }
}
```

**What's happening:**
- The game loop now computes `dt` (clamped to 100ms) and passes it to `playerSystem.update()`.
- We only update physics when `state.started` is true. The first arrow key press flips this flag, so the game starts on first input.
- `inputSystem.attach()` is called in the constructor and `detach()` in `destroy()` to properly clean up the global `keydown` listener.

---

## Test It

1. **Run:** `npm run dev`
2. **Open:** the Pac-Man game
3. **Observe:**
   - Yellow circle sitting at Pac-Man's start position (lower-center of maze)
   - Press an arrow key -- Pac-Man starts moving in that direction
   - Pac-Man stops at walls and cannot walk through them
   - Pac-Man cannot enter the ghost house door
   - Press a perpendicular direction approaching a T-junction -- the turn executes automatically when the corridor opens up
   - Movement is smooth, not tile-by-tile snapping

**Test the direction queuing:** While moving right, press Up. Nothing happens immediately because there's a wall above. Keep holding or press Up again approaching an upward corridor. The moment you reach it, Pac-Man turns up without you needing perfect timing.

---

## Try It

- Change `BASE_SPEED` to `10` for a frantic Pac-Man.
- Change the snap `threshold` from `0.15` to `0.5` and notice how aggressively Pac-Man aligns to the grid.
- Change the `canMove` look-ahead from `0.55` to `0.9` -- turns become much harder to execute because you need to be almost at the intersection center.

---

## Challenges

**Easy:**
- Change Pac-Man's color from yellow to green.
- Make Pac-Man slightly larger (`cs * 0.5` radius).

**Medium:**
- Add a movement trail: store the last 5 positions and draw fading yellow circles behind Pac-Man.
- Draw a small arrow on Pac-Man showing the queued `nextDir` (when different from `dir`).

**Hard:**
- Implement "cornering" -- allow Pac-Man to start turning a few pixels early when approaching an intersection, matching the original game's pre-turn behavior.
- Add touch/swipe controls for mobile. Detect swipe direction using `touchstart` and `touchmove` events.

---

## What You Learned

- Direction queuing with `nextDir` / `dir` separation for responsive grid-based movement
- Sub-cell collision detection using look-ahead with `Math.round`
- Perpendicular axis snapping to keep the player centered in corridors
- Delta-time grid movement: `pos += dirDelta * speed * dt`
- Event-driven input that writes to shared state (the system reads it each frame)

**Next:** Eat dots on contact and track score with tunnel wrapping.
