# Step 2: Asteroids & Enemies

**Goal:** Add tumbling asteroids with variable size and HP, strafing enemy ships that shoot back, and bullet-target collision detection.

**Time:** ~15 minutes

---

## What You'll Build

- **Asteroids** — spheres with random size, speed, tumble rotation, and HP based on size
- **Asteroid spawning** — timer-based with decreasing interval over time
- **Enemy ships** — red boxes that strafe horizontally and shoot red bullets
- **Bullet-asteroid collision** — sphere test, HP decrement, destruction
- **Bullet-enemy collision** — same pattern, enemies have 2 HP

---

## Concepts

- **Size-Based HP**: Asteroids have `hp = Math.ceil(size)`. A small asteroid (size 0.5) has 1 HP. A large one (size 2.0) has 2 HP. This creates natural difficulty scaling — larger targets are easier to hit but harder to destroy.

- **Tumble Rotation**: Each asteroid gets random `rotSpeedX` and `rotSpeedY` in [-2, +2] radians/sec. Combined with approach velocity, this creates convincing tumbling rocks without physics simulation.

- **Spawn Interval Decay**: `spawnInterval = max(0.3, 1.2 - waveTimer * 0.01)`. Starting at 1.2 seconds between asteroids, decreasing to 0.3 seconds after 90 seconds. This creates escalating pressure.

- **Enemy Strafing**: Enemies have a horizontal velocity `vx`. When they hit the arena edge, `vx` reverses. Combined with slow forward movement (`ENEMY_SPEED * 0.3`), they weave across the screen while gradually approaching.

---

## Code

### 2.1 — Asteroid Spawning

```typescript
export const ASTEROID_SPEED_MIN = 3;
export const ASTEROID_SPEED_MAX = 8;
export const ASTEROID_SPAWN_INTERVAL_INIT = 1.2;
export const ASTEROID_SPAWN_INTERVAL_MIN = 0.3;

private spawnAsteroid(): void {
    const size = 0.5 + Math.random() * 1.5;  // 0.5 to 2.0

    this.state.asteroids.push({
        x: (Math.random() - 0.5) * ARENA_W,
        y: (Math.random() - 0.5) * ARENA_H,
        z: 60 + Math.random() * 20,       // spawn 60-80 units ahead
        vz: ASTEROID_SPEED_MIN + Math.random() * (ASTEROID_SPEED_MAX - ASTEROID_SPEED_MIN),
        size,
        rotX: 0, rotY: 0,
        rotSpeedX: (Math.random() - 0.5) * 4,
        rotSpeedY: (Math.random() - 0.5) * 4,
        hp: Math.ceil(size),
    });
}

// In update():
s.spawnTimer += dt;
s.spawnInterval = Math.max(
    ASTEROID_SPAWN_INTERVAL_MIN,
    ASTEROID_SPAWN_INTERVAL_INIT - s.waveTimer * 0.01
);

if (s.spawnTimer >= s.spawnInterval) {
    s.spawnTimer = 0;
    this.spawnAsteroid();
}
```

**What's happening:**
- Asteroids spawn at `z = 60-80` — well beyond the player (at z=0) but visible through the perspective.
- Random X and Y spread them across the arena. Some will fly past harmlessly; others will be on a collision course.
- `vz` ranges from 3 to 8 — slow asteroids give time to react, fast ones are urgent.
- Rotation speeds up to ±2 rad/sec on both axes create varied tumble patterns. No two asteroids spin the same way.

---

### 2.2 — Asteroid Update and Rendering

```typescript
// Update
for (let i = s.asteroids.length - 1; i >= 0; i--) {
    const a = s.asteroids[i];
    a.z -= a.vz * dt;           // move toward player
    a.rotX += a.rotSpeedX * dt; // tumble
    a.rotY += a.rotSpeedY * dt;

    if (a.z < -5) {
        s.asteroids.splice(i, 1);  // passed the player
    }
}

// Render
for (const a of s.asteroids) {
    Mat4.identity(this.modelMatrix);
    Mat4.translate(this.modelMatrix, this.modelMatrix, [a.x, a.y, a.z]);
    Mat4.rotateX(this.modelMatrix, this.modelMatrix, a.rotX);
    Mat4.rotateY(this.modelMatrix, this.modelMatrix, a.rotY);
    Mat4.scale(this.modelMatrix, this.modelMatrix, [a.size, a.size, a.size]);
    gl.uniformMatrix4fv(this.uModel, false, this.modelMatrix);
    gl.uniform3f(this.uColor, 0.45, 0.35, 0.3);  // brown-gray rock
    this.drawMesh(this.sphereMesh);
}
```

**What's happening:**
- Asteroids move in `-Z` (toward the player). They're removed when they pass behind the camera (`z < -5`).
- Rotation is applied before scaling so the asteroid tumbles around its center, not around the world origin.
- `createSphere(1, 12)` is used — the unit sphere scaled by `a.size`. 12 segments gives a slightly faceted look, appropriate for a rock.
- Brown-gray `(0.45, 0.35, 0.3)` looks rocky with Blinn-Phong lighting.

---

### 2.3 — Enemy Ships

