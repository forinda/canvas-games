# Step 5: King Promotion & Game Logic

**Goal:** Render crowns on king pieces, add the HUD with turn indicator and capture counts, and build game-over and pause overlays.

**Time:** ~15 minutes

---

## What You'll Build

- **Crown rendering** on kinged pieces using a hand-drawn crown shape with jewel dots
- **HUD Renderer** showing the current turn, capture counts, mode label, and keyboard shortcuts
- **Game-over overlay** with winner announcement, piece count summary, and a "Play Again" button
- **Pause overlay** toggled with the H key
- **Exit button** in the top-left corner
- **Mode selector screen** with "vs AI" and "2 Player" buttons

---

## Concepts

- **Crown Drawing**: The crown is drawn as a path with three upward spikes, creating the classic crown silhouette. Three small circles at the spike tips serve as jewel dots. The crown is colored gold with darker jewels matching the piece color.
- **HUD Layers**: The HUD is drawn on top of the board in a separate render pass. It uses `textAlign` and `textBaseline` to position text precisely in the corners and center of the screen.
- **Overlay Pattern**: Game-over and pause states draw a semi-transparent black rectangle over everything, then render text and buttons on top. This dims the board without hiding it.
- **Button Hit Detection**: The mode selector and game-over buttons are drawn at known coordinates. The InputSystem checks click coordinates against these rectangles.

---

## Code

### 5.1 -- Add Crown Drawing to the Board Renderer

**File:** `src/games/checkers/renderers/BoardRenderer.ts`

Add the `drawCrown()` method and call it when rendering king pieces.

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

        ctx.fillStyle = isDark ? "#8B4513" : "#D2B48C";
        ctx.fillRect(cx, cy, cellSize, cellSize);

        // Last move highlight
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
                ctx.fillStyle = "rgba(255, 80, 80, 0.35)";
                ctx.fillRect(cx, cy, cellSize, cellSize);
              }

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

        // King crown
        if (piece.isKing) {
          this.drawCrown(ctx, cx, cy, pieceRadius * 0.5, piece.color);
        }
      }
    }
  }

  private drawCrown(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    size: number,
    color: string,
  ): void {
    ctx.fillStyle = "#FFD700";
    ctx.strokeStyle = "#B8860B";
    ctx.lineWidth = 1;

    const w = size * 1.4;
    const h = size * 0.9;
    const baseY = cy + h * 0.2;
    const topY = cy - h * 0.5;

    ctx.beginPath();
    // Base left
    ctx.moveTo(cx - w / 2, baseY);
    // Left spike
    ctx.lineTo(cx - w / 2, topY);
    ctx.lineTo(cx - w / 4, topY + h * 0.35);
    // Center spike
    ctx.lineTo(cx, topY - h * 0.1);
    ctx.lineTo(cx + w / 4, topY + h * 0.35);
    // Right spike
    ctx.lineTo(cx + w / 2, topY);
    ctx.lineTo(cx + w / 2, baseY);
    ctx.closePath();

    ctx.fill();
    ctx.stroke();

    // Crown jewel dots
    ctx.fillStyle = color === "red" ? "#cc0000" : "#222";
    const dotR = size * 0.1;

    ctx.beginPath();
    ctx.arc(cx - w / 2, topY + dotR, dotR, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, topY - h * 0.1 + dotR, dotR, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + w / 2, topY + dotR, dotR, 0, Math.PI * 2);
    ctx.fill();
  }
}
```

**What's happening:**
- **`drawCrown()`** builds a crown shape using `beginPath()` and a series of `lineTo()` calls. The shape has three upward spikes: left, center (tallest), and right, connected by valleys.
- The crown is filled with gold (`#FFD700`) and stroked with dark goldenrod (`#B8860B`).
- Three jewel dots sit at the tips of the spikes. They are colored to match the piece (dark red for red pieces, near-black for black pieces), creating a subtle contrast against the gold.
- The crown size scales with the piece radius (`pieceRadius * 0.5`), so it looks proportional at any board size.
- The conditional `if (piece.isKing)` in `drawPieces()` ensures crowns only render on promoted pieces.

