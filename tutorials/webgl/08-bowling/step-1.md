# Step 1: Lane & Pins Rendering

**Goal:** Render a bowling lane with gutters, 10 pins in standard triangle formation, and a ball — all from scaled cube and sphere primitives.

**Time:** ~15 minutes

---

## What You'll Build

- A **bowling lane** surface with correct dimensions and lane arrows
- **Gutters** flanking both sides of the lane
- **10 pins** arranged in the standard triangle layout
- A **bowling ball** mesh using `createSphere`
- **Blinn-Phong shading** with specular highlights and an emissive uniform

---

## Concepts

- **Scene from primitives**: Instead of loading 3D models, we build the entire bowling scene by drawing the same cube mesh at different positions and scales. A single `drawBox` helper makes this painless — pass a position, half-extents, and color, and it sets the model matrix + uniform.

- **Blinn-Phong specular**: The fragment shader computes a half-vector between the light and view directions. The dot product with the surface normal, raised to a high power (48), creates a small bright highlight on shiny surfaces. The `uEmissive` uniform lets us bypass lighting for UI elements like score indicators.

- **Pin layout constants**: Real bowling pins form 4 rows (1-2-3-4) in a triangle. We store offsets in `PIN_POSITIONS` as `[dz, dx]` pairs relative to a center point near the end of the lane.

---

## Code

### 1.1 — Shaders with Specular + Emissive

**File:** `src/contexts/webgl/games/bowling/shaders.ts`

```typescript
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

export const FRAG_SRC = /* glsl */ `#version 300 es
precision mediump float;

in vec3 vNormal;
in vec3 vWorldPos;

uniform vec3 uLightDir;
uniform vec3 uColor;
uniform vec3 uCameraPos;
uniform float uEmissive;

out vec4 fragColor;

void main() {
    vec3 norm = normalize(vNormal);

    float diffuse = max(dot(norm, uLightDir), 0.0);
    float ambient = 0.2;

    // Specular (Blinn-Phong)
    vec3 viewDir = normalize(uCameraPos - vWorldPos);
    vec3 halfDir = normalize(uLightDir + viewDir);
    float spec = pow(max(dot(norm, halfDir), 0.0), 48.0);

    vec3 lit = uColor * (ambient + diffuse * 0.7) + vec3(1.0) * spec * 0.3;
    vec3 color = mix(lit, uColor, uEmissive);

    fragColor = vec4(color, 1.0);
}
`;
```

**What's happening:**
- The vertex shader is the standard MVP transform — same as the spinning cube.
- The fragment shader adds **Blinn-Phong specular**: `halfDir` is halfway between light and view. `pow(dot(normal, halfDir), 48)` creates a tight specular highlight.
- `uEmissive` is a 0-1 float. At 0, the object is fully lit. At 1, it shows flat `uColor` with no lighting — useful for glowing score indicators.
- `uColor` is a per-draw-call uniform, so we set it before each `drawElements` call to give each object its own color.

---

### 1.2 — Game Constants and Pin Layout

**File:** `src/contexts/webgl/games/bowling/types.ts`

```typescript
export const LANE_LENGTH = 20;
export const LANE_WIDTH = 3;
export const GUTTER_WIDTH = 0.5;
export const BALL_RADIUS = 0.35;
export const PIN_RADIUS = 0.12;
export const PIN_HEIGHT = 0.5;

/** Standard 10-pin triangle layout (row, col offsets from center) */
export const PIN_POSITIONS: [number, number][] = [
    // Row 1 (front)
    [0, 0],
    // Row 2
    [-0.3, -0.35],
    [-0.3, 0.35],
    // Row 3
    [-0.6, -0.7],
    [-0.6, 0],
    [-0.6, 0.7],
    // Row 4 (back)
    [-0.9, -1.05],
    [-0.9, -0.35],
    [-0.9, 0.35],
    [-0.9, 1.05],
];
```

**What's happening:**
- `PIN_POSITIONS` defines 10 positions as `[dz, dx]` offsets. The front pin is at `[0, 0]`, and each successive row is 0.3 units farther back and spread wider.
- These offsets are added to a base Z position near the end of the lane (`LANE_LENGTH - 2`).
- `PIN_RADIUS` and `BALL_RADIUS` are used for collision detection later.

---

### 1.3 — Mesh Setup and drawBox Helper

**File:** `src/contexts/webgl/games/bowling/BowlingEngine.ts`

```typescript
import { createCube, createSphere } from "@webgl/shared/Primitives";

// In the constructor:
this.cubeMesh = this.buildMesh(gl, createCube(1));
this.sphereMesh = this.buildMesh(gl, createSphere(BALL_RADIUS, 16));

// Reusable helper — draws a scaled cube at any position
private drawBox(
    x: number, y: number, z: number,
    sx: number, sy: number, sz: number,
    r: number, g: number, b: number,
): void {
    const { gl } = this;

    Mat4.identity(this.modelMatrix);
    Mat4.translate(this.modelMatrix, this.modelMatrix, [x, y, z]);
    Mat4.scale(this.modelMatrix, this.modelMatrix, [sx, sy, sz]);
    gl.uniformMatrix4fv(this.uModel, false, this.modelMatrix);
    gl.uniform3f(this.uColor, r, g, b);
    this.drawMesh(this.cubeMesh);
}
```

