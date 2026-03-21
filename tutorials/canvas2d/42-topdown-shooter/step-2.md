# Step 2: WASD Movement & Mouse Aiming

**Goal:** Move the player with WASD keys and rotate to face the mouse cursor, with an aim line showing the fire direction.

**Time:** ~15 minutes

---

## What You'll Build

- **WASD keyboard movement** with diagonal normalization
- **Mouse tracking** that updates aim direction in real time
- **Aim line** -- a dashed line from the player toward the cursor
- **Gun direction indicator** -- a small white dot on the player's edge facing the mouse
- **Arena clamping** so the player cannot leave the bordered area
- **InputSystem** that manages all keyboard and mouse event listeners

---

## Concepts

- **Diagonal Normalization**: When pressing W+D simultaneously, the raw direction vector is `(1, -1)` with magnitude ~1.41. Dividing by the magnitude ensures diagonal movement is the same speed as cardinal movement -- without this, players move 41% faster diagonally.
- **atan2 for Aim Angle**: `Math.atan2(dy, dx)` converts the direction from player to mouse into an angle in radians. This is the standard way to compute aim direction in 2D games.
- **Delta-Time Movement**: `pos += speed * dt` ensures the player moves at the same real-world speed regardless of frame rate. At 60 FPS, `dt` is ~0.016s; at 30 FPS, `dt` is ~0.033s, but the distance per second stays constant.
- **Input State Pattern**: Instead of reacting to events directly, we store which keys are held in a `Set<string>` and read that set each frame. This decouples input handling from game logic.

---

## Code

### 1. Create the Input System

**File:** `src/contexts/canvas2d/games/topdown-shooter/systems/InputSystem.ts`

Listens for keyboard and mouse events, writing into the shared state.

```typescript
import type { ShooterState } from '../types';

export class InputSystem {
  private state: ShooterState;
  private canvas: HTMLCanvasElement;

  private keyDown = (e: KeyboardEvent): void => {
    const key = e.key.toLowerCase();
    this.state.keys.add(key);

    if (key === 'p' && this.state.started && !this.state.gameOver) {
      this.state.paused = !this.state.paused;
    }
  };

  private keyUp = (e: KeyboardEvent): void => {
    this.state.keys.delete(e.key.toLowerCase());
  };

  private mouseMove = (e: MouseEvent): void => {
    const rect = this.canvas.getBoundingClientRect();
    this.state.mouse.x = e.clientX - rect.left;
    this.state.mouse.y = e.clientY - rect.top;
  };

  private mouseDownHandler = (): void => {
    this.state.mouseDown = true;
  };

  private mouseUpHandler = (): void => {
    this.state.mouseDown = false;
  };

  constructor(state: ShooterState, canvas: HTMLCanvasElement) {
    this.state = state;
    this.canvas = canvas;
  }

  attach(): void {
    window.addEventListener('keydown', this.keyDown);
    window.addEventListener('keyup', this.keyUp);
    this.canvas.addEventListener('mousemove', this.mouseMove);
    this.canvas.addEventListener('mousedown', this.mouseDownHandler);
    this.canvas.addEventListener('mouseup', this.mouseUpHandler);
  }

  detach(): void {
    window.removeEventListener('keydown', this.keyDown);
    window.removeEventListener('keyup', this.keyUp);
    this.canvas.removeEventListener('mousemove', this.mouseMove);
    this.canvas.removeEventListener('mousedown', this.mouseDownHandler);
    this.canvas.removeEventListener('mouseup', this.mouseUpHandler);
    this.state.keys.clear();
    this.state.mouseDown = false;
  }
}
```

**What's happening:**
- `keyDown` adds the lowercase key to `state.keys`; `keyUp` removes it. Using a `Set` means we can check any key with `keys.has('w')` regardless of press order.
- `mouseMove` converts `clientX/clientY` to canvas-local coordinates by subtracting the canvas bounding rect. This handles cases where the canvas is not at (0, 0) in the page.
- `mouseDown` / `mouseUp` toggle a boolean so the player system can check "is the mouse held?" each frame rather than reacting to click events.
- `attach()` and `detach()` pair ensures clean event listener setup and teardown -- no memory leaks when the game is destroyed.

---

### 2. Create the Player System

**File:** `src/contexts/canvas2d/games/topdown-shooter/systems/PlayerSystem.ts`

