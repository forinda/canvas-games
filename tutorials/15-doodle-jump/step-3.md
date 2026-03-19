# Step 3: Platform Types

**Goal:** Add four distinct platform types -- normal (green), moving (blue), breaking (brown, one-use), and spring (red, super jump) -- each with unique behavior and visual style.

**Time:** ~15 minutes

---

## What You'll Build

Building on Step 2:
- **Normal platforms** (green): Solid and reliable. Always bounce.
- **Moving platforms** (blue): Slide back and forth horizontally. The player must time their landing.
- **Breaking platforms** (brown): Crumble and fall after one touch. No bounce -- the player keeps falling.
- **Spring platforms** (red): Have a coil on top. Launch the player extra high with `SPRING_FORCE`.

---

## Concepts

- **Polymorphic Behavior via Type Field**: Instead of subclasses, each platform has a `type` string. The collision and rendering systems switch on this field.
- **Platform-Specific Constants**: `MOVING_SPEED` for blue platforms, `SPRING_FORCE` for red platforms, `breakVy` for brown platform fall animation.
- **Visual Feedback**: Each type has a distinct color, and breaking/spring platforms have extra visual elements (cracks, coils) so the player can identify them at a glance.

---

## Code

### 1. Update the Platform System

**File:** `src/games/doodle-jump/systems/PlatformSystem.ts`

Add moving platform logic, breaking platform animation, spring timer decay, and a random type picker:

```typescript
import type { DoodleState, Platform, PlatformType } from '../types';
import {
  PLATFORM_COUNT,
  PLATFORM_WIDTH,
  PLATFORM_HEIGHT,
  MOVING_SPEED,
} from '../types';

export class PlatformSystem {
  update(state: DoodleState, dt: number): void {
    if (state.phase !== 'playing') return;

    const p = state.player;

    // Scroll camera up when player rises above 40% from top
    const midY = state.cameraY + state.canvasH * 0.4;
    if (p.y < midY) {
      const diff = midY - p.y;
      state.cameraY -= diff;

      const height = -state.cameraY;
      if (height > state.maxHeight) {
        state.maxHeight = height;
        state.score = Math.floor(state.maxHeight / 10);
      }
    }

    // Update each platform
    for (const plat of state.platforms) {
      // Moving platforms slide back and forth
      if (plat.type === 'moving') {
        plat.x += plat.moveVx * dt;
        if (plat.x <= plat.moveMinX || plat.x + plat.width >= plat.moveMaxX) {
          plat.moveVx = -plat.moveVx;
        }
      }

      // Broken platforms fall with gravity
      if (plat.broken) {
        plat.breakVy += 0.001 * dt;
        plat.y += plat.breakVy * dt;
      }

      // Spring animation timer decays toward zero
      if (plat.springTimer > 0) {
        plat.springTimer = Math.max(0, plat.springTimer - dt);
      }
    }
  }

  /** Generate the initial set of platforms for a new game */
  generateInitial(canvasW: number, canvasH: number): Platform[] {
    const platforms: Platform[] = [];
    const gap = canvasH / PLATFORM_COUNT;

    for (let i = 0; i < PLATFORM_COUNT; i++) {
      const y = canvasH - (i + 1) * gap;

      if (i === 0) {
        // First platform: always normal, centered under the player
        platforms.push({
          x: canvasW / 2 - PLATFORM_WIDTH / 2,
          y: canvasH - 80,
          width: PLATFORM_WIDTH,
          height: PLATFORM_HEIGHT,
          type: 'normal',
          moveVx: 0,
          moveMinX: 0,
          moveMaxX: canvasW,
          broken: false,
          breakVy: 0,
          springTimer: 0,
        });
      } else {
        platforms.push(this.createPlatform(y, canvasW, 0));
      }
    }

    return platforms;
  }

  /** Create a single platform at the given y position */
  createPlatform(y: number, canvasW: number, score: number): Platform {
    const x = Math.random() * (canvasW - PLATFORM_WIDTH);
    const type = this.randomType(score);

    const moveVx = type === 'moving'
      ? (Math.random() > 0.5 ? MOVING_SPEED : -MOVING_SPEED)
      : 0;

    return {
      x,
      y,
      width: PLATFORM_WIDTH,
      height: PLATFORM_HEIGHT,
      type,
      moveVx,
      moveMinX: 0,
      moveMaxX: canvasW,
      broken: false,
      breakVy: 0,
      springTimer: 0,
    };
  }

  private randomType(score: number): PlatformType {
    const r = Math.random();
    // As score increases, more special platforms appear
    const difficulty = Math.min(score / 500, 1);

    if (r < 0.55 - difficulty * 0.2) return 'normal';
    if (r < 0.75) return 'moving';
    if (r < 0.90) return 'breaking';
    return 'spring';
  }
}
```

