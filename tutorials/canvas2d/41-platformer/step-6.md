# Step 6: Multiple Levels & Checkpoints

**Goal:** Add a goal system that detects level completion, transitions to harder levels, and handles win/restart flow through click interactions.

**Time:** ~15 minutes

---

## What You'll Build

- **Goal system** that triggers level completion when the player reaches the flag
- **Level transitions** that generate progressively harder levels
- **Win overlay** displaying the score and prompting for the next level
- **Game over flow** that restarts from level 1
- **Procedural difficulty scaling** with more platforms, faster enemies, and higher elevations

---

## Concepts

- **Goal Detection**: The simplest win condition is a position check: `if (px > goalX) state.won = true`. The goal flag is placed at the end of the level, so crossing it means the player traversed all obstacles. No AABB needed -- just an x-coordinate threshold.
- **Procedural Difficulty**: The `buildLevel(level)` function uses the level number to scale everything: `8 + level * 3` platforms (more to traverse), `3 + level` enemies (more to avoid), `50 + level * 10` enemy speed (faster patrols), and `- level * 10` platform height (higher jumps needed). The same function produces a unique experience each time.
- **State Replacement**: When transitioning levels, we replace the entire `PlatState` with a fresh one from `buildLevel()`. This cleanly resets all entities, camera position, and player state without needing a complex reset function.
- **Click-Based State Machine**: The game has four states: `!started` (title screen), playing, `gameOver`, and `won`. Click behavior differs in each state. This is a simple finite state machine driven by boolean flags.

---

## Code

### 1. Create the Goal System

**File:** `src/contexts/canvas2d/games/platformer/systems/GoalSystem.ts`

Checks if the player has passed the goal flag position.

```typescript
import type { Updatable } from '@core/Updatable';
import type { PlatState } from '../types';

export class GoalSystem implements Updatable<PlatState> {
  update(state: PlatState, _dt: number): void {
    if (state.px > state.goalX) {
      state.won = true;
    }
  }
}
```

**What's happening:**
- This is the entire goal system: one condition. When the player's x position exceeds `goalX`, the level is complete.
- Setting `state.won = true` causes two things: the engine's `loop()` stops calling `update()` (freezing the game), and the `HUDRenderer` shows the "LEVEL COMPLETE" overlay.
- The `GoalSystem` runs after all other systems, so it checks the player's final resolved position for the frame.

---

### 2. Review the Level Builder's Difficulty Scaling

The `buildLevel()` function we created in Step 1 already handles difficulty scaling. Here is how the level number affects generation:

```typescript
// More platforms to traverse
const count = 8 + level * 3;
// Level 1: 11 platforms, Level 2: 14, Level 3: 17...

// Platforms get higher each level
const py = 300 + Math.sin(i * 0.7) * 150 - level * 10;
// Level 1: base 290, Level 2: base 280, Level 3: base 270...

// More enemies
for (let i = 0; i < 3 + level; i++) { ... }
// Level 1: 4 enemies, Level 2: 5, Level 3: 6...

// Faster enemies
speed: 50 + level * 10,
// Level 1: 60 px/s, Level 2: 70 px/s, Level 3: 80 px/s...

// Goal further away
const goalX = 200 + count * 250;
// Level 1: 2950px, Level 2: 3700px, Level 3: 4450px...
```

**What's happening:**
- Each level parameter scales linearly with the level number. This means difficulty increases smoothly -- no sudden spikes that frustrate the player.
- The `Math.random()` calls in platform placement mean even replaying the same level gives a slightly different layout. Combined with level scaling, this provides strong replayability.
- The goal position (`goalX`) scales with platform count, so longer levels always end with a flag that is proportionally further away.

---

### 3. Review the Click Handler

The `handleClick()` method in `PlatformerEngine.ts` (created in Step 3) manages all state transitions:

```typescript
private handleClick(e: MouseEvent): void {
  const rect = this.canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (this.canvas.width / rect.width);
  const y = (e.clientY - rect.top) * (this.canvas.height / rect.height);

  if (x < 80 && y < 40) {
    this.onExit();
    return;
  }

  const s = this.state;

  if (!s.started) {
    s.started = true;
    return;
  }

  if (s.gameOver || s.won) {
    this.state = buildLevel(s.won ? s.level + 1 : 1);
    this.state.started = true;
  }
}
```