---

### 5.2 -- Create the HUD Renderer

**File:** `src/games/checkers/renderers/HUDRenderer.ts`

Draws the turn indicator, capture counts, mode label, mode selector, AI thinking indicator, game-over overlay, and pause overlay.

```typescript
import type { CheckersState } from "../types";

export class HUDRenderer {
  render(ctx: CanvasRenderingContext2D, state: CheckersState): void {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    // Exit button
    this.drawExitButton(ctx);

    if (state.showModeSelector) {
      this.drawModeSelector(ctx, W, H);
      return;
    }

    this.drawTurnIndicator(ctx, state, W);
    this.drawCapturedCount(ctx, state, W, H);
    this.drawModeLabel(ctx, state, W);

    if (state.aiThinking) {
      this.drawAIThinking(ctx, W, H);
    }

    if (state.gameOver) {
      this.drawGameOverOverlay(ctx, state, W, H);
    }

    if (state.paused && !state.gameOver) {
      this.drawPauseOverlay(ctx, W, H);
    }
  }

  private drawExitButton(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.beginPath();
    ctx.roundRect(8, 8, 70, 28, 6);
    ctx.fill();
    ctx.font = "13px monospace";
    ctx.fillStyle = "#aaa";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText("< Exit", 16, 22);
  }

  private drawTurnIndicator(
    ctx: CanvasRenderingContext2D,
    state: CheckersState,
    W: number,
  ): void {
    const text =
      state.currentTurn === "red" ? "Red's Turn" : "Black's Turn";
    const color = state.currentTurn === "red" ? "#ff4444" : "#888";

    ctx.font = "bold 18px monospace";
    ctx.fillStyle = color;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(text, W / 2, 12);

    // Turn indicator circle
    ctx.fillStyle = state.currentTurn === "red" ? "#cc0000" : "#222";
    ctx.strokeStyle =
      state.currentTurn === "red" ? "#ff4444" : "#555";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(
      W / 2 - ctx.measureText(text).width / 2 - 18,
      22,
      8,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    ctx.stroke();
  }

  private drawCapturedCount(
    ctx: CanvasRenderingContext2D,
    state: CheckersState,
    W: number,
    H: number,
  ): void {
    const margin = 60;
    const boardSize = Math.min(W - margin * 2, H - margin * 2 - 40);
    const boardX = (W - boardSize) / 2;
    const boardY = (H - boardSize) / 2 + 20;

    ctx.font = "14px monospace";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";

    // Red captured count (near top -- black's side)
    ctx.fillStyle = "#ff4444";
    ctx.fillText(
      `Red captured: ${state.capturedBlack}`,
      boardX,
      boardY - 30,
    );

    // Black captured count (near bottom -- red's side)
    ctx.fillStyle = "#aaa";
    ctx.fillText(
      `Black captured: ${state.capturedRed}`,
      boardX,
      boardY + boardSize + 30,
    );
  }

  private drawModeLabel(
    ctx: CanvasRenderingContext2D,
    state: CheckersState,
    W: number,
  ): void {
    const label = state.mode === "ai" ? "vs AI" : "2 Player";

    ctx.font = "12px monospace";
    ctx.fillStyle = "#555";
    ctx.textAlign = "right";
    ctx.textBaseline = "top";
    ctx.fillText(label, W - 16, 12);

    ctx.fillStyle = "#444";
    ctx.fillText(
      "[H] Help  [U] Undo  [R] Restart  [ESC] Menu",
      W - 16,
      28,
    );
  }

  private drawModeSelector(
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
  ): void {
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0, 0, W, H);

    const cx = W / 2;

    // Title
    ctx.font = "bold 36px monospace";
    ctx.fillStyle = "#b71c1c";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Checkers", cx, H / 2 - 120);

    // Subtitle
    ctx.font = "14px monospace";
    ctx.fillStyle = "#888";
    ctx.fillText("Select game mode", cx, H / 2 - 75);

    // VS AI button
    const btnW = 220;
    const btnH = 50;
    const aiY = H / 2 - 35;

    ctx.fillStyle = "#b71c1c";
    ctx.beginPath();
    ctx.roundRect(cx - btnW / 2, aiY, btnW, btnH, 10);
    ctx.fill();
    ctx.font = "bold 16px monospace";
    ctx.fillStyle = "#fff";
    ctx.fillText("vs AI", cx, aiY + btnH / 2);

    // 2 Player button
    const tpY = H / 2 + 35;

    ctx.fillStyle = "#333";
    ctx.beginPath();
    ctx.roundRect(cx - btnW / 2, tpY, btnW, btnH, 10);
    ctx.fill();
    ctx.strokeStyle = "#555";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(cx - btnW / 2, tpY, btnW, btnH, 10);
    ctx.stroke();
    ctx.font = "bold 16px monospace";
    ctx.fillStyle = "#ccc";
    ctx.fillText("2 Player", cx, tpY + btnH / 2);

    // Instructions
    ctx.font = "12px monospace";
    ctx.fillStyle = "#555";
    ctx.fillText("[ESC] to exit", cx, H / 2 + 120);
  }

  private drawAIThinking(
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
  ): void {
    ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    ctx.fillRect(0, 0, W, H);

    ctx.font = "bold 18px monospace";
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const dots = ".".repeat(Math.floor(Date.now() / 400) % 4);

    ctx.fillText(`AI is thinking${dots}`, W / 2, H / 2);
  }

  private drawGameOverOverlay(
    ctx: CanvasRenderingContext2D,
    state: CheckersState,
    W: number,
    H: number,
  ): void {
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(0, 0, W, H);

    const winnerText =
      state.winner === "red"
        ? "Red Wins!"
        : state.winner === "black"
          ? "Black Wins!"
          : "Draw!";
    const winColor =
      state.winner === "red"
        ? "#ff4444"
        : state.winner === "black"
          ? "#aaa"
          : "#fff";

    ctx.font = "bold 42px monospace";
    ctx.fillStyle = winColor;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(winnerText, W / 2, H / 2 - 30);

    ctx.font = "16px monospace";
    ctx.fillStyle = "#888";
    ctx.fillText(
      `Red: ${12 - state.capturedRed} remaining | Black: ${12 - state.capturedBlack} remaining`,
      W / 2,
      H / 2 + 15,
    );

    // Restart button
    const btnW = 180;
    const btnH = 44;
    const btnX = W / 2 - btnW / 2;
    const btnY = H / 2 + 45;

    ctx.fillStyle = "#b71c1c";
    ctx.beginPath();
    ctx.roundRect(btnX, btnY, btnW, btnH, 8);
    ctx.fill();

    ctx.font = "bold 16px monospace";
    ctx.fillStyle = "#fff";
    ctx.fillText("Play Again", W / 2, btnY + btnH / 2);

    ctx.font = "12px monospace";
    ctx.fillStyle = "#555";
    ctx.fillText(
      "[R] Restart  [ESC] Menu",
      W / 2,
      btnY + btnH + 24,
    );
  }

  private drawPauseOverlay(
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
  ): void {
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.fillRect(0, 0, W, H);

    ctx.font = "bold 32px monospace";
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("PAUSED", W / 2, H / 2 - 20);

    ctx.font = "14px monospace";
    ctx.fillStyle = "#888";
    ctx.fillText("Press [H] to resume", W / 2, H / 2 + 20);
  }
}
```