Handles WASD movement and arena boundary clamping. Shooting will be added in Step 3.

```typescript
import type { ShooterState } from '../types';
import { PLAYER_SPEED, ARENA_PADDING } from '../types';

export class PlayerSystem {
  update(state: ShooterState, dt: number): void {
    const { player, keys } = state;

    // ── Movement ──────────────────────────────────────────────────
    let dx = 0;
    let dy = 0;

    if (keys.has('w') || keys.has('arrowup')) dy -= 1;
    if (keys.has('s') || keys.has('arrowdown')) dy += 1;
    if (keys.has('a') || keys.has('arrowleft')) dx -= 1;
    if (keys.has('d') || keys.has('arrowright')) dx += 1;

    // Normalize diagonal
    const mag = Math.sqrt(dx * dx + dy * dy);
    if (mag > 0) {
      dx /= mag;
      dy /= mag;
    }

    player.pos.x += dx * PLAYER_SPEED * dt;
    player.pos.y += dy * PLAYER_SPEED * dt;

    // Clamp inside arena
    const pad = ARENA_PADDING + player.radius;
    player.pos.x = Math.max(pad, Math.min(state.canvasW - pad, player.pos.x));
    player.pos.y = Math.max(pad, Math.min(state.canvasH - pad, player.pos.y));
  }
}
```

**What's happening:**
- Each WASD key contributes +1 or -1 to the direction vector. When two keys are held (e.g., W+D), the vector is `(1, -1)`.
- `Math.sqrt(dx*dx + dy*dy)` computes the magnitude. Dividing by it normalizes the vector to length 1, preventing faster diagonal movement.
- `PLAYER_SPEED * dt` converts from "pixels per second" to "pixels this frame." At 220 px/s, the player crosses the screen in about 4-5 seconds.
- The clamp uses `ARENA_PADDING + player.radius` so the player's circle stays fully inside the arena border, not just its center point.

---

### 3. Update the Game Renderer

**File:** `src/contexts/canvas2d/games/topdown-shooter/renderers/GameRenderer.ts`

Add the aim line and gun direction indicator to the existing renderer.

```typescript
import type { ShooterState } from '../types';
import { ARENA_PADDING, PLAYER_RADIUS } from '../types';

export class GameRenderer {
  render(ctx: CanvasRenderingContext2D, state: ShooterState): void {
    const W = state.canvasW;
    const H = state.canvasH;

    // ── Background ───────────────────────────────────────────────
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, W, H);

    // ── Arena border ─────────────────────────────────────────────
    const ap = ARENA_PADDING;
    ctx.strokeStyle = '#333355';
    ctx.lineWidth = 2;
    ctx.strokeRect(ap, ap, W - ap * 2, H - ap * 2);

    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 1;
    const gridSize = 60;

    for (let x = ap; x < W - ap; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, ap);
      ctx.lineTo(x, H - ap);
      ctx.stroke();
    }

    for (let y = ap; y < H - ap; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(ap, y);
      ctx.lineTo(W - ap, y);
      ctx.stroke();
    }

    // ── Player ───────────────────────────────────────────────────
    const { player, mouse } = state;

    // Aim line
    const aimDx = mouse.x - player.pos.x;
    const aimDy = mouse.y - player.pos.y;
    const aimLen = Math.sqrt(aimDx * aimDx + aimDy * aimDy);

    if (aimLen > 0) {
      const nx = aimDx / aimLen;
      const ny = aimDy / aimLen;

      ctx.strokeStyle = 'rgba(255,235,59,0.35)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(
        player.pos.x + nx * PLAYER_RADIUS,
        player.pos.y + ny * PLAYER_RADIUS,
      );
      ctx.lineTo(player.pos.x + nx * 60, player.pos.y + ny * 60);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Player body
    ctx.fillStyle = '#42a5f5';
    ctx.beginPath();
    ctx.arc(player.pos.x, player.pos.y, player.radius, 0, Math.PI * 2);
    ctx.fill();

    // Player outline glow
    ctx.strokeStyle = '#90caf9';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(player.pos.x, player.pos.y, player.radius, 0, Math.PI * 2);
    ctx.stroke();

    // Gun direction indicator
    if (aimLen > 0) {
      const nx = aimDx / aimLen;
      const ny = aimDy / aimLen;

      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(
        player.pos.x + nx * (player.radius - 4),
        player.pos.y + ny * (player.radius - 4),
        4,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
  }
}
```

