# Step 1: Project Setup & Pixel Grid

**Goal:** Set up the type definitions, create a flat pixel grid, and render colored cells using an ImageData buffer.

**Time:** ~15 minutes

---

## What You'll Build

- **Type definitions** for particles, grid state, and particle colors
- **A flat 1D grid** representing a 200x150 cell simulation area
- **ImageData-based renderer** that writes pixels directly to a buffer for maximum performance
- **Engine scaffold** with a `requestAnimationFrame` loop
- **Dark background** with the grid ready to accept particles

---

## Concepts

- **Flat Grid as 1D Array**: Instead of a 2D array, we use a single flat array of length `gridW * gridH`. The index for cell `(x, y)` is `y * gridW + x`. This is faster for cache locality and simpler for swapping particles.
- **Cell Size**: Each grid cell maps to a `4x4` pixel block on the canvas. The canvas is `200 * 4 = 800` pixels wide and `150 * 4 = 600` pixels tall.
- **ImageData Rendering**: Rather than calling `fillRect` for each of the 30,000 cells, we write RGBA values directly into an `ImageData` buffer and blit it to the canvas with `putImageData()`. This is dramatically faster.
- **Particle Variance**: Each particle type has an array of 4 color variants. We pick one based on `(x + y) % colors.length` so adjacent particles shimmer with natural variation.

---

## Code

### 1. Create Types

**File:** `src/contexts/canvas2d/games/particle-sand/types.ts`

All the type definitions needed across every step, defined up front.

```typescript
export type ParticleType = 'sand' | 'water' | 'fire' | 'stone' | 'steam';

export interface Particle {
  type: ParticleType;
  /** Lifetime counter — used for fire/steam fading */
  life: number;
  /** Whether this particle has already been updated this frame */
  updated: boolean;
}

export interface SandState {
  grid: (Particle | null)[];
  gridW: number;
  gridH: number;
  cellSize: number;
  selectedType: ParticleType;
  particleCount: number;
  paused: boolean;
  mouseDown: boolean;
  mouseX: number;
  mouseY: number;
  brushSize: number;
}

export const GRID_W = 200;
export const GRID_H = 150;
export const CELL_SIZE = 4;

export const PARTICLE_TYPES: ParticleType[] = ['sand', 'water', 'fire', 'stone', 'steam'];

export const PARTICLE_COLORS: Record<ParticleType, string[]> = {
  sand:  ['#e6c35c', '#d4a843', '#c9973a', '#dbb74e'],
  water: ['#4a90d9', '#3b7dd8', '#5a9fe0', '#2e6bbf'],
  fire:  ['#ff4500', '#ff6a00', '#ff8c00', '#ffae00'],
  stone: ['#808080', '#909090', '#707070', '#888888'],
  steam: ['#c8d8e8', '#b0c4de', '#d0dce8', '#a8bcd0'],
};

export const PARTICLE_LABELS: Record<ParticleType, string> = {
  sand: 'Sand',
  water: 'Water',
  fire: 'Fire',
  stone: 'Stone',
  steam: 'Steam',
};
```

**What's happening:**
- `Particle` has three fields: `type` (which material), `life` (countdown for fire/steam), and `updated` (prevents double-processing in a single frame).
- `SandState` holds the flat grid array, dimensions, mouse state, brush size, and currently selected particle type. Everything the simulation needs lives here.
- `GRID_W = 200` and `GRID_H = 150` give us 30,000 cells. At `CELL_SIZE = 4`, the canvas is 800x600 pixels.
- `PARTICLE_COLORS` gives each type 4 hex color variants for visual variety.

---

### 2. Create the Game Renderer

**File:** `src/contexts/canvas2d/games/particle-sand/renderers/GameRenderer.ts`

Renders the grid using an ImageData pixel buffer for high performance.

```typescript
import type { SandState } from '../types';
import { PARTICLE_COLORS } from '../types';

export class GameRenderer {
  private imageData: ImageData | null;

  constructor() {
    this.imageData = null;
  }

  render(ctx: CanvasRenderingContext2D, state: SandState): void {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    // Background
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, W, H);

    // Ensure imageData is the right size
    const pixW = state.gridW * state.cellSize;
    const pixH = state.gridH * state.cellSize;

    if (
      !this.imageData ||
      this.imageData.width !== pixW ||
      this.imageData.height !== pixH
    ) {
      this.imageData = ctx.createImageData(pixW, pixH);
    }

    const data = this.imageData.data;

    // Clear to background color (#1a1a2e = rgb(26, 26, 46))
    for (let i = 0; i < data.length; i += 4) {
      data[i]     = 26;  // R
      data[i + 1] = 26;  // G
      data[i + 2] = 46;  // B
      data[i + 3] = 255; // A
    }

    // Draw particles
    const cs = state.cellSize;

    for (let gy = 0; gy < state.gridH; gy++) {
      for (let gx = 0; gx < state.gridW; gx++) {
        const p = state.grid[gy * state.gridW + gx];
        if (!p) continue;

        const colors = PARTICLE_COLORS[p.type];
        const colorHex = colors[(gx + gy) % colors.length];
        const r = parseInt(colorHex.slice(1, 3), 16);
        const g = parseInt(colorHex.slice(3, 5), 16);
        const b = parseInt(colorHex.slice(5, 7), 16);

        // Fill cell pixels (each grid cell = cs x cs pixels)
        const px0 = gx * cs;
        const py0 = gy * cs;

        for (let py = py0; py < py0 + cs && py < pixH; py++) {
          for (let px = px0; px < px0 + cs && px < pixW; px++) {
            const i = (py * pixW + px) * 4;
            data[i]     = r;
            data[i + 1] = g;
            data[i + 2] = b;
            data[i + 3] = 255;
          }
        }
      }
    }

    ctx.putImageData(this.imageData, 0, 0);
  }
}
```

