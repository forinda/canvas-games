# Step 3: FPS Camera & Collision

**Goal:** Add a first-person camera with pointer lock for mouse look, WASD movement, and wall collision detection that prevents walking through walls.

**Time:** ~15 minutes

---

## What You'll Build

- **FPS camera** — pointer lock for mouse look, WASD for movement
- **Camera at eye height** — locked to `PLAYER_HEIGHT = 1.6` (no jumping or crouching)
- **Wall collision** — checks nearby cell walls and pushes the player out
- **Grid position tracking** — maps camera world position back to grid coordinates

---

## Concepts

- **Pointer Lock**: `canvas.requestPointerLock()` hides the cursor and delivers raw mouse deltas via `mousemove.movementX/Y`. This gives infinite rotation without the cursor hitting screen edges. Click the canvas to lock; ESC unlocks.

- **FPS Camera Math**: The camera tracks a yaw (horizontal angle) and pitch (vertical angle). `movementX` changes yaw, `movementY` changes pitch. The forward vector is `(sin(yaw), 0, cos(yaw))` — always horizontal. The view matrix is built from position + forward direction.

- **Collision as Push-Back**: After moving the camera, check if it overlaps any walls. If it does, push it out by the minimum penetration distance. This is simpler than predicting collisions before movement — and works well at game speeds.

- **Local Neighborhood Check**: Instead of testing every wall in the maze, only check the cell the player is in and its 8 neighbors. A 3x3 area is enough because the player moves slowly relative to cell size.

---

## Code

### 3.1 — FPS Camera Setup

The shared `FPSCamera` class handles pointer lock, mouse look, and WASD:

```typescript
import { FPSCamera } from "@webgl/shared";

// In constructor — camera at player start cell center
this.camera = new FPSCamera(canvas, {
    position: [
        this.state.playerCol * CELL_SIZE + CELL_SIZE / 2,
        PLAYER_HEIGHT,
        this.state.playerRow * CELL_SIZE + CELL_SIZE / 2,
    ],
    moveSpeed: 4,
    lookSensitivity: 0.002,
});

// In render():
const viewMatrix = this.camera.getViewMatrix();
const camPos = this.camera.getPosition();
```

**What's happening:**
- `position` is set to the center of cell `(0, 0)`: `(CELL_SIZE/2, PLAYER_HEIGHT, CELL_SIZE/2)`.
- `moveSpeed: 4` means 4 units per second. At `CELL_SIZE = 3`, that's about 1.3 cells per second — a comfortable walking speed.
- `lookSensitivity: 0.002` means 2 radians of rotation per 1000 pixels of mouse movement. This feels natural on most mice.
- The camera internally handles pointer lock requests on canvas click and `mousemove` events for look rotation.

---

### 3.2 — Update Loop with Camera Movement

```typescript
private update(dt: number): void {
    if (this.state.phase !== "playing") return;

    this.state.timer += dt;

    const pos = this.camera.getPosition();

    // Move camera (applies WASD input)
    this.camera.update(dt);

    // Collision: push camera out of walls
    this.resolveCollisions(pos);

    // Keep camera at player height
    pos[1] = PLAYER_HEIGHT;

    // Update player grid position
    this.state.playerCol = Math.floor(pos[0] / CELL_SIZE);
    this.state.playerRow = Math.floor(pos[2] / CELL_SIZE);

    // Clamp to grid bounds
    this.state.playerCol = Math.max(0, Math.min(this.state.cols - 1, this.state.playerCol));
    this.state.playerRow = Math.max(0, Math.min(this.state.rows - 1, this.state.playerRow));
}
```

**What's happening:**
- `camera.update(dt)` applies WASD velocity to the camera position. The camera moves in the direction it's facing (forward/backward) or strafes (left/right).
- `pos[1] = PLAYER_HEIGHT` forces Y to eye level every frame. The camera can never float up or sink down.
- `Math.floor(pos[0] / CELL_SIZE)` converts world X to grid column. This gives the player's current cell for win detection.
- The order matters: move first, then resolve collisions, then update grid position. This ensures the grid position reflects the corrected (post-collision) position.

---

### 3.3 — Wall Collision Resolution

