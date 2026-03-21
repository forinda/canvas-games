# Step 1: Shaders, Sphere & Platform

**Goal:** Set up Blinn-Phong lighting shaders, create sphere/plane/cube meshes, and render a lit platform with a marble sitting on it.

**Time:** ~15 minutes

---

## What You'll Build

- **Blinn-Phong shaders** with diffuse, ambient, and specular lighting
- **Three meshes** — sphere (marble), plane (platform), cube (edges and gems later)
- **Per-object color** via a `uColor` uniform — one shader program, many colored objects
- A **static scene**: platform with raised edges and a red marble

---

## Concepts

- **Blinn-Phong Specular**: An upgrade from the Spinning Cube's diffuse-only lighting. The specular highlight simulates a shiny surface by computing a "half-vector" between the light direction and the view direction. When this half-vector aligns with the surface normal, you get a bright spot. The formula: `pow(max(dot(normal, halfDir), 0.0), shininess)`. Higher shininess = tighter, more mirror-like highlights.

- **Per-Object Color Uniform**: Instead of baking color into vertex data, we use a `uniform vec3 uColor` that JavaScript changes before each draw call. One shader program renders everything — marble (red), platform (blue-gray), edges (lighter gray), gems (gold).

- **Multiple Meshes**: Each primitive (sphere, plane, cube) gets its own VAO. To draw, bind the VAO, set the model matrix and color uniforms, then call `drawElements`. You can draw the same mesh many times with different transforms.

- **Camera Position Uniform**: Specular lighting needs to know where the camera is (`uCameraPos`) so the shader can compute the view direction per-fragment.

---

## Code

### 1.1 — Blinn-Phong Fragment Shader

**File:** `src/contexts/webgl/games/marble-roll/shaders.ts`

The vertex shader is identical to the Spinning Cube (MVP transform, pass normal and world position). The fragment shader adds specular:

```typescript
export const FRAG_SRC = /* glsl */ `#version 300 es
precision mediump float;

in vec3 vNormal;
in vec3 vWorldPos;

uniform vec3 uLightDir;
uniform vec3 uColor;
uniform vec3 uCameraPos;

out vec4 fragColor;

void main() {
    vec3 norm = normalize(vNormal);

    // Diffuse
    float diffuse = max(dot(norm, uLightDir), 0.0);
    float ambient = 0.2;

    // Specular (Blinn-Phong)
    vec3 viewDir = normalize(uCameraPos - vWorldPos);
    vec3 halfDir = normalize(uLightDir + viewDir);
    float spec = pow(max(dot(norm, halfDir), 0.0), 32.0);

    vec3 color = uColor * (ambient + diffuse * 0.7) + vec3(1.0) * spec * 0.3;
    fragColor = vec4(color, 1.0);
}
`;
```

**What's happening:**
- `viewDir = normalize(uCameraPos - vWorldPos)` — direction from the fragment to the camera. This changes per-pixel, which is why specular highlights move when you orbit.
- `halfDir = normalize(uLightDir + viewDir)` — the half-vector. When the surface normal aligns with this, specular is at its peak.
- `pow(..., 32.0)` — the shininess exponent. 32 gives a moderately tight highlight. Try 4 (matte) or 128 (mirror-like) to see the difference.
- `vec3(1.0) * spec * 0.3` — the specular highlight is white, blended on top of the diffuse color. The `0.3` controls highlight intensity.

---

### 1.2 — Building Multiple Meshes

In the `MarbleRollEngine` constructor, create three different primitive meshes:

```typescript
import { createSphere, createPlane, createCube } from "@webgl/shared/Primitives";
import { MARBLE_RADIUS } from "./types";

// Marble — a sphere with radius 0.3, 20 segments for smoothness
this.sphereMesh = this.buildMesh(gl, createSphere(MARBLE_RADIUS, 20));

// Platform floor — a flat plane (will be scaled to level size)
this.planeMesh = this.buildMesh(gl, createPlane(1, 1));

// Edges, gems, and goal marker — unit cube scaled per-draw
this.cubeMesh = this.buildMesh(gl, createCube(1));
```

The `buildMesh` helper encapsulates the buffer/VAO setup pattern from Step 2 of the Spinning Cube tutorial:

```typescript
private buildMesh(gl: WebGL2RenderingContext, data: PrimitiveData): Mesh {
    const vao = createVAO(gl);
    gl.bindVertexArray(vao);

    // Position buffer -> attribute 0
    const posBuf = createBuffer(gl, data.positions);
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);

    // Normal buffer -> attribute 1
    const normBuf = createBuffer(gl, data.normals);
    gl.bindBuffer(gl.ARRAY_BUFFER, normBuf);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);

    // Index buffer
    const idxBuf = createBuffer(gl, data.indices, gl.ELEMENT_ARRAY_BUFFER);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxBuf);
    gl.bindVertexArray(null);

    return { vao, indexCount: data.indices.length };
}
```

**What's happening:**
- `createSphere(MARBLE_RADIUS, 20)` generates a UV-sphere with 20 latitude/longitude segments. More segments = smoother sphere but more vertices. 20 is a good balance.
- `createPlane(1, 1)` creates a flat quad that we'll scale to match the level's platform size.
- Each mesh is self-contained: its own VAO with position, normal, and index buffers. Drawing is just `bindVertexArray` + `drawElements`.

