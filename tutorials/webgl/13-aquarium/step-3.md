# Step 3: Food, Caustics & Bubbles

**Goal:** Add click-to-feed food particles, food attraction steering for fish, an underwater caustic lighting effect, depth-based blue tinting, and animated bubbles.

**Time:** ~15 minutes

---

## What You'll Build

- **Food particles** that drop from the surface and sink
- **Food attraction** — fish steer toward the nearest food and eat it
- **Caustic shader effect** using sine-wave interference
- **Depth tinting** — deeper objects look bluer
- **Animated bubbles** rising through the tank

---

## Concepts

- **Food attraction as a boid force**: Food adds a fourth steering force to the boid system. When a fish detects food within `FOOD_ATTRACT_DIST`, it gets a strong force vector pointing at the food. This overrides the normal schooling behavior, making fish swarm the food.

- **Caustic effect**: Real underwater caustics are complex light patterns from water surface refraction. We fake it with two overlapping sine waves in the fragment shader: `sin(x * 3 + time * 2) * sin(z * 3 + time * 1.5)`. The interference creates shifting bright spots that look surprisingly like real caustics.

- **Depth tinting**: Water absorbs red light first, making deep objects appear blue. The shader does `mix(color, blueColor, depth * 0.4)` where `depth = clamp(-y / 8, 0, 1)`. Fish near the surface are vivid; fish at the bottom are blue-shifted.

---

## Code

### 3.1 — Food Dropping and Sinking

**File:** `src/contexts/webgl/games/aquarium/AquariumEngine.ts`

```typescript
private dropFood(): void {
    this.state.food.push({
        x: (Math.random() - 0.5) * TANK_W * 0.6,
        y: 0,
        z: (Math.random() - 0.5) * TANK_D * 0.6,
        life: 10,
    });
}

// In update():
for (let i = s.food.length - 1; i >= 0; i--) {
    s.food[i].y -= FOOD_SINK_SPEED * dt;
    s.food[i].life -= dt;
    if (s.food[i].life <= 0 || s.food[i].y < -TANK_H) {
        s.food.splice(i, 1);
    }
}
```

**What's happening:**
- `dropFood` creates a food particle at the water surface (`y = 0`) with a random XZ position within 60% of the tank width/depth.
- Each frame, food sinks at `FOOD_SINK_SPEED = 1.5` units/sec.
- `life = 10` seconds — food disappears after 10 seconds or when it reaches the floor.
- Reverse iteration (`i--`) when splicing prevents index shifting issues.

---

### 3.2 — Food Attraction Force

```typescript
// Inside the boid update loop, per fish:
let foodX = 0, foodY = 0, foodZ = 0, hasFood = false;
let closestFoodDist = Infinity;

for (const f of s.food) {
    const dx = f.x - fish.x;
    const dy = f.y - fish.y;
    const dz = f.z - fish.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

    if (dist < FOOD_ATTRACT_DIST && dist < closestFoodDist) {
        closestFoodDist = dist;
        foodX = dx; foodY = dy; foodZ = dz;
        hasFood = true;
    }
    // Eat food when very close
    if (dist < 0.5) { f.life = 0; }
}

if (hasFood) {
    const fl = Math.sqrt(foodX * foodX + foodY * foodY + foodZ * foodZ);
    fx += (foodX / fl) * 3;
    fy += (foodY / fl) * 1.5;
    fz += (foodZ / fl) * 3;
}
```

