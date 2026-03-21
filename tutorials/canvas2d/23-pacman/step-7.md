# Step 7: Lives, Levels & Polish

**Goal:** Add lives display, level progression with faster ghosts, animated Pac-Man mouth, proper ghost body rendering, and final polish.

**Time:** ~15 minutes

---

## What You'll Build

The complete, polished game:
- **Lives indicator**: small Pac-Man icons at the bottom of the screen
- **Level progression**: clearing all dots advances the level, ghosts get faster
- **Animated Pac-Man mouth**: opens and closes as Pac-Man moves, rotates to face the movement direction
- **Full ghost rendering**: rounded top, wavy animated bottom (the classic ghost silhouette)
- **Complete HUD**: score, high score, level, lives, and state overlays
- **Start screen overlay**: "PAC-MAN -- Press any arrow key to start"

---

## Concepts

- **Mouth Animation**: A `mouthAngle` value oscillates between 0.05 and 0.8 radians. The Pac-Man arc starts at `angle + mouth` and ends at `angle + 2PI - mouth`, creating a wedge that opens and closes. The base `angle` rotates based on direction (right=0, down=PI/2, left=PI, up=3PI/2).
- **Ghost Body Shape**: A semicircle on top connected to a wavy bottom edge. The waves animate using `Math.sin(time)` for a wobbling skirt effect.
- **Level Scaling**: Each level increases ghost speed slightly. The base formula adds a small multiplier per level. The maze resets with all dots restored.
- **Lives Display**: Small Pac-Man shapes (arc with mouth) rendered along the bottom-left.

---

## Code

### 1. Final GameRenderer

**File:** `src/contexts/canvas2d/games/pacman/renderers/GameRenderer.ts`

The complete renderer with animated Pac-Man mouth and full ghost body shape.

```typescript
import type { PacManState, Direction } from '../types';

export class GameRenderer {
  render(ctx: CanvasRenderingContext2D, state: PacManState): void {
    const { cellSize: cs, offsetX: ox, offsetY: oy } = state;

    // Clear canvas
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    this.renderMaze(ctx, state, cs, ox, oy);
    this.renderDots(ctx, state, cs, ox, oy);
    this.renderGhosts(ctx, state, cs, ox, oy);
    this.renderPacMan(ctx, state, cs, ox, oy);
  }

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

    if (!isWall(x, y - 1)) {
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + cs, py); ctx.stroke();
    }
    if (!isWall(x, y + 1)) {
      ctx.beginPath(); ctx.moveTo(px, py + cs); ctx.lineTo(px + cs, py + cs); ctx.stroke();
    }
    if (!isWall(x - 1, y)) {
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, py + cs); ctx.stroke();
    }
    if (!isWall(x + 1, y)) {
      ctx.beginPath(); ctx.moveTo(px + cs, py); ctx.lineTo(px + cs, py + cs); ctx.stroke();
    }
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

    // Rotation angle based on direction
    const angle = this.dirToAngle(pac.dir);
    // Mouth opening (animated)
    const mouth = pac.mouthAngle;

    // Draw Pac-Man as an arc with a mouth wedge
    ctx.fillStyle = '#ffff00';
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, angle + mouth, angle + Math.PI * 2 - mouth);
    ctx.closePath();
    ctx.fill();

    // Small eye
    const eyeAngle = angle - 0.5;
    const eyeX = cx + Math.cos(eyeAngle) * radius * 0.45;
    const eyeY = cy + Math.sin(eyeAngle) * radius * 0.45;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(eyeX, eyeY, cs * 0.06, 0, Math.PI * 2);
    ctx.fill();
  }

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

      if (ghost.eaten) {
        // Just draw eyes returning to house
        this.drawGhostEyes(ctx, cx, cy, r, ghost.dir);
        continue;
      }

      // Body color
      if (ghost.mode === 'frightened') {
        const flashing = state.frightenedTimer < 2 &&
          Math.floor(state.time * 8) % 2 === 0;
        ctx.fillStyle = flashing ? '#fff' : '#2222ff';
      } else {
        ctx.fillStyle = ghost.color;
      }

      // Ghost body: rounded top + wavy bottom
      ctx.beginPath();
      ctx.arc(cx, cy - r * 0.15, r, Math.PI, 0); // Semicircle top

      const bottom = cy + r * 0.85;
      const waveSize = r * 0.25;
      const segments = 3;
      const segW = (r * 2) / segments;

      ctx.lineTo(cx + r, bottom);
      for (let i = segments - 1; i >= 0; i--) {
        const sx = cx - r + i * segW;
        const waveOffset = Math.sin(state.time * 10 + i) * waveSize * 0.3;
        ctx.quadraticCurveTo(
          sx + segW * 0.5,
          bottom + waveSize + waveOffset,
          sx,
          bottom,
        );
      }
      ctx.closePath();
      ctx.fill();

      // Eyes
      if (ghost.mode === 'frightened') {
        // Frightened face
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

  private dirToAngle(dir: Direction): number {
    switch (dir) {
      case 'right': return 0;
      case 'down':  return Math.PI * 0.5;
      case 'left':  return Math.PI;
      case 'up':    return Math.PI * 1.5;
      default:      return 0;
    }
  }
}
```

