# Step 2: Cube Geometry & MVP Matrices

**Goal:** Build cube vertex data, upload it to the GPU via buffers and a VAO, and render the cube with Model-View-Projection transforms.

**Time:** ~15 minutes

---

## What You'll Build

- **Cube geometry** — 24 vertices (4 per face × 6 faces) with positions and per-face normals
- **Vertex Array Object (VAO)** — captures all buffer bindings so you can draw with a single call
- **MVP matrices** — Model (object transform), View (camera position), Projection (perspective)
- **A rendered cube** on screen, though unlit for now

---

## Concepts

- **Why 24 vertices, not 8?**: A cube has 8 corners, but each corner participates in 3 faces with different normals. To get correct per-face lighting, each face needs its own 4 vertices with the face's normal. 4 vertices × 6 faces = 24.

- **Index buffers**: Instead of listing each triangle's 3 vertices separately (6 triangles × 3 = 18 vertices per face), we define 4 vertices per face and use an index buffer to say "triangle 1 uses vertices 0,1,2; triangle 2 uses vertices 2,3,0". This saves memory and bandwidth.

- **VAO (Vertex Array Object)**: Captures the configuration of which buffers feed which vertex attributes. Without a VAO, you'd need to re-bind and re-configure every buffer before each draw call. With a VAO, you just `bindVertexArray(vao)` and draw.

- **MVP Transform Chain**: `gl_Position = Projection × View × Model × localPosition`
  - **Model** — transforms the cube from local space to world space (rotation, position, scale)
  - **View** — transforms from world space to camera space (where is the camera looking)
  - **Projection** — adds perspective (distant objects appear smaller)

---

## Code

### 2.1 — Cube Geometry via Primitives

**File:** `src/contexts/webgl/shared/Primitives.ts` (already exists)

The shared `createCube(size)` utility generates all the vertex data:

```typescript
import { createCube } from "@webgl/shared/Primitives";

const cube = createCube(1.5); // 1.5 unit cube

// cube.positions  → Float32Array (24 vertices × 3 floats = 72 values)
// cube.normals    → Float32Array (24 vertices × 3 floats = 72 values)
// cube.uvs        → Float32Array (24 vertices × 2 floats = 48 values)
// cube.indices    → Uint16Array  (6 faces × 2 triangles × 3 indices = 36 values)
```

**What's happening:**
- Each face has 4 vertices with unique normals pointing outward from that face.
- Indices define 2 triangles per face (counter-clockwise winding for front-face culling).
- We get positions, normals, UVs, and indices — but for now we only use positions and normals.

---

### 2.2 — Buffer & VAO Setup

Create GPU buffers and configure a VAO in the engine constructor:

```typescript
import { createBuffer, createVAO } from "@webgl/shared/WebGLUtils";

// Create VAO — captures all attribute bindings
this.vao = createVAO(gl);
gl.bindVertexArray(this.vao);

// Position buffer → attribute location 0
const posBuf = createBuffer(gl, cube.positions);
gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
gl.enableVertexAttribArray(0);
gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);

// Normal buffer → attribute location 1
const normBuf = createBuffer(gl, cube.normals);
gl.bindBuffer(gl.ARRAY_BUFFER, normBuf);
gl.enableVertexAttribArray(1);
gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);

// Index buffer (bound inside the VAO)
const idxBuf = createBuffer(gl, cube.indices, gl.ELEMENT_ARRAY_BUFFER);
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxBuf);

// Unbind VAO so nothing accidentally modifies it
gl.bindVertexArray(null);

this.indexCount = cube.indices.length; // 36
```

**What's happening:**
- `createBuffer` uploads a typed array to GPU memory and returns a handle.
- `vertexAttribPointer(location, size, type, normalized, stride, offset)` tells the GPU how to read the buffer:
  - Location 0 = positions: 3 floats per vertex, tightly packed (stride 0), starting at byte 0.
  - Location 1 = normals: same layout.
