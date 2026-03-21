# Step 5: Brush Tools & Polish

**Goal:** Add an HUD with a material palette bar, adjustable brush size, particle counter, pause overlay, and a brush cursor preview.

**Time:** ~15 minutes

---

## What You'll Build

- **HUD top bar** showing selected material, particle count, and brush size
- **Bottom palette bar** with clickable color swatches for each particle type
- **Brush size controls** using `[` and `]` keys (range 1-10)
- **Brush cursor** that draws a circle preview at the mouse position
- **Pause overlay** with `P` key that dims the screen and shows "PAUSED"
- **Clear shortcut** with `C` key to wipe the grid

---

## Concepts

- **HUD Layering**: The HUD renders on top of the game after `putImageData`. Since `putImageData` overwrites canvas content, HUD elements use regular Canvas2D calls (`fillText`, `roundRect`, etc.) drawn after the pixel buffer.
- **Palette Bar**: Each particle type gets a slot with a color swatch, label, and key number. The selected type is highlighted with a border. Clicking a slot selects that material.
- **Brush Cursor**: A semi-transparent circle drawn at the mouse position shows the brush radius. This gives visual feedback before placing particles.
- **Pause State**: When paused, the simulation loop skips `particleSystem.update()` but still renders, so you can see the frozen state. A dark overlay and text indicate the paused state.

---

## Code

### 1. Create the HUD Renderer

**File:** `src/contexts/canvas2d/games/particle-sand/renderers/HUDRenderer.ts`

Renders the top info bar, bottom palette, and pause overlay.

```typescript
import type { SandState } from '../types';
import { PARTICLE_TYPES, PARTICLE_COLORS, PARTICLE_LABELS } from '../types';

export class HUDRenderer {
  render(ctx: CanvasRenderingContext2D, state: SandState): void {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    // Top bar
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, W, 36);

    ctx.font = 'bold 14px monospace';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';

    // Exit button
    ctx.fillStyle = '#666';
    ctx.fillText('< EXIT', 12, 18);

    // Selected material
    ctx.fillStyle = '#ffb74d';
    ctx.textAlign = 'center';
    ctx.fillText(`Material: ${PARTICLE_LABELS[state.selectedType]}`, W / 2, 18);

    // Particle count
    ctx.fillStyle = '#888';
    ctx.textAlign = 'right';
    ctx.fillText(`Particles: ${state.particleCount}`, W - 120, 18);

    // Brush size
    ctx.fillStyle = '#666';
    ctx.fillText(`Brush: ${state.brushSize}`, W - 12, 18);

    // Bottom palette bar
    this.renderPalette(ctx, state, W, H);

    // Paused overlay
    if (state.paused) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(0, 0, W, H);
      ctx.font = `bold ${Math.min(48, W * 0.06)}px monospace`;
      ctx.fillStyle = '#ffb74d';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = '#ffb74d';
      ctx.shadowBlur = 20;
      ctx.fillText('PAUSED', W / 2, H / 2 - 20);
      ctx.shadowBlur = 0;
      ctx.font = `${Math.min(16, W * 0.025)}px monospace`;
      ctx.fillStyle = '#aaa';
      ctx.fillText('Press P to resume', W / 2, H / 2 + 20);
    }

    // Help hint
    ctx.font = '11px monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.fillText('[H] Help', W - 12, 42);
  }

  private renderPalette(
    ctx: CanvasRenderingContext2D, state: SandState, W: number, H: number
  ): void {
    const barH = 44;
    const barY = H - barH;

    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, barY, W, barH);

    const slotW = 64;
    const totalW = PARTICLE_TYPES.length * slotW;
    const startX = (W - totalW) / 2;

    for (let i = 0; i < PARTICLE_TYPES.length; i++) {
      const type = PARTICLE_TYPES[i];
      const x = startX + i * slotW;
      const isSelected = state.selectedType === type;

      // Slot background highlight
      if (isSelected) {
        ctx.fillStyle = 'rgba(255, 183, 77, 0.25)';
        ctx.beginPath();
        ctx.roundRect(x + 2, barY + 4, slotW - 4, barH - 8, 6);
        ctx.fill();
        ctx.strokeStyle = '#ffb74d';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(x + 2, barY + 4, slotW - 4, barH - 8, 6);
        ctx.stroke();
      }

      // Color swatch
      const colors = PARTICLE_COLORS[type];
      ctx.fillStyle = colors[0];
      ctx.beginPath();
      ctx.roundRect(x + 10, barY + 8, 16, 16, 3);
      ctx.fill();

      // Label
      ctx.font = '10px monospace';
      ctx.fillStyle = isSelected ? '#ffb74d' : '#888';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(PARTICLE_LABELS[type], x + slotW / 2, barY + 27);

      // Key number hint
      ctx.font = 'bold 9px monospace';
      ctx.fillStyle = isSelected ? '#ffb74d' : '#555';
      ctx.fillText(`${i + 1}`, x + slotW - 12, barY + 8);
    }
  }
}
```

