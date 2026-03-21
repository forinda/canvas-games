# Step 3: Move Validation & Jumps

**Goal:** Calculate legal diagonal moves and single jumps, show legal move indicators on the board, and execute moves on click.

**Time:** ~15 minutes

---

## What You'll Build

- **MoveSystem** that computes all legal moves for the current player
- **Simple diagonal moves** -- one square forward-left or forward-right onto empty dark squares
- **Single jump detection** -- leap over an adjacent opponent piece to an empty landing square
- **Green dot indicators** on squares where the selected piece can move
- **Red tint overlay** on squares that involve capturing an opponent piece
- **Move execution** that moves the piece and removes captured pieces
- **Last move highlighting** showing the from/to squares of the most recent move

---

## Concepts

- **Move Directions**: Regular red pieces move diagonally upward (row decreases): `[-1, -1]` and `[-1, 1]`. Black pieces move downward: `[1, -1]` and `[1, 1]`. Kings move in all four diagonals (added in Step 5).
- **Jump Mechanics**: A jump requires three things: (1) an adjacent diagonal square occupied by an opponent, (2) the square beyond it is empty and in-bounds, (3) the jumping piece lands on that empty square. The opponent piece is captured (removed).
- **Legal Move Computation**: On each turn, we compute all legal moves for the current player. When a piece is selected, we filter to just that piece's moves and display them as indicators.
- **Forced Captures**: In standard checkers, if any jump is available, the player must take a jump. Simple moves are only allowed when no jumps exist. We implement this in Step 4 -- for now, both move types coexist.

---

## Code

### 3.1 -- Create the Move System

**File:** `src/games/checkers/systems/MoveSystem.ts`

The core movement logic: computing simple moves, jump moves, and applying a move to the board.

```typescript
import type { CheckersState, Piece, Cell, Move, PieceColor } from "../types";
import { BOARD_SIZE, cellsEqual, cloneBoard } from "../types";

export class MoveSystem {
  update(state: CheckersState, _dt: number): void {
    if (!state.legalMovesDirty) return;

    state.legalMoves = this.getAllLegalMoves(
      state.board,
      state.currentTurn,
      state.mustContinueJump,
    );
    state.legalMovesDirty = false;
  }

  getAllLegalMoves(
    board: (Piece | null)[][],
    color: PieceColor,
    mustContinueFrom: Cell | null,
  ): Move[] {
    const jumps: Move[] = [];
    const simple: Move[] = [];

    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const piece = board[r][c];

        if (!piece || piece.color !== color) continue;

        // If mid-chain jump, only allow moves from the jumping piece
        if (
          mustContinueFrom &&
          !(mustContinueFrom.row === r && mustContinueFrom.col === c)
        )
          continue;

        const from: Cell = { row: r, col: c };
        const pieceJumps = this.getJumpMoves(board, from, piece);
        const pieceSimple = this.getSimpleMoves(board, from, piece);

        jumps.push(...pieceJumps);
        simple.push(...pieceSimple);
      }
    }

    // Forced capture rule: if any jump exists, must jump
    if (jumps.length > 0) return jumps;

    if (mustContinueFrom) return []; // mid-chain but no more jumps

    return simple;
  }

  getSimpleMoves(
    board: (Piece | null)[][],
    from: Cell,
    piece: Piece,
  ): Move[] {
    const moves: Move[] = [];
    const directions = this.getMoveDirections(piece);

    for (const [dr, dc] of directions) {
      const nr = from.row + dr;
      const nc = from.col + dc;

      if (this.inBounds(nr, nc) && board[nr][nc] === null) {
        moves.push({ from, to: { row: nr, col: nc }, captures: [] });
      }
    }

    return moves;
  }

  getJumpMoves(
    board: (Piece | null)[][],
    from: Cell,
    piece: Piece,
  ): Move[] {
    const results: Move[] = [];
    const directions = this.getMoveDirections(piece);

    for (const [dr, dc] of directions) {
      const midR = from.row + dr;
      const midC = from.col + dc;
      const landR = from.row + dr * 2;
      const landC = from.col + dc * 2;

      if (!this.inBounds(landR, landC)) continue;

      const midPiece = board[midR][midC];

      if (
        midPiece &&
        midPiece.color !== piece.color &&
        board[landR][landC] === null
      ) {
        results.push({
          from,
          to: { row: landR, col: landC },
          captures: [{ row: midR, col: midC }],
        });
      }
    }

    return results;
  }

  private getMoveDirections(piece: Piece): [number, number][] {
    if (piece.isKing) {
      return [
        [-1, -1],
        [-1, 1],
        [1, -1],
        [1, 1],
      ];
    }

    if (piece.color === "red") {
      return [
        [-1, -1],
        [-1, 1],
      ]; // red moves up (decreasing row)
    }

    return [
      [1, -1],
      [1, 1],
    ]; // black moves down (increasing row)
  }

  private inBounds(r: number, c: number): boolean {
    return r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE;
  }

  applyMove(state: CheckersState, move: Move): void {
    const piece = state.board[move.from.row][move.from.col];

    if (!piece) return;

    // Remove piece from origin
    state.board[move.from.row][move.from.col] = null;

    // Remove captured pieces
    for (const cap of move.captures) {
      const captured = state.board[cap.row][cap.col];

      if (captured) {
        if (captured.color === "red") {
          state.capturedRed++;
        } else {
          state.capturedBlack++;
        }

        state.board[cap.row][cap.col] = null;
      }
    }

    // Place piece at destination
    state.board[move.to.row][move.to.col] = piece;
    state.lastMove = move;
  }

  getMovesForCell(state: CheckersState, cell: Cell): Move[] {
    return state.legalMoves.filter((m) => cellsEqual(m.from, cell));
  }
}
```

