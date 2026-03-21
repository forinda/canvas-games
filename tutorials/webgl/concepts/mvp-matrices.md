# Model-View-Projection (MVP) Matrices

## What Is It?

MVP is a chain of three 4×4 matrix transforms that converts a 3D point from its local object space all the way to a 2D pixel on screen. Every 3D game uses this chain — it's the fundamental way computers turn 3D worlds into 2D images.

## How It Works

```
Local Space → Model → World Space → View → Camera Space → Projection → Clip Space → Screen
    (0,1,0)              (3,4,2)            (0,1,-5)            (-0.2, 0.3, 0.95)

Model:      Places the object in the world (translate, rotate, scale)
View:       Moves the world so the camera is at the origin looking down -Z
Projection: Adds perspective (distant objects appear smaller)
```

### Model Matrix

Transforms from **object space** (where the mesh was authored) to **world space** (where it lives in the scene).

```typescript
import * as Mat4 from "@webgl/shared/Mat4";

const model = Mat4.create(); // identity (object at origin, no rotation)

// Move the cube to (3, 0, 0)
Mat4.translate(model, model, [3, 0, 0]);

// Rotate 45° around Y
Mat4.rotateY(model, model, Math.PI / 4);

// Scale to half size
Mat4.scale(model, model, [0.5, 0.5, 0.5]);
```

**Order matters:** Transforms apply right-to-left. The code above reads as "scale, then rotate, then translate" — the object is scaled first, rotated second, moved last.

### View Matrix

Transforms from **world space** to **camera space** — as if the camera were at the origin looking down -Z.

```typescript
// Camera at (0, 2, 5), looking at origin, Y is up
Mat4.lookAt(view, [0, 2, 5], [0, 0, 0], [0, 1, 0]);
```

`lookAt` computes:
1. **Forward** = normalize(target - eye) → the direction the camera faces
2. **Right** = normalize(cross(forward, up)) → the camera's X axis
3. **Up** = cross(right, forward) → the camera's true Y axis
4. Builds a rotation + translation matrix that moves the world so the camera is at (0,0,0)

### Projection Matrix

Transforms from **camera space** to **clip space** — a [-1, 1] cube that the GPU maps to pixels.

```typescript
// Perspective: 45° FOV, aspect ratio, near=0.1, far=100
Mat4.perspective(proj, Math.PI / 4, canvas.width / canvas.height, 0.1, 100);
```

**Perspective projection** makes distant objects smaller — this is why train tracks appear to converge. The FOV (field of view) controls how wide the camera sees:
- 45° (π/4) — natural, human-like
- 90° (π/2) — very wide, fisheye-like
- 30° — narrow, telephoto-like

**Near/far planes** clip geometry outside the range. Objects closer than `near` or farther than `far` are invisible. Keep `near` as large as possible (0.1, not 0.001) to preserve depth buffer precision.

### The Full Chain in GLSL

```glsl
gl_Position = uProjection * uView * uModel * vec4(aPosition, 1.0);
```

This single line does all three transforms. The GPU then:
1. Divides by `gl_Position.w` (perspective divide)
2. Maps to viewport pixels

## Visual Diagram

```
Object Space          World Space           Camera Space          Clip Space
  ┌───┐                 ┌───┐                 ┌───┐              ┌─────────┐
  │   │  ──Model──►     │   │  ──View──►      │   │  ──Proj──►   │ -1 to 1 │
  └───┘   (rotate,      └───┘   (camera       └───┘   (persp.)   │  cube   │
           translate)            at origin)                       └─────────┘
```

## Code Example

```typescript
// Per frame:
Mat4.identity(model);
Mat4.rotateY(model, model, time * 0.5);

const aspect = canvas.width / canvas.height;
Mat4.perspective(proj, Math.PI / 4, aspect, 0.1, 100);

const view = camera.getViewMatrix(); // from OrbitalCamera or FPSCamera

gl.uniformMatrix4fv(uModel, false, model);
gl.uniformMatrix4fv(uView, false, view);
gl.uniformMatrix4fv(uProjection, false, proj);
```

## Common Pitfalls

1. **Wrong multiplication order** — `Projection × View × Model × position`, not the reverse. Matrix multiplication is not commutative.
2. **Forgetting identity reset** — if you don't call `Mat4.identity(model)` each frame, rotations accumulate and the matrix fills with garbage after hours of play.
3. **Near plane too small** — `near: 0.001` causes z-fighting (flickering) because the depth buffer loses precision. Use `0.1` or larger.
4. **Aspect ratio mismatch** — if you hardcode aspect instead of computing `width/height`, the image stretches on resize.
5. **Transforming normals** — normals must be transformed by `mat3(model)`, not the full `mat4`. Using `mat4` would include translation, which breaks lighting.

## Used In

- **Every WebGL game** in this project
- Spinning Cube: simplest case (one object, one camera)
- 3D Maze: FPS camera produces the view matrix from position + yaw/pitch
- Racing 3D: chase camera produces view matrix that follows the car
