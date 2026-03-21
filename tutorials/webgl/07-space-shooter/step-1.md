# Step 1: Ship & Shooting

**Goal:** Set up the emissive shader, build a multi-part player ship, handle mouse + keyboard input, and implement a bullet system with cooldown.

**Time:** ~15 minutes

---

## What You'll Build

- **Emissive shader** — same `uEmissive` approach as Pong, for glowing bullets and engine
- **Multi-part ship** — body cube, two wing cubes, glowing engine cube
- **Dual input** — WASD for direct movement, mouse for smooth tracking
- **Bullet system** — green projectiles with cooldown, auto-fire with Space held

---

## Concepts

- **Multi-Part Rendering**: The ship isn't one mesh — it's 4 `drawBox` calls with different positions, sizes, and colors. The body is wide and flat, wings are thinner and offset to the sides, and the engine is a small cube behind the body with `uEmissive = 0.8` for a blue glow. This is cheaper than creating custom geometry.

- **Mouse + Keyboard Blending**: The player position follows the mouse via `playerX += (targetX - playerX) * 3 * dt` (smooth tracking at 3x speed factor). Simultaneously, WASD adds direct velocity. The result: the mouse provides general positioning while WASD gives fine-grained control.

- **Bullet Cooldown**: `shootCooldown` decreases by `dt` each frame. Shooting only works when it reaches 0. After shooting, it resets to `BULLET_COOLDOWN = 0.15` seconds. Holding Space fires ~6.7 shots/second.

- **Camera Setup**: The camera is fixed at `(0, 0, -5)` looking at `(0, 0, 20)`. This creates a forward-facing perspective where the player's ship is near the bottom of the screen and asteroids/enemies approach from the distance.

---

## Code

### 1.1 — Emissive Fragment Shader

**File:** `src/contexts/webgl/games/space-shooter/shaders.ts`

```glsl
uniform float uEmissive;

void main() {
    // ... Blinn-Phong lighting ...
    vec3 lit = uColor * (ambient + diffuse * 0.75) + vec3(1.0) * spec * 0.2;
    vec3 color = mix(lit, uColor, uEmissive);

    fragColor = vec4(color, 1.0);
}
```

**What's happening:**
- Same pattern as Pong 3D — `mix(lit, uColor, uEmissive)` blends between lit and self-lit.
- Bullets use `uEmissive = 0.9` (almost fully self-lit green).
- Ship engine uses `uEmissive = 0.8` (blue glow).
- Explosions use `uEmissive = 1.0` (fully self-lit, pure color output).

---

### 1.2 — Arena and Camera

**File:** `src/contexts/webgl/games/space-shooter/types.ts`

```typescript
export const ARENA_W = 12;    // playfield width
export const ARENA_H = 9;     // playfield height
export const PLAYER_SPEED = 10;
export const BULLET_SPEED = 30;
export const BULLET_COOLDOWN = 0.15;
```

Camera setup in render:

```typescript
Mat4.perspective(this.projMatrix, Math.PI / 4, aspect, 0.1, 300);
Mat4.lookAt(this.viewMatrix, [0, 0, -5], [0, 0, 20], [0, 1, 0]);

gl.uniformMatrix4fv(this.uView, false, this.viewMatrix);
gl.uniformMatrix4fv(this.uProjection, false, this.projMatrix);
gl.uniform3f(this.uLightDir, 0.3, 0.5, -0.8);
gl.uniform3f(this.uCameraPos, 0, 0, -5);
```

**What's happening:**
- Camera at `z = -5`, looking at `z = 20`. The player ship is at `z = 0`, so it appears in the near part of the frustum. Enemies and asteroids spawn at `z = 60-80` and fly toward `z = 0`.
- `ARENA_W = 12, ARENA_H = 9` define the playable area. The ship is clamped within these bounds.
- Light direction `(0.3, 0.5, -0.8)` points partially backward (toward the camera), illuminating the front faces of approaching asteroids.

---

### 1.3 — Multi-Part Ship Rendering

```typescript
if (s.phase === "playing") {
    const blink = s.invulnTimer > 0 && Math.sin(time * 20) > 0;

    if (!blink) {
        // Body — main hull
        this.drawBox(s.playerX, s.playerY, 0,
                     0.3, 0.15, 0.5,
                     0.2, 0.5, 0.9);

        // Left wing
        this.drawBox(s.playerX - 0.5, s.playerY, 0.1,
                     0.2, 0.08, 0.3,
                     0.15, 0.4, 0.8);

        // Right wing
        this.drawBox(s.playerX + 0.5, s.playerY, 0.1,
                     0.2, 0.08, 0.3,
                     0.15, 0.4, 0.8);

        // Engine glow
        gl.uniform1f(this.uEmissive, 0.8);
        this.drawBox(s.playerX, s.playerY, -0.4,
                     0.12, 0.1, 0.15,
                     0.3, 0.6, 1.0);
        gl.uniform1f(this.uEmissive, 0.0);
    }
}
```

**What's happening:**
- The body is a 0.6 x 0.3 x 1.0 box (width x height x depth). Flat and wide like a fighter jet seen from above.
- Wings are 0.4 x 0.16 x 0.6 — thinner and shorter than the body, offset by ±0.5 units to the sides.
- The engine is a small box at `z = -0.4` (behind the ship), rendered with `uEmissive = 0.8` and a bright blue color `(0.3, 0.6, 1.0)`.
- `blink` creates an invulnerability flash: `sin(time * 20) > 0` oscillates at 20 Hz, making the ship blink rapidly (on for half, off for half at ~10 times per second).

---

### 1.4 — Dual Input: Mouse + Keyboard

