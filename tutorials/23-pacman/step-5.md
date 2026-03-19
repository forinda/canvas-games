# Step 5: Ghost AI Behaviors

**Goal:** Give each ghost a unique chase target, and implement the scatter/chase mode timer that alternates between patrol and pursuit.

**Time:** ~15 minutes

---

## What You'll Build

The four classic ghost personalities:
- **Blinky** (red) -- targets Pac-Man's current tile (direct chase)
- **Pinky** (pink) -- targets 4 tiles ahead of Pac-Man (ambush)
- **Inky** (cyan) -- targets a tile computed from Blinky's position and Pac-Man's facing (flanking)
- **Clyde** (orange) -- chases when far away, scatters when within 8 tiles (shy)
- **Mode timer**: alternates between scatter (7s) and chase (20s) phases globally

---

## Concepts

- **Scatter vs. Chase**: The game alternates between two global modes on a fixed timer. In scatter, each ghost targets its corner. In chase, each ghost uses its unique targeting logic. The timer sequence is: 7s scatter, 20s chase, 7s scatter, 20s chase, 5s scatter, 20s chase, 5s scatter, then chase forever.
- **Mode Reversal**: When the global mode switches, all non-frightened ghosts immediately reverse direction. This gives the player a brief reprieve as ghosts head back the way they came.
- **Blinky's Target**: Simply Pac-Man's current tile. This makes Blinky the most direct and dangerous ghost.
- **Pinky's Target**: 4 tiles ahead of Pac-Man in his current direction. Pinky tries to cut Pac-Man off rather than follow him.
- **Inky's Target**: Take the tile 2 ahead of Pac-Man, then double the vector from Blinky to that tile. This creates a flanking position that depends on Blinky's location -- a clever two-ghost pincer movement.
- **Clyde's Target**: If more than 8 tiles from Pac-Man, target Pac-Man directly (like Blinky). If within 8 tiles, retreat to scatter target. This creates erratic behavior -- Clyde rushes in then chickens out.

---

## Code

### 1. Update the Ghost System

**File:** `src/games/pacman/systems/GhostSystem.ts`

Add mode timers and per-ghost targeting. The `chooseBestDirection`, `canGhostEnter`, `dirToDelta`, and `reverseDir` methods are unchanged from Step 4.