**What's happening:**

**Pac-Man Mouth Animation:**
- `dirToAngle` converts the movement direction to a radian angle: right=0, down=PI/2, left=PI, up=3PI/2.
- The arc is drawn from `angle + mouth` to `angle + 2*PI - mouth`. This creates a wedge gap centered on the direction of movement.
- `pac.mouthAngle` oscillates between 0.05 (nearly closed) and 0.8 (wide open). The `PlayerSystem` drives this animation.
- A small black eye is placed at `angle - 0.5` radians (slightly above the mouth direction) using cos/sin to position it on the circle.

**Ghost Body Shape:**
- The top half is a semicircle: `ctx.arc(cx, cy - r*0.15, r, PI, 0)`. The slight upward offset (`-r*0.15`) makes the ghost taller than wide.
- The bottom edge uses 3 quadratic curves that create a wavy "skirt" effect. Each segment's control point oscillates with `Math.sin(state.time * 10 + i)`, making the waves animate independently.
- `waveSize * 0.3` keeps the wave amplitude subtle. The `+ i` phase offset staggers the waves so they do not all peak at the same time.

**Frightened Rendering:**
- Blue body with a simple face: two white dots for eyes and a zigzag line for the mouth. The zigzag is drawn by alternating Y offsets (+/- `r*0.1`) across 4 points.
- In the last 2 seconds, `Math.floor(state.time * 8) % 2` alternates between 0 and 1 at 8Hz, toggling the fill between blue and white. This creates the familiar rapid-flash warning.

---

### 2. Add Mouth Animation to PlayerSystem

**File:** `src/contexts/canvas2d/games/pacman/systems/PlayerSystem.ts`

Add mouth animation at the end of the `update` method. The mouth oscillates between open and closed while Pac-Man is moving.

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

      if (pac.pos.x < -0.5) pac.pos.x = state.gridWidth - 0.5;
      if (pac.pos.x > state.gridWidth - 0.5) pac.pos.x = -0.5;
    }

    this.snapToGrid(pac);

    // Animate mouth
    const mouthSpeed = 8 * dt;
    if (pac.mouthOpening) {
      pac.mouthAngle += mouthSpeed;
      if (pac.mouthAngle >= 0.8) pac.mouthOpening = false;
    } else {
      pac.mouthAngle -= mouthSpeed;
      if (pac.mouthAngle <= 0.05) pac.mouthOpening = true;
    }
    pac.mouthAngle = Math.max(0.05, Math.min(0.8, pac.mouthAngle));

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
        state.frightenedTimer = FRIGHTENED_DURATION;
        state.frightenedGhostsEaten = 0;
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
- The mouth animation runs every frame: `mouthAngle` increases at `8 * dt` radians per second when opening, decreases when closing.
- When `mouthAngle` reaches 0.8, `mouthOpening` flips to false. When it reaches 0.05, it flips back. The clamp ensures the value never exceeds bounds.
- The result is a smooth open-close-open-close cycle at roughly 5 cycles per second, giving Pac-Man his signature "waka-waka" appearance.

---

### 3. Final HUD Renderer with Lives Display

**File:** `src/contexts/canvas2d/games/pacman/renderers/HUDRenderer.ts`

