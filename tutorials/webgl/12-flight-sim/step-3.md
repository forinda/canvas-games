# Step 3: Ring Collection & Collision

**Goal:** Scatter collectible rings above the terrain, render them as sphere circles, implement sphere-based collision for collection, and detect ground crashes.

**Time:** ~15 minutes

---

## What You'll Build

- **8 rings** scattered at random positions above the terrain
- **Ring rendering** — 12 small spheres arranged in a circle, rotating over time
- **Sphere collision** for ring collection
- **Ground collision** using `getHeight` + minimum altitude
- **Collection counter** and win condition

---

## Concepts

- **Ring placement**: Each ring gets a random XZ position. Its Y is set to `terrainHeight + 8 + random * 10` — always above the ground with some variation. This guarantees rings are reachable but require maneuvering.

- **Ring as sphere circle**: Rather than a torus mesh, we draw 12 small spheres in a circle of radius `RING_RADIUS`. Adding `time` to the angle offset makes the ring rotate, creating a visually attractive collectible.

- **Sphere collision**: The plane occupies a point. A ring occupies a sphere of radius `RING_RADIUS * 2`. If the distance between the plane and ring center is less than this, the ring is collected. Simple and effective.

- **Ground crash**: Each frame, query `getHeight(planeX, planeZ)` and check if `planeY < groundH + MIN_ALTITUDE`. If so, the plane has crashed.

---

## Code

### 3.1 — Ring Placement

**File:** `src/contexts/webgl/games/flight-sim/FlightSimEngine.ts`

```typescript
// In createState():
const rings: Ring[] = [];
const worldSize = TERRAIN_SIZE * TERRAIN_SCALE;

for (let i = 0; i < RING_COUNT; i++) {
    const rx = 20 + Math.random() * (worldSize - 40);
    const rz = 20 + Math.random() * (worldSize - 40);
    const terrainH = getHeight(this.heights, rx, rz);

    rings.push({
        x: rx,
        y: terrainH + 8 + Math.random() * 10,
        z: rz,
        collected: false,
    });
}
```

**What's happening:**
- `RING_COUNT = 8` rings are scattered randomly.
- XZ positions are clamped to `[20, worldSize - 20]` — avoiding terrain edges where height data might be unreliable.
- Y is `terrainH + 8 + random * 10` — at least 8 units above ground, up to 18 units. This forces the player to fly at varying altitudes.
- `collected: false` tracks whether the player has flown through this ring.

---

### 3.2 — Ring Rendering

```typescript
// In render():
for (const ring of s.rings) {
    if (ring.collected) continue;

    gl.uniform1f(this.uEmissive, 0.6);

    // Draw ring as 12 small spheres in a circle
    for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2 + time;
        const rx = ring.x + Math.cos(angle) * RING_RADIUS;
        const ry = ring.y + Math.sin(angle) * RING_RADIUS;

        Mat4.identity(this.modelMatrix);
        Mat4.translate(this.modelMatrix, this.modelMatrix, [rx, ry, ring.z]);
        Mat4.scale(this.modelMatrix, this.modelMatrix, [0.25, 0.25, 0.25]);
        gl.uniformMatrix4fv(this.uModel, false, this.modelMatrix);
        gl.uniform3f(this.uColor, 1.0, 0.85, 0.0);
        this.drawMesh(this.sphereMesh);
    }

    gl.uniform1f(this.uEmissive, 0.0);
}
```

**What's happening:**
- 12 small gold spheres are placed in a circle of radius `RING_RADIUS` (3 units).
- `angle = (i / 12) * 2PI + time` — the `+ time` makes the entire ring rotate, creating a spinning hoop effect.
- The circle is in the XY plane (at a fixed Z = ring.z). The plane flies through in the Z direction.
- `uEmissive = 0.6` makes the rings glow bright gold, visible from a distance.
- Collected rings are skipped entirely.

---

### 3.3 — Ring Collection

```typescript
// In update(), during "flying" phase:
for (const ring of s.rings) {
    if (ring.collected) continue;

    const dx = s.planeX - ring.x;
    const dy = s.planeY - ring.y;
    const dz = s.planeZ - ring.z;

    if (dx * dx + dy * dy + dz * dz < RING_RADIUS * RING_RADIUS * 4) {
        ring.collected = true;
        s.collected++;

        if (s.collected >= s.totalRings) {
            s.phase = "won";
        }
    }
}
```

**What's happening:**
- 3D distance check: `dx^2 + dy^2 + dz^2 < (RING_RADIUS * 2)^2`.
- `RING_RADIUS * 2 = 6` — the collection sphere is generous (twice the visual ring radius), making it forgiving to fly through.
- When collected, set `ring.collected = true` and increment the counter.
- If all rings are collected (`collected >= totalRings`), the game transitions to `"won"`.

---

### 3.4 — Ground Collision

```typescript
// In update():
const groundH = getHeight(this.heights, s.planeX, s.planeZ);

if (s.planeY < groundH + MIN_ALTITUDE) {
    s.phase = "crashed";
    return;
}
```

**What's happening:**
- `getHeight` returns the interpolated terrain height at the plane's XZ position.
- `MIN_ALTITUDE = 2` — the plane must stay at least 2 units above the terrain.
- If it goes below, `phase = "crashed"` immediately stops the game.
- The `return` prevents further updates (no ring collection after crashing).

---

## Test It

```bash
pnpm dev
```

1. Select "Flight Sim" from the 3D category
2. You should see **golden spinning rings** scattered above the terrain
3. Fly toward a ring — when close enough, it should **disappear** (collected)
4. Fly **too close to the ground** — the game should enter a crash state
5. Try to collect all **8 rings** to win
6. Press **Space** after crashing or winning to restart with new terrain and new ring positions

---

## Challenges

**Easy:**
- Change `RING_COUNT` from 8 to 5 for an easier game, or 12 for a harder one.

**Medium:**
- Add a proximity indicator: change the ring color from gold to red when the plane is within 30 units, making nearby rings easier to spot.

**Hard:**
- Add ring waypoint arrows: for the nearest uncollected ring, draw a small cube arrow in front of the plane pointing toward it, like a compass heading indicator.

---

## What You Learned

- Rings are placed above terrain using `getHeight` + random altitude offset
- Drawing 12 spheres in a circle with a time offset creates a spinning ring effect
- Sphere collision (`distance < radius`) provides simple 3D collection detection
- Ground collision compares plane altitude to interpolated terrain height
- Collection counting with a total threshold drives the win condition

**Next:** We'll add the chase camera and atmospheric fog for the complete flight experience.

---
[← Previous Step](./step-2.md) | [Back to README](./README.md) | [Next Step →](./step-4.md)
