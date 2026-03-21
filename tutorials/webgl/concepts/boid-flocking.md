# Boid Flocking Algorithm

## What Is It?

Boid flocking simulates the emergent group behavior of birds, fish, or other swarming creatures. Each individual (boid) follows three simple rules, and the combination produces realistic flocking patterns — no central coordinator needed.

## How It Works

Each boid steers based on its nearby neighbors:

```
Rule 1: SEPARATION — steer away from neighbors that are too close
         Prevents collisions and overcrowding.
         Force ← sum of (away from each neighbor) / distance

Rule 2: ALIGNMENT — steer toward the average heading of neighbors
         Makes the flock move in the same direction.
         Force ← (average velocity of neighbors) - my velocity

Rule 3: COHESION — steer toward the center of nearby neighbors
         Keeps the flock together as a group.
         Force ← (average position of neighbors) - my position
```

```
  ╭─── Separation radius ───╮
  │   ·  · ·  ·             │
  │  ·  [FISH]  ·           │
  │   ·  · ·  ·             │
  ╰──────────────────────────╯
  ╭───── Alignment radius ─────╮
  │                             │
  │     →  →  →  [FISH] →      │  All heading roughly the same way
  │                             │
  ╰─────────────────────────────╯
  ╭─────── Cohesion radius ───────╮
  │                                │
  │   ·       ·    [FISH]    ·     │  Steer toward center of mass
  │                                │
  ╰────────────────────────────────╯
```

## Code Example

From the Aquarium game (`src/contexts/webgl/games/aquarium/AquariumEngine.ts`):

```typescript
for (const fish of state.fish) {
    let sepX = 0, sepY = 0, sepZ = 0;
    let aliVX = 0, aliVZ = 0, aliCount = 0;
    let cohX = 0, cohY = 0, cohZ = 0, cohCount = 0;

    for (const other of state.fish) {
        if (other === fish) continue;
        const dx = other.x - fish.x;
        const dy = other.y - fish.y;
        const dz = other.z - fish.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

        // Rule 1: Separation
        if (dist < SEPARATION_DIST) {
            sepX -= dx / dist;
            sepY -= dy / dist;
            sepZ -= dz / dist;
        }

        // Rule 2: Alignment
        if (dist < ALIGNMENT_DIST) {
            aliVX += other.vx;
            aliVZ += other.vz;
            aliCount++;
        }

        // Rule 3: Cohesion
        if (dist < COHESION_DIST) {
            cohX += other.x;
            cohY += other.y;
            cohZ += other.z;
            cohCount++;
        }
    }

    // Combine forces with weights
    let fx = sepX * 1.5;  // separation is strongest
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

    fish.vx += fx * dt;
    fish.vy += fy * dt;
    fish.vz += fz * dt;
}
```

## Adding Extra Behaviors

Beyond the 3 core rules, you can add:
- **Food attraction** — steer toward the nearest food particle
- **Boundary avoidance** — push away from tank walls
- **Predator avoidance** — flee from a specific entity
- **Speed clamping** — prevent unrealistic velocities

## Common Pitfalls

1. **O(n²) performance** — every boid checks every other boid. For >100 boids, use spatial hashing or grid-based neighbor lookup.
2. **Force weight tuning** — separation should be strongest (prevents overlap), cohesion weakest (gentle pull). Wrong weights create jittery or collapsing flocks.
3. **3D vs 2D** — in 3D, you need Y-axis forces too. Fish shouldn't all flatten to one plane.

## Used In

- **Aquarium** — 15 fish with full 3D boid flocking + food attraction
- Can be adapted for birds, particles, crowds, or any swarm behavior
