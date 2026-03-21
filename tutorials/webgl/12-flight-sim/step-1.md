# Step 1: Terrain Heightmap & Mesh

**Goal:** Generate a procedural terrain heightmap using multi-octave value noise and convert it into a renderable mesh with computed normals.

**Time:** ~15 minutes

---

## What You'll Build

- A **value noise** generator with smooth interpolation
- A **multi-octave heightmap** combining 3 frequency layers for natural-looking terrain
- A **terrain mesh** with positions derived from the heightmap and normals computed from neighbor heights
- A **bilinear interpolation** function for querying height at any world position

---

## Concepts

- **Value noise**: Generate random values on a grid, then smoothly interpolate between them using a `3t^2 - 2t^3` (smoothstep) curve. This gives gentle hills rather than sharp noise.

- **Multi-octave noise**: Layer multiple noise frequencies. Low frequency (0.02) creates large hills, medium (0.05) adds variation, high (0.12) adds fine detail. Each octave has lower amplitude so fine detail doesn't overwhelm the shape.

- **Terrain mesh**: A 65x65 grid of vertices (for 64x64 quads). Each vertex position is `(x * TERRAIN_SCALE, height, z * TERRAIN_SCALE)`. Each quad is two triangles. Normals are computed from neighbor height differences.

- **Normal computation**: For each vertex, sample heights to the left, right, above, and below. The cross product of these differences gives the surface normal. This is cheaper than computing face normals and averaging them.

---

## Code

### 1.1 — Heightmap Generation

**File:** `src/contexts/webgl/games/flight-sim/terrain.ts`

```typescript
export function generateHeightmap(): Float32Array {
    const size = TERRAIN_SIZE + 1; // 65 vertices for 64 cells
    const heights = new Float32Array(size * size);

    // Three octaves: large hills, medium variation, fine detail
    const octaves = [
        { freq: 0.02, amp: 1.0 },
        { freq: 0.05, amp: 0.5 },
        { freq: 0.12, amp: 0.2 },
    ];

    // Random grid for interpolation
    const randSize = 128;
    const rand = new Float32Array(randSize * randSize);
    for (let i = 0; i < rand.length; i++) {
        rand[i] = Math.random();
    }

    const smoothNoise = (x: number, z: number): number => {
        const ix = Math.floor(x) & (randSize - 1);
        const iz = Math.floor(z) & (randSize - 1);
        const fx = x - Math.floor(x);
        const fz = z - Math.floor(z);
        // Smoothstep interpolation
        const sx = fx * fx * (3 - 2 * fx);
        const sz = fz * fz * (3 - 2 * fz);

        const i00 = rand[iz * randSize + ix];
        const i10 = rand[iz * randSize + ((ix + 1) & (randSize - 1))];
        const i01 = rand[((iz + 1) & (randSize - 1)) * randSize + ix];
        const i11 = rand[((iz + 1) & (randSize - 1)) * randSize
                       + ((ix + 1) & (randSize - 1))];

        const a = i00 + sx * (i10 - i00);
        const b = i01 + sx * (i11 - i01);
        return a + sz * (b - a);
    };

    for (let z = 0; z < size; z++) {
        for (let x = 0; x < size; x++) {
            let h = 0;
            for (const oct of octaves) {
                h += smoothNoise(x * oct.freq * 10, z * oct.freq * 10) * oct.amp;
            }
            heights[z * size + x] = h * TERRAIN_HEIGHT;
        }
    }

    return heights;
}
```

**What's happening:**
- A 128x128 random grid provides the base values. `& (randSize - 1)` wraps indices for seamless tiling.
- `smoothNoise` does bilinear interpolation with smoothstep: `fx * fx * (3 - 2 * fx)` instead of linear `fx`. This eliminates sharp transitions between grid cells.
- Three octaves are summed: frequency 0.02 creates hills spanning ~50 cells, 0.05 adds medium bumps, 0.12 adds fine detail.
- `TERRAIN_HEIGHT = 15` scales the final heights to a reasonable range for flying.

---

### 1.2 — Height Query with Bilinear Interpolation

```typescript
export function getHeight(heights: Float32Array, worldX: number, worldZ: number): number {
    const size = TERRAIN_SIZE + 1;
    const gx = worldX / TERRAIN_SCALE;
    const gz = worldZ / TERRAIN_SCALE;
    const ix = Math.max(0, Math.min(size - 2, Math.floor(gx)));
    const iz = Math.max(0, Math.min(size - 2, Math.floor(gz)));
    const fx = gx - ix;
    const fz = gz - iz;

    const h00 = heights[iz * size + ix];
    const h10 = heights[iz * size + ix + 1];
    const h01 = heights[(iz + 1) * size + ix];
    const h11 = heights[(iz + 1) * size + ix + 1];

    return h00 + fx * (h10 - h00) + fz * (h01 - h00) + fx * fz * (h11 - h10 - h01 + h00);
}
```

