# Step 3: Draw-to-Create Lines

**Goal:** Let the player draw lines with the mouse that become physical ramps the ball can collide with.

**Time:** ~15 minutes

---

## What You'll Build

- **Mouse input handling** to track click, drag, and release events
- **Live preview** of the line being drawn before it is placed
- **Line-to-body conversion** that turns drawn lines into thin static planks
- **An inventory system** that limits how many pieces the player can place
- **Coordinate transformation** so mouse positions map correctly to the canvas

---

## Concepts

- **Mouse-to-Canvas Coordinates**: The canvas may be CSS-scaled, so raw `clientX/clientY` must be transformed using `getBoundingClientRect()` and the canvas's logical dimensions. Without this, clicks land in the wrong spot.
- **Line as a Thin Rectangle**: A drawn line from `(x1,y1)` to `(x2,y2)` becomes a plank body. We use the midpoint as position, the distance as width, and a fixed height (16px). Rotation could be added later, but axis-aligned planks work for our AABB collision system.
- **Inventory as a Queue**: The player picks from a list of available pieces. `selectedInventory` tracks which piece is next. Once all pieces are placed, no more can be added.
- **Simulation Gate**: Pieces can only be placed when `simulating` is `false`. Once the player presses Space, the simulation runs and placement is locked.

---

## Code

### 1. Create the Inventory System

**File:** `src/games/physics-puzzle/systems/InventorySystem.ts`

Manages placing pieces from the player's inventory into the world.

```typescript
import type { PuzzleState } from '../types';
import { makeBody } from '../types';

export class InventorySystem {
  placeSelected(state: PuzzleState, x: number, y: number): void {
    if (state.selectedInventory < state.inventory.length) {
      const item = state.inventory[state.selectedInventory];
      const body = makeBody(
        item.type,
        x - item.w / 2,
        y - item.h / 2,
        item.w,
        item.h,
        true,
        item.color,
      );

      state.bodies.push(body);
      state.placed++;
      state.selectedInventory++;
    }
  }
}
```

**What's happening:**
- `placeSelected()` checks whether there are inventory pieces remaining. If so, it grabs the next item, creates a static body centered on the click position, and adds it to the world.
- The piece is placed as a `static` body so it does not fall -- it acts as a platform for the ball.
- `selectedInventory` increments after each placement, acting like a queue pointer through the inventory array.

---

### 2. Create the Input System

**File:** `src/games/physics-puzzle/systems/InputSystem.ts`

Handles keyboard and mouse events for placing pieces, starting simulation, and resetting.

```typescript
import type { PuzzleState } from '../types';
import type { InventorySystem } from './InventorySystem';

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
      if (e.key === 'r') this.resetLevel();
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
    if (s.solved) return;
    s.simulating = !s.simulating;
    s.started = true;
  }

  private resetLevel(): void {
    // Will be implemented properly with buildLevel in Step 5
    const s = this.getState();
    s.simulating = false;
    s.message = 'Reset! Place pieces and press SPACE.';
  }

  private handleClick(e: MouseEvent): void {
    const { x, y } = this.getCoords(e);
    const s = this.getState();

    if (!s.started) {
      s.started = true;
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
- The constructor stores callback closures for each event type. Using arrow functions in the constructor ensures `this` binds correctly and we can cleanly `removeEventListener` later.
- `getCoords()` transforms mouse coordinates from CSS space to canvas logical space. The ratio `canvas.width / rect.width` handles any CSS scaling.
- `handleClick()` delegates to `InventorySystem.placeSelected()` when the simulation is not running. During simulation, clicks are ignored.
- `toggleSim()` flips the `simulating` flag. When simulation starts, the ball begins moving and colliding.
- `attach()` and `detach()` follow the setup/teardown pattern, preventing memory leaks when the game is destroyed.

---

### 3. Create the Inventory Renderer

**File:** `src/games/physics-puzzle/renderers/InventoryRenderer.ts`

Shows the remaining pieces at the bottom of the screen.

```typescript
import type { PuzzleState } from '../types';

export class InventoryRenderer {
  render(ctx: CanvasRenderingContext2D, state: PuzzleState): void {
    const canvas = ctx.canvas;
    const W = canvas.width, H = canvas.height;

    // Inventory panel (bottom)
    const panelH = 80;
    const panelY = H - panelH;

    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, panelY, W, panelH);
    ctx.fillStyle = '#333';
    ctx.fillRect(0, panelY, W, 2);

    ctx.font = '12px monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#888';
    ctx.textBaseline = 'top';
    ctx.fillText(
      `Pieces: ${state.inventory.length - state.selectedInventory} remaining  |  [SPACE] Simulate  |  [R] Reset`,
      12,
      panelY + 10,
    );

