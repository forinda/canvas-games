# Step 2: Tilt Physics & Input

**Goal:** Add keyboard-driven platform tilting, gravity along the tilted surface, friction, edge bouncing, and fall detection.

**Time:** ~15 minutes

---

## What You'll Build

- **Keyboard input** — Arrow keys / WASD set a target tilt angle
- **Smooth tilt interpolation** — platform tilts gradually, not instantly
- **Gravity on a tilted surface** — marble accelerates downhill based on tilt angle
- **Friction** — marble gradually slows when no tilt is applied
- **Edge bounce** — marble bounces off platform edges with damping
- **Fall detection** — if the marble goes too far off-edge, the game phase changes to "fell"

---

## Concepts

- **Target vs Actual Tilt**: Input sets a `targetTiltX/Z` (either `TILT_MAX` or 0). The actual `tiltX/Z` interpolates toward the target: `tilt += (target - tilt) * TILT_SPEED * dt`. This creates smooth, natural-feeling tilt rather than a jarring snap.

- **Gravity Projection**: On a flat surface, gravity pulls straight down (no lateral movement). On a tilted surface, gravity has a component along the slope. For small angles: `acceleration_x = sin(tiltZ) * GRAVITY`, `acceleration_z = sin(tiltX) * GRAVITY`. The sine converts the tilt angle to a fraction of gravitational force along that axis.

- **Friction as Velocity Damping**: Each frame, velocity is multiplied by a friction constant (0.985). This is exponential decay — the marble slows down quickly from high speeds but never quite stops. Combined with gravity, this creates the feel of rolling on a slightly rough surface.

- **Transforming Marble Position by Tilt**: The marble's physics run in "flat" coordinates, but the platform rotates in 3D. To render the marble at the correct world position, we manually multiply its position by the platform's tilt matrix using `mat4 x vec3`.

---

## Code

### 2.1 — Input Handling

**File:** `src/contexts/webgl/games/marble-roll/types.ts`

Constants control the feel:

```typescript
export const MARBLE_RADIUS = 0.3;
export const GRAVITY = 9.8;
export const TILT_MAX = 0.25;   // max tilt angle in radians (~14 degrees)
export const TILT_SPEED = 3.0;  // how fast tilt responds to input
export const FRICTION = 0.985;  // velocity multiplier per frame
```

In the engine, arrow keys set the target tilt:

```typescript
private keys: Record<string, boolean> = {};

// In keyDown handler:
this.keys[e.code] = true;

// In update():
s.targetTiltX = 0;
s.targetTiltZ = 0;

if (this.keys["ArrowUp"]    || this.keys["KeyW"]) s.targetTiltX = -TILT_MAX;
if (this.keys["ArrowDown"]  || this.keys["KeyS"]) s.targetTiltX =  TILT_MAX;
if (this.keys["ArrowLeft"]  || this.keys["KeyA"]) s.targetTiltZ =  TILT_MAX;
if (this.keys["ArrowRight"] || this.keys["KeyD"]) s.targetTiltZ = -TILT_MAX;
```

**What's happening:**
- `keys` is a dictionary of currently-held keys. `keydown` sets `true`, `keyup` sets `false`.
- When no key is held, `targetTilt` is 0 — the platform levels out.
- `TILT_MAX = 0.25` radians (~14 degrees). This is deliberately small — real marble labyrinth boards barely tilt.

---

### 2.2 — Tilt Interpolation & Gravity

```typescript
private update(dt: number): void {
    const s = this.state;
    if (s.phase !== "playing") return;

    // Smooth tilt interpolation
    s.tiltX += (s.targetTiltX - s.tiltX) * TILT_SPEED * dt;
    s.tiltZ += (s.targetTiltZ - s.tiltZ) * TILT_SPEED * dt;

    // Gravity along tilted surface
    const ax = Math.sin(s.tiltZ) * GRAVITY;
    const az = Math.sin(s.tiltX) * GRAVITY;

    s.vx += ax * dt;
    s.vz += az * dt;

    // Friction
    s.vx *= FRICTION;
    s.vz *= FRICTION;

    // Move
    s.x += s.vx * dt;
    s.z += s.vz * dt;
}
```

**What's happening:**
- `(target - current) * speed * dt` is exponential interpolation. When `TILT_SPEED = 3` and `dt = 0.016` (~60fps), each frame moves about 5% of the remaining distance.
- `Math.sin(tiltZ) * GRAVITY` projects gravitational force onto the X axis. At max tilt (0.25 rad), this gives ~2.4 m/s^2 of lateral acceleration. For small angles, `sin(x) ≈ x`, so the relationship is nearly linear.
- `s.vx *= FRICTION` runs every frame. At 60fps: effective friction per second is `0.985^60 ≈ 0.40`, meaning the marble loses 60% of its speed every second from friction alone.

---

### 2.3 — Edge Bounce & Fall Detection

