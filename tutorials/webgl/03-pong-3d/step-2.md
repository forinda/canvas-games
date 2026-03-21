# Step 2: Ball Physics & AI

**Goal:** Add a glowing ball with wall bounces, paddle collision with angled return, and an AI opponent that tracks the ball.

**Time:** ~15 minutes

---

## What You'll Build

- **Glowing ball** rendered as a sphere with `uEmissive = 0.6`
- **Wall bounce** — ball reflects off left/right walls
- **Paddle collision** — AABB test with angled return based on hit position
- **Speed increase** — ball accelerates slightly each rally hit
- **AI opponent** — tracks the ball with a speed limit

---

## Concepts

- **Ball Launch with Random Angle**: The ball starts at center with a random angle (within a cone) and random direction (toward player or AI). `sin(angle)` gives the X component, `cos(angle)` gives the Z component, creating a normalized direction vector.

- **Paddle Hit Position -> Ball Angle**: When the ball hits the paddle, the offset from the paddle center determines the return angle. Hit the edge: steep angle. Hit the center: straight back. This gives the player control over placement.

- **Velocity Normalization**: After changing the ball's X-velocity from the paddle hit, the total speed would change. We re-normalize: compute `len = sqrt(vx^2 + vz^2)`, then scale both components so `len = ballSpeed`. This keeps speed consistent regardless of return angle.

- **Simple AI**: The AI moves toward the ball's X position with a speed limit (`AI_SPEED = 5.5`). It can't teleport — it has to physically track, which means sharp angles can beat it.

---

## Code

### 2.1 — Ball Launch

```typescript
private launchBall(): void {
    const s = this.state;
    const angle = (Math.random() - 0.5) * Math.PI * 0.4;  // ±36 degrees
    const dir = Math.random() < 0.5 ? 1 : -1;             // toward player or AI

    s.ballVX = Math.sin(angle) * s.ballSpeed;
    s.ballVZ = Math.cos(angle) * s.ballSpeed * dir;
    s.ballX = 0;
    s.ballZ = 0;
    s.rallyHits = 0;
}
```

**What's happening:**
- `(Math.random() - 0.5) * Math.PI * 0.4` gives an angle between -36 and +36 degrees. This prevents the ball from launching sideways (which would be boring wall-bouncing).
- `dir` randomly chooses toward player (`+Z`) or AI (`-Z`), ensuring fairness.
- Ball starts at center `(0, 0)`. `rallyHits` resets for speed tracking.

---

### 2.2 — Wall Bounce

```typescript
// Ball movement
s.ballX += s.ballVX * dt;
s.ballZ += s.ballVZ * dt;

// Wall bounce (left/right)
const wallLimit = TABLE_W / 2 - BALL_R;

if (s.ballX < -wallLimit) {
    s.ballX = -wallLimit;
    s.ballVX = Math.abs(s.ballVX);    // reflect to positive X
} else if (s.ballX > wallLimit) {
    s.ballX = wallLimit;
    s.ballVX = -Math.abs(s.ballVX);   // reflect to negative X
}
```

**What's happening:**
- The ball bounces at `TABLE_W/2 - BALL_R` — accounting for the ball's radius so it visually touches the wall.
- `Math.abs` ensures the velocity always points away from the wall after bounce, regardless of the current sign. This prevents "sticking" bugs where the ball gets pushed into the wall on consecutive frames.

---

### 2.3 — Paddle Collision

```typescript
// Player paddle (near side, +Z)
const playerZ = TABLE_H / 2 - PADDLE_D / 2;

if (s.ballVZ > 0 &&                                          // moving toward player
    s.ballZ + BALL_R >= playerZ - PADDLE_D / 2 &&            // reached paddle depth
    s.ballZ - BALL_R <= playerZ + PADDLE_D / 2 &&
    s.ballX >= s.playerX - PADDLE_W / 2 - BALL_R &&          // within paddle width
    s.ballX <= s.playerX + PADDLE_W / 2 + BALL_R) {

    s.ballVZ = -Math.abs(s.ballVZ);  // reflect back

    // Angle based on hit position
    const hitPos = (s.ballX - s.playerX) / (PADDLE_W / 2);  // -1 to +1
    s.ballVX = hitPos * s.ballSpeed * 0.7;

    // Push ball out of paddle
    s.ballZ = playerZ - PADDLE_D / 2 - BALL_R;

    // Speed up
    s.rallyHits++;
    s.ballSpeed = Math.min(BALL_SPEED_MAX, s.ballSpeed + BALL_SPEED_INC);

    // Re-normalize velocity to new speed
    const len = Math.sqrt(s.ballVX * s.ballVX + s.ballVZ * s.ballVZ);
    s.ballVX = (s.ballVX / len) * s.ballSpeed;
    s.ballVZ = (s.ballVZ / len) * s.ballSpeed;
}
```

