# Step 2: Drag-to-Aim & Ball Physics

**Goal:** Implement mouse-drag aiming, convert drag direction/distance into ball velocity, animate the ball rolling down the lane, and make the camera follow it.

**Time:** ~15 minutes

---

## What You'll Build

- A **drag-to-aim** input system — drag sideways to aim left/right, drag up to set power
- A **visual aim guide** showing dotted green boxes along the predicted trajectory
- **Ball rolling physics** — velocity, spin rotation, and gutter slowdown
- A **dynamic camera** that follows the ball during the roll

---

## Concepts

- **Drag-to-aim mapping**: The mouse drag delta is mapped to two values: `aimX` (horizontal offset, -1 to 1) controls lateral direction, and `aimPower` (0 to 1) controls throw speed. This simple mapping gives intuitive control without complex 3D picking.

- **Ball spin visual**: The ball's X-axis rotation (`ballSpin`) increases proportionally to forward velocity. This creates the visual illusion of rolling even though the sphere has no texture — the specular highlight shifts as the ball rotates.

- **Gutter detection**: If `|ballX| > LANE_WIDTH / 2`, the ball is in the gutter. Instead of stopping it, we apply extra friction to both `ballVX` and `ballVZ`, creating a realistic slowdown.

- **Phase state machine**: The game cycles through phases: `aiming` (waiting for drag), `rolling` (ball in motion), `settling` (pins falling), `score` (displaying result), then back to `aiming` or `gameover`.

---

## Code

### 2.1 — Drag Input Handlers

**File:** `src/contexts/webgl/games/bowling/BowlingEngine.ts`

```typescript
// In the constructor:
this.mouseDownHandler = (e: MouseEvent) => {
    if (this.state.phase !== "aiming") return;

    this.isDragging = true;
    this.dragStartX = e.clientX;
    this.dragStartY = e.clientY;
};
this.mouseMoveHandler = (e: MouseEvent) => {
    if (!this.isDragging) return;

    const dx = e.clientX - this.dragStartX;
    const dy = this.dragStartY - e.clientY; // up = positive power

    this.state.aimX = Math.max(-1, Math.min(1, dx / 150));
    this.state.aimPower = Math.max(0, Math.min(1, dy / 200));
};
this.mouseUpHandler = () => {
    if (!this.isDragging) return;

    this.isDragging = false;

    if (this.state.phase === "aiming" && this.state.aimPower > 0.05) {
        this.throwBall();
    }
};

canvas.addEventListener("mousedown", this.mouseDownHandler);
window.addEventListener("mousemove", this.mouseMoveHandler);
window.addEventListener("mouseup", this.mouseUpHandler);
```

**What's happening:**
- On mousedown, we record the start position. Mousemove computes deltas: `dx / 150` maps horizontal pixel drag to a -1..1 aim range. `dy / 200` maps upward drag to 0..1 power.
- On mouseup, if the player dragged up enough (`aimPower > 0.05`), we throw the ball.
- `mousemove` and `mouseup` are on `window` so dragging outside the canvas still works.

---

### 2.2 — Throwing the Ball

```typescript
private throwBall(): void {
    const s = this.state;
    const speed = s.aimPower * BALL_MAX_SPEED;

    s.ballX = 0;
    s.ballZ = 1;
    s.ballVX = s.aimX * speed * 0.3;
    s.ballVZ = speed;
    s.ballSpin = 0;
    s.knockedThisRoll = 0;
    s.phase = "rolling";
}
```

**What's happening:**
- Ball starts at center (`x = 0`) near the foul line (`z = 1`).
- Forward velocity (`ballVZ`) is proportional to `aimPower * BALL_MAX_SPEED` (14 units/sec max).
- Lateral velocity (`ballVX`) comes from `aimX * speed * 0.3` — a fraction of forward speed, so the ball curves gently.
- Phase transitions to `"rolling"` which activates the physics update.

---

### 2.3 — Ball Physics Update

```typescript
private update(dt: number): void {
    const s = this.state;

    if (s.phase === "rolling") {
        // Move ball
        s.ballZ += s.ballVZ * dt;
        s.ballX += s.ballVX * dt;
        s.ballSpin += s.ballVZ * dt * 3;

        // Gutter check
        const laneEdge = LANE_WIDTH / 2;

        if (Math.abs(s.ballX) > laneEdge) {
            // In the gutter — slow down and slide
            s.ballVX *= 0.95;
            s.ballVZ *= 0.98;
        }

        // Ball past pins or too slow → start settling
        if (s.ballZ > LANE_LENGTH + 2 || s.ballVZ < 0.5) {
            s.phase = "settling";
            s.settleTimer = 1.0;
        }
    }
}
```

