# Step 6: Undo, Reset & Polish

**Goal:** Add undo for placed pieces, polish the visuals, implement a star rating system, and finalize the game entry point.

**Time:** ~15 minutes

---

## What You'll Build

- **Undo system** that removes the last placed piece and restores it to inventory
- **Star rating** based on how few pieces the player used to solve each level
- **Visual polish**: particle-like glow on the solved overlay, refined body rendering
- **Final game entry point** that exports a clean `GameDefinition` for the game launcher
- **Complete platform adapter** with proper setup and teardown

---

## Concepts

- **Undo as Stack Reversal**: Each piece placement pushes to the body array and increments `selectedInventory`. Undoing reverses both: pop the last body, decrement the counter. This is simpler than a full undo stack because placements are strictly sequential.
- **Star Rating**: A common game polish pattern. Three stars = perfect (used minimum pieces), two stars = one extra piece, one star = completed at all. This gives replay incentive without blocking progression.
- **Game Definition Pattern**: The final `index.ts` exports a `GameDefinition` object with metadata (name, icon, color, help text) and a `create()` factory. This lets a game launcher display and instantiate games uniformly.
- **Clean Teardown**: `destroy()` must cancel the animation frame and remove all event listeners. Forgetting this causes memory leaks when switching between games.

---

## Code

### 1. Add Undo to the Input System

**File:** `src/games/physics-puzzle/systems/InputSystem.ts`

Add an undo keybinding that removes the last placed piece.

```typescript
import type { PuzzleState } from '../types';
import type { InventorySystem } from './InventorySystem';
import { buildLevel } from '../data/levels';

export class InputSystem {
  private canvas: HTMLCanvasElement;
  private onExit: () => void;
  private getState: () => PuzzleState;
  private setState: (s: PuzzleState) => void;
  private inventory: InventorySystem;

  private keyHandler: (e: KeyboardEvent) => void;
  private clickHandler: (e: MouseEvent) => void;
  private moveHandler: (e: MouseEvent) => void;
  private upHandler: (e: MouseEvent) => void;
  private resizeHandler: () => void;

  constructor(
    canvas: HTMLCanvasElement,
    onExit: () => void,
    getState: () => PuzzleState,
    setState: (s: PuzzleState) => void,
    inventory: InventorySystem,
  ) {
    this.canvas = canvas;
    this.onExit = onExit;
    this.getState = getState;
    this.setState = setState;
    this.inventory = inventory;

    this.keyHandler = (e) => {
      if (e.key === 'Escape') this.onExit();
      if (e.key === ' ') this.toggleSim();
      if (e.key === 'r')
        this.setState(
          buildLevel(this.getState().level, this.canvas.width, this.canvas.height),
        );
      if (e.key === 'z' || e.key === 'u') this.undoPlace();
    };
    this.clickHandler = (e) => this.handleClick(e);
    this.moveHandler = (e) => this.handleMove(e);
    this.upHandler = () => {
      this.getState().dragging = null;
    };
    this.resizeHandler = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
  }

  attach(): void {
    window.addEventListener('keydown', this.keyHandler);
    this.canvas.addEventListener('mousedown', this.clickHandler);
    this.canvas.addEventListener('mousemove', this.moveHandler);
    this.canvas.addEventListener('mouseup', this.upHandler);
    window.addEventListener('resize', this.resizeHandler);
  }

  detach(): void {
    window.removeEventListener('keydown', this.keyHandler);
    this.canvas.removeEventListener('mousedown', this.clickHandler);
    this.canvas.removeEventListener('mousemove', this.moveHandler);
    this.canvas.removeEventListener('mouseup', this.upHandler);
    window.removeEventListener('resize', this.resizeHandler);
  }

  private toggleSim(): void {
    const s = this.getState();

    if (s.solved) {
      const next = buildLevel(s.level + 1, this.canvas.width, this.canvas.height);
      next.started = true;
      next.score = s.score; // carry score forward
      this.setState(next);
      return;
    }

    s.simulating = !s.simulating;
    s.started = true;
  }

  private undoPlace(): void {
    const s = this.getState();
    if (s.simulating || s.solved) return;
    if (s.selectedInventory <= 0) return;

    // Remove last placed body
    s.bodies.pop();
    s.selectedInventory--;
    s.placed--;
    s.message = `Undid piece. ${s.inventory.length - s.selectedInventory} remaining.`;
  }

  private handleClick(e: MouseEvent): void {
    const { x, y } = this.getCoords(e);

    if (x < 80 && y < 40) {
      this.onExit();
      return;
    }

    const s = this.getState();

    if (!s.started) {
      s.started = true;
      return;
    }

    if (s.solved) {
      const next = buildLevel(s.level + 1, this.canvas.width, this.canvas.height);
      next.started = true;
      next.score = s.score;
      this.setState(next);
      return;
    }

    if (s.simulating) return;

    // Place piece from inventory
    this.inventory.placeSelected(s, x, y);
  }

  private handleMove(e: MouseEvent): void {
    const s = this.getState();

    if (s.dragging !== null) {
      const { x, y } = this.getCoords(e);
      const body = s.bodies.find((b) => b.id === s.dragging);

      if (body && !s.simulating) {
        body.x = x - s.dragOffX;
        body.y = y - s.dragOffY;
      }
    }
  }

  private getCoords(e: MouseEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (this.canvas.width / rect.width),
      y: (e.clientY - rect.top) * (this.canvas.height / rect.height),
    };
  }
}
```

