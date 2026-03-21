# Step 1: Track & Car Rendering

**Goal:** Render a race track from waypoints and multi-part cars from scaled cubes, all on a grass ground plane.

**Time:** ~15 minutes

---

## What You'll Build

- A **grass ground plane** covering the world
- A **track** built from line segments between waypoints, with a center line and edge markers
- **Cars** composed of two cubes (body + roof) with shadow blobs
- **Fog** in the fragment shader for atmospheric depth

---

## Concepts

- **Track from waypoints**: The track is defined as 9 XZ waypoints forming a closed loop. Each pair of adjacent waypoints defines a track segment. We compute the midpoint, length, and rotation angle for each segment, then draw a scaled/rotated cube at that midpoint.

- **Segment rendering math**: For two waypoints A and B: midpoint = `(A + B) / 2`, length = `distance(A, B)`, angle = `atan2(B.z - A.z, B.x - A.x)`. The cube is placed at the midpoint, rotated by `-angle` around Y, and scaled to `[length/2, thin, trackWidth/2]`.

- **Multi-part car**: Each car is two cubes — a wide/short body and a smaller roof offset slightly backward. This gives a recognizable car silhouette without any model loading.

- **Distance fog**: The fragment shader computes `fog = 1 - exp(-distance * density)` — an exponential falloff that blends object color toward a fog color. This hides the far edge of the world naturally.

---

## Code

### 1.1 — Track Waypoints

**File:** `src/contexts/webgl/games/racing-3d/types.ts`

```typescript
export const TRACK_WIDTH = 8;
export const TRACK_WAYPOINTS: Waypoint[] = [
    { x: 0, z: 0 },
    { x: 30, z: 0 },
    { x: 50, z: 15 },
    { x: 50, z: 40 },
    { x: 35, z: 55 },
    { x: 10, z: 55 },
    { x: -10, z: 45 },
    { x: -15, z: 25 },
    { x: -5, z: 10 },
];
```

**What's happening:**
- 9 points define a roughly oval track loop in the XZ plane.
- The last waypoint connects back to the first, forming a closed circuit.
- `TRACK_WIDTH = 8` units — cars are about 1.6 units wide, so there's room for side-by-side racing.

---

### 1.2 — Fog Fragment Shader

**File:** `src/contexts/webgl/games/racing-3d/shaders.ts`

```typescript
export const FRAG_SRC = /* glsl */ `#version 300 es
precision mediump float;

in vec3 vNormal;
in vec3 vWorldPos;

uniform vec3 uLightDir;
uniform vec3 uColor;
uniform vec3 uCameraPos;
uniform float uEmissive;
uniform float uFogDensity;

out vec4 fragColor;

void main() {
    vec3 norm = normalize(vNormal);
    float diffuse = max(dot(norm, uLightDir), 0.0);
    float ambient = 0.2;

    vec3 viewDir = normalize(uCameraPos - vWorldPos);
    vec3 halfDir = normalize(uLightDir + viewDir);
    float spec = pow(max(dot(norm, halfDir), 0.0), 32.0);

    vec3 lit = uColor * (ambient + diffuse * 0.7) + vec3(1.0) * spec * 0.2;
    vec3 color = mix(lit, uColor, uEmissive);

    // Fog
    float dist = length(uCameraPos - vWorldPos);
    float fog = 1.0 - exp(-dist * uFogDensity);
    vec3 fogColor = vec3(0.6, 0.75, 0.85);

    fragColor = vec4(mix(color, fogColor, fog), 1.0);
}
`;
```

**What's happening:**
- After computing Blinn-Phong lighting, we measure `dist` from the camera to the fragment.
- `exp(-dist * uFogDensity)` gives an exponential falloff — nearby objects are clear, distant ones fade to `fogColor`.
- `uFogDensity = 0.008` is set per frame. Lower values mean less fog. At 0.008, objects 100+ units away are nearly fully fogged.
- The fog color matches `gl.clearColor` so objects blend seamlessly into the background.

---

### 1.3 — Track Segment Rendering

**File:** `src/contexts/webgl/games/racing-3d/Racing3DEngine.ts`