```typescript
// Mouse tracking (normalized -1 to +1)
this.mouseMoveHandler = (e: MouseEvent) => {
    const rect = canvas.getBoundingClientRect();
    this.mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouseY = -((e.clientY - rect.top) / rect.height) * 2 - 1);
};

// In update():
// Keyboard direct movement
if (this.keys["ArrowLeft"]  || this.keys["KeyA"]) s.playerX -= PLAYER_SPEED * dt;
if (this.keys["ArrowRight"] || this.keys["KeyD"]) s.playerX += PLAYER_SPEED * dt;
if (this.keys["ArrowUp"]    || this.keys["KeyW"]) s.playerY += PLAYER_SPEED * dt;
if (this.keys["ArrowDown"]  || this.keys["KeyS"]) s.playerY -= PLAYER_SPEED * dt;

// Mouse smooth tracking
const targetX = this.mouseX * ARENA_W / 2;
const targetY = this.mouseY * ARENA_H / 2;
s.playerX += (targetX - s.playerX) * 3 * dt;
s.playerY += (targetY - s.playerY) * 3 * dt;

// Clamp to arena
s.playerX = Math.max(-ARENA_W / 2 + 0.5, Math.min(ARENA_W / 2 - 0.5, s.playerX));
s.playerY = Math.max(-ARENA_H / 2 + 0.5, Math.min(ARENA_H / 2 - 0.5, s.playerY));
```

**What's happening:**
- Mouse position is normalized to [-1, +1] on both axes. Y is negated because screen Y increases downward but world Y increases upward.
- `mouseX * ARENA_W / 2` maps normalized position to world coordinates.
- `(targetX - playerX) * 3 * dt` — smooth tracking. The 3x factor means the ship catches up to the mouse quickly but not instantly, creating a "following" feel.
- WASD adds `PLAYER_SPEED * dt` directly — no smoothing. This gives precise control for dodging.
- Both inputs stack: the mouse provides general positioning, WASD provides adjustments.

---

### 1.5 — Bullet System

```typescript
private shoot(): void {
    const s = this.state;
    if (s.shootCooldown > 0) return;

    s.bullets.push({
        x: s.playerX,
        y: s.playerY,
        z: 0,
        vz: BULLET_SPEED,  // 30 units/sec forward
        isEnemy: false,
    });
    s.shootCooldown = BULLET_COOLDOWN;  // 0.15 seconds
}

// In update():
s.shootCooldown = Math.max(0, s.shootCooldown - dt);

// Auto-fire with Space
if (this.keys["Space"] && s.shootCooldown <= 0) {
    this.shoot();
}

// Update bullets
for (let i = s.bullets.length - 1; i >= 0; i--) {
    const b = s.bullets[i];
    b.z += (b.isEnemy ? -b.vz : b.vz) * dt;

    if (b.z > 80 || b.z < -5) {
        s.bullets.splice(i, 1);  // off-screen
    }
}
```

**What's happening:**
- Bullets spawn at the ship's position, heading forward (`+Z`) at `BULLET_SPEED = 30`.
- `isEnemy` flag distinguishes player bullets from enemy bullets (used for collision and direction).
- Player bullets move in `+Z` (away from camera); enemy bullets move in `-Z` (toward camera).
- Bullets are removed when they leave the visible area (`z > 80` or `z < -5`).
- Auto-fire: holding Space calls `shoot()` every frame that cooldown permits (~6.7 shots/sec).

---

### 1.6 — Rendering Bullets

```typescript
gl.uniform1f(this.uEmissive, 0.9);

// Player bullets (green)
for (const b of s.bullets) {
    if (b.isEnemy) continue;
    this.drawBox(b.x, b.y, b.z, 0.05, 0.05, 0.3, 0.3, 1.0, 0.3);
}

// Enemy bullets (red)
for (const b of s.bullets) {
    if (!b.isEnemy) continue;
    this.drawBox(b.x, b.y, b.z, 0.06, 0.06, 0.2, 1.0, 0.2, 0.2);
}

gl.uniform1f(this.uEmissive, 0.0);
```

**What's happening:**
- All bullets use `uEmissive = 0.9` — they glow brightly regardless of light direction.
- Player bullets are green `(0.3, 1.0, 0.3)` and elongated in Z (`0.6` units long) for a laser-bolt look.
- Enemy bullets are red `(1.0, 0.2, 0.2)` and slightly larger — easier to see and dodge.
- Emissive is reset to 0.0 after drawing bullets.

---

## Test It

```bash
pnpm dev
```

1. Press **Space** to start the game
2. **Move the mouse** — the ship should smoothly follow
3. **WASD** — the ship should respond to keyboard input too
4. **Click** or hold **Space** — green bullets should fly forward
5. The ship should have a **blue glowing engine** at the back
6. Bullets should **disappear** at the far distance
7. No enemies yet — those come in Step 2

---

## Challenges

**Easy:**
- Change `BULLET_COOLDOWN` from 0.15 to 0.05. How does rapid fire feel?

**Medium:**
- Add a "spread shot": when shooting, fire 3 bullets — one straight, one at +5 degrees, one at -5 degrees. You'll need to add a `vx` component to each bullet.

**Hard:**
- Make the engine glow pulse with shooting: when `shootCooldown > 0`, set the engine emissive to 1.0 and scale it slightly larger. This creates a visual "recoil" effect.

---

## What You Learned

- Multi-part rendering: 4 `drawBox` calls create a convincing ship silhouette
- Mouse + keyboard blending: smooth tracking for general position, direct input for precision
- Bullet cooldown prevents spam while allowing rapid fire
- `isEnemy` flag on bullets enables shared update/render code with different behavior
- `uEmissive` makes bullets and engine glow without needing separate shaders

**Next:** We'll add tumbling asteroids, strafing enemies, and bullet-target collision.

---
[Back to README](./README.md) | [Next Step →](./step-2.md)
