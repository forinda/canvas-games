# Step 1: Grid & Block Rendering

**Goal:** Set up a 16x16x16 voxel grid data structure, render a ground plane with grid lines, and draw cubes for placed voxels with an orbital camera.

**Time:** ~15 minutes

---

## What You'll Build

- A **3D array** `grid[y][z][x]` storing voxel data (null = empty, object = block)
- A **ground plane** with grid lines showing the XZ footprint
- **Voxel cubes** rendered at grid positions with per-block coloring
- An **orbital camera** for rotating around the build area

---

## Concepts

- **3D array for voxels**: The grid is `(Voxel | null)[][][]` — three nested arrays indexed by `[y][z][x]`. Y is vertical (up), Z is depth, X is horizontal. `null` means empty, a `Voxel` object stores the block type index.

- **Grid-to-world mapping**: Grid coordinate `(gx, gy, gz)` maps to world position `(gx * VOXEL_SIZE + VOXEL_SIZE/2, gy * VOXEL_SIZE + VOXEL_SIZE/2, gz * VOXEL_SIZE + VOXEL_SIZE/2)`. The `+ VOXEL_SIZE/2` centers the cube in its cell.

- **Orbital camera**: The `OrbitalCamera` from shared utilities handles drag-to-orbit, scroll-to-zoom, and provides `getViewMatrix()` and `getPosition()` for the render loop. The target is set to the center of the grid.

- **Alpha blending**: The shader outputs `fragColor = vec4(color, uAlpha)`. With `gl.enable(gl.BLEND)` and `gl.blendFunc(SRC_ALPHA, ONE_MINUS_SRC_ALPHA)`, we can render transparent objects (like the cursor in step 2).

---

## Code

### 1.1 — Voxel Grid Data Structure

**File:** `src/contexts/webgl/games/voxel-builder/types.ts`

```typescript
export const GRID_SIZE = 16;
export const VOXEL_SIZE = 1;

export interface Voxel {
    typeIdx: number;
}

export interface VoxelBuilderState {
    /** 3D grid: grid[y][z][x], null = empty */
    grid: (Voxel | null)[][][];
    selectedType: number;
    cursorX: number;
    cursorY: number;
    cursorZ: number;
    blockCount: number;
}
```

**What's happening:**
- `GRID_SIZE = 16` gives a 16x16x16 build space (4096 possible block positions).
- `VOXEL_SIZE = 1` means each block is 1 world unit. Changing this scales the entire build area.
- The grid is indexed as `grid[y][z][x]` — Y first because vertical layers are the natural grouping (a "floor" is a full Y layer).
- `typeIdx` references into the `BLOCK_TYPES` array for color.

---

### 1.2 — Grid Initialization

**File:** `src/contexts/webgl/games/voxel-builder/VoxelBuilderEngine.ts`

```typescript
private createState(): VoxelBuilderState {
    const grid: (Voxel | null)[][][] = [];

    for (let y = 0; y < GRID_SIZE; y++) {
        const layer: (Voxel | null)[][] = [];

        for (let z = 0; z < GRID_SIZE; z++) {
            const row: (Voxel | null)[] = [];

            for (let x = 0; x < GRID_SIZE; x++) {
                row.push(null);
            }

            layer.push(row);
        }

        grid.push(layer);
    }

    return {
        grid,
        selectedType: 0,
        cursorX: Math.floor(GRID_SIZE / 2),
        cursorY: 0,
        cursorZ: Math.floor(GRID_SIZE / 2),
        blockCount: 0,
    };
}
```

**What's happening:**
- Three nested loops create a 16x16x16 grid filled with `null` (empty).
- The cursor starts at the center of the ground floor: `(8, 0, 8)`.
- `blockCount` tracks total placed blocks — useful for a UI counter.

---

### 1.3 — Ground Plane and Grid Lines

