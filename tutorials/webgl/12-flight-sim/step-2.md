# Step 2: Plane Model & Controls

**Goal:** Build a multi-part plane model from cubes and implement pitch/roll/yaw flight controls with bank-to-yaw coupling.

**Time:** ~15 minutes

---

## What You'll Build

- A **plane model** from 5 cube parts: fuselage, wings, tail, vertical stabilizer, and engine glow
- **Pitch/roll controls** from arrow keys or WASD
- **Bank turning** — roll causes yaw (heading change), just like a real airplane
- **Damping** to prevent over-rotation
- **Forward movement** along the plane's facing direction

---

## Concepts

- **Bank turning**: In real flight, banking (rolling) the wings causes the plane to turn. The code implements this as `yaw += roll * YAW_FROM_ROLL * dt`. The more you roll, the faster you turn. This feels much more natural than direct yaw control.

- **Pitch/roll damping**: Each frame, `pitch *= 0.95` and `roll *= 0.95`. Without input, the plane levels out. With input, the damping prevents extreme angles — `Math.max(-1.2, Math.min(1.2, ...))` provides a hard cap.

- **Multi-part model via matrix stacking**: The plane's parts share a base model matrix (translate + rotateY/X/Z for position and orientation). Each part copies this base, then applies its own local offset and scale. `m.set(this.modelMatrix)` copies the base matrix.

---

## Code

### 2.1 — Flight State

**File:** `src/contexts/webgl/games/flight-sim/types.ts`

```typescript
export const PLANE_SPEED = 30;
export const PITCH_SPEED = 1.5;
export const ROLL_SPEED = 2.0;
export const YAW_FROM_ROLL = 0.8;
export const MIN_ALTITUDE = 2;
```

**What's happening:**
- `PLANE_SPEED = 30` — constant forward speed. The plane always moves forward.
- `PITCH_SPEED = 1.5` rad/sec — up/down tilt rate.
- `ROLL_SPEED = 2.0` rad/sec — left/right bank rate.
- `YAW_FROM_ROLL = 0.8` — bank-to-turn coupling. Roll of 1 radian produces 0.8 rad/sec yaw change.
- `MIN_ALTITUDE = 2` — minimum clearance above terrain before crashing.

---

### 2.2 — Flight Physics Update

**File:** `src/contexts/webgl/games/flight-sim/FlightSimEngine.ts`

```typescript
private update(dt: number): void {
    const s = this.state;
    if (s.phase !== "flying") return;

    // Input
    if (this.keys["ArrowUp"] || this.keys["KeyW"]) {
        s.pitch -= PITCH_SPEED * dt;
    }
    if (this.keys["ArrowDown"] || this.keys["KeyS"]) {
        s.pitch += PITCH_SPEED * dt;
    }
    if (this.keys["ArrowLeft"] || this.keys["KeyA"]) {
        s.roll -= ROLL_SPEED * dt;
    }
    if (this.keys["ArrowRight"] || this.keys["KeyD"]) {
        s.roll += ROLL_SPEED * dt;
    }

    // Damping
    s.pitch *= 0.95;
    s.roll *= 0.95;
    s.pitch = Math.max(-1.2, Math.min(1.2, s.pitch));
    s.roll = Math.max(-1.2, Math.min(1.2, s.roll));

    // Bank turning: roll causes yaw
    s.yaw += s.roll * YAW_FROM_ROLL * dt;

    // Move forward in facing direction
    const cosP = Math.cos(s.pitch);
    s.planeX += Math.sin(s.yaw) * cosP * s.speed * dt;
    s.planeZ += Math.cos(s.yaw) * cosP * s.speed * dt;
    s.planeY -= Math.sin(s.pitch) * s.speed * dt;

    // World bounds wrap
    const worldSize = TERRAIN_SIZE * TERRAIN_SCALE;
    if (s.planeX < 0) s.planeX += worldSize;
    if (s.planeX > worldSize) s.planeX -= worldSize;
    if (s.planeZ < 0) s.planeZ += worldSize;
    if (s.planeZ > worldSize) s.planeZ -= worldSize;
}
```

**What's happening:**
- **Pitch**: Up arrow pitches down (nose drops), down arrow pitches up. This matches flight stick convention — push forward to descend.
- **Roll**: Left arrow rolls left, right rolls right.
- **Damping**: `*= 0.95` bleeds off rotation each frame. At 60fps, this gives ~85% decay over 10 frames — the plane naturally levels out.
- **Bank turning**: `yaw += roll * YAW_FROM_ROLL * dt`. If you're rolled 30 degrees left, you turn left. Release the roll and the turn gradually stops.
- **Movement**: `sin(yaw) * cos(pitch) * speed` for X, `cos(yaw) * cos(pitch) * speed` for Z, `-sin(pitch) * speed` for Y. When pitched down, the plane descends; when level, it flies horizontal.
- **World wrap**: teleports the plane to the opposite side when it leaves the terrain bounds, creating an infinite-feeling world.

