# Step 3: Explosions, Lives & Scoring

**Goal:** Add expanding explosion effects, a lives system with invulnerability, player-target collision, and game registration.

**Time:** ~15 minutes

---

## What You'll Build

- **Explosion effects** — expanding, fading spheres with full emissive glow
- **Player collision** — asteroids and enemy bullets can hit the player
- **Lives system** — 3 lives, invulnerability timer after each hit
- **Visual blink** — ship flashes during invulnerability
- **Death explosion** — large explosion when lives reach zero
- **Game registration** with start/dead phases

---

## Concepts

- **Expanding Sphere Explosion**: An explosion is a sphere that starts at `0.5 * size` and grows to `2.5 * size` over `maxTime` seconds. Its color fades from bright orange-yellow to transparent black. Using `uEmissive = 1.0`, it glows without needing light direction.

- **Invulnerability Timer**: After taking a hit, `invulnTimer = 1.5` seconds. During this time, collision checks are skipped. The ship blinks (rendered every other frame based on `sin(time * 20) > 0`) to signal invulnerability. This prevents instant death from clustered hazards.

- **Player-Asteroid Collision**: Uses the same 3D distance check as bullet-asteroid, but between the player position and each asteroid center. The threshold is `asteroid.size^2 + 0.5` — slightly generous to feel fair.

---

## Code

### 3.1 — Explosion Data Structure

**File:** `src/contexts/webgl/games/space-shooter/types.ts`

```typescript
export interface Explosion {
    x: number; y: number; z: number;
    timer: number;
    maxTime: number;
    size: number;
}
```

---

### 3.2 — Explosion Update

```typescript
// In update():
for (let i = s.explosions.length - 1; i >= 0; i--) {
    s.explosions[i].timer += dt;

    if (s.explosions[i].timer >= s.explosions[i].maxTime) {
        s.explosions.splice(i, 1);
    }
}
```

**What's happening:**
- Each explosion has a timer that counts up. When it reaches `maxTime`, the explosion is removed.
- Asteroid explosions use `maxTime = 0.4` seconds (quick pop). Enemy explosions use `0.5` seconds. Player death uses `0.6` seconds (dramatic).

---

### 3.3 — Explosion Rendering

```typescript
gl.uniform1f(this.uEmissive, 1.0);  // fully self-lit

for (const exp of s.explosions) {
    const t = exp.timer / exp.maxTime;      // 0 to 1 progress
    const scale = exp.size * (0.5 + t * 2); // grows from 50% to 250% of original size
    const fade = 1 - t;                      // 1.0 at start, 0.0 at end

    Mat4.identity(this.modelMatrix);
    Mat4.translate(this.modelMatrix, this.modelMatrix, [exp.x, exp.y, exp.z]);
    Mat4.scale(this.modelMatrix, this.modelMatrix, [scale, scale, scale]);
    gl.uniformMatrix4fv(this.uModel, false, this.modelMatrix);
    gl.uniform3f(this.uColor, 1.0 * fade, 0.5 * fade, 0.1 * fade);
    this.drawMesh(this.sphereMesh);
}

gl.uniform1f(this.uEmissive, 0.0);
```

**What's happening:**
- `t = timer / maxTime` normalizes progress to [0, 1].
- `scale = size * (0.5 + t * 2)` — at `t=0`, the explosion is half the asteroid's size. At `t=1`, it's 2.5x. This creates an expanding fireball effect.
- `fade = 1 - t` — colors dim linearly. At start: `(1.0, 0.5, 0.1)` — bright orange. At end: `(0, 0, 0)` — invisible.
- `uEmissive = 1.0` means the explosion color is output directly, unaffected by lighting. Explosions glow from any angle.
- The sphere mesh gives the explosion a volumetric look. Combined with the scale animation, it resembles a classic fireball.

---

### 3.4 — Player Collision

```typescript
// In update(), after checking invulnerability timer:
if (s.invulnTimer <= 0) {
    // Asteroid collision
    for (const a of s.asteroids) {
        const dx = s.playerX - a.x;
        const dy = s.playerY - a.y;
        const dz = -a.z;  // player is at z=0

        if (dx * dx + dy * dy + dz * dz < a.size * a.size + 0.5) {
            this.playerHit();
            break;
        }
    }

    // Enemy bullet collision
    for (const b of s.bullets) {
        if (!b.isEnemy) continue;

        const dx = s.playerX - b.x;
        const dy = s.playerY - b.y;

        if (b.z < 2 && dx * dx + dy * dy < 1) {
            this.playerHit();
            break;
        }
    }
}
```

**What's happening:**
- `dz = -a.z` because the player is at `z = 0`. The asteroid's Z coordinate *is* the distance.
- `a.size * a.size + 0.5` — collision radius is the asteroid's size plus a small constant. This makes small asteroids slightly more dangerous (proportionally) and large ones slightly less, balancing the gameplay.
- Enemy bullets check `b.z < 2` — only bullets near the player's Z position. This prevents false collisions with bullets far down the field.
- `break` after the first hit — one collision per frame is enough.

---

### 3.5 — Lives and Invulnerability

