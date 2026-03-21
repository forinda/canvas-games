# Step 6: Power Pellets & Frightened Mode

**Goal:** Power pellets make ghosts turn blue and run away. Pac-Man can eat frightened ghosts for escalating bonus points. Eaten ghosts return to the ghost house as floating eyes.

**Time:** ~15 minutes

---

## What You'll Build

The hunter becomes the hunted:
- **Frightened mode**: eating a power pellet turns all active ghosts blue for 8 seconds
- **Ghost eating**: Pac-Man eats frightened ghosts for 200, 400, 800, 1600 points (escalating per power pellet)
- **Eaten state**: eaten ghosts become a pair of floating eyes that speed back to the ghost house
- **Ghost respawn**: eaten ghosts regenerate at their home position inside the house
- **Flashing warning**: ghosts flash white in the last 2 seconds of frightened mode
- **Random targeting**: frightened ghosts move randomly instead of chasing or scattering

---

## Concepts

- **State Layering**: Frightened mode overlays on top of scatter/chase. When frightened ends, ghosts revert to whichever global mode is active. The scatter/chase timer is frozen during fright.
- **Escalating Score**: A counter (`frightenedGhostsEaten`) resets to 0 when a power pellet is eaten. Each ghost eaten during that pellet's duration indexes into `[200, 400, 800, 1600]`. Eating all four in one pellet yields 3,000 bonus points.
- **Eaten Ghost Speed**: Eaten ghosts move at `GHOST_EATEN_SPEED` (10 cells/sec) -- much faster than normal -- so they return home quickly.
- **Direction Reversal**: When frightened mode activates, all active non-eaten ghosts immediately reverse direction. This gives the player a head start in chasing them.

---

## Code

### 1. Update PlayerSystem for Power Pellet Activation

**File:** `src/contexts/canvas2d/games/pacman/systems/PlayerSystem.ts`

