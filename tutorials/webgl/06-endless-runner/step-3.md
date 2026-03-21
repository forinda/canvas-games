# Step 3: Coins, Fog & Speed Ramp

**Goal:** Add spinning coin collectibles, tune the fog for depth perception, implement speed ramping, and register the game.

**Time:** ~15 minutes

---

## What You'll Build

- **Spinning coins** — golden cubes that rotate and can be collected in free lanes
- **Coin spawning** — coins appear in lanes that don't have obstacles
- **Speed ramp** — speed increases over time from 8 to 25 units/sec
- **Score system** — distance-based score plus coin counter
- **Game registration** with dpad-jump touch layout

---

## Concepts

- **Free Lane Spawning**: After placing obstacles, the remaining free lanes are candidates for coins. `Math.random() < 0.5` gives a 50% chance of a coin per row, placed in a random free lane. This ensures coins are always reachable.

- **Speed Ramp**: `speed = Math.min(MAX_SPEED, speed + SPEED_INCREMENT * dt)`. At `SPEED_INCREMENT = 0.3` per second, the game starts at 8 and reaches max speed (25) after ~57 seconds. The ramp is gradual enough that the player adjusts subconsciously.

- **Coins as Flat Cubes**: Coins are unit cubes scaled to `(0.2, 0.2, 0.06)` — flat and disc-like. Spinning with `rotateY(time * 3)` at 3 radians/second (~1 revolution every 2 seconds creates a classic spinning-coin effect.

---

## Code

### 3.1 — Coin Spawning

```typescript
// After spawning obstacles in spawnRow():
const freeLanes: number[] = [];
for (let i = 0; i < LANE_COUNT; i++) {
    if (!blockedLanes.has(i)) freeLanes.push(i);
}

if (freeLanes.length > 0 && Math.random() < 0.5) {
    s.collectibles.push({
        lane: freeLanes[Math.floor(Math.random() * freeLanes.length)],
        z,
        collected: false,
    });
}
```

**What's happening:**
- `freeLanes` is built by checking which lane indices aren't in `blockedLanes`. With 1 obstacle, 2 lanes are free. With 2 obstacles, 1 lane is free.
- 50% spawn rate keeps coins meaningful but not overwhelming.
- The coin's lane is always free of obstacles, so the player can collect it without risk (if they're in the right lane).

---

### 3.2 — Coin Collection

```typescript
for (const coin of s.collectibles) {
    if (coin.collected) continue;

    const relZ = coin.z - s.distance;

    if (relZ > -0.5 && relZ < 0.5) {
        const coinX = laneX(coin.lane);

        if (Math.abs(s.playerX - coinX) < LANE_WIDTH * 0.4 &&
            Math.abs(s.playerY - 0.8) < 0.6) {
            coin.collected = true;
            s.coins++;
        }
    }
}

// Clean up collected and passed coins
s.collectibles = s.collectibles.filter(c => c.z > s.distance - 5 && !c.collected);
```

**What's happening:**
- Coins hover at `y = 0.8`. The vertical check `Math.abs(playerY - 0.8) < 0.6` means the player collects coins both from ground level (0.3 to 1.4) and during jumps. No need to jump specifically for coins.
- `coin.collected = true` marks it so it's not rendered or checked again.
- The filter removes both passed coins and collected ones, keeping the array lean.

---

### 3.3 — Rendering Coins

```typescript
const time = performance.now() / 1000;

for (const coin of s.collectibles) {
    if (coin.collected) continue;

    const relZ = coin.z - s.distance;
    const cx = laneX(coin.lane);

    Mat4.identity(this.modelMatrix);
    Mat4.translate(this.modelMatrix, this.modelMatrix, [cx, 0.8, relZ]);
    Mat4.rotateY(this.modelMatrix, this.modelMatrix, time * 3);
    Mat4.scale(this.modelMatrix, this.modelMatrix, [0.2, 0.2, 0.06]);
    gl.uniformMatrix4fv(this.uModel, false, this.modelMatrix);
    gl.uniform3f(this.uColor, 1.0, 0.85, 0.0);  // gold
    this.drawMesh(this.cubeMesh);
}
```

**What's happening:**
- Coins are drawn as the cube mesh, but scaled to `(0.2, 0.2, 0.06)` — a thin disc shape.
- `rotateY(time * 3)` spins the disc, creating the classic spinning coin animation. Because it's a flat cube, it appears and disappears as it rotates edge-on.
- Gold color `(1.0, 0.85, 0.0)` makes coins instantly recognizable against the green/brown track.

---

### 3.4 — Speed Ramp and Scoring

```typescript
// In update():
s.distance += s.speed * dt;
s.speed = Math.min(MAX_SPEED, s.speed + SPEED_INCREMENT * dt);
s.score = Math.floor(s.distance);
```