**What's happening:**
- **`getMoveDirections()`**: Returns the two diagonal directions a piece can move. Red goes up (row -1), black goes down (row +1). Kings get all four directions (added in Step 5, but the code is ready).
- **`getSimpleMoves()`**: For each direction, checks one square ahead. If in-bounds and empty, it is a legal simple move.
- **`getJumpMoves()`**: For each direction, checks the adjacent square (mid) for an opponent and the square beyond (land) for emptiness. If both conditions are met, it is a legal jump that captures the mid piece.
- **`getAllLegalMoves()`**: Collects all jumps and simple moves for every piece of the current color. If any jumps exist, only jumps are returned (forced capture rule).
- **`applyMove()`**: Removes the piece from its origin, removes any captured pieces (incrementing the capture counters), and places the piece at its destination.
- **`getMovesForCell()`**: Filters the precomputed legal moves to just those starting from a specific cell -- used to show indicators for the selected piece.

---

### 3.2 -- Add Legal Move Indicators to the Board Renderer

**File:** `src/games/checkers/renderers/BoardRenderer.ts`

Add last-move highlighting and legal move dot/tint indicators inside the `drawBoard()` method.

```typescript
import type { CheckersState, Cell } from "../types";
import { BOARD_SIZE, cellsEqual } from "../types";

export class BoardRenderer {
  render(ctx: CanvasRenderingContext2D, state: CheckersState): void {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    // Background
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0, 0, W, H);

    if (state.showModeSelector) return;

    const layout = this.getBoardLayout(W, H);

    this.drawBoard(ctx, state, layout);
    this.drawPieces(ctx, state, layout);
  }

  private getBoardLayout(
    W: number,
    H: number,
  ): { x: number; y: number; size: number; cellSize: number } {
    const margin = 60;
    const size = Math.min(W - margin * 2, H - margin * 2 - 40);
    const cellSize = size / BOARD_SIZE;
    const x = (W - size) / 2;
    const y = (H - size) / 2 + 20;

    return { x, y, size, cellSize };
  }

  private drawBoard(
    ctx: CanvasRenderingContext2D,
    state: CheckersState,
    layout: { x: number; y: number; size: number; cellSize: number },
  ): void {
    const { x, y, cellSize } = layout;

    // Board border
    ctx.strokeStyle = "#8B4513";
    ctx.lineWidth = 4;
    ctx.strokeRect(
      x - 4,
      y - 4,
      BOARD_SIZE * cellSize + 8,
      BOARD_SIZE * cellSize + 8,
    );

    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const cx = x + c * cellSize;
        const cy = y + r * cellSize;
        const isDark = (r + c) % 2 === 1;

        // Base cell color
        ctx.fillStyle = isDark ? "#8B4513" : "#D2B48C";
        ctx.fillRect(cx, cy, cellSize, cellSize);

        // Last move highlight (yellow tint on from/to squares)
        if (state.lastMove) {
          const cell: Cell = { row: r, col: c };

          if (
            cellsEqual(cell, state.lastMove.from) ||
            cellsEqual(cell, state.lastMove.to)
          ) {
            ctx.fillStyle = "rgba(255, 255, 0, 0.2)";
            ctx.fillRect(cx, cy, cellSize, cellSize);
          }
        }

        // Selected cell highlight
        if (
          state.selectedCell &&
          state.selectedCell.row === r &&
          state.selectedCell.col === c
        ) {
          ctx.fillStyle = "rgba(0, 200, 255, 0.35)";
          ctx.fillRect(cx, cy, cellSize, cellSize);

          ctx.strokeStyle = "#00c8ff";
          ctx.lineWidth = 2;
          ctx.strokeRect(cx + 1, cy + 1, cellSize - 2, cellSize - 2);
        }

        // Legal move indicators
        if (state.legalMovesForSelected.length > 0) {
          for (const move of state.legalMovesForSelected) {
            if (move.to.row === r && move.to.col === c) {
              if (move.captures.length > 0) {
                // Jump indicator: red tint
                ctx.fillStyle = "rgba(255, 80, 80, 0.35)";
                ctx.fillRect(cx, cy, cellSize, cellSize);
              }

              // Green dot indicator
              ctx.fillStyle = "rgba(0, 255, 100, 0.5)";
              ctx.beginPath();
              ctx.arc(
                cx + cellSize / 2,
                cy + cellSize / 2,
                cellSize * 0.15,
                0,
                Math.PI * 2,
              );
              ctx.fill();
            }
          }
        }
      }
    }

    // Row/column labels
    ctx.font = `${Math.max(10, cellSize * 0.22)}px monospace`;
    ctx.fillStyle = "#888";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    for (let i = 0; i < BOARD_SIZE; i++) {
      ctx.fillText(
        `${BOARD_SIZE - i}`,
        x - 16,
        y + i * cellSize + cellSize / 2,
      );
      ctx.fillText(
        String.fromCharCode(65 + i),
        x + i * cellSize + cellSize / 2,
        y + BOARD_SIZE * cellSize + 16,
      );
    }
  }

  private drawPieces(
    ctx: CanvasRenderingContext2D,
    state: CheckersState,
    layout: { x: number; y: number; size: number; cellSize: number },
  ): void {
    const { x, y, cellSize } = layout;
    const pieceRadius = cellSize * 0.38;

    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const piece = state.board[r][c];

        if (!piece) continue;

        const cx = x + c * cellSize + cellSize / 2;
        const cy = y + r * cellSize + cellSize / 2;

        // Shadow
        ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
        ctx.beginPath();
        ctx.arc(cx + 2, cy + 3, pieceRadius, 0, Math.PI * 2);
        ctx.fill();

        // Piece body with radial gradient
        const gradient = ctx.createRadialGradient(
          cx - pieceRadius * 0.3,
          cy - pieceRadius * 0.3,
          pieceRadius * 0.1,
          cx,
          cy,
          pieceRadius,
        );

        if (piece.color === "red") {
          gradient.addColorStop(0, "#ff4444");
          gradient.addColorStop(1, "#aa0000");
        } else {
          gradient.addColorStop(0, "#555555");
          gradient.addColorStop(1, "#111111");
        }

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(cx, cy, pieceRadius, 0, Math.PI * 2);
        ctx.fill();

        // Piece border
        ctx.strokeStyle = piece.color === "red" ? "#cc0000" : "#333333";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, pieceRadius, 0, Math.PI * 2);
        ctx.stroke();

        // Inner ring
        ctx.strokeStyle = piece.color === "red" ? "#ff6666" : "#444444";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(cx, cy, pieceRadius * 0.7, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }
}
```

