# Step 6: Input System & Final Polish

**Goal:** Extract input handling into a dedicated InputSystem class, add touch support for mobile, wire up the platform adapter, and finalize the complete game.

**Time:** ~15 minutes

---

## What You'll Build

- **InputSystem class** that encapsulates all keyboard, mouse, and touch event handling
- **Touch support** so the game works on phones and tablets
- **Clean attach/detach** lifecycle for event listeners (no memory leaks)
- **Exit callback** so the game can signal the host application to return to a menu
- **PlatformAdapter** and **entry point** for integration with the game framework
- **The complete, finished Particle Sand game**

---

## Concepts

- **Input Separation**: Extracting input handling into its own class keeps the engine focused on orchestration. The InputSystem owns all event listeners and modifies state directly.
- **Touch Events**: Mobile browsers fire `touchstart`, `touchmove`, and `touchend` instead of mouse events. We map touch coordinates to the same `mouseX`/`mouseY`/`mouseDown` state so the rest of the game works unchanged.
- **Listener Cleanup**: Every `addEventListener` needs a matching `removeEventListener` in `detach()`. Storing handler references as class properties makes this possible.
- **Platform Adapter Pattern**: A thin adapter wraps the engine so different host pages (menu system, standalone page, etc.) can create and destroy the game with a uniform interface.

---

## Code

### 1. Create the Input System

**File:** `src/contexts/canvas2d/games/particle-sand/systems/InputSystem.ts`

Handles all keyboard, mouse, and touch input in a single class.

