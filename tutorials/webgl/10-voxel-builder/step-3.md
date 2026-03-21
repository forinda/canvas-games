# Step 3: Block Types & Occlusion Culling

**Goal:** Add 8 material types with keyboard selection, a visual palette display, occlusion culling for buried voxels, and edge-darkened voxel shading.

**Time:** ~15 minutes

---

## What You'll Build

- **8 block types** (Grass, Dirt, Stone, Wood, Sand, Water, Brick, Snow) selectable with keys 1-8
- A **palette display** showing small cubes in a row with the selected type highlighted
- **Occlusion culling** that skips rendering voxels surrounded on all 6 sides
- An **edge-darkened fragment shader** for a voxel art aesthetic

---

## Concepts

- **Block type palette**: `BLOCK_TYPES` is an array of `{ name, color }` objects. Pressing keys 1-8 sets `selectedType` to the index. The palette is rendered as small cubes below the grid.

- **Occlusion culling**: If a voxel has neighbors on all 6 sides (+X, -X, +Y, -Y, +Z, -Z), it's completely hidden — no camera angle can see it. Skipping its draw call saves GPU time. For a 16x16x16 grid with dense fills, this can eliminate hundreds of draw calls.

- **Edge darkening**: The fragment shader uses `abs(normal)` to detect faces. The maximum component of the absolute normal (which is 1.0 for a flat face) is slightly darkened with `* 0.1`. This creates subtle edge definition between block faces without explicit edge geometry.

---

## Code

### 3.1 — Block Types Array

**File:** `src/contexts/webgl/games/voxel-builder/types.ts`

```typescript
export interface BlockType {
    name: string;
    color: [number, number, number];
}

export const BLOCK_TYPES: BlockType[] = [
    { name: "Grass", color: [0.3, 0.65, 0.2] },
    { name: "Dirt", color: [0.55, 0.35, 0.2] },
    { name: "Stone", color: [0.5, 0.5, 0.5] },
    { name: "Wood", color: [0.6, 0.4, 0.2] },
    { name: "Sand", color: [0.85, 0.78, 0.55] },
    { name: "Water", color: [0.2, 0.4, 0.8] },
    { name: "Brick", color: [0.7, 0.25, 0.2] },
    { name: "Snow", color: [0.9, 0.92, 0.95] },
];
```

**What's happening:**
- 8 material types, each with a distinctive color. These map to `voxel.typeIdx` stored in each grid cell.
- Colors are hand-picked to be visually distinguishable at a glance.
- The order (1-8) follows a "natural terrain" progression — grass, dirt, stone, wood, etc.

---

### 3.2 — Type Selection

```typescript
// In keydown handler:
const num = parseInt(e.key);

if (num >= 1 && num <= BLOCK_TYPES.length) {
    s.selectedType = num - 1;
}
```

**What's happening:**
- Pressing `1` sets `selectedType = 0` (Grass), `2` sets `1` (Dirt), etc.
- `parseInt(e.key)` extracts the number from the key event. Non-number keys return `NaN`, which fails the range check.
- The cursor color updates immediately since the cursor render reads `BLOCK_TYPES[s.selectedType].color`.

---

### 3.3 — Occlusion Culling

```typescript
private isOccluded(x: number, y: number, z: number): boolean {
    const g = this.state.grid;

    return (
        x > 0 && x < GRID_SIZE - 1 &&
        y > 0 && y < GRID_SIZE - 1 &&
        z > 0 && z < GRID_SIZE - 1 &&
        g[y + 1][z][x] !== null &&
        g[y - 1][z][x] !== null &&
        g[y][z + 1][x] !== null &&
        g[y][z - 1][x] !== null &&
        g[y][z][x + 1] !== null &&
        g[y][z][x - 1] !== null
    );
}

// In the voxel render loop:
for (let y = 0; y < GRID_SIZE; y++) {
    for (let z = 0; z < GRID_SIZE; z++) {
        for (let x = 0; x < GRID_SIZE; x++) {
            const voxel = s.grid[y][z][x];
            if (!voxel) continue;

            // Skip fully occluded voxels
            if (this.isOccluded(x, y, z)) continue;

            // ... render as before ...
        }
    }
}
```

**What's happening:**
- First, boundary check: voxels on the grid edge (x=0, x=15, etc.) can always be seen, so they're never occluded.
- Then check all 6 neighbors: `+Y`, `-Y`, `+Z`, `-Z`, `+X`, `-X`. If ALL are non-null (occupied), this voxel is completely hidden.
- Short-circuit evaluation (`&&`) means we stop checking as soon as any neighbor is empty.
- This is called **simple occlusion culling** — a more advanced version would generate merged meshes per chunk, but this per-voxel check is sufficient for a 16^3 grid.

