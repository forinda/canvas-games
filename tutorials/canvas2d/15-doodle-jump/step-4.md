# Step 4: Procedural Generation

**Goal:** Remove platforms that fall below the camera and continuously spawn new ones above. Scale difficulty as the player climbs higher.

**Time:** ~15 minutes

---

## What You'll Build

Building on Step 3:
- **Platform cleanup**: Remove any platform that scrolls below the bottom of the screen
- **Dynamic spawning**: Generate new platforms above the camera to maintain a constant count
- **Difficulty scaling**: As score increases, gaps widen and special platform types appear more often
- **Infinite play**: The player can climb forever -- the world generates endlessly

---

## Concepts

- **Object Pooling via Filter**: Remove off-screen platforms with `Array.filter()`. No complex pool needed -- JavaScript's garbage collector handles the rest.
- **Highest-Platform Tracking**: New platforms spawn relative to the highest existing platform, guaranteeing reachable gaps.
- **Difficulty Curve**: A `difficulty` value from 0 to 1 (mapped from score) controls gap size and platform type distribution.

---

## Code

### 1. Update the Platform System

**File:** `src/contexts/canvas2d/games/doodle-jump/systems/PlatformSystem.ts`

Add cleanup, spawning, and a helper to find the highest platform:

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
      if (plat.type === 'moving') {
        plat.x += plat.moveVx * dt;
        if (plat.x <= plat.moveMinX || plat.x + plat.width >= plat.moveMaxX) {
          plat.moveVx = -plat.moveVx;
        }
      }

      if (plat.broken) {
        plat.breakVy += 0.001 * dt;
        plat.y += plat.breakVy * dt;
      }

      if (plat.springTimer > 0) {
        plat.springTimer = Math.max(0, plat.springTimer - dt);
      }
    }

    // Remove platforms that fall below the camera viewport
    const bottomEdge = state.cameraY + state.canvasH + 50;
    state.platforms = state.platforms.filter((pl) => pl.y < bottomEdge);

    // Generate new platforms above the camera to maintain count
    while (state.platforms.length < PLATFORM_COUNT) {
      const highestY = this.getHighestPlatformY(state);
      const gap = 40 + Math.random() * (state.canvasH / (PLATFORM_COUNT * 0.8));
      const newY = highestY - gap;
      const newPlat = this.createPlatform(newY, state.canvasW, state.score);
      state.platforms.push(newPlat);
    }
  }

  /** Generate the initial set of platforms for a new game */
  generateInitial(canvasW: number, canvasH: number): Platform[] {
    const platforms: Platform[] = [];
    const gap = canvasH / PLATFORM_COUNT;

    for (let i = 0; i < PLATFORM_COUNT; i++) {
      const y = canvasH - (i + 1) * gap;

      if (i === 0) {
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

  private getHighestPlatformY(state: DoodleState): number {
    let highest = state.cameraY + state.canvasH;
    for (const p of state.platforms) {
      if (p.y < highest) {
        highest = p.y;
      }
    }
    return highest;
  }

  private createPlatform(y: number, canvasW: number, score: number): Platform {
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
    const difficulty = Math.min(score / 500, 1);

    if (r < 0.55 - difficulty * 0.2) return 'normal';
    if (r < 0.75) return 'moving';
    if (r < 0.90) return 'breaking';
    return 'spring';
  }
}
```

**The generation loop explained:**

```
while (state.platforms.length < PLATFORM_COUNT) {
```

This `while` loop runs until we have at least `PLATFORM_COUNT` (12) platforms. Each iteration:

1. **Find the highest platform** -- scan the array for the smallest `y` value
2. **Pick a random gap** -- between 40px and `canvasH / (PLATFORM_COUNT * 0.8)` pixels. The denominator ensures the gap is never so large that the player cannot reach the next platform with a normal jump.
3. **Create a new platform** at `highestY - gap` (above the current highest)
4. **Push it** into the array

Because we spawn relative to the current highest platform, each new platform is guaranteed to be above the last. The player always has somewhere to go.

**The cleanup filter:**

```
const bottomEdge = state.cameraY + state.canvasH + 50;
state.platforms = state.platforms.filter((pl) => pl.y < bottomEdge);
```

The `+ 50` buffer keeps platforms alive slightly below the visible area. Without it, a platform at the very bottom edge would flicker in and out as it crosses the boundary.

**Difficulty scaling breakdown:**

| Score | `difficulty` | Normal % | Moving % | Breaking % | Spring % |
|-------|-------------|----------|----------|------------|----------|
| 0     | 0.0         | 55%      | 20%      | 15%        | 10%      |
| 250   | 0.5         | 45%      | 20%      | 15%        | 10%      |
| 500+  | 1.0         | 35%      | 20%      | 15%        | 10%      |

The gap size calculation also naturally makes the game harder as the player climbs. The random component means some gaps will be large and others small, creating varied terrain.

---

### 2. No Other File Changes

All other files remain exactly as they were in Step 3. The generation and cleanup logic lives entirely within `PlatformSystem.update()`. The renderer already handles all four platform types, and the collision system already handles all four behaviors.

This is the power of the system architecture: adding a major feature (infinite world generation) required changes to only one file.

---

## Test It

1. **Run:** `npm run dev`
2. **Navigate:** Select "Doodle Jump"
3. **Observe:**
   - Platforms below the screen disappear as you climb
   - New platforms appear above -- you never run out
   - The game plays infinitely as long as you keep landing on platforms
   - Early platforms are mostly green. After climbing for a while, you see more blue and brown platforms
   - The score tracks your maximum height (visible in the console or state -- we add the HUD display in Step 5)
   - Breaking platforms that crumble also get cleaned up once they fall below the viewport

---

## Challenges

**Easy:**
- Change `PLATFORM_COUNT` to 8 for a sparser, harder game
- Add a minimum gap of 60px between platforms
- Print the difficulty value to the console each time a platform spawns

**Medium:**
- Add "zones" -- every 1000 score points, dramatically change the platform distribution for 500 points (e.g., all moving platforms)
- Guarantee that at least every third platform is normal so the player always has a safe option

**Hard:**
- Implement a look-ahead system that validates every newly generated platform is reachable from at least one platform below it (given the player's max jump height and horizontal speed)
- Add a seed-based random number generator so players can share and replay the same level layout

---

## What You Learned

- Cleaning up off-screen objects with a filter pass to prevent memory growth
- Spawning new objects relative to existing ones to guarantee reachability
- Using a `while` loop to maintain a target object count
- Difficulty curves that map score to gameplay parameters
- Keeping a buffer zone past the viewport edge to prevent visual popping

**Next:** Score display, game over, and visual polish!