**What's happening:**
- The aim direction is computed as `(mouse - player)` normalized to unit length. This gives us `(nx, ny)` pointing from the player toward the cursor.
- The **aim line** is a yellow dashed line (`setLineDash([6, 6])`) extending from the player's edge outward 60px. Starting at `PLAYER_RADIUS` offset avoids drawing inside the player circle.
- The **gun indicator** is a small white dot placed at `radius - 4` pixels from the player center in the aim direction. This shows where the "barrel" is pointing.
- `setLineDash([])` resets the dash pattern after drawing so subsequent lines are solid.

---

### 4. Update the Engine

**File:** `src/contexts/canvas2d/games/topdown-shooter/ShooterEngine.ts`

Wire in the InputSystem and PlayerSystem.

```typescript
import type { ShooterState } from './types';
import { PLAYER_RADIUS, PLAYER_MAX_HP } from './types';
import { InputSystem } from './systems/InputSystem';
import { PlayerSystem } from './systems/PlayerSystem';
import { GameRenderer } from './renderers/GameRenderer';

export class ShooterEngine {
  private ctx: CanvasRenderingContext2D;
  private state: ShooterState;
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

    this.state = this.createInitialState(canvas.width, canvas.height);

    this.playerSystem = new PlayerSystem();
    this.gameRenderer = new GameRenderer();
    this.inputSystem = new InputSystem(this.state, canvas);

    this.resizeHandler = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      this.state.canvasW = canvas.width;
      this.state.canvasH = canvas.height;
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
    const dt = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;

    if (!this.state.paused && !this.state.gameOver) {
      this.playerSystem.update(this.state, dt);
    }

    this.gameRenderer.render(this.ctx, this.state);

    this.rafId = requestAnimationFrame(() => this.loop());
  }

  private createInitialState(w: number, h: number): ShooterState {
    return {
      canvasW: w,
      canvasH: h,
      player: {
        pos: { x: w / 2, y: h / 2 },
        hp: PLAYER_MAX_HP,
        maxHp: PLAYER_MAX_HP,
        radius: PLAYER_RADIUS,
        shootCooldown: 0,
        invincibleTimer: 0,
      },
      bullets: [],
      enemies: [],
      particles: [],
      waveData: {
        wave: 0,
        enemiesRemaining: 0,
        spawnTimer: 0,
        spawnInterval: 1,
        betweenWaveTimer: 1.5,
        active: false,
      },
      score: 0,
      highScore: 0,
      kills: 0,
      gameOver: false,
      paused: false,
      started: true,
      keys: new Set(),
      mouse: { x: w / 2, y: h / 2 },
      mouseDown: false,
    };
  }
}
```

**What's happening:**
- `InputSystem` is created with the shared state and canvas, then `attach()` is called to start listening for events.
- In the game loop, `playerSystem.update()` runs only when the game is not paused and not over. This ensures input is ignored during pause.
- `destroy()` now calls `inputSystem.detach()` to clean up all event listeners when the game shuts down.

---

## Test It

1. **Run:** `npm run dev`
2. **Open:** the Top-Down Shooter game in your browser
3. **Observe:**
   - Press **W/A/S/D** -- the player circle moves in the corresponding direction
   - Press **W+D** together -- diagonal movement is the same speed (not faster)
   - Move the mouse -- a **yellow dashed line** extends from the player toward the cursor
   - A **white dot** on the player's edge shows the gun direction
   - Walk into the arena border -- the player **stops at the edge** and cannot leave
   - Press **P** -- movement freezes (paused state)

---

## Challenges

**Easy:**
- Change `PLAYER_SPEED` to 400 and see how the faster movement feels. Then try 120 for a slower, more deliberate pace.

**Medium:**
- Make the aim line length proportional to the distance between the player and cursor (closer = shorter line).

**Hard:**
- Add a "trail" effect: store the player's last 10 positions and draw fading circles behind them as the player moves.

---

## What You Learned

- Implementing WASD movement with diagonal normalization for consistent speed
- Tracking mouse position relative to the canvas using `getBoundingClientRect()`
- Computing aim direction with vector subtraction and normalization
- Drawing a dashed aim line using `setLineDash()`
- Clamping player position to stay within arena boundaries
- Separating input handling (InputSystem) from game logic (PlayerSystem)

**Next:** Shooting and bullets -- click to fire projectiles toward the cursor!
