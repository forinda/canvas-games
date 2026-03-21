# Step 4: Fog of War & Goal

**Goal:** Reveal only cells near the player, hide the rest under fog, and add win/lose/pause overlays.

**Time:** ~15 minutes

---

## What You'll Build

- **Fog of war** that hides unexplored cells in darkness
- **Persistent reveal** so cells stay visible after you have been near them
- **Brightness falloff** where cells closer to the player are brighter
- **Timer countdown** that ends the game when it reaches zero
- **HUD renderer** showing time, level, score, and state overlays (start, pause, win, lose)

---

## Concepts

- **Reveal Radius**: Each time the player moves, all cells within a radius (default 3) are added to a `revealed` Set. The Set stores `"x,y"` string keys for fast lookup. Once revealed, a cell stays visible forever -- you are mapping the maze as you explore.
- **Active vs. Explored Brightness**: Cells within the current reveal radius get a bright floor that fades with distance. Previously revealed cells that are now far away get a dim floor (`brightness = 0.15`). Unrevealed cells are near-black (`#0d0d1a`).
- **Euclidean Distance**: We use `Math.sqrt(dx*dx + dy*dy)` to compute distance from the player. Cells within the radius squared are revealed; the exact distance controls brightness.
- **Timer System**: A simple countdown that subtracts `dt / 1000` (converting milliseconds to seconds) from `state.timeLeft` each frame. When it hits zero, `state.lost = true`.
- **State Overlays**: The HUD renderer draws semi-transparent overlays for start, pause, win, and lose screens using the state flags.

---

## Code

### 4.1 Add Reveal Logic to PlayerSystem

**File:** `src/games/maze-runner/systems/PlayerSystem.ts`

Add a `revealAround()` method that marks nearby cells as revealed.

```typescript
import type { MazeState } from '../types';
import type { InputSystem } from './InputSystem';

/**
 * Handles grid-based player movement with wall collision and fog-of-war reveal.
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

      // Reveal cells around new position
      this.revealAround(state);

      // Check win
      if (player.x === state.exit.x && player.y === state.exit.y) {
        state.won = true;
      }
    }
  }

  /** Mark cells within reveal radius as permanently revealed */
  revealAround(state: MazeState): void {
    const { player, revealRadius, mazeW, mazeH, revealed } = state;

    for (let dy = -revealRadius; dy <= revealRadius; dy++) {
      for (let dx = -revealRadius; dx <= revealRadius; dx++) {
        const cx = player.x + dx;
        const cy = player.y + dy;

        if (cx >= 0 && cx < mazeW && cy >= 0 && cy < mazeH) {
          if (dx * dx + dy * dy <= revealRadius * revealRadius) {
            revealed.add(`${cx},${cy}`);
          }
        }
      }
    }
  }
}
```

**What's happening:**
- `revealAround()` iterates over a square area around the player from `-revealRadius` to `+revealRadius` in both axes.
- For each cell in that square, it computes `dx*dx + dy*dy` and compares to `revealRadius*revealRadius`. This gives a circular reveal area (Euclidean distance) rather than a square one.
- Each qualifying cell's `"x,y"` key is added to the `revealed` Set. Since Sets ignore duplicates, re-revealing already-seen cells is a no-op.
- The method is called after every successful move, and also once on level start (from the engine) so the player's starting area is visible immediately.

---

### 4.2 Create the Timer System

**File:** `src/games/maze-runner/systems/TimerSystem.ts`

A simple countdown timer.

```typescript
import type { MazeState } from '../types';

/**
 * Countdown timer. Ticks down each frame; sets state.lost when time runs out.
 */
export class TimerSystem {
  update(state: MazeState, dt: number): void {
    if (state.paused || state.won || state.lost || !state.started) return;

    state.timeLeft -= dt / 1000;

    if (state.timeLeft <= 0) {
      state.timeLeft = 0;
      state.lost = true;
    }
  }
}
```

**What's happening:**
- `dt` is in milliseconds (from `performance.now()`), so we divide by 1000 to get seconds.
- The timer only ticks when the game is actively being played -- not when paused, won, or lost.
- When `timeLeft` hits zero, `state.lost = true` which stops further updates and triggers the lose overlay.

---

### 4.3 Update the Renderer for Fog of War

**File:** `src/games/maze-runner/renderers/MazeRenderer.ts`

Add fog-of-war logic: unrevealed cells are dark, revealed cells have distance-based brightness.

