# Step 4: Chase Camera & Fog

**Goal:** Implement a chase camera that follows behind the plane, add atmospheric fog to the fragment shader, and complete the win/crash game states with restart.

**Time:** ~15 minutes

---

## What You'll Build

- A **chase camera** positioned behind and above the plane, looking at the plane
- **Atmospheric fog** that fades distant terrain into the sky color
- **Crash state** — game stops when the plane hits the ground
- **Win state** — all rings collected
- **Restart** with new procedural terrain and ring positions

---

## Concepts

- **Chase camera for flight**: Unlike the racing camera (which looks ahead), the flight camera looks AT the plane. This is because the plane's attitude (pitch/roll) is visually important — you need to see the plane to understand your orientation.

- **Fog for flight sims**: Exponential fog is essential for flight sims because the terrain extends to the horizon. Without fog, the hard terrain edge would be jarring. `density = 0.004` creates a gradual fade starting around 100 units.

- **Terrain regeneration on restart**: When restarting, the game generates a completely new heightmap, rebuilds the terrain mesh, and creates new ring positions. This gives infinite replayability.

---

## Code

### 4.1 — Chase Camera

**File:** `src/contexts/webgl/games/flight-sim/FlightSimEngine.ts`

```typescript
// In render():
const camDist = 10;
const camH = 4;
const camX = s.planeX - Math.sin(s.yaw) * camDist;
const camZ = s.planeZ - Math.cos(s.yaw) * camDist;
const camY = s.planeY + camH;

Mat4.lookAt(
    this.viewMatrix,
    [camX, camY, camZ],
    [s.planeX, s.planeY, s.planeZ],
    [0, 1, 0],
);
```

**What's happening:**
- Camera is `camDist` (10 units) behind the plane along the yaw direction, `camH` (4 units) above.
- The look target is the plane's actual position — so the camera always points at the plane.
- This differs from the racing camera: in racing, we look ahead of the car. In flight, we look AT the plane because seeing the plane's pitch and roll is crucial for orientation.
- The camera doesn't follow pitch or roll — it stays level. This prevents disorienting camera tilting.

---

### 4.2 — Atmospheric Fog Shader

**File:** `src/contexts/webgl/games/flight-sim/shaders.ts`

```typescript
// In fragment shader:
// Atmospheric fog
float dist = length(uCameraPos - vWorldPos);
float fog = 1.0 - exp(-dist * uFogDensity);
vec3 fogColor = vec3(0.6, 0.75, 0.9);

fragColor = vec4(mix(color, fogColor, fog), 1.0);
```

**What's happening:**
- `uFogDensity = 0.004` — lower than the racing game (0.008) because flight sims need longer view distances.
- At 50 units: ~18% fog (barely visible). At 150 units: ~45% fog (noticeably faded). At 300 units: ~70% fog (mostly sky color).
- `fogColor = vec3(0.6, 0.75, 0.9)` matches `gl.clearColor(0.6, 0.75, 0.9, 1.0)` — terrain fades seamlessly into the sky.
- The wider FOV (`Math.PI / 3.5` vs. the usual `PI / 4`) gives a more expansive view appropriate for flight.

---

### 4.3 — Crash and Win States

```typescript
// In update():
const groundH = getHeight(this.heights, s.planeX, s.planeZ);

if (s.planeY < groundH + MIN_ALTITUDE) {
    s.phase = "crashed";
    return;
}

// ... ring collection ...
if (s.collected >= s.totalRings) {
    s.phase = "won";
}
```

**What's happening:**
- **Crash**: altitude below `groundH + MIN_ALTITUDE`. The phase change stops the update loop (`if (s.phase !== "flying") return`), freezing the game.
- **Win**: all rings collected. Same phase-stop mechanism.
- In render, the plane is only drawn during `"flying"` phase — after crashing, it disappears.

---

### 4.4 — Restart with New Terrain

```typescript
// In keydown handler:
if (
    (e.code === "Space" || e.code === "Enter") &&
    (this.state.phase === "crashed" || this.state.phase === "won")
) {
    this.heights = generateHeightmap();
    const td = buildTerrainMesh(this.heights);
    this.terrainMesh = this.buildMesh(this.gl, td as unknown as PrimitiveData);
    this.state = this.createState();
}
```

**What's happening:**
- On restart, `generateHeightmap()` creates a completely new terrain (new random seed).
- `buildTerrainMesh` converts it to renderable geometry.
- `buildMesh` uploads the new vertex data to the GPU via a fresh VAO.
- `createState()` uses the new heights for ring placement — rings are always above the new terrain.
- The old terrain mesh's GPU resources are orphaned (the browser will garbage collect the WebGL objects when the old VAO is unreferenced).

---

### 4.5 — Wider FOV for Flight

```typescript
Mat4.perspective(this.projMatrix, Math.PI / 3.5, aspect, 0.5, 500);
```

**What's happening:**
- FOV is `PI / 3.5` (~51 degrees) — wider than the standard `PI / 4` (45 degrees).
- Near plane is `0.5` (not 0.1) — the plane is never closer than a few units, so we can push the near plane out for better depth precision.
- Far plane is `500` — very large because the terrain extends to `64 * 4 = 256` units, and fog hides anything beyond ~300 units.

---

## Test It

```bash
pnpm dev
```

1. Select "Flight Sim" from the 3D category
2. The camera should follow **behind and above** the plane
3. Distant terrain should **fade into the sky** via fog
4. Collect all 8 rings — you should see a win state
5. Press **Space** to restart — the terrain should be **completely different**
6. Fly into the ground — the game should crash and freeze
7. Press **Space** to restart after crashing

---

## Challenges

**Easy:**
- Change `uFogDensity` from 0.004 to 0.01 for a "low visibility" day, or 0.002 for crystal-clear air.

**Medium:**
- Add camera smoothing: lerp the camera position from the previous frame position toward the target, creating a smoother follow: `camX = prevCamX + (targetCamX - prevCamX) * 0.05`.

**Hard:**
- Add a HUD: render small emissive cubes in screen-relative positions showing altitude (stack of cubes), ring count (row of cubes), and a heading indicator.

---

## What You Learned

- A flight chase camera looks AT the plane (not ahead) to show pitch/roll orientation
- Camera stays level (doesn't follow pitch/roll) to prevent disorienting tilting
- Exponential fog with density 0.004 provides natural atmospheric depth for flight
- Fog color matching clear color creates seamless terrain-to-sky transitions
- Terrain regeneration on restart provides infinite replayability with new landscapes
- Wider FOV and large far plane are appropriate for open-world flight

**Next:** Continue to Aquarium to learn boid flocking AI and underwater caustic shading.

---
[← Previous Step](./step-3.md) | [Back to README](./README.md)
