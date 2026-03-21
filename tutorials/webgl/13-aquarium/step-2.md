# Step 2: Fish Boid Flocking AI

**Goal:** Implement 15 fish with boid flocking behavior (separation, alignment, cohesion), tank boundary avoidance, and animated tail fins.

**Time:** ~15 minutes

---

## What You'll Build

- **15 fish** with random HSL colors, sizes, and starting positions
- **Boid flocking** with three rules: separation, alignment, cohesion
- **Tank boundary avoidance** — fish steer away from walls
- **Yaw tracking** — fish face their direction of movement
- **Tail animation** using sine-wave rotation

---

## Concepts

- **Boid flocking**: Craig Reynolds' 1987 algorithm simulates schooling with three simple rules applied to each fish:
  1. **Separation**: steer away from nearby fish (avoid crowding)
  2. **Alignment**: match velocity of nearby fish (move in the same direction)
  3. **Cohesion**: steer toward the center of nearby fish (stay with the group)

- **Distance thresholds**: Each rule has a different radius. Separation uses a small radius (1.5 units) for tight avoidance. Alignment uses medium (3 units). Cohesion uses large (4 units) for loose grouping. This layered approach creates natural-looking schools.

- **Force combination**: Each rule produces a steering force vector. These are weighted and summed to produce the final acceleration. Separation is strongest (1.5x), cohesion weakest (0.1x), creating a balance between staying together and not colliding.

- **HSL colors**: Fish are spawned with random hues (0-360), converted to RGB. This gives a full rainbow of fish colors without hand-picking values.

---

## Code

### 2.1 — Fish Spawning with HSL Colors

**File:** `src/contexts/webgl/games/aquarium/AquariumEngine.ts`

```typescript
private createState(): AquariumState {
    const fish: Fish[] = [];
    for (let i = 0; i < FISH_COUNT; i++) {
        const hue = Math.random() * 360;
        const c = this.hslToRgb(hue, 0.7, 0.55);
        fish.push({
            x: (Math.random() - 0.5) * TANK_W * 0.8,
            y: -Math.random() * TANK_H * 0.8,
            z: (Math.random() - 0.5) * TANK_D * 0.8,
            vx: (Math.random() - 0.5) * 2, vy: 0,
            vz: (Math.random() - 0.5) * 2,
            yaw: Math.random() * Math.PI * 2,
            size: 0.2 + Math.random() * 0.3,
            r: c[0], g: c[1], b: c[2],
            tailPhase: Math.random() * Math.PI * 2,
        });
    }
    return { fish, food: [], phase: "viewing" };
}
```

**What's happening:**
- `FISH_COUNT = 15` fish, each with a random hue converted to RGB via `hslToRgb`.
- Positions are within 80% of the tank volume — avoiding spawning too close to walls.
- Initial velocities are random in XZ (no vertical velocity) — fish naturally spread out in 2D first.
- `size` ranges from 0.2 to 0.5 — a mix of small and large fish.
- `tailPhase` is random so tails don't all sync up.

---

### 2.2 — Boid Flocking Update

```typescript
private update(dt: number): void {
    for (const fish of s.fish) {
        let sepX = 0, sepY = 0, sepZ = 0;
        let aliVX = 0, aliVZ = 0, aliCount = 0;
        let cohX = 0, cohY = 0, cohZ = 0, cohCount = 0;

        for (const other of s.fish) {
            if (other === fish) continue;
            const dx = other.x - fish.x;
            const dy = other.y - fish.y;
            const dz = other.z - fish.z;
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

            // Separation: steer AWAY from very close fish
            if (dist < SEPARATION_DIST && dist > 0.01) {
                sepX -= dx / dist;
                sepY -= dy / dist;
                sepZ -= dz / dist;
            }
            // Alignment: match velocity of nearby fish
            if (dist < ALIGNMENT_DIST) {
                aliVX += other.vx;
                aliVZ += other.vz;
                aliCount++;
            }
            // Cohesion: move toward center of nearby group
            if (dist < COHESION_DIST) {
                cohX += other.x;
                cohY += other.y;
                cohZ += other.z;
                cohCount++;
            }
        }

        // Combine forces
        let fx = sepX * 1.5;
        let fy = sepY * 0.5;
        let fz = sepZ * 1.5;

        if (aliCount > 0) {
            fx += (aliVX / aliCount - fish.vx) * 0.3;
            fz += (aliVZ / aliCount - fish.vz) * 0.3;
        }
        if (cohCount > 0) {
            fx += (cohX / cohCount - fish.x) * 0.1;
            fy += (cohY / cohCount - fish.y) * 0.05;
            fz += (cohZ / cohCount - fish.z) * 0.1;
        }

        // Tank boundary avoidance
        const margin = 1;
        if (fish.x < -TANK_W / 2 + margin) fx += 2;
        if (fish.x > TANK_W / 2 - margin) fx -= 2;
        if (fish.y < -TANK_H + margin) fy += 2;
        if (fish.y > -0.5) fy -= 2;
        if (fish.z < -TANK_D / 2 + margin) fz += 2;
        if (fish.z > TANK_D / 2 - margin) fz -= 2;

        // Apply forces
        fish.vx += fx * dt;
        fish.vy += fy * dt;
        fish.vz += fz * dt;

        // Clamp speed
        const speed = Math.sqrt(fish.vx * fish.vx + fish.vy * fish.vy + fish.vz * fish.vz);
        if (speed > FISH_SPEED) {
            fish.vx = (fish.vx / speed) * FISH_SPEED;
            fish.vy = (fish.vy / speed) * FISH_SPEED;
            fish.vz = (fish.vz / speed) * FISH_SPEED;
        }

        fish.x += fish.vx * dt;
        fish.y += fish.vy * dt;
        fish.z += fish.vz * dt;
    }
}
```

