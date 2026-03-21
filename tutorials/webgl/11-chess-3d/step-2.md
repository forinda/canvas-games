# Step 2: Piece Models from Primitives

**Goal:** Build recognizable chess piece silhouettes from cubes and spheres — each piece type has a unique top decoration that identifies it.

**Time:** ~15 minutes

---

## What You'll Build

- **6 piece types** — pawn, rook, knight, bishop, queen, king — each with a distinctive silhouette
- **Base + body + top** construction: every piece has a wide base, a body column, and a unique top
- **Color differentiation** — white pieces are cream, black pieces are near-black
- **Standard initial placement** on the board

---

## Concepts

- **Piece from primitives**: Each piece is 3+ draw calls: a flat base (wide short cube), a body (tall narrow cube), and a top decoration unique to the piece type. The king gets a cross, the queen gets a glowing crown jewel, the rook gets battlements, etc.

- **Piece height table**: `PIECE_HEIGHTS` maps each piece type to a body height. Pawns are shortest (0.5), kings are tallest (0.9). This creates a natural height progression on the board.

- **Switch-based rendering**: A `switch(type)` in `renderPiece` draws the unique top for each piece. This keeps the rendering logic clean and extensible.

---

## Code

### 2.1 — Piece Heights and Initial Board

**File:** `src/contexts/webgl/games/chess-3d/types.ts`

```typescript
export const PIECE_HEIGHTS: Record<PieceType, number> = {
    pawn: 0.5,
    rook: 0.6,
    knight: 0.65,
    bishop: 0.7,
    queen: 0.85,
    king: 0.9,
};

export function createInitialBoard(): Cell[][] {
    const board: Cell[][] = Array.from({ length: 8 }, () =>
        Array.from({ length: 8 }, () => null),
    );

    const backRow: PieceType[] = [
        "rook", "knight", "bishop", "queen", "king", "bishop", "knight", "rook",
    ];

    for (let c = 0; c < 8; c++) {
        board[0][c] = { type: backRow[c], color: "black" };
        board[1][c] = { type: "pawn", color: "black" };
        board[6][c] = { type: "pawn", color: "white" };
        board[7][c] = { type: backRow[c], color: "white" };
    }

    return board;
}
```

**What's happening:**
- Heights increase from pawn (0.5) to king (0.9) — taller pieces are more important, matching real chess set conventions.
- `board[0]` is black's back row, `board[7]` is white's back row. Pawns are on rows 1 and 6.
- The `backRow` array defines the standard chess piece order: rook, knight, bishop, queen (d-file), king (e-file).

---

### 2.2 — Piece Rendering with Unique Tops

**File:** `src/contexts/webgl/games/chess-3d/Chess3DEngine.ts`

```typescript
private renderPiece(type: PieceType, color: string, x: number, z: number): void {
    const isWhite = color === "white";
    const r = isWhite ? 0.9 : 0.15;
    const g = isWhite ? 0.88 : 0.12;
    const b = isWhite ? 0.82 : 0.1;
    const h = PIECE_HEIGHTS[type];

    // Base (wide, flat)
    this.drawBox(x, BOARD_Y + 0.08, z, 0.25, 0.08, 0.25, r * 0.8, g * 0.8, b * 0.8);

    // Body (narrower, tall)
    const bodyW = type === "pawn" ? 0.15 : type === "knight" ? 0.18 : 0.2;
    this.drawBox(x, BOARD_Y + h / 2 + 0.08, z, bodyW, h / 2, bodyW, r, g, b);

    // Top — unique per piece type
    const topY = BOARD_Y + h + 0.08;

    switch (type) {
        case "pawn":
            // Small sphere on top
            this.drawSphere(x, topY + 0.1, z, 0.12, r, g, b);
            break;

        case "rook":
            // Battlements (flat top with corner posts)
            this.drawBox(x, topY + 0.06, z, 0.22, 0.06, 0.22, r, g, b);
            this.drawBox(x - 0.14, topY + 0.14, z, 0.05, 0.05, 0.05, r, g, b);
            this.drawBox(x + 0.14, topY + 0.14, z, 0.05, 0.05, 0.05, r, g, b);
            this.drawBox(x, topY + 0.14, z - 0.14, 0.05, 0.05, 0.05, r, g, b);
            this.drawBox(x, topY + 0.14, z + 0.14, 0.05, 0.05, 0.05, r, g, b);
            break;

        case "knight":
            // Angled head with nose sphere
            this.drawBox(x + 0.08, topY + 0.12, z, 0.15, 0.12, 0.12, r, g, b);
            this.drawSphere(x + 0.18, topY + 0.18, z, 0.08, r * 0.9, g * 0.9, b * 0.9);
            break;

        case "bishop":
            // Pointed top (two spheres stacked)
            this.drawSphere(x, topY + 0.08, z, 0.15, r, g, b);
            this.drawSphere(x, topY + 0.22, z, 0.06, r, g, b);
            break;

        case "queen":
            // Crown sphere with glowing jewel
            this.drawSphere(x, topY + 0.1, z, 0.18, r, g, b);
            gl.uniform1f(this.uEmissive, 0.4);
            this.drawSphere(x, topY + 0.26, z, 0.08, 0.9, 0.2, 0.2);
            gl.uniform1f(this.uEmissive, 0.0);
            break;

        case "king":
            // Cross on top
            this.drawSphere(x, topY + 0.1, z, 0.18, r, g, b);
            this.drawBox(x, topY + 0.28, z, 0.04, 0.12, 0.04, r, g, b);
            this.drawBox(x, topY + 0.32, z, 0.1, 0.04, 0.04, r, g, b);
            break;
    }
}
```