```typescript
import type { SandState, ParticleType } from '../types';
import { PARTICLE_TYPES, CELL_SIZE } from '../types';

export class InputSystem {
  private state: SandState;
  private canvas: HTMLCanvasElement;
  private onExit: () => void;
  private onClear: () => void;
  private onToggleHelp: () => void;

  private keyHandler: (e: KeyboardEvent) => void;
  private mouseDownHandler: (e: MouseEvent) => void;
  private mouseMoveHandler: (e: MouseEvent) => void;
  private mouseUpHandler: (e: MouseEvent) => void;
  private touchStartHandler: (e: TouchEvent) => void;
  private touchMoveHandler: (e: TouchEvent) => void;
  private touchEndHandler: (e: TouchEvent) => void;

  constructor(
    state: SandState,
    canvas: HTMLCanvasElement,
    onExit: () => void,
    onClear: () => void,
    onToggleHelp: () => void,
  ) {
    this.state = state;
    this.canvas = canvas;
    this.onExit = onExit;
    this.onClear = onClear;
    this.onToggleHelp = onToggleHelp;

    this.keyHandler = (e: KeyboardEvent) => this.handleKey(e);
    this.mouseDownHandler = (e: MouseEvent) => this.handleMouseDown(e);
    this.mouseMoveHandler = (e: MouseEvent) => this.handleMouseMove(e);
    this.mouseUpHandler = () => this.handleMouseUp();
    this.touchStartHandler = (e: TouchEvent) => this.handleTouchStart(e);
    this.touchMoveHandler = (e: TouchEvent) => this.handleTouchMove(e);
    this.touchEndHandler = () => this.handleMouseUp();
  }

  attach(): void {
    window.addEventListener('keydown', this.keyHandler);
    this.canvas.addEventListener('mousedown', this.mouseDownHandler);
    window.addEventListener('mousemove', this.mouseMoveHandler);
    window.addEventListener('mouseup', this.mouseUpHandler);
    this.canvas.addEventListener('touchstart', this.touchStartHandler, { passive: false });
    window.addEventListener('touchmove', this.touchMoveHandler, { passive: false });
    window.addEventListener('touchend', this.touchEndHandler);
  }

  detach(): void {
    window.removeEventListener('keydown', this.keyHandler);
    this.canvas.removeEventListener('mousedown', this.mouseDownHandler);
    window.removeEventListener('mousemove', this.mouseMoveHandler);
    window.removeEventListener('mouseup', this.mouseUpHandler);
    this.canvas.removeEventListener('touchstart', this.touchStartHandler);
    window.removeEventListener('touchmove', this.touchMoveHandler);
    window.removeEventListener('touchend', this.touchEndHandler);
  }

  private handleKey(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      this.onExit();
      return;
    }

    if (e.key === 'h' || e.key === 'H') {
      this.onToggleHelp();
      return;
    }

    if (e.key === 'p' || e.key === 'P') {
      this.state.paused = !this.state.paused;
      return;
    }

    if (e.key === 'c' || e.key === 'C') {
      this.onClear();
      return;
    }

    // Number keys 1-5 select particle type
    const num = parseInt(e.key, 10);
    if (num >= 1 && num <= PARTICLE_TYPES.length) {
      this.state.selectedType = PARTICLE_TYPES[num - 1] as ParticleType;
      return;
    }

    // Bracket keys adjust brush size
    if (e.key === '[' || e.key === '-') {
      this.state.brushSize = Math.max(1, this.state.brushSize - 1);
    }
    if (e.key === ']' || e.key === '=') {
      this.state.brushSize = Math.min(10, this.state.brushSize + 1);
    }
  }

  private updateMousePos(clientX: number, clientY: number): void {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;

    this.state.mouseX = Math.floor(((clientX - rect.left) * scaleX) / CELL_SIZE);
    this.state.mouseY = Math.floor(((clientY - rect.top) * scaleY) / CELL_SIZE);
  }

  private handleMouseDown(e: MouseEvent): void {
    // Check exit button area (top-left 80x36 px)
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    if (x < 80 && y < 36) {
      this.onExit();
      return;
    }

    // Check palette clicks (bottom bar)
    const H = this.canvas.height;
    if (y > H - 50) {
      this.handlePaletteClick(x);
      return;
    }

    this.state.mouseDown = true;
    this.updateMousePos(e.clientX, e.clientY);
  }

  private handleMouseMove(e: MouseEvent): void {
    this.updateMousePos(e.clientX, e.clientY);
  }

  private handleMouseUp(): void {
    this.state.mouseDown = false;
  }

  private handleTouchStart(e: TouchEvent): void {
    e.preventDefault();
    if (e.touches.length > 0) {
      const t = e.touches[0];
      this.state.mouseDown = true;
      this.updateMousePos(t.clientX, t.clientY);
    }
  }

  private handleTouchMove(e: TouchEvent): void {
    e.preventDefault();
    if (e.touches.length > 0) {
      const t = e.touches[0];
      this.updateMousePos(t.clientX, t.clientY);
    }
  }

  private handlePaletteClick(x: number): void {
    const W = this.canvas.width;
    const paletteW = PARTICLE_TYPES.length * 70;
    const startX = (W - paletteW) / 2;
    const idx = Math.floor((x - startX) / 70);

    if (idx >= 0 && idx < PARTICLE_TYPES.length) {
      this.state.selectedType = PARTICLE_TYPES[idx] as ParticleType;
    }
  }
}
```

**What's happening:**
- The constructor takes the state object, canvas, and three callbacks: `onExit`, `onClear`, and `onToggleHelp`. This keeps the InputSystem decoupled from engine internals.
- `attach()` registers 7 event listeners (keyboard, 3 mouse, 3 touch). `detach()` removes all 7. The handler references are stored as class properties so `removeEventListener` gets the exact same function reference.
- Touch events map to the same state: `touchstart` sets `mouseDown = true` and updates position, `touchmove` updates position, `touchend` clears `mouseDown`. The `{ passive: false }` option allows `preventDefault()` to stop the page from scrolling while drawing.
- `handleMouseDown()` has hit-test zones: the top-left 80x36 area triggers exit, the bottom 50px triggers palette selection, and everything else starts particle placement.
- `updateMousePos()` handles both mouse and touch by accepting raw `clientX`/`clientY` parameters and converting through canvas scaling and cell size division.

