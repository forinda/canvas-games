# Step 4: Ghost Movement

**Goal:** Add four colored ghosts that move through the maze, exit the ghost house on timers, and patrol their scatter corners.

**Time:** ~15 minutes

---

## What You'll Build

The four classic ghosts:
- **Blinky** (red) -- starts outside the house, active immediately
- **Pinky** (pink) -- exits after 3 seconds
- **Inky** (cyan) -- exits after 7 seconds
- **Clyde** (orange) -- exits after 12 seconds
- **Ghost house release**: ghosts wait inside, then move to the exit position
- **Scatter mode**: each ghost patrols toward a fixed corner of the maze
- **Direction selection**: at each intersection, pick the direction that minimizes distance to the target (no reversing allowed)

---

## Concepts

- **Ghost House Release Timer**: Each ghost has a `releaseTimer`. While positive, the ghost stays inside the house (`active = false`). When the timer reaches zero, the ghost is placed at the exit position and becomes active.
- **Scatter Targets**: Each ghost has a fixed `scatterTarget` in a corner of the maze. In scatter mode, they head toward this corner. Because the target is outside the maze bounds, the ghost ends up looping around the corner repeatedly.
- **Greedy Direction Choice**: At each intersection (when the ghost snaps to a grid center), evaluate all four directions except the reverse of the current direction. Pick the one whose resulting tile is closest (squared Euclidean distance) to the target. This is the classic Pac-Man ghost AI -- no pathfinding, just greedy target-chasing.
- **Direction Priority**: When two directions tie in distance, ghosts prefer: up, left, down, right. This matches the original game.

---

## Code

### 1. Create the Ghost System

**File:** `src/games/pacman/systems/GhostSystem.ts`

Handle ghost release timers, movement, and direction selection.

```typescript
import type { PacManState, Ghost, Direction, Position } from '../types';
import { GHOST_SPEED } from '../types';

const DIRECTIONS: Direction[] = ['up', 'left', 'down', 'right'];

export class GhostSystem {
  update(state: PacManState, dt: number): void {
    if (state.paused || state.gameOver || !state.started || state.won) return;

    for (const ghost of state.ghosts) {
      this.updateGhostRelease(ghost, state, dt);
      if (!ghost.active) continue;
      this.moveGhost(ghost, state, dt);
    }
  }

  private updateGhostRelease(ghost: Ghost, state: PacManState, dt: number): void {
    if (ghost.active) return;
    ghost.releaseTimer -= dt;
    if (ghost.releaseTimer <= 0) {
      ghost.active = true;
      // Place ghost just outside the house
      ghost.pos = { x: 13.5, y: 11 };
      ghost.dir = 'left';
      ghost.mode = 'scatter';
    }
  }

  private moveGhost(ghost: Ghost, state: PacManState, dt: number): void {
    const speed = GHOST_SPEED;
    const movement = speed * dt;

    const delta = this.dirToDelta(ghost.dir);
    ghost.pos.x += delta.x * movement;
    ghost.pos.y += delta.y * movement;

    // Tunnel wrap
    if (ghost.pos.x < -0.5) ghost.pos.x = state.gridWidth - 0.5;
    if (ghost.pos.x > state.gridWidth - 0.5) ghost.pos.x = -0.5;

    // Snap and choose direction at intersections
    const cx = Math.round(ghost.pos.x);
    const cy = Math.round(ghost.pos.y);
    const distToCenter = Math.abs(ghost.pos.x - cx) + Math.abs(ghost.pos.y - cy);

    if (distToCenter < 0.15) {
      ghost.pos.x = cx;
      ghost.pos.y = cy;

      const target = ghost.scatterTarget;
      ghost.dir = this.chooseBestDirection(ghost, state, target);
    }
  }

  private chooseBestDirection(
    ghost: Ghost,
    state: PacManState,
    target: Position,
  ): Direction {
    const cx = Math.round(ghost.pos.x);
    const cy = Math.round(ghost.pos.y);
    const reverse = this.reverseDir(ghost.dir);

    let bestDir: Direction = ghost.dir;
    let bestDist = Infinity;

    for (const dir of DIRECTIONS) {
      if (dir === reverse) continue; // Ghosts cannot reverse

      const d = this.dirToDelta(dir);
      const nx = cx + d.x;
      const ny = cy + d.y;

      if (!this.canGhostEnter(state, nx, ny, false)) continue;

      const dist = (nx - target.x) ** 2 + (ny - target.y) ** 2;
      if (dist < bestDist) {
        bestDist = dist;
        bestDir = dir;
      }
    }

    return bestDir;
  }

  private canGhostEnter(
    state: PacManState,
    x: number,
    y: number,
    eaten: boolean,
  ): boolean {
    if (x < 0 || x >= state.gridWidth) return true; // Allow tunnel
    if (y < 0 || y >= state.gridHeight) return false;

    const cell = state.grid[y][x];
    if (cell.type === 'wall') return false;
    if (cell.type === 'door') return eaten; // Only eaten ghosts re-enter the house
    return true;
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

  private reverseDir(dir: Direction): Direction {
    switch (dir) {
      case 'up':    return 'down';
      case 'down':  return 'up';
      case 'left':  return 'right';
      case 'right': return 'left';
      default:      return dir;
    }
  }
}
```

