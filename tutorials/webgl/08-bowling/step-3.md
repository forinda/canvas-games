# Step 3: Pin Collision, Scoring & Frames

**Goal:** Implement ball-pin collision with chain reactions, pin fall animation, 10-frame scoring with strikes/spares, and game-over state.

**Time:** ~15 minutes

---

## What You'll Build

- **Ball-pin circle collision** that knocks pins down on contact
- **Chain reaction** physics — a falling pin knocks nearby pins
- **Pin fall animation** using rotation around the base
- **10-frame scoring** with strike/spare detection and 10th-frame bonus rolls
- **Score display** using emissive box indicators along the lane
- **Game over** and restart flow

---

## Concepts

- **Circle-circle collision**: In top-down 2D (ignoring Y), the ball and each pin are circles. If the distance between centers is less than the sum of their radii (`BALL_RADIUS + PIN_RADIUS`), it's a hit. This is the simplest collision test in game physics.

- **Chain reactions**: When a pin is knocked down, we scan all standing pins within 0.5 units. Any close enough get knocked down too, with their fall direction set by the angle from the triggering pin. This creates satisfying cascading knockdowns.

- **Settle phase**: After the ball passes the pins, a 1-second timer lets the fall animations play out before scoring. Pins rotate from 0 to PI/2 around their base at `PIN_FALL_SPEED`.

- **10th frame rules**: In real bowling, a strike on the first ball of the 10th frame earns 2 bonus balls, and a spare earns 1. The code handles this with a `roll` counter that can go up to 3.

---

## Code

### 3.1 — Ball-Pin Collision Detection

**File:** `src/contexts/webgl/games/bowling/BowlingEngine.ts`

```typescript
// Inside update(), during "rolling" phase:

// Pin collision
for (const pin of s.pins) {
    if (!pin.standing) continue;

    const dx = s.ballX - pin.x;
    const dz = s.ballZ - pin.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist < BALL_RADIUS + PIN_RADIUS) {
        pin.standing = false;
        pin.fallDir = Math.atan2(dx, dz);
        s.knockedThisRoll++;

        // Scatter nearby pins (chain reaction)
        for (const other of s.pins) {
            if (!other.standing || other === pin) continue;

            const odx = other.x - pin.x;
            const odz = other.z - pin.z;
            const oDist = Math.sqrt(odx * odx + odz * odz);

            if (oDist < 0.5) {
                other.standing = false;
                other.fallDir = Math.atan2(odx, odz);
                s.knockedThisRoll++;
            }
        }
    }
}
```

**What's happening:**
- For each standing pin, compute the 2D (XZ) distance from the ball center to the pin center.
- If distance < `BALL_RADIUS + PIN_RADIUS` (0.35 + 0.12 = 0.47), the pin is hit.
- `fallDir = atan2(dx, dz)` — the pin falls in the direction the ball pushed it.
- **Chain reaction loop**: after knocking a pin, scan all remaining standing pins. Any within 0.5 units of the knocked pin also fall, with `fallDir` pointing away from the triggering pin.
- `knockedThisRoll` counts total pins downed in this roll for scoring.

---

### 3.2 — Pin Fall Animation

```typescript
// During "settling" phase:
if (s.phase === "settling") {
    for (const pin of s.pins) {
        if (!pin.standing && pin.fallAngle < Math.PI / 2) {
            pin.fallAngle = Math.min(
                Math.PI / 2,
                pin.fallAngle + PIN_FALL_SPEED * dt,
            );
        }
    }

    s.settleTimer -= dt;
    if (s.settleTimer <= 0) {
        this.endRoll();
    }
}

// In render(), drawing fallen pins:
for (const pin of s.pins) {
    Mat4.identity(this.modelMatrix);

    if (pin.standing) {
        Mat4.translate(this.modelMatrix, this.modelMatrix, [pin.x, PIN_HEIGHT / 2, pin.z]);
    } else {
        // Fallen pin — rotate around base
        Mat4.translate(this.modelMatrix, this.modelMatrix, [pin.x, PIN_HEIGHT / 2, pin.z]);
        Mat4.rotateY(this.modelMatrix, this.modelMatrix, pin.fallDir);
        Mat4.rotateX(this.modelMatrix, this.modelMatrix, pin.fallAngle);
    }

    Mat4.scale(this.modelMatrix, this.modelMatrix, [PIN_RADIUS, PIN_HEIGHT / 2, PIN_RADIUS]);
    gl.uniformMatrix4fv(this.uModel, false, this.modelMatrix);
    gl.uniform3f(this.uColor, 0.95, 0.92, 0.88);
    this.drawMesh(this.cubeMesh);
}
```

**What's happening:**
- `pin.fallAngle` animates from 0 to `PI/2` (90 degrees) at `PIN_FALL_SPEED` per second.
- Rendering applies `rotateY(fallDir)` first to face the fall direction, then `rotateX(fallAngle)` to tip the pin over. The order matters — Y rotation sets direction, X rotation does the tipping.
- `PIN_FALL_SPEED = 4` means pins fall fully in about 0.4 seconds.
- After the settle timer expires (1 second), `endRoll()` records the score.

