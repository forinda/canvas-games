# Step 4: Fire, Stone & Interactions

**Goal:** Add fire that rises and fades, stone that never moves, steam as a reaction product, and element interaction rules.

**Time:** ~15 minutes

---

## What You'll Build

- **Fire particles** that rise upward with random sway and fade out over time
- **Stone particles** that are completely static and act as walls
- **Steam particles** that rise slowly, drift sideways, and dissipate
- **Water + Fire = Steam** interaction: when water and fire touch, both convert to steam
- **Life-based fading** in the renderer for fire and steam transparency
- **Two-pass simulation**: bottom-to-top for falling particles, top-to-bottom for rising particles

---

## Concepts

- **Two-Pass Processing**: Sand and water fall, so they are processed bottom-to-top. Fire and steam rise, so they are processed top-to-bottom. Two passes prevent particles from being processed in the wrong order.
- **Particle Lifetime**: Fire and steam have a `life` counter that decreases each frame. When it reaches 0, the particle is removed. Fire starts with 60-140 frames of life, steam with 80-140.
- **Element Interactions**: When fire is adjacent to water (any of the 8 neighbors), both convert to steam. This is checked before movement so the reaction takes priority.
- **Rising with Sway**: Fire and steam move upward but with random horizontal drift. This creates a flickering, organic look rather than straight vertical lines.

---

## Code

### 1. Update the Particle System

**File:** `src/contexts/canvas2d/games/particle-sand/systems/ParticleSystem.ts`

Add fire, stone, and steam handlers plus element interaction logic.

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

    // Bottom-to-top pass: sand, water
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
          default:
            break;
        }
      }
    }

    // Top-to-bottom pass: fire, steam
    for (let y = 0; y < state.gridH; y++) {
      for (let x = 0; x < state.gridW; x++) {
        const idx = y * state.gridW + x;
        const p = state.grid[idx];

        if (!p || p.updated) continue;

        switch (p.type) {
          case 'fire':
            this.updateFire(state, x, y, idx, p);
            break;
          case 'steam':
            this.updateSteam(state, x, y, idx, p);
            break;
          case 'stone':
            // Stone never moves
            break;
          default:
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

        // Fire and steam get a randomized lifetime
        const life =
          state.selectedType === 'fire'
            ? 60 + Math.floor(Math.random() * 80)
            : state.selectedType === 'steam'
              ? 80 + Math.floor(Math.random() * 60)
              : 0;

        state.grid[idx] = {
          type: state.selectedType,
          life: life,
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

  private inBounds(state: SandState, x: number, y: number): boolean {
    return x >= 0 && x < state.gridW && y >= 0 && y < state.gridH;
  }

  private updateSand(
    state: SandState, x: number, y: number, idx: number, p: Particle
  ): void {
    if (this.isEmpty(state, x, y + 1)) {
      this.swap(state, idx, (y + 1) * state.gridW + x, p);
      return;
    }

    if (this.isType(state, x, y + 1, 'water')) {
      this.swap(state, idx, (y + 1) * state.gridW + x, p);
      return;
    }

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
    // Check for adjacent fire -> convert both to steam
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;

        const nx = x + dx;
        const ny = y + dy;

        if (this.isType(state, nx, ny, 'fire')) {
          // Convert this water to steam
          p.type = 'steam';
          p.life = 80 + Math.floor(Math.random() * 60);
          p.updated = true;
          // Convert the fire to steam too
          const fireIdx = ny * state.gridW + nx;
          const fire = state.grid[fireIdx]!;
          fire.type = 'steam';
          fire.life = 80 + Math.floor(Math.random() * 60);
          fire.updated = true;
          return;
        }
      }
    }

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

    // Flow sideways
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

  private updateFire(
    state: SandState, x: number, y: number, idx: number, p: Particle
  ): void {
    p.life--;

    if (p.life <= 0) {
      state.grid[idx] = null;
      return;
    }

    // Check for adjacent water -> both become steam
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;

        const nx = x + dx;
        const ny = y + dy;

        if (this.isType(state, nx, ny, 'water')) {
          p.type = 'steam';
          p.life = 80 + Math.floor(Math.random() * 60);
          p.updated = true;
          const waterIdx = ny * state.gridW + nx;
          const water = state.grid[waterIdx]!;
          water.type = 'steam';
          water.life = 80 + Math.floor(Math.random() * 60);
          water.updated = true;
          return;
        }
      }
    }

    // Rise upward with random sway
    const sway = Math.random() < 0.3 ? (Math.random() < 0.5 ? -1 : 1) : 0;
    const nx = x + sway;
    const ny = y - 1;

    if (this.inBounds(state, nx, ny) && this.isEmpty(state, nx, ny)) {
      this.swap(state, idx, ny * state.gridW + nx, p);
      return;
    }

    // Try straight up
    if (this.isEmpty(state, x, y - 1)) {
      this.swap(state, idx, (y - 1) * state.gridW + x, p);
      return;
    }

    // Try sideways
    if (Math.random() < 0.4) {
      const dir = Math.random() < 0.5 ? -1 : 1;
      if (this.isEmpty(state, x + dir, y)) {
        this.swap(state, idx, y * state.gridW + (x + dir), p);
      }
    }
  }

  private updateSteam(
    state: SandState, x: number, y: number, idx: number, p: Particle
  ): void {
    p.life--;

    if (p.life <= 0) {
      state.grid[idx] = null;
      return;
    }

    // Rise with random sway
    const sway = Math.random() < 0.5 ? (Math.random() < 0.5 ? -1 : 1) : 0;
    const nx = x + sway;
    const ny = y - 1;

    if (this.inBounds(state, nx, ny) && this.isEmpty(state, nx, ny)) {
      this.swap(state, idx, ny * state.gridW + nx, p);
      return;
    }

    if (this.isEmpty(state, x, y - 1)) {
      this.swap(state, idx, (y - 1) * state.gridW + x, p);
      return;
    }

    // Drift sideways
    const dir = Math.random() < 0.5 ? -1 : 1;
    if (this.isEmpty(state, x + dir, y)) {
      this.swap(state, idx, y * state.gridW + (x + dir), p);
    }
  }
}
```

**What's happening:**
- The update loop now has **two passes**: bottom-to-top for sand/water (they fall), top-to-bottom for fire/steam (they rise). This ensures rising particles cascade upward correctly.
- `updateFire()` decrements `life` each frame and removes the particle when it hits 0. Before moving, it checks all 8 neighbors for water. If found, both particles convert to steam with the `type` field mutated in-place.
- Fire rises with a 30% chance of horizontal sway (`Math.random() < 0.3`), giving it a flickering appearance. If it cannot rise, it tries to move sideways with a 40% chance.
- `updateSteam()` is similar to fire but with a 50% sway chance, making steam drift more lazily. Steam also starts with a longer life than fire.
- Stone has no `update` method -- it simply exists in the grid and blocks all other particles. The `case 'stone': break;` makes this explicit.
- `placeParticles()` now assigns randomized `life` values for fire (60-140) and steam (80-140).

---

### 2. Update the Renderer for Fire/Steam Fading

**File:** `src/contexts/canvas2d/games/particle-sand/renderers/GameRenderer.ts`

Add alpha blending for fire and steam based on their remaining life.

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

    // Clear to background
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

        // Apply fade for fire and steam based on remaining life
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
              // Blend with background for transparency effect
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
  }
}
```