**What's happening:**
- Pressing **Z** or **U** calls `undoPlace()`. We chose two keys so both "undo" (U) and the common Ctrl+Z muscle memory (Z without modifier) work.
- `undoPlace()` checks guards: no undo during simulation, when solved, or when nothing has been placed. Then it pops the last body from the array and decrements `selectedInventory`, effectively returning the piece to inventory.
- The score is now carried forward between levels with `next.score = s.score` so the total accumulates across the entire session.
- The message updates to show how many pieces remain after the undo.

---

### 2. Add Star Rating to the HUD

**File:** `src/games/physics-puzzle/renderers/HUDRenderer.ts`

Update the solved overlay to show a star rating based on pieces used.

```typescript
import type { PuzzleState } from '../types';

export class HUDRenderer {
  render(ctx: CanvasRenderingContext2D, state: PuzzleState): void {
    const canvas = ctx.canvas;
    const W = canvas.width;

    // HUD bar
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, W, 40);
    ctx.font = 'bold 14px monospace';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#666';
    ctx.textAlign = 'left';
    ctx.fillText('< EXIT', 12, 20);
    ctx.fillStyle = '#f59e0b';
    ctx.textAlign = 'center';
    ctx.fillText(`Level ${state.level}  |  Score: ${state.score}`, W / 2, 20);

    // Undo hint
    if (!state.simulating && !state.solved && state.placed > 0) {
      ctx.fillStyle = '#888';
      ctx.textAlign = 'right';
      ctx.font = '12px monospace';
      ctx.fillText('[Z] Undo  |  [SPACE] Simulate', W - 12, 20);
    }

    // Message
    if (state.message && !state.simulating) {
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(0, 44, W, 30);
      ctx.font = '13px monospace';
      ctx.fillStyle = '#ccc';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(state.message, W / 2, 59);
    }

    // Sim indicator
    if (state.simulating) {
      ctx.fillStyle = '#4ade80';
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'right';
      ctx.fillText('SIMULATING...', W - 12, 20);
    }

    // Overlays
    if (!state.started) {
      this.drawOverlay(
        ctx,
        'PHYSICS PUZZLE',
        'Click to place pieces, then SPACE to simulate!\nGuide the ball to the star.\n[Z] Undo  |  [R] Reset',
        '#f59e0b',
      );
    } else if (state.solved) {
      const stars = this.getStars(state);
      const starStr = '\u2B50'.repeat(stars) + '\u2606'.repeat(3 - stars);
      this.drawOverlay(
        ctx,
        `LEVEL ${state.level} SOLVED!`,
        `${starStr}\nPieces used: ${state.placed}/${state.maxPieces}\nScore: ${state.score}  |  Click for next level`,
        '#4ade80',
      );
    }
  }

  private getStars(state: PuzzleState): number {
    const ratio = state.placed / state.maxPieces;
    if (ratio <= 0.5) return 3;  // used half or fewer of max pieces
    if (ratio <= 0.75) return 2;
    return 1;
  }

  private drawOverlay(
    ctx: CanvasRenderingContext2D,
    title: string,
    sub: string,
    color: string,
  ): void {
    const W = ctx.canvas.width, H = ctx.canvas.height;

    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `bold ${Math.min(48, W * 0.06)}px monospace`;
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 20;
    ctx.fillText(title, W / 2, H * 0.3);
    ctx.shadowBlur = 0;
    ctx.font = `${Math.min(14, W * 0.02)}px monospace`;
    ctx.fillStyle = '#aaa';
    const lines = sub.split('\n');
    lines.forEach((line, i) => ctx.fillText(line, W / 2, H * 0.43 + i * 22));
  }
}
```