```typescript
// In render():
const gridExtent = GRID_SIZE * VOXEL_SIZE;

// Ground plane
Mat4.identity(this.modelMatrix);
Mat4.translate(this.modelMatrix, this.modelMatrix, [gridExtent / 2, -0.01, gridExtent / 2]);
Mat4.scale(this.modelMatrix, this.modelMatrix, [gridExtent / 2, 1, gridExtent / 2]);
gl.uniformMatrix4fv(this.uModel, false, this.modelMatrix);
gl.uniform3f(this.uColor, 0.35, 0.55, 0.3);
this.drawMesh(this.planeMesh);

// Grid lines
for (let i = 0; i <= GRID_SIZE; i++) {
    const pos = i * VOXEL_SIZE;

    // X-axis lines
    this.drawBoxRaw(gridExtent / 2, 0.005, pos, gridExtent / 2, 0.005, 0.02, 0.2, 0.3, 0.2);
    // Z-axis lines
    this.drawBoxRaw(pos, 0.005, gridExtent / 2, 0.02, 0.005, gridExtent / 2, 0.2, 0.3, 0.2);
}
```

**What's happening:**
- The ground plane is centered at `(gridExtent/2, -0.01, gridExtent/2)` — the `createPlane` primitive is a unit quad, so scaling by `gridExtent/2` makes it cover the full grid.
- Grid lines are very thin boxes (0.02 units wide, 0.005 units tall) running the full grid extent. 17 lines in each direction (0 through 16) create a visible grid on the ground.
- Lines sit at `y = 0.005` — just above the plane surface at `y = -0.01` to avoid Z-fighting.

---

### 1.4 — Rendering Placed Voxels

```typescript
for (let y = 0; y < GRID_SIZE; y++) {
    for (let z = 0; z < GRID_SIZE; z++) {
        for (let x = 0; x < GRID_SIZE; x++) {
            const voxel = s.grid[y][z][x];
            if (!voxel) continue;

            const bt = BLOCK_TYPES[voxel.typeIdx];
            const wx = x * VOXEL_SIZE + VOXEL_SIZE / 2;
            const wy = y * VOXEL_SIZE + VOXEL_SIZE / 2;
            const wz = z * VOXEL_SIZE + VOXEL_SIZE / 2;

            Mat4.identity(this.modelMatrix);
            Mat4.translate(this.modelMatrix, this.modelMatrix, [wx, wy, wz]);
            Mat4.scale(this.modelMatrix, this.modelMatrix, [
                VOXEL_SIZE / 2 * 0.98,
                VOXEL_SIZE / 2 * 0.98,
                VOXEL_SIZE / 2 * 0.98,
            ]);
            gl.uniformMatrix4fv(this.uModel, false, this.modelMatrix);
            gl.uniform3f(this.uColor, bt.color[0], bt.color[1], bt.color[2]);
            gl.uniform1f(this.uAlpha, 1.0);
            this.drawMesh(this.cubeMesh);
        }
    }
}
```

**What's happening:**
- Triple-nested loop iterates all 4096 cells. `continue` skips empty cells.
- Grid-to-world: `wx = x * 1 + 0.5` centers the cube in its cell.
- Scale is `0.98 * VOXEL_SIZE / 2` — the `0.98` leaves a tiny gap between adjacent blocks, giving the distinctive "voxel" look where you can see individual blocks.
- Color comes from `BLOCK_TYPES[voxel.typeIdx].color` — each block type has its own RGB color.

---

## Test It

```bash
pnpm dev
```

1. Select "Voxel Builder" from the 3D category
2. You should see a **green ground plane** with **grid lines**
3. **Drag** to orbit the camera around the empty grid
4. **Scroll** to zoom in and out
5. No blocks placed yet — that comes in step 2
6. The grid should be 16x16 cells visible on the ground

---

## Challenges

**Easy:**
- Change `GRID_SIZE` from 16 to 8 or 32. How does it affect the build area and camera framing?

**Medium:**
- Pre-populate the grid with a floor: in `createState`, set `grid[0][z][x] = { typeIdx: 0 }` for all x and z.

**Hard:**
- Add a wireframe outline to each voxel: after drawing the filled cube, draw 12 thin boxes for the edges (one per cube edge) in a darker color.

---

## What You Learned

- A 3D voxel grid is stored as `grid[y][z][x]` with null for empty cells
- Grid-to-world mapping centers cubes in their cells with `+ VOXEL_SIZE/2`
- Scaling cubes to `0.98` of cell size creates visible gaps between blocks
- Grid lines are thin stretched boxes sitting just above the ground plane
- The orbital camera provides easy inspection with drag-orbit and scroll-zoom

**Next:** We'll add cursor navigation, block placement, and block removal.

---
[Back to README](./README.md) | [Next Step →](./step-2.md)