**What's happening:**
- The **top bar** is a semi-transparent black rectangle showing: exit button (left), selected material name (center), particle count and brush size (right).
- The **bottom palette** centers 5 slots (one per particle type). Each slot has a 16x16 color swatch, a label, and a key number. The selected slot gets an orange border and highlight.
- The **pause overlay** fills the entire canvas with 50% black, then draws "PAUSED" with an orange glow (`shadowBlur = 20`) and a "Press P to resume" hint below.
- `roundRect` creates rounded rectangles for the slots and swatches, giving the UI a polished look.

---

### 2. Add Brush Cursor to the Game Renderer

**File:** `src/contexts/canvas2d/games/particle-sand/renderers/GameRenderer.ts`

Add a cursor circle drawn after the `putImageData` call.

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

    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, W, H);

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

    for (let i = 0; i < data.length; i += 4) {
      data[i]     = 26;
      data[i + 1] = 26;
      data[i + 2] = 46;
      data[i + 3] = 255;
    }

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

        let alpha = 255;
        if (p.type === 'fire') {
          alpha = Math.max(60, Math.min(255, Math.floor((p.life / 140) * 255)));
        } else if (p.type === 'steam') {
          alpha = Math.max(40, Math.min(200, Math.floor((p.life / 140) * 200)));
        }

        const px0 = gx * cs;
        const py0 = gy * cs;

        for (let py = py0; py < py0 + cs && py < pixH; py++) {
          for (let px = px0; px < px0 + cs && px < pixW; px++) {
            const i = (py * pixW + px) * 4;

            if (alpha === 255) {
              data[i]     = r;
              data[i + 1] = g;
              data[i + 2] = b;
              data[i + 3] = 255;
            } else {
              const a = alpha / 255;
              data[i]     = Math.floor(26 * (1 - a) + r * a);
              data[i + 1] = Math.floor(26 * (1 - a) + g * a);
              data[i + 2] = Math.floor(46 * (1 - a) + b * a);
              data[i + 3] = 255;
            }
          }
        }
      }
    }

    ctx.putImageData(this.imageData, 0, 0);

    // Draw brush cursor (after putImageData so it renders on top)
    if (
      state.mouseX >= 0 &&
      state.mouseX < state.gridW &&
      state.mouseY >= 0 &&
      state.mouseY < state.gridH
    ) {
      const cursorX = state.mouseX * cs;
      const cursorY = state.mouseY * cs;
      const cursorR = state.brushSize * cs;

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cursorX + cs / 2, cursorY + cs / 2, cursorR, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}
```

**What's happening:**
- After `putImageData()` blits the pixel buffer, we draw the brush cursor using Canvas2D `arc()`. This must come after because `putImageData` overwrites anything underneath.
- The cursor is a white circle at 40% opacity, centered on the current mouse grid cell. Its radius is `brushSize * cellSize` pixels, matching the circular brush used in `placeParticles()`.
- The cursor only draws when the mouse is within grid bounds (not off-screen).

---

### 3. Update the Engine

**File:** `src/contexts/canvas2d/games/particle-sand/SandEngine.ts`

Wire in the HUD renderer, brush size keys, pause, and palette clicks.

```typescript
import type { SandState } from './types';
import { GRID_W, GRID_H, CELL_SIZE, PARTICLE_TYPES } from './types';
import type { ParticleType } from './types';
import { ParticleSystem } from './systems/ParticleSystem';
import { GameRenderer } from './renderers/GameRenderer';
import { HUDRenderer } from './renderers/HUDRenderer';

