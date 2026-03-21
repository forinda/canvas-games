# Step 4: Forced Captures & Multi-Jumps

**Goal:** Enforce mandatory captures, implement recursive multi-jump chains, and add proper turn management with a GameSystem.

**Time:** ~15 minutes

---

## What You'll Build

- **Mandatory capture enforcement** -- if any jump is available, the player must take it
- **Multi-jump chains** -- after a jump, if the same piece can jump again, the turn continues
- **Recursive jump chain detection** using `findJumpChains()` that explores all possible paths
- **Mid-chain restriction** -- during a multi-jump, only the jumping piece can move
- **GameSystem** that manages turn switching and win condition checks
- **Turn indicator** displaying whose turn it is at the top of the screen

---

## Concepts

- **Forced Capture Rule**: In standard checkers, if you can jump, you must. The `getAllLegalMoves()` method already handles this by returning only jumps when any exist. Now we enforce it in the UI by only showing jump moves when jumps are available.
- **Multi-Jump Chains**: After landing a jump, we check if the same piece can jump again from its new position. If so, the turn does not switch -- the player must continue jumping. The `mustContinueJump` state field tracks which piece is mid-chain.
- **Recursive Jump Discovery**: `findJumpChains()` recursively explores all possible jump paths from a position, simulating each jump on a cloned board to check for continuations. It collects all terminal positions as valid moves.
- **Turn Management**: The `GameSystem` handles switching turns (resetting selection state and clearing the continue-jump flag) and checking win conditions (no pieces left or no legal moves).

---

## Code

### 4.1 -- Upgrade MoveSystem with Recursive Jump Chains

**File:** `src/games/checkers/systems/MoveSystem.ts`

Replace the simple `getJumpMoves()` with a recursive `findJumpChains()` that discovers all multi-jump paths.

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

    // Forced capture rule: if any jump is available, must jump
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
    const allChains: Move[] = [];

    this.findJumpChains(board, from, from, piece, [], allChains);

    return allChains;
  }

  private findJumpChains(
    board: (Piece | null)[][],
    origin: Cell,
    current: Cell,
    piece: Piece,
    capturedSoFar: Cell[],
    results: Move[],
  ): void {
    const directions = this.getMoveDirections(piece);
    let foundJump = false;

    for (const [dr, dc] of directions) {
      const midR = current.row + dr;
      const midC = current.col + dc;
      const landR = current.row + dr * 2;
      const landC = current.col + dc * 2;

      if (!this.inBounds(landR, landC)) continue;

      const midPiece = board[midR][midC];

      if (
        midPiece &&
        midPiece.color !== piece.color &&
        !capturedSoFar.some(
          (cap) => cap.row === midR && cap.col === midC,
        ) &&
        board[landR][landC] === null
      ) {
        const newCaptures = [
          ...capturedSoFar,
          { row: midR, col: midC },
        ];
        const landCell: Cell = { row: landR, col: landC };

        // Simulate the board for continued chain
        const simBoard = cloneBoard(board);
        simBoard[current.row][current.col] = null;
        simBoard[midR][midC] = null;

        // Check if piece gets kinged at landing
        const wouldKing =
          !piece.isKing &&
          ((piece.color === "red" && landR === 0) ||
            (piece.color === "black" && landR === BOARD_SIZE - 1));
        const chainPiece: Piece = wouldKing
          ? { color: piece.color, isKing: true }
          : piece;

        simBoard[landR][landC] = chainPiece;

        foundJump = true;

        // If piece just got kinged, stop the chain (standard rules)
        if (wouldKing) {
          results.push({
            from: origin,
            to: landCell,
            captures: newCaptures,
          });
        } else {
          // Try to continue the chain
          const beforeLen = results.length;

          this.findJumpChains(
            simBoard,
            origin,
            landCell,
            chainPiece,
            newCaptures,
            results,
          );

          // If no further jumps found, this is a terminal position
          if (results.length === beforeLen) {
            results.push({
              from: origin,
              to: landCell,
              captures: newCaptures,
            });
          }
        }
      }
    }
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
      ];
    }

    return [
      [1, -1],
      [1, 1],
    ];
  }

  private inBounds(r: number, c: number): boolean {
    return r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE;
  }

  applyMove(state: CheckersState, move: Move): void {
    const piece = state.board[move.from.row][move.from.col];

    if (!piece) return;

    state.board[move.from.row][move.from.col] = null;

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

    state.board[move.to.row][move.to.col] = piece;
    state.lastMove = move;

    // King promotion
    if (piece.color === "red" && move.to.row === 0) {
      piece.isKing = true;
    } else if (
      piece.color === "black" &&
      move.to.row === BOARD_SIZE - 1
    ) {
      piece.isKing = true;
    }
  }

  getMovesForCell(state: CheckersState, cell: Cell): Move[] {
    return state.legalMoves.filter((m) => cellsEqual(m.from, cell));
  }
}
```

**What's happening:**
- **`findJumpChains()`** is the heart of multi-jump logic. It takes the current position, the origin (where the piece started its turn), the list of already-captured cells, and a results array.
- For each diagonal direction, it checks if a jump is possible (opponent at mid, empty at land, mid not already captured in this chain).
- If a jump is found, it **clones the board**, removes the current and mid pieces, places the piece at the landing, and **recursively** calls itself to look for further jumps.
- **King promotion during chains**: If a piece reaches the back row mid-chain, it gets promoted but the chain **stops** (standard rules -- a newly kinged piece does not continue jumping in the same turn).
- The `capturedSoFar` array prevents jumping the same piece twice in one chain.
- **`applyMove()`** now also handles king promotion at the destination row.

---

### 4.2 -- Create the GameSystem

**File:** `src/games/checkers/systems/GameSystem.ts`

Manages turn switching, king promotion checks, and win condition detection.

```typescript
import type { CheckersState, PieceColor } from "../types";
import { BOARD_SIZE } from "../types";
import type { MoveSystem } from "./MoveSystem";