**What's happening:**
- `INITIAL_SPEED = 8`, `MAX_SPEED = 25`, `SPEED_INCREMENT = 0.3` per second.
- Speed timeline:
  - 0 seconds: 8 units/sec (casual)
  - 20 seconds: 14 units/sec (moderate)
  - 40 seconds: 20 units/sec (fast)
  - 57 seconds: 25 units/sec (maximum)
- `score = Math.floor(distance)` — one point per unit of distance. Simple and intuitive. Coins are tracked separately in `s.coins`.
- At max speed, obstacles appear to rush at the player, requiring quick reactions.

---

### 3.5 — Fog Configuration

```typescript
// In render():
gl.uniform1f(this.uFogNear, 40);
gl.uniform1f(this.uFogFar, VISIBLE_SEGMENTS * GROUND_SEGMENT_LEN);  // 120
gl.clearColor(0.55, 0.7, 0.85, 1.0);  // sky blue (matches fogColor)
```

**What's happening:**
- `fogNear = 40` — about 7 ground segments ahead. Obstacles here are fully visible.
- `fogFar = 120` — the furthest visible distance. Ground segments beyond this blend completely into the sky.
- `clearColor` matches `fogColor` in the shader — objects fade seamlessly into the background. This is essential for the "infinite horizon" illusion.
- The fog also acts as an optimization hint: objects at the far end are barely visible anyway, so drawing 20 segments is sufficient.

---

### 3.6 — Game Registration

**File:** `src/contexts/webgl/games/endless-runner/index.ts`

```typescript
export const EndlessRunnerGame: GameDefinition = {
    id: "endless-runner",
    name: "Endless Runner",
    description: "Dodge, jump, collect coins!",
    icon: "🏃",
    color: "#ff6f00",
    category: "3d",
    renderContext: "webgl",
    touchLayout: "dpad-jump",
    help: {
        goal: "Run as far as you can! Dodge obstacles, jump over low ones, collect coins.",
        controls: [
            { key: "Left/Right or A/D", action: "Switch lanes" },
            { key: "Space / Up / W", action: "Jump" },
            { key: "ESC", action: "Exit to menu" },
        ],
        tips: [
            "Jump over yellow (low) obstacles",
            "Speed increases over time",
            "Coins spawn in free lanes",
        ],
    },
    create(canvas, onExit) {
        const engine = new EndlessRunnerEngine(canvas, onExit);
        engine.start();
        return engine;
    },
};
```

**What's happening:**
- `touchLayout: "dpad-jump"` provides directional pad plus a jump button — exactly the input this game needs on mobile.
- The game supports both arrow keys and WASD, plus Space/Up/W for jumping — covering different player preferences.

---

## Test It

```bash
pnpm dev
```

1. Run and collect **golden spinning coins** in the lanes
2. Coins should only appear in **free lanes** (no obstacle in the same lane at the same Z)
3. **Speed** should gradually increase — noticeable after 20-30 seconds
4. **Score** (distance) should increase continuously
5. **Fog** should fade the track into the sky blue horizon
6. After death, press **Space** to restart
7. On mobile, the **d-pad + jump** layout should work

---

## Challenges

**Easy:**
- Double `SPEED_INCREMENT` to 0.6. How quickly does the game become unplayable?

**Medium:**
- Add a coin counter display: reserve a special "HUD coin" rendered at a fixed screen position (e.g., always at `(-3, 3, 2)` in view space). One cube per collected coin, capped at 10 visible.

**Hard:**
- Add a magnet power-up: when collected, coins within 2 lanes are automatically attracted to the player for 5 seconds. You'll need to modify coin collection to check all nearby coins and interpolate their X toward the player.

---

## What You Learned

- Free-lane spawning ensures coins are always safely reachable
- Spinning flat cubes create a convincing coin effect without special geometry
- Linear speed ramp (`speed += increment * dt, capped at max`) creates gradual difficulty increase
- `clearColor` must match `fogColor` for seamless horizon blending
- `touchLayout: "dpad-jump"` maps naturally to lane-switch + jump controls

---

## Complete Architecture

```
src/contexts/webgl/games/endless-runner/
├── shaders.ts               ← Blinn-Phong + linear fog (near/far) shader
├── types.ts                 ← RunnerState, Obstacle, Collectible + constants + laneX
├── EndlessRunnerEngine.ts   ← WebGL2 engine: lanes, obstacles, jump, coins, camera
└── index.ts                 ← GameDefinition export for registry
```

**Congratulations!** You've built an endless runner with procedural content, jump physics, and speed ramping. The lane system, obstacle spawning, and fog techniques are the foundation for any runner-style game.

---
[← Previous Step](./step-2.md) | [Back to README](./README.md)