export class SandEngine {
  private ctx: CanvasRenderingContext2D;
  private state: SandState;
  private running: boolean;
  private rafId: number;

  private particleSystem: ParticleSystem;
  private gameRenderer: GameRenderer;
  private hudRenderer: HUDRenderer;

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
    this.hudRenderer = new HUDRenderer();

    // Keyboard handler
    this.keyHandler = (e: KeyboardEvent) => {
      // Number keys select particle type
      const num = parseInt(e.key, 10);
      if (num >= 1 && num <= PARTICLE_TYPES.length) {
        this.state.selectedType = PARTICLE_TYPES[num - 1] as ParticleType;
        return;
      }

      // Brush size
      if (e.key === '[' || e.key === '-') {
        this.state.brushSize = Math.max(1, this.state.brushSize - 1);
      }
      if (e.key === ']' || e.key === '=') {
        this.state.brushSize = Math.min(10, this.state.brushSize + 1);
      }

      // Pause
      if (e.key === 'p' || e.key === 'P') {
        this.state.paused = !this.state.paused;
      }

      // Clear
      if (e.key === 'c' || e.key === 'C') {
        this.clearGrid();
      }
    };

    // Mouse handlers
    this.mouseDownHandler = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;

      // Check palette clicks (bottom bar)
      if (y > canvas.height - 50) {
        this.handlePaletteClick(x);
        return;
      }

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
    this.hudRenderer.render(this.ctx, this.state);

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

  private handlePaletteClick(x: number): void {
    const W = this.ctx.canvas.width;
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
- The game loop now calls `hudRenderer.render()` after the game renderer, layering the HUD on top.
- `[` and `]` keys adjust brush size between 1 (fine detail) and 10 (broad strokes). `-` and `=` are alternatives for keyboards without easy bracket access.
- `P` toggles `state.paused`. When paused, `ParticleSystem.update()` returns early (it checks `state.paused` first), but rendering continues so the paused overlay is visible.
- `mouseDownHandler` checks if the click is in the bottom 50 pixels. If so, it delegates to `handlePaletteClick()` which determines which slot was clicked based on x-position. Otherwise, it starts placing particles.
- `handlePaletteClick()` calculates the palette start position (centered horizontally) and divides by slot width to find the clicked index.

---

## Test It

1. **Run:** `npm run dev`
2. **Observe the HUD:**
   - Top bar shows "Material: Sand", particle count, and brush size
   - Bottom palette shows 5 material slots with colored swatches
   - Sand slot has an orange highlight border (selected by default)
3. **Click palette slots** to switch materials -- the top bar label updates
4. **Press `[` and `]`** to adjust brush size -- watch the cursor circle grow/shrink
5. **Press `P`** to pause -- the screen dims and shows "PAUSED"
6. **Press `P`** again to resume -- particles continue moving
7. **Press `C`** to clear the grid
8. **Move your mouse** over the canvas -- a white circle cursor follows

---

## Challenges

**Easy:**
- Change the palette accent color from `#ffb74d` (orange) to `#4fc3f7` (blue) throughout the HUD.
- Add a "CLEAR" text button to the top bar next to the exit button.

**Medium:**
- Show the brush cursor in the selected material's color instead of white. Use `PARTICLE_COLORS[state.selectedType][0]` for the stroke color.

**Hard:**
- Add an "eraser" tool (key `0`) that removes particles when you click, using the same circular brush but setting cells to `null` instead of creating particles.

---

## What You Learned

- Layering HUD elements on top of `putImageData` with regular Canvas2D drawing calls
- Building a clickable palette bar with hit-testing based on x-position
- Drawing a brush cursor preview that matches the actual placement radius
- Implementing pause by skipping simulation updates while continuing to render

**Next:** Input system and final polish -- extract input handling, add touch support, and wire up the complete game!
