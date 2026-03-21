# Step 3: Water & Flow Physics

**Goal:** Add water particles that fall, flow sideways to fill containers, and get displaced by heavier sand particles.

**Time:** ~15 minutes

---

## What You'll Build

- **Water particles** that fall downward with gravity
- **Lateral flow**: water spreads sideways when it cannot fall further
- **Diagonal flow**: water slides down-left or down-right before trying sideways
- **Sand-water displacement**: sand sinks through water because it is denser
- **Keyboard type selection** so you can press `1` for sand and `2` for water

---

## Concepts

- **Fluid vs. Granular**: Sand only moves diagonally downward (it piles). Water also moves **sideways** on the same level, which is what makes it flow and fill containers.
- **Density Displacement**: Sand is denser than water. When sand is directly above water, they swap -- the sand sinks and the water rises. This creates realistic settling behavior.
- **Movement Priority**: Water checks in order: (1) fall straight down, (2) slide diagonally down, (3) flow sideways. This priority makes water seek the lowest point first, then spread outward.
- **Random Sideways Direction**: When both left and right are open, water picks a random direction. This prevents water from always flowing one way and creates natural pool shapes.

---

## Code

### 1. Update the Particle System

**File:** `src/contexts/canvas2d/games/particle-sand/systems/ParticleSystem.ts`

