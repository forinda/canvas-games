# Step 2: Alien Grid & Movement

**Goal:** Create a 5x11 grid of aliens that march side to side and step down when they reach the edge.

**Time:** ~15 minutes

---

## What You'll Build

The alien invasion arrives:
- **5 rows, 11 columns**: 55 aliens in formation
- **Three alien types**: Small (top row, 30 pts), Medium (rows 2-3, 20 pts), Large (rows 4-5, 10 pts)
- **Horizontal marching**: The entire grid moves left or right as a unit
- **Edge detection**: When any alien touches a side wall, the whole grid reverses direction
- **Descent**: Each time the grid reverses, every alien drops 16 pixels closer to the player

---

## Concepts

- **Formation Building**: Calculate starting X/Y positions using row/column indices, alien dimensions, and padding
- **Uniform Group Movement**: Move every alive alien by the same delta each frame so they stay in formation
- **Edge-Triggered Direction Reversal**: Check if any alien exceeds the boundary, then reverse and drop the whole group
- **Enum-Like Constants**: Use a frozen object to define alien types without a full TypeScript `enum`

---

## Code

### 1. Update Types

**File:** `src/games/space-invaders/types.ts`

Add alien constants, the `Alien` interface, alien type definitions, and a HUD height constant. Replace the entire file.

```typescript
// ── Constants ──────────────────────────────────────────────────────────────

export const CANVAS_W = 800;
export const CANVAS_H = 600;

export const PLAYER_W = 40;
export const PLAYER_H = 20;
export const PLAYER_SPEED = 300;
export const PLAYER_SHOOT_COOLDOWN = 0.4;

export const ALIEN_W = 30;
export const ALIEN_H = 24;
export const ALIEN_PADDING = 14;
export const ALIEN_BASE_SPEED = 40; // px / s – increases as aliens die
export const ALIEN_DROP = 16; // px dropped when reaching edge

export const BULLET_W = 4;
export const BULLET_H = 12;
export const PLAYER_BULLET_SPEED = -450;

export const HUD_HEIGHT = 36;

// ── Entity types ───────────────────────────────────────────────────────────

export const AlienType = {
  Small: 0,
  Medium: 1,
  Large: 2,
} as const;

export type AlienType = (typeof AlienType)[keyof typeof AlienType];

export interface Player {
  x: number;
  y: number;
  w: number;
  h: number;
  speed: number;
  shootCooldown: number;
  cooldownLeft: number;
}

export interface Alien {
  row: number;
  col: number;
  x: number;
  y: number;
  w: number;
  h: number;
  type: AlienType;
  alive: boolean;
  points: number;
}

export interface Bullet {
  x: number;
  y: number;
  w: number;
  h: number;
  vy: number;
  fromPlayer: boolean;
  active: boolean;
}

// ── Aggregate game state ───────────────────────────────────────────────────

export type GamePhase = 'playing' | 'gameover';

export interface InvadersState {
  phase: GamePhase;
  player: Player;
  aliens: Alien[];
  bullets: Bullet[];

  alienDir: 1 | -1;
  alienSpeedMultiplier: number;

  score: number;

  input: {
    left: boolean;
    right: boolean;
    shoot: boolean;
  };

  canvasW: number;
  canvasH: number;
}
```

**What's happening:**
- `AlienType` uses the `as const` pattern to create a type-safe enum without the quirks of TypeScript's `enum` keyword.
- Each `Alien` stores its `row` and `col` in the grid, which we will use later when determining which alien can shoot.
- `alienDir` is either `1` (moving right) or `-1` (moving left). The entire formation shares one direction.
- `alienSpeedMultiplier` starts at 1 and increases as aliens die, recreating the classic speed-up effect.

---

### 2. Create the Formation Builder

**File:** `src/games/space-invaders/data/formations.ts`

Build the 5x11 alien grid with proper spacing and type assignment.

```typescript
import type { Alien } from '../types';
import { AlienType, ALIEN_W, ALIEN_H, ALIEN_PADDING, HUD_HEIGHT } from '../types';

export function buildFormation(canvasW: number): Alien[] {
  const rows = 5;
  const cols = 11;

  // Row-to-type mapping: top row is Small, middle rows Medium, bottom rows Large
  const rowTypes: AlienType[] = [
    AlienType.Small,
    AlienType.Medium,
    AlienType.Medium,
    AlienType.Large,
    AlienType.Large,
  ];

  const pointsMap: Record<AlienType, number> = {
    [AlienType.Small]: 30,
    [AlienType.Medium]: 20,
    [AlienType.Large]: 10,
  };

  // Center the formation horizontally
  const totalW = cols * (ALIEN_W + ALIEN_PADDING) - ALIEN_PADDING;
  const startX = (canvasW - totalW) / 2;
  const startY = HUD_HEIGHT + 30;

  const aliens: Alien[] = [];

  for (let r = 0; r < rows; r++) {
    const type = rowTypes[r];
    const points = pointsMap[type];

    for (let c = 0; c < cols; c++) {
      aliens.push({
        row: r,
        col: c,
        x: startX + c * (ALIEN_W + ALIEN_PADDING),
        y: startY + r * (ALIEN_H + ALIEN_PADDING),
        w: ALIEN_W,
        h: ALIEN_H,
        type,
        alive: true,
        points,
      });
    }
  }

  return aliens;
}
```

