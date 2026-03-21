# Step 2: Obstacles & Jumping

**Goal:** Add procedural obstacle spawning with three types, jump physics with gravity, and collision detection.

**Time:** ~15 minutes

---

## What You'll Build

- **Three obstacle types** — block (standard), low (jumpable), tall (must dodge)
- **Procedural spawning** — obstacles appear at increasing Z, 1-2 per row, always leaving a free lane
- **Jump physics** — velocity + gravity with ground detection
- **Collision detection** — lane proximity + vertical check (can jump over low obstacles)

---

## Concepts

- **Guaranteed Free Lane**: When spawning obstacles, a `blockedLanes` set tracks which lanes have obstacles. The loop stops adding obstacles when `blockedLanes.size >= LANE_COUNT - 1`. This guarantees at least one lane is always passable — the game is always fair.

- **Obstacle Types**: `"low"` (h=0.5) can be jumped over. `"tall"` (h=2.0) is too tall to jump. `"block"` (h=1.0) is standard height — can't be jumped with normal timing. This trio creates variety: dodge left/right for tall/block, jump for low.

- **Jump Physics**: `velocityY = JUMP_VELOCITY` on Space. Each frame: `velocityY -= GRAVITY * dt`, `playerY += velocityY * dt`. When `playerY <= PLAYER_SIZE/2`, land. This is the same projectile formula from physics class.

---

## Code

### 2.1 — Obstacle Spawning

```typescript
private spawnRow(z: number): void {
    const s = this.state;
    const blockedLanes = new Set<number>();
    const obstacleCount = Math.random() < 0.4 ? 2 : 1;

    for (let i = 0; i < obstacleCount; i++) {
        let lane: number;
        do {
            lane = Math.floor(Math.random() * LANE_COUNT);
        } while (blockedLanes.has(lane) && blockedLanes.size < LANE_COUNT - 1);

        if (blockedLanes.size >= LANE_COUNT - 1) break;

        blockedLanes.add(lane);

        const type: Obstacle["type"] =
            Math.random() < 0.3 ? "low"
          : Math.random() < 0.5 ? "tall"
          : "block";

        s.obstacles.push({
            lane, z, type,
            w: LANE_WIDTH * 0.7,
            h: type === "low" ? 0.5 : type === "tall" ? 2.0 : 1.0,
            d: 0.6,
        });
    }
}
```

**What's happening:**
- 40% chance of 2 obstacles per row, 60% chance of 1. Two obstacles with 3 lanes means exactly one escape route — more tense.
- The `do/while` loop picks a random lane that isn't already blocked. The `blockedLanes.size < LANE_COUNT - 1` guard ensures at least one lane stays free.
- Type distribution: ~30% low, ~35% block, ~35% tall. Low obstacles reward jumping; tall ones force lane switching.
- `w: LANE_WIDTH * 0.7` makes obstacles slightly narrower than the lane, providing a small margin of forgiveness.

---

### 2.2 — Obstacle Timing

In the update method:

```typescript
// Spawn obstacles ahead of the player
while (s.nextSpawnZ < s.distance + VISIBLE_SEGMENTS * GROUND_SEGMENT_LEN) {
    this.spawnRow(s.nextSpawnZ);
    s.nextSpawnZ += OBSTACLE_MIN_GAP + Math.random() * 4;
}

// Remove passed obstacles
s.obstacles = s.obstacles.filter(o => o.z > s.distance - 5);
```

**What's happening:**
- `nextSpawnZ` tracks where the next obstacle row should appear. It advances by `OBSTACLE_MIN_GAP (3) + random(0-4)` units — so 3 to 7 units between rows.
- The `while` loop ensures enough obstacles are spawned to fill the visible range, even after speed increases.
- Obstacles behind the player (`z < distance - 5`) are filtered out. The 5-unit margin prevents popping.

---

### 2.3 — Jump Physics

```typescript
// In keyDown handler:
if ((e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW")
    && s.isGrounded) {
    s.velocityY = JUMP_VELOCITY;   // 10 units/sec upward
    s.isGrounded = false;
}

// In update():
if (!s.isGrounded) {
    s.velocityY -= GRAVITY * dt;   // GRAVITY = 25
    s.playerY += s.velocityY * dt;

    if (s.playerY <= PLAYER_SIZE / 2) {
        s.playerY = PLAYER_SIZE / 2;
        s.velocityY = 0;
        s.isGrounded = true;
    }
}
```