**What's happening:**
- `getStars()` computes a 1-3 star rating based on the ratio of pieces used to maximum allowed. Using half or fewer earns 3 stars, up to 75% earns 2 stars, and anything more earns 1 star.
- The solved overlay now shows filled stars and empty star outlines (Unicode characters), plus the pieces-used count, encouraging the player to replay with fewer pieces.
- An undo hint (`[Z] Undo`) appears in the HUD when pieces have been placed and the simulation is not running.
- The title overlay now includes all keyboard shortcuts so new players know the controls.

---

### 3. Finalize the Game Entry Point

**File:** `src/games/physics-puzzle/index.ts`

Export a `GameDefinition` with metadata so the game launcher can display and instantiate the game.

```typescript
import { PlatformAdapter } from './adapters/PlatformAdapter';

export const PhysicsPuzzleGame = {
  id: 'physics-puzzle',
  category: 'puzzle' as const,
  name: 'Physics Puzzle',
  description: 'Place pieces, simulate physics!',
  icon: '\uD83E\uDDE9',
  color: '#f59e0b',
  help: {
    goal: 'Place pieces to guide the ball to the star using physics!',
    controls: [
      { key: 'Click', action: 'Place piece from inventory' },
      { key: 'Space', action: 'Start/stop simulation' },
      { key: 'Z/U', action: 'Undo last placed piece' },
      { key: 'R', action: 'Reset level' },
      { key: 'ESC', action: 'Exit to menu' },
    ],
    tips: [
      'Place planks as ramps to redirect the ball',
      'Boxes can act as bridges over gaps',
      'The ball bounces — use walls to your advantage',
      'If the ball falls off screen, press R to retry',
      'Use fewer pieces for a higher star rating',
    ],
  },
  create(canvas: HTMLCanvasElement, onExit: () => void) {
    const inst = new PlatformAdapter(canvas, onExit);
    inst.start();
    return inst;
  },
};
```

**What's happening:**
- The `GameDefinition` object provides everything a launcher needs: a unique `id`, display `name`, `icon` (puzzle piece emoji), theme `color`, and structured `help` with controls and tips.
- `create()` is the factory function. It builds a `PlatformAdapter`, starts the engine, and returns the instance. The launcher can call `destroy()` on the returned object to clean up.
- The help section now includes the undo shortcut and the star rating tip.

---

### 4. Final Platform Adapter

**File:** `src/games/physics-puzzle/adapters/PlatformAdapter.ts`

The complete adapter with engine, input, and inventory wired together.