---

### 2.3 — Plane Model Rendering

```typescript
// In render():
Mat4.identity(this.modelMatrix);
Mat4.translate(this.modelMatrix, this.modelMatrix, [s.planeX, s.planeY, s.planeZ]);
Mat4.rotateY(this.modelMatrix, this.modelMatrix, -s.yaw);
Mat4.rotateX(this.modelMatrix, this.modelMatrix, s.pitch);
Mat4.rotateZ(this.modelMatrix, this.modelMatrix, -s.roll);

// Fuselage
const m = Mat4.create();
m.set(this.modelMatrix);
Mat4.scale(m, m, [0.4, 0.25, 1.2]);
gl.uniformMatrix4fv(this.uModel, false, m);
gl.uniform3f(this.uColor, 0.85, 0.85, 0.9);
this.drawMesh(this.cubeMesh);

// Wings
m.set(this.modelMatrix);
Mat4.scale(m, m, [2.5, 0.06, 0.5]);
gl.uniformMatrix4fv(this.uModel, false, m);
gl.uniform3f(this.uColor, 0.7, 0.7, 0.8);
this.drawMesh(this.cubeMesh);

// Tail
m.set(this.modelMatrix);
Mat4.translate(m, m, [0, 0.3, -1.0]);
Mat4.scale(m, m, [0.8, 0.06, 0.3]);
gl.uniformMatrix4fv(this.uModel, false, m);
gl.uniform3f(this.uColor, 0.7, 0.7, 0.8);
this.drawMesh(this.cubeMesh);

// Vertical stabilizer
m.set(this.modelMatrix);
Mat4.translate(m, m, [0, 0.5, -1.0]);
Mat4.scale(m, m, [0.06, 0.4, 0.3]);
gl.uniformMatrix4fv(this.uModel, false, m);
gl.uniform3f(this.uColor, 0.7, 0.2, 0.2);
this.drawMesh(this.cubeMesh);

// Engine glow
gl.uniform1f(this.uEmissive, 0.8);
m.set(this.modelMatrix);
Mat4.translate(m, m, [0, 0, -1.3]);
Mat4.scale(m, m, [0.15, 0.15, 0.1]);
gl.uniformMatrix4fv(this.uModel, false, m);
gl.uniform3f(this.uColor, 0.3, 0.5, 1.0);
this.drawMesh(this.cubeMesh);
gl.uniform1f(this.uEmissive, 0.0);
```

**What's happening:**
- The base model matrix applies position + all three rotations (yaw, pitch, roll). Every part inherits this via `m.set(this.modelMatrix)`.
- **Fuselage**: long thin box (1.2 Z length, 0.4 X width) — the main body.
- **Wings**: very wide (2.5 X), very thin (0.06 Y), centered on the fuselage.
- **Tail**: horizontal stabilizer offset backward (`z = -1.0`) and slightly up.
- **Vertical stabilizer**: tall thin box behind the fuselage — red for visibility.
- **Engine glow**: small emissive blue box at the back — simulates a jet exhaust.

---

## Test It

```bash
pnpm dev
```

1. Select "Flight Sim" from the 3D category
2. You should see a **plane flying** over the terrain
3. Press **Up/W** to pitch down (descend), **Down/S** to pitch up (climb)
4. Press **Left/A** to roll left, **Right/D** to roll right — the plane should **turn** when banked
5. Release all keys — the plane should **level out** due to damping
6. The plane flies at constant speed; you only control attitude
7. Fly near the terrain surface — ground collision comes in step 3

---

## Challenges

**Easy:**
- Change the wing color to match the fuselage for a single-tone paint scheme.

**Medium:**
- Add speed control: hold Shift to boost to `PLANE_SPEED * 1.5`, hold Ctrl to slow to `PLANE_SPEED * 0.5`.

**Hard:**
- Add propeller animation: draw a small spinning cube in front of the fuselage that rotates faster when at full speed.

---

## What You Learned

- Bank turning (roll-to-yaw coupling) creates natural flight physics with `yaw += roll * coupling * dt`
- Rotation damping (`*= 0.95`) prevents over-rotation and auto-levels the plane
- A multi-part plane model shares a base matrix; each part copies it and adds local transforms
- `m.set(baseMatrix)` is the key pattern for attaching parts to a parent transform
- World wrapping with modular position creates an infinite terrain feel

**Next:** We'll add collectible rings and ground collision detection.

---
[← Previous Step](./step-1.md) | [Back to README](./README.md) | [Next Step →](./step-3.md)