```typescript
import type { MazeState } from '../types';

/**
 * Renders the maze grid: floor tiles, walls, fog of war, exit marker, and player.
 */
export class MazeRenderer {
  render(ctx: CanvasRenderingContext2D, state: MazeState): void {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    // Clear
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, W, H);

    const { grid, mazeW, mazeH, player, exit, revealRadius, revealed } = state;

    // Compute cell size so maze fits on screen with some padding
    const padding = 60;
    const availW = W - padding * 2;
    const availH = H - padding * 2 - 40; // extra room for HUD at top
    const cellSize = Math.floor(Math.min(availW / mazeW, availH / mazeH));

    const offsetX = Math.floor((W - cellSize * mazeW) / 2);
    const offsetY = Math.floor((H - cellSize * mazeH) / 2) + 20;

    // Draw cells
    for (let y = 0; y < mazeH; y++) {
      for (let x = 0; x < mazeW; x++) {
        const px = offsetX + x * cellSize;
        const py = offsetY + y * cellSize;
        const key = `${x},${y}`;
        const isRevealed = revealed.has(key);

        // Distance from player (for live glow)
        const dx = x - player.x;
        const dy = y - player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const inActiveRadius = dist <= revealRadius;

        if (!isRevealed) {
          // Fog -- dark cell
          ctx.fillStyle = '#0d0d1a';
          ctx.fillRect(px, py, cellSize, cellSize);
          continue;
        }

        // Floor with distance-based brightness
        const brightness = inActiveRadius
          ? Math.max(0.25, 1 - dist / (revealRadius + 1))
          : 0.15;
        const floorR = Math.floor(30 * brightness);
        const floorG = Math.floor(40 * brightness);
        const floorB = Math.floor(60 * brightness);

        ctx.fillStyle = `rgb(${floorR},${floorG},${floorB})`;
        ctx.fillRect(px, py, cellSize, cellSize);

        // Exit marker
        if (x === exit.x && y === exit.y) {
          ctx.fillStyle = inActiveRadius ? '#4ade80' : '#2a7a4a';
          ctx.fillRect(px + 2, py + 2, cellSize - 4, cellSize - 4);
          ctx.fillStyle = '#fff';
          ctx.font = `bold ${Math.floor(cellSize * 0.5)}px monospace`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('EXIT', px + cellSize / 2, py + cellSize / 2);
        }

        // Walls
        const cell = grid[y][x];

        ctx.strokeStyle = inActiveRadius ? '#607d8b' : '#3a4a54';
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
- For each cell, we first check `revealed.has(key)`. Unrevealed cells are filled with near-black (`#0d0d1a`) and we `continue` -- no walls, no exit marker, nothing visible.
- For revealed cells, we compute the Euclidean distance from the player. Cells within the active radius get a brightness that fades from 1.0 (at the player) to 0.25 (at the edge). Cells outside the active radius but previously revealed get a dim brightness of 0.15.
- The RGB floor color is computed from the brightness value, giving a natural glow effect around the player.
- Wall color also varies: `#607d8b` for active-radius cells (brighter) and `#3a4a54` for explored-but-distant cells (dimmer).
- The EXIT marker is bright green (`#4ade80`) when in active radius, and a muted green (`#2a7a4a`) when explored but distant.

---

### 4.4 Create the HUD Renderer

**File:** `src/games/maze-runner/renderers/HUDRenderer.ts`

Draws the top bar with timer, level, and score, plus state overlays.

```typescript
import type { MazeState } from '../types';

/**
 * Renders the heads-up display: timer, level, score, and state overlays.
 */
export class HUDRenderer {
  render(ctx: CanvasRenderingContext2D, state: MazeState): void {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    // Top bar background
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, W, 44);

    ctx.textBaseline = 'middle';
    const barY = 22;

    // Timer (left)
    const timeStr = Math.ceil(state.timeLeft).toString();
    const timerColor =
      state.timeLeft <= 10
        ? '#ff4444'
        : state.timeLeft <= 20
          ? '#ffaa00'
          : '#4ade80';

    ctx.font = 'bold 18px monospace';
    ctx.fillStyle = timerColor;
    ctx.textAlign = 'left';
    ctx.fillText(`Time: ${timeStr}s`, 16, barY);

    // Level (center)
    ctx.fillStyle = '#607d8b';
    ctx.textAlign = 'center';
    ctx.fillText(
      `Level ${state.level}  (${state.mazeW}x${state.mazeH})`,
      W / 2,
      barY,
    );

    // Score (right)
    ctx.fillStyle = '#ccc';
    ctx.textAlign = 'right';
    ctx.fillText(`Score: ${state.totalScore}`, W - 16, barY);

    // Overlays
    if (!state.started) {
      this.overlay(
        ctx, W, H,
        '#607d8b',
        'Maze Runner',
        'Press SPACE to start',
      );
    } else if (state.paused) {
      this.overlay(ctx, W, H, '#ffaa00', 'Paused', 'Press P to resume');
    } else if (state.won) {
      this.overlay(
        ctx, W, H,
        '#4ade80',
        `Level ${state.level} Complete!`,
        'Press SPACE for next level',
      );
    } else if (state.lost) {
      this.overlay(
        ctx, W, H,
        '#ff4444',
        "Time's Up!",
        `Final Score: ${state.totalScore}  |  Press SPACE to restart`,
      );
    }
  }

  private overlay(
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
    color: string,
    title: string,
    subtitle: string,
  ): void {
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, W, H);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.font = 'bold 36px monospace';
    ctx.fillStyle = color;
    ctx.fillText(title, W / 2, H / 2 - 24);

    ctx.font = '16px monospace';
    ctx.fillStyle = '#aaa';
    ctx.fillText(subtitle, W / 2, H / 2 + 20);
  }
}
```

