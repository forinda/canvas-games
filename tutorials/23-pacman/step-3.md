# Step 3: Dot Eating & Score

**Goal:** Eat dots and power pellets on contact, track score, and implement tunnel wrapping.

**Time:** ~15 minutes

---

## What You'll Build

Core Pac-Man gameplay:
- **Dot eating**: dots disappear when Pac-Man passes through them
- **Score tracking**: 10 points per dot, 50 per power pellet
- **Win condition**: all dots eaten triggers a win state
- **Tunnel wrapping**: Pac-Man exits the left edge and appears on the right (and vice versa)
- **HUD display**: score, level, and high score at the top of the screen

---

## Concepts

- **Cell Mutation**: When Pac-Man's rounded position matches a `dot` or `power` cell, change its `type` to `'empty'`. The renderer already skips `empty` cells, so the dot vanishes instantly.
- **Win Detection**: Compare `dotsEaten` to `totalDots`. When equal, set `state.won = true`.
- **Tunnel Wrapping**: The maze has open spaces on rows 14 (the horizontal middle). When `pos.x` goes below -0.5, wrap to `gridWidth - 0.5`. This creates the classic wrap-around tunnel.
- **Persistent High Score**: Store the best score in `localStorage` and display it alongside the current score.

---

## Code

### 1. Add Dot Eating to PlayerSystem

**File:** `src/games/pacman/systems/PlayerSystem.ts`

Add dot/power pellet collection at the end of the `update` method. The `canMove`, `dirToDelta`, `snapToGrid` methods are unchanged from Step 2.

```typescript
import type { PacManState, Direction, Position } from '../types';
import {
  BASE_SPEED,
  DOT_SCORE,
  POWER_SCORE,
  FRIGHTENED_DURATION,
} from '../types';

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

    // --- NEW: Eat dots / power pellets at current cell ---
    const cx = Math.round(pac.pos.x);
    const cy = Math.round(pac.pos.y);

    if (cx >= 0 && cx < state.gridWidth && cy >= 0 && cy < state.gridHeight) {
      const cell = state.grid[cy][cx];

      if (cell.type === 'dot') {
        cell.type = 'empty';
        state.score += DOT_SCORE;
        state.dotsEaten++;
      } else if (cell.type === 'power') {
        cell.type = 'empty';
        state.score += POWER_SCORE;
        state.dotsEaten++;
        // Power pellet effects will be added in Step 6
      }

      // Check win condition
      if (state.dotsEaten >= state.totalDots) {
        state.won = true;
      }
    }
  }

  private canMove(state: PacManState, pos: Position, dir: Direction): boolean {
    const delta = this.dirToDelta(dir);
    const nextX = Math.round(pos.x + delta.x * 0.55);
    const nextY = Math.round(pos.y + delta.y * 0.55);

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
- After movement, we round Pac-Man's position to the nearest grid cell (`cx`, `cy`) and check what cell type is there.
- If it is a `dot`, we mutate the cell to `'empty'`, add 10 points, and increment `dotsEaten`.
- If it is a `power` pellet, same thing but 50 points. The frightened-ghost effect comes in Step 6.
- The bounds check (`cx >= 0 && cx < gridWidth`) prevents array-out-of-bounds errors when Pac-Man is in the tunnel.
- When `dotsEaten >= totalDots`, the level is complete. We set `state.won = true` and the game loop will stop updating.

---

### 2. Create the HUD Renderer

**File:** `src/games/pacman/renderers/HUDRenderer.ts`

Display score, level, high score, and game state overlays.

```typescript
import type { PacManState } from '../types';

export class HUDRenderer {
  render(ctx: CanvasRenderingContext2D, state: PacManState): void {
    const W = ctx.canvas.width;

    // Score bar at top
    ctx.font = 'bold 16px monospace';
    ctx.textBaseline = 'top';

    ctx.textAlign = 'left';
    ctx.fillStyle = '#fff';
    ctx.fillText(`SCORE: ${state.score}`, 12, 8);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffeb3b';
    ctx.fillText(`LEVEL ${state.level}`, W / 2, 8);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#fff';
    ctx.fillText(`HIGH: ${state.highScore}`, W - 12, 8);

    // Overlays
    if (!state.started) {
      this.renderOverlay(ctx, 'PAC-MAN', 'Press any arrow key to start', '#ffeb3b');
    } else if (state.paused) {
      this.renderOverlay(ctx, 'PAUSED', 'Press P to resume', '#ffeb3b');
    } else if (state.gameOver) {
      this.renderOverlay(ctx, 'GAME OVER', 'Press SPACE to restart', '#ff4444');
    } else if (state.won) {
      this.renderOverlay(ctx, 'YOU WIN!', 'Press SPACE for next level', '#00ff00');
    }
  }

  private renderOverlay(
    ctx: CanvasRenderingContext2D,
    title: string,
    subtitle: string,
    color: string,
  ): void {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, W, H);

    ctx.font = 'bold 36px monospace';
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(title, W / 2, H / 2 - 20);