export class GameSystem {
  private moveSystem: MoveSystem;

  constructor(moveSystem: MoveSystem) {
    this.moveSystem = moveSystem;
  }

  update(state: CheckersState, _dt: number): void {
    if (state.gameOver || !state.started) return;

    this.checkKingPromotion(state);
    this.checkWinCondition(state);
  }

  private checkKingPromotion(state: CheckersState): void {
    for (let c = 0; c < BOARD_SIZE; c++) {
      const topPiece = state.board[0][c];

      if (topPiece && topPiece.color === "red" && !topPiece.isKing) {
        topPiece.isKing = true;
      }

      const bottomPiece = state.board[BOARD_SIZE - 1][c];

      if (
        bottomPiece &&
        bottomPiece.color === "black" &&
        !bottomPiece.isKing
      ) {
        bottomPiece.isKing = true;
      }
    }
  }

  private checkWinCondition(state: CheckersState): void {
    const redCount = this.countPieces(state, "red");
    const blackCount = this.countPieces(state, "black");

    if (redCount === 0) {
      state.gameOver = true;
      state.winner = "black";
      return;
    }

    if (blackCount === 0) {
      state.gameOver = true;
      state.winner = "red";
      return;
    }

    // Check if current player has any legal moves
    const moves = this.moveSystem.getAllLegalMoves(
      state.board,
      state.currentTurn,
      null,
    );

    if (moves.length === 0) {
      state.gameOver = true;
      state.winner = state.currentTurn === "red" ? "black" : "red";
    }
  }

  private countPieces(state: CheckersState, color: PieceColor): number {
    let count = 0;

    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (state.board[r][c]?.color === color) count++;
      }
    }

    return count;
  }

  switchTurn(state: CheckersState): void {
    state.currentTurn = state.currentTurn === "red" ? "black" : "red";
    state.selectedCell = null;
    state.legalMovesForSelected = [];
    state.mustContinueJump = null;
    state.legalMovesDirty = true;
  }
}
```

**What's happening:**
- **`checkKingPromotion()`**: Scans the top row for red pieces and the bottom row for black pieces, promoting any non-kings it finds. This is a safety net that catches promotions even if `applyMove()` missed one.
- **`checkWinCondition()`**: Three ways to win: (1) opponent has zero pieces, (2) opponent has pieces but no legal moves. In both cases the other player wins.
- **`switchTurn()`**: Flips the current turn, clears selection state, resets the continue-jump flag, and marks legal moves for recomputation.

---

### 4.3 -- Update InputSystem for Multi-Jump Chains

**File:** `src/games/checkers/systems/InputSystem.ts`

Update `executeMove()` to check for continuation jumps after a capture, and pass the GameSystem for proper turn switching.

```typescript
import type { CheckersState, Cell, Move } from "../types";
import { BOARD_SIZE, cellsEqual, cloneBoard } from "../types";
import type { MoveSystem } from "./MoveSystem";
import type { GameSystem } from "./GameSystem";

export class InputSystem {
  private state: CheckersState;
  private canvas: HTMLCanvasElement;
  private onExit: () => void;
  private onReset: () => void;
  private moveSystem: MoveSystem;
  private gameSystem: GameSystem;
  private onMoveComplete: () => void;
  private keyHandler: (e: KeyboardEvent) => void;
  private clickHandler: (e: MouseEvent) => void;

