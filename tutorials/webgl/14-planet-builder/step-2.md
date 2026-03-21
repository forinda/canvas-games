# Step 2: Deformation & Dynamic Buffers

**Goal:** Implement per-vertex radial deformation of the sphere and upload the modified positions to the GPU using dynamic buffers.

**Time:** ~15 minutes

---

## What You'll Build

- **Per-vertex deformation** — each vertex stores a radial displacement offset
- **Dynamic GPU buffers** using `gl.DYNAMIC_DRAW` instead of the usual `gl.STATIC_DRAW`
- **Buffer sub-update** with `bufferSubData` for efficient per-frame uploads
- **Radial displacement** — vertices move along their normal (outward from center)
- **Ray-sphere intersection** for sculpting input (mouse → 3D hit point)

---

## Concepts

- **Dynamic draw buffers**: Normal meshes use `gl.STATIC_DRAW` — data uploaded once. For the planet, we use `gl.DYNAMIC_DRAW` because positions and normals change every time the user sculpts. The GPU optimizes storage differently for frequently-updated buffers.

- **bufferSubData vs. bufferData**: `bufferData` reallocates the entire buffer. `bufferSubData` updates the data in-place without reallocation. Since the buffer size never changes (same vertex count), `bufferSubData` is more efficient.

- **Radial displacement**: For a sphere centered at origin, the "normal" at each vertex points outward from the center. Displacement along this direction means `newPos = basePos * ((length + offset) / length)`. This creates mountains (positive offset) and valleys (negative offset) on the sphere surface.

- **Ray-sphere intersection**: To sculpt, we need to know WHERE on the sphere the user clicked. This uses the classic ray-sphere intersection formula: given a ray `P = O + tD`, solve the quadratic `|O + tD|^2 = R^2` for `t`.

---

## Code

### 2.1 — Dynamic Buffer Setup

**File:** `src/contexts/webgl/games/planet-builder/PlanetBuilderEngine.ts`

```typescript
// Build planet sphere
const sphere = createSphere(BASE_RADIUS, SPHERE_SEGMENTS);
this.basePositions = new Float32Array(sphere.positions);
this.planetIndices = sphere.indices;
this.deformedPositions = new Float32Array(sphere.positions);
this.deformedNormals = new Float32Array(sphere.normals);
this.planetIndexCount = sphere.indices.length;

// Create dynamic buffers
this.planetVAO = createVAO(gl);
gl.bindVertexArray(this.planetVAO);

this.planetPosBuffer = gl.createBuffer()!;
gl.bindBuffer(gl.ARRAY_BUFFER, this.planetPosBuffer);
gl.bufferData(gl.ARRAY_BUFFER, this.deformedPositions, gl.DYNAMIC_DRAW);
gl.enableVertexAttribArray(0);
gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);

this.planetNormBuffer = gl.createBuffer()!;
gl.bindBuffer(gl.ARRAY_BUFFER, this.planetNormBuffer);
gl.bufferData(gl.ARRAY_BUFFER, this.deformedNormals, gl.DYNAMIC_DRAW);
gl.enableVertexAttribArray(1);
gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);

const idxBuf = createBuffer(gl, sphere.indices, gl.ELEMENT_ARRAY_BUFFER);
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxBuf);
gl.bindVertexArray(null);
```

**What's happening:**
- `basePositions` stores the original undeformed sphere — never modified. Used as the reference for applying deformations.
- `deformedPositions` and `deformedNormals` are the working copies that get modified and uploaded.
- `gl.DYNAMIC_DRAW` tells the GPU this buffer will be updated frequently.
- We keep references to `planetPosBuffer` and `planetNormBuffer` for later `bufferSubData` calls.
- Index buffer uses `createBuffer` (static) — indices never change even when vertices deform.

---

### 2.2 — Applying Deformation

```typescript
private applyDeformation(): void {
    const { gl } = this;
    const vertCount = this.basePositions.length / 3;

    for (let i = 0; i < vertCount; i++) {
        const bx = this.basePositions[i * 3];
        const by = this.basePositions[i * 3 + 1];
        const bz = this.basePositions[i * 3 + 2];
        const len = Math.sqrt(bx * bx + by * by + bz * bz);
        const d = this.state.deform[i];

        // Displace along normal (radial direction for sphere)
        const scale = (len + d) / len;
        this.deformedPositions[i * 3] = bx * scale;
        this.deformedPositions[i * 3 + 1] = by * scale;
        this.deformedPositions[i * 3 + 2] = bz * scale;
    }

    // Upload to GPU
    gl.bindBuffer(gl.ARRAY_BUFFER, this.planetPosBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.deformedPositions);
}
```

