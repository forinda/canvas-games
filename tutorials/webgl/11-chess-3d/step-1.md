# Step 1: Board Rendering

**Goal:** Render an 8x8 chessboard with alternating light/dark cells, a border frame, and an orbital camera centered on the board.

**Time:** ~15 minutes

---

## What You'll Build

- An **8x8 chessboard** with alternating cream and brown cells
- A **dark border** framing the board
- An **orbital camera** targeted at the board center
- **Alpha blending** support for later highlights

---

## Concepts

- **Cell coordinate mapping**: Each cell is `CELL_SIZE` (1.2) units. Cell at `(row, col)` has its center at world position `(col * CELL_SIZE + CELL_SIZE/2, BOARD_Y, row * CELL_SIZE + CELL_SIZE/2)`. Rows map to Z, columns to X.

- **Alternating colors**: `(row + col) % 2 === 0` gives light cells, odd gives dark cells. This classic checkerboard pattern is computed per-cell in the render loop.

- **Board-centric orbital camera**: The camera orbits around `[boardCenter, 0, boardCenter]` with a default elevation of 0.8 radians — high enough to see the board at an angle but not directly overhead.

---

## Code

### 1.1 — Board Constants

**File:** `src/contexts/webgl/games/chess-3d/types.ts`

```typescript
export const BOARD_SIZE = 8;
export const CELL_SIZE = 1.2;
export const BOARD_Y = 0;
```

**What's happening:**
- `BOARD_SIZE = 8` — standard chess board.
- `CELL_SIZE = 1.2` units per cell. The total board span is `8 * 1.2 = 9.6` units.
- `BOARD_Y = 0` — the board sits at the Y origin. Pieces will be placed above this.

---

### 1.2 — Camera Setup

**File:** `src/contexts/webgl/games/chess-3d/Chess3DEngine.ts`

```typescript
const boardCenter = (BOARD_SIZE * CELL_SIZE) / 2;

this.camera = new OrbitalCamera(canvas, {
    distance: 12,
    elevation: 0.8,
    azimuth: 0,
    target: [boardCenter, 0, boardCenter],
    minDistance: 6,
    maxDistance: 20,
});
```

**What's happening:**
- `boardCenter = 4.8` — the midpoint of the 9.6-unit board.
- `distance: 12` — far enough to see the whole board.
- `elevation: 0.8` radians (~46 degrees) — a natural viewing angle for a board game.
- `azimuth: 0` — starts looking from the white side. Dragging rotates around the board.

---

### 1.3 — Board Cell Rendering

```typescript
for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
        const cx = c * CELL_SIZE + CELL_SIZE / 2;
        const cz = r * CELL_SIZE + CELL_SIZE / 2;
        const isLight = (r + c) % 2 === 0;

        let cr = isLight ? 0.82 : 0.35;
        let cg = isLight ? 0.72 : 0.25;
        let cb = isLight ? 0.55 : 0.2;

        this.drawBox(
            cx, BOARD_Y - 0.05, cz,
            CELL_SIZE / 2 * 0.98, 0.05, CELL_SIZE / 2 * 0.98,
            cr, cg, cb,
        );
    }
}

// Board border
const boardExtent = BOARD_SIZE * CELL_SIZE;
const mid = boardExtent / 2;
this.drawBox(mid, BOARD_Y - 0.15, mid, mid + 0.15, 0.1, mid + 0.15, 0.2, 0.15, 0.1);
```

**What's happening:**
- 64 cells rendered as flat boxes (`sy = 0.05`), each at `y = BOARD_Y - 0.05` so the top surface is at `y = 0`.
- Light cells are warm cream `[0.82, 0.72, 0.55]`, dark cells are rich brown `[0.35, 0.25, 0.2]`.
- `0.98` scale leaves a tiny gap between cells, making the grid visible.
- The border is a larger, darker box (`sy = 0.1`) sitting 0.1 units below the cells, extending 0.15 units past the board edge on all sides.

---

## Test It

```bash
pnpm dev
```

1. Select "Chess 3D" from the 3D category
2. You should see an **8x8 chessboard** with alternating cream and brown cells
3. A **dark border** frames the board
4. **Drag** to orbit the camera around the board
5. **Scroll** to zoom in and out
6. No pieces yet — those come in step 2

---

## Challenges

**Easy:**
- Change the cell colors to green/cream (tournament chess style) instead of cream/brown.

**Medium:**
- Add coordinate labels: render small colored cubes at the edge of each row (1-8) and column (a-h) to mark positions.

**Hard:**
- Add a reflection plane below the board: render the board cells a second time at `y = BOARD_Y - 0.3` with `uAlpha = 0.2` and flipped normals for a glossy table effect.

---

## What You Learned

- Chessboard cells are positioned at `(col * CELL_SIZE + CELL_SIZE/2, BOARD_Y, row * CELL_SIZE + CELL_SIZE/2)`
- Alternating colors use `(row + col) % 2` — the classic checkerboard formula
- A board border is a single larger box sitting slightly below the cells
- The orbital camera targets the board center for easy inspection from any angle

**Next:** We'll build recognizable chess pieces from cube and sphere primitives.

---
[Back to README](./README.md) | [Next Step →](./step-2.md)