---

### 2. Finalize the Engine

**File:** `src/contexts/canvas2d/games/particle-sand/SandEngine.ts`

The complete engine using the extracted InputSystem.

```typescript
import type { SandState } from './types';
import { GRID_W, GRID_H, CELL_SIZE } from './types';
import { ParticleSystem } from './systems/ParticleSystem';
import { InputSystem } from './systems/InputSystem';
import { GameRenderer } from './renderers/GameRenderer';
import { HUDRenderer } from './renderers/HUDRenderer';

export class SandEngine {
  private ctx: CanvasRenderingContext2D;
  private state: SandState;
  private running: boolean;
  private rafId: number;

  private particleSystem: ParticleSystem;
  private inputSystem: InputSystem;
  private gameRenderer: GameRenderer;
  private hudRenderer: HUDRenderer;
  private resizeHandler: () => void;

  constructor(canvas: HTMLCanvasElement, onExit: () => void) {
    this.ctx = canvas.getContext('2d')!;
    this.running = false;
    this.rafId = 0;

    canvas.width = GRID_W * CELL_SIZE;
    canvas.height = GRID_H * CELL_SIZE;

    this.state = {
      grid: new Array(GRID_W * GRID_H).fill(null),
      gridW: GRID_W,
      gridH: GRID_H,
      cellSize: CELL_SIZE,
      selectedType: 'sand',
      particleCount: 0,
      paused: false,
      mouseDown: false,
      mouseX: -1,
      mouseY: -1,
      brushSize: 3,
    };

    this.particleSystem = new ParticleSystem();
    this.gameRenderer = new GameRenderer();
    this.hudRenderer = new HUDRenderer();

    this.inputSystem = new InputSystem(
      this.state,
      canvas,
      onExit,
      () => this.clearGrid(),
      () => {}, // Help toggle placeholder
    );

    this.resizeHandler = () => {
      canvas.width = GRID_W * CELL_SIZE;
      canvas.height = GRID_H * CELL_SIZE;
    };

    this.inputSystem.attach();
    window.addEventListener('resize', this.resizeHandler);
  }

  start(): void {
    this.running = true;
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

    this.particleSystem.update(this.state, 16);
    this.gameRenderer.render(this.ctx, this.state);
    this.hudRenderer.render(this.ctx, this.state);

    this.rafId = requestAnimationFrame(() => this.loop());
  }

  private clearGrid(): void {
    const len = this.state.grid.length;
    for (let i = 0; i < len; i++) {
      this.state.grid[i] = null;
    }
    this.state.particleCount = 0;
  }
}
```

**What's happening:**
- The engine is now clean and focused: it creates the state, instantiates the four subsystems (ParticleSystem, InputSystem, GameRenderer, HUDRenderer), and runs the game loop.
- `constructor` takes an `onExit` callback that the host application provides. This lets ESC and the exit button navigate back to a menu without the engine knowing about navigation.
- `clearGrid()` is passed as a callback to InputSystem so pressing `C` clears the grid through the engine.
- `destroy()` carefully cleans up: stops the loop, detaches all input listeners, and removes the resize handler. This prevents memory leaks when switching between games.
- The `resizeHandler` resets the canvas dimensions to maintain the fixed 800x600 size. In a responsive version, you could recalculate grid dimensions here.

---

### 3. Create the Platform Adapter

**File:** `src/contexts/canvas2d/games/particle-sand/adapters/PlatformAdapter.ts`

Wraps the engine with a uniform game interface.

```typescript
import { SandEngine } from '../SandEngine';

export class PlatformAdapter {
  private engine: SandEngine;

  constructor(canvas: HTMLCanvasElement, onExit: () => void) {
    this.engine = new SandEngine(canvas, onExit);
  }

  start(): void {
    this.engine.start();
  }

  destroy(): void {
    this.engine.destroy();
  }
}
```