Add lives display as small Pac-Man icons at the bottom of the screen.

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

    // Lives indicator at bottom-left: small Pac-Man shapes
    const lifeSize = 10;
    const lifeY = ctx.canvas.height - 20;
    for (let i = 0; i < state.lives; i++) {
      const lx = 16 + i * 28;
      ctx.fillStyle = '#ffff00';
      ctx.beginPath();
      ctx.arc(lx, lifeY, lifeSize, 0.25, Math.PI * 2 - 0.25);
      ctx.lineTo(lx, lifeY);
      ctx.closePath();
      ctx.fill();
    }

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

    ctx.font = '12px monospace';
    ctx.fillStyle = '#888';
    ctx.fillText('Arrow Keys = Move | P = Pause | ESC = Exit', W / 2, H / 2 + 50);
  }
}
```

**What's happening:**
- Each life is drawn as a small Pac-Man shape: an arc from 0.25 to `2*PI - 0.25` radians with a line back to the center, creating the classic mouth-open profile.
- Lives are spaced 28px apart starting 16px from the left edge, 20px from the bottom.
- The overlay subtitle at the bottom now includes a controls reminder for discoverability.

---

### 4. Final Engine

**File:** `src/contexts/canvas2d/games/pacman/PacManEngine.ts`

The complete engine with level progression. When the player wins and presses Space, the level increments and ghost speed scales up.

```typescript
import type { PacManState, Cell, Ghost } from './types';
import {
  MAZE_COLS,
  MAZE_ROWS,
  INITIAL_LIVES,
} from './types';
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

    // Systems
    this.playerSystem = new PlayerSystem();
    this.ghostSystem = new GhostSystem();
    this.collisionSystem = new CollisionSystem(() => this.handleDeath());
    this.inputSystem = new InputSystem(this.state, () => this.handleRestart());

    // Renderers
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
    const rawDt = (now - this.lastTime) / 1000;
    const dt = Math.min(rawDt, 0.1); // Cap at 100ms to prevent teleportation
    this.lastTime = now;

    this.state.time = now / 1000;

    if (this.state.started && !this.state.paused && !this.state.gameOver && !this.state.won) {
      this.playerSystem.update(this.state, dt);
      this.ghostSystem.update(this.state, dt);
      this.collisionSystem.update(this.state, dt);
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
      // Next level: keep score and lives, reset maze
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
      // Full reset after game over
      const hs = this.state.highScore;
      const canvas = this.ctx.canvas;
      this.state = this.buildInitialState(canvas);
      this.state.highScore = hs;
      this.state.started = true;
    }

    // Rebuild systems with new state reference
    this.inputSystem.detach();
    this.inputSystem = new InputSystem(this.state, () => this.handleRestart());
    this.inputSystem.attach();
    this.collisionSystem = new CollisionSystem(() => this.handleDeath());
  }

  private resetPositions(): void {
    const s = this.state;

    // Find player start from maze data
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

    // Reset Blinky
    s.ghosts[0].pos = { x: 13.5, y: 11 };
    s.ghosts[0].dir = 'left';
    s.ghosts[0].active = true;
    s.ghosts[0].eaten = false;
    s.ghosts[0].mode = 'scatter';

    // Reset other ghosts inside the house
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
          case 'P':
            playerStart = { x, y };
            type = 'empty';
            break;
          case 'G':
            ghostStarts.push({ x, y });
            type = 'empty';
            break;
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

---

### 5. Final Entry Point

**File:** `src/contexts/canvas2d/games/pacman/index.ts`

```typescript
import { PacManEngine } from './PacManEngine';

export function createPacMan(canvas: HTMLCanvasElement): { destroy: () => void } {
  const engine = new PacManEngine(canvas);
  engine.start();
  return { destroy: () => engine.destroy() };
}
```

---

## Test It

1. **Run:** `npm run dev`
2. **Open:** the Pac-Man game
3. **Observe the complete game:**
   - **Start screen**: "PAC-MAN" title with controls hint. Press an arrow key to begin.
   - **Pac-Man animation**: Mouth opens and closes smoothly. It rotates to face the direction of movement. A small black eye sits above the mouth.
   - **Ghost shapes**: Proper rounded-top, wavy-bottom ghost silhouettes. The wave animation makes the skirt ripple.
   - **Frightened ghosts**: Blue with scared face. Flash white in last 2 seconds. Move slowly.
   - **Eaten ghosts**: Just floating eyes that zip back to the ghost house.
   - **Lives display**: Small Pac-Man icons at the bottom-left. One disappears each death.
   - **Death**: Touch a ghost. Positions reset. Lives count decreases.
   - **Game over**: Lose all 3 lives. "GAME OVER" in red. Press Space to restart.
   - **Win**: Eat all 244 dots. "YOU WIN!" in green. Press Space for next level.
   - **Level 2+**: Same maze, all dots restored. Ghosts inherit the same level-speed base.
   - **High score**: Persists across sessions. Shown at top-right.
   - **Pause**: Press P anytime. "PAUSED" overlay. Press P to resume.

**Full gameplay test.** Play through a complete level. Try to eat all 4 ghosts on a single power pellet (3,000 points). Clear all dots to reach Level 2. Die 3 times to see the game over screen. Press Space and verify score resets but high score persists.

---

## Try It

- Change `INITIAL_LIVES` to `10` for a forgiving experience.
- Set `FRIGHTENED_DURATION` to `2` for a very short power pellet window.
- Change the ghost wave `segments` from `3` to `6` for a more detailed skirt.
- Change `pac.mouthAngle` range to `0.1` to `1.2` for an exaggeratedly wide mouth.

---

## Challenges

**Easy:**
- Change the background from black to a very dark blue (`#000022`).
- Add a "READY!" text that displays for 2 seconds before the game starts.

**Medium:**
- Add a death animation: Pac-Man shrinks and spins when dying, with a 1-second delay before positions reset.
- Show a fruit bonus (cherry, strawberry, etc.) in the center after 70 dots, worth 100 points.
- Add screen shake when Pac-Man eats a ghost.

**Hard:**
- Scale ghost speed per level: `GHOST_SPEED * (1 + 0.05 * (level - 1))`, capped at level 20.
- Add sound effects using the Web Audio API: "waka-waka" for dot eating, a siren for ghost chase mode, a jingle for eating a ghost.
- Implement the original game's "Cruise Elroy" mode: when fewer than 20 dots remain, Blinky permanently switches to chase mode and speeds up.
- Add an intermission cutscene between levels with a simple animation.

---

## What You Learned

- Mouth animation using oscillating arc angles with direction rotation
- Ghost body rendering with semicircle top and animated quadratic-curve waves
- Lives display as mini Pac-Man icons
- Level progression with state reset and score carryover
- Complete game state machine: start, playing, paused, game over, won
- System rebuild on restart (InputSystem and CollisionSystem with new state reference)
- Delta-time clamping to prevent physics explosion on tab-switch

---

## Complete File Structure

```
src/contexts/canvas2d/games/pacman/
  types.ts                    — Types, interfaces, constants
  data/maze.ts                — 28x31 maze layout string
  systems/InputSystem.ts      — Keyboard input -> state
  systems/PlayerSystem.ts     — Pac-Man movement, eating, mouth animation
  systems/GhostSystem.ts      — Ghost AI, mode timers, targeting
  systems/CollisionSystem.ts  — Ghost-PacMan collision detection
  renderers/GameRenderer.ts   — Maze, dots, Pac-Man, ghosts
  renderers/HUDRenderer.ts    — Score, lives, overlays
  PacManEngine.ts             — Game loop, state init, death/restart
  index.ts                    — Entry point
```

---

## Congratulations!

You have built a complete Pac-Man game with:
- A tile-based maze parsed from string data
- Smooth grid-based movement with direction queuing
- Four ghosts with unique AI behaviors (chase, ambush, flank, shy)
- Scatter/chase mode alternation on a global timer
- Power pellets that reverse the hunter/prey dynamic
- Escalating ghost-eat scoring (200/400/800/1600)
- Eaten ghost eyes returning home at double speed
- Animated Pac-Man mouth and wavy ghost bodies
- Lives, levels, high score, and full game state management

This is one of the most complex arcade games ever designed, and you have implemented its core mechanics from scratch. The ghost AI in particular -- four simple targeting rules that create emergent complexity -- is a masterclass in game design.

**Next Game:** Continue to [Tetris](../24-tetris/README.md) -- where you will learn piece rotation systems and line-clearing mechanics.
