# Step 2: Overlap Clipping & Falling Pieces

**Goal:** Compute the overlap between the dropped block and the tower top, slice off the overhang, and animate falling offcut pieces.

**Time:** ~15 minutes

---

## What You'll Build

- **Overlap computation** — 1D interval intersection along the swing axis
- **Block slicing** — keep the overlapping portion, create a falling piece from the overhang
- **Perfect placement detection** — within 0.1 unit tolerance, keep the full block
- **Miss detection** — zero overlap means game over
- **Falling animation** — offcut pieces fall with gravity and tumble

---

## Concepts

- **1D Interval Intersection**: The dropped block spans `[newPos - width/2, newPos + width/2]`. The top block spans `[topPos - topWidth/2, topPos + topWidth/2]`. The overlap is `[max(leftA, leftB), min(rightA, rightB)]`. If `overlapSize <= 0`, there's no intersection — the block missed entirely.

- **Perfect Placement**: If the overlap is within 0.1 of the full block width, it's "perfect." The tolerance prevents frustration — pixel-perfect alignment shouldn't be required. Perfect placements keep the full block width, rewarding precise timing.

- **Offcut Creation**: The non-overlapping portion becomes a falling piece. Its center is calculated from the edge of the overlap to the edge of the dropped block. It gets the same dimensions except its width is `fullWidth - overlapWidth`.

---

## Code

### 2.1 — The handleDrop Method (X-axis swing)

```typescript
private handleDrop(): void {
    const s = this.state;

    if (s.phase === "gameover") {
        this.state = this.createState();  // restart
        return;
    }
    if (s.phase !== "playing") return;

    const top = s.stack[s.stack.length - 1];
    const newY = s.stack.length * BLOCK_HEIGHT;
    const color = this.levelColor(s.stack.length);

    if (s.swingOnX) {
        const newX = s.swingPos;

        // 1D interval intersection
        const overlapLeft = Math.max(newX - s.currentW / 2, top.x - top.w / 2);
        const overlapRight = Math.min(newX + s.currentW / 2, top.x + top.w / 2);
        const overlapW = overlapRight - overlapLeft;

        if (overlapW <= 0.05) {
            // Missed completely — game over
            s.fallingPieces.push({
                x: newX, z: s.currentZ, w: s.currentW, d: s.currentD,
                y: newY, vy: 0, rotation: 0, ...color,
            });
            s.phase = "gameover";
            return;
        }

        const isPerfect = Math.abs(overlapW - s.currentW) < 0.1;

        if (isPerfect) {
            s.perfectStreak++;
            s.stack.push({
                x: top.x, z: s.currentZ,
                w: s.currentW, d: s.currentD,
                y: newY, ...color,
            });
        } else {
            s.perfectStreak = 0;
            const overlapCenterX = (overlapLeft + overlapRight) / 2;

            // Keep the overlapping portion
            s.stack.push({
                x: overlapCenterX, z: s.currentZ,
                w: overlapW, d: s.currentD,
                y: newY, ...color,
            });

            // Create falling offcut
            const cutW = s.currentW - overlapW;
            const cutX = newX > top.x
                ? overlapRight + cutW / 2   // overhang on the right
                : overlapLeft - cutW / 2;   // overhang on the left

            s.fallingPieces.push({
                x: cutX, z: s.currentZ, w: cutW, d: s.currentD,
                y: newY, vy: 0, rotation: 0, ...color,
            });

            s.currentW = overlapW;
            s.currentX = overlapCenterX;
        }
    }
    // ... Z-axis case is symmetric ...

    s.score++;
    s.swingOnX = !s.swingOnX;
    s.swingPos = -SWING_RANGE;
    s.swingSpeed = Math.min(SWING_SPEED_MAX, s.swingSpeed + SWING_SPEED_INC);
}
```

**What's happening:**
- **Interval math**: `overlapLeft = max(newLeft, topLeft)` and `overlapRight = min(newRight, topRight)`. If the result is positive, they intersect by that amount.
- **Miss check**: `overlapW <= 0.05` (not exactly 0 to handle floating-point edge cases). The entire dropped block becomes a falling piece.
- **Perfect check**: `Math.abs(overlapW - s.currentW) < 0.1` — if the overlap is within 0.1 of the full width, treat it as perfect. The block is placed at the top block's X position (not the dropped position), keeping alignment.
- **Offcut center**: If the player overshot to the right (`newX > top.x`), the offcut is on the right: `overlapRight + cutW/2`. If they overshot left, it's on the left.
- `s.currentW = overlapW` shrinks the next block's width. Each imperfect drop makes future drops harder — a snowball effect.

