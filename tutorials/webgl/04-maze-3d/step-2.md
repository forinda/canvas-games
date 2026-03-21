# Step 2: Wall Geometry & Rendering

**Goal:** Convert the maze grid into 3D wall geometry using scaled cubes, add floor and ceiling, and render a pulsing exit marker.

**Time:** ~15 minutes

---

## What You'll Build

- **Fog fragment shader** — distance-based fog that fades objects to the background color
- **Floor and ceiling** — large flat cubes spanning the entire maze
- **Wall rendering** — iterate over the grid and draw a cube for each wall segment
- **Exit marker** — a glowing green pillar at the goal cell

---

## Concepts

- **Distance Fog**: The fragment shader computes the distance from the camera to each fragment. Using `1.0 - exp(-dist * fogDensity)`, objects far away blend toward the fog color. Exponential fog looks more natural than linear fog and is cheap to compute.

- **Grid-to-World Mapping**: Cell `(row, col)` maps to world position `(col * CELL_SIZE, 0, row * CELL_SIZE)`. Walls sit at cell boundaries. North wall of cell `(r, c)` is at `z = r * CELL_SIZE`. East wall is at `x = (c + 1) * CELL_SIZE`.

- **Wall Deduplication**: Each internal wall is shared between two cells. Without care, you'd draw it twice. The engine only draws north and west walls for each cell, plus south walls for the last row and east walls for the last column. This covers every wall exactly once.

---

## Code

### 2.1 — Fog Fragment Shader

**File:** `src/contexts/webgl/games/maze-3d/shaders.ts`

```glsl
uniform float uFogDensity;

void main() {
    // ... lighting calculations ...
    vec3 litColor = uColor * light + vec3(1.0) * spec * 0.15;

    // Distance fog
    float dist = length(uCameraPos - vWorldPos);
    float fog = 1.0 - exp(-dist * uFogDensity);
    vec3 fogColor = vec3(0.02, 0.02, 0.06);

    fragColor = vec4(mix(litColor, fogColor, fog), 1.0);
}
```

**What's happening:**
- `length(uCameraPos - vWorldPos)` computes the Euclidean distance from the camera to this fragment.
- `exp(-dist * density)` drops from 1.0 (at the camera) toward 0 as distance increases. `1 - exp(...)` inverts it: 0 at camera, approaching 1 far away.
- `mix(litColor, fogColor, fog)` blends the object's lit color toward the dark blue fog color.
- At `uFogDensity = 0.06`, objects at ~15 units are about 60% fogged, and at ~40 units they're nearly invisible. This limits visibility to a few corridors ahead.
- `fogColor` matches `gl.clearColor` so fogged objects blend seamlessly into the background.

---

### 2.2 — Floor and Ceiling

```typescript
private render(): void {
    const { gl, canvas, state } = this;
    // ... setup projection, view, light, camera, fog uniforms ...
    gl.uniform1f(this.uFogDensity, 0.06);

    const totalW = state.cols * CELL_SIZE;
    const totalH = state.rows * CELL_SIZE;

    // Floor — large flat box at y = -0.05
    this.drawBox(totalW / 2, -0.05, totalH / 2,
                 totalW / 2, 0.05, totalH / 2,
                 0.15, 0.18, 0.22);

    // Ceiling — same size at y = WALL_HEIGHT + 0.05
    this.drawBox(totalW / 2, WALL_HEIGHT + 0.05, totalH / 2,
                 totalW / 2, 0.05, totalH / 2,
                 0.08, 0.08, 0.12);
}
```

**What's happening:**
- Floor and ceiling are centered at `(totalW/2, y, totalH/2)` — the middle of the maze.
- Floor at `y = -0.05` (just below ground), ceiling at `y = WALL_HEIGHT + 0.05` (just above wall tops).
- The ceiling is darker than the floor, creating a sense of enclosure. Combined with fog, this produces an atmospheric dungeon feel.

---

### 2.3 — Wall Rendering from Grid