**What's happening:**
- The total grid width is calculated as `cols * (width + padding) - padding` (no trailing padding). The grid is then centered by computing `(canvasW - totalW) / 2`.
- The formation starts below the HUD bar (`HUD_HEIGHT + 30`) so it does not overlap the score display we will add later.
- Each alien's screen position is fully determined by its row and column. This makes it easy to rebuild the grid for new waves.

---

### 3. Create the Alien System

**File:** `src/games/space-invaders/systems/AlienSystem.ts`

Move the alien formation side to side and drop it at the edges.

```typescript
import type { InvadersState } from '../types';
import { ALIEN_BASE_SPEED, ALIEN_DROP } from '../types';

export class AlienSystem {
  update(state: InvadersState, dt: number): void {
    if (state.phase !== 'playing') return;

    const alive = state.aliens.filter((a) => a.alive);
    if (alive.length === 0) return;

    // ── Speed scales with how many aliens remain ────────────────────────
    const totalAliens = state.aliens.length;
    const ratio = alive.length / totalAliens; // 1 → 0
    state.alienSpeedMultiplier = 1 + (1 - ratio) * 3;

    const speed = ALIEN_BASE_SPEED * state.alienSpeedMultiplier;

    // ── Horizontal movement ─────────────────────────────────────────────
    const dx = speed * state.alienDir * dt;
    let shouldDrop = false;

    for (const a of alive) {
      a.x += dx;
      if (a.x + a.w > state.canvasW - 4 || a.x < 4) {
        shouldDrop = true;
      }
    }

    if (shouldDrop) {
      state.alienDir = (state.alienDir * -1) as 1 | -1;
      for (const a of alive) {
        a.y += ALIEN_DROP;
      }
      // If any alien has reached the player row, it is game over
      for (const a of alive) {
        if (a.y + a.h >= state.player.y) {
          state.phase = 'gameover';
          return;
        }
      }
    }
  }
}
```

**What's happening:**
- The speed formula `1 + (1 - ratio) * 3` means: at full 55 aliens the multiplier is 1x, at the last alien it reaches 4x. This recreates the iconic speed-up from the original game (which was actually a hardware limitation -- the CPU rendered fewer sprites faster).
- Edge detection uses a 4px margin so aliens do not visually overlap the wall.
- When the formation drops, we immediately check if any alien has reached the player's Y position. If so, the game ends -- the aliens have landed.

---

### 4. Update the Game Renderer

**File:** `src/games/space-invaders/renderers/GameRenderer.ts`

Add alien drawing. Each alien type gets a distinct color.

```typescript
import type { InvadersState } from '../types';
import { AlienType } from '../types';

const ALIEN_COLORS: Record<AlienType, string> = {
  [AlienType.Small]: '#ff4444',
  [AlienType.Medium]: '#44ff44',
  [AlienType.Large]: '#44aaff',
};

export class GameRenderer {
  render(ctx: CanvasRenderingContext2D, state: InvadersState): void {
    // ── Clear ───────────────────────────────────────────────────────────
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, state.canvasW, state.canvasH);

    // ── Aliens ──────────────────────────────────────────────────────────
    for (const alien of state.aliens) {
      if (!alien.alive) continue;
      ctx.fillStyle = ALIEN_COLORS[alien.type];
      ctx.fillRect(alien.x, alien.y, alien.w, alien.h);
    }

    // ── Player ──────────────────────────────────────────────────────────
    const p = state.player;
    ctx.fillStyle = '#00ff88';
    ctx.fillRect(p.x, p.y + 6, p.w, p.h - 6);
    ctx.fillRect(p.x + p.w / 2 - 3, p.y, 6, 8);

    // ── Bullets ─────────────────────────────────────────────────────────
    for (const b of state.bullets) {
      if (!b.active) continue;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(b.x, b.y, b.w, b.h);
    }
  }
}
```