  constructor(
    state: CheckersState,
    canvas: HTMLCanvasElement,
    onExit: () => void,
    onReset: () => void,
    moveSystem: MoveSystem,
    gameSystem: GameSystem,
    onMoveComplete: () => void,
  ) {
    this.state = state;
    this.canvas = canvas;
    this.onExit = onExit;
    this.onReset = onReset;
    this.moveSystem = moveSystem;
    this.gameSystem = gameSystem;
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
      if (this.state.showModeSelector) {
        this.onExit();
      } else {
        this.state.showModeSelector = true;
        this.state.started = false;
      }
      return;
    }

    if (e.key === "h" || e.key === "H") {
      this.state.paused = !this.state.paused;
      return;
    }

    if (e.key === "R") {
      this.onReset();
      return;
    }

    if (e.key === "r") {
      if (this.state.gameOver) {
        this.onReset();
      }
      return;
    }

    if (e.key === "u" || e.key === "U") {
      this.undoMove();
      return;
    }
  }

  private undoMove(): void {
    const s = this.state;

    if (s.moveHistory.length === 0 || s.gameOver || s.aiThinking)
      return;

    const entry = s.moveHistory.pop()!;

    s.board = entry.board;
    s.currentTurn = entry.currentTurn;
    s.capturedRed = entry.capturedRed;
    s.capturedBlack = entry.capturedBlack;
    s.mustContinueJump = entry.mustContinueJump;
    s.lastMove = entry.lastMove;
    s.selectedCell = null;
    s.legalMovesForSelected = [];
    s.gameOver = false;
    s.winner = null;
    s.legalMovesDirty = true;
    this.onMoveComplete();
  }

  private handleClick(e: MouseEvent): void {
    const s = this.state;
    const rect = this.canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (this.canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (this.canvas.height / rect.height);
    const W = this.canvas.width;
    const H = this.canvas.height;

    // Exit button (top-left)
    if (mx < 80 && my < 40) {
      this.onExit();
      return;
    }

    // Mode selector screen
    if (s.showModeSelector) {
      this.handleModeSelectorClick(mx, my, W, H);
      return;
    }

    if (s.gameOver) {
      if (
        mx > W * 0.3 &&
        mx < W * 0.7 &&
        my > H * 0.55 &&
        my < H * 0.7
      ) {
        this.onReset();
      }
      return;
    }

    if (s.paused || s.aiThinking) return;

    if (s.mode === "ai" && s.currentTurn === "black") return;

    const boardInfo = this.getBoardLayout(W, H);
    const cell = this.pixelToCell(mx, my, boardInfo);

    if (!cell) return;

    this.handleCellClick(cell);
  }

  private handleModeSelectorClick(
    mx: number,
    my: number,
    W: number,
    H: number,
  ): void {
    const s = this.state;
    const cx = W / 2;
    const btnW = 220;
    const btnH = 50;

    const aiY = H / 2 - 35;

    if (
      mx > cx - btnW / 2 &&
      mx < cx + btnW / 2 &&
      my > aiY &&
      my < aiY + btnH
    ) {
      s.mode = "ai";
      s.showModeSelector = false;
      s.started = true;
      return;
    }

    const tpY = H / 2 + 35;

    if (
      mx > cx - btnW / 2 &&
      mx < cx + btnW / 2 &&
      my > tpY &&
      my < tpY + btnH
    ) {
      s.mode = "two-player";
      s.showModeSelector = false;
      s.started = true;
      return;
    }
  }

  private handleCellClick(cell: Cell): void {
    const s = this.state;
    const piece = s.board[cell.row][cell.col];

    // If we have a selected piece and click on a legal move destination
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
      // If mid-chain jump, can only move the jumping piece
      if (
        s.mustContinueJump &&
        !cellsEqual(cell, s.mustContinueJump)
      )
        return;

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

    // Push snapshot to history before applying the move
    s.moveHistory.push({
      board: cloneBoard(s.board),
      currentTurn: s.currentTurn,
      capturedRed: s.capturedRed,
      capturedBlack: s.capturedBlack,
      mustContinueJump: s.mustContinueJump,
      lastMove: s.lastMove,
    });

    this.moveSystem.applyMove(s, move);
    s.selectedCell = null;
    s.legalMovesForSelected = [];
    s.mustContinueJump = null;

    // Check for multi-jump continuation
    if (move.captures.length > 0) {
      const continuationJumps = this.moveSystem.getJumpMoves(
        s.board,
        move.to,
        s.board[move.to.row][move.to.col]!,
      );

      if (continuationJumps.length > 0) {
        s.mustContinueJump = move.to;
        s.legalMovesDirty = true;
        this.onMoveComplete();

        return;
      }
    }

    // No more jumps available, switch turn
    this.gameSystem.switchTurn(s);
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

    if (
      row < 0 ||
      row >= BOARD_SIZE ||
      col < 0 ||
      col >= BOARD_SIZE
    )
      return null;

    return { row, col };
  }
}
```

**What's happening:**
- **Multi-jump detection in `executeMove()`**: After applying a jump (a move with captures), we call `getJumpMoves()` on the landing position. If more jumps are available, we set `mustContinueJump` to the landing cell and return without switching turns.
- **Mid-chain restriction in `handleCellClick()`**: When `mustContinueJump` is set, the player can only select the piece at that cell. Clicking any other piece is ignored.
- **Undo support**: Pressing U pops the last history entry and restores the entire board state. This even works during multi-jump chains.
- **Mode selector**: Clicking the "vs AI" or "2 Player" buttons sets the mode and starts the game. ESC returns to the mode selector.

---

### 4.4 -- Wire GameSystem into the Engine

**File:** `src/games/checkers/CheckersEngine.ts`

```typescript
import type { CheckersState } from "./types";
import { createInitialState } from "./types";
import { MoveSystem } from "./systems/MoveSystem";
import { GameSystem } from "./systems/GameSystem";
import { BoardRenderer } from "./renderers/BoardRenderer";
import { InputSystem } from "./systems/InputSystem";