```typescript
private resolveCollisions(pos: Float32Array): void {
    const { grid, rows, cols } = this.state;
    const r = PLAYER_RADIUS;

    const col = Math.floor(pos[0] / CELL_SIZE);
    const row = Math.floor(pos[2] / CELL_SIZE);

    // Check 3x3 neighborhood
    for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
            const cr = row + dr;
            const cc = col + dc;

            // World bounds
            if (cr < 0 || cr >= rows || cc < 0 || cc >= cols) {
                if (pos[0] < r) pos[0] = r;
                if (pos[2] < r) pos[2] = r;
                if (pos[0] > cols * CELL_SIZE - r) pos[0] = cols * CELL_SIZE - r;
                if (pos[2] > rows * CELL_SIZE - r) pos[2] = rows * CELL_SIZE - r;
                continue;
            }

            const cell = grid[cr][cc];
            const cx = cc * CELL_SIZE;
            const cz = cr * CELL_SIZE;

            // North wall (z = cz)
            if (cell.walls.north && pos[2] < cz + r && pos[2] > cz - r) {
                if (pos[0] > cx && pos[0] < cx + CELL_SIZE) {
                    pos[2] = cz + r;
                }
            }

            // South wall (z = cz + CELL_SIZE)
            if (cell.walls.south &&
                pos[2] > cz + CELL_SIZE - r && pos[2] < cz + CELL_SIZE + r) {
                if (pos[0] > cx && pos[0] < cx + CELL_SIZE) {
                    pos[2] = cz + CELL_SIZE - r;
                }
            }

            // West wall (x = cx)
            if (cell.walls.west && pos[0] < cx + r && pos[0] > cx - r) {
                if (pos[2] > cz && pos[2] < cz + CELL_SIZE) {
                    pos[0] = cx + r;
                }
            }

            // East wall (x = cx + CELL_SIZE)
            if (cell.walls.east &&
                pos[0] > cx + CELL_SIZE - r && pos[0] < cx + CELL_SIZE + r) {
                if (pos[2] > cz && pos[2] < cz + CELL_SIZE) {
                    pos[0] = cx + CELL_SIZE - r;
                }
            }
        }
    }
}
```

**What's happening:**
- **3x3 neighborhood**: Only cells adjacent to the player need checking. At `CELL_SIZE = 3` and `moveSpeed = 4`, the player moves at most `4 * 0.05 = 0.2` units per frame — far less than one cell.
- **Wall as infinite plane**: Each wall is treated as a line at the cell boundary. If the player center is within `PLAYER_RADIUS` of that line AND within the cell's extent on the perpendicular axis, push the player out.
- **Push direction**: For a north wall at `z = cz`, the player is pushed to `pos[2] = cz + r` (south side of the wall). This is always the "inside" direction.
- **World bounds**: If the check goes outside the grid, clamp the player to the maze boundaries. This handles the outer walls without needing explicit wall data for them.
- Directly modifying `pos` (which is a `Float32Array` reference from the camera) immediately corrects the camera position.

---

## Test It

```bash
pnpm dev
```

1. **Click the canvas** to lock the mouse pointer
2. **Move the mouse** to look around — you should see corridors in first-person
3. **WASD** to walk forward/back/strafe
4. Walk into a wall — you should **slide along** it, not pass through
5. The **green pillar** should be visible through fog in the distance
6. Press **ESC** to unlock the pointer and exit

---

## Challenges

**Easy:**
- Change `moveSpeed` from 4 to 8. How does fast movement feel with the current collision system?

**Medium:**
- Add a sprint mechanic: when Shift is held, double the move speed. You may notice collision "tunneling" at high speeds — the player can pass through thin walls.

**Hard:**
- Fix the tunneling issue: before checking collisions, subdivide the movement into smaller steps (e.g., `while (remainingDist > PLAYER_RADIUS) { move(PLAYER_RADIUS); resolveCollisions(); }`). This is called "continuous collision detection."

---

## What You Learned

- Pointer lock enables infinite mouse rotation for FPS-style look
- FPS camera forward vector: `(sin(yaw), 0, cos(yaw))` — always horizontal
- Post-movement push-back collision is simpler than predictive collision
- Checking a 3x3 cell neighborhood is efficient — no need to test every wall in the maze
- Direct modification of the camera's position array enables immediate collision correction

**Next:** We'll tune the fog, add level progression, and wire up the game registration.

---
[← Previous Step](./step-2.md) | [Back to README](./README.md) | [Next Step →](./step-4.md)
