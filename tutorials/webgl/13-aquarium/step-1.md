# Step 1: Tank & Decorations

**Goal:** Build an aquarium tank with a sand floor, glass walls, rocks, and animated seaweed, viewed through an orbital camera.

**Time:** ~15 minutes

---

## What You'll Build

- A **sand floor** for the tank bottom
- **Glass walls** (back, left, right) rendered with emissive tinting
- **Rock decorations** scattered on the floor
- **Animated seaweed** with time-based swaying
- An **orbital camera** for viewing the tank from any angle

---

## Concepts

- **Open-front tank**: Only three walls are drawn (back, left, right). The front is open so the camera can look in. This is a common trick — real aquarium games do the same.

- **Fake transparency**: Rather than true alpha blending for glass walls, we use `uEmissive` to tint the walls with a blue tone and reduced lighting. This gives a glass-like appearance without sorting issues.

- **Animated seaweed**: Seaweed is a stack of small green cubes. Each segment gets a sine-wave horizontal offset: `sin(time + segmentIndex * 0.5) * 0.15`. Higher segments sway more because the offset is multiplied by the segment index.

- **Tank coordinate system**: The tank is centered at the origin in XZ. Y goes downward: `y = 0` is the water surface, `y = -TANK_H` is the floor. This makes it natural to think of depth as negative Y.

---

## Code

### 1.1 — Tank Dimensions

**File:** `src/contexts/webgl/games/aquarium/types.ts`

```typescript
export const TANK_W = 12;
export const TANK_H = 8;
export const TANK_D = 10;
```

**What's happening:**
- 12 units wide, 8 units deep (vertical), 10 units front-to-back.
- These dimensions create a wide, shallow tank good for viewing fish from the front.

---

### 1.2 — Sand Floor and Glass Walls

**File:** `src/contexts/webgl/games/aquarium/AquariumEngine.ts`

```typescript
// Sand floor
this.drawBox(0, -TANK_H - 0.1, 0, TANK_W / 2, 0.1, TANK_D / 2, 0.65, 0.55, 0.35);

// Tank walls (glass-like)
const wallAlpha = 0.15;
gl.uniform1f(this.uEmissive, wallAlpha);
// Back wall
this.drawBox(0, -TANK_H / 2, -TANK_D / 2 - 0.05, TANK_W / 2, TANK_H / 2, 0.05, 0.3, 0.5, 0.7);
// Left wall
this.drawBox(-TANK_W / 2 - 0.05, -TANK_H / 2, 0, 0.05, TANK_H / 2, TANK_D / 2, 0.3, 0.5, 0.7);
// Right wall
this.drawBox(TANK_W / 2 + 0.05, -TANK_H / 2, 0, 0.05, TANK_H / 2, TANK_D / 2, 0.3, 0.5, 0.7);
gl.uniform1f(this.uEmissive, 0.0);
```

**What's happening:**
- **Sand floor**: at `y = -TANK_H - 0.1`, just below the tank bottom. Sandy brown color `[0.65, 0.55, 0.35]`.
- **Walls**: thin boxes (0.05 units thick) at the edges. Blue-tinted color `[0.3, 0.5, 0.7]` with `uEmissive = 0.15` for a glass appearance.
- The front wall is omitted — the camera looks through the open front.
- Each wall's center is at the tank midpoint vertically (`-TANK_H / 2`), spanning `TANK_H / 2` in half-extent.

---

### 1.3 — Rock Decorations

```typescript
// Rocks on the floor
this.drawBox(-3, -TANK_H + 0.3, 2, 0.5, 0.3, 0.4, 0.4, 0.38, 0.35);
this.drawBox(4, -TANK_H + 0.4, -3, 0.6, 0.4, 0.5, 0.45, 0.4, 0.38);
this.drawBox(0, -TANK_H + 0.2, -2, 0.3, 0.2, 0.3, 0.5, 0.45, 0.4);
```

**What's happening:**
- Three cubes of varying sizes placed on the tank floor, acting as rocks.
- Y positions are slightly above `-TANK_H` so they sit on the sand.
- Gray-brown colors give a natural stone appearance.
- These are static — no animation needed.

---

### 1.4 — Animated Seaweed

```typescript
const time = performance.now() / 1000;

for (let i = 0; i < 5; i++) {
    const sx = -4 + i * 2.2;
    const sz = -3 + (i % 3);
    for (let j = 0; j < 4; j++) {
        const sway = Math.sin(time * 1.5 + i + j * 0.5) * 0.15;
        this.drawBox(
            sx + sway * j,
            -TANK_H + 0.3 + j * 0.35,
            sz,
            0.06, 0.18, 0.06,
            0.1, 0.5, 0.15,
        );
    }
}
```

**What's happening:**
- 5 seaweed plants, each with 4 segments stacked vertically.
- `sway = sin(time * 1.5 + i + j * 0.5) * 0.15` — each plant and segment has a unique phase offset, creating organic-looking motion.
- `sx + sway * j` — higher segments (`j`) sway more. The base barely moves, the top sways the most.
- Dark green color `[0.1, 0.5, 0.15]` with thin proportions (0.06 x 0.18 x 0.06) looks plant-like.

---

### 1.5 — Orbital Camera Setup

```typescript
this.camera = new OrbitalCamera(canvas, {
    distance: 16,
    elevation: 0.3,
    azimuth: 0.3,
    target: [0, -TANK_H / 3, 0],
    minDistance: 8,
    maxDistance: 30,
});
```

**What's happening:**
- Target is `[0, -TANK_H/3, 0]` — looking at a point about 1/3 down from the water surface. This frames the fish swimming area well.
- `elevation: 0.3` — slight downward angle to see into the tank.
- `azimuth: 0.3` — slightly angled view from the front, more interesting than straight-on.

---

## Test It

```bash
pnpm dev
```

1. Select "Aquarium" from the 3D category
2. You should see a **tank** with a sand floor and blue-tinted glass walls
3. **Rocks** should be visible on the floor
4. **Seaweed** should be gently swaying back and forth
5. **Orbit** the camera — you can view from any angle
6. No fish yet — those come in step 2

---

## Challenges

**Easy:**
- Add more rocks: place 2-3 additional `drawBox` calls with different sizes and positions.

**Medium:**
- Add a castle decoration: stack several cubes to create a small castle shape (base, tower, battlement) in one corner of the tank.

**Hard:**
- Add a gravel texture effect: in the sand floor area, draw many tiny cubes in a random pattern with slightly varying gray-brown colors.

---

## What You Learned

- An open-front tank uses only three walls, letting the camera see inside
- `uEmissive` tinting creates a glass-like appearance without true transparency
- Animated seaweed uses `sin(time + offset)` with increasing amplitude for higher segments
- Tank coordinates use negative Y for depth, with 0 at the water surface
- Static decorations (rocks) add visual complexity with just a few draw calls

**Next:** We'll add 15 colorful fish with boid flocking AI and animated tails.

---
[Back to README](./README.md) | [Next Step →](./step-2.md)
