# Heightmap Terrain Generation

## What Is It?

A heightmap is a 2D grid of height values that defines a 3D terrain surface. Each grid cell stores a single number — the altitude at that point. To render it, you convert the 2D grid into a 3D triangle mesh where each vertex's Y position comes from the heightmap.

## How It Works

```
Heightmap (2D array of floats):        3D Mesh:

  0.2  0.3  0.5  0.4                    ╱╲  ╱╲
  0.1  0.8  0.9  0.6           heights  ╱  ╲╱  ╲
  0.3  0.5  0.7  0.4           applied  ╱    ╱╲  ╲
  0.2  0.3  0.2  0.1           to Y     ╲  ╱  ╲╱
                                         ╲╱    ╲

Each cell becomes 2 triangles:
  ┌───┐
  │ ╱ │  top-left triangle + bottom-right triangle
  │╱  │
  └───┘
```

### Generating Heights with Noise

Multiple layers (octaves) of smooth random noise create natural-looking terrain:

```typescript
const octaves = [
    { freq: 0.02, amp: 1.0 },   // large rolling hills
    { freq: 0.05, amp: 0.5 },   // medium bumps
    { freq: 0.12, amp: 0.2 },   // small detail
];

for (const oct of octaves) {
    height += smoothNoise(x * oct.freq, z * oct.freq) * oct.amp;
}
```

Low frequency + high amplitude = broad hills. High frequency + low amplitude = fine detail.

### Building the Mesh

```typescript
// Vertices: one per grid point
for (let z = 0; z < size; z++) {
    for (let x = 0; x < size; x++) {
        positions[idx * 3]     = x * SCALE;
        positions[idx * 3 + 1] = heights[z * size + x];  // Y from heightmap
        positions[idx * 3 + 2] = z * SCALE;
    }
}

// Indices: 2 triangles per cell
for (let z = 0; z < size - 1; z++) {
    for (let x = 0; x < size - 1; x++) {
        indices.push(tl, bl, tr);  // triangle 1
        indices.push(tr, bl, br);  // triangle 2
    }
}
```

### Computing Normals

Each vertex's normal is derived from its neighbors' heights:

```typescript
const hL = heights[z][x - 1];  // left
const hR = heights[z][x + 1];  // right
const hD = heights[z - 1][x];  // down
const hU = heights[z + 1][x];  // up

normal.x = (hL - hR) / (2 * scale);
normal.z = (hD - hU) / (2 * scale);
normal.y = 1;
normalize(normal);
```

### Querying Height at Any Point

For collision detection, interpolate the 4 surrounding grid heights:

```typescript
function getHeight(heights, worldX, worldZ): number {
    const gx = worldX / SCALE;
    const gz = worldZ / SCALE;
    const ix = Math.floor(gx);
    const iz = Math.floor(gz);
    const fx = gx - ix;
    const fz = gz - iz;

    // Bilinear interpolation
    const h00 = heights[iz][ix];
    const h10 = heights[iz][ix + 1];
    const h01 = heights[iz + 1][ix];
    const h11 = heights[iz + 1][ix + 1];

    return h00 + fx * (h10 - h00) + fz * (h01 - h00) + fx * fz * (h11 - h10 - h01 + h00);
}
```

## Common Pitfalls

1. **Grid resolution vs draw calls** — a 64x64 grid = ~8000 triangles. Fine for one terrain. A 512x512 grid = ~500K triangles — needs chunking or LOD.
2. **Normal seams** — if you tile multiple terrain chunks, normals at edges must match or you'll see lighting seams.
3. **Height interpolation for physics** — don't just snap to the nearest grid point. Bilinear interpolation gives smooth collision.

## Used In

- **Flight Sim** — 64x64 heightmap terrain with 3-octave value noise, bilinear height query for ground collision
- Could be used for racing tracks, terrain exploration, strategy games