**What's happening:**
- **Last move highlight**: After each move, `state.lastMove` stores the from/to cells. Both cells get a yellow tint (`rgba(255, 255, 0, 0.2)`) so the player can see what just happened.
- **Legal move dots**: When a piece is selected and has legal moves stored in `state.legalMovesForSelected`, we draw a green dot (`rgba(0, 255, 100, 0.5)`) at the center of each target square.
- **Jump indicators**: If a legal move has captures (it is a jump), the target square also gets a red tint overlay. This visually distinguishes captures from simple moves.

---

### 3.3 -- Update the Input System for Move Execution

**File:** `src/games/checkers/systems/InputSystem.ts`

Now the input system uses the MoveSystem to compute legal moves for the selected piece and execute moves when the player clicks a legal target.

```typescript
import type { CheckersState, Cell, Move } from "../types";
import { BOARD_SIZE, cellsEqual, cloneBoard } from "../types";
import type { MoveSystem } from "./MoveSystem";

export class InputSystem {
  private state: CheckersState;
  private canvas: HTMLCanvasElement;
  private onExit: () => void;
  private onReset: () => void;
  private moveSystem: MoveSystem;
  private onMoveComplete: () => void;
  private keyHandler: (e: KeyboardEvent) => void;
  private clickHandler: (e: MouseEvent) => void;

  constructor(
    state: CheckersState,
    canvas: HTMLCanvasElement,
    onExit: () => void,
    onReset: () => void,
    moveSystem: MoveSystem,
    onMoveComplete: () => void,
  ) {
    this.state = state;
    this.canvas = canvas;
    this.onExit = onExit;
    this.onReset = onReset;
    this.moveSystem = moveSystem;
    this.onMoveComplete = onMoveComplete;
    this.keyHandler = (e: KeyboardEvent) => this.handleKey(e);
    this.clickHandler = (e: MouseEvent) => this.handleClick(e);
  }

  attach(): void {
    window.addEventListener("keydown", this.keyHandler);
    this.canvas.addEventListener("click", this.clickHandler);
  }

  detach(): void {
    window.removeEventListener("keydown", this.keyHandler);
    this.canvas.removeEventListener("click", this.clickHandler);
  }

  private handleKey(e: KeyboardEvent): void {
    if (e.key === "Escape") {
      this.onExit();
      return;
    }

    if (e.key === "h" || e.key === "H") {
      this.state.paused = !this.state.paused;
      return;
    }

    if (e.key === "r" || e.key === "R") {
      if (this.state.gameOver) {
        this.onReset();
      }
      return;
    }
  }

  private handleClick(e: MouseEvent): void {
    const s = this.state;

    if (s.paused || s.gameOver || s.aiThinking) return;

    // In AI mode, only allow the human player (red) to move
    if (s.mode === "ai" && s.currentTurn === "black") return;

    const rect = this.canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (this.canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (this.canvas.height / rect.height);
    const W = this.canvas.width;
    const H = this.canvas.height;

    const boardInfo = this.getBoardLayout(W, H);
    const cell = this.pixelToCell(mx, my, boardInfo);

    if (!cell) return;

    this.handleCellClick(cell);
  }

  private handleCellClick(cell: Cell): void {
    const s = this.state;
    const piece = s.board[cell.row][cell.col];

    // If we have a selected piece and click a legal move destination
    if (s.selectedCell) {
      const move = s.legalMovesForSelected.find((m) =>
        cellsEqual(m.to, cell),
      );

      if (move) {
        this.executeMove(move);
        return;
      }
    }

    // Select a piece of the current player's color
    if (piece && piece.color === s.currentTurn) {
      const movesForPiece = this.moveSystem.getMovesForCell(s, cell);

      if (movesForPiece.length > 0) {
        s.selectedCell = cell;
        s.legalMovesForSelected = movesForPiece;
      }

      return;
    }

    // Deselect
    s.selectedCell = null;
    s.legalMovesForSelected = [];
  }

  private executeMove(move: Move): void {
    const s = this.state;

    // Save state for undo
    s.moveHistory.push({
      board: cloneBoard(s.board),
      currentTurn: s.currentTurn,
      capturedRed: s.capturedRed,
      capturedBlack: s.capturedBlack,
      mustContinueJump: s.mustContinueJump,
      lastMove: s.lastMove,
    });

    // Apply the move
    this.moveSystem.applyMove(s, move);
    s.selectedCell = null;
    s.legalMovesForSelected = [];

    // Switch turns (multi-jump continuation added in Step 4)
    s.currentTurn = s.currentTurn === "red" ? "black" : "red";
    s.legalMovesDirty = true;
    this.onMoveComplete();
  }

  private getBoardLayout(
    W: number,
    H: number,
  ): { x: number; y: number; size: number; cellSize: number } {
    const margin = 60;
    const size = Math.min(W - margin * 2, H - margin * 2 - 40);
    const cellSize = size / BOARD_SIZE;
    const x = (W - size) / 2;
    const y = (H - size) / 2 + 20;

    return { x, y, size, cellSize };
  }

  private pixelToCell(
    mx: number,
    my: number,
    board: { x: number; y: number; size: number; cellSize: number },
  ): Cell | null {
    const col = Math.floor((mx - board.x) / board.cellSize);
    const row = Math.floor((my - board.y) / board.cellSize);

    if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE)
      return null;

    return { row, col };
  }
}
```

