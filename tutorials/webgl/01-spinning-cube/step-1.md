# Step 1: WebGL Context & Shaders

**Goal:** Get a WebGL2 rendering context, write your first vertex and fragment shaders, and understand the GPU pipeline.

**Time:** ~15 minutes

---

## What You'll Build

- A **WebGL2 rendering context** on an HTML canvas
- A **vertex shader** that transforms 3D positions using matrices
- A **fragment shader** that outputs per-pixel color
- Understanding of the **shader pipeline**: vertex data → vertex shader → rasterizer → fragment shader → screen

---

## Concepts

- **WebGL2 vs Canvas 2D**: Canvas 2D uses `getContext("2d")` and draws with `fillRect`, `fillText`, etc. WebGL2 uses `getContext("webgl2")` and talks directly to the GPU via shaders. You can't mix them — a canvas is locked to one context type forever.

- **Shaders**: Small programs written in GLSL (OpenGL Shading Language) that run on the GPU. There are two types:
  - **Vertex shader** — runs once per vertex. Transforms 3D positions into screen coordinates.
  - **Fragment shader** — runs once per pixel. Decides what color each pixel should be.

- **The Pipeline**: Your JavaScript sends vertex data (positions, normals) to the GPU. The vertex shader processes each vertex. The GPU rasterizes triangles between vertices. The fragment shader colors each pixel inside those triangles.

- **GLSL 300 es**: The shader language version for WebGL2. `#version 300 es` must be the first line. Key differences from older GLSL: uses `in`/`out` instead of `attribute`/`varying`, and `fragColor` is a declared output instead of `gl_FragColor`.

---

## Code

### 1.1 — The Shader Source

**File:** `src/contexts/webgl/games/spinning-cube/shaders.ts`

We store shaders as TypeScript string constants so they're bundled with the game. The `/* glsl */` comment enables syntax highlighting in editors that support it.

```typescript
/** Vertex shader — transforms positions, passes normal to fragment. */
export const VERT_SRC = /* glsl */ `#version 300 es
precision mediump float;

layout(location = 0) in vec3 aPosition;
layout(location = 1) in vec3 aNormal;

uniform mat4 uModel;
uniform mat4 uView;
uniform mat4 uProjection;

out vec3 vNormal;
out vec3 vWorldPos;

void main() {
    vec4 worldPos = uModel * vec4(aPosition, 1.0);
    vWorldPos = worldPos.xyz;
    vNormal = mat3(uModel) * aNormal;
    gl_Position = uProjection * uView * worldPos;
}
`;

/** Fragment shader — outputs a solid color for now. */
export const FRAG_SRC = /* glsl */ `#version 300 es
precision mediump float;

in vec3 vNormal;
in vec3 vWorldPos;

uniform vec3 uLightDir;
uniform float uTime;

out vec4 fragColor;

void main() {
    // For now, just output a flat color based on the normal
    vec3 norm = normalize(vNormal);
    vec3 color = abs(norm) * 0.5 + 0.3;
    fragColor = vec4(color, 1.0);
}
`;
```

**What's happening:**
- `layout(location = 0) in vec3 aPosition` — the vertex shader receives position data at attribute slot 0. Each vertex is 3 floats (x, y, z).
- `layout(location = 1) in vec3 aNormal` — surface normal at slot 1, used for lighting later.
- `uniform mat4 uModel/uView/uProjection` — matrices uploaded from JavaScript each frame. Model transforms the object, View positions the camera, Projection adds perspective.
- `gl_Position` — the vertex shader's required output. It's the final screen-space position of this vertex.
- `out vec3 vNormal` — passed from vertex shader to fragment shader. The GPU interpolates it across the triangle face.
- `fragColor` — the fragment shader's output. One RGBA color per pixel.

---

### 1.2 — Compiling Shaders

**File:** `src/contexts/webgl/shared/WebGLUtils.ts` (already exists)

The shared `createProgram` utility handles the boilerplate:

```typescript
import { createProgram } from "@webgl/shared/WebGLUtils";

// In your engine constructor:
const gl = canvas.getContext("webgl2");
if (!gl) throw new Error("WebGL2 not supported");

// This compiles both shaders, links them into a program, and
// throws with a helpful error message if anything fails.
const program = createProgram(gl, VERT_SRC, FRAG_SRC);
```

**What's happening:**
- `createProgram` internally calls `gl.createShader`, `gl.shaderSource`, `gl.compileShader` for each shader, then `gl.createProgram`, `gl.attachShader`, `gl.linkProgram`.
- If a shader has a syntax error, it throws with the GLSL compiler's error message — including line numbers.
- After linking, it detaches and deletes the individual shader objects (the GPU keeps its own compiled copy).

---

### 1.3 — Getting Uniform Locations

Uniforms are values you send from JavaScript to the shader each frame (matrices, time, light direction). You look up their locations once at init time:

```typescript
const uModel = gl.getUniformLocation(program, "uModel")!;
const uView = gl.getUniformLocation(program, "uView")!;
const uProjection = gl.getUniformLocation(program, "uProjection")!;
const uLightDir = gl.getUniformLocation(program, "uLightDir")!;
const uTime = gl.getUniformLocation(program, "uTime")!;
```

**What's happening:**
- `getUniformLocation` returns a handle you'll use later with `gl.uniformMatrix4fv` or `gl.uniform3f` to upload data.
- The `!` asserts non-null. If the shader optimizes away an unused uniform, this would return `null` — so only assert for uniforms you know are used.

---

### 1.4 — GL State Setup

```typescript
gl.enable(gl.DEPTH_TEST);  // closer objects hide farther ones
gl.enable(gl.CULL_FACE);   // don't draw back-facing triangles
gl.clearColor(0.04, 0.04, 0.1, 1.0);  // dark blue background
gl.viewport(0, 0, canvas.width, canvas.height);
```

**What's happening:**
- **Depth test** — the GPU keeps a depth buffer. Each pixel remembers how far away it is. If a new triangle is farther than what's already drawn, it's skipped. Without this, triangles render in draw order, not depth order.
- **Face culling** — each triangle has a front face (counter-clockwise vertices) and a back face. Culling skips back faces, saving ~50% of fragment shader work for solid objects.
- **Clear color** — what color fills the screen when you call `gl.clear()`.
- **Viewport** — maps the [-1, 1] clip space to pixel coordinates on the canvas.

---

## Test It

At this point you have:
- Shaders compiled and linked into a program
- Uniform locations cached
- GL state configured

You can verify it works by clearing the screen each frame:

```typescript
function loop() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    requestAnimationFrame(loop);
}
loop();
```

You should see a dark blue screen — no geometry yet, but no errors in the console either.

---

## Challenges

**Easy:**
- Change `gl.clearColor` to a different color and verify the background changes.

**Medium:**
- Add a `console.log` of the program's active uniforms using `gl.getActiveUniform(program, i)` in a loop. How many does it report?

**Hard:**
- Try introducing a deliberate GLSL syntax error (e.g., remove a semicolon). Read the error message that `createProgram` throws. Note how it includes the line number and shader type.

---

## What You Learned

- WebGL2 uses a GPU pipeline: vertex data → vertex shader → rasterizer → fragment shader
- Shaders are written in GLSL 300 es and compiled at runtime
- `createProgram` compiles, links, and validates shaders
- Uniform locations are looked up once, then used each frame to upload data
- `DEPTH_TEST` and `CULL_FACE` are essential for correct 3D rendering

**Next:** We'll create cube geometry and render it with MVP matrix transforms.

---
[Back to README](./README.md) | [Next Step →](./step-2.md)