```typescript
import { PuzzleEngine } from '../PuzzleEngine';
import { InventorySystem } from '../systems/InventorySystem';
import { InputSystem } from '../systems/InputSystem';

export class PlatformAdapter {
  private engine: PuzzleEngine;
  private input: InputSystem;

  constructor(canvas: HTMLCanvasElement, onExit: () => void) {
    this.engine = new PuzzleEngine(canvas);
    const inventory = new InventorySystem();

    this.input = new InputSystem(
      canvas,
      onExit,
      () => this.engine.state,
      (s) => { this.engine.state = s; },
      inventory,
    );

    this.input.attach();
  }

  start(): void {
    this.engine.start();
  }

  destroy(): void {
    this.engine.stop();
    this.input.detach();
  }
}
```

**What's happening:**
- This is the final version of the adapter from Step 3, unchanged. It cleanly composes the engine, inventory system, and input system.
- `destroy()` stops the animation loop and removes all event listeners, preventing memory leaks.

---

## Test It

1. **Run:** `npm run dev`
2. **Open:** the Physics Puzzle game in your browser
3. **Observe the complete game flow:**
   - **Title overlay** with instructions and keyboard shortcuts
   - Click to start, **place pieces** by clicking the canvas
   - Press **Z** to **undo** a placed piece -- it returns to the inventory panel
   - Press **Space** to **simulate** -- the ball falls and bounces
   - Guide the ball to the green star -- the **solved overlay** shows with a **star rating**
   - Click or press Space to load the **next level** with your score carried forward
   - Press **R** to reset and try for a better star rating
   - Press **Escape** to exit to the game menu
4. **Test edge cases:**
   - Undo all pieces, then try to undo again (nothing should happen)
   - Let the ball fall off screen (message appears, simulation pauses)
   - Solve Level 1 with only 1 piece for 3 stars, then with all 3 for 1 star

---

## Challenges

**Easy:**
- Change the star thresholds in `getStars()` so 3 stars requires using only 1 piece.
- Add a "Level X" label above the inventory panel.

**Medium:**
- Persist the high score to `localStorage` and display it in the HUD. Load it on game start.
- Add a "restart game" option that goes back to Level 1 with score reset.

**Hard:**
- Implement a level editor: let the player place static obstacles, set the ball and goal positions, then save the layout as JSON. Load custom levels from a text input.
- Add particle effects when the ball hits the goal: spawn 20 small circles that fly outward and fade.

---

## What You Learned

- Implementing undo by reversing sequential operations (pop body, decrement counter)
- Building a star rating system based on performance metrics
- Structuring a game as a `GameDefinition` with metadata and a factory function
- Ensuring clean teardown with `destroy()` to prevent memory leaks
- Carrying state (score) across level transitions

---

## Complete Architecture

Here is the final file structure for the Physics Puzzle game:

```
src/games/physics-puzzle/
  types.ts              — Body, PuzzleState, makeBody(), constants
  PuzzleEngine.ts       — Game loop, system/renderer pipeline
  index.ts              — GameDefinition export
  adapters/
    PlatformAdapter.ts  — Wires engine + input + inventory
  systems/
    PhysicsSystem.ts    — Gravity, velocity integration, damping
    CollisionSystem.ts  — AABB overlap detection and resolution
    GoalSystem.ts       — Ball-to-goal detection, fall detection
    InventorySystem.ts  — Place pieces from inventory queue
    InputSystem.ts      — Keyboard/mouse handling, undo, reset
  renderers/
    WorldRenderer.ts    — Background gradient, body rendering
    InventoryRenderer.ts — Bottom panel with piece previews
    HUDRenderer.ts      — Top bar, messages, overlays, star rating
  data/
    levels.ts           — Hand-crafted + procedural level generation
```

**Congratulations!** You have built a complete physics puzzle game with gravity simulation, collision detection, piece placement, undo, level progression, and a star rating system. The architecture cleanly separates concerns into systems (update logic), renderers (draw logic), and data (level definitions).

**Next Game:** Continue to [Card Battle](../38-card-battle/README.md) -- where you will learn card game systems and turn-based combat!
