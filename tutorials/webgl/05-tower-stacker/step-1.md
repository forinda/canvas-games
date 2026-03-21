# Step 1: Swinging Block & Timing

**Goal:** Set up alpha-capable shaders, render a base block, and animate a swinging block that the player can drop with Space.

**Time:** ~15 minutes

---

## What You'll Build

- **Alpha-capable fragment shader** — `uAlpha` uniform for semi-transparent blocks
- **Base block** — the foundation of the tower
- **Swinging block** — oscillates back and forth on alternating axes
- **Space to drop** — timing mechanic, the core gameplay loop

---

## Concepts

- **Alpha Blending**: The swinging block is drawn at 85% opacity (`uAlpha = 0.85`) to signal "not yet placed." This requires enabling `gl.BLEND` with `SRC_ALPHA, ONE_MINUS_SRC_ALPHA`. Opaque blocks use `uAlpha = 1.0`.

- **Alternating Swing Axis**: The block alternates between swinging on X and Z axes. After each drop, `swingOnX = !swingOnX`. This creates the signature "cross-stacking" pattern where each block approaches from a perpendicular direction.

- **Swing Oscillation**: `swingPos += swingSpeed * dt`. When it hits `±SWING_RANGE`, the speed reverses: `swingSpeed = -Math.abs(swingSpeed)`. This creates a simple back-and-forth motion without needing `sin()`.

---

## Code

### 1.1 — Alpha Fragment Shader

**File:** `src/contexts/webgl/games/tower-stacker/shaders.ts`

```glsl
uniform float uAlpha;

void main() {
    // ... Blinn-Phong lighting ...
    vec3 color = uColor * (ambient + diffuse * 0.7) + vec3(1.0) * spec * 0.2;
    fragColor = vec4(color, uAlpha);
}
```

In the engine constructor, enable blending:

```typescript
gl.enable(gl.BLEND);
gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
```

**What's happening:**
- `fragColor.a = uAlpha` sets the fragment's transparency.
- `gl.blendFunc(SRC_ALPHA, ONE_MINUS_SRC_ALPHA)` means: `final = src_color * src_alpha + dst_color * (1 - src_alpha)`. At alpha 0.85, the new block contributes 85% and the background 15%.
- Blending is enabled globally but most objects use `uAlpha = 1.0` (fully opaque). Only the swinging preview block uses 0.85.

---

### 1.2 — Game State and Constants

**File:** `src/contexts/webgl/games/tower-stacker/types.ts`

```typescript
export const BLOCK_HEIGHT = 0.4;
export const START_SIZE = 3.0;
export const SWING_SPEED_INIT = 3.0;
export const SWING_SPEED_INC = 0.15;
export const SWING_SPEED_MAX = 10;
export const SWING_RANGE = 4.0;

export interface Block {
    x: number; z: number;
    w: number; d: number;
    y: number;
    r: number; g: number; b: number;
}

export interface StackerState {
    stack: Block[];
    fallingPieces: FallingPiece[];
    currentX: number; currentZ: number;
    currentW: number; currentD: number;
    swingOnX: boolean;
    swingPos: number;
    swingSpeed: number;
    score: number;
    phase: "playing" | "dropping" | "gameover";
    perfectStreak: number;
}
```

**What's happening:**
- `BLOCK_HEIGHT = 0.4` makes thin blocks, so the tower grows visibly even after many stacks.
- `START_SIZE = 3.0` — the initial block width/depth. This shrinks as the player makes imperfect drops.
- `SWING_RANGE = 4.0` is larger than `START_SIZE`, meaning the block swings well beyond the tower. Timing must be precise.
- `swingOnX` toggles each drop. When `true`, `swingPos` controls the X position; when `false`, the Z position.

---

### 1.3 — Swing Animation

