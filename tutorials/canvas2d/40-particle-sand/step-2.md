# Step 2: Sand Particles & Gravity

**Goal:** Implement sand particle physics so sand falls downward, slides diagonally, and piles up into realistic mounds.

**Time:** ~15 minutes

---

## What You'll Build

- **ParticleSystem** class that processes the grid each frame
- **Sand gravity**: particles fall straight down into empty space
- **Diagonal sliding**: sand slides down-left or down-right when blocked below
- **Random direction bias**: randomized left-right processing per row for natural pile shapes
- **Bottom-to-top processing**: ensures particles cascade correctly in a single frame
- **Mouse-based particle placement** so you can click to spawn sand

---

## Concepts

- **Bottom-to-Top Processing**: We iterate rows from bottom to top. If we went top-to-bottom, a falling particle would be processed again in its new position, causing it to teleport multiple cells per frame.
- **Random Row Direction**: Each row is processed either left-to-right or right-to-left (50/50 chance). Without this, sand piles would always lean to one side.
- **Update Flag**: Each particle has an `updated` boolean. Once a particle moves, it is flagged so it is not processed again this frame. Flags are cleared at the start of each frame.
- **Swap Operation**: Moving a particle means swapping the contents of two grid cells. This will also let sand sink through water later.

---

## Code

### 1. Create the Particle System

**File:** `src/contexts/canvas2d/games/particle-sand/systems/ParticleSystem.ts`

The core simulation loop. For now, it only handles sand.

```typescript
import type { SandState, Particle } from '../types';

export class ParticleSystem {
  update(state: SandState, _dt: number): void {
    if (state.paused) return;

    // Place particles if mouse is down
    this.placeParticles(state);

    // Clear updated flags
    const len = state.grid.length;
    for (let i = 0; i < len; i++) {
      const p = state.grid[i];
      if (p) p.updated = false;
    }

    // Bottom-to-top pass: process sand (falling particles)
    for (let y = state.gridH - 1; y >= 0; y--) {
      // Randomize left-right processing direction per row
      const leftToRight = Math.random() < 0.5;

      for (let i = 0; i < state.gridW; i++) {
        const x = leftToRight ? i : state.gridW - 1 - i;
        const idx = y * state.gridW + x;
        const p = state.grid[idx];

        if (!p || p.updated) continue;

        if (p.type === 'sand') {
          this.updateSand(state, x, y, idx, p);
        }
      }
    }

    // Recount particles
    let count = 0;
    for (let i = 0; i < len; i++) {
      if (state.grid[i]) count++;
    }
    state.particleCount = count;
  }

  private placeParticles(state: SandState): void {
    if (!state.mouseDown) return;

    const cx = state.mouseX;
    const cy = state.mouseY;
    const r = state.brushSize;

    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        // Circular brush: skip corners outside the radius
        if (dx * dx + dy * dy > r * r) continue;

        const px = cx + dx;
        const py = cy + dy;

        if (px < 0 || px >= state.gridW || py < 0 || py >= state.gridH) continue;

        const idx = py * state.gridW + px;
        if (state.grid[idx]) continue;

        // Random skip for natural-looking placement
        if (Math.random() > 0.6) continue;

        state.grid[idx] = {
          type: state.selectedType,
          life: 0,
          updated: true,
        };
      }
    }
  }

  private swap(state: SandState, fromIdx: number, toIdx: number, p: Particle): void {
    const target = state.grid[toIdx];
    state.grid[toIdx] = p;
    state.grid[fromIdx] = target;
    p.updated = true;
    if (target) target.updated = true;
  }

  private isEmpty(state: SandState, x: number, y: number): boolean {
    if (x < 0 || x >= state.gridW || y < 0 || y >= state.gridH) return false;
    return state.grid[y * state.gridW + x] === null;
  }

  private updateSand(
    state: SandState, x: number, y: number, idx: number, p: Particle
  ): void {
    // 1. Fall straight down
    if (this.isEmpty(state, x, y + 1)) {
      this.swap(state, idx, (y + 1) * state.gridW + x, p);
      return;
    }

    // 2. Slide diagonally down-left or down-right
    const leftEmpty = this.isEmpty(state, x - 1, y + 1);
    const rightEmpty = this.isEmpty(state, x + 1, y + 1);

    if (leftEmpty && rightEmpty) {
      // Both sides open: pick randomly
      const dir = Math.random() < 0.5 ? -1 : 1;
      this.swap(state, idx, (y + 1) * state.gridW + (x + dir), p);
    } else if (leftEmpty) {
      this.swap(state, idx, (y + 1) * state.gridW + (x - 1), p);
    } else if (rightEmpty) {
      this.swap(state, idx, (y + 1) * state.gridW + (x + 1), p);
    }
    // If nothing is empty, the sand stays put (it's resting)
  }
}
```