When Pac-Man eats a power pellet, set the frightened timer and reverse all active ghosts.

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

    // Try queued direction
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

    this.snapToGrid(pac);

    // Eat dots / power pellets
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

        // Activate frightened mode
        state.frightenedTimer = FRIGHTENED_DURATION;
        state.frightenedGhostsEaten = 0;

        // Set all active ghosts to frightened and reverse them
        for (const ghost of state.ghosts) {
          if (ghost.active && !ghost.eaten) {
            ghost.mode = 'frightened';
            ghost.dir = this.reverseDir(ghost.dir);
          }
        }
      }

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

  private reverseDir(dir: Direction): Direction {
    switch (dir) {
      case 'up':    return 'down';
      case 'down':  return 'up';
      case 'left':  return 'right';
      case 'right': return 'left';
      default:      return dir;
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
- When a power pellet is consumed, `frightenedTimer` is set to 8 seconds and `frightenedGhostsEaten` resets to 0.
- Every active, non-eaten ghost switches to `'frightened'` mode and immediately reverses direction. The reversal is critical -- without it, a ghost heading straight at Pac-Man would still be heading at you when it turns blue, which feels unfair.
- If Pac-Man eats a second power pellet while frightened mode is already active, the timer resets to 8 seconds and `frightenedGhostsEaten` resets. This is the same behavior as the original game.

---

### 2. Update GhostSystem for Frightened Mode and Eaten State

**File:** `src/contexts/canvas2d/games/pacman/systems/GhostSystem.ts`

Add frightened timer countdown, frightened random targeting, eaten ghost speed, and home-return detection.

```typescript
import type { PacManState, Ghost, Direction, Position } from '../types';
import {
  GHOST_SPEED,
  GHOST_FRIGHTENED_SPEED,
  GHOST_EATEN_SPEED,
  MODE_DURATIONS,
} from '../types';

const DIRECTIONS: Direction[] = ['up', 'left', 'down', 'right'];

export class GhostSystem {
  update(state: PacManState, dt: number): void {
    if (state.paused || state.gameOver || !state.started || state.won) return;

    this.updateModeTimers(state, dt);
    this.updateFrightenedTimer(state, dt);

    for (const ghost of state.ghosts) {
      this.updateGhostRelease(ghost, state, dt);
      if (!ghost.active) continue;
      this.moveGhost(ghost, state, dt);
    }
  }

  private updateModeTimers(state: PacManState, dt: number): void {
    if (state.frightenedTimer > 0) return;

    state.modeTimer += dt;
    const duration = MODE_DURATIONS[state.modeIndex] ?? Infinity;

    if (state.modeTimer >= duration) {
      state.modeTimer = 0;
      state.modeIndex = Math.min(state.modeIndex + 1, MODE_DURATIONS.length - 1);
      state.globalMode = state.modeIndex % 2 === 0 ? 'scatter' : 'chase';

      for (const ghost of state.ghosts) {
        if (ghost.mode !== 'frightened' && !ghost.eaten) {
          ghost.mode = state.globalMode;
          ghost.dir = this.reverseDir(ghost.dir);
        }
      }
    }
  }

  private updateFrightenedTimer(state: PacManState, dt: number): void {
    if (state.frightenedTimer <= 0) return;

    state.frightenedTimer -= dt;
    if (state.frightenedTimer <= 0) {
      state.frightenedTimer = 0;
      // Revert all frightened ghosts to the current global mode
      for (const ghost of state.ghosts) {
        if (ghost.mode === 'frightened') {
          ghost.mode = state.globalMode;
        }
      }
    }
  }

  private updateGhostRelease(ghost: Ghost, state: PacManState, dt: number): void {
    if (ghost.active) return;
    ghost.releaseTimer -= dt;
    if (ghost.releaseTimer <= 0) {
      ghost.active = true;
      ghost.pos = { x: 13.5, y: 11 };
      ghost.dir = 'left';
      ghost.mode = state.frightenedTimer > 0 ? 'frightened' : state.globalMode;
    }
  }

  private moveGhost(ghost: Ghost, state: PacManState, dt: number): void {
    // Speed depends on ghost state
    let speed: number;
    if (ghost.eaten) {
      speed = GHOST_EATEN_SPEED;
    } else if (ghost.mode === 'frightened') {
      speed = GHOST_FRIGHTENED_SPEED;
    } else {
      speed = GHOST_SPEED;
    }

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

      // If eaten and back at home, respawn
      if (ghost.eaten) {
        if (Math.abs(cx - ghost.homePos.x) < 1 && Math.abs(cy - ghost.homePos.y) < 1) {
          ghost.eaten = false;
          ghost.mode = state.frightenedTimer > 0 ? 'frightened' : state.globalMode;
        }
      }

      const target = this.getTarget(ghost, state);
      ghost.dir = this.chooseBestDirection(ghost, state, target);
    }
  }

  private getTarget(ghost: Ghost, state: PacManState): Position {
    // Eaten ghosts head to the ghost house entrance
    if (ghost.eaten) {
      return { x: 13, y: 14 };
    }

    // Frightened ghosts move randomly
    if (ghost.mode === 'frightened') {
      return {
        x: Math.floor(Math.random() * state.gridWidth),
        y: Math.floor(Math.random() * state.gridHeight),
      };
    }

    // Scatter mode
    if (ghost.mode === 'scatter') {
      return ghost.scatterTarget;
    }

    // Chase mode -- unique per ghost
    const pac = state.pacman;
    const px = Math.round(pac.pos.x);
    const py = Math.round(pac.pos.y);

    switch (ghost.name) {
      case 'blinky':
        return { x: px, y: py };

      case 'pinky': {
        const d = this.dirToDelta(pac.dir);
        return { x: px + d.x * 4, y: py + d.y * 4 };
      }

      case 'inky': {
        const d2 = this.dirToDelta(pac.dir);
        const ahead = { x: px + d2.x * 2, y: py + d2.y * 2 };
        const blinky = state.ghosts.find(g => g.name === 'blinky')!;
        const bx = Math.round(blinky.pos.x);
        const by = Math.round(blinky.pos.y);
        return {
          x: ahead.x + (ahead.x - bx),
          y: ahead.y + (ahead.y - by),
        };
      }

      case 'clyde': {
        const dist = Math.sqrt(
          (ghost.pos.x - px) ** 2 + (ghost.pos.y - py) ** 2,
        );
        if (dist > 8) return { x: px, y: py };
        return ghost.scatterTarget;
      }

      default:
        return { x: px, y: py };
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
      if (dir === reverse) continue;

      const d = this.dirToDelta(dir);
      const nx = cx + d.x;
      const ny = cy + d.y;

      if (!this.canGhostEnter(state, nx, ny, ghost.eaten)) continue;

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
    if (x < 0 || x >= state.gridWidth) return true;
    if (y < 0 || y >= state.gridHeight) return false;

    const cell = state.grid[y][x];
    if (cell.type === 'wall') return false;
    if (cell.type === 'door') return eaten;
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
- **`updateFrightenedTimer`**: Counts down `frightenedTimer`. When it reaches zero, all ghosts still in `'frightened'` mode revert to `state.globalMode`. This ensures they resume their scatter/chase behavior seamlessly.
- **Speed selection**: Eaten ghosts move at 10 cells/sec (double normal speed), frightened ghosts at 2.5 cells/sec (half speed), normal ghosts at 5 cells/sec. The speed difference makes frightened ghosts feel sluggish and catchable, while eaten ghosts zip home.
- **`getTarget` for eaten ghosts**: Target `(13, 14)` -- the ghost house entrance. Once within 1 cell of `homePos`, the ghost respawns: `eaten` becomes false and mode reverts.
- **`getTarget` for frightened ghosts**: A random tile each intersection. This creates the erratic zig-zag movement that makes frightened ghosts look panicked.
- **`canGhostEnter` with `ghost.eaten`**: Eaten ghosts can pass through the ghost door to re-enter the house. Non-eaten ghosts cannot.

---

### 3. Create the Collision System

**File:** `src/contexts/canvas2d/games/pacman/systems/CollisionSystem.ts`

Detect when Pac-Man touches a ghost. If the ghost is frightened, eat it. Otherwise, Pac-Man dies.

```typescript
import type { PacManState } from '../types';
import { GHOST_EAT_SCORES } from '../types';

export class CollisionSystem {
  private onDeath: () => void;

  constructor(onDeath: () => void) {
    this.onDeath = onDeath;
  }

  update(state: PacManState, _dt: number): void {
    if (state.paused || state.gameOver || !state.started || state.won) return;

    const px = state.pacman.pos.x;
    const py = state.pacman.pos.y;

    for (const ghost of state.ghosts) {
      if (!ghost.active || ghost.eaten) continue;

      const dx = ghost.pos.x - px;
      const dy = ghost.pos.y - py;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 0.8) {
        if (ghost.mode === 'frightened') {
          // Eat the ghost
          ghost.eaten = true;
          ghost.mode = 'chase'; // Will be overridden when it reaches home

          const scoreIdx = Math.min(
            state.frightenedGhostsEaten,
            GHOST_EAT_SCORES.length - 1,
          );
          state.score += GHOST_EAT_SCORES[scoreIdx];
          state.frightenedGhostsEaten++;
        } else {
          // Pac-Man dies
          this.onDeath();
          return;
        }
      }
    }
  }
}
```

**What's happening:**
- We check the Euclidean distance between Pac-Man and each active, non-eaten ghost. A threshold of 0.8 cells means they need to be nearly overlapping.
- **Frightened ghost**: Set `eaten = true`, award escalating points (`200 -> 400 -> 800 -> 1600`), and increment the counter. The ghost immediately switches to eaten behavior (eyes only, fast return home).
- **Normal/chase/scatter ghost**: Call `onDeath()`. The engine will handle losing a life or ending the game. We `return` immediately because the death resets positions -- no point checking more ghosts.
- Eaten ghosts are skipped (`ghost.eaten` check at the top) -- you cannot die from touching floating eyes.

---

### 4. Update the Engine

**File:** `src/contexts/canvas2d/games/pacman/PacManEngine.ts`

Add the `CollisionSystem` and death handling. When Pac-Man dies, lose a life and reset positions (or game over if no lives remain).

```typescript
import type { PacManState, Cell, Ghost } from './types';
import { MAZE_COLS, MAZE_ROWS, INITIAL_LIVES } from './types';
import { MAZE_DATA } from './data/maze';
import { InputSystem } from './systems/InputSystem';
import { PlayerSystem } from './systems/PlayerSystem';
import { GhostSystem } from './systems/GhostSystem';
import { CollisionSystem } from './systems/CollisionSystem';
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
  private collisionSystem: CollisionSystem;
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
    this.collisionSystem = new CollisionSystem(() => this.handleDeath());
    this.inputSystem = new InputSystem(this.state, () => this.handleRestart());
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
      this.collisionSystem.update(this.state, dt);
    }

    if (this.state.score > this.state.highScore) {
      this.state.highScore = this.state.score;
      try { localStorage.setItem(HS_KEY, String(this.state.highScore)); } catch { /* noop */ }
    }

    this.gameRenderer.render(this.ctx, this.state);
    this.hudRenderer.render(this.ctx, this.state);

    this.rafId = requestAnimationFrame(() => this.loop());
  }

  private handleDeath(): void {
    this.state.lives--;
    if (this.state.lives <= 0) {
      this.state.gameOver = true;
    } else {
      this.resetPositions();
    }
  }

  private handleRestart(): void {
    if (this.state.won) {
      // Next level: keep score and lives
      const nextLevel = this.state.level + 1;
      const score = this.state.score;
      const lives = this.state.lives;
      const hs = this.state.highScore;
      const canvas = this.ctx.canvas;
      this.state = this.buildInitialState(canvas);
      this.state.level = nextLevel;
      this.state.score = score;
      this.state.lives = lives;
      this.state.highScore = hs;
      this.state.started = true;
    } else {
      // Full reset
      const hs = this.state.highScore;
      const canvas = this.ctx.canvas;
      this.state = this.buildInitialState(canvas);
      this.state.highScore = hs;
      this.state.started = true;
    }
    // Rebuild systems with new state
    this.inputSystem.detach();
    this.inputSystem = new InputSystem(this.state, () => this.handleRestart());
    this.inputSystem.attach();
    this.collisionSystem = new CollisionSystem(() => this.handleDeath());
  }

  private resetPositions(): void {
    const s = this.state;
    let px = 13.5, py = 23;
    for (let y = 0; y < MAZE_ROWS; y++) {
      const line = MAZE_DATA[y] || '';
      for (let x = 0; x < MAZE_COLS; x++) {
        if (line[x] === 'P') { px = x; py = y; }
      }
    }

    s.pacman.pos = { x: px, y: py };
    s.pacman.dir = 'none';
    s.pacman.nextDir = 'none';

    // Reset Blinky to outside the house
    s.ghosts[0].pos = { x: 13.5, y: 11 };
    s.ghosts[0].dir = 'left';
    s.ghosts[0].active = true;
    s.ghosts[0].eaten = false;
    s.ghosts[0].mode = 'scatter';

    // Reset other ghosts to inside the house
    for (let i = 1; i < s.ghosts.length; i++) {
      const g = s.ghosts[i];
      g.pos = { ...g.homePos };
      g.dir = 'up';
      g.active = false;
      g.eaten = false;
      g.releaseTimer = 3 + i * 3;
      g.mode = 'scatter';
    }

    s.frightenedTimer = 0;
    s.modeTimer = 0;
    s.modeIndex = 0;
    s.globalMode = 'scatter';
  }

  // --- buildInitialState, computeCellSize, updateCellSize same as Step 4 ---

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
        name: 'blinky', pos: { x: 13.5, y: 11 }, dir: 'left', mode: 'scatter',
        scatterTarget: { x: MAZE_COLS - 3, y: -3 },
        homePos: ghostStarts[0] ?? { x: 13, y: 14 },
        color: '#ff0000', active: true, releaseTimer: 0, eaten: false,
      },
      {
        name: 'pinky', pos: { ...(ghostStarts[1] ?? { x: 13, y: 14 }) }, dir: 'up', mode: 'scatter',
        scatterTarget: { x: 2, y: -3 },
        homePos: ghostStarts[1] ?? { x: 13, y: 14 },
        color: '#ffb8ff', active: false, releaseTimer: 3, eaten: false,
      },
      {
        name: 'inky', pos: { ...(ghostStarts[2] ?? { x: 11, y: 14 }) }, dir: 'up', mode: 'scatter',
        scatterTarget: { x: MAZE_COLS - 1, y: MAZE_ROWS + 1 },
        homePos: ghostStarts[2] ?? { x: 11, y: 14 },
        color: '#00ffff', active: false, releaseTimer: 7, eaten: false,
      },
      {
        name: 'clyde', pos: { ...(ghostStarts[3] ?? { x: 15, y: 14 }) }, dir: 'up', mode: 'scatter',
        scatterTarget: { x: 0, y: MAZE_ROWS + 1 },
        homePos: ghostStarts[3] ?? { x: 15, y: 14 },
        color: '#ffb852', active: false, releaseTimer: 12, eaten: false,
      },
    ];

    const cs = this.computeCellSize(canvas.width, canvas.height);
    const offsetX = (canvas.width - MAZE_COLS * cs) / 2;
    const offsetY = (canvas.height - MAZE_ROWS * cs) / 2 + 10;

    return {
      grid, gridWidth: MAZE_COLS, gridHeight: MAZE_ROWS,
      pacman: { pos: { ...playerStart }, dir: 'none', nextDir: 'none', mouthAngle: 0.4, mouthOpening: true },
      ghosts, score: 0, highScore: hs, lives: INITIAL_LIVES, level: 1,
      totalDots, dotsEaten: 0, frightenedTimer: 0, frightenedGhostsEaten: 0,
      modeTimer: 0, modeIndex: 0, globalMode: 'scatter',
      gameOver: false, paused: false, started: false, won: false,
      time: 0, cellSize: cs, offsetX, offsetY,
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
- **`handleDeath`**: Decrements lives. If zero remain, `gameOver = true`. Otherwise, `resetPositions` puts Pac-Man and all ghosts back to their starting locations while preserving the score and remaining dots.
- **`resetPositions`**: Pac-Man goes back to the `P` tile. Blinky resets to outside the house. Other ghosts go back inside with fresh release timers. The mode cycle resets to scatter.
- **`handleRestart`**: Called when the player presses Space on game over or win. On win, it advances the level while keeping score and lives. On game over, it does a full reset. Both paths rebuild the `InputSystem` and `CollisionSystem` with the new state reference.

---

### 5. Update Ghost Rendering for Frightened and Eaten States

**File:** `src/contexts/canvas2d/games/pacman/renderers/GameRenderer.ts`

Update `renderGhosts` to handle frightened (blue) and eaten (eyes only) ghosts.

Replace the `renderGhosts` method:

```typescript
  private renderGhosts(
    ctx: CanvasRenderingContext2D,
    state: PacManState,
    cs: number,
    ox: number,
    oy: number,
  ): void {
    for (const ghost of state.ghosts) {
      if (!ghost.active && !ghost.eaten) continue;

      const cx = ox + ghost.pos.x * cs + cs / 2;
      const cy = oy + ghost.pos.y * cs + cs / 2;
      const r = cs * 0.45;

      // Eaten ghost: just eyes
      if (ghost.eaten) {
        this.drawGhostEyes(ctx, cx, cy, r, ghost.dir);
        continue;
      }

      // Body color: blue when frightened, flashing white near end
      if (ghost.mode === 'frightened') {
        const flashing = state.frightenedTimer < 2 &&
          Math.floor(state.time * 8) % 2 === 0;
        ctx.fillStyle = flashing ? '#fff' : '#2222ff';
      } else {
        ctx.fillStyle = ghost.color;
      }

      // Ghost body (circle for now)
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();

      // Eyes
      if (ghost.mode === 'frightened') {
        // Frightened face: small white dots for eyes, zigzag mouth
        const eyeR = r * 0.15;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(cx - r * 0.3, cy - r * 0.15, eyeR, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(cx + r * 0.3, cy - r * 0.15, eyeR, 0, Math.PI * 2);
        ctx.fill();

        // Zigzag mouth
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cx - r * 0.4, cy + r * 0.25);
        for (let i = 0; i < 4; i++) {
          const mx = cx - r * 0.4 + (r * 0.8 / 4) * (i + 0.5);
          const my = cy + r * 0.25 + (i % 2 === 0 ? -r * 0.1 : r * 0.1);
          ctx.lineTo(mx, my);
        }
        ctx.lineTo(cx + r * 0.4, cy + r * 0.25);
        ctx.stroke();
      } else {
        this.drawGhostEyes(ctx, cx, cy, r, ghost.dir);
      }
    }
  }

  private drawGhostEyes(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    r: number,
    dir: Direction,
  ): void {
    const eyeR = r * 0.22;
    const pupilR = r * 0.11;
    const eyeOffX = r * 0.3;
    const eyeY = cy - r * 0.15;

    let pdx = 0, pdy = 0;
    switch (dir) {
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
```

**What's happening:**
- **Eaten ghosts**: Skip the body, only draw `drawGhostEyes`. The floating eyes rushing back to the ghost house is one of Pac-Man's most iconic visuals.
- **Frightened ghosts**: Draw a blue circle with a simple scared face -- two white dot eyes and a zigzag mouth. In the last 2 seconds (`frightenedTimer < 2`), the ghost alternates between blue and white at 8Hz (`Math.floor(state.time * 8) % 2`), warning the player that frightened mode is ending.
- **Normal ghosts**: Same as Step 4 -- colored circle with directional eyes.

You will also need to add the `Direction` import at the top of the file:

```typescript
import type { PacManState, Direction } from '../types';
```

---

## Test It

1. **Run:** `npm run dev`
2. **Open:** the Pac-Man game
3. **Observe:**
   - Eat a power pellet (large pulsing dot near a corner). All active ghosts turn blue.
   - Blue ghosts move noticeably slower than normal.
   - Chase a blue ghost and overlap with it. The ghost vanishes into a pair of eyes, and your score jumps by 200.
   - Eat a second ghost during the same pellet for 400 points, then 800, then 1600.
   - The floating eyes speed toward the ghost house and disappear inside. Shortly after, the ghost reappears at the house exit in its normal color.
   - In the last 2 seconds, blue ghosts flash white rapidly. When the flashing stops, they return to their normal color and resume chasing.
   - Touch a non-frightened ghost. Pac-Man dies, positions reset, but your score and eaten dots are preserved. You lose one life.
   - Lose all 3 lives. "GAME OVER" appears. Press Space to restart.

**Score test:** Eat all 4 ghosts on a single power pellet. You should earn 200 + 400 + 800 + 1600 = 3,000 bonus points. That is the highest-value single move in the game.

---

## Try It

- Change `FRIGHTENED_DURATION` to `20` for a long hunting window.
- Change `GHOST_FRIGHTENED_SPEED` to `1` for nearly frozen ghosts.
- Set `GHOST_EATEN_SPEED` to `2` so eaten ghosts crawl home slowly.

---

## Challenges

**Easy:**
- Change the frightened ghost color from blue to green.
- Make the flashing start 4 seconds before the end instead of 2.

**Medium:**
- Show a floating score text (+200, +400, etc.) at the position where a ghost was eaten, fading out over 1 second.
- Add a brief screen freeze (200ms) when a ghost is eaten, matching the original arcade game.

**Hard:**
- Implement "eyes pathing" -- instead of just heading to `(13, 14)`, make eaten ghosts path to the ghost house door tile-by-tile using the same greedy algorithm but with the door as the target, then animate them sinking down into the house.
- Add a chain combo display showing "x2", "x3", "x4" as you eat successive ghosts.

---

## What You Learned

- Frightened mode as a state overlay on top of scatter/chase
- Escalating score rewards with an index counter
- Three-speed ghost system: normal, frightened (slow), eaten (fast)
- Ghost respawn at home position with state recovery
- Visual state feedback: blue/white flashing, eyes-only rendering
- Death handling with life count and position reset
- Game restart with state rebuild

**Next:** Lives display, level progression, animated Pac-Man mouth, full ghost rendering, and final polish.
