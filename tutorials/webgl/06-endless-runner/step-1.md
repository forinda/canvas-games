# Step 1: Lane System & Player

**Goal:** Set up linear fog shaders, render a 3-lane track with ground segments and lane dividers, and create a player character with smooth lane switching.

**Time:** ~15 minutes

---

## What You'll Build

- **Linear fog fragment shader** — `uFogNear` and `uFogFar` uniforms for controllable fade distance
- **3-lane track** — alternating ground segments with lane dividers stretching into the distance
- **Player character** — a blue cube body with a sphere head
- **Lane switching** — Left/Right to change lanes, smooth X interpolation

---

## Concepts

- **Linear Fog**: Unlike the exponential fog in the maze, the runner uses linear fog: `fog = clamp((dist - near) / (far - near), 0, 1)`. This gives explicit control over where fog starts and where it's fully opaque. Objects closer than `near` are clear; farther than `far` are invisible.

- **Relative-Z Rendering**: The player is always at `z = 0` visually. The world scrolls toward the player by rendering objects at `relativeZ = object.z - state.distance`. This avoids floating-point precision issues that would occur if the camera position grew to millions of units.

- **Lane System**: Three lanes at X positions `(-LANE_WIDTH, 0, +LANE_WIDTH)`. `laneX(lane)` converts lane index (0, 1, 2) to world X. The player's actual X interpolates toward the target lane position for smooth movement.

- **Ground Segments**: The infinite track is rendered as repeating segments. Only `VISIBLE_SEGMENTS = 20` segments are drawn, each `GROUND_SEGMENT_LEN = 6` units long. Alternating colors (lighter/darker) create depth perception.

---

## Code

### 1.1 — Linear Fog Fragment Shader

**File:** `src/contexts/webgl/games/endless-runner/shaders.ts`

```glsl
uniform float uFogNear;
uniform float uFogFar;

void main() {
    // ... lighting ...
    vec3 litColor = uColor * light + vec3(1.0) * spec * 0.15;

    // Linear fog
    float dist = length(uCameraPos - vWorldPos);
    float fog = clamp((dist - uFogNear) / (uFogFar - uFogNear), 0.0, 1.0);
    vec3 fogColor = vec3(0.55, 0.7, 0.85);  // sky blue

    fragColor = vec4(mix(litColor, fogColor, fog), 1.0);
}
```

**What's happening:**
- `uFogNear = 40` means objects within 40 units are rendered normally — no fog.
- `uFogFar = VISIBLE_SEGMENTS * GROUND_SEGMENT_LEN = 120` means objects at 120 units are fully fogged.
- `fogColor = (0.55, 0.7, 0.85)` matches `gl.clearColor` — the sky blue. Fogged objects blend into the horizon seamlessly.
- `clamp(..., 0.0, 1.0)` prevents negative fog (closer than near) or over-fog (farther than far).

---

### 1.2 — Track Constants and Lane Math

**File:** `src/contexts/webgl/games/endless-runner/types.ts`

```typescript
export const LANE_COUNT = 3;
export const LANE_WIDTH = 2.5;
export const PLAYER_SIZE = 0.6;
export const GROUND_SEGMENT_LEN = 6;
export const VISIBLE_SEGMENTS = 20;
export const LANE_SWITCH_SPEED = 12;

export function laneX(lane: number): number {
    return (lane - 1) * LANE_WIDTH;  // lane 0 = -2.5, lane 1 = 0, lane 2 = +2.5
}
```

**What's happening:**
- `lane - 1` centers lane 1 at X=0. Lane 0 is left (-2.5), lane 2 is right (+2.5).
- `LANE_WIDTH = 2.5` — each lane is 2.5 units wide. The total track width is 7.5 units plus margins.
- `LANE_SWITCH_SPEED = 12` means the player covers 2.5 units (one lane) in ~0.2 seconds — fast but visible.

---

### 1.3 — Rendering Ground Segments

