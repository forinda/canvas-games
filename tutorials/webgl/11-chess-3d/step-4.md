# Step 4: Ray Picking & AI

**Goal:** Implement click-to-cell mapping via ray-plane intersection, wire up piece selection and movement, add a simple AI opponent, and detect checkmate/stalemate.

**Time:** ~15 minutes

---

## What You'll Build

- **Ray-plane intersection** converting screen clicks to board cells
- **Click handler** for selecting pieces and moving to legal targets
- **Simple AI** (black) that prefers captures and makes random legal moves
- **Checkmate and stalemate detection** with game-over state
- **Auto pawn promotion** to queen

---

## Concepts

- **Ray-plane intersection**: To convert a 2D screen click into a 3D board cell: (1) convert pixel to NDC, (2) unproject through the inverse VP matrix to get a ray, (3) intersect the ray with the board plane at `y = BOARD_Y`, (4) divide the hit point by `CELL_SIZE` to get row/col.

- **Inverse VP matrix**: The View-Projection matrix transforms 3D world coordinates to 2D screen coordinates. Its inverse does the reverse — it converts screen coordinates (in NDC) back to 3D rays. We compute two points: one at near plane (`z = -1`) and one at far plane (`z = 1`), then form a ray.

- **Capture-preferring AI**: The AI collects all legal moves, separates captures from non-captures, and randomly picks from captures if any exist. This makes the AI somewhat aggressive without any complex evaluation.

---

## Code

### 4.1 — Screen-to-Cell Ray Casting

**File:** `src/contexts/webgl/games/chess-3d/Chess3DEngine.ts`

```typescript
private screenToCell(screenX: number, screenY: number): Position | null {
    const { canvas } = this;
    // Convert to NDC [-1, 1]
    const rect = canvas.getBoundingClientRect();
    const ndcX = ((screenX - rect.left) / rect.width) * 2 - 1;
    const ndcY = -(((screenY - rect.top) / rect.height) * 2 - 1);

    // Build VP matrix and invert
    const aspect = canvas.width / canvas.height;
    const vp = Mat4.create();
    Mat4.perspective(vp, Math.PI / 4, aspect, 0.1, 200);
    Mat4.multiply(vp, vp, this.camera.getViewMatrix());

    const invVP = Mat4.create();
    Mat4.invert(invVP, vp);

    // Unproject near and far points to get a ray
    const nearW = this.transformPoint(invVP, ndcX, ndcY, -1);
    const farW = this.transformPoint(invVP, ndcX, ndcY, 1);

    const dirX = farW[0] - nearW[0];
    const dirY = farW[1] - nearW[1];
    const dirZ = farW[2] - nearW[2];

    // Intersect with board plane at Y = BOARD_Y + 0.1
    const planeY = BOARD_Y + 0.1;
    if (Math.abs(dirY) < 0.0001) return null;

    const t = (planeY - nearW[1]) / dirY;
    if (t < 0) return null;

    const hitX = nearW[0] + dirX * t;
    const hitZ = nearW[2] + dirZ * t;

    const col = Math.floor(hitX / CELL_SIZE);
    const row = Math.floor(hitZ / CELL_SIZE);

    if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) return null;

    return { row, col };
}

private transformPoint(mat: Float32Array, x: number, y: number, z: number): [number, number, number] {
    const w = mat[3] * x + mat[7] * y + mat[11] * z + mat[15];
    return [
        (mat[0] * x + mat[4] * y + mat[8] * z + mat[12]) / w,
        (mat[1] * x + mat[5] * y + mat[9] * z + mat[13]) / w,
        (mat[2] * x + mat[6] * y + mat[10] * z + mat[14]) / w,
    ];
}
```

**What's happening:**
- **NDC conversion**: screen pixel `(screenX, screenY)` becomes `ndcX = (x/width)*2 - 1` and `ndcY = -(y/height)*2 + 1`. The Y flip is because screen Y goes down but NDC Y goes up.
- **Inverse VP**: `Mat4.invert(invVP, vp)` computes the matrix that reverses the projection and view transforms.
- **Ray construction**: `transformPoint(invVP, ndcX, ndcY, -1)` gives the world-space point at the near plane; `z = 1` gives the far plane. The difference is the ray direction.
- **Plane intersection**: parametric ray `P = near + t * dir` intersects `y = planeY` when `t = (planeY - nearY) / dirY`. If `t < 0`, the plane is behind the camera.
- **Cell lookup**: `Math.floor(hitX / CELL_SIZE)` converts the world hit point to a grid cell.

---

### 4.2 — Click Handler

```typescript
this.clickHandler = (e: MouseEvent) => {
    if (this.state.gameOver || this.state.currentPlayer === "black") return;

    const cell = this.screenToCell(e.clientX, e.clientY);
    if (!cell) return;

    this.handleCellClick(cell);
};

private handleCellClick(pos: Position): void {
    const s = this.state;
    const piece = s.board[pos.row][pos.col];

    // If a piece is selected and this is a legal move target
    if (s.selectedPos) {
        const isLegal = s.legalMoves.some(
            (m) => m.row === pos.row && m.col === pos.col,
        );

        if (isLegal) {
            this.makeMove(s.selectedPos, pos);
            s.selectedPos = null;
            s.legalMoves = [];
            return;
        }
    }

    // Select a piece (only own pieces)
    if (piece && piece.color === s.currentPlayer) {
        s.selectedPos = pos;
        s.legalMoves = getLegalMoves(s.board, pos, s.currentPlayer);
    } else {
        s.selectedPos = null;
        s.legalMoves = [];
    }
}
```