**What's happening:**
- The adapter implements a simple `start()`/`destroy()` interface that any game framework expects.
- It passes through the `canvas` and `onExit` callback to the engine without adding its own logic.
- This pattern lets the game be instantiated from a menu system, a standalone HTML page, or an automated test -- the adapter normalizes the interface.

---

### 4. Create the Entry Point

**File:** `src/contexts/canvas2d/games/particle-sand/index.ts`

The public API for the game module.

```typescript
import { PlatformAdapter } from './adapters/PlatformAdapter';

export function createParticleSand(
  canvas: HTMLCanvasElement,
  onExit: () => void
): { destroy: () => void } {
  const adapter = new PlatformAdapter(canvas, onExit);
  adapter.start();
  return { destroy: () => adapter.destroy() };
}
```

---

## Final File Structure

```
src/contexts/canvas2d/games/particle-sand/
  types.ts                        # ParticleType, Particle, SandState, constants, colors
  SandEngine.ts                   # Main engine: state init, game loop, subsystem orchestration
  index.ts                        # Public entry point
  adapters/
    PlatformAdapter.ts            # Thin wrapper for host integration
  systems/
    ParticleSystem.ts             # Cellular automata: sand, water, fire, steam, stone rules
    InputSystem.ts                # Keyboard, mouse, touch event handling
  renderers/
    GameRenderer.ts               # ImageData pixel buffer rendering + brush cursor
    HUDRenderer.ts                # Top bar, bottom palette, pause overlay
```

---

## Test It

1. **Run:** `npm run dev`
2. **Full feature test:**
   - **Press `1`** and draw sand -- it falls and piles
   - **Press `2`** and draw water -- it flows and pools
   - **Press `3`** and draw fire -- it rises and fades
   - **Press `4`** and draw stone walls -- particles are blocked
   - **Drop water on fire** -- both convert to rising steam
   - **Drop sand on water** -- sand sinks, water rises
   - **Press `[` and `]`** -- brush cursor grows and shrinks
   - **Click palette** at the bottom -- material switches
   - **Press `P`** -- simulation pauses with overlay
   - **Press `C`** -- grid clears completely
   - **Press `ESC`** -- game exits (if host supports it)
3. **Mobile test:**
   - Open on a phone or tablet (or use browser DevTools device emulation)
   - **Touch and drag** to place particles
   - **Tap palette** to switch materials
   - Verify no page scrolling occurs while drawing
4. **Creative test:**
   - Build a stone hourglass shape and fill the top with sand
   - Create a waterfall by placing a stone shelf with water above and fire below
   - Fill a stone container with alternating layers of sand and water

---

## Challenges

**Easy:**
- Add a frame rate counter to the top-right corner of the HUD showing `Math.round(1000 / dt)` FPS.
- Change the background color to pure black `#000000` for higher contrast.

**Medium:**
- Add an "undo" feature that saves the grid state every 60 frames and restores it when you press `Z`.
- Implement a "screenshot" button that calls `canvas.toDataURL()` and opens the image in a new tab.

**Hard:**
- Add a "wind" system: press left/right arrow keys to apply a horizontal bias to all falling and rising particles, making sand blow sideways and fire lean in the wind direction.
- Implement a "gravity flip" mode (press `G`) where falling particles rise and rising particles fall, inverting the entire simulation.

---

## What You Learned

- Extracting input handling into a dedicated class with clean attach/detach lifecycle
- Mapping touch events to the same state as mouse events for mobile compatibility
- Using the Platform Adapter pattern for framework-agnostic game integration
- Building a complete cellular automata simulation with 5 particle types and element interactions
- Rendering 30,000+ cells efficiently using ImageData pixel buffers
- Layering HUD elements on top of pixel-buffer rendering

**Congratulations!** You have built a complete falling-sand simulation from scratch. The game features gravity, fluid flow, fire, element interactions, and a polished UI -- all running at 60 FPS using direct pixel manipulation. Continue to the next tutorial to learn platformer game mechanics!