**What's happening:**
- **Selection + move flow**: When a piece is selected and the player clicks a destination that matches a legal move, `executeMove()` fires. Otherwise, clicking a friendly piece selects it (showing its legal moves), and clicking elsewhere deselects.
- **`executeMove()`**: First pushes a history snapshot (for undo later), then calls `moveSystem.applyMove()` to mutate the board. Finally switches the turn and marks legal moves as dirty for recomputation.
- **`legalMovesForSelected`**: When selecting a piece, we populate this array with only that piece's legal moves. The renderer uses this to draw the green dot indicators.

---

### 3.4 -- Wire the MoveSystem into the Engine

**File:** `src/games/checkers/CheckersEngine.ts`

```typescript
import type { CheckersState } from "./types";
import { createInitialState } from "./types";
import { MoveSystem } from "./systems/MoveSystem";
import { BoardRenderer } from "./renderers/BoardRenderer";
import { InputSystem } from "./systems/InputSystem";

export class CheckersEngine {
  private ctx: CanvasRenderingContext2D;
  private state: CheckersState;
  private running: boolean;
  private rafId: number;

  private moveSystem: MoveSystem;
  private boardRenderer: BoardRenderer;
  private inputSystem: InputSystem;
  private resizeHandler: () => void;

  constructor(canvas: HTMLCanvasElement, onExit: () => void) {
    this.ctx = canvas.getContext("2d")!;
    this.running = false;
    this.rafId = 0;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    this.state = createInitialState();
    this.state.showModeSelector = false;
    this.state.started = true;

    // Systems
    this.moveSystem = new MoveSystem();

    this.inputSystem = new InputSystem(
      this.state,
      canvas,
      onExit,
      () => this.reset(),
      this.moveSystem,
      () => this.onMoveComplete(),
    );

    // Renderer
    this.boardRenderer = new BoardRenderer();

    // Resize handler
    this.resizeHandler = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    // Initialize legal moves
    this.state.legalMovesDirty = true;
    this.moveSystem.update(this.state, 0);

    // Attach listeners
    this.inputSystem.attach();
    window.addEventListener("resize", this.resizeHandler);
  }

  start(): void {
    this.running = true;
    this.loop();
  }

  destroy(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
    this.inputSystem.detach();
    window.removeEventListener("resize", this.resizeHandler);
  }

  private loop(): void {
    if (!this.running) return;

    this.update();
    this.render();
    this.rafId = requestAnimationFrame(() => this.loop());
  }

  private update(): void {
    this.moveSystem.update(this.state, 0);
  }

  private render(): void {
    this.boardRenderer.render(this.ctx, this.state);
  }

  private onMoveComplete(): void {
    this.state.legalMovesDirty = true;
    this.moveSystem.update(this.state, 0);
  }

  private reset(): void {
    const newState = createInitialState();
    newState.showModeSelector = false;
    newState.started = true;
    Object.assign(this.state, newState);
    this.moveSystem.update(this.state, 0);
  }
}
```