**What's happening:**
- **`drawExitButton()`**: Draws a small rounded rectangle in the top-left with "< Exit" text. The InputSystem detects clicks in this region.
- **`drawTurnIndicator()`**: Shows "Red's Turn" or "Black's Turn" at the top center in the appropriate color, with a small colored circle as a visual indicator.
- **`drawCapturedCount()`**: Displays how many pieces each player has captured, positioned above and below the board.
- **`drawModeSelector()`**: The start screen with the game title and two mode buttons. Uses `roundRect()` for modern-looking rounded buttons.
- **`drawAIThinking()`**: An animated "AI is thinking..." overlay with cycling dots (using `Date.now() / 400 % 4`).
- **`drawGameOverOverlay()`**: A dark overlay with the winner announcement, remaining piece counts, and a "Play Again" button.
- **`drawPauseOverlay()`**: A simpler dark overlay with "PAUSED" text and resume instructions.

---

### 5.3 -- Wire the HUD into the Engine

**File:** `src/games/checkers/CheckersEngine.ts`

Add the HUDRenderer to the engine's render method.

```typescript
import type { CheckersState } from "./types";
import { createInitialState } from "./types";
import { MoveSystem } from "./systems/MoveSystem";
import { GameSystem } from "./systems/GameSystem";
import { BoardRenderer } from "./renderers/BoardRenderer";
import { HUDRenderer } from "./renderers/HUDRenderer";
import { InputSystem } from "./systems/InputSystem";

export class CheckersEngine {
  private ctx: CanvasRenderingContext2D;
  private state: CheckersState;
  private running: boolean;
  private rafId: number;

  private moveSystem: MoveSystem;
  private gameSystem: GameSystem;
  private boardRenderer: BoardRenderer;
  private hudRenderer: HUDRenderer;
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

    // Renderers
    this.boardRenderer = new BoardRenderer();
    this.hudRenderer = new HUDRenderer();

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
    this.hudRenderer.render(this.ctx, this.state);
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
- The `HUDRenderer` is created alongside the `BoardRenderer` and called after it in `render()`, so HUD elements layer on top of the board.
- The mode selector now shows on startup (since we removed the `showModeSelector = false` override from earlier steps). Players choose "vs AI" or "2 Player" before the game begins.

---

## Test It

1. **Run:** `npm run dev`
2. **Open:** the Checkers game
3. **Test the mode selector:**
   - You should see the **Checkers title** and two buttons: **"vs AI"** and **"2 Player"**
   - Click **"2 Player"** to start a two-player game
4. **Test the HUD:**
   - **Turn indicator** at the top center shows "Red's Turn" with a red dot
   - **Capture counts** appear above and below the board
   - **Mode label** and shortcuts appear in the top right
5. **Test king promotion:**
   - Move a piece all the way to the opposite end of the board
   - It should display a **gold crown** on the piece
   - The kinged piece should now be able to move **in all four diagonal directions**
6. **Test overlays:**
   - Press **H** to see the **pause overlay**
   - Press **H** again to resume
   - Play until one side wins to see the **game-over overlay** with "Play Again"
7. **Test the exit button:**
   - Click **"< Exit"** in the top-left corner

---

## Challenges

**Easy:**
- Change the crown color from gold to silver (`#C0C0C0`) and see how it looks.
- Add a "Total moves" counter to the HUD by tracking `moveHistory.length`.

**Medium:**
- Add a move timer that shows how long the current player has been thinking (resets on each turn switch).

**Hard:**
- Implement a move animation: when a piece is kinged, show a brief golden sparkle effect using particles that emanate from the piece for 500ms.

---

## What You Learned

- Drawing a crown shape using Canvas path operations (moveTo, lineTo, closePath)
- Building a complete HUD with turn indicators, capture counts, and keyboard shortcut reminders
- Creating overlay screens (mode selector, game over, pause) with semi-transparent backgrounds
- Rendering clickable buttons with `roundRect()` and detecting clicks against their bounds
- Layering renderers (board first, then HUD) to create a complete game interface

**Next:** [Step 6: AI Opponent & Polish](./step-6.md) -- build a minimax AI with alpha-beta pruning and positional evaluation to create a challenging computer opponent.

---
[<- Previous Step](./step-4.md) | [Back to Tutorial README](./README.md) | [Next Step ->](./step-6.md)