export class CheckersEngine {
  private ctx: CanvasRenderingContext2D;
  private state: CheckersState;
  private running: boolean;
  private rafId: number;

  private moveSystem: MoveSystem;
  private gameSystem: GameSystem;
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

    // Systems
    this.moveSystem = new MoveSystem();
    this.gameSystem = new GameSystem(this.moveSystem);

    this.inputSystem = new InputSystem(
      this.state,
      canvas,
      onExit,
      () => this.reset(),
      this.moveSystem,
      this.gameSystem,
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
    if (!this.state.started || this.state.showModeSelector) return;

    this.moveSystem.update(this.state, 0);
    this.gameSystem.update(this.state, 0);
  }

  private render(): void {
    this.boardRenderer.render(this.ctx, this.state);
  }

  private onMoveComplete(): void {
    this.state.legalMovesDirty = true;
    this.moveSystem.update(this.state, 0);
    this.gameSystem.update(this.state, 0);
  }

  private reset(): void {
    const mode = this.state.mode;
    const newState = createInitialState();
    newState.mode = mode;
    newState.showModeSelector = false;
    newState.started = true;
    Object.assign(this.state, newState);
    this.moveSystem.update(this.state, 0);
  }
}
```

**What's happening:**
- The engine now creates both `MoveSystem` and `GameSystem`, passing the move system to the game system (so it can check for legal moves when detecting stalemates).
- The update loop calls both systems: `moveSystem` recomputes legal moves, `gameSystem` checks for promotions and win conditions.
- `onMoveComplete()` triggers both systems after every move to ensure the game state is consistent.

---

## Test It

1. **Run:** `npm run dev`
2. **Open:** the Checkers game in your browser
3. **Test forced captures:**
   - Move pieces until a jump opportunity arises
   - Notice that when a jump is available, **only jump moves appear** as legal moves (green dots with red tints)
   - You cannot make a simple move when a capture is available
4. **Test multi-jumps:**
   - Set up a position where a piece can jump two opponents in sequence
   - After the first jump, the turn **does not switch** -- the same piece must continue jumping
   - The jumping piece is automatically selected with only its continuation jumps shown
5. **Test undo:**
   - Press **U** to undo the last move (works even during multi-jump chains)
6. **Test win condition:**
   - Capture all opponent pieces -- a game-over state triggers

---

## Challenges

**Easy:**
- Add a visual indicator showing when a player is in a forced capture situation (e.g., display "Must capture!" text above the board).
- Change the multi-jump restriction to allow selecting a different piece (not standard rules, but an interesting variant).

**Medium:**
- Show the complete jump chain path by drawing faint lines connecting each hop in a multi-jump move when hovering over a legal move indicator.

**Hard:**
- Implement the "maximum capture" rule variant: when multiple jump chains are available, the player must take the chain that captures the most pieces.

---

## What You Learned

- Implementing recursive jump chain discovery with `findJumpChains()`
- Enforcing mandatory captures by filtering legal moves to jumps-only when available
- Managing multi-jump continuations with the `mustContinueJump` state field
- Building a GameSystem that handles turn switching, king promotion, and win detection
- Adding undo support by saving and restoring board state snapshots
- Handling mode selection and exit flows with keyboard and click events

**Next:** [Step 5: King Promotion & Game Logic](./step-5.md) -- add crown rendering for kings, game-over overlays, pause screen, and capture counters.

---
[<- Previous Step](./step-3.md) | [Back to Tutorial README](./README.md) | [Next Step ->](./step-5.md)