```typescript
const size = this.currentLevel.size;

// Fall off the edge completely
if (s.x < -size - 0.5 || s.x > size + 0.5 ||
    s.z < -size - 0.5 || s.z > size + 0.5) {
    s.phase = "fell";
    return;
}

// Bounce off edges with damping
if (s.x < -size + MARBLE_RADIUS) {
    s.x = -size + MARBLE_RADIUS;
    s.vx = Math.abs(s.vx) * 0.4;
}
if (s.x > size - MARBLE_RADIUS) {
    s.x = size - MARBLE_RADIUS;
    s.vx = -Math.abs(s.vx) * 0.4;
}
if (s.z < -size + MARBLE_RADIUS) {
    s.z = -size + MARBLE_RADIUS;
    s.vz = Math.abs(s.vz) * 0.4;
}
if (s.z > size - MARBLE_RADIUS) {
    s.z = size - MARBLE_RADIUS;
    s.vz = -Math.abs(s.vz) * 0.4;
}
```

**What's happening:**
- The platform spans from `-size` to `+size`. The marble bounces when its center reaches `MARBLE_RADIUS` away from the edge.
- `Math.abs(s.vx) * 0.4` reverses and dampens the velocity — 60% energy loss on each bounce. This prevents the marble from perpetually bouncing.
- The fall detection zone is `0.5` units beyond the edge. This margin means the marble visually slides off before the game registers a fall.
- `s.phase = "fell"` stops the update loop and signals the UI to show "retry" messaging.

---

### 2.4 — Rendering the Tilted Marble

The marble's position is computed in "flat" space, but the platform tilts in 3D. To render correctly, we transform the marble's position through the tilt matrix:

```typescript
// Build tilt matrix (same rotations as the platform)
const tiltMat = Mat4.create();
Mat4.rotateX(tiltMat, tiltMat, s.tiltX);
Mat4.rotateZ(tiltMat, tiltMat, s.tiltZ);

// Manual mat4 × vec3 transform
const marbleWorld = Vec3.create(s.x, s.y, s.z);
const transformed = Vec3.create();
transformed[0] = tiltMat[0] * marbleWorld[0] + tiltMat[4] * marbleWorld[1]
               + tiltMat[8] * marbleWorld[2] + tiltMat[12];
transformed[1] = tiltMat[1] * marbleWorld[0] + tiltMat[5] * marbleWorld[1]
               + tiltMat[9] * marbleWorld[2] + tiltMat[13];
transformed[2] = tiltMat[2] * marbleWorld[0] + tiltMat[6] * marbleWorld[1]
               + tiltMat[10] * marbleWorld[2] + tiltMat[14];

// Use transformed position for the marble's model matrix
Mat4.identity(this.modelMatrix);
Mat4.translate(this.modelMatrix, this.modelMatrix, transformed);
gl.uniformMatrix4fv(this.uModel, false, this.modelMatrix);
gl.uniform3f(this.uColor, 0.9, 0.2, 0.2);
this.drawMesh(this.sphereMesh);
```

**What's happening:**
- The physics simulation treats the platform as flat (no rotation). The marble's `(x, y, z)` is in platform-local space.
- To render, we multiply by the same rotation matrix that tilts the platform. This makes the marble appear to sit on the tilted surface.
- The manual `mat4 × vec3` is extracting columns 0, 1, 2, 3 from the 4x4 matrix (stored column-major) and computing the dot product with the position vector. It's equivalent to `vec4 result = tiltMat * vec4(pos, 1.0)` in GLSL.

---

## Test It

```bash
pnpm dev
```

1. The marble should **roll** when you press arrow keys
2. **Release all keys** — the platform levels and the marble decelerates from friction
3. Roll toward an edge — the marble should **bounce** off with reduced speed
4. Roll hard enough to go past the edge — the game should enter "fell" state
5. Press **R** to restart the level

---

## Challenges

**Easy:**
- Change `FRICTION` from 0.985 to 0.95. How does the marble feel? (Much more sluggish — it decelerates much faster.)

**Medium:**
- Change `TILT_MAX` to 0.5 radians (~28 degrees). The marble becomes much harder to control — why? (Because `sin(0.5) * 9.8 ≈ 4.7` m/s^2 of acceleration, nearly double the original.)

**Hard:**
- Add a "boost" key (e.g., Shift) that temporarily doubles `TILT_MAX`. You'll need to track whether Shift is held in the `keys` dictionary and multiply the tilt cap accordingly.

---

## What You Learned

- Smooth interpolation (`target - current) * speed * dt`) creates natural-feeling input response
- Gravity projection: `sin(tiltAngle) * gravity` gives lateral acceleration on a tilted surface
- Exponential friction (`velocity *= 0.985` per frame) provides realistic deceleration
- Edge bounce with damping (`velocity * 0.4`) prevents perpetual bouncing
- Manual `mat4 × vec3` transforms local-space positions to world-space for rendering

**Next:** We'll add collectible gems, a goal marker, and level progression.

---
[← Previous Step](./step-1.md) | [Back to README](./README.md) | [Next Step →](./step-3.md)