**What's happening:**
- **Direction check** (`s.ballVZ > 0`): Only collide when the ball is moving toward the paddle. Without this, the ball could collide repeatedly while being pushed out.
- **AABB test**: Four conditions check the ball is overlapping the paddle in both X and Z, accounting for ball radius.
- **Hit position**: `(ballX - paddleX) / (PADDLE_W / 2)` maps to [-1, +1]. -1 = left edge, 0 = center, +1 = right edge. This becomes the X velocity factor.
- **Speed ramp**: `BALL_SPEED_INC = 0.3` per hit, capping at `BALL_SPEED_MAX = 14` (starting from `BALL_SPEED_INIT = 6`). After ~27 hits the ball maxes out.
- **Re-normalization**: After setting `ballVX` from the hit position, `sqrt(vx^2 + vz^2)` gives the actual speed, then both components are scaled to match `ballSpeed`. This ensures consistent total speed.

---

### 2.4 — AI Opponent

```typescript
// AI tracks the ball's X position with limited speed
const aiTarget = s.ballX;
const aiDiff = aiTarget - s.aiX;

s.aiX += Math.sign(aiDiff) * Math.min(Math.abs(aiDiff), AI_SPEED * dt);
s.aiX = Math.max(-maxX, Math.min(maxX, s.aiX));
```

**What's happening:**
- `Math.sign(aiDiff)` gives the direction (-1 or +1). `Math.min(Math.abs(aiDiff), AI_SPEED * dt)` caps the movement to `AI_SPEED = 5.5` units/second.
- If the ball is close, the AI moves exactly to its position. If the ball is far, the AI moves at max speed toward it.
- `AI_SPEED = 5.5` vs `PADDLE_SPEED = 8` — the player is faster, which is the main way to win. Sharp angles at high ball speed can outpace the AI.

---

### 2.5 — Rendering the Ball

```typescript
// Ball — glowing sphere
gl.uniform1f(this.uEmissive, 0.6);
Mat4.identity(this.modelMatrix);
Mat4.translate(this.modelMatrix, this.modelMatrix, [s.ballX, BALL_R, s.ballZ]);
gl.uniformMatrix4fv(this.uModel, false, this.modelMatrix);
gl.uniform3f(this.uColor, 1.0, 1.0, 0.8);  // warm white
this.drawMesh(this.sphereMesh);
gl.uniform1f(this.uEmissive, 0.0);  // reset for other objects
```

**What's happening:**
- `uEmissive = 0.6` makes the ball 60% self-lit — it glows warmly but still shows some lighting variation.
- The ball sits at `y = BALL_R` so it rests on the table surface.
- `(1.0, 1.0, 0.8)` is a warm white — slightly yellow, like a glowing ping-pong ball.
- Emissive is reset to `0.0` after drawing the ball so other objects render normally.

---

## Test It

```bash
pnpm dev
```

1. Press **Space** to start — the ball should launch from center
2. The ball should **bounce off side walls**
3. Move with **Left/Right** or **A/D** — hit the ball with your paddle
4. Hit the **edge of the paddle** — the ball should return at a steep angle
5. The **AI paddle** should track the ball and return it
6. The ball should get **slightly faster** with each hit
7. If the ball passes a paddle, it resets (scoring comes next step)

---

## Challenges

**Easy:**
- Change `AI_SPEED` from 5.5 to 3.0. How much easier is it to win?

**Medium:**
- Make the AI imperfect: add `+ (Math.random() - 0.5) * 0.5` to `aiTarget`. The AI now misjudges slightly, creating more realistic play.

**Hard:**
- Add a spin mechanic: if the player is moving while hitting the ball, add `playerVelocity * 0.3` to `ballVX`. You'll need to track the player's velocity between frames.

---

## What You Learned

- `Math.abs` for wall bounces prevents sticking bugs
- Paddle hit position maps to return angle, giving the player control over ball placement
- Velocity normalization after angle change keeps speed consistent
- AI with speed-limited tracking is simple but creates beatable-yet-challenging opponents
- `uEmissive` makes objects glow without a separate shader

**Next:** We'll add scoring, score visualization, and the complete game flow.

---
[← Previous Step](./step-1.md) | [Back to README](./README.md) | [Next Step →](./step-3.md)