```typescript
// In render():
const wps = TRACK_WAYPOINTS;

for (let i = 0; i < wps.length; i++) {
    const a = wps[i];
    const b = wps[(i + 1) % wps.length];
    const mx = (a.x + b.x) / 2;
    const mz = (a.z + b.z) / 2;
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const len = Math.sqrt(dx * dx + dz * dz);
    const angle = Math.atan2(dz, dx);

    // Track surface
    Mat4.identity(this.modelMatrix);
    Mat4.translate(this.modelMatrix, this.modelMatrix, [mx, 0.01, mz]);
    Mat4.rotateY(this.modelMatrix, this.modelMatrix, -angle);
    Mat4.scale(this.modelMatrix, this.modelMatrix, [len / 2, 0.02, TRACK_WIDTH / 2]);
    gl.uniformMatrix4fv(this.uModel, false, this.modelMatrix);
    gl.uniform3f(this.uColor, 0.3, 0.3, 0.35);
    this.drawMesh(this.cubeMesh);

    // Center line (yellow)
    Mat4.identity(this.modelMatrix);
    Mat4.translate(this.modelMatrix, this.modelMatrix, [mx, 0.02, mz]);
    Mat4.rotateY(this.modelMatrix, this.modelMatrix, -angle);
    Mat4.scale(this.modelMatrix, this.modelMatrix, [len / 2, 0.01, 0.05]);
    gl.uniformMatrix4fv(this.uModel, false, this.modelMatrix);
    gl.uniform3f(this.uColor, 0.8, 0.8, 0.2);
    this.drawMesh(this.cubeMesh);
}
```

**What's happening:**
- For each segment, compute midpoint `(mx, mz)`, length, and angle.
- `rotateY(-angle)` aligns the cube's long axis with the segment direction. The negative is because `atan2` returns a math angle (counter-clockwise from +X) and WebGL Y rotation is clockwise.
- Track surface: thin cube (`sy = 0.02`) stretched to `len/2` along the segment and `TRACK_WIDTH/2` perpendicular.
- Center line: even thinner (`sz = 0.05`), sitting 0.01 units above the track to prevent Z-fighting.

---

### 1.4 — Multi-Part Car Rendering

```typescript
for (const car of allCars) {
    // Car body
    Mat4.identity(this.modelMatrix);
    Mat4.translate(this.modelMatrix, this.modelMatrix, [car.x, 0.35, car.z]);
    Mat4.rotateY(this.modelMatrix, this.modelMatrix, -car.angle);
    Mat4.scale(this.modelMatrix, this.modelMatrix, [0.8, 0.25, 0.4]);
    gl.uniformMatrix4fv(this.uModel, false, this.modelMatrix);
    gl.uniform3f(this.uColor, car.color[0], car.color[1], car.color[2]);
    this.drawMesh(this.cubeMesh);

    // Car roof — offset backward
    Mat4.identity(this.modelMatrix);
    Mat4.translate(this.modelMatrix, this.modelMatrix, [
        car.x - Math.cos(car.angle) * 0.15,
        0.55,
        car.z - Math.sin(car.angle) * 0.15,
    ]);
    Mat4.rotateY(this.modelMatrix, this.modelMatrix, -car.angle);
    Mat4.scale(this.modelMatrix, this.modelMatrix, [0.4, 0.15, 0.35]);
    gl.uniformMatrix4fv(this.uModel, false, this.modelMatrix);
    gl.uniform3f(this.uColor, car.color[0] * 0.7, car.color[1] * 0.7, car.color[2] * 0.7);
    this.drawMesh(this.cubeMesh);

    // Shadow blob on ground
    this.drawBox(car.x, 0.01, car.z, 0.7, 0.01, 0.35, 0.1, 0.1, 0.1);
}
```

**What's happening:**
- **Body**: a wide, short box at `y = 0.35` (just above ground), rotated to face `car.angle`.
- **Roof**: smaller box at `y = 0.55`, offset 0.15 units backward along the car's facing direction using `cos/sin(angle)`. Darker color (`* 0.7`) gives visual separation.
- **Shadow**: a nearly flat dark box on the ground plane beneath the car, adding grounding to the scene.
- Each car has a unique `color` — player is blue, AI cars are red, green, and yellow.

---

## Test It

```bash
pnpm dev
```

1. Select "Racing 3D" from the 3D category
2. You should see a **green ground** with a **gray track** looping through it
3. **4 cars** should be visible at the start line — one blue (player), three colored (AI)
4. **Yellow center lines** mark each track segment
5. **Red marker posts** stand at each waypoint
6. Distant objects should **fade into fog**
7. No movement yet — steering and AI come in step 2

---

## Challenges

**Easy:**
- Change the track color from `[0.3, 0.3, 0.35]` to something more asphalt-like or colorful.

**Medium:**
- Add more waypoints to make the track longer and more complex. Remember the last waypoint loops back to the first.

**Hard:**
- Draw white dashed lines along the track edges (at `z = +/- TRACK_WIDTH/2 * 0.9` in segment-local space) by adding a third scaled cube per segment.

---

## What You Learned

- A track can be defined as a simple array of XZ waypoints forming a closed loop
- Track segments are rendered by computing midpoint, length, and angle between adjacent waypoints
- Multi-part objects (car body + roof) create recognizable silhouettes from simple cubes
- Exponential fog (`1 - exp(-dist * density)`) blends objects smoothly into the background
- Shadow blobs on the ground plane add visual grounding without complex shadow mapping

**Next:** We'll add keyboard steering, friction physics, and waypoint-following AI.

---
[Back to README](./README.md) | [Next Step →](./step-2.md)