**What's happening:**
- We allocate an `ImageData` buffer matching the canvas dimensions. Each pixel is 4 bytes (RGBA).
- Every frame we clear the buffer to the dark background color `#1a1a2e`, then loop through all 30,000 grid cells.
- For each occupied cell, we parse the hex color, then fill a `4x4` pixel block in the buffer.
- A single `putImageData()` call blits the entire buffer to the canvas. This is far faster than 30,000 individual `fillRect` calls.
- Color variant selection `(gx + gy) % colors.length` creates a subtle checkerboard shimmer effect.

---

### 3. Create the Engine

**File:** `src/contexts/canvas2d/games/particle-sand/SandEngine.ts`

The engine initializes the state, sizes the canvas, and runs the render loop.

```typescript
import type { SandState } from './types';
import { GRID_W, GRID_H, CELL_SIZE } from './types';
import { GameRenderer } from './renderers/GameRenderer';

export class SandEngine {
  private ctx: CanvasRenderingContext2D;
  private state: SandState;
  private running: boolean;
  private rafId: number;

  private gameRenderer: GameRenderer;

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

    this.gameRenderer = new GameRenderer();

    // Place a few test particles so we can verify rendering
    this.placeTestParticles();
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

    this.gameRenderer.render(this.ctx, this.state);

    this.rafId = requestAnimationFrame(() => this.loop());
  }

  /** Temporary: place some static particles to verify the renderer works */
  private placeTestParticles(): void {
    // A small pile of sand particles
    for (let x = 95; x < 105; x++) {
      for (let y = 145; y < 150; y++) {
        const idx = y * this.state.gridW + x;
        this.state.grid[idx] = { type: 'sand', life: 0, updated: false };
      }
    }

    // A few water particles
    for (let x = 50; x < 60; x++) {
      const idx = 149 * this.state.gridW + x;
      this.state.grid[idx] = { type: 'water', life: 0, updated: false };
    }

    // A row of stone particles
    for (let x = 80; x < 120; x++) {
      const idx = 140 * this.state.gridW + x;
      this.state.grid[idx] = { type: 'stone', life: 0, updated: false };
    }
  }
}
```

**What's happening:**
- The constructor sizes the canvas to exactly `800x600` pixels (200 cells * 4px each).
- `state.grid` is a flat array of 30,000 slots, all initially `null` (empty).
- `placeTestParticles()` drops some hardcoded sand, water, and stone so we can verify the renderer is working. We will replace this with interactive placement in later steps.
- The game loop simply calls the renderer each frame. No simulation logic yet.

---

### 4. Create the Platform Adapter

**File:** `src/contexts/canvas2d/games/particle-sand/adapters/PlatformAdapter.ts`

A thin wrapper so the game plugs into any host page.

```typescript
import { SandEngine } from '../SandEngine';

export class PlatformAdapter {
  private engine: SandEngine;

  constructor(canvas: HTMLCanvasElement) {
    this.engine = new SandEngine(canvas);
  }

  start(): void {
    this.engine.start();
  }

  destroy(): void {
    this.engine.destroy();
  }
}
```

---

### 5. Create the Entry Point

**File:** `src/contexts/canvas2d/games/particle-sand/index.ts`

```typescript
import { PlatformAdapter } from './adapters/PlatformAdapter';

export function createParticleSand(canvas: HTMLCanvasElement): { destroy: () => void } {
  const adapter = new PlatformAdapter(canvas);
  adapter.start();
  return { destroy: () => adapter.destroy() };
}
```

---

## Test It

1. **Run:** `npm run dev`
2. **Open:** the Particle Sand game in your browser
3. **Observe:**
   - Dark `#1a1a2e` background filling the 800x600 canvas
   - A **golden-yellow rectangle** of sand particles near the bottom center
   - A **blue row** of water particles on the bottom left
   - A **grey row** of stone particles forming a shelf
   - Each particle type shows subtle **color variation** between adjacent cells
4. **Inspect:** Open DevTools and check the canvas dimensions are 800x600

---

## Challenges

**Easy:**
- Change `CELL_SIZE` to `2` and observe how the grid becomes much finer (400x300 pixels but 200x150 cells).
- Add a few fire particles to `placeTestParticles()` and verify they appear orange.

**Medium:**
- Add a grid line overlay: draw faint lines every 10 cells so you can see the grid structure on top of the ImageData.

**Hard:**
- Implement a `randomFill()` method that fills 5% of the grid with random particle types and displays a colorful mosaic.

---

## What You Learned

- Defining a flat 1D grid with index math `y * gridW + x` for fast particle simulation
- Rendering tens of thousands of cells efficiently using `ImageData` and `putImageData()`
- Setting up a `requestAnimationFrame` game loop with engine/renderer separation
- Using hex color variant arrays for natural-looking particle visuals

**Next:** Sand particles and gravity -- make particles fall, pile up, and slide realistically!