**What's happening:**
- The top bar is a 44px semi-transparent strip showing three pieces of info: timer (left, color-coded), level with dimensions (center), and score (right).
- The timer color changes from green to amber at 20 seconds, and red at 10 seconds -- giving the player visual urgency.
- The `overlay()` helper draws a dark semi-transparent background over the entire screen, then a title and subtitle centered on screen. It is used for four states: not yet started, paused, won, and lost.
- Each overlay has a distinct color: blue-grey for start, amber for pause, green for win, red for lose.

---

### 4.5 Update the Engine

**File:** `src/games/maze-runner/MazeEngine.ts`

Wire in the TimerSystem, HUDRenderer, and initial fog reveal.

```typescript
import type { MazeState } from './types';
import {
  BASE_MAZE_W,
  BASE_MAZE_H,
  BASE_TIME,
  REVEAL_RADIUS,
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

    // Initial blank state (not started)
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
      // Next level
      const nextLevel = this.state.level + 1;
      const score =
        this.state.totalScore +
        this.state.level * 100 +
        Math.floor(this.state.timeLeft) * 10;
      this.initLevel(nextLevel, score);
    } else if (this.state.lost) {
      // Full restart
      this.initLevel(1, 0);
    }
  }

  private initLevel(level: number, totalScore: number): void {
    const newState = this.createState(level, totalScore);
    Object.assign(this.state, newState);

    // Generate maze
    this.generator.generate(this.state);

    // Reveal around starting position
    this.playerSystem.revealAround(this.state);
  }

  private createState(level: number, totalScore: number): MazeState {
    const mazeW = BASE_MAZE_W;
    const mazeH = BASE_MAZE_H;

    return {
      grid: [],
      mazeW,
      mazeH,
      player: { x: 0, y: 0 },
      exit: { x: mazeW - 1, y: mazeH - 1 },
      revealRadius: REVEAL_RADIUS,
      revealed: new Set<string>(),
      level,
      timeLeft: BASE_TIME,
      won: false,
      lost: false,
      paused: false,
      started: level > 0 ? true : false,
      totalScore,
    };
  }
}
```

**What's happening:**
- The game loop now calls both `playerSystem.update()` and `timerSystem.update()` each frame.
- After rendering the maze, we render the HUD on top (timer bar and any overlay).
- `handleReset()` handles three cases: first start (Space from the start overlay), next level (Space after winning), and full restart (Space after losing).
- When winning, the score accumulates: `level * 100` base points plus `timeLeft * 10` bonus points for remaining time.
- `initLevel()` calls `playerSystem.revealAround()` after generating the maze so the starting area is visible immediately.
- The state starts with `started: false`, so the start overlay appears first. After pressing Space, `initLevel()` sets `started: true`.

---

## Test It

1. **Run:** `pnpm dev`
2. **Open:** the Maze Runner game in your browser
3. **Observe:**
   - A **"Maze Runner -- Press SPACE to start"** overlay appears
   - Press **Space** and the maze appears, mostly **hidden under fog**
   - Only cells near the player (within 3 cells) are **brightly lit**
   - As you move, previously visited areas stay visible but **dimmed**
   - The **timer counts down** in the top-left; it changes color as time gets low
   - Navigate to the green EXIT cell and a **"Level Complete!"** overlay appears
   - Press **P** to pause; press **P** again to resume
   - Let the timer run out and see the **"Time's Up!"** overlay

---

## Challenges

**Easy:**
- Change the reveal radius from 3 to 5 and see how it changes the feel. Then try 2 for a claustrophobic experience.

**Medium:**
- Add a "cells explored" counter to the HUD that shows what percentage of the maze the player has revealed.

**Hard:**
- Implement a minimap in the corner that shows the full maze layout at a tiny scale, but only for cells that have been revealed. The minimap should update in real time as the player explores.

---

## What You Learned

- Implementing fog of war with a persistent `revealed` Set and circular Euclidean distance
- Creating distance-based brightness falloff for an atmospheric glow effect
- Building a countdown timer system that integrates with game state
- Rendering a HUD with color-coded timer and state-based overlays
- Managing game flow: start -> play -> win/lose -> restart

**Next:** [Step 5: Larger Mazes & Polish](./step-5.md) -- make mazes grow each level, add scoring with time bonuses, and polish the experience!

---
[<- Previous Step](./step-3.md) | [Back to Game README](./README.md) | [Next Step ->](./step-5.md)