```typescript
const groundW = LANE_COUNT * LANE_WIDTH + 2;  // 9.5 units
const startSeg = Math.floor(s.distance / GROUND_SEGMENT_LEN);

for (let i = 0; i < VISIBLE_SEGMENTS; i++) {
    const segZ = (startSeg + i) * GROUND_SEGMENT_LEN
               + GROUND_SEGMENT_LEN / 2 - s.distance;
    const shade = i % 2 === 0 ? 0.35 : 0.3;

    this.drawBox(0, -0.1, segZ,
                 groundW / 2, 0.1, GROUND_SEGMENT_LEN / 2,
                 shade, shade + 0.1, shade);
}
```

**What's happening:**
- `startSeg` is the first visible segment index based on distance traveled. As distance increases, earlier segments are replaced by new ones at the far end.
- `segZ = ... - s.distance` converts world Z to relative Z (player at z=0). This is the key relative-rendering trick.
- Alternating `shade` (0.35 vs 0.30) creates a subtle stripe pattern on the ground, helping the player perceive speed.
- `shade + 0.1` for green gives a slightly warm green tone.

---

### 1.4 — Player Character and Lane Switching

```typescript
// Smooth lane switching
const targetX = laneX(s.lane);
const dx = targetX - s.playerX;
s.playerX += Math.sign(dx) * Math.min(Math.abs(dx), LANE_SWITCH_SPEED * dt);

// Render player body (blue cube)
this.drawBox(s.playerX, s.playerY, 0,
             PLAYER_SIZE / 2, PLAYER_SIZE / 2, PLAYER_SIZE / 2,
             0.2, 0.5, 1.0);

// Render player head (sphere)
Mat4.identity(this.modelMatrix);
Mat4.translate(this.modelMatrix, this.modelMatrix,
    [s.playerX, s.playerY + PLAYER_SIZE * 0.7, 0]);
gl.uniformMatrix4fv(this.uModel, false, this.modelMatrix);
gl.uniform3f(this.uColor, 0.9, 0.75, 0.6);
this.drawMesh(this.sphereMesh);
```

**What's happening:**
- `Math.sign(dx) * Math.min(Math.abs(dx), LANE_SWITCH_SPEED * dt)` — move toward the target at `LANE_SWITCH_SPEED`, but don't overshoot. When close enough, snap exactly to the target.
- The player body is a blue cube at `(playerX, playerY, 0)`. The head is a skin-toned sphere floating above.
- The player is always at `z = 0` in the relative coordinate system — the world scrolls around them.

---

### 1.5 — Chase Camera

```typescript
const camZ = -5;
const camY = 4;

Mat4.lookAt(this.viewMatrix,
    [s.playerX * 0.3, camY, camZ],
    [s.playerX * 0.5, 1, 10],
    [0, 1, 0]
);
```

**What's happening:**
- Camera is behind (`z = -5`) and above (`y = 4`) the player.
- `s.playerX * 0.3` — the camera gently follows the player's lane position at 30% strength. This creates a slight parallax effect when switching lanes.
- Looking at `(playerX * 0.5, 1, 10)` — forward and slightly toward the player's lane. The `z = 10` look target points the camera down the track.

---

## Test It

```bash
pnpm dev
```

1. You should see a **3-lane track** stretching into a blue foggy horizon
2. A **blue character** with a round head should stand at center
3. Press **Left/Right** or **A/D** — the character should **smoothly slide** between lanes
4. **Lane dividers** should be visible as thin gray lines
5. No obstacles or movement yet — those come in Step 2

---

## Challenges

**Easy:**
- Change `LANE_COUNT` from 3 to 5 and update `laneX` to `(lane - 2) * LANE_WIDTH`. How does 5 lanes feel?

**Medium:**
- Make the ground scroll even while standing still: set `s.distance += 1 * dt` in the start phase. This creates a "conveyor belt" effect.

**Hard:**
- Add road-side objects (trees/posts): at regular Z intervals, draw small cubes at `x = ±(groundW/2 + 1)`. They should scroll with the ground segments.

---

## What You Learned

- Linear fog (`clamp((dist - near) / (far - near))`) gives explicit control over fade distances
- Relative-Z rendering (`obj.z - distance`) keeps everything near the origin, avoiding precision issues
- `laneX(lane)` converts discrete lane indices to world X positions
- Smooth lane switching uses speed-limited interpolation toward the target
- Chase camera with partial X-follow creates natural parallax

**Next:** We'll add obstacles, jumping, and collision detection.

---
[Back to README](./README.md) | [Next Step →](./step-2.md)
