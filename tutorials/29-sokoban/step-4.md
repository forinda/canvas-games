# Step 4: Undo System

**Goal:** Implement undo with a snapshot stack so players can take back moves with Z.

**Time:** ~15 minutes

---

## What You'll Build

- **Snapshot stack** that saves player and box positions before each move
- **Z key to undo** -- pops the last snapshot and restores positions
- **R key to restart** -- reloads the current level from scratch
- **Unlimited undo** -- take back as many moves as you want
- **Move counter decrement** on undo

---

## Concepts

- **Snapshot Pattern**: Before each move, push a copy of `{ player, boxes }` onto a stack. To undo, pop the latest snapshot and restore.
- **Deep Copy**: Box positions must be copied with spread/map, not by reference, or undo would restore the *same* mutated objects.
- **Stack vs Queue**: A stack (LIFO) naturally gives us the most recent state when we pop.

---

## Code

### 1. The Snapshot is Already Saved

In Step 2, the MoveSystem already saves snapshots before each move:

```typescript
state.undoStack.push({
  player: { ...state.player },
  boxes: state.boxes.map((b) => ({ ...b })),
});
```

This means every move already has its "before" state stored. We just need to pop it.

---

### 2. Update the Level System

**File:** `src/games/sokoban/systems/LevelSystem.ts`

Add undo processing to the update method.

```typescript
update(state: SokobanState, _dt: number): void {
  // Handle undo
  if (state.undoRequested) {
    state.undoRequested = false;
    if (state.undoStack.length > 0) {
      const snap = state.undoStack.pop()!;
      state.player = snap.player;
      state.boxes = snap.boxes;
      state.moves = Math.max(0, state.moves - 1);
    }
  }

  // Handle restart
  if (state.restartRequested) {
    state.restartRequested = false;
    this.loadLevel(state, state.level);
    return;
  }

  // Handle advance
  if (state.advanceRequested) {
    state.advanceRequested = false;
    if (state.level + 1 < LEVELS.length) this.loadLevel(state, state.level + 1);
    return;
  }

  // Win detection
  if (!state.levelComplete) {
    let allCovered = true;
    for (let y = 0; y < state.height; y++) {
      for (let x = 0; x < state.width; x++) {
        if (state.grid[y][x] === Cell.Target) {
          if (!state.boxes.some((b) => b.x === x && b.y === y)) { allCovered = false; break; }
        }
      }
      if (!allCovered) break;
    }
    if (allCovered) {
      state.levelComplete = true;
      if (state.level + 1 >= LEVELS.length) state.gameWon = true;
    }
  }
}
```

**What's happening:**
- When `undoRequested` is true, we pop the most recent snapshot from `undoStack`.
- `snap.player` and `snap.boxes` are the positions from *before* the last move, so restoring them reverses the move.
- `moves` is decremented (minimum 0) so the counter stays accurate.

---

### 3. Update the Input System

**File:** `src/games/sokoban/systems/InputSystem.ts`

Add Z for undo and ensure R restarts.

```typescript
import type { SokobanState, Dir } from '../types';

const DIR_MAP: Record<string, Dir> = {
  ArrowUp: { dx: 0, dy: -1 }, ArrowDown: { dx: 0, dy: 1 },
  ArrowLeft: { dx: -1, dy: 0 }, ArrowRight: { dx: 1, dy: 0 },
  w: { dx: 0, dy: -1 }, s: { dx: 0, dy: 1 },
  a: { dx: -1, dy: 0 }, d: { dx: 1, dy: 0 },
};

export class InputSystem {
  private handler: (e: KeyboardEvent) => void;
  private state: SokobanState;
  private onExit: () => void;

  constructor(state: SokobanState, onExit: () => void) {
    this.state = state;
    this.onExit = onExit;
    this.handler = (e: KeyboardEvent) => this.handleKey(e);
  }

  attach(): void { window.addEventListener('keydown', this.handler); }
  detach(): void { window.removeEventListener('keydown', this.handler); }

  private handleKey(e: KeyboardEvent): void {
    if (e.key === 'Escape') { e.preventDefault(); this.onExit(); return; }

    // Level complete -- advance
    if (this.state.levelComplete && !this.state.gameWon) {
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); this.state.advanceRequested = true; }
      return;
    }
    // Game won -- restart
    if (this.state.gameWon) {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault(); this.state.level = 0;
        this.state.restartRequested = true; this.state.gameWon = false;
      }
      return;
    }
    if (this.state.levelComplete) return;

    // Undo
    if (e.key === 'z' || e.key === 'Z') { e.preventDefault(); this.state.undoRequested = true; return; }
    // Restart
    if (e.key === 'r' || e.key === 'R') { e.preventDefault(); this.state.restartRequested = true; return; }
    // Direction
    const dir = DIR_MAP[e.key];
    if (dir) { e.preventDefault(); this.state.queuedDir = dir; }
  }
}
```

---

### 4. Update the HUD

Add undo hint to the control bar.

```typescript
// In HUDRenderer.drawTopBar, update the hints text:
ctx.fillText('[Z] Undo  [R] Restart  [ESC] Exit', W - 12, 22);
```

---

## Test It

1. **Run:** `npm run dev`
2. **Open:** the Sokoban game
3. **Observe:**
   - Make several moves, then press **Z** -- the last move is undone
   - Press Z repeatedly -- each move is undone one at a time, all the way back to the start
   - The **move counter decrements** with each undo
   - Push a box into a corner, then **undo** to rescue it
   - Press **R** to restart the level completely (undo stack is cleared)

---

## Challenges

**Easy:**
- Display the undo stack size in the HUD (e.g., "Undos: 15").

**Medium:**
- Implement a redo system (Ctrl+Z for undo, Ctrl+Y for redo).

**Hard:**
- Limit the undo stack to 100 entries to save memory on very long play sessions.

---

## What You Learned

- The snapshot/memento pattern for undo functionality
- Deep copying object arrays to avoid reference sharing
- Stack-based (LIFO) state restoration
- Decrementing counters on undo to maintain accuracy
- The importance of separating input requests from state mutations

**Next:** Polish -- box-on-target coloring, level counter, moves display, and overlays!