**What's happening:**
- Standard Euler integration: `position += velocity * dt`.
- `ballSpin += ballVZ * dt * 3` — spin is purely visual, rotating the ball mesh around X to simulate rolling. The `* 3` makes the visual spin rate feel realistic for the ball's size.
- Gutter friction: each frame in the gutter, velocities decay by 5% (lateral) and 2% (forward). This slows a gutter ball to a crawl without stopping it instantly.
- The roll ends when the ball passes the pins or slows below 0.5 units/sec.

---

### 2.4 — Aim Guide and Dynamic Camera

```typescript
// In render(), during aiming phase:
if (s.phase === "aiming") {
    // Show ball at start position
    Mat4.identity(this.modelMatrix);
    Mat4.translate(this.modelMatrix, this.modelMatrix, [0, BALL_RADIUS, 1]);
    gl.uniformMatrix4fv(this.uModel, false, this.modelMatrix);
    gl.uniform3f(this.uColor, 0.15, 0.15, 0.6);
    this.drawMesh(this.sphereMesh);

    // Aim line — dotted green boxes along predicted path
    if (this.isDragging && s.aimPower > 0) {
        gl.uniform1f(this.uEmissive, 0.8);

        for (let i = 0; i < 8; i++) {
            const t = (i + 1) / 8;
            const az = 1 + t * 6;
            const ax = s.aimX * t * 2;

            this.drawBox(ax, 0.02, az, 0.03, 0.02, 0.08, 0.3, 1.0, 0.3);
        }

        gl.uniform1f(this.uEmissive, 0.0);
    }
}

// Camera follows ball during rolling
const camZ = s.phase === "rolling" ? Math.max(-2, s.ballZ - 6) : -3;
Mat4.lookAt(this.viewMatrix, [0, 4, camZ], [0, 0, LANE_LENGTH * 0.6], [0, 1, 0]);
```

**What's happening:**
- During aiming, the ball sits at `[0, BALL_RADIUS, 1]` — just above the lane at the foul line.
- The aim guide draws 8 small green emissive boxes along a linear interpolation: `z` goes from 1 to 7, `x` curves from 0 to `aimX * 2`. The `uEmissive = 0.8` makes them glow without lighting.
- During rolling, the camera Z tracks the ball: `ballZ - 6` keeps the camera 6 units behind, with `Math.max(-2, ...)` preventing it from going too far back.
- The look target stays fixed at 60% down the lane, creating a smooth follow effect.

---

## Test It

```bash
pnpm dev
```

1. Select "Bowling" from the 3D category
2. **Click and drag upward** on the canvas — you should see green aim dots appear
3. **Drag sideways** while holding to aim left or right
4. **Release** — the ball should roll down the lane toward the pins
5. The camera should smoothly follow the ball
6. If you aim into the gutter, the ball should slow down noticeably
7. The ball passes through pins for now — collision comes in step 3

---

## Challenges

**Easy:**
- Change the ball color from dark blue `[0.15, 0.15, 0.6]` to red. Does the specular highlight still look natural?

**Medium:**
- Increase `BALL_MAX_SPEED` from 14 to 20. How does this affect the gameplay feel? Can you still aim precisely?

**Hard:**
- Add a power meter: render a vertical bar on the side that fills up as `aimPower` increases. Use `drawBox` with emissive coloring and scale the height by `aimPower`.

---

## What You Learned

- Mouse drag deltas can be mapped to 2D aim parameters (`aimX`, `aimPower`) without complex 3D picking
- Euler integration (`pos += vel * dt`) drives ball movement each frame
- Visual spin (`ballSpin`) adds realism even without textures
- Gutter friction uses per-frame velocity decay rather than hard collision boundaries
- A `phase` state machine cleanly separates game states (aiming, rolling, settling, etc.)

**Next:** We'll add pin collision detection, chain reactions, and full 10-frame scoring.

---
[← Previous Step](./step-1.md) | [Back to README](./README.md) | [Next Step →](./step-3.md)
