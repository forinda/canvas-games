# Step 3: Brush Modes & Normal Recomputation

**Goal:** Implement three brush modes (raise, lower, smooth), angular brush falloff on the sphere surface, and real-time normal recomputation from deformed geometry.

**Time:** ~15 minutes

---

## What You'll Build

- **Three brush modes** selectable with keys 1-3: raise, lower, smooth
- **Angular falloff** — vertices near the brush center are affected more than edge vertices
- **Smooth brush** that dampens deformation toward zero
- **Face normal accumulation** — recompute normals from triangle cross products after deformation
- **Normal normalization** and GPU upload

---

## Concepts

- **Angular distance on sphere**: Instead of Euclidean distance, we use the angle between the hit point and each vertex (via `acos(dot product / (r1 * r2))`). This gives uniform brush behavior on the curved surface — the brush affects a consistent "cap" of the sphere regardless of position.

- **Quadratic falloff**: `strength = (1 - angle/radius)^2`. Vertices at the center of the brush get full strength, those at the edge get zero. The squaring makes the falloff smooth (no sharp boundary).

- **Normal recomputation**: After moving vertices, normals are wrong (they still point in the old directions). We zero all normals, iterate all triangles, compute the face normal via cross product, and accumulate it at each of the triangle's three vertices. Then normalize each vertex normal. This is the standard approach for real-time mesh deformation.

- **Smooth brush**: Instead of adding/subtracting from the deformation, the smooth brush multiplies it by `(1 - strength)`. This pulls deformation toward zero, flattening mountains and filling valleys.

---

## Code

### 3.1 — Brush Mode Selection

**File:** `src/contexts/webgl/games/planet-builder/PlanetBuilderEngine.ts`

```typescript
this.keyHandler = (e: KeyboardEvent) => {
    if (e.code === "Digit1") this.state.brushMode = "raise";
    if (e.code === "Digit2") this.state.brushMode = "lower";
    if (e.code === "Digit3") this.state.brushMode = "smooth";
    if (e.code === "KeyR") {
        this.state.deform.fill(0);
        this.applyDeformation();
    }
    if (e.code === "KeyT") this.state.autoRotate = !this.state.autoRotate;
};
```

**What's happening:**
- Keys 1-3 set `brushMode` to "raise", "lower", or "smooth".
- R resets all deformation to zero and re-uploads the mesh.
- T toggles auto-rotation — useful when sculpting to keep the planet still.

---

### 3.2 — Angular Brush Application

```typescript
// In sculptAt(), after computing hitX/Y/Z:
const vertCount = this.basePositions.length / 3;

for (let i = 0; i < vertCount; i++) {
    const vx = this.basePositions[i * 3];
    const vy = this.basePositions[i * 3 + 1];
    const vz = this.basePositions[i * 3 + 2];

    // Angular distance on sphere surface
    const dot = vx * hitX + vy * hitY + vz * hitZ;
    const angle = Math.acos(Math.min(1, Math.max(-1,
        dot / (BASE_RADIUS * Math.sqrt(hitX * hitX + hitY * hitY + hitZ * hitZ))
    )));

    if (angle < DEFORM_RADIUS) {
        const falloff = 1 - angle / DEFORM_RADIUS;
        const strength = falloff * falloff; // quadratic

        if (this.state.brushMode === "raise") {
            this.state.deform[i] += DEFORM_STRENGTH * strength;
        } else if (this.state.brushMode === "lower") {
            this.state.deform[i] -= DEFORM_STRENGTH * strength;
        } else {
            // Smooth: dampen toward zero
            this.state.deform[i] *= (1 - SMOOTH_STRENGTH * strength);
        }

        // Clamp deformation range
        this.state.deform[i] = Math.max(-0.3, Math.min(0.5, this.state.deform[i]));
    }
}

this.applyDeformation();
```

**What's happening:**
- `dot / (R1 * R2)` gives the cosine of the angle between the vertex and the hit point. `acos` converts to radians.
- `DEFORM_RADIUS = 0.3` radians (~17 degrees) — the brush covers a cap of this angular radius.
- `falloff = 1 - angle / radius` — linear falloff from 1 at center to 0 at edge.
- `strength = falloff^2` — quadratic makes the brush effect concentrated at the center.
- `DEFORM_STRENGTH = 0.08` — per-stroke displacement. Multiple strokes accumulate.
- `SMOOTH_STRENGTH = 0.02` — smooth brush is gentle, requiring several passes.
- Clamped to `[-0.3, 0.5]` — prevents extreme terrain.