    // Preview remaining pieces
    let ix = 12;
    for (let i = state.selectedInventory; i < state.inventory.length; i++) {
      const item = state.inventory[i];
      ctx.fillStyle = item.color;
      const previewW = Math.min(item.w, 60);
      const previewH = Math.min(item.h, 30);
      ctx.fillRect(ix, panelY + 36, previewW, previewH);
      ix += previewW + 10;
    }
  }
}
```

**What's happening:**
- A semi-transparent black panel at the bottom serves as the inventory bar. The `2px` line at the top gives it a defined edge.
- Text shows how many pieces remain, plus keyboard shortcuts as a reminder.
- Each remaining piece is drawn as a small color-coded preview rectangle, starting from `selectedInventory` so already-placed pieces disappear from the bar.

---

### 4. Update the Engine

**File:** `src/games/physics-puzzle/PuzzleEngine.ts`

Wire the inventory renderer and add initial inventory items.

```typescript
import type { PuzzleState } from './types';
import { makeBody, resetBodyId } from './types';
import { PhysicsSystem } from './systems/PhysicsSystem';
import { CollisionSystem } from './systems/CollisionSystem';
import { WorldRenderer } from './renderers/WorldRenderer';
import { InventoryRenderer } from './renderers/InventoryRenderer';

export class PuzzleEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private systems: { update(state: PuzzleState, dt: number): void }[];
  private renderers: { render(ctx: CanvasRenderingContext2D, state: PuzzleState): void }[];
  state: PuzzleState;
  private rafId = 0;
  private running = false;
  private lastTime = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    this.systems = [
      new PhysicsSystem(),
      new CollisionSystem(),
    ];
    this.renderers = [
      new WorldRenderer(),
      new InventoryRenderer(),
    ];

    // Build world: ground + obstacle + ball + goal
    resetBodyId();
    const H = canvas.height;
    const W = canvas.width;
    const groundY = H - 60;
    const bodies = [
      makeBody('ground', 0, groundY, W, 60, true, '#4a6741'),
      makeBody('ball', 100, groundY - 30, 30, 30, false, '#f59e0b'),
      makeBody('goal', 600, groundY - 40, 40, 40, true, '#4ade80'),
      makeBody('box', 300, groundY - 80, 40, 80, true, '#666'),
    ];
    bodies[1].radius = 15;

    this.state = {
      bodies,
      level: 1,
      solved: false,
      started: true,
      gameOver: false,
      dragging: null,
      dragOffX: 0,
      dragOffY: 0,
      placed: 0,
      maxPieces: 3,
      inventory: [
        { type: 'plank', color: '#8b5e3c', w: 120, h: 16 },
        { type: 'plank', color: '#8b5e3c', w: 80, h: 16 },
        { type: 'box', color: '#a0522d', w: 40, h: 40 },
      ],
      selectedInventory: 0,
      simulating: false,
      score: 0,
      message: 'Place pieces to guide the ball to the green goal. Press SPACE to simulate!',
    };
  }

  start(): void {
    this.running = true;
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
  }

  private loop(timestamp: number): void {
    if (!this.running) return;

    const dt = Math.min((timestamp - this.lastTime) / 1000, 0.05);
    this.lastTime = timestamp;

    if (this.state.simulating && !this.state.solved) {
      for (const sys of this.systems) {
        sys.update(this.state, dt);
      }
    }

    for (const renderer of this.renderers) {
      renderer.render(this.ctx, this.state);
    }

    this.rafId = requestAnimationFrame((t) => this.loop(t));
  }
}
```

**What's happening:**
- The `renderers` array now includes both `WorldRenderer` and `InventoryRenderer`, drawn in order each frame.
- The world starts with a ball on the ground, a goal star to the right, and a wall obstacle between them. The player must place planks and boxes to bridge the gap.
- `simulating` starts as `false` so the player has time to place pieces before pressing Space.
- Three inventory items (two planks, one box) give the player the building blocks to solve the puzzle.

---

### 5. Update the Platform Adapter

**File:** `src/games/physics-puzzle/adapters/PlatformAdapter.ts`

Wire the input system into the adapter.

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
- The adapter creates both the engine and the input system, connecting them through getter/setter callbacks. The input system reads and writes the engine's state without holding a direct reference to it.
- `InventorySystem` is created here and passed to `InputSystem` so click events can delegate to piece placement.
- `destroy()` tears down both the engine and the input system, removing all event listeners.

---

## Test It

1. **Run:** `npm run dev`
2. **Open:** the Physics Puzzle game in your browser
3. **Observe:**
   - The ball sits on the ground near the left. A green goal star sits on the right. A gray wall blocks the path.
   - The **inventory panel** at the bottom shows 3 remaining pieces (two brown planks, one box).
   - **Click** on the canvas to place a plank. It appears where you clicked. The inventory count decreases.
   - Place all three pieces strategically, then press **Space** to start the simulation.
   - The ball falls and rolls, bouncing off your placed pieces.
   - Press **R** to reset and try again.

---

## Challenges

**Easy:**
- Add a fourth inventory piece (another plank) by adding to the `inventory` array in the engine constructor.
- Change the plank color to `#c0392b` (red) to make player-placed pieces visually distinct.

**Medium:**
- Add a "ghost preview" that shows where the next piece will be placed as the mouse moves (draw a semi-transparent rectangle at the cursor position before clicking).

**Hard:**
- Implement drag-to-place: mousedown starts the placement, mousemove shows a live preview, and mouseup finalizes the position. This gives the player more precise control.

---

## What You Learned

- Transforming mouse coordinates from CSS space to canvas logical space
- Building an inventory queue system with a `selectedInventory` pointer
- Separating input handling from game logic via callbacks and system composition
- Rendering a UI panel (inventory bar) on top of the game world

**Next:** Dynamic objects and interactions -- add boxes, seesaws, and bouncy surfaces!