**What's happening:**
- We create just two meshes: one unit cube and one sphere. Every object in the scene is drawn by transforming these two meshes.
- `drawBox` sets up identity matrix, translates to position `[x, y, z]`, scales by `[sx, sy, sz]`, uploads model matrix and color, then draws. This pattern is used dozens of times throughout rendering.
- The sphere is created once at `BALL_RADIUS` (0.35) and drawn with an identity scale.

---

### 1.4 — Rendering the Lane, Gutters, and Pins

```typescript
private render(): void {
    const { gl, canvas } = this;

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(this.program);

    const aspect = canvas.width / canvas.height;
    Mat4.perspective(this.projMatrix, Math.PI / 5, aspect, 0.1, 200);
    Mat4.lookAt(this.viewMatrix, [0, 4, -3], [0, 0, LANE_LENGTH * 0.6], [0, 1, 0]);

    gl.uniformMatrix4fv(this.uView, false, this.viewMatrix);
    gl.uniformMatrix4fv(this.uProjection, false, this.projMatrix);
    gl.uniform3f(this.uLightDir, 0.2, 0.9, 0.3);
    gl.uniform3f(this.uCameraPos, 0, 4, -3);

    // Lane surface — a flat box spanning the full lane
    this.drawBox(
        0, -0.05, LANE_LENGTH / 2,
        LANE_WIDTH / 2, 0.05, LANE_LENGTH / 2,
        0.7, 0.55, 0.35,
    );

    // Gutters — dark channels on each side
    this.drawBox(
        -(LANE_WIDTH / 2 + GUTTER_WIDTH / 2), -0.1, LANE_LENGTH / 2,
        GUTTER_WIDTH / 2, 0.06, LANE_LENGTH / 2,
        0.2, 0.2, 0.2,
    );
    this.drawBox(
        LANE_WIDTH / 2 + GUTTER_WIDTH / 2, -0.1, LANE_LENGTH / 2,
        GUTTER_WIDTH / 2, 0.06, LANE_LENGTH / 2,
        0.2, 0.2, 0.2,
    );

    // Pins — each one is a scaled cube with a red stripe
    for (const pin of this.state.pins) {
        Mat4.identity(this.modelMatrix);
        Mat4.translate(this.modelMatrix, this.modelMatrix, [pin.x, PIN_HEIGHT / 2, pin.z]);
        Mat4.scale(this.modelMatrix, this.modelMatrix, [PIN_RADIUS, PIN_HEIGHT / 2, PIN_RADIUS]);
        gl.uniformMatrix4fv(this.uModel, false, this.modelMatrix);
        gl.uniform3f(this.uColor, 0.95, 0.92, 0.88);
        this.drawMesh(this.cubeMesh);

        // Red stripe near the top
        this.drawBox(
            pin.x, PIN_HEIGHT * 0.7, pin.z,
            PIN_RADIUS * 1.1, PIN_HEIGHT * 0.05, PIN_RADIUS * 1.1,
            0.8, 0.15, 0.1,
        );
    }

    // Back wall
    this.drawBox(
        0, 1, LANE_LENGTH + 0.5,
        LANE_WIDTH / 2 + GUTTER_WIDTH, 1, 0.1,
        0.3, 0.25, 0.2,
    );
}
```

**What's happening:**
- The lane is a flat box: `y = -0.05` puts its top surface just below `y = 0`. Half-extents of `LANE_WIDTH/2` (1.5) and `LANE_LENGTH/2` (10) give the full lane dimensions.
- Gutters sit lower (`y = -0.1`) and are narrower (`GUTTER_WIDTH/2 = 0.25`).
- Each pin is a unit cube scaled by `[PIN_RADIUS, PIN_HEIGHT/2, PIN_RADIUS]` — making a tall, thin column. The red stripe is a second, slightly wider but very thin box.
- The camera sits behind the ball (`z = -3`) looking toward the pins at 60% of lane length.

---

## Test It

```bash
pnpm dev
```

1. Select "Bowling" from the 3D category
2. You should see a **wooden lane** stretching away from the camera
3. **10 white pins** with red stripes stand in a triangle at the far end
4. **Dark gutters** run along both sides
5. No interaction yet — the ball and aiming come in step 2

---

## Challenges

**Easy:**
- Change the lane color from `[0.7, 0.55, 0.35]` to a darker or lighter wood tone.

**Medium:**
- Add lane arrows: draw 7 small thin boxes at `z = 5 + i * 0.5` with `x = (i - 3) * 0.25` as guide markers.

**Hard:**
- Replace the cube-based pins with `createSphere` calls scaled into capsule shapes (sphere for body, smaller sphere on top). How does the lighting change?

---

## What You Learned

- A complete bowling scene can be built from just two primitives (cube + sphere) by varying position, scale, and color
- `drawBox` is a powerful pattern for composing scenes from scaled unit cubes
- Blinn-Phong specular shading adds realism with a `halfDir` calculation in the fragment shader
- `uEmissive` allows mixing lit and unlit rendering in the same shader
- Pin positions follow the standard 10-pin triangle layout with 4 rows

**Next:** We'll add drag-to-aim input and ball rolling physics.

---
[Back to README](./README.md) | [Next Step →](./step-2.md)