**What's happening:**
- Fire and steam compute an `alpha` value based on `p.life / 140`. As life decreases, the alpha drops, making the particle fade out.
- Since `ImageData` does not support native alpha compositing, we manually blend the particle color with the background color `(26, 26, 46)` using the formula `bg * (1 - a) + fg * a`.
- Fire fades from full brightness (alpha 255) down to a minimum of 60 before being removed. Steam caps at alpha 200 so it always looks slightly translucent.
- Sand, water, and stone have `alpha = 255` so no blending math is applied -- the `if (alpha === 255)` fast path avoids unnecessary multiplication.

---

## Test It

1. **Run:** `npm run dev`
2. **Press `4`** (stone) and draw walls to create a container
3. **Press `3`** (fire) and draw fire inside the container
4. **Observe:**
   - Fire particles **rise upward** with flickering sway
   - Fire **fades out** gradually and disappears
   - Fire is **blocked by stone** walls
5. **Press `2`** (water) and drop water onto the fire
6. **Observe:**
   - Water and fire **convert to steam** on contact
   - Steam rises, drifts sideways, and eventually **dissipates**
7. **Try these experiments:**
   - Build a stone box, fill it with water, then add fire underneath -- watch steam rise from the surface
   - Create a fire column and pour sand through it -- sand falls through (fire moves aside), creating a cool visual
   - Build a stone maze and pour water through it

---

## Challenges

**Easy:**
- Increase fire lifetime to `120 + Math.floor(Math.random() * 120)` and observe how much longer the flames last.
- Change fire colors to blue tones for a "cold fire" effect.

**Medium:**
- Add a rule where fire touching sand has a 5% chance of converting the sand to glass (a new static particle with a cyan color).

**Hard:**
- Implement "lava" as a new particle type that flows like water but converts water to steam and sand to stone on contact.

---

## What You Learned

- Processing rising particles (fire, steam) top-to-bottom while falling particles go bottom-to-top
- Implementing particle lifetime with frame-based countdown and automatic removal
- Creating element interactions where particles mutate in place (water + fire = steam)
- Alpha blending in ImageData by manually mixing foreground and background colors

**Next:** Brush tools and polish -- add adjustable brush size, a material palette, and HUD overlays!