**What's happening:**
- `JUMP_VELOCITY = 10` with `GRAVITY = 25` means:
  - Time to peak: `10 / 25 = 0.4` seconds
  - Peak height: `v^2 / (2g) = 100 / 50 = 2.0` units
  - Total air time: `0.8` seconds
- `isGrounded` prevents double-jumping. Only ground contact resets it.
- Landing snaps `playerY` to `PLAYER_SIZE / 2` (half the cube height, so the bottom face touches the ground).

---

### 2.4 — Collision Detection

```typescript
for (const obs of s.obstacles) {
    const relZ = obs.z - s.distance;

    // Only check obstacles near the player (z = 0)
    if (relZ > -0.5 && relZ < 0.8) {
        const obsX = laneX(obs.lane);

        // Lane proximity check
        if (Math.abs(s.playerX - obsX) < LANE_WIDTH * 0.4) {
            // Vertical check — can jump over low obstacles
            if (obs.type === "low" && s.playerY > obs.h + 0.1) {
                continue;  // cleared it!
            }

            s.phase = "dead";
            return;
        }
    }
}
```

**What's happening:**
- `relZ > -0.5 && relZ < 0.8` — only check obstacles within half a unit behind and 0.8 units ahead. The asymmetric range accounts for the player's depth.
- `Math.abs(playerX - obsX) < LANE_WIDTH * 0.4` — 80% of lane width for the collision zone. The 20% margin is forgiving.
- **Low obstacle exception**: If the player's Y position is above `obs.h + 0.1` (obstacle height + small margin), they've jumped over it. This is why jumping matters — low obstacles (`h = 0.5`) need the player to be above `0.6`. With a peak jump height of 2.0, there's a generous window.

---

### 2.5 — Rendering Obstacles

```typescript
for (const obs of s.obstacles) {
    const relZ = obs.z - s.distance;
    const ox = laneX(obs.lane);

    let r = 0.8, g = 0.2, b = 0.2;  // red (block)
    if (obs.type === "low")  { r = 0.9; g = 0.6; b = 0.1; }  // yellow
    if (obs.type === "tall") { r = 0.5; g = 0.2; b = 0.5; }  // purple

    this.drawBox(ox, obs.h / 2, relZ,
                 obs.w / 2, obs.h / 2, obs.d / 2,
                 r, g, b);
}
```

**What's happening:**
- Color-coding: red = block (standard danger), yellow = low (jump over me!), purple = tall (definitely dodge).
- Yellow for low obstacles signals "this is different" — players learn that yellow means jump.
- `relZ = obs.z - s.distance` converts world Z to relative Z for rendering.

---

## Test It

```bash
pnpm dev
```

1. Press **Space** to start running
2. **Obstacles** should appear ahead: red blocks, yellow low bars, purple tall walls
3. Press **Left/Right** to dodge obstacles by switching lanes
4. Press **Space/Up** to **jump** over yellow (low) obstacles
5. Hit an obstacle — the game should end
6. There should **always** be at least one free lane per row

---

## Challenges

**Easy:**
- Change the low obstacle height from 0.5 to 0.3. Jumping over them becomes easier — why?

**Medium:**
- Add a "slide" mechanic: press Down to reduce `playerY` to 0.15 for 0.5 seconds, letting you pass under tall obstacles. You'll need to add a slide timer and modify the tall-obstacle collision check.

**Hard:**
- Make obstacles move sideways: add a `vx` property to obstacles. Some obstacles slowly shift between lanes, requiring the player to time their dodge.

---

## What You Learned

- `blockedLanes` set guarantees at least one free lane — the game is always fair
- Jump physics: `velocityY = initial`, `velocityY -= gravity * dt`, `y += velocityY * dt`
- Collision uses lane proximity (X) + depth range (Z) + vertical check (Y for low obstacles)
- Color-coding obstacle types provides instant visual communication
- Relative-Z rendering keeps precision stable at any distance

**Next:** We'll add coin collectibles, tune the fog, and ramp up speed over time.

---
[← Previous Step](./step-1.md) | [Back to README](./README.md) | [Next Step →](./step-3.md)