- The index buffer is bound to `ELEMENT_ARRAY_BUFFER` *inside* the VAO, so it's captured too.
- After this setup, drawing the cube is just: `bindVertexArray(vao)` → `drawElements`.

---

### 2.3 — MVP Matrices

**File:** `src/contexts/webgl/shared/Mat4.ts` (already exists)

In the render loop, compute the three matrices and upload them:

```typescript
import * as Mat4 from "@webgl/shared/Mat4";

// Pre-allocate matrices (reused every frame — no garbage collection pressure)
private modelMatrix = Mat4.create();  // starts as identity
private projMatrix = Mat4.create();

private render(): void {
    const { gl, canvas } = this;

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(this.program);

    // Model — identity for now (cube at the origin, no rotation)
    Mat4.identity(this.modelMatrix);

    // Projection — perspective with 45° field of view
    const aspect = canvas.width / canvas.height;
    Mat4.perspective(this.projMatrix, Math.PI / 4, aspect, 0.1, 100);

    // View — a simple camera looking at the origin from (0, 2, 5)
    const viewMatrix = Mat4.create();
    Mat4.lookAt(viewMatrix, [0, 2, 5], [0, 0, 0], [0, 1, 0]);

    // Upload to GPU
    gl.uniformMatrix4fv(this.uModel, false, this.modelMatrix);
    gl.uniformMatrix4fv(this.uView, false, viewMatrix);
    gl.uniformMatrix4fv(this.uProjection, false, this.projMatrix);

    // Draw the cube
    gl.bindVertexArray(this.vao);
    gl.drawElements(gl.TRIANGLES, this.indexCount, gl.UNSIGNED_SHORT, 0);
    gl.bindVertexArray(null);
}
```

**What's happening:**
- `Mat4.perspective(out, fov, aspect, near, far)` — creates a perspective projection matrix. Objects between `near` (0.1) and `far` (100) units are visible. The 45° FOV gives a natural look.
- `Mat4.lookAt(out, eye, target, up)` — positions the camera at `eye`, looking toward `target`, with `up` defining which way is "up".
- `uniformMatrix4fv(location, transpose, data)` — uploads a 4×4 matrix to the shader uniform. `transpose` is always `false` for column-major matrices (which is what our Mat4 produces).
- `drawElements(mode, count, type, offset)` — draws triangles using the index buffer. 36 indices = 12 triangles = 6 faces.

---

## Test It

```bash
pnpm dev
```

1. Select "Spinning Cube" from the 3D category
2. You should see a **static, flat-colored cube** in perspective
3. Each face should be a slightly different color (derived from its normal)
4. The cube doesn't rotate yet — that's next step

If you see nothing, check the browser console for shader compilation errors.

---

## Challenges

**Easy:**
- Change `createCube(1.5)` to `createCube(0.5)` or `createCube(3.0)` — how does the cube size change?

**Medium:**
- Move the camera: change the `eye` parameter in `lookAt` from `[0, 2, 5]` to `[3, 1, 3]`. How does the perspective change?

**Hard:**
- Replace `createCube` with `createSphere(1.0, 16)` from Primitives. What changes in the rendering? (Hint: the normals are now per-vertex instead of per-face, so lighting will look very different in the next step.)

---

## What You Learned

- Cube geometry needs 24 vertices (not 8) for correct per-face normals
- Buffers upload vertex data to GPU memory; the VAO captures the binding configuration
- `vertexAttribPointer` tells the GPU how to interpret buffer data as vertex attributes
- The MVP transform chain converts local coordinates → world → camera → screen
- `drawElements` draws indexed geometry — more efficient than duplicating vertices

**Next:** We'll add directional lighting and auto-rotation to bring the cube to life.

---
[← Previous Step](./step-1.md) | [Back to README](./README.md) | [Next Step →](./step-3.md)
