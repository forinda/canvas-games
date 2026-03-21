# Step 2: Steering, Physics & AI

**Goal:** Implement keyboard-driven car steering with friction, on/off-track detection, and waypoint-following AI for opponent cars.

**Time:** ~15 minutes

---

## What You'll Build

- **Keyboard steering** — arrow keys or WASD for acceleration, braking, and turning
- **Friction model** with different rates on-track vs. off-track
- **Point-to-segment distance** calculation for track boundary detection
- **Waypoint-following AI** that steers toward the next target and maintains speed
- **Waypoint progression** for all cars (player and AI)

---

## Concepts

- **Angle-based steering**: Cars have a heading angle and move in the direction they face. Turning changes the angle, not the velocity directly. Speed must be nonzero to turn — this prevents spinning in place and feels natural.

- **Two-friction model**: On-track friction is `0.97` (3% speed loss per frame) — barely noticeable at speed. Off-track friction is `0.9` (10% per frame) — a harsh penalty that makes going off-road very costly.

- **Point-to-segment distance**: To check if a car is on the track, we find the closest distance from its position to any track segment (line between adjacent waypoints). If the closest distance < `TRACK_WIDTH / 2`, the car is on-track.

- **AI steering**: Each AI car computes the angle to its next waypoint, then turns toward it at 80% of maximum steer speed. A small random speed variation prevents all AI cars from bunching together.

---

## Code

### 2.1 — Player Input

**File:** `src/contexts/webgl/games/racing-3d/Racing3DEngine.ts`

```typescript
private update(dt: number): void {
    const s = this.state;

    if (s.phase !== "racing") return;
    s.raceTime += dt;

    // Player input
    if (this.keys["ArrowUp"] || this.keys["KeyW"]) {
        s.player.speed = Math.min(MAX_SPEED, s.player.speed + ACCELERATION * dt);
    } else if (this.keys["ArrowDown"] || this.keys["KeyS"]) {
        s.player.speed = Math.max(-MAX_SPEED * 0.3, s.player.speed - BRAKE_FORCE * dt);
    }

    if (this.keys["ArrowLeft"] || this.keys["KeyA"]) {
        s.player.angle -= STEER_SPEED * dt * (s.player.speed > 0 ? 1 : -1);
    }
    if (this.keys["ArrowRight"] || this.keys["KeyD"]) {
        s.player.angle += STEER_SPEED * dt * (s.player.speed > 0 ? 1 : -1);
    }

    this.updateCar(s.player, dt);
}
```

**What's happening:**
- `ACCELERATION = 15` and `BRAKE_FORCE = 25` — braking is stronger than accelerating, which feels natural.
- `MAX_SPEED = 40` forward, but only `MAX_SPEED * 0.3` in reverse — slow reverse prevents exploits.
- Steering multiplies by `speed > 0 ? 1 : -1` — when reversing, left/right are inverted (matching real car behavior).
- `STEER_SPEED = 2.5` radians/sec — about 143 degrees/sec, allowing responsive turns.

---

### 2.2 — Car Movement and Friction

```typescript
private updateCar(car: Car, dt: number): void {
    // Move in facing direction
    car.x += Math.cos(car.angle) * car.speed * dt;
    car.z += Math.sin(car.angle) * car.speed * dt;

    // Friction depends on whether we're on the track
    const onTrack = this.isOnTrack(car.x, car.z);
    car.speed *= onTrack ? FRICTION : OFF_TRACK_FRICTION;

    if (Math.abs(car.speed) < 0.1) car.speed = 0;

    // Waypoint progression
    const wp = TRACK_WAYPOINTS[car.waypointIdx];
    const dx = wp.x - car.x;
    const dz = wp.z - car.z;

    if (dx * dx + dz * dz < 25) {
        car.waypointIdx++;
        if (car.waypointIdx >= TRACK_WAYPOINTS.length) {
            car.waypointIdx = 0;
            car.laps++;
        }
    }
}
```

**What's happening:**
- Movement: `cos(angle) * speed` for X, `sin(angle) * speed` for Z. This is standard polar-to-cartesian.
- Friction is applied every frame as a multiplier: `FRICTION = 0.97` on-track, `OFF_TRACK_FRICTION = 0.9` off-track. At 60fps, on-track friction barely affects top speed, but off-track friction caps speed at about 40% of max.
- Waypoint progression: if the car is within 5 units (`sqrt(25)`) of the next waypoint, advance the index. When the index wraps past the last waypoint, increment the lap counter.

