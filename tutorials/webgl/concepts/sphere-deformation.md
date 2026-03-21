# Sphere Deformation & Dynamic Meshes

## What Is It?

Sphere deformation is the technique of modifying a sphere's vertex positions in real-time to create terrain-like features (mountains, valleys, oceans) on a planetary surface. The key idea: each vertex is displaced along its normal (outward from the center) by an offset stored per-vertex.

## How It Works

```
Base sphere (radius 1.0):        After deformation:

       ·····                          ╱╲···╱╲
     ·       ·                      ·    ╲╱    ·
    ·    ○    ·          →         ·   mountains  ·
     ·       ·                      ·   ╱╲    ·
       ·····                          ··╱  ╲···
                                    (valleys are pushed inward)
```

### Per-Vertex Displacement

```typescript
// For each vertex:
const baseX = basePositions[i * 3];
const baseY = basePositions[i * 3 + 1];
const baseZ = basePositions[i * 3 + 2];
const len = Math.sqrt(baseX * baseX + baseY * baseY + baseZ * baseZ);

// deform[i] is the radial offset (positive = mountain, negative = valley)
const scale = (len + deform[i]) / len;

deformedPositions[i * 3]     = baseX * scale;
deformedPositions[i * 3 + 1] = baseY * scale;
deformedPositions[i * 3 + 2] = baseZ * scale;
```

### Brush Sculpting via Ray-Sphere Intersection

To sculpt with the mouse, you need to know WHERE on the sphere the user clicked:

```typescript
// 1. Unproject mouse position to get a ray
const near = unproject(invVP, ndcX, ndcY, -1);
const far  = unproject(invVP, ndcX, ndcY,  1);
const dir = subtract(far, near);

// 2. Ray-sphere intersection: solve quadratic
const a = dot(dir, dir);
const b = 2 * dot(near, dir);
const c = dot(near, near) - radius * radius;
const disc = b * b - 4 * a * c;

if (disc >= 0) {
    const t = (-b - sqrt(disc)) / (2 * a);
    const hitPoint = near + dir * t;

    // 3. Apply brush to vertices near the hit point
    for (each vertex) {
        const angle = acos(dot(vertex, hitPoint) / (radius * |hitPoint|));
        if (angle < brushRadius) {
            const falloff = (1 - angle / brushRadius)²;  // smooth falloff
            deform[vertex] += strength * falloff;
        }
    }
}
```

### Normal Recomputation

After deforming vertices, normals must be recalculated or lighting will be wrong:

```typescript
// 1. Zero all normals
normals.fill(0);

// 2. For each triangle, compute face normal and add to each vertex
for (let i = 0; i < indices.length; i += 3) {
    const edge1 = positions[i1] - positions[i0];
    const edge2 = positions[i2] - positions[i0];
    const faceNormal = cross(edge1, edge2);

    normals[i0] += faceNormal;
    normals[i1] += faceNormal;
    normals[i2] += faceNormal;
}

// 3. Normalize each vertex normal
for (each vertex) normalize(normals[vertex]);
```

### Dynamic Buffer Upload

Static meshes use `gl.STATIC_DRAW`. Meshes that change every frame use `gl.DYNAMIC_DRAW` + `bufferSubData`:

```typescript
// At creation:
gl.bufferData(gl.ARRAY_BUFFER, positions, gl.DYNAMIC_DRAW);

// Each frame after deformation:
gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
gl.bufferSubData(gl.ARRAY_BUFFER, 0, deformedPositions);
```

`bufferSubData` is faster than `bufferData` because it updates existing memory instead of reallocating.

## Common Pitfalls

1. **Forgetting to recompute normals** — deformed geometry with old normals looks flat or inverted.
2. **Using `STATIC_DRAW` for dynamic meshes** — the GPU optimizes static buffers for read-only. Dynamic buffers (`DYNAMIC_DRAW`) are optimized for frequent updates.
3. **Brush falloff** — without smooth falloff, sculpting creates sharp edges. Quadratic falloff `(1 - t)²` gives natural results.
4. **Sphere segment count** — too few segments = blocky terrain. Too many = slow deformation loop. 40 segments (~3200 triangles) is a good balance.

## Used In

- **Planet Builder** — real-time sphere sculpting with 3 brush modes (raise/lower/smooth), altitude-based coloring, atmosphere rim glow