The `randomType` method uses the current score to shift the distribution. Early in the game, 55% of platforms are normal. As the score approaches 500, that drops to 35%, making the game harder with more moving and breaking platforms.

Moving platforms get a random initial direction (`moveVx` is positive or negative). The `moveMinX` and `moveMaxX` bounds default to the full canvas width -- the platform bounces when it reaches either edge.

---

### 2. Update the Collision System

**File:** `src/games/doodle-jump/systems/CollisionSystem.ts`

Handle each platform type differently on landing:

```typescript
import type { DoodleState } from '../types';
import { JUMP_FORCE, SPRING_FORCE } from '../types';

export class CollisionSystem {
  update(state: DoodleState, _dt: number): void {
    if (state.phase !== 'playing') return;

    const p = state.player;

    // Only check collisions when falling
    if (p.vy <= 0) return;

    const playerBottom = p.y + p.height;
    const playerLeft = p.x;
    const playerRight = p.x + p.width;

    for (const plat of state.platforms) {
      if (plat.broken) continue;

      const platTop = plat.y;
      const platBottom = plat.y + plat.height;
      const platLeft = plat.x;
      const platRight = plat.x + plat.width;

      const verticalOverlap =
        playerBottom >= platTop &&
        playerBottom <= platBottom + p.vy * 16;

      const horizontalOverlap =
        playerRight > platLeft &&
        playerLeft < platRight;

      if (verticalOverlap && horizontalOverlap) {
        // Snap player to platform top
        p.y = platTop - p.height;

        // Breaking platforms crumble — no bounce
        if (plat.type === 'breaking') {
          plat.broken = true;
          plat.breakVy = 0.05;
          continue;
        }

        // Spring platforms give a super jump
        if (plat.type === 'spring') {
          p.vy = SPRING_FORCE;
          plat.springTimer = 300;
        } else {
          p.vy = JUMP_FORCE;
        }

        // Only land on one platform per frame
        return;
      }
    }
  }
}
```

**Breaking platforms** set `broken = true` and `breakVy = 0.05`, then `continue` instead of `return`. This means the player does not bounce -- they keep falling and may land on another platform below. The PlatformSystem animates the broken platform falling away each frame.

**Spring platforms** use `SPRING_FORCE` (-0.85) instead of `JUMP_FORCE` (-0.55), launching the player roughly 55% higher. The `springTimer` triggers a visual compression animation in the renderer.

---

### 3. Update the Game Renderer

**File:** `src/games/doodle-jump/renderers/GameRenderer.ts`

Color-code each platform type and add visual details:

```typescript
import type { DoodleState } from '../types';

export class GameRenderer {
  render(ctx: CanvasRenderingContext2D, state: DoodleState): void {
    this.drawBackground(ctx, state);

    ctx.save();
    ctx.translate(0, -state.cameraY);

    this.drawPlatforms(ctx, state);
    this.drawPlayer(ctx, state);

    ctx.restore();
  }

  private drawBackground(ctx: CanvasRenderingContext2D, state: DoodleState): void {
    const { canvasW, canvasH, cameraY } = state;

    ctx.fillStyle = '#faf8ef';
    ctx.fillRect(0, 0, canvasW, canvasH);

    const gridSize = 30;
    ctx.strokeStyle = 'rgba(200, 210, 230, 0.4)';
    ctx.lineWidth = 0.5;

    const offsetY = -(cameraY % gridSize);
    for (let y = offsetY; y < canvasH; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvasW, y);
      ctx.stroke();
    }

    for (let x = 0; x < canvasW; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvasH);
      ctx.stroke();
    }
  }

  private drawPlatforms(ctx: CanvasRenderingContext2D, state: DoodleState): void {
    for (const plat of state.platforms) {
      ctx.save();

      // Platform colors by type
      let color: string;
      switch (plat.type) {
        case 'normal':
          color = '#4caf50'; // green
          break;
        case 'moving':
          color = '#2196f3'; // blue
          break;
        case 'breaking':
          color = plat.broken ? '#8d6e63' : '#a1887f'; // brown, darker when broken
          break;
        case 'spring':
          color = '#f44336'; // red
          break;
      }

      // Platform body
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(plat.x, plat.y, plat.width, plat.height, 4);
      ctx.fill();

      // Top highlight
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.fillRect(plat.x + 2, plat.y + 1, plat.width - 4, 3);

      // Border
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(plat.x, plat.y, plat.width, plat.height, 4);
      ctx.stroke();

      // Breaking platform cracks
      if (plat.type === 'breaking' && !plat.broken) {
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.lineWidth = 1;
        const mx = plat.x + plat.width / 2;
        const my = plat.y + plat.height / 2;
        ctx.beginPath();
        ctx.moveTo(mx - 8, my - 3);
        ctx.lineTo(mx, my + 2);
        ctx.lineTo(mx + 6, my - 4);
        ctx.stroke();
      }

      // Spring coil on spring platforms
      if (plat.type === 'spring') {
        this.drawSpring(ctx, plat.x + plat.width / 2, plat.y, plat.springTimer > 0);
      }

      ctx.restore();
    }
  }

  private drawSpring(
    ctx: CanvasRenderingContext2D,
    cx: number,
    platTop: number,
    compressed: boolean,
  ): void {
    const coilHeight = compressed ? 6 : 14;
    const coilWidth = 10;
    const coils = 3;
    const startY = platTop - coilHeight;

    // Spring base on platform
    ctx.fillStyle = '#ff8a80';
    ctx.fillRect(cx - 8, platTop - 3, 16, 3);

    // Coil segments
    ctx.strokeStyle = '#d32f2f';
    ctx.lineWidth = 2;
    ctx.beginPath();

    const segH = coilHeight / coils;
    for (let i = 0; i < coils; i++) {
      const y1 = startY + i * segH;
      const y2 = startY + (i + 0.5) * segH;
      const y3 = startY + (i + 1) * segH;
      const dir = i % 2 === 0 ? 1 : -1;

      if (i === 0) {
        ctx.moveTo(cx, y1);
      }
      ctx.lineTo(cx + coilWidth * dir, y2);
      ctx.lineTo(cx, y3);
    }

    ctx.stroke();

    // Spring top cap
    ctx.fillStyle = '#e57373';
    ctx.beginPath();
    ctx.arc(cx, startY, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawPlayer(ctx: CanvasRenderingContext2D, state: DoodleState): void {
    const p = state.player;

    ctx.save();
    ctx.translate(p.x + p.width / 2, p.y + p.height / 2);

    if (!p.facingRight) {
      ctx.scale(-1, 1);
    }

    const hw = p.width / 2;
    const hh = p.height / 2;

    // Body
    ctx.fillStyle = '#66bb6a';
    ctx.beginPath();
    ctx.ellipse(0, 2, hw, hh - 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#388e3c';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Belly
    ctx.fillStyle = '#a5d6a7';
    ctx.beginPath();
    ctx.ellipse(0, 6, hw * 0.6, hh * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.ellipse(-5, -8, 6, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(5, -8, 6, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    // Pupils
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(-3, -8, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(7, -8, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Nose/snout
    ctx.fillStyle = '#4caf50';
    ctx.beginPath();
    ctx.ellipse(2, -2, 8, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Nostrils
    ctx.fillStyle = '#2e7d32';
    ctx.beginPath();
    ctx.arc(-1, -2, 1.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(5, -2, 1.2, 0, Math.PI * 2);
    ctx.fill();

    // Legs
    ctx.fillStyle = '#66bb6a';
    ctx.beginPath();
    ctx.ellipse(-8, hh - 2, 6, 4, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(8, hh - 2, 6, 4, 0.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}
```

**Visual cues help the player react:**
- Green = safe, always bounces
- Blue = moving, requires timing
- Brown = fragile, look for the crack lines
- Red = spring with a coil sitting on top

The spring coil is drawn as a zigzag line with a small circle cap. When `springTimer > 0` (just after the player bounced), the coil draws compressed (6px tall instead of 14px) for a satisfying squish effect.

---

### 4. Update the Engine

**File:** `src/games/doodle-jump/DoodleEngine.ts`

No structural changes needed. The engine already runs PlatformSystem and CollisionSystem from Step 2. The new platform type logic lives entirely within those systems and the renderer.

---

## Test It

1. **Run:** `npm run dev`
2. **Navigate:** Select "Doodle Jump"
3. **Observe:**
   - Green, blue, brown, and red platforms appear
   - Blue platforms slide left and right -- land on them while they move
   - Brown platforms crumble and fall when you step on them (no bounce)
   - Red platforms have a visible spring coil -- they launch you much higher
   - The spring coil visually compresses for 300ms after bouncing
   - Early in the game, most platforms are green. As you climb, more special types appear.

---

## Challenges

**Easy:**
- Change the spring platform color from red to orange
- Make moving platforms faster (double `MOVING_SPEED`)
- Make the breaking platform crack pattern more elaborate

**Medium:**
- Add a "vanishing" platform that fades away 2 seconds after first appearing
- Make the spring coil animate expanding back to full height instead of snapping

**Hard:**
- Add a "conveyor" platform that pushes the player left or right when standing on it
- Implement a "cloud" platform that can only be bounced on once, then slowly fades away

---

## What You Learned

- Using a type discriminator field to drive polymorphic behavior without inheritance
- Moving platform logic: velocity, boundary checks, direction reversal
- Breaking platform lifecycle: detect contact, set broken flag, animate the fall
- Spring animation with a timer-based compressed state
- Difficulty scaling by shifting the random type distribution based on score

**Next:** Procedural generation -- removing old platforms and spawning new ones!