```typescript
private playerHit(): void {
    const s = this.state;
    s.lives--;
    s.invulnTimer = 1.5;  // 1.5 seconds of invulnerability

    if (s.lives <= 0) {
        s.phase = "dead";
        s.explosions.push({
            x: s.playerX, y: s.playerY, z: 0,
            timer: 0, maxTime: 0.6, size: 2,
        });
    }
}

// Invulnerability countdown in update():
s.invulnTimer = Math.max(0, s.invulnTimer - dt);

// Ship blink in render():
const blink = s.invulnTimer > 0 && Math.sin(time * 20) > 0;
if (!blink) {
    // ... draw ship ...
}
```

**What's happening:**
- Each hit deducts one life and grants 1.5 seconds of invulnerability.
- During invulnerability, `invulnTimer > 0` skips the collision checks in update.
- The blink effect: `sin(time * 20) > 0` is true for half the cycle at 20 rad/sec (~3.2 Hz). The ship appears and disappears rapidly, clearly signaling "can't be hit right now."
- On final death (`lives <= 0`): phase changes to `"dead"` and a large explosion (`size: 2`) spawns at the player position.

---

### 3.6 — Game Registration

**File:** `src/contexts/webgl/games/space-shooter/index.ts`

```typescript
export const SpaceShooterGame: GameDefinition = {
    id: "space-shooter",
    name: "Space Shooter",
    description: "Shoot asteroids & enemies in 3D!",
    icon: "🚀",
    color: "#ff6f00",
    category: "3d",
    renderContext: "webgl",
    touchLayout: "tap-only",
    help: {
        goal: "Destroy asteroids and enemy ships. Survive as long as you can!",
        controls: [
            { key: "Mouse / WASD", action: "Move ship" },
            { key: "Click / Space", action: "Shoot" },
            { key: "ESC", action: "Exit to menu" },
        ],
        tips: [
            "Hold Space for rapid fire",
            "Enemies shoot red bullets — dodge them",
            "Larger asteroids take more hits",
        ],
    },
    create(canvas, onExit) {
        const engine = new SpaceShooterEngine(canvas, onExit);
        engine.start();
        return engine;
    },
};

// Game state interface for reference:
export interface ShooterState {
    playerX: number; playerY: number;
    bullets: Bullet[];
    asteroids: Asteroid[];
    enemies: Enemy[];
    explosions: Explosion[];
    shootCooldown: number;
    score: number;
    lives: number;
    spawnTimer: number;
    spawnInterval: number;
    waveTimer: number;
    phase: "playing" | "dead" | "start";
    invulnTimer: number;
}
```

**What's happening:**
- `touchLayout: "tap-only"` — on mobile, tapping anywhere fires. The ship follows touch position (the mouse tracking code works with touch events too).
- The game has three phases: `"start"` (waiting for Space), `"playing"` (active), `"dead"` (show explosion, wait for restart).
- The `destroy()` method removes 5 event listeners: resize, keydown, keyup, mousemove, click. All must be cleaned up to prevent leaks.

---

## Test It

```bash
pnpm dev
```

1. Destroy an asteroid — a **glowing orange explosion** should expand and fade
2. Get hit by an asteroid — the ship should **blink** for ~1.5 seconds
3. Get hit again during blink — nothing should happen (invulnerable)
4. Take 3 hits total — a **large explosion** at the ship, game enters dead phase
5. Press **Space** to restart with fresh lives and score
6. **Score** should increase based on what you destroy (bigger asteroids = more points)
7. Enemy kills should give **50 points** each

---

## Challenges

**Easy:**
- Change starting lives from 3 to 5. How does the game feel with more forgiveness?

**Medium:**
- Add particle debris to explosions: when an asteroid explodes, spawn 4-6 tiny cubes with random velocities that fall and fade out over 1 second. Track them in a separate `debris` array.

**Hard:**
- Add a shield power-up: occasionally spawn a blue spinning cube. Collecting it grants a temporary shield (absorbs one hit without losing a life). Display the shield as a translucent sphere around the ship using `uAlpha` (requires enabling blend).

---

## What You Learned

- Expanding, fading spheres with `uEmissive = 1.0` create convincing explosions
- `t = timer / maxTime` normalizes animation progress for scale and color interpolation
- Invulnerability timer prevents frustrating instant-death chains
- `sin(time * frequency) > 0` creates a blink effect for visual invulnerability feedback
- Player death spawns a larger explosion for dramatic effect
- Score weighted by target value rewards engaging harder threats

---

## Complete Architecture

```
src/contexts/webgl/games/space-shooter/
├── shaders.ts               ← Blinn-Phong + emissive fragment shader
├── types.ts                 ← ShooterState, Bullet, Asteroid, Enemy, Explosion + constants
├── SpaceShooterEngine.ts    ← WebGL2 engine: ship, bullets, asteroids, enemies, explosions
└── index.ts                 ← GameDefinition export for registry
```

**Congratulations!** You've built a complete space shooter — the most complex game in the WebGL tutorial series. You've combined every technique from the previous tutorials: multi-object rendering, emissive lighting, collision detection, state machines, and animated effects. These patterns form the foundation for any 3D game you want to build next.

---
[← Previous Step](./step-2.md) | [Back to README](./README.md)