Add water update logic and sand-water interaction to the existing system.

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

    // Bottom-to-top pass: sand and water (falling particles)
    for (let y = state.gridH - 1; y >= 0; y--) {
      const leftToRight = Math.random() < 0.5;

      for (let i = 0; i < state.gridW; i++) {
        const x = leftToRight ? i : state.gridW - 1 - i;
        const idx = y * state.gridW + x;
        const p = state.grid[idx];

        if (!p || p.updated) continue;

        switch (p.type) {
          case 'sand':
            this.updateSand(state, x, y, idx, p);
            break;
          case 'water':
            this.updateWater(state, x, y, idx, p);
            break;
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
        if (dx * dx + dy * dy > r * r) continue;

        const px = cx + dx;
        const py = cy + dy;

        if (px < 0 || px >= state.gridW || py < 0 || py >= state.gridH) continue;

        const idx = py * state.gridW + px;
        if (state.grid[idx]) continue;
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

  private isType(state: SandState, x: number, y: number, type: string): boolean {
    if (x < 0 || x >= state.gridW || y < 0 || y >= state.gridH) return false;
    const p = state.grid[y * state.gridW + x];
    return p !== null && p.type === type;
  }

  private updateSand(
    state: SandState, x: number, y: number, idx: number, p: Particle
  ): void {
    // Fall straight down
    if (this.isEmpty(state, x, y + 1)) {
      this.swap(state, idx, (y + 1) * state.gridW + x, p);
      return;
    }

    // Fall into water below (sand is denser, so they swap)
    if (this.isType(state, x, y + 1, 'water')) {
      this.swap(state, idx, (y + 1) * state.gridW + x, p);
      return;
    }

    // Slide diagonally
    const leftEmpty = this.isEmpty(state, x - 1, y + 1);
    const rightEmpty = this.isEmpty(state, x + 1, y + 1);
    const leftWater = this.isType(state, x - 1, y + 1, 'water');
    const rightWater = this.isType(state, x + 1, y + 1, 'water');

    if ((leftEmpty || leftWater) && (rightEmpty || rightWater)) {
      const dir = Math.random() < 0.5 ? -1 : 1;
      this.swap(state, idx, (y + 1) * state.gridW + (x + dir), p);
    } else if (leftEmpty || leftWater) {
      this.swap(state, idx, (y + 1) * state.gridW + (x - 1), p);
    } else if (rightEmpty || rightWater) {
      this.swap(state, idx, (y + 1) * state.gridW + (x + 1), p);
    }
  }

  private updateWater(
    state: SandState, x: number, y: number, idx: number, p: Particle
  ): void {
    // Fall down
    if (this.isEmpty(state, x, y + 1)) {
      this.swap(state, idx, (y + 1) * state.gridW + x, p);
      return;
    }

    // Diagonal down
    const leftDown = this.isEmpty(state, x - 1, y + 1);
    const rightDown = this.isEmpty(state, x + 1, y + 1);

    if (leftDown && rightDown) {
      const dir = Math.random() < 0.5 ? -1 : 1;
      this.swap(state, idx, (y + 1) * state.gridW + (x + dir), p);
      return;
    } else if (leftDown) {
      this.swap(state, idx, (y + 1) * state.gridW + (x - 1), p);
      return;
    } else if (rightDown) {
      this.swap(state, idx, (y + 1) * state.gridW + (x + 1), p);
      return;
    }

    // Flow sideways (this is what makes water behave like a fluid)
    const leftSide = this.isEmpty(state, x - 1, y);
    const rightSide = this.isEmpty(state, x + 1, y);

    if (leftSide && rightSide) {
      const dir = Math.random() < 0.5 ? -1 : 1;
      this.swap(state, idx, y * state.gridW + (x + dir), p);
    } else if (leftSide) {
      this.swap(state, idx, y * state.gridW + (x - 1), p);
    } else if (rightSide) {
      this.swap(state, idx, y * state.gridW + (x + 1), p);
    }
  }
}
```

**What's happening:**
- `updateSand()` now checks for water below (`isType(..., 'water')`). When sand sits on water, the `swap()` call exchanges them -- sand moves down, water moves up. This is density-based displacement.
- `updateWater()` has three movement phases: (1) fall straight down, (2) slide diagonally down-left/right, (3) flow sideways on the same row. Phase 3 is what distinguishes water from sand -- it spreads horizontally.
- `isType()` is a helper that checks bounds and the particle type at a given cell, used for displacement and later for element interactions.
- The `switch` statement in `update()` dispatches each particle to its type-specific handler. Adding new types later just means adding more cases.

---

### 2. Add Keyboard Input

**File:** `src/contexts/canvas2d/games/particle-sand/SandEngine.ts`

Add a keyboard handler so you can switch between sand and water.

```typescript
import type { SandState } from './types';
import { GRID_W, GRID_H, CELL_SIZE, PARTICLE_TYPES } from './types';
import type { ParticleType } from './types';
import { ParticleSystem } from './systems/ParticleSystem';
import { GameRenderer } from './renderers/GameRenderer';

export class SandEngine {
  private ctx: CanvasRenderingContext2D;
  private state: SandState;
  private running: boolean;
  private rafId: number;

  private particleSystem: ParticleSystem;
  private gameRenderer: GameRenderer;

  private keyHandler: (e: KeyboardEvent) => void;
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

    // Keyboard handler
    this.keyHandler = (e: KeyboardEvent) => {
      const num = parseInt(e.key, 10);
      if (num >= 1 && num <= PARTICLE_TYPES.length) {
        this.state.selectedType = PARTICLE_TYPES[num - 1] as ParticleType;
      }
      if (e.key === 'c' || e.key === 'C') {
        this.clearGrid();
      }
    };

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

    window.addEventListener('keydown', this.keyHandler);
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
    window.removeEventListener('keydown', this.keyHandler);
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

  private clearGrid(): void {
    for (let i = 0; i < this.state.grid.length; i++) {
      this.state.grid[i] = null;
    }
    this.state.particleCount = 0;
  }
}
```

**What's happening:**
- Number keys `1`-`5` select particle types from the `PARTICLE_TYPES` array (1 = sand, 2 = water, etc.).
- `C` clears the entire grid by setting every cell to `null`.
- The keyboard handler is attached to `window` and cleaned up in `destroy()`.

---

## Test It

1. **Run:** `npm run dev`
2. **Press `1`** and draw a row of sand near the bottom to create a "container"
3. **Press `2`** to switch to water
4. **Draw water** above the sand container
5. **Observe:**
   - Water **falls** and collects on top of the sand
   - Water **flows sideways** to fill the container level
   - Water pools form a **flat surface** (unlike sand's pyramids)
   - Drop more sand on top of water -- **sand sinks through** and water rises
6. **Press `C`** to clear and try again
7. **Try:** Build an enclosed sand box and fill it with water to watch it settle

---

## Challenges

**Easy:**
- Build a V-shaped sand funnel and pour water through it to see flow dynamics.
- Press `C` to clear, then alternate placing sand and water in layers.

**Medium:**
- Add a "density" property to each particle type and use it to generalize the displacement logic instead of hardcoding `isType(..., 'water')`.

**Hard:**
- Make water slightly viscous by only allowing sideways flow with a probability of `0.7` per frame. Compare how it pools differently.

---

## What You Learned

- Implementing fluid simulation with three movement priorities (fall, diagonal, sideways)
- Displacing lighter particles (water) with heavier ones (sand) using swap operations
- Using `isType()` helper for type-checking grid neighbors safely with bounds checking
- Adding keyboard shortcuts to switch between particle types at runtime

**Next:** Fire, stone, and element interactions -- add particles that rise, block, and react with each other!