---

### 3.3 — Scoring and Frame Progression

```typescript
private endRoll(): void {
    const s = this.state;
    s.scores[s.frame - 1].push(s.knockedThisRoll);
    s.totalScore += s.knockedThisRoll;
    s.phase = "score";
    s.scoreDisplayTimer = 1.0;
}

private nextRoll(): void {
    const s = this.state;
    const standingCount = s.pins.filter((p) => p.standing).length;
    const isStrike = s.roll === 1 && standingCount === 0;
    const isSpare = s.roll === 2 && standingCount === 0;

    if (s.frame >= TOTAL_FRAMES) {
        // 10th frame special rules
        if (s.roll === 1 && isStrike) {
            s.pins = this.createPins(); // Reset pins for bonus
            s.roll = 2;
            s.phase = "aiming";
            return;
        }
        if (s.roll === 2 && (isStrike || isSpare)) {
            s.pins = this.createPins(); // Reset pins for bonus
            s.roll = 3;
            s.phase = "aiming";
            return;
        }
        s.phase = "gameover";
        return;
    }

    if (isStrike || s.roll === 2) {
        // Next frame
        s.frame++;
        s.roll = 1;
        s.pins = this.createPins();
    } else {
        // Second roll — keep standing pins
        s.roll = 2;
    }

    s.phase = "aiming";
    s.aimX = 0;
    s.aimPower = 0;
}
```

**What's happening:**
- `endRoll` records the pin count and transitions to the 1-second score display.
- `nextRoll` handles frame logic:
  - **Strike** (roll 1, all pins down): advance to next frame, reset all pins.
  - **Second roll complete**: advance to next frame regardless of pins remaining.
  - **Otherwise**: keep standing pins for roll 2.
- **10th frame** gets special handling: a strike on roll 1 earns bonus roll 2 with fresh pins. A strike/spare on roll 2 earns roll 3 with fresh pins. This matches real bowling rules.
- `aimX` and `aimPower` reset to 0 for the next throw.

---

### 3.4 — Score Display

```typescript
// In render() — frame indicators along the lane side:
gl.uniform1f(this.uEmissive, 0.6);

for (let f = 0; f < TOTAL_FRAMES; f++) {
    const fx = LANE_WIDTH / 2 + GUTTER_WIDTH + 0.5;
    const fz = 2 + f * 1.5;
    const isCurrentFrame = f === s.frame - 1;
    const hasScore = s.scores[f].length > 0;

    this.drawBox(
        fx, 0.15, fz,
        0.2, 0.15, 0.5,
        isCurrentFrame ? 0.2 : 0.15,
        isCurrentFrame ? 0.8 : (hasScore ? 0.4 : 0.2),
        isCurrentFrame ? 0.3 : 0.15,
    );
}

gl.uniform1f(this.uEmissive, 0.0);
```

**What's happening:**
- 10 boxes line the right side of the lane, one per frame.
- The current frame glows bright green; completed frames are medium green; future frames are dim.
- `uEmissive = 0.6` makes these indicators bypass most lighting, so they're visible regardless of camera angle.
- This is a simple visual indicator — a full scorecard would need text rendering, which WebGL doesn't provide natively.

---

## Test It

```bash
pnpm dev
```

1. Select "Bowling" from the 3D category
2. **Drag and release** to throw the ball at the pins
3. Pins should **knock down** on contact — you'll see them topple in the hit direction
4. **Aim off-center** for a better chance at chain reactions (striking the pocket)
5. Watch the **frame indicators** along the lane side advance
6. Play through **10 frames** — the game should handle strikes, spares, and the 10th frame bonus
7. At game over, press **Space** or **Enter** to restart
8. Press **R** at any time to reset

---

## Challenges

**Easy:**
- Change the chain reaction distance from 0.5 to 0.8. Do more pins fall per hit?

**Medium:**
- Add a pin counter overlay: render a row of small spheres above the lane — green for knocked, white for standing — that updates each frame.

**Hard:**
- Implement proper bowling scoring with strike bonuses (a strike adds the next two rolls' pins to that frame). This requires looking ahead in the `scores` array.

---

## What You Learned

- Circle-circle collision is the simplest 2D collision test: `distance < r1 + r2`
- Chain reactions create emergent gameplay by scanning nearby objects after each collision
- Pin fall animation uses `rotateY` for direction and `rotateX` for tipping angle
- A settle phase with a timer lets animations complete before scoring
- 10th frame bowling rules require special handling for bonus rolls
- Emissive indicators provide score feedback without text rendering

**Next:** Continue to Racing 3D to learn about waypoint AI and chase cameras.

---
[← Previous Step](./step-2.md) | [Back to README](./README.md)