**What's happening:**
- First guard: ignore clicks during AI's turn or after game over.
- If a piece is already selected and the clicked cell is in `legalMoves`, execute the move.
- Otherwise, if the clicked cell has the current player's piece, select it and compute legal moves.
- Clicking an empty cell or opponent's piece deselects (clears `selectedPos` and `legalMoves`).

---

### 4.3 — Making Moves and Promotion

```typescript
private makeMove(from: Position, to: Position): void {
    const s = this.state;
    const piece = s.board[from.row][from.col]!;

    s.board[to.row][to.col] = piece;
    s.board[from.row][from.col] = null;

    // Auto-promote pawns to queen
    if (piece.type === "pawn" && (to.row === 0 || to.row === 7)) {
        s.board[to.row][to.col] = { type: "queen", color: piece.color };
    }

    s.lastMove = { from, to };

    // Switch player
    s.currentPlayer = s.currentPlayer === "white" ? "black" : "white";

    // Check game state
    s.isCheck = isKingInCheck(s.board, s.currentPlayer);
    const hasMove = hasAnyLegalMove(s.board, s.currentPlayer);

    if (!hasMove) {
        s.gameOver = true;
        s.phase = "gameover";
        if (s.isCheck) {
            s.isCheckmate = true;
        } else {
            s.isStalemate = true;
        }
    }
}
```

**What's happening:**
- Move the piece: write it to the destination, clear the origin.
- **Auto-promotion**: if a pawn reaches row 0 or 7, it becomes a queen. Simplified from real chess (which offers a choice).
- Switch `currentPlayer` between "white" and "black".
- **Check detection**: `isKingInCheck` scans all opponent pieces for pseudo-moves that reach the king.
- **Game-over**: if the new current player has no legal moves, it's either checkmate (if in check) or stalemate (if not).

---

### 4.4 — AI Opponent

**File:** `src/contexts/webgl/games/chess-3d/chessLogic.ts`

```typescript
export function getAIMove(
    board: Cell[][], color: PieceColor,
): { from: Position; to: Position } | null {
    const moves: { from: Position; to: Position }[] = [];

    for (let r = 0; r < BOARD_SIZE; r++) {
        for (let c = 0; c < BOARD_SIZE; c++) {
            const p = board[r][c];
            if (!p || p.color !== color) continue;

            const legal = getLegalMoves(board, { row: r, col: c }, color);
            for (const to of legal) {
                moves.push({ from: { row: r, col: c }, to });
            }
        }
    }

    if (moves.length === 0) return null;

    // Prefer captures, then random
    const captures = moves.filter((m) => board[m.to.row][m.to.col] !== null);
    if (captures.length > 0) {
        return captures[Math.floor(Math.random() * captures.length)];
    }

    return moves[Math.floor(Math.random() * moves.length)];
}
```

**What's happening:**
- Collect all legal moves for all pieces of the AI's color.
- Separate captures (moves to occupied cells) from non-captures.
- If captures exist, randomly pick one — this makes the AI opportunistic.
- Otherwise, pick a random legal move.
- The 0.5-second delay in the game loop (`aiTimer > 0.5`) prevents the AI from moving instantly, giving a natural "thinking" feel.

---

## Test It

```bash
pnpm dev
```

1. Select "Chess 3D" from the 3D category
2. **Click** a white piece — it should highlight yellow with green legal moves
3. **Click** a green cell to move the piece
4. After your move, the **AI (black)** moves automatically after a short delay
5. Try capturing AI pieces — the piece should disappear and yours takes its place
6. Push a pawn to the far row — it should **auto-promote** to a queen
7. Play until **checkmate** or **stalemate** — the game should stop
8. Press **R** to restart

---

## Challenges

**Easy:**
- Increase the AI delay from 0.5 to 1.5 seconds for a more deliberate opponent.

**Medium:**
- Improve the AI: instead of random captures, score captures by piece value (pawn=1, knight/bishop=3, rook=5, queen=9) and pick the highest-value capture.

**Hard:**
- Implement castling: detect when king and rook haven't moved, the path is clear, and no squares are attacked. Move both pieces in `makeMove`.

---

## What You Learned

- Ray-plane intersection converts screen clicks to 3D board cells via inverse VP matrix unprojection
- Click handling uses a select-then-move pattern: first click selects, second click moves
- Pawn auto-promotion replaces a pawn reaching the far row with a queen
- Checkmate = in check with no legal moves; stalemate = not in check with no legal moves
- A capture-preferring random AI provides a simple but somewhat challenging opponent

**Next:** Continue to Flight Sim to learn terrain heightmap generation and flight controls.

---
[← Previous Step](./step-3.md) | [Back to README](./README.md)