---

### 3.3 — Normal Recomputation

```typescript
private applyDeformation(): void {
    // ... position displacement (from step 2) ...

    // Recompute normals from deformed positions
    this.deformedNormals.fill(0);

    for (let i = 0; i < this.planetIndices.length; i += 3) {
        const i0 = this.planetIndices[i];
        const i1 = this.planetIndices[i + 1];
        const i2 = this.planetIndices[i + 2];

        // Edge vectors
        const ax = this.deformedPositions[i1 * 3] - this.deformedPositions[i0 * 3];
        const ay = this.deformedPositions[i1 * 3 + 1] - this.deformedPositions[i0 * 3 + 1];
        const az = this.deformedPositions[i1 * 3 + 2] - this.deformedPositions[i0 * 3 + 2];
        const bx = this.deformedPositions[i2 * 3] - this.deformedPositions[i0 * 3];
        const by = this.deformedPositions[i2 * 3 + 1] - this.deformedPositions[i0 * 3 + 1];
        const bz = this.deformedPositions[i2 * 3 + 2] - this.deformedPositions[i0 * 3 + 2];

        // Cross product = face normal
        const nx = ay * bz - az * by;
        const ny = az * bx - ax * bz;
        const nz = ax * by - ay * bx;

        // Accumulate at all 3 vertices
        for (const idx of [i0, i1, i2]) {
            this.deformedNormals[idx * 3] += nx;
            this.deformedNormals[idx * 3 + 1] += ny;
            this.deformedNormals[idx * 3 + 2] += nz;
        }
    }

    // Normalize all vertex normals
    const vertCount = this.basePositions.length / 3;
    for (let i = 0; i < vertCount; i++) {
        const nx = this.deformedNormals[i * 3];
        const ny = this.deformedNormals[i * 3 + 1];
        const nz = this.deformedNormals[i * 3 + 2];
        const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1;
        this.deformedNormals[i * 3] = nx / len;
        this.deformedNormals[i * 3 + 1] = ny / len;
        this.deformedNormals[i * 3 + 2] = nz / len;
    }

    // Upload both buffers
    gl.bindBuffer(gl.ARRAY_BUFFER, this.planetPosBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.deformedPositions);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.planetNormBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.deformedNormals);
}
```

**What's happening:**
- **Zero normals**: `fill(0)` clears the accumulation buffer.
- **For each triangle**: compute two edge vectors (v1-v0 and v2-v0), then cross product gives the face normal. This normal's magnitude is proportional to the triangle area — larger triangles contribute more to the average, which is correct.
- **Accumulate**: each face normal is added to all three of its vertices. Each vertex accumulates normals from all adjacent faces.
- **Normalize**: divide each normal by its length to get a unit vector. The `|| 1` prevents division by zero for degenerate cases.
- **Upload both**: positions and normals are both updated via `bufferSubData`.

---

## Test It

```bash
pnpm dev
```

1. Select "Planet Builder" from the 3D category
2. Press **T** to stop auto-rotation (easier to sculpt)
3. **Right-click drag** on the planet — terrain should **rise** with correct lighting
4. Press **2**, then right-click drag — terrain should **lower** (create craters)
5. Press **3**, then right-click drag over bumpy terrain — it should **smooth out**
6. Press **1** to go back to raise mode
7. Notice the **lighting updates correctly** — mountains cast proper shadows
8. Press **R** to reset to a smooth sphere

---

## Challenges

**Easy:**
- Change `DEFORM_STRENGTH` from 0.08 to 0.15 for more aggressive sculpting.

**Medium:**
- Add a brush size control: press `[` and `]` to decrease/increase `DEFORM_RADIUS` between 0.1 and 0.8 radians.

**Hard:**
- Implement a "noise" brush: instead of uniform raise/lower, add `Math.random() * strength` per vertex, creating rough terrain in one stroke.

---

## What You Learned

- Angular distance (`acos(dot)`) gives uniform brush behavior on curved surfaces
- Quadratic falloff `(1 - d/r)^2` creates smooth, centered brush effects
- The smooth brush multiplies deformation by `(1 - strength)` to dampen toward zero
- Normal recomputation accumulates cross-product face normals at each vertex, then normalizes
- Both position and normal buffers must be updated for correct lighting after deformation

**Next:** We'll add atmosphere rim glow, stars, and brush mode indicators.

---
[← Previous Step](./step-2.md) | [Back to README](./README.md) | [Next Step →](./step-4.md)