    ctx.font = '16px monospace';
    ctx.fillStyle = '#ccc';
    ctx.fillText(subtitle, W / 2, H / 2 + 20);
  }
}
```

**What's happening:**
- The HUD draws three text items across the top: score (left), level (center), high score (right).
- When the game is in a non-playing state (`!started`, `paused`, `gameOver`, `won`), a semi-transparent overlay dims the screen and shows a message with instructions.
- The overlay uses `rgba(0,0,0,0.6)` so the maze is still visible behind the text, giving context to the player.

---

### 3. Update the Engine

**File:** `src/games/pacman/PacManEngine.ts`

Add the `HUDRenderer` and high-score persistence. Also add Space key handling for restart and `P` for pause (already in InputSystem).

```typescript
import type { PacManState, Cell } from './types';
import { MAZE_COLS, MAZE_ROWS, INITIAL_LIVES } from './types';
import { MAZE_DATA } from './data/maze';
import { InputSystem } from './systems/InputSystem';
import { PlayerSystem } from './systems/PlayerSystem';
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
  private gameRenderer: GameRenderer;
  private hudRenderer: HUDRenderer;
  private resizeHandler: () => void;

  constructor(canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    this.state = this.buildInitialState(canvas);

    this.playerSystem = new PlayerSystem();
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
    }

    // Update high score
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

    let hs = 0;
    try { hs = parseInt(localStorage.getItem(HS_KEY) ?? '0', 10) || 0; } catch { /* noop */ }

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
- The high score is loaded from `localStorage` when building initial state and saved whenever the current score exceeds it. The `try/catch` handles environments where `localStorage` is unavailable (incognito mode, some iframes).
- The game loop now checks all four stop conditions (`started`, `paused`, `gameOver`, `won`) before running physics.
- We render `hudRenderer` after `gameRenderer` so the HUD text draws on top of the maze.
- When all dots are eaten, `playerSystem` sets `state.won = true`. The HUD then shows "YOU WIN!" with instructions to press Space.

---

### 4. Update the Input System

**File:** `src/games/pacman/systems/InputSystem.ts`

Add Space key to restart after game over or win.

```typescript
import type { PacManState, Direction } from '../types';

export class InputSystem {
  private state: PacManState;
  private keyHandler: (e: KeyboardEvent) => void;
  private onReset: (() => void) | null;

  constructor(state: PacManState, onReset?: () => void) {
    this.state = state;
    this.onReset = onReset ?? null;
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
      ArrowUp: 'up', ArrowDown: 'down',
      ArrowLeft: 'left', ArrowRight: 'right',
      w: 'up', W: 'up', s: 'down', S: 'down',
      a: 'left', A: 'left', d: 'right', D: 'right',
    };

    if (dirMap[key]) {
      e.preventDefault();
      if (!this.state.started) this.state.started = true;
      this.state.pacman.nextDir = dirMap[key];
      return;
    }

    switch (key) {
      case 'p':
      case 'P':
        if (this.state.started && !this.state.gameOver && !this.state.won) {
          this.state.paused = !this.state.paused;
        }
        break;
      case ' ':
        e.preventDefault();
        if ((this.state.gameOver || this.state.won) && this.onReset) {
          this.onReset();
        } else if (!this.state.started) {
          this.state.started = true;
        }
        break;
    }
  }
}
```

**What's happening:**
- The `onReset` callback is optional. When the game is over or won, pressing Space calls it. The engine will provide a function that rebuilds the state for the next round.
- Space also starts the game if it has not started yet, as an alternative to arrow keys.

---

## Test It

1. **Run:** `npm run dev`
2. **Open:** the Pac-Man game
3. **Observe:**
   - Press an arrow key to start. The "PAC-MAN" overlay disappears.
   - Pac-Man eats dots as he passes through them -- they vanish immediately.
   - The score counter at the top-left increases: +10 for dots, +50 for the large pulsing power pellets.
   - Navigate to the tunnel on row 14 (the horizontal corridor that exits the maze on both sides). Move left off the screen -- Pac-Man reappears on the right side.
   - Press P to pause. The maze dims and "PAUSED" appears. Press P again to resume.
   - Eat every dot and power pellet. "YOU WIN!" appears.
   - The high score persists across page reloads.

**Count the dots.** The maze has 240 regular dots and 4 power pellets = 244 total. At 10 and 50 points respectively, a perfect clear scores 2,600 points (before any ghost bonuses).

---

## Try It

- Change `DOT_SCORE` to `100` and watch the score fly.
- Set `totalDots` to `5` in `buildInitialState` and eat 5 dots to trigger the win condition early.
- Comment out the tunnel-wrap lines in `PlayerSystem` and try moving through the tunnel -- Pac-Man gets stuck at the edge.

---

## Challenges

**Easy:**
- Change the HUD font from monospace to a different font family.
- Show `dotsEaten` / `totalDots` in the HUD (e.g., "DOTS: 42/244").

**Medium:**
- Add a brief "flash" effect when Pac-Man eats a power pellet -- briefly tint the screen or flash the pellet cell white.
- Show floating "+10" text that rises and fades when a dot is eaten.

**Hard:**
- Add a fruit bonus that appears at the center of the maze after 70 and 170 dots are eaten, worth 100 points, and disappears after 10 seconds.
- Implement a combo system: eating dots within 0.5 seconds of each other increases a multiplier.

---

## What You Learned

- Cell mutation for consumable items (`cell.type = 'empty'`)
- Score tracking with constants for different item values
- Win condition based on counting consumed items
- Tunnel wrapping with position thresholds
- `localStorage` for persistent high scores with error handling
- HUD rendering with overlays for different game states

**Next:** Add four ghosts with basic movement and scatter mode.