**What's happening:**
- The engine now creates a `MoveSystem` and passes it to the `InputSystem`.
- `onMoveComplete()` is called after every move to trigger legal move recomputation.
- In the game loop, `this.moveSystem.update()` is called each frame to recalculate legal moves when the dirty flag is set.

---

## Test It

1. **Run:** `npm run dev`
2. **Open:** the Checkers game in your browser
3. **Observe:**
   - **Click a red piece** -- it highlights in cyan and **green dots** appear on the two diagonal squares it can move to
   - **Click a green dot** -- the piece moves there, the turn switches, and the **previous position shows a yellow highlight**
   - **Now it is black's turn** -- click a black piece and move it similarly
   - **Captures work**: maneuver a piece diagonally adjacent to an opponent, and the **jump target shows a red tint** with a green dot. Click it to capture
   - After a capture, the **opponent piece disappears** from the board

---

## Challenges

**Easy:**
- Change the legal move dot size from `cellSize * 0.15` to `cellSize * 0.2` for larger, more visible indicators.
- Make the last-move highlight a different color (try green or blue instead of yellow).

**Medium:**
- Show all pieces that can move (not just the selected one) by adding a subtle glow to every piece that has at least one legal move.

**Hard:**
- Add an animation that smoothly slides the piece from its origin to its destination over 200ms, instead of teleporting it instantly. Use `requestAnimationFrame` and interpolate the piece position.

---

## What You Learned

- Computing legal diagonal moves by checking adjacent squares for emptiness
- Implementing jump detection by checking for an opponent piece and an empty landing square
- Building a forced capture system where jumps take priority over simple moves
- Rendering legal move indicators (green dots and red tints) on the board
- Executing moves by mutating the board state and switching turns
- Saving move history snapshots for undo support

**Next:** [Step 4: Forced Captures & Multi-Jumps](./step-4.md) -- implement mandatory capture enforcement, recursive jump chains, and proper turn management.

---
[<- Previous Step](./step-2.md) | [Back to Tutorial README](./README.md) | [Next Step ->](./step-4.md)