**What's happening:**
- `update()` is called every frame. It first places particles if the mouse is held, then clears all `updated` flags, then processes every cell bottom-to-top.
- `placeParticles()` uses a circular brush centered on the mouse position. The `dx*dx + dy*dy > r*r` check creates a circular shape. The `Math.random() > 0.6` skip creates natural-looking sparse placement rather than solid blocks.
- `updateSand()` implements three rules in priority order: (1) fall straight down if empty, (2) slide diagonally if straight down is blocked, (3) stay put if fully blocked.
- `swap()` exchanges two grid cells and marks both as updated. This generic swap will handle sand-water displacement in Step 3.

---

### 2. Add Mouse Input to the Engine

**File:** `src/contexts/canvas2d/games/particle-sand/SandEngine.ts`

Update the engine to handle mouse events and run the particle system.

```typescript
import type { SandState } from './types';
import { GRID_W, GRID_H, CELL_SIZE } from './types';
import { ParticleSystem } from './systems/ParticleSystem';
import { GameRenderer } from './renderers/GameRenderer';

export class SandEngine {
  private ctx: CanvasRenderingContext2D;
  private state: SandState;
  private running: boolean;
  private rafId: number;

  private particleSystem: ParticleSystem;
  private gameRenderer: GameRenderer;

  private mouseDownHandler: (e: MouseEvent) => void;
  private mouseMoveHandler: (e: MouseEvent) => void;
  private mouseUpHandler: () => void;

  constructor(canvas: HTMLCanvasElement) {
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

    // Mouse handlers
    this.mouseDownHandler = (e: MouseEvent) => {
      this.state.mouseDown = true;
      this.updateMousePos(e);
    };
    this.mouseMoveHandler = (e: MouseEvent) => {
      this.updateMousePos(e);
    };
    this.mouseUpHandler = () => {
      this.state.mouseDown = false;
    };

    canvas.addEventListener('mousedown', this.mouseDownHandler);
    window.addEventListener('mousemove', this.mouseMoveHandler);
    window.addEventListener('mouseup', this.mouseUpHandler);
  }

  start(): void {
    this.running = true;
    this.loop();
  }

  destroy(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
  }

  private loop(): void {
    if (!this.running) return;

    this.particleSystem.update(this.state, 16);
    this.gameRenderer.render(this.ctx, this.state);

    this.rafId = requestAnimationFrame(() => this.loop());
  }

  private updateMousePos(e: MouseEvent): void {
    const canvas = this.ctx.canvas;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    this.state.mouseX = Math.floor(((e.clientX - rect.left) * scaleX) / CELL_SIZE);
    this.state.mouseY = Math.floor(((e.clientY - rect.top) * scaleY) / CELL_SIZE);
  }
}
```

**What's happening:**
- Three mouse event listeners track mouse position and button state. `mousedown` on the canvas sets `mouseDown = true`, `mouseup` anywhere clears it, and `mousemove` continuously updates the grid coordinates.
- `updateMousePos()` converts pixel coordinates to grid coordinates by accounting for canvas scaling (CSS size vs. actual pixel size) and dividing by `CELL_SIZE`.
- The game loop now calls `particleSystem.update()` before rendering, so particles move each frame.
- We removed `placeTestParticles()` since you can now click to place sand interactively.

---

## Test It

1. **Run:** `npm run dev`
2. **Open:** the Particle Sand game in your browser
3. **Click and drag** anywhere on the canvas
4. **Observe:**
   - Sand particles appear where you click and **fall downward**
   - When particles hit the bottom, they **stop and pile up**
   - Particles slide **diagonally** to form natural-looking mounds with ~45-degree slopes
   - Dropping sand on top of a pile causes it to **cascade** outward on both sides
   - Each particle shows **subtle color variation** (golden/amber shades)
5. **Try:** Draw a line of sand across the top and watch it rain down into a pyramid

---

## Challenges

**Easy:**
- Increase `brushSize` from 3 to 6 in the initial state and see how much faster you can fill the screen.
- Change the sand colors to grey tones and make a "gravel" simulation.

**Medium:**
- Add a "terminal velocity" by only letting sand fall if `Math.random() < 0.9`. This slows the simulation slightly and looks more viscous.

**Hard:**
- Implement "wet sand" that has a 30% chance of NOT sliding diagonally, making it pile up in steeper columns.

---

## What You Learned

- Processing a grid bottom-to-top so falling particles cascade correctly in one frame
- Using random row-direction processing to create symmetric, natural pile shapes
- Implementing a circular brush with `dx*dx + dy*dy > r*r` for particle placement
- Converting mouse pixel coordinates to grid coordinates with canvas scaling

**Next:** Water and flow physics -- add particles that flow sideways and fill containers!