```typescript
const hw = WALL_THICK / 2;   // half wall thickness
const hh = WALL_HEIGHT / 2;  // half wall height

for (let r = 0; r < state.rows; r++) {
    for (let c = 0; c < state.cols; c++) {
        const cell = state.grid[r][c];
        const cx = c * CELL_SIZE;
        const cz = r * CELL_SIZE;

        // North wall (z = cz, runs along X)
        if (cell.walls.north) {
            this.drawBox(cx + CELL_SIZE / 2, hh, cz,
                         CELL_SIZE / 2, hh, hw,
                         0.3, 0.25, 0.35);
        }

        // West wall (x = cx, runs along Z)
        if (cell.walls.west) {
            this.drawBox(cx, hh, cz + CELL_SIZE / 2,
                         hw, hh, CELL_SIZE / 2,
                         0.28, 0.23, 0.33);
        }

        // South wall — only for last row
        if (r === state.rows - 1 && cell.walls.south) {
            this.drawBox(cx + CELL_SIZE / 2, hh, cz + CELL_SIZE,
                         CELL_SIZE / 2, hh, hw,
                         0.3, 0.25, 0.35);
        }

        // East wall — only for last column
        if (c === state.cols - 1 && cell.walls.east) {
            this.drawBox(cx + CELL_SIZE, hh, cz + CELL_SIZE / 2,
                         hw, hh, CELL_SIZE / 2,
                         0.28, 0.23, 0.33);
        }
    }
}
```

**What's happening:**
- **North/west for all cells**: Every cell draws its own north and west walls. Since cell `(r, c)`'s south wall is cell `(r+1, c)`'s north wall, this handles internal walls without duplication.
- **South/east only for boundary**: The last row needs south walls (no cell below to handle them). The last column needs east walls.
- Wall position: North wall runs along X at `z = r * CELL_SIZE`. It's centered at `cx + CELL_SIZE/2` with half-extent `CELL_SIZE/2`, creating a segment exactly one cell wide.
- Wall colors are slightly different for north/south vs east/west walls. This subtle variation helps with depth perception in the foggy corridors.

---

### 2.4 — Exit Marker

```typescript
const exitX = state.exitCol * CELL_SIZE + CELL_SIZE / 2;
const exitZ = state.exitRow * CELL_SIZE + CELL_SIZE / 2;
const pulse = 0.5 + Math.sin(performance.now() * 0.003) * 0.3;

this.drawBox(exitX, 0.5, exitZ,
             0.2, 0.5, 0.2,
             0.1 * pulse, 0.9 * pulse, 0.2 * pulse);
```

**What's happening:**
- The exit is at `(rows-1, cols-1)` — the opposite corner from the start `(0, 0)`.
- The marker is a vertical pillar: 0.4 units wide, 1.0 unit tall (`sy = 0.5`, half-extent).
- `pulse` oscillates between 0.2 and 0.8, making the green color breathe. This animation is visible through fog as a faint glow, guiding the player.
- The color multiplied by `pulse` means both brightness and hue shift — at `pulse = 0.8`, the green channel is `0.72`. At `pulse = 0.2`, it's `0.18`. This creates a "beacon" effect.

---

## Test It

```bash
pnpm dev
```

1. Select "3D Maze" from the 3D category
2. You should see **corridors** formed by purple-ish walls
3. A **floor** and **ceiling** should enclose the maze
4. Objects far away should **fade into dark blue fog**
5. A **pulsing green pillar** should be visible at the far corner (or its glow through fog)
6. You can't move yet — the FPS camera comes in Step 3

---

## Challenges

**Easy:**
- Change `uFogDensity` from 0.06 to 0.02. How much more of the maze can you see?

**Medium:**
- Give north/south walls and east/west walls more contrasting colors (e.g., warm vs cool tones). Does this help with navigation?

**Hard:**
- Add a second "decoy" pillar at a random cell (not the exit) with a red pulse instead of green. This creates a false target the player must learn to distinguish.

---

## What You Learned

- Exponential fog (`1 - exp(-dist * density)`) naturally fades distant objects
- Grid-to-world mapping: `(col * CELL_SIZE, 0, row * CELL_SIZE)`
- Wall deduplication: draw north/west for all cells, south/east only for boundary cells
- Pulsing colors via `sin(time)` create beacon effects visible through fog

**Next:** We'll add a first-person camera with pointer lock and wall collision.

---
[← Previous Step](./step-1.md) | [Back to README](./README.md) | [Next Step →](./step-3.md)