---

### 2.3 — On-Track Detection

```typescript
private isOnTrack(px: number, pz: number): boolean {
    const wps = TRACK_WAYPOINTS;
    let minDist = Infinity;

    for (let i = 0; i < wps.length; i++) {
        const a = wps[i];
        const b = wps[(i + 1) % wps.length];
        const dist = this.pointToSegmentDist(px, pz, a.x, a.z, b.x, b.z);

        if (dist < minDist) minDist = dist;
    }

    return minDist < TRACK_WIDTH / 2;
}

private pointToSegmentDist(
    px: number, pz: number,
    ax: number, az: number,
    bx: number, bz: number,
): number {
    const abx = bx - ax;
    const abz = bz - az;
    const apx = px - ax;
    const apz = pz - az;
    const t = Math.max(0, Math.min(1,
        (apx * abx + apz * abz) / (abx * abx + abz * abz)
    ));
    const closestX = ax + t * abx;
    const closestZ = az + t * abz;
    const dx = px - closestX;
    const dz = pz - closestZ;

    return Math.sqrt(dx * dx + dz * dz);
}
```

**What's happening:**
- For each track segment AB, project point P onto the line AB with parameter `t`, clamped to `[0, 1]`. This gives the closest point on the segment.
- The distance from P to this closest point is the minimum distance to that segment.
- We check all segments and keep the smallest distance. If it's less than `TRACK_WIDTH / 2` (4 units), the car is on-track.
- This is a classic point-to-line-segment formula used extensively in game physics.

---

### 2.4 — Waypoint-Following AI

```typescript
private updateAI(ai: Car, dt: number): void {
    const wp = TRACK_WAYPOINTS[ai.waypointIdx];
    const targetAngle = Math.atan2(wp.z - ai.z, wp.x - ai.x);
    let angleDiff = targetAngle - ai.angle;

    // Normalize angle to [-PI, PI]
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

    ai.angle += Math.sign(angleDiff) *
        Math.min(Math.abs(angleDiff), STEER_SPEED * 0.8 * dt);
    ai.speed = Math.min(
        MAX_SPEED * (0.7 + Math.random() * 0.1),
        ai.speed + ACCELERATION * 0.7 * dt,
    );
}
```

**What's happening:**
- `targetAngle` points from the AI car toward its next waypoint using `atan2`.
- `angleDiff` is the signed difference. The `while` loops normalize it to `[-PI, PI]` — without this, the car might turn 270 degrees clockwise instead of 90 degrees counter-clockwise.
- Steering uses `Math.sign(angleDiff)` for direction and `Math.min(abs, maxTurn)` to cap turn rate at 80% of player steer speed — making AI slightly less agile.
- Speed targets `MAX_SPEED * 0.7-0.8` with `Math.random()` variation, so AI cars have slightly different speeds each frame, preventing them from clustering.

---

## Test It

```bash
pnpm dev
```

1. Select "Racing 3D" from the 3D category
2. After a 3-second countdown, press **Up/W** to accelerate
3. Use **Left/Right or A/D** to steer around corners
4. Drive **off-track** — notice the severe speed penalty on grass
5. **AI cars** should navigate the track autonomously
6. Watch the AI take different lines through corners due to speed variation
7. Waypoints advance as you pass near them — this is what counts laps

---

## Challenges

**Easy:**
- Change `OFF_TRACK_FRICTION` from 0.9 to 0.95. How does this affect the penalty for going off-track?

**Medium:**
- Make the AI smarter: instead of targeting the next waypoint directly, target a point offset perpendicular to the track direction (a "racing line" that cuts corners).

**Hard:**
- Add car-to-car collision: when two cars overlap (distance < 1.5), push them apart and reduce both speeds. Use the same circle-distance check from bowling.

---

## What You Learned

- Angle-based steering moves cars in their facing direction with `cos/sin(angle) * speed`
- Two-tier friction (on-track vs. off-track) creates natural driving penalties
- Point-to-line-segment distance is the standard formula for track boundary detection
- AI cars follow waypoints by computing target angles and normalizing angle differences to `[-PI, PI]`
- Random speed variation prevents AI clustering and creates more dynamic races

**Next:** We'll add the chase camera, distance fog, lap counting, and position ranking.

---
[← Previous Step](./step-1.md) | [Back to README](./README.md) | [Next Step →](./step-3.md)