---

### 1.3 — Rendering the Platform and Marble

In the render method, draw the platform first, then edges, then the marble:

```typescript
private render(): void {
    const { gl, canvas } = this;

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(this.program);

    // Projection + View
    const aspect = canvas.width / canvas.height;
    Mat4.perspective(this.projMatrix, Math.PI / 4, aspect, 0.1, 200);
    const viewMatrix = this.camera.getViewMatrix();
    const camPos = this.camera.getPosition();

    gl.uniformMatrix4fv(this.uView, false, viewMatrix);
    gl.uniformMatrix4fv(this.uProjection, false, this.projMatrix);
    gl.uniform3f(this.uLightDir, 0.4, 0.8, 0.3);
    gl.uniform3f(this.uCameraPos, camPos[0], camPos[1], camPos[2]);

    // Platform — scale plane to level size
    const size = this.currentLevel.size;
    Mat4.identity(this.modelMatrix);
    Mat4.scale(this.modelMatrix, this.modelMatrix, [size * 2, 1, size * 2]);
    gl.uniformMatrix4fv(this.uModel, false, this.modelMatrix);
    gl.uniform3f(this.uColor, 0.25, 0.3, 0.4);
    this.drawMesh(this.planeMesh);

    // Marble — translate to marble position
    Mat4.identity(this.modelMatrix);
    Mat4.translate(this.modelMatrix, this.modelMatrix, [0, MARBLE_RADIUS, 0]);
    gl.uniformMatrix4fv(this.uModel, false, this.modelMatrix);
    gl.uniform3f(this.uColor, 0.9, 0.2, 0.2);
    this.drawMesh(this.sphereMesh);
}
```

**What's happening:**
- Same projection and view setup as Spinning Cube, but with `OrbitalCamera` configured for a longer view distance (`distance: 12`).
- `uCameraPos` is uploaded so the fragment shader can compute specular highlights.
- The platform is drawn by scaling the unit plane. `size * 2` covers the full level area.
- The marble is positioned at `y = MARBLE_RADIUS` so it sits on the surface, not embedded in it.
- `uColor` is changed between draw calls — the platform is blue-gray `(0.25, 0.3, 0.4)`, the marble is red `(0.9, 0.2, 0.2)`.

---

### 1.4 — Drawing Platform Edges

The engine uses a helper to draw scaled cubes for platform edges:

```typescript
private drawEdge(x: number, y: number, z: number,
                 sx: number, sy: number, sz: number): void {
    Mat4.identity(this.modelMatrix);
    Mat4.rotateX(this.modelMatrix, this.modelMatrix, this.state.tiltX);
    Mat4.rotateZ(this.modelMatrix, this.modelMatrix, this.state.tiltZ);
    Mat4.translate(this.modelMatrix, this.modelMatrix, [x, y, z]);
    Mat4.scale(this.modelMatrix, this.modelMatrix, [sx, sy, sz]);

    this.gl.uniformMatrix4fv(this.uModel, false, this.modelMatrix);
    this.gl.uniform3f(this.uColor, 0.35, 0.4, 0.5);
    this.drawMesh(this.cubeMesh);
}

// Four edges around the platform:
this.drawEdge(-size, 0, 0, 0.1, 0.15, size);  // left
this.drawEdge( size, 0, 0, 0.1, 0.15, size);  // right
this.drawEdge(0, 0, -size, size, 0.15, 0.1);  // front
this.drawEdge(0, 0,  size, size, 0.15, 0.1);  // back
```

**What's happening:**
- Each edge is the same unit cube, scaled into a thin bar along one axis.
- The tilt rotations are applied first so edges tilt with the platform (this matters in Step 2).
- This pattern of "one mesh, many draw calls with different transforms" is the core of how WebGL games render complex scenes without needing unique geometry for every object.

---

## Test It

```bash
pnpm dev
```

1. Select "Marble Roll" from the 3D category
2. You should see a **flat platform** with thin raised edges
3. A **red sphere** (the marble) should sit on the platform surface
4. **Drag** to orbit the camera — the specular highlight should shift on the sphere
5. The marble doesn't move yet — that's next step

---

## Challenges

**Easy:**
- Change the marble color from red `(0.9, 0.2, 0.2)` to green. Does the specular highlight still look correct?

**Medium:**
- Increase `createSphere` segments from 20 to 6. Notice how the specular highlight looks faceted on a low-poly sphere. This is because normals are per-vertex.

**Hard:**
- Change the shininess exponent from 32 to 256 in the fragment shader. The highlight becomes a tiny pinpoint — why? (Because `pow(x, 256)` drops to near-zero unless `x` is very close to 1.0.)

---

## What You Learned

- Blinn-Phong specular lighting uses a half-vector between light and view directions
- `uCameraPos` is needed in the fragment shader for view-dependent effects like specular
- Multiple meshes share one shader program — `uColor` changes per draw call
- `buildMesh` encapsulates the VAO/buffer pattern for reuse across primitives
- Scale transforms turn a unit cube into edges, bars, or platforms of any size

**Next:** We'll make the platform tilt with keyboard input and add physics to roll the marble.

---
[Back to README](./README.md) | [Next Step →](./step-2.md)
