# Step 2: Cursor & Place/Remove

**Goal:** Implement a keyboard-driven 3D cursor, block placement with Space, block removal with X, and a pulsing transparent cursor highlight.

**Time:** ~15 minutes

---

## What You'll Build

- **3D cursor** that moves through the grid with arrow keys and Q/E for vertical
- A **pulsing transparent highlight** at the cursor position
- **Block placement** (Space/Enter) that fills the cursor cell
- **Block removal** (X/Delete/Backspace) that clears the cursor cell
- **Block counter** tracking total placed blocks

---

## Concepts

- **Discrete cursor**: Unlike a continuous mouse position, the voxel cursor snaps to integer grid coordinates. Arrow keys move by exactly one cell. This makes placement precise and predictable.

- **Transparent rendering**: The cursor cube uses `uAlpha` with a sine-wave pulse (`0.3 + sin(time) * 0.15`). Combined with `gl.enable(gl.BLEND)`, this creates a see-through ghost block showing where the next block will go.

- **Place/remove toggle**: Pressing Space fills the cell if empty; pressing X clears it if occupied. The grid stores `null` for empty and `{ typeIdx }` for occupied — a simple presence check.

---

## Code

### 2.1 — Cursor Movement

**File:** `src/contexts/webgl/games/voxel-builder/VoxelBuilderEngine.ts`

```typescript
this.keyDownHandler = (e: KeyboardEvent) => {
    if (e.key === "Escape") { e.preventDefault(); this.onExit(); return; }

    const s = this.state;

    // Horizontal movement (arrow keys or WASD)
    if (e.code === "ArrowLeft" || e.code === "KeyA") {
        s.cursorX = Math.max(0, s.cursorX - 1);
    } else if (e.code === "ArrowRight" || e.code === "KeyD") {
        s.cursorX = Math.min(GRID_SIZE - 1, s.cursorX + 1);
    } else if (e.code === "ArrowUp" || e.code === "KeyW") {
        s.cursorZ = Math.max(0, s.cursorZ - 1);
    } else if (e.code === "ArrowDown" || e.code === "KeyS") {
        s.cursorZ = Math.min(GRID_SIZE - 1, s.cursorZ + 1);
    }

    // Vertical movement
    else if (e.code === "KeyQ") {
        s.cursorY = Math.max(0, s.cursorY - 1);
    } else if (e.code === "KeyE") {
        s.cursorY = Math.min(GRID_SIZE - 1, s.cursorY + 1);
    }

    // Place block
    if (e.code === "Space" || e.code === "Enter") {
        e.preventDefault();
        const { cursorX: cx, cursorY: cy, cursorZ: cz } = s;

        if (!s.grid[cy][cz][cx]) {
            s.grid[cy][cz][cx] = { typeIdx: s.selectedType };
            s.blockCount++;
        }
    }

    // Remove block
    if (e.code === "KeyX" || e.code === "Backspace" || e.code === "Delete") {
        const { cursorX: cx, cursorY: cy, cursorZ: cz } = s;

        if (s.grid[cy][cz][cx]) {
            s.grid[cy][cz][cx] = null;
            s.blockCount--;
        }
    }
};
```

**What's happening:**
- `Math.max(0, ...)` and `Math.min(GRID_SIZE - 1, ...)` clamp the cursor within the grid bounds.
- Arrow keys/WASD move in the XZ plane. Q/E move vertically — Q goes down, E goes up.
- **Placement**: check `!s.grid[cy][cz][cx]` (cell is empty), then write `{ typeIdx: s.selectedType }`. Increment block count.
- **Removal**: check `s.grid[cy][cz][cx]` (cell is occupied), then write `null`. Decrement block count.
- Multiple removal keys (X, Backspace, Delete) give ergonomic flexibility.

---

### 2.2 — Pulsing Transparent Cursor