```typescript
import type { PacManState, Ghost, Direction, Position } from '../types';
import { GHOST_SPEED, MODE_DURATIONS } from '../types';

const DIRECTIONS: Direction[] = ['up', 'left', 'down', 'right'];

export class GhostSystem {
  update(state: PacManState, dt: number): void {
    if (state.paused || state.gameOver || !state.started || state.won) return;

    this.updateModeTimers(state, dt);

    for (const ghost of state.ghosts) {
      this.updateGhostRelease(ghost, state, dt);
      if (!ghost.active) continue;
      this.moveGhost(ghost, state, dt);
    }
  }

  private updateModeTimers(state: PacManState, dt: number): void {
    if (state.frightenedTimer > 0) return; // Freeze mode timer during fright

    state.modeTimer += dt;
    const duration = MODE_DURATIONS[state.modeIndex] ?? Infinity;

    if (state.modeTimer >= duration) {
      state.modeTimer = 0;
      state.modeIndex = Math.min(state.modeIndex + 1, MODE_DURATIONS.length - 1);
      state.globalMode = state.modeIndex % 2 === 0 ? 'scatter' : 'chase';

      // Reverse all non-frightened ghosts
      for (const ghost of state.ghosts) {
        if (ghost.mode !== 'frightened' && !ghost.eaten) {
          ghost.mode = state.globalMode;
          ghost.dir = this.reverseDir(ghost.dir);
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
      ghost.mode = state.globalMode;
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

      const target = this.getTarget(ghost, state);
      ghost.dir = this.chooseBestDirection(ghost, state, target);
    }
  }

  private getTarget(ghost: Ghost, state: PacManState): Position {
    // Scatter mode: head to assigned corner
    if (ghost.mode === 'scatter') {
      return ghost.scatterTarget;
    }

    // Chase mode: each ghost has unique targeting
    const pac = state.pacman;
    const px = Math.round(pac.pos.x);
    const py = Math.round(pac.pos.y);

    switch (ghost.name) {
      case 'blinky':
        // Direct chase: target Pac-Man's current tile
        return { x: px, y: py };

      case 'pinky': {
        // Ambush: target 4 tiles ahead of Pac-Man
        const d = this.dirToDelta(pac.dir);
        return { x: px + d.x * 4, y: py + d.y * 4 };
      }

      case 'inky': {
        // Flank: 2 tiles ahead of Pac-Man, then double the vector from Blinky
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
        // Shy: chase if far, scatter if close
        const dist = Math.sqrt(
          (ghost.pos.x - px) ** 2 + (ghost.pos.y - py) ** 2,
        );
        if (dist > 8) {
          return { x: px, y: py };
        }
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

**Mode Timer (`updateModeTimers`):**
- `MODE_DURATIONS` is `[7, 20, 7, 20, 5, 20, 5, Infinity]`. Even indices are scatter durations, odd indices are chase durations.
- `modeIndex` starts at 0 (scatter). When `modeTimer` exceeds the current duration, it resets and advances `modeIndex`.
- `globalMode` is derived: even index = scatter, odd index = chase.
- On every mode switch, all active non-frightened ghosts reverse direction and adopt the new mode. The reversal is crucial -- it gives the player a few seconds of breathing room as ghosts head back the way they came.
- The timer is frozen during frightened mode (`frightenedTimer > 0`), so power pellets do not eat into the scatter/chase cycle.

**Blinky's Chase Target:**
- `{ x: px, y: py }` -- Pac-Man's rounded grid position. Blinky will always head straight for you. He is the most predictable but also the most relentless.

**Pinky's Chase Target:**
- 4 tiles ahead of Pac-Man in his current facing direction. If Pac-Man faces left, Pinky targets 4 tiles to the left. This makes Pinky try to get in front of you. If you are heading toward Pinky, she is heading toward you -- a head-on ambush.

**Inky's Chase Target:**
- First, compute the tile 2 ahead of Pac-Man. Then, draw a vector from Blinky's position to that tile and double it. The result is a point on the opposite side of Pac-Man from Blinky. This creates a pincer: Blinky pushes from behind while Inky flanks from the side. Inky is the most unpredictable ghost because his target depends on two moving entities.

**Clyde's Chase Target:**
- Compute the Euclidean distance from Clyde to Pac-Man. If greater than 8 tiles, chase directly (like Blinky). If within 8 tiles, retreat to his scatter corner (bottom-left). This creates a "shy" behavior -- Clyde approaches, gets close, then runs away. He oscillates between chasing and fleeing, making him the least dangerous but most erratic ghost.

---

## No Changes to Other Files

The renderer and engine from Step 4 work without modification. The `getTarget` method is the only new logic, and it plugs into the existing `moveGhost` flow.

---

## Test It

1. **Run:** `npm run dev`
2. **Open:** the Pac-Man game and start moving
3. **Observe:**
   - For the first 7 seconds, all ghosts scatter to their corners (same as Step 4).
   - After 7 seconds, ghosts switch to chase mode. Watch the behavior change:
     - **Blinky** (red) beelines straight toward you.
     - **Pinky** (pink) tries to get ahead of you. If you are heading right, Pinky aims 4 tiles to the right.
     - **Inky** (cyan) moves erratically, depending on where Blinky is relative to you.
     - **Clyde** (orange) approaches but then retreats when he gets within ~8 tiles.
   - After 20 seconds of chase, ghosts scatter again for 7 seconds. You will see them all reverse direction simultaneously.
   - The cycle continues: 7s scatter, 20s chase, 7s scatter, 20s chase, 5s scatter, 20s chase, 5s scatter, then chase forever.

**Test Pinky's ambush.** Move consistently in one direction along a long corridor. Pinky will try to loop around and come at you from the front.

**Test Clyde's shyness.** Move toward Clyde. He will approach to about 8 tiles away, then suddenly veer off toward the bottom-left corner.

**Test Inky's flanking.** Position yourself between Blinky and Inky. Inky's target will be on the far side of you from Blinky, creating a pincer.

---

## Try It

- Change Pinky's look-ahead from `4` to `8` for an extremely aggressive ambusher.
- Change Clyde's distance threshold from `8` to `3` so he only retreats when very close.
- Set all `MODE_DURATIONS` to `[3, 3, 3, 3, 3, 3, 3, Infinity]` for rapid mode switching.

---

## Challenges

**Easy:**
- Add a `console.log` inside `getTarget` that prints each ghost's target tile. Verify the targeting matches the descriptions above.
- Change Blinky to target 2 tiles behind Pac-Man instead of the current tile.

**Medium:**
- Draw a target marker (small colored X) at each ghost's current target tile. This makes the AI visible.
- Add a "cruise elroy" mode: when fewer than 20 dots remain, Blinky speeds up by 10%.

**Hard:**
- Implement the original game's "overflow bug" for Pinky: when Pac-Man faces up, Pinky's target should be 4 tiles up AND 4 tiles left (a bug in the original arcade code that became a feature).
- Create a fifth ghost with a custom AI behavior of your own design.

---

## What You Learned

- Per-entity AI targeting with a shared movement system
- Scatter/chase mode alternation on a global timer
- Direction reversal as a mode-switch mechanic
- Blinky: direct pursuit (greedy chase)
- Pinky: predictive targeting (look-ahead ambush)
- Inky: relational targeting (depends on another ghost's position)
- Clyde: distance-conditional behavior (approach/retreat threshold)
- Timer freezing during special states (frightened mode)

**Next:** Power pellets turn the tables -- ghosts become frightened and edible.
