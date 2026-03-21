# Step 2: Ant Movement & Wandering

**Goal:** Give ants natural wandering behavior with smooth turning, boundary bouncing, and task-based movement speeds.

**Time:** ~15 minutes

---

## What You'll Build

- **Random wandering** with organic, curved paths instead of sharp direction changes
- **Smooth angle interpolation** so ants turn gradually toward targets
- **Boundary bouncing** that keeps ants on screen with randomized reflection angles
- **Task-based movement** where idle ants stay near the colony and foragers explore freely
- **Helper utility** for distance calculations reused throughout the codebase

---

## Concepts

- **Angle Interpolation**: Instead of snapping to a new direction, ants blend their current angle toward the target angle by a small factor (15%) each frame. This produces natural curved paths.
- **Wandering Algorithm**: Each frame, the ant's angle is perturbed by a small random value. Over time this creates organic, exploratory movement that covers the area.
- **Boundary Reflection**: When an ant hits a wall, rather than a perfect mirror bounce (which looks mechanical), we add randomness to the reflected angle so ants scatter naturally.
- **Delta-Time Movement**: Speed is multiplied by `dt` (seconds since last frame) so movement is frame-rate independent. A 60fps screen and a 144fps screen produce the same ant speed.

---

## Code

### 1. Update the Ant System with Full Movement

**File:** `src/games/ant-colony/systems/AntSystem.ts`

Expand the `AntSystem` to handle all three task types and add the helper methods we will reuse in later steps.

```typescript
import type { Ant, AntColonyState } from '../types';
import { ANT_SPEED, COLONY_RADIUS } from '../types';

export class AntSystem {
  update(state: AntColonyState, dt: number): void {
    if (state.paused || state.gameOver) return;

    for (const ant of state.ants) {
      switch (ant.task) {
        case 'forage':
          this.updateForager(ant, state, dt);
          break;
        case 'build':
          this.updateBuilder(ant, state, dt);
          break;
        case 'idle':
          this.updateIdle(ant, state, dt);
          break;
      }
    }
  }

  /** Foragers wander freely across the map looking for food */
  private updateForager(ant: Ant, state: AntColonyState, dt: number): void {
    const speed = ANT_SPEED * dt;
    this.wander(ant, state, speed);
  }

  /** Builders wander but we'll add tunnel logic in step 6 */
  private updateBuilder(ant: Ant, state: AntColonyState, dt: number): void {
    const speed = ANT_SPEED * dt;
    this.wander(ant, state, speed);
  }

  /** Idle ants stay near the colony at half speed */
  private updateIdle(ant: Ant, state: AntColonyState, dt: number): void {
    const speed = ANT_SPEED * 0.5 * dt;
    const d = this.dist(ant.x, ant.y, state.colony.x, state.colony.y);

    // If too far from colony, steer back
    if (d > COLONY_RADIUS * 3) {
      this.moveToward(ant, state.colony.x, state.colony.y, speed);
    } else {
      this.wander(ant, state, speed);
    }
  }

  /** Random wandering with boundary bouncing */
  private wander(ant: Ant, state: AntColonyState, speed: number): void {
    // Small random angle perturbation each frame
    ant.angle += (Math.random() - 0.5) * 0.6;

    // Move forward along current angle
    ant.x += Math.cos(ant.angle) * speed;
    ant.y += Math.sin(ant.angle) * speed;

    // Boundary bouncing with randomized reflection
    const margin = 10;

    if (ant.x < margin) {
      ant.x = margin;
      ant.angle = Math.random() * Math.PI - Math.PI / 2; // face right-ish
    }
    if (ant.x > state.width - margin) {
      ant.x = state.width - margin;
      ant.angle = Math.PI + (Math.random() * Math.PI - Math.PI / 2); // face left-ish
    }
    if (ant.y < margin) {
      ant.y = margin;
      ant.angle = Math.random() * Math.PI; // face downward-ish
    }
    if (ant.y > state.height - margin) {
      ant.y = state.height - margin;
      ant.angle = -Math.random() * Math.PI; // face upward-ish
    }
  }

  /** Smooth steering toward a target position */
  private moveToward(ant: Ant, tx: number, ty: number, speed: number): void {
    const dx = tx - ant.x;
    const dy = ty - ant.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < 1) return;

    const targetAngle = Math.atan2(dy, dx);

    // Normalize angle difference to [-PI, PI]
    let angleDiff = targetAngle - ant.angle;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

    // Blend 15% toward target angle each frame
    ant.angle += angleDiff * 0.15;

    // Move forward, clamped so we don't overshoot
    const step = Math.min(speed, distance);
    ant.x += Math.cos(ant.angle) * step;
    ant.y += Math.sin(ant.angle) * step;
  }

  /** Euclidean distance helper */
  private dist(x1: number, y1: number, x2: number, y2: number): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
  }
}
```

**What's happening:**
- `wander()` adds a small random perturbation to the ant's angle each frame (`(Math.random() - 0.5) * 0.6` gives a range of roughly +/-17 degrees). This creates organic, curving paths.
- Boundary handling uses randomized angles rather than mirror reflection. When an ant hits the left wall, its angle is set to a random value facing generally rightward. This prevents ants from getting stuck in repeating bounce patterns.
- `moveToward()` implements smooth steering by blending 15% toward the target angle each frame. Over several frames the ant curves gracefully toward its destination rather than snapping instantly.
- `updateIdle()` checks if the ant is more than 3x the colony radius away. If so, it steers back. Otherwise it wanders freely. This keeps idle ants loosely clustered around home.
- Speed is always `ANT_SPEED * dt` where `dt` is in seconds, making movement frame-rate independent.

---

### 2. Update the Engine to Use Task Switching

**File:** `src/games/ant-colony/AntColonyEngine.ts`

No changes needed -- the engine already calls `antSystem.update()` which now handles all three task types. The `_createInitialState()` method already sets `taskRatio: { forage: 0.6, build: 0.2, idle: 0.2 }` so ants will be split across behaviors.

---

## Test It

1. **Run:** `npm run dev`
2. **Navigate:** Select "Ant Colony" and click to start
3. **Observe:**
   - Ants spread out from the colony in curving, organic paths
   - No ant ever leaves the screen -- they bounce off edges smoothly
   - Ants near walls scatter in random directions rather than mirroring perfectly
   - Some ants (idle ones) linger near the colony while foragers explore further
4. **Experiment:**
   - Press `[1]` several times to increase the forager ratio -- more ants explore outward
   - Press `[3]` to increase idle ratio -- more ants cluster near the colony
   - Notice how idle ants gently steer back when they drift too far

---

## Challenges

**Easy:**
- Increase `ANT_SPEED` to 120 and observe how wandering changes
- Reduce the angle perturbation from `0.6` to `0.2` for straighter paths

**Medium:**
- Add a "sprint" behavior where ants occasionally double their speed for 0.5 seconds
- Make ants avoid each other by steering away when within 10px of another ant

**Hard:**
- Implement a "levy flight" pattern where ants occasionally make large directional jumps, mimicking real ant exploration behavior
- Add acceleration and deceleration so ants speed up gradually and slow down when turning sharply

---

## What You Learned

- Random angle perturbation creates organic wandering paths
- Smooth angle interpolation (15% blend factor) produces natural curved steering
- Randomized boundary reflection prevents mechanical bounce patterns
- Delta-time multiplication ensures frame-rate independent movement
- Task-based behavior switching lets different ants move differently with the same system

**Next:** Pheromone trails -- ants will lay chemical markers that evaporate over time!