**What's happening:**
- **Separation** (`SEPARATION_DIST = 1.5`): for each nearby fish, add a force pointing AWAY (negative direction, normalized by distance). Weight `1.5` — strongest force.
- **Alignment** (`ALIGNMENT_DIST = 3`): average the velocities of nearby fish. The force steers toward that average: `(avgVel - myVel) * 0.3`. Weight `0.3`.
- **Cohesion** (`COHESION_DIST = 4`): average the positions of nearby fish. Steer toward the center: `(avgPos - myPos) * 0.1`. Weight `0.1` — gentlest force.
- **Boundary avoidance**: within 1 unit of any wall, a strong force (2.0) pushes the fish back. The `y > -0.5` check keeps fish below the water surface.
- **Speed clamping**: `FISH_SPEED = 2` — if the combined velocity exceeds this, normalize and scale to max speed.

---

### 2.3 — Yaw Tracking and Tail Animation

```typescript
// Face direction of movement
if (speed > 0.1) {
    const targetYaw = Math.atan2(fish.vx, fish.vz);
    let diff = targetYaw - fish.yaw;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    fish.yaw += diff * FISH_TURN_SPEED * dt;
}

fish.tailPhase += (speed + 1) * 8 * dt;
```

**What's happening:**
- `targetYaw = atan2(vx, vz)` — the angle the fish should face based on its velocity.
- Angle normalization (the `while` loops) prevents spinning the wrong way.
- `FISH_TURN_SPEED = 2` — fish gradually turn toward their movement direction rather than snapping.
- `tailPhase` increases with speed: faster fish wag their tails faster. The `+ 1` ensures even stationary fish have a slow tail wag.

---

### 2.4 — Fish Rendering

```typescript
for (const fish of s.fish) {
    const m = Mat4.create();

    // Body (elongated sphere)
    Mat4.identity(m);
    Mat4.translate(m, m, [fish.x, fish.y, fish.z]);
    Mat4.rotateY(m, m, -fish.yaw);
    Mat4.scale(m, m, [fish.size * 0.6, fish.size * 0.4, fish.size]);
    gl.uniformMatrix4fv(this.uModel, false, m);
    gl.uniform3f(this.uColor, fish.r, fish.g, fish.b);
    this.drawMesh(this.sphereMesh);

    // Tail (swaying cube)
    const tailAngle = Math.sin(fish.tailPhase) * 0.4;
    Mat4.identity(m);
    Mat4.translate(m, m, [fish.x, fish.y, fish.z]);
    Mat4.rotateY(m, m, -fish.yaw);
    Mat4.translate(m, m, [0, 0, -fish.size * 0.8]);
    Mat4.rotateY(m, m, tailAngle);
    Mat4.scale(m, m, [fish.size * 0.15, fish.size * 0.3, fish.size * 0.4]);
    gl.uniformMatrix4fv(this.uModel, false, m);
    gl.uniform3f(this.uColor, fish.r * 0.8, fish.g * 0.8, fish.b * 0.8);
    this.drawMesh(this.cubeMesh);
}
```

**What's happening:**
- **Body**: a sphere scaled to `[0.6, 0.4, 1.0] * size` — elongated in Z (swimming direction), narrow in Y (top-bottom), medium in X. This gives a fish-like oval shape.
- **Tail**: a cube translated behind the body (`z = -size * 0.8`), then rotated by `sin(tailPhase) * 0.4` around Y. This creates the side-to-side tail wag.
- Tail color is 80% of body color — slightly darker for visual distinction.
- Each fish is 2 draw calls (body sphere + tail cube). 15 fish = 30 draw calls.

---

## Test It

```bash
pnpm dev
```

1. Select "Aquarium" from the 3D category
2. You should see **15 colorful fish** swimming around the tank
3. Fish should **school together** — moving in roughly the same direction
4. Fish should **avoid each other** at close range — no overlapping
5. Fish should **stay inside the tank** — bouncing away from walls
6. Each fish should have an **animated tail** wagging side to side
7. **Orbit** the camera to see the schooling from different angles

---

## Challenges

**Easy:**
- Change `FISH_COUNT` from 15 to 30. How does the schooling behavior change with more fish?

**Medium:**
- Add a "leader fish" that's twice the size with a unique gold color. Give it stronger cohesion attraction so other fish follow it.

**Hard:**
- Add fish-to-fish collision: when two fish are closer than `0.3`, apply a strong repulsion force and reduce both speeds temporarily.

---

## What You Learned

- Boid flocking uses three rules: separation (avoid crowding), alignment (match direction), cohesion (stay grouped)
- Different distance thresholds for each rule create natural schooling behavior
- Force weighting balances the three rules (separation strongest, cohesion weakest)
- Tank boundary avoidance uses directional forces near walls
- Tail animation with `sin(phase)` rotation on a cube behind the body creates convincing fish movement
- HSL-to-RGB conversion gives a rainbow of fish colors from a single random value

**Next:** We'll add food particles, caustic shader effects, and bubbles.

---
[← Previous Step](./step-1.md) | [Back to README](./README.md) | [Next Step →](./step-3.md)