**What's happening:**
- Red for Small (top row, hardest to hit, most points), green for Medium, blue for Large.
- Dead aliens are skipped, so destroyed aliens simply disappear.
- For now aliens are simple colored rectangles. We will replace them with pixel-art sprites in Step 6.

---

### 5. Update the Engine

**File:** `src/games/space-invaders/InvadersEngine.ts`

Add the alien system and formation builder to the game loop.

```typescript
import type { InvadersState } from './types';
import {
  CANVAS_W,
  CANVAS_H,
  PLAYER_W,
  PLAYER_H,
  PLAYER_SPEED,
  PLAYER_SHOOT_COOLDOWN,
} from './types';
import { buildFormation } from './data/formations';
import { InputSystem } from './systems/InputSystem';
import { PlayerSystem } from './systems/PlayerSystem';
import { AlienSystem } from './systems/AlienSystem';
import { GameRenderer } from './renderers/GameRenderer';

export class InvadersEngine {
  private ctx: CanvasRenderingContext2D;
  private state: InvadersState;
  private rafId = 0;
  private lastTime = 0;

  private inputSystem: InputSystem;
  private playerSystem = new PlayerSystem();
  private alienSystem = new AlienSystem();
  private gameRenderer = new GameRenderer();

  constructor(canvas: HTMLCanvasElement) {
    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;
    this.ctx = canvas.getContext('2d')!;

    this.inputSystem = new InputSystem();

    this.state = {
      phase: 'playing',
      player: {
        x: CANVAS_W / 2 - PLAYER_W / 2,
        y: CANVAS_H - 40,
        w: PLAYER_W,
        h: PLAYER_H,
        speed: PLAYER_SPEED,
        shootCooldown: PLAYER_SHOOT_COOLDOWN,
        cooldownLeft: 0,
      },
      aliens: buildFormation(CANVAS_W),
      bullets: [],
      alienDir: 1,
      alienSpeedMultiplier: 1,
      score: 0,
      input: { left: false, right: false, shoot: false },
      canvasW: CANVAS_W,
      canvasH: CANVAS_H,
    };
  }

  start(): void {
    this.inputSystem.attach();
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  destroy(): void {
    cancelAnimationFrame(this.rafId);
    this.inputSystem.detach();
  }

  private loop = (now: number): void => {
    const dt = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;

    this.inputSystem.poll(this.state);

    // Update systems
    this.playerSystem.update(this.state, dt);
    this.alienSystem.update(this.state, dt);

    // Move bullets
    for (const b of this.state.bullets) {
      b.y += b.vy * dt;
    }
    this.state.bullets = this.state.bullets.filter(
      (b) => b.active && b.y + b.h > 0 && b.y < this.state.canvasH,
    );

    // Render
    this.gameRenderer.render(this.ctx, this.state);

    this.rafId = requestAnimationFrame(this.loop);
  };
}
```

**What's happening:**
- `buildFormation(CANVAS_W)` generates the 55-alien grid on startup.
- The `AlienSystem` runs every frame, moving the formation and checking edges.
- The alien system runs after the player system, so both update each frame before rendering.

---

## Test It

1. **Run:** `npm run dev`
2. **Open:** the Space Invaders game
3. **Observe:**
   - 5 rows of colored rectangles appear in formation near the top
   - Top row (red) = Small, middle rows (green) = Medium, bottom rows (blue) = Large
   - The entire formation drifts to the right
   - When the rightmost alien hits the edge, the whole grid drops 16px and reverses left
   - The marching pattern continues in a zigzag descent
   - You can still move and shoot, but bullets pass through aliens (collision is Step 3)

**Let the aliens reach the bottom.** When any alien's Y position reaches the player row, the game phase switches to `'gameover'` and everything freezes.

---

## Challenges

**Easy:**
- Change the alien colors to all-white for a monochrome retro look.
- Increase `ALIEN_DROP` to 32 so aliens descend faster.
- Add a 7th column of aliens by changing `cols` in `buildFormation`.

**Medium:**
- Draw each alien as a circle instead of a rectangle using `ctx.arc`.
- Add a subtle animation: make aliens "pulse" by scaling their width and height with `Math.sin(performance.now())`.

**Hard:**
- Make the formation start slightly off-center each game (random X offset of +/-50px).
- Add a "wobble" effect: each alien oscillates vertically by 2px with a phase offset based on its column.

---

## What You Learned

- Building entity formations with row/column math and centered positioning
- Moving a group of entities as a unit with shared direction state
- Edge-triggered direction reversal with descent
- Dynamic speed scaling based on remaining enemy count
- Alien type differentiation with a const-object enum pattern

**Next:** Making bullets destroy aliens with collision detection!