```typescript
// In render(), after drawing all voxels:
const cx = s.cursorX * VOXEL_SIZE + VOXEL_SIZE / 2;
const cy = s.cursorY * VOXEL_SIZE + VOXEL_SIZE / 2;
const cz = s.cursorZ * VOXEL_SIZE + VOXEL_SIZE / 2;
const pulse = 0.3 + Math.sin(performance.now() * 0.004) * 0.15;
const selColor = BLOCK_TYPES[s.selectedType].color;

gl.uniform1f(this.uAlpha, pulse);
gl.uniform1f(this.uEmissive, 0.8);

Mat4.identity(this.modelMatrix);
Mat4.translate(this.modelMatrix, this.modelMatrix, [cx, cy, cz]);
Mat4.scale(this.modelMatrix, this.modelMatrix, [
    VOXEL_SIZE / 2, VOXEL_SIZE / 2, VOXEL_SIZE / 2,
]);
gl.uniformMatrix4fv(this.uModel, false, this.modelMatrix);
gl.uniform3f(this.uColor, selColor[0], selColor[1], selColor[2]);
this.drawMesh(this.cubeMesh);

gl.uniform1f(this.uAlpha, 1.0);
gl.uniform1f(this.uEmissive, 0.0);
```

**What's happening:**
- `pulse = 0.3 + sin(time * 0.004) * 0.15` oscillates alpha between 0.15 and 0.45 — a subtle breathing effect.
- `uEmissive = 0.8` means the cursor is mostly unlit (flat color), making it visible regardless of lighting angle.
- The cursor color matches `BLOCK_TYPES[s.selectedType].color`, previewing what block will be placed.
- After drawing the cursor, `uAlpha` and `uEmissive` are reset to 1.0 and 0.0 so subsequent draws are opaque and lit.
- The cursor is drawn at full `VOXEL_SIZE/2` scale (no `0.98` shrink), so it slightly overlaps block boundaries — visually distinguishing it from placed blocks.

---

### 2.3 — Clear All Blocks

```typescript
// In keydown handler:
if (e.code === "KeyC" && e.ctrlKey) {
    for (let y = 0; y < GRID_SIZE; y++) {
        for (let z = 0; z < GRID_SIZE; z++) {
            for (let x = 0; x < GRID_SIZE; x++) {
                s.grid[y][z][x] = null;
            }
        }
    }
    s.blockCount = 0;
}
```

**What's happening:**
- Ctrl+C clears the entire grid — triple loop setting everything to null.
- `blockCount` resets to 0.
- This gives a quick way to start over without reloading the game.

---

## Test It

```bash
pnpm dev
```

1. Select "Voxel Builder" from the 3D category
2. You should see a **pulsing transparent cube** at the grid center
3. Press **arrow keys** to move the cursor around the XZ plane
4. Press **E** to raise the cursor, **Q** to lower it
5. Press **Space** to place a block — it should appear solid at the cursor position
6. Move the cursor and place more blocks to build a structure
7. Press **X** on an occupied cell to remove the block
8. Press **Ctrl+C** to clear everything
9. **Orbit** the camera to inspect your build from all angles

---

## Challenges

**Easy:**
- Place a 3x3 floor of blocks manually. How does the 0.98 scale gap look between adjacent blocks?

**Medium:**
- Add auto-stacking: when placing on an occupied cell, move the cursor up one cell and place there instead (like stacking blocks).

**Hard:**
- Implement click-to-place using ray casting: shoot a ray from the mouse into the scene, find the first occupied voxel face it hits, and place a block on the adjacent empty cell.

---

## What You Learned

- Discrete cursor movement snaps to integer grid coordinates with `Math.max/min` clamping
- Block placement checks for empty cells, removal checks for occupied cells
- A pulsing alpha cursor (`sin(time)`) provides clear visual feedback for the current position
- `uEmissive` makes the cursor visible regardless of lighting
- The cursor color previews the selected block type before placement

**Next:** We'll add 8 block types, a visual palette, and occlusion culling for buried blocks.

---
[← Previous Step](./step-1.md) | [Back to README](./README.md) | [Next Step →](./step-3.md)