**What's happening:**
- **Base**: every piece has a wide flat cube (`0.25 x 0.08 x 0.25`) at board level. Darker than the body (`* 0.8`).
- **Body**: a taller, narrower cube. Width varies: pawns are thinnest (0.15), others are 0.18-0.20.
- **Pawn**: simple sphere on top — the minimalist piece.
- **Rook**: flat platform with 4 corner posts — the classic battlement silhouette.
- **Knight**: an offset cube head with a small nose sphere — suggests the horse shape.
- **Bishop**: two stacked spheres tapering upward — the pointed mitre.
- **Queen**: large sphere with a glowing red jewel (`uEmissive = 0.4`) — the most ornate piece.
- **King**: sphere base with a cross (vertical + horizontal cubes) — immediately recognizable.

---

### 2.3 — Rendering All Pieces

```typescript
// In render(), after drawing the board:
for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
        const piece = s.board[r][c];
        if (!piece) continue;

        const cx = c * CELL_SIZE + CELL_SIZE / 2;
        const cz = r * CELL_SIZE + CELL_SIZE / 2;

        this.renderPiece(piece.type, piece.color, cx, cz);
    }
}
```

**What's happening:**
- Iterate all 64 board cells. Skip empty ones (`null`).
- Convert `(row, col)` to world `(x, z)` using the cell size mapping.
- `renderPiece` handles the entire piece — base, body, and top decoration.
- Each piece requires 3-7 draw calls depending on type. For 32 starting pieces, that's about 100-150 draw calls — well within WebGL's comfort zone.

---

## Test It

```bash
pnpm dev
```

1. Select "Chess 3D" from the 3D category
2. You should see a **full chess board** with all 32 pieces in starting positions
3. **White pieces** (cream) face one side, **black pieces** (dark) face the other
4. **Orbit** the camera to see pieces from different angles
5. Each piece type should be **recognizable** by its silhouette:
   - Pawns: small with a sphere on top
   - Rooks: flat-topped with corner posts
   - Knights: offset head
   - Bishops: pointed two-sphere top
   - Queens: sphere with a red glowing jewel
   - Kings: cross on top
6. No interaction yet — clicking and moves come in steps 3 and 4

---

## Challenges

**Easy:**
- Change the queen's jewel color from red `[0.9, 0.2, 0.2]` to blue or green.

**Medium:**
- Make the knight's head tilt: apply a small `rotateZ` before drawing its head cubes to create an angled appearance.

**Hard:**
- Add piece shadows: for each piece, draw a flat dark circle (scaled sphere) on the board surface below the piece with `uAlpha = 0.3`.

---

## What You Learned

- Chess pieces can be built from cubes and spheres with 3-7 draw calls each
- A base + body + unique top pattern creates recognizable silhouettes for all 6 piece types
- `drawSphere` and `drawBox` helpers make piece composition straightforward
- `uEmissive` creates a glowing jewel effect on the queen
- Heights increase from pawn to king, matching real chess set conventions

**Next:** We'll implement move generation, legal move filtering, and cell highlighting.

---
[← Previous Step](./step-1.md) | [Back to README](./README.md) | [Next Step →](./step-3.md)