**What's happening:**
- **Release timer**: Each frame, inactive ghosts count down. When the timer hits zero, the ghost teleports to `(13.5, 11)` -- just above the ghost house door -- and starts moving left.
- **Movement**: Each frame, the ghost moves `GHOST_SPEED * dt` cells in its current direction. This is identical to how Pac-Man moves.
- **Intersection detection**: We check if the ghost is within 0.15 cells (Manhattan distance) of a grid center. If so, we snap to the center and pick a new direction.
- **`chooseBestDirection`**: Evaluates all four directions except the reverse. For each candidate, it checks if the ghost can enter that tile (not a wall, not a door). Among valid options, it picks the one with the smallest squared distance to the target. The `DIRECTIONS` array order (`up, left, down, right`) ensures correct tie-breaking.
- **`canGhostEnter`**: Walls block. The ghost door blocks unless the ghost has been eaten (returning home). Off-screen X is allowed for tunnel traversal.

---

### 2. Add Ghost Rendering

**File:** `src/games/pacman/renderers/GameRenderer.ts`

Add a `renderGhosts` method. For now, draw each ghost as a colored circle. The full ghost shape (rounded top, wavy bottom) comes in Step 7.

Add this method to the `GameRenderer` class and call it from `render`:

```typescript
import type { PacManState } from '../types';

export class GameRenderer {
  render(ctx: CanvasRenderingContext2D, state: PacManState): void {
    const { cellSize: cs, offsetX: ox, offsetY: oy } = state;

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    this.renderMaze(ctx, state, cs, ox, oy);
    this.renderDots(ctx, state, cs, ox, oy);
    this.renderGhosts(ctx, state, cs, ox, oy);
    this.renderPacMan(ctx, state, cs, ox, oy);
  }

  // --- renderMaze, drawWallBorders, renderDots unchanged from Step 2 ---

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

  private renderGhosts(
    ctx: CanvasRenderingContext2D,
    state: PacManState,
    cs: number,
    ox: number,
    oy: number,
  ): void {
    for (const ghost of state.ghosts) {
      if (!ghost.active) continue;

      const cx = ox + ghost.pos.x * cs + cs / 2;
      const cy = oy + ghost.pos.y * cs + cs / 2;
      const r = cs * 0.45;

      // Ghost body (simple circle for now -- full shape in Step 7)
      ctx.fillStyle = ghost.color;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();

      // Eyes: two white circles with blue pupils
      const eyeR = r * 0.22;
      const pupilR = r * 0.11;
      const eyeOffX = r * 0.3;
      const eyeY = cy - r * 0.15;

      let pdx = 0;
      let pdy = 0;
      switch (ghost.dir) {
        case 'up':    pdy = -pupilR * 0.5; break;
        case 'down':  pdy = pupilR * 0.5; break;
        case 'left':  pdx = -pupilR * 0.5; break;
        case 'right': pdx = pupilR * 0.5; break;
      }

      for (const sign of [-1, 1]) {
        const ex = cx + sign * eyeOffX;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(ex, eyeY, eyeR, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#00f';
        ctx.beginPath();
        ctx.arc(ex + pdx, eyeY + pdy, pupilR, 0, Math.PI * 2);
        ctx.fill();
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

    ctx.fillStyle = '#ffff00';
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.fill();
  }
}
```