**What's happening:**
- Each fish finds the closest food within `FOOD_ATTRACT_DIST = 6` units.
- The food direction vector is normalized (`/ fl`) and weighted at `3.0` — much stronger than cohesion (0.1), so fish actively chase food.
- Vertical food attraction is weaker (`* 1.5` vs. `* 3`) to keep fish moving more horizontally.
- When a fish gets within 0.5 units, the food is "eaten" by setting `life = 0` (it'll be removed next frame).
- Multiple fish can chase the same food, creating a natural feeding frenzy.

---

### 3.3 — Caustic Shader Effect

**File:** `src/contexts/webgl/games/aquarium/shaders.ts`

```typescript
// In fragment shader main():
// Underwater caustic-like effect
float caustic = sin(vWorldPos.x * 3.0 + uTime * 2.0) *
                sin(vWorldPos.z * 3.0 + uTime * 1.5) * 0.08;
color += vec3(caustic * 0.5, caustic * 0.8, caustic);

// Depth tint (deeper = bluer)
float depth = clamp(-vWorldPos.y / 8.0, 0.0, 1.0);
color = mix(color, vec3(0.05, 0.15, 0.3), depth * 0.4);
```

**What's happening:**
- **Caustics**: two sine waves at different frequencies (`* 3.0`) and different time speeds (`* 2.0` and `* 1.5`) are multiplied together. This creates an interference pattern that shifts over time.
- `* 0.08` scales the effect to a subtle brightness variation.
- The caustic is added as `(0.5, 0.8, 1.0) * caustic` — more blue/green than red, matching underwater light.
- **Depth tinting**: `depth = -worldPos.y / 8.0` maps the tank depth (0 to -8) to a 0-1 range. `mix(color, darkBlue, depth * 0.4)` shifts colors toward deep blue at the bottom, up to 40% blend.
- The result: sand floor looks dark blue, surface objects keep their original colors.

---

### 3.4 — Food Particle Rendering

```typescript
gl.uniform1f(this.uEmissive, 0.5);
for (const food of s.food) {
    Mat4.identity(this.modelMatrix);
    Mat4.translate(this.modelMatrix, this.modelMatrix, [food.x, food.y, food.z]);
    Mat4.scale(this.modelMatrix, this.modelMatrix, [0.08, 0.08, 0.08]);
    gl.uniformMatrix4fv(this.uModel, false, this.modelMatrix);
    gl.uniform3f(this.uColor, 0.9, 0.7, 0.2);
    this.drawMesh(this.sphereMesh);
}
gl.uniform1f(this.uEmissive, 0.0);
```

**What's happening:**
- Food particles are tiny gold spheres (0.08 radius).
- `uEmissive = 0.5` makes them glow slightly, visible even in the deep blue depths.
- Each food is one draw call — typically 0-5 at a time, minimal GPU impact.

---

### 3.5 — Animated Bubbles

```typescript
gl.uniform1f(this.uEmissive, 0.3);
for (let i = 0; i < 6; i++) {
    const bx = Math.sin(time * 0.5 + i * 2) * 3;
    const by = -TANK_H + ((time * 0.8 + i * 1.3) % TANK_H);
    const bz = Math.cos(time * 0.3 + i * 3) * 2;
    const bSize = 0.05 + Math.sin(time + i) * 0.02;

    Mat4.identity(this.modelMatrix);
    Mat4.translate(this.modelMatrix, this.modelMatrix, [bx, by, bz]);
    Mat4.scale(this.modelMatrix, this.modelMatrix, [bSize, bSize, bSize]);
    gl.uniformMatrix4fv(this.uModel, false, this.modelMatrix);
    gl.uniform3f(this.uColor, 0.6, 0.8, 1.0);
    this.drawMesh(this.sphereMesh);
}
gl.uniform1f(this.uEmissive, 0.0);
```

**What's happening:**
- 6 bubbles, each with unique phase offsets (`i * 2`, `i * 1.3`, `i * 3`).
- `by = -TANK_H + ((time * 0.8 + offset) % TANK_H)` — modular time creates continuous rising. When a bubble reaches the top, it wraps back to the bottom.
- `bx` and `bz` use sine/cosine with slow frequencies for gentle horizontal drift.
- `bSize` pulses slightly with `sin(time + i) * 0.02` — subtle wobble.
- Light blue color `[0.6, 0.8, 1.0]` with `uEmissive = 0.3` — slightly glowing translucent look.

---

## Test It

```bash
pnpm dev
```

1. Select "Aquarium" from the 3D category
2. **Click** or press **Space** to drop food — a golden particle should appear and sink
3. **Fish should swarm** toward the food, creating a feeding frenzy
4. When a fish touches the food, it should **disappear** (eaten)
5. Look at the sand floor — you should see **caustic light patterns** shifting
6. Fish near the bottom should look **bluer** than fish near the surface
7. **Bubbles** should rise continuously through the tank
8. Drop multiple food particles — fish should chase the nearest one

---

## Challenges

**Easy:**
- Change the bubble count from 6 to 12. Do more bubbles add to the atmosphere?

**Medium:**
- Add fish feeding animation: when a fish eats food, briefly increase its `size` by 10% for 0.5 seconds, then shrink back.

**Hard:**
- Improve the caustic effect: add a second caustic layer at a different frequency (`sin(x * 5 + time * 3) * sin(z * 4 + time * 2.5)`) and blend them. More layers create more complex, realistic patterns.

---

## What You Learned

- Food attraction is a fourth boid force — stronger than cohesion, it overrides schooling to create feeding frenzies
- `sin(x) * sin(z)` interference patterns create convincing underwater caustics
- Depth tinting with `mix(color, blueColor, depth)` simulates underwater light absorption
- Modular time (`time % range`) creates infinitely looping bubble animations
- Small emissive particles (food, bubbles) add life to the scene with minimal draw calls

**Next:** Continue to Planet Builder to learn sphere deformation and dynamic buffer updates.

---
[← Previous Step](./step-2.md) | [Back to README](./README.md)