---

### 3.4 — Edge-Darkened Voxel Shader

**File:** `src/contexts/webgl/games/voxel-builder/shaders.ts`

```typescript
export const FRAG_SRC = /* glsl */ `#version 300 es
precision mediump float;

in vec3 vNormal;
in vec3 vWorldPos;

uniform vec3 uLightDir;
uniform vec3 uColor;
uniform vec3 uCameraPos;
uniform float uEmissive;
uniform float uAlpha;

out vec4 fragColor;

void main() {
    vec3 norm = normalize(vNormal);

    float diffuse = max(dot(norm, uLightDir), 0.0);
    float ambient = 0.25;

    vec3 viewDir = normalize(uCameraPos - vWorldPos);
    vec3 halfDir = normalize(uLightDir + viewDir);
    float spec = pow(max(dot(norm, halfDir), 0.0), 24.0);

    // Edge darkening for voxel look
    vec3 absNorm = abs(norm);
    float edgeFactor = 1.0 - max(absNorm.x, max(absNorm.y, absNorm.z)) * 0.1;

    vec3 lit = uColor * (ambient + diffuse * 0.65) * edgeFactor
             + vec3(1.0) * spec * 0.15;
    vec3 color = mix(lit, uColor, uEmissive);

    fragColor = vec4(color, uAlpha);
}
`;
```

**What's happening:**
- `abs(norm)` gives the absolute face normal. For a cube face, one component is 1.0 and the others are 0.0.
- `max(absNorm.x, max(absNorm.y, absNorm.z))` is 1.0 on flat faces and less at edges/corners (if normals were interpolated).
- `edgeFactor = 1.0 - max * 0.1` darkens faces by up to 10%. This is subtle but gives each face a slightly different shade, making block boundaries visible even between same-colored blocks.
- `uAlpha` goes into `fragColor.a`, enabling transparent cursor rendering when combined with `gl.BLEND`.

---

### 3.5 — Palette Display

```typescript
// In render(), after the main scene:
gl.uniform1f(this.uEmissive, 0.3);

for (let i = 0; i < BLOCK_TYPES.length; i++) {
    const bt = BLOCK_TYPES[i];
    const px = i * 1.2 - (BLOCK_TYPES.length * 1.2) / 2 + gridExtent / 2;
    const isSelected = i === s.selectedType;
    const size = isSelected ? 0.4 : 0.25;

    this.drawBoxRaw(
        px, -0.8, -1.5,
        size, size, size,
        bt.color[0], bt.color[1], bt.color[2],
    );
}

gl.uniform1f(this.uEmissive, 0.0);
```

**What's happening:**
- 8 small cubes in a row below the grid, spaced 1.2 units apart, centered under the grid.
- The selected type renders at `0.4` size, others at `0.25` — a simple size-based selection indicator.
- `uEmissive = 0.3` makes palette cubes partially emissive so they're visible even when the camera faces away from the light.
- Position `y = -0.8` and `z = -1.5` places the palette below and in front of the ground plane.

---

## Test It

```bash
pnpm dev
```

1. Select "Voxel Builder" from the 3D category
2. Press **1-8** to change block type — the cursor should change color and the palette should highlight
3. Build a solid 3x3x3 cube — the inner block (if fully surrounded) won't be rendered
4. Remove a block from the surface — the previously hidden neighbor should appear
5. Look at the **palette row** below the grid — the selected type should be larger
6. Build with different materials to create a colorful structure
7. Notice the subtle **edge darkening** between faces of same-colored blocks

---

## Challenges

**Easy:**
- Add a 9th block type: `{ name: "Gold", color: [0.9, 0.8, 0.2] }`. Update the number key range check.

**Medium:**
- Implement a "fill layer" command: pressing F fills the current cursor Y layer with the selected block type.

**Hard:**
- Add face culling per-voxel: instead of drawing the full cube, only draw faces that have an empty neighbor. This requires generating custom geometry per visible voxel (6 quads, each conditionally included).

---

## What You Learned

- Block types are stored as an index in each voxel, referencing a palette array of colors
- Occlusion culling checks all 6 neighbors — if all occupied, the voxel is invisible and can be skipped
- Edge darkening in the fragment shader uses `abs(normal)` to subtly shade cube faces differently
- A palette display with size-based selection indicator gives clear visual feedback
- Alpha blending with `uAlpha` enables transparent cursor rendering in the same shader

**Next:** Continue to Chess 3D to learn piece rendering from primitives and ray-based picking.

---
[← Previous Step](./step-2.md) | [Back to README](./README.md)