```typescript
export const ENEMY_SPEED = 5;
export const ENEMY_SHOOT_INTERVAL = 2.0;

private spawnEnemy(): void {
    this.state.enemies.push({
        x: (Math.random() - 0.5) * ARENA_W,
        y: (Math.random() - 0.5) * ARENA_H * 0.5,
        z: 65,
        vx: (Math.random() - 0.5) * ENEMY_SPEED,
        shootTimer: ENEMY_SHOOT_INTERVAL,
        hp: 2,
    });
}

// In update():
if (Math.random() < 0.003 + s.waveTimer * 0.0001) {
    this.spawnEnemy();
}
```

**What's happening:**
- Enemies spawn at `z = 65` (far away) and drift forward at `ENEMY_SPEED * 0.3` — slower than asteroids.
- `vx` gives them horizontal strafing. When they hit the arena edge, `vx = -vx` reverses direction.
- `shootTimer` counts down from 2.0 seconds. When it hits 0, the enemy fires a red bullet toward the player and resets.
- Spawn probability increases over time: `0.003 + waveTimer * 0.0001`. After 60 seconds, spawn chance is `0.003 + 0.006 = 0.009` per frame (~50% chance per second at 60fps).
- `hp: 2` — enemies take 2 hits, making them tougher than small asteroids.

---

### 2.4 — Enemy Rendering

```typescript
for (const e of s.enemies) {
    // Body — wide red box
    this.drawBox(e.x, e.y, e.z, 0.4, 0.15, 0.3, 0.8, 0.15, 0.15);

    // Cockpit — glowing red dome
    gl.uniform1f(this.uEmissive, 0.5);
    this.drawBox(e.x, e.y + 0.1, e.z - 0.1, 0.15, 0.1, 0.15, 1.0, 0.3, 0.3);
    gl.uniform1f(this.uEmissive, 0.0);
}
```

**What's happening:**
- Enemy ships are 2-part: a wide red body and a glowing cockpit. The cockpit at `uEmissive = 0.5` makes it partially self-lit, creating a menacing red glow.
- The body is wider than tall (`0.8 x 0.3 x 0.6`) — a different silhouette from the player's ship for easy identification.

---

### 2.5 — Bullet-Target Collision

```typescript
// Bullet-asteroid collision
for (let i = s.asteroids.length - 1; i >= 0; i--) {
    const a = s.asteroids[i];

    for (let j = s.bullets.length - 1; j >= 0; j--) {
        const b = s.bullets[j];
        if (b.isEnemy) continue;  // enemy bullets don't hit asteroids

        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dz = b.z - a.z;

        if (dx * dx + dy * dy + dz * dz < a.size * a.size * 1.5) {
            a.hp--;
            s.bullets.splice(j, 1);

            if (a.hp <= 0) {
                s.explosions.push({
                    x: a.x, y: a.y, z: a.z,
                    timer: 0, maxTime: 0.4, size: a.size,
                });
                s.asteroids.splice(i, 1);
                s.score += Math.round(a.size * 10);
            }
            break;
        }
    }
}
```

**What's happening:**
- **3D distance check**: `dx*dx + dy*dy + dz*dz` is the squared distance between bullet and asteroid center.
- **Threshold**: `a.size * a.size * 1.5` — slightly larger than the asteroid's actual volume, making hits more forgiving. The `* 1.5` multiplier accounts for bullet length.
- **HP decrement**: Each hit reduces HP by 1. When HP reaches 0, the asteroid is destroyed and an explosion spawns.
- **Score**: `Math.round(a.size * 10)` — bigger asteroids give more points (5 for small, 20 for large).
- `break` after the first bullet hit — one bullet can't hit the same asteroid twice.
- Enemy-bullet collision uses the same pattern with `distance < 2` (fixed radius since enemies are uniform size).

---

## Test It

```bash
pnpm dev
```

1. **Asteroids** should appear in the distance and tumble toward you
2. **Shoot** them — small ones should die in 1 hit, large in 2
3. After ~10 seconds, **red enemy ships** should appear
4. Enemies should **strafe** left/right and fire **red bullets** at you
5. Shoot enemies — they take **2 hits** to destroy
6. Score should increase with each kill
7. Destruction should spawn something at the asteroid/enemy position (explosions come in Step 3)

---

## Challenges

**Easy:**
- Change asteroid color from brown `(0.45, 0.35, 0.3)` to ice-blue `(0.3, 0.5, 0.7)` for a frozen asteroid field.

**Medium:**
- Add asteroid splitting: when a large asteroid (size > 1.5) is destroyed, spawn 2 smaller asteroids at its position with half the size and random velocities.

**Hard:**
- Add homing missiles: create a new bullet type that tracks the nearest asteroid. Each frame, adjust the missile's velocity vector slightly toward the target using `normalize(target - missile) * trackingStrength`.

---

## What You Learned

- Size-based HP creates natural difficulty scaling for targets
- Random rotation speeds create varied tumble patterns cheaply
- Spawn interval decay increases pressure over time
- Enemy strafing with wall-bounce creates unpredictable movement
- 3D sphere collision with forgiving radius makes hitting satisfying
- Score weighted by target size rewards engaging larger threats

**Next:** We'll add expanding explosion effects, a lives system, and invulnerability.

---
[← Previous Step](./step-1.md) | [Back to README](./README.md) | [Next Step →](./step-3.md)