---

### 2.2 — Falling Piece Animation

```typescript
export const FALL_SPEED = 12;       // gravity acceleration
export const FALL_ROTATE_SPEED = 3; // tumble speed (radians/sec)

// In update():
for (let i = s.fallingPieces.length - 1; i >= 0; i--) {
    const p = s.fallingPieces[i];

    p.vy -= FALL_SPEED * dt;       // accelerate downward
    p.y += p.vy * dt;              // apply velocity
    p.rotation += FALL_ROTATE_SPEED * dt;  // tumble

    if (p.y < -10) {
        s.fallingPieces.splice(i, 1);  // remove when off-screen
    }
}
```

**What's happening:**
- `p.vy -= FALL_SPEED * dt` is gravity. Starting from `vy = 0`, the piece accelerates downward.
- `p.rotation` increases linearly, creating a tumbling effect as the piece falls.
- `splice(i, 1)` removes pieces that have fallen below `y = -10` — well out of camera view. Iterating backwards prevents index shifting issues.

---

### 2.3 — Rendering Falling Pieces

```typescript
for (const p of s.fallingPieces) {
    gl.uniform1f(this.uAlpha, 0.7);  // slightly transparent
    this.drawBlock(
        p.x, p.y + BLOCK_HEIGHT / 2, p.z,
        p.w / 2, BLOCK_HEIGHT / 2, p.d / 2,
        p.r, p.g, p.b, p.rotation
    );
}

private drawBlock(x, y, z, sx, sy, sz, r, g, b, rotation) {
    Mat4.identity(this.modelMatrix);
    Mat4.translate(this.modelMatrix, this.modelMatrix, [x, y, z]);

    if (rotation !== 0) {
        Mat4.rotateX(this.modelMatrix, this.modelMatrix, rotation);
        Mat4.rotateZ(this.modelMatrix, this.modelMatrix, rotation * 0.7);
    }

    Mat4.scale(this.modelMatrix, this.modelMatrix, [sx, sy, sz]);
    gl.uniformMatrix4fv(this.uModel, false, this.modelMatrix);
    gl.uniform3f(this.uColor, r, g, b);
    this.drawMesh(this.cubeMesh);
}
```

**What's happening:**
- Falling pieces use `uAlpha = 0.7` — more transparent than the preview block, signaling they're "dead" pieces.
- `rotation` applies to both X and Z axes at different rates (`rotation * 0.7`), creating an asymmetric tumble that looks natural.
- The same `drawBlock` method handles both stacked blocks (rotation = 0) and falling pieces (rotation increases).

---

## Test It

```bash
pnpm dev
```

1. Press **Space** to drop the block — it should **slice** at the overlap point
2. The **offcut piece** should **fall away** with a tumbling rotation
3. Make an imperfect drop — notice the next block is **narrower**
4. Drop a **perfect placement** (nearly centered) — the block should keep its full width
5. **Miss completely** — the entire block should fall and the game should end
6. Press **Space** after game over to restart

---

## Challenges

**Easy:**
- Change the perfect tolerance from 0.1 to 0.3. How does a more forgiving threshold affect gameplay?

**Medium:**
- Add a visual indicator for perfect placements: briefly flash the block color to white (set `uColor` to `(1, 1, 1)` for one frame).

**Hard:**
- Instead of removing falling pieces at `y < -10`, make them bounce once when they hit `y = 0` (the ground plane): reverse `vy` with 50% damping, then remove on the second ground contact.

---

## What You Learned

- 1D interval intersection: `[max(leftA, leftB), min(rightA, rightB)]` computes overlap
- Perfect placement tolerance prevents frustrating near-misses
- Offcut center is computed from the overlap edge plus half the cut width
- Falling physics: gravity acceleration + linear rotation creates natural tumble
- Each imperfect drop shrinks the next block, creating escalating difficulty

**Next:** We'll add camera follow, rainbow colors, and complete the game.

---
[← Previous Step](./step-1.md) | [Back to README](./README.md) | [Next Step →](./step-3.md)