**What's happening:**
- Each active ghost is drawn as a colored circle at its current position. Inactive ghosts (still in the house) are skipped.
- The eyes give each ghost personality and direction awareness. Two white circles with blue pupils, offset in the movement direction by `pupilR * 0.5`.
- The pupil direction lookup uses the same `switch` pattern as `dirToDelta` but returns a smaller pixel offset.
- Ghosts render **before** Pac-Man so Pac-Man draws on top when they overlap.

---

### 3. Update the Engine

**File:** `src/games/pacman/PacManEngine.ts`

Add ghost initialization and the `GhostSystem` to the game loop.

```typescript
import type { PacManState, Cell, Ghost } from './types';
import { MAZE_COLS, MAZE_ROWS, INITIAL_LIVES } from './types';
import { MAZE_DATA } from './data/maze';
import { InputSystem } from './systems/InputSystem';
import { PlayerSystem } from './systems/PlayerSystem';
import { GhostSystem } from './systems/GhostSystem';
import { GameRenderer } from './renderers/GameRenderer';
import { HUDRenderer } from './renderers/HUDRenderer';

const HS_KEY = 'pacman_highscore';

export class PacManEngine {
  private ctx: CanvasRenderingContext2D;
  private state: PacManState;
  private running = false;
  private rafId = 0;
  private lastTime = 0;

  private inputSystem: InputSystem;
  private playerSystem: PlayerSystem;
  private ghostSystem: GhostSystem;
  private gameRenderer: GameRenderer;
  private hudRenderer: HUDRenderer;
  private resizeHandler: () => void;

  constructor(canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    this.state = this.buildInitialState(canvas);

    this.playerSystem = new PlayerSystem();
    this.ghostSystem = new GhostSystem();
    this.inputSystem = new InputSystem(this.state);
    this.gameRenderer = new GameRenderer();
    this.hudRenderer = new HUDRenderer();

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

    if (this.state.started && !this.state.paused && !this.state.gameOver && !this.state.won) {
      this.playerSystem.update(this.state, dt);
      this.ghostSystem.update(this.state, dt);
    }

    if (this.state.score > this.state.highScore) {
      this.state.highScore = this.state.score;
      try { localStorage.setItem(HS_KEY, String(this.state.highScore)); } catch { /* noop */ }
    }

    this.gameRenderer.render(this.ctx, this.state);
    this.hudRenderer.render(this.ctx, this.state);

    this.rafId = requestAnimationFrame(() => this.loop());
  }

  private buildInitialState(canvas: HTMLCanvasElement): PacManState {
    const grid: Cell[][] = [];
    let totalDots = 0;
    let playerStart = { x: 13.5, y: 23 };
    const ghostStarts: { x: number; y: number }[] = [];

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
          case 'G': ghostStarts.push({ x, y }); type = 'empty'; break;
        }
        row.push({ type });
      }
      grid.push(row);
    }

    let hs = 0;
    try { hs = parseInt(localStorage.getItem(HS_KEY) ?? '0', 10) || 0; } catch { /* noop */ }

    const ghosts: Ghost[] = [
      {
        name: 'blinky',
        pos: { x: 13.5, y: 11 },
        dir: 'left',
        mode: 'scatter',
        scatterTarget: { x: MAZE_COLS - 3, y: -3 },
        homePos: ghostStarts[0] ?? { x: 13, y: 14 },
        color: '#ff0000',
        active: true,
        releaseTimer: 0,
        eaten: false,
      },
      {
        name: 'pinky',
        pos: { ...(ghostStarts[1] ?? { x: 13, y: 14 }) },
        dir: 'up',
        mode: 'scatter',
        scatterTarget: { x: 2, y: -3 },
        homePos: ghostStarts[1] ?? { x: 13, y: 14 },
        color: '#ffb8ff',
        active: false,
        releaseTimer: 3,
        eaten: false,
      },
      {
        name: 'inky',
        pos: { ...(ghostStarts[2] ?? { x: 11, y: 14 }) },
        dir: 'up',
        mode: 'scatter',
        scatterTarget: { x: MAZE_COLS - 1, y: MAZE_ROWS + 1 },
        homePos: ghostStarts[2] ?? { x: 11, y: 14 },
        color: '#00ffff',
        active: false,
        releaseTimer: 7,
        eaten: false,
      },
      {
        name: 'clyde',
        pos: { ...(ghostStarts[3] ?? { x: 15, y: 14 }) },
        dir: 'up',
        mode: 'scatter',
        scatterTarget: { x: 0, y: MAZE_ROWS + 1 },
        homePos: ghostStarts[3] ?? { x: 15, y: 14 },
        color: '#ffb852',
        active: false,
        releaseTimer: 12,
        eaten: false,
      },
    ];

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
      ghosts,
      score: 0,
      highScore: hs,
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
- **Ghost initialization**: Four ghosts are created with distinct properties:
  - **Blinky** (red): starts outside the house at `(13.5, 11)`, immediately active. Scatters to the top-right corner.
  - **Pinky** (pink): starts inside the house, released after 3 seconds. Scatters to the top-left.
  - **Inky** (cyan): starts inside, released after 7 seconds. Scatters to the bottom-right.
  - **Clyde** (orange): starts inside, released after 12 seconds. Scatters to the bottom-left.
- The scatter targets are placed **outside** the maze bounds (e.g., `y: -3`). This means the ghost can never reach them and instead loops around the nearest accessible corner, creating the classic patrol behavior.
- `ghostStarts` collects positions of `G` characters from the maze data. These become the `homePos` for each ghost -- where they return after being eaten (in Step 6).
- The `ghostSystem.update()` call is added to the game loop, right after `playerSystem.update()`.

---

## Test It

1. **Run:** `npm run dev`
2. **Open:** the Pac-Man game
3. **Observe:**
   - Press an arrow key to start. Blinky (red) is already moving near the top of the ghost house.
   - After 3 seconds, Pinky (pink) appears at the house exit and starts moving.
   - After 7 seconds, Inky (cyan) appears. After 12 seconds, Clyde (orange).
   - Each ghost moves toward its scatter corner: Blinky heads top-right, Pinky top-left, Inky bottom-right, Clyde bottom-left.
   - Ghosts navigate intersections, turning toward their target without ever reversing direction.
   - Ghosts use the tunnel just like Pac-Man -- they wrap from one side to the other.
   - Ghosts cannot enter the ghost house door from outside (only eaten ghosts can, which we add in Step 6).

**Watch Blinky patrol the top-right corner.** He will loop around the same block repeatedly because his scatter target is outside the maze at `(25, -3)`. This is the classic scatter behavior.

---

## Try It

- Change Blinky's `scatterTarget` to `{ x: 14, y: 14 }` (center of maze) and watch him try to reach it.
- Set all `releaseTimer` values to `0` so all ghosts start active immediately.
- Change `GHOST_SPEED` to `2` for slow ghosts, or `8` for terrifyingly fast ones.

---

## Challenges

**Easy:**
- Change Clyde's color from orange to purple.
- Make all ghosts start active (no release timer).

**Medium:**
- Draw a dotted line from each ghost to its scatter target so you can visualize the targeting.
- Add a speed boost for ghosts when they are in the tunnel (slow them down to 40% speed, matching the original game).

**Hard:**
- Implement a "ghost pen" animation where ghosts bob up and down inside the house while waiting to be released.
- Add a "no-reverse zone" near the tunnel entrance where ghosts are forced to continue straight, matching the original game's restricted tiles.

---

## What You Learned

- Staggered ghost release with countdown timers
- Greedy target-chasing AI: at each intersection, pick the direction closest to the target
- Ghost direction priority for tie-breaking (up > left > down > right)
- No-reverse constraint that prevents ghosts from simply reversing direction
- Scatter targets outside the maze to create corner-patrol loops
- Ghost rendering with directional eye pupils

**Next:** Give each ghost its own unique chase AI behavior.