**What's happening:**
- Convert world coordinates to grid coordinates: `gx = worldX / TERRAIN_SCALE`.
- Find the four surrounding heightmap samples (h00, h10, h01, h11).
- Bilinear interpolation: the formula `h00 + fx*(h10-h00) + fz*(h01-h00) + fx*fz*(h11-h10-h01+h00)` smoothly blends between the four corners.
- This is used for ground collision detection and ring placement.

---

### 1.3 — Terrain Mesh Construction

```typescript
export function buildTerrainMesh(heights: Float32Array): {
    positions: Float32Array; normals: Float32Array; indices: Uint16Array;
} {
    const size = TERRAIN_SIZE + 1;
    const vertCount = size * size;
    const positions = new Float32Array(vertCount * 3);
    const normals = new Float32Array(vertCount * 3);

    for (let z = 0; z < size; z++) {
        for (let x = 0; x < size; x++) {
            const idx = z * size + x;
            const h = heights[idx];

            positions[idx * 3] = x * TERRAIN_SCALE;
            positions[idx * 3 + 1] = h;
            positions[idx * 3 + 2] = z * TERRAIN_SCALE;

            // Normal from neighbor height differences
            const hL = x > 0 ? heights[z * size + x - 1] : h;
            const hR = x < size - 1 ? heights[z * size + x + 1] : h;
            const hD = z > 0 ? heights[(z - 1) * size + x] : h;
            const hU = z < size - 1 ? heights[(z + 1) * size + x] : h;

            const nx = (hL - hR) / (2 * TERRAIN_SCALE);
            const nz = (hD - hU) / (2 * TERRAIN_SCALE);
            const ny = 1;
            const len = Math.sqrt(nx * nx + ny * ny + nz * nz);

            normals[idx * 3] = nx / len;
            normals[idx * 3 + 1] = ny / len;
            normals[idx * 3 + 2] = nz / len;
        }
    }

    const triCount = TERRAIN_SIZE * TERRAIN_SIZE * 2;
    const indices = new Uint16Array(triCount * 3);
    let ii = 0;

    for (let z = 0; z < TERRAIN_SIZE; z++) {
        for (let x = 0; x < TERRAIN_SIZE; x++) {
            const tl = z * size + x;
            const tr = tl + 1;
            const bl = (z + 1) * size + x;
            const br = bl + 1;

            indices[ii++] = tl; indices[ii++] = bl; indices[ii++] = tr;
            indices[ii++] = tr; indices[ii++] = bl; indices[ii++] = br;
        }
    }

    return { positions, normals, indices };
}
```

**What's happening:**
- **Positions**: each vertex is at `(x * TERRAIN_SCALE, height, z * TERRAIN_SCALE)`. `TERRAIN_SCALE = 4` means each grid cell is 4 world units.
- **Normals**: computed from the height gradient. `(hL - hR) / (2 * scale)` gives the X slope, `(hD - hU)` gives the Z slope. Combined with `ny = 1` and normalized, this gives the surface normal.
- **Indices**: each cell is two triangles (top-left, bottom-left, top-right) and (top-right, bottom-left, bottom-right). `64 * 64 * 2 = 8192` triangles.
- Total: 4225 vertices, 24576 index values — very efficient for the GPU.

---

## Test It

```bash
pnpm dev
```

1. Select "Flight Sim" from the 3D category
2. You should see **rolling green terrain** with hills and valleys
3. The terrain should have **smooth lighting** from the computed normals
4. **Reload** the page — the terrain should look different each time (random seed)
5. No plane or rings yet — those come in steps 2 and 3

---

## Challenges

**Easy:**
- Change `TERRAIN_HEIGHT` from 15 to 30. How does this affect the terrain drama?

**Medium:**
- Add a fourth octave with `{ freq: 0.25, amp: 0.1 }` for finer micro-detail on the terrain surface.

**Hard:**
- Implement altitude-based terrain coloring in the fragment shader: green below a threshold, brown for mid-heights, white for peaks (similar to the planet builder shader).

---

## What You Learned

- Value noise with smoothstep interpolation creates smooth random terrain
- Multi-octave noise layering adds realistic detail at multiple scales
- Terrain normals can be computed from neighbor height differences without cross products
- Bilinear interpolation provides smooth height queries at any world position
- A 64x64 terrain grid generates 8192 triangles — well within real-time rendering limits

**Next:** We'll build the plane model and implement flight controls.

---
[Back to README](./README.md) | [Next Step →](./step-2.md)