**What's happening:**
- For each vertex, compute the radial distance `len` from center.
- `scale = (len + d) / len` — if `d = 0`, scale = 1 (no change). If `d = 0.2`, the vertex moves outward by 0.2 units.
- Multiply base position by `scale` to get the deformed position. This preserves the direction (normal) while changing the distance.
- `bufferSubData` updates the GPU buffer in-place — no reallocation, very fast.
- Normal recomputation comes in step 3.

---

### 2.3 — Ray-Sphere Intersection for Sculpting

```typescript
private sculptAt(screenX: number, screenY: number): void {
    const rect = this.canvas.getBoundingClientRect();
    const ndcX = ((screenX - rect.left) / rect.width) * 2 - 1;
    const ndcY = -(((screenY - rect.top) / rect.height) * 2 - 1);

    // Build combined VP + model matrix and invert
    const aspect = this.canvas.width / this.canvas.height;
    const vp = Mat4.create();
    Mat4.perspective(vp, Math.PI / 4, aspect, 0.1, 200);
    Mat4.multiply(vp, vp, this.camera.getViewMatrix());

    // Include model rotation so we sculpt in local space
    const model = Mat4.create();
    Mat4.rotateY(model, model, this.state.rotationY);
    Mat4.multiply(vp, vp, model);

    const invVP = Mat4.create();
    Mat4.invert(invVP, vp);

    const near = this.unproject(invVP, ndcX, ndcY, -1);
    const far = this.unproject(invVP, ndcX, ndcY, 1);

    const dirX = far[0] - near[0];
    const dirY = far[1] - near[1];
    const dirZ = far[2] - near[2];

    // Ray-sphere intersection: |O + tD|^2 = R^2
    const R = BASE_RADIUS + 0.5; // generous hit radius
    const a = dirX * dirX + dirY * dirY + dirZ * dirZ;
    const b = 2 * (near[0] * dirX + near[1] * dirY + near[2] * dirZ);
    const c = near[0] * near[0] + near[1] * near[1] + near[2] * near[2] - R * R;
    const disc = b * b - 4 * a * c;

    if (disc < 0) return; // miss

    const t = (-b - Math.sqrt(disc)) / (2 * a);
    if (t < 0) return; // behind camera

    const hitX = near[0] + dirX * t;
    const hitY = near[1] + dirY * t;
    const hitZ = near[2] + dirZ * t;

    // Apply brush to nearby vertices...
}
```

**What's happening:**
- The VP matrix includes the model rotation so the inverse gives coordinates in the planet's local space. This means sculpting is rotation-aware — you sculpt the actual visible surface.
- The ray-sphere intersection solves a quadratic: `a*t^2 + b*t + c = 0`. Discriminant < 0 means no intersection.
- `(-b - sqrt(disc)) / (2*a)` gives the nearest intersection point (front of sphere).
- `R = BASE_RADIUS + 0.5` — a slightly generous radius ensures hits even on deformed surfaces.
- The hit point `(hitX, hitY, hitZ)` is in the sphere's local space, ready for vertex-distance calculations.

---

## Test It

```bash
pnpm dev
```

1. Select "Planet Builder" from the 3D category
2. The sphere should render with altitude coloring (uniform blue-green for undeformed)
3. **Right-click and drag** on the planet surface — you should see terrain rising
4. The altitude coloring should update — raised areas should show sand, grass, or mountain colors
5. Note: normals are not yet recomputed, so lighting may look flat — that's step 3
6. Press **R** to reset all deformations back to a smooth sphere

---

## Challenges

**Easy:**
- Change the deformation cap from `[-0.3, 0.5]` to `[-0.5, 0.8]`. Can you create more dramatic terrain?

**Medium:**
- Add a deformation preview: before sculpting, highlight vertices that would be affected by drawing them in a bright color.

**Hard:**
- Implement erosion: after each sculpt, run a pass that moves deformation "downhill" — from high vertices to lower neighbors — simulating natural erosion.

---

## What You Learned

- Dynamic buffers use `gl.DYNAMIC_DRAW` and `bufferSubData` for efficient per-frame updates
- Radial displacement scales vertex positions by `(baseLength + offset) / baseLength`
- Ray-sphere intersection solves a quadratic equation for the closest hit point
- Including the model rotation in the VP matrix before inversion makes sculpting rotation-aware
- A generous hit radius (`BASE_RADIUS + 0.5`) ensures reliable sculpting on deformed surfaces

**Next:** We'll add raise/lower/smooth brush modes and real-time normal recomputation.

---
[← Previous Step](./step-1.md) | [Back to README](./README.md) | [Next Step →](./step-3.md)