**What's happening:**
- **Exit check**: If the click is in the top-left corner (x < 80, y < 40), the "< EXIT" button was pressed.
- **Title screen**: If the game has not started, clicking anywhere starts it.
- **Win**: Clicking builds the next level (`s.level + 1`) and starts immediately. The score resets because `buildLevel()` returns a fresh state with `score: 0`.
- **Game over**: Clicking restarts from level 1 with a fresh state.
- The `this.state = buildLevel(...)` line replaces the entire state object. All systems reference `this.state`, so the next frame picks up the new level automatically.

---

### 4. Review the HUD Overlay States

The `HUDRenderer` (created in Step 3) already handles all three overlay states:

```typescript
if (!s.started) {
  this.drawOverlay(ctx, W, H,
    "PLATFORMER",
    "Arrow keys / WASD to move, Space to jump\nClick to start",
    "#60a5fa");
} else if (s.gameOver) {
  this.drawOverlay(ctx, W, H,
    "GAME OVER",
    `Score: ${s.score}  |  Click to restart`,
    "#ef4444");
} else if (s.won) {
  this.drawOverlay(ctx, W, H,
    `LEVEL ${s.level} COMPLETE!`,
    `Score: ${s.score}  |  Click for next level`,
    "#4ade80");
}
```

**What's happening:**
- The title screen uses the game's brand color (`#60a5fa`, blue).
- Game over uses red (`#ef4444`) to signal failure.
- Level complete uses green (`#4ade80`) to signal success.
- The `drawOverlay()` helper adds a dark semi-transparent backdrop and a glowing title with `shadowBlur`, making it readable regardless of the world behind it.

---

### 5. Update the Engine

**File:** `src/contexts/canvas2d/games/platformer/PlatformerEngine.ts`

Add the `GoalSystem` to the systems array. It should run after `CoinSystem` and before `CameraSystem`.

Add this import:

```typescript
import { GoalSystem } from "./systems/GoalSystem";
```

And update the systems array:

```typescript
this.systems = [
  this.inputSystem,
  new PhysicsSystem(),
  new CollisionSystem(),
  new EnemySystem(),
  new CoinSystem(),
  new GoalSystem(),
  new CameraSystem(canvas),
];
```

**What's happening:**
- The full system pipeline is now: Input -> Physics -> Collision -> Enemy -> Coin -> Goal -> Camera.
- `GoalSystem` is placed just before `CameraSystem` because there is no point updating the camera after the level is won. Once `state.won = true`, the engine loop stops calling `update()` entirely.

---

## Test It

1. **Run:** `npm run dev`
2. **Open:** the Platformer game in your browser
3. **Observe:**
   - Play through the level by running right, jumping over gaps, and avoiding enemies
   - Reach the **red flag** at the end -- a green **"LEVEL 1 COMPLETE!"** overlay appears
   - Click to start **Level 2** -- notice more platforms, more enemies, and faster patrols
   - Lose all lives -- the red **"GAME OVER"** overlay shows your final score
   - Click to restart from **Level 1** with a fresh score
   - Each level is **longer** and **harder** than the last
   - The score in the HUD updates as you collect coins and stomp enemies

---

## Challenges

**Easy:**
- Make the score carry over between levels: save the current score before calling `buildLevel()` and restore it on the new state.
- Add the level number to the game over message so the player knows how far they got.

**Medium:**
- Add a checkpoint system: place a checkpoint flag at the halfway point of each level. When the player dies, respawn at the checkpoint instead of the level start. Store the checkpoint x/y on the state.

**Hard:**
- Add a level select screen: after 3 levels, show a "You Win!" screen with total score and three star ratings (1 star for completing, 2 for collecting 50%+ coins, 3 for no deaths). Let the player click to replay any level.

---

## What You Learned

- Implementing goal detection with a simple position threshold
- Using procedural generation to create increasingly difficult levels from the same function
- Managing game state transitions (start, win, game over) with a click-based state machine
- Replacing the entire game state for clean level transitions
- Designing overlay screens with contextual colors and messages

**Next:** Polish & Juice -- add particles, screen shake, coyote time, and wall sliding to make the game feel amazing!