```typescript
private update(dt: number): void {
    const s = this.state;

    if (s.phase === "playing") {
        s.swingPos += s.swingSpeed * dt;

        if (s.swingPos > SWING_RANGE) {
            s.swingPos = SWING_RANGE;
            s.swingSpeed = -Math.abs(s.swingSpeed);
        } else if (s.swingPos < -SWING_RANGE) {
            s.swingPos = -SWING_RANGE;
            s.swingSpeed = Math.abs(s.swingSpeed);
        }
    }
}
```

**What's happening:**
- Linear oscillation: position increases by `speed * dt`, bouncing at `±SWING_RANGE`.
- At `SWING_SPEED_INIT = 3.0`, one full sweep takes `2 * SWING_RANGE / speed = 8/3 ≈ 2.7` seconds. Comfortable for early levels.
- Speed increases by `SWING_SPEED_INC = 0.15` per drop, capping at `SWING_SPEED_MAX = 10`. After ~47 drops, the block swings at maximum speed — a full sweep in 0.8 seconds.

---

### 1.4 — Rendering Stacked and Swinging Blocks

```typescript
private render(): void {
    // ... clear, setup uniforms ...
    gl.uniform1f(this.uAlpha, 1.0);

    // Draw all stacked blocks (opaque)
    for (const block of s.stack) {
        this.drawBlock(
            block.x, block.y + BLOCK_HEIGHT / 2, block.z,
            block.w / 2, BLOCK_HEIGHT / 2, block.d / 2,
            block.r, block.g, block.b, 0
        );
    }

    // Draw the current swinging block (semi-transparent)
    if (s.phase === "playing") {
        const newY = s.stack.length * BLOCK_HEIGHT;
        const color = this.levelColor(s.stack.length);
        const sx = s.swingOnX ? s.swingPos : s.currentX;
        const sz = s.swingOnX ? s.currentZ : s.swingPos;

        gl.uniform1f(this.uAlpha, 0.85);
        this.drawBlock(
            sx, newY + BLOCK_HEIGHT / 2, sz,
            s.currentW / 2, BLOCK_HEIGHT / 2, s.currentD / 2,
            color.r, color.g, color.b, 0
        );
        gl.uniform1f(this.uAlpha, 1.0);
    }
}
```

**What's happening:**
- Stacked blocks use `uAlpha = 1.0` — fully opaque. They're locked in place.
- The swinging block uses `uAlpha = 0.85` — slightly transparent to distinguish it from placed blocks.
- `newY = s.stack.length * BLOCK_HEIGHT` places the swinging block at the correct height above the tower.
- `s.swingOnX ? s.swingPos : s.currentX` — when swinging on X, the X position oscillates while Z stays at the previous stack center.

---

## Test It

```bash
pnpm dev
```

1. A **dark base block** should be visible at the bottom
2. A **semi-transparent block** should swing back and forth above it
3. Press **Space** — the block should drop (overlap logic is in Step 2; for now it may just stack directly)
4. The next block should swing on the **perpendicular axis**
5. Swing speed should increase slightly with each drop

---

## Challenges

**Easy:**
- Change `SWING_RANGE` from 4.0 to 2.0. How does a shorter swing affect difficulty?

**Medium:**
- Change `uAlpha` for the swinging block from 0.85 to 0.5. Notice how much harder it is to judge position with a more transparent block.

**Hard:**
- Add a second visual cue: draw a thin line (very flat cube) on the tower top showing where the swinging block's center currently is. This acts as a "crosshair."

---

## What You Learned

- `gl.BLEND` with `SRC_ALPHA, ONE_MINUS_SRC_ALPHA` enables transparency
- `uAlpha` controls per-object opacity without changing the shader program
- Linear oscillation with speed reversal at bounds creates smooth back-and-forth
- Alternating `swingOnX` creates the cross-stacking pattern
- Swing speed increment per drop creates progressive difficulty

**Next:** We'll compute overlap, slice overhangs, and animate falling offcut pieces.

---
[Back to README](./README.md) | [Next Step →](./step-2.md)
