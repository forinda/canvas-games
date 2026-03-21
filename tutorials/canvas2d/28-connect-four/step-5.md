# Step 5: Modes, Score & Polish

**Goal:** Add mode selection (vs AI / 2-player), score tracking, and complete the UI polish.

**Time:** ~15 minutes

---

## What You'll Build

- **Mode selection screen** with clickable buttons for "vs AI" and "2 Players"
- **Score tracking** across multiple games (wins for each player, draws)
- **Scoreboard** in the HUD showing Red wins, Yellow wins, and draws
- **Controls hints** for restarting, changing mode, and exiting
- **"AI thinking" indicator** during the computer's turn
- **Keyboard shortcuts** -- R to restart, M to change mode, ESC to exit

---

## Concepts

- **Mode Select Overlay**: A screen drawn before gameplay begins, with two clickable button regions
- **Hit-Test Buttons**: Check if click coordinates fall within button rectangles
- **Persistent Scores**: Scores survive across rounds within the same session (reset on mode change)
- **State Reset**: Clear the board and animation state without losing the mode and scores

---

## Code

### 1. Create the HUD Renderer

**File:** `src/contexts/canvas2d/games/connect-four/renderers/HUDRenderer.ts`

```typescript
import type { ConnectFourState } from '../types';

const COLOR_RED = '#f44336';
const COLOR_YELLOW = '#ffeb3b';

export class HUDRenderer {
  render(ctx: CanvasRenderingContext2D, state: ConnectFourState): void {
    const W = state.canvasWidth;
    const H = state.canvasHeight;

    if (state.showModeSelect) { this.renderModeSelect(ctx, W, H); return; }

    this.renderScoreboard(ctx, state, W);
    this.renderTurnIndicator(ctx, state, W, H);
    if (state.gameOver) this.renderGameOverOverlay(ctx, state, W, H);
  }

  private renderModeSelect(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    ctx.fillStyle = '#0f0f1a'; ctx.fillRect(0, 0, W, H);

    ctx.font = 'bold 36px monospace'; ctx.fillStyle = '#e53935';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('Connect Four', W / 2, H / 2 - 120);

    ctx.font = '16px monospace'; ctx.fillStyle = '#888';
    ctx.fillText('Choose a game mode', W / 2, H / 2 - 75);

    const btnW = 200; const btnH = 50; const centerX = W / 2; const centerY = H / 2;
    this.drawButton(ctx, centerX - btnW / 2, centerY - 10 - btnH, btnW, btnH, 'vs AI', COLOR_RED);
    this.drawButton(ctx, centerX - btnW / 2, centerY + 10, btnW, btnH, '2 Players', COLOR_YELLOW);

    ctx.font = '12px monospace'; ctx.fillStyle = '#555';
    ctx.fillText('[ESC] Exit  |  [H] Help', W / 2, H / 2 + 100);
  }

  private drawButton(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, label: string, color: string): void {
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.beginPath(); ctx.roundRect(x, y, w, h, 10); ctx.fill();
    ctx.strokeStyle = color; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(x, y, w, h, 10); ctx.stroke();
    ctx.font = 'bold 18px monospace'; ctx.fillStyle = color;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(label, x + w / 2, y + h / 2);
  }

  private renderScoreboard(ctx: CanvasRenderingContext2D, state: ConnectFourState, W: number): void {
    ctx.font = 'bold 14px monospace'; ctx.textBaseline = 'top'; ctx.textAlign = 'center';
    ctx.fillStyle = COLOR_RED; ctx.fillText(`Red: ${state.scoreRed}`, W / 2 - 100, 24);
    ctx.fillStyle = '#888'; ctx.fillText(`Draw: ${state.draws}`, W / 2, 24);
    ctx.fillStyle = COLOR_YELLOW; ctx.fillText(`Yellow: ${state.scoreYellow}`, W / 2 + 110, 24);
    ctx.font = '11px monospace'; ctx.fillStyle = '#555';
    ctx.fillText(state.mode === 'ai' ? 'Mode: vs AI' : 'Mode: 2 Players', W / 2, 44);
  }

  private renderTurnIndicator(ctx: CanvasRenderingContext2D, state: ConnectFourState, W: number, H: number): void {
    if (state.gameOver) return;
    ctx.font = '16px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    if (state.aiThinking) {
      ctx.fillStyle = COLOR_YELLOW; ctx.fillText('AI is thinking...', W / 2, H - 40);
    } else {
      const color = state.currentPlayer === 'red' ? COLOR_RED : COLOR_YELLOW;
      ctx.fillStyle = color; ctx.fillText(`${state.currentPlayer === 'red' ? 'Red' : 'Yellow'}'s turn`, W / 2, H - 40);
    }
    ctx.font = '11px monospace'; ctx.fillStyle = '#444';
    ctx.fillText('[R] Restart  [M] Mode  [ESC] Exit', W / 2, H - 18);
  }

  private renderGameOverOverlay(ctx: CanvasRenderingContext2D, state: ConnectFourState, W: number, H: number): void {
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, 0, W, H);
    const panelW = 320; const panelH = 140;
    const px = (W - panelW) / 2; const py = (H - panelH) / 2;
    ctx.fillStyle = '#1a1a2e'; ctx.beginPath(); ctx.roundRect(px, py, panelW, panelH, 12); ctx.fill();
    const borderColor = state.isDraw ? '#888' : (state.winner === 'red' ? COLOR_RED : COLOR_YELLOW);
    ctx.strokeStyle = borderColor; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect(px, py, panelW, panelH, 12); ctx.stroke();
    ctx.font = 'bold 24px monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (state.isDraw) { ctx.fillStyle = '#ccc'; ctx.fillText("It's a Draw!", W / 2, py + 50); }
    else { ctx.fillStyle = borderColor; ctx.fillText(`${state.winner === 'red' ? 'Red' : 'Yellow'} Wins!`, W / 2, py + 50); }
    ctx.font = '13px monospace'; ctx.fillStyle = '#777';
    ctx.fillText('Click or press [R] to play again', W / 2, py + 100);
  }
}
```

---

### 2. Update the Input System

**File:** `src/contexts/canvas2d/games/connect-four/systems/InputSystem.ts`

Add mode selection clicks, keyboard shortcuts, and restart handling.

```typescript
import type { ConnectFourState } from '../types';
import { COLS, ROWS } from '../types';

export class InputSystem {
  private canvas: HTMLCanvasElement;
  private state: ConnectFourState;
  private onColumnClick: (col: number) => void;
  private onModeSelect: (mode: 'ai' | '2player') => void;
  private onRestart: () => void;
  private onExit: () => void;

  private clickHandler: (e: MouseEvent) => void;
  private moveHandler: (e: MouseEvent) => void;
  private keyHandler: (e: KeyboardEvent) => void;
  private leaveHandler: () => void;

  constructor(canvas: HTMLCanvasElement, state: ConnectFourState, onExit: () => void,
    onColumnClick: (col: number) => void, onModeSelect: (mode: 'ai' | '2player') => void, onRestart: () => void) {
    this.canvas = canvas; this.state = state; this.onExit = onExit;
    this.onColumnClick = onColumnClick; this.onModeSelect = onModeSelect; this.onRestart = onRestart;
    this.clickHandler = (e) => this.handleClick(e);
    this.moveHandler = (e) => this.handleMove(e);
    this.keyHandler = (e) => this.handleKey(e);
    this.leaveHandler = () => { this.state.hoverCol = -1; };
  }

  attach(): void {
    this.canvas.addEventListener('click', this.clickHandler);
    this.canvas.addEventListener('mousemove', this.moveHandler);
    this.canvas.addEventListener('mouseleave', this.leaveHandler);
    window.addEventListener('keydown', this.keyHandler);
  }

  detach(): void {
    this.canvas.removeEventListener('click', this.clickHandler);
    this.canvas.removeEventListener('mousemove', this.moveHandler);
    this.canvas.removeEventListener('mouseleave', this.leaveHandler);
    window.removeEventListener('keydown', this.keyHandler);
  }

  private handleClick(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left; const my = e.clientY - rect.top;
    if (this.state.showModeSelect) { this.handleModeSelectClick(mx, my); return; }
    if (this.state.gameOver) { this.onRestart(); return; }
    const col = this.getColumnAtPosition(mx);
    if (col >= 0) this.onColumnClick(col);
  }

  private handleMove(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    this.state.hoverCol = this.getColumnAtPosition(e.clientX - rect.left);
  }

  private handleKey(e: KeyboardEvent): void {
    if (e.key === 'Escape') this.onExit();
    else if (e.key === 'r' || e.key === 'R') this.onRestart();
    else if (e.key === 'm' || e.key === 'M') { this.state.showModeSelect = true; this.state.gameOver = false; }
  }

  private handleModeSelectClick(mx: number, my: number): void {
    const W = this.state.canvasWidth; const H = this.state.canvasHeight;
    const btnW = 200; const btnH = 50;
    const aiX = W / 2 - btnW / 2; const aiY = H / 2 - 10 - btnH;
    if (mx >= aiX && mx <= aiX + btnW && my >= aiY && my <= aiY + btnH) { this.onModeSelect('ai'); return; }
    const twoX = W / 2 - btnW / 2; const twoY = H / 2 + 10;
    if (mx >= twoX && mx <= twoX + btnW && my >= twoY && my <= twoY + btnH) this.onModeSelect('2player');
  }

  private getColumnAtPosition(mx: number): number {
    const s = this.state;
    const cellSize = Math.min((s.canvasWidth - 40) / COLS, (s.canvasHeight - 140) / (ROWS + 1));
    const boardW = cellSize * COLS; const boardX = (s.canvasWidth - boardW) / 2;
    const col = Math.floor((mx - boardX) / cellSize);
    return (col >= 0 && col < COLS) ? col : -1;
  }
}
```

---

### 3. Final Engine

**File:** `src/contexts/canvas2d/games/connect-four/ConnectFourEngine.ts`

Complete engine with mode selection, restart, and all systems.

```typescript
import type { ConnectFourState, GameMode } from './types';
import { COLS, ROWS } from './types';
import { InputSystem } from './systems/InputSystem';
import { BoardSystem } from './systems/BoardSystem';
import { AISystem } from './systems/AISystem';
import { BoardRenderer } from './renderers/BoardRenderer';
import { HUDRenderer } from './renderers/HUDRenderer';

export class ConnectFourEngine {
  private ctx: CanvasRenderingContext2D;
  private state: ConnectFourState;
  private running = false;
  private rafId = 0;
  private lastTime = 0;
  private inputSystem: InputSystem;
  private boardSystem: BoardSystem;
  private aiSystem: AISystem;
  private boardRenderer: BoardRenderer;
  private hudRenderer: HUDRenderer;
  private resizeHandler: () => void;

  constructor(canvas: HTMLCanvasElement, onExit: () => void) {
    this.ctx = canvas.getContext('2d')!;
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    this.state = this.createInitialState(canvas.width, canvas.height);
    this.boardSystem = new BoardSystem();
    this.aiSystem = new AISystem();
    this.boardRenderer = new BoardRenderer();
    this.hudRenderer = new HUDRenderer();
    this.inputSystem = new InputSystem(canvas, this.state, onExit,
      (col) => this.onColumnClick(col),
      (mode) => this.onModeSelect(mode),
      () => this.resetBoard(),
    );
    this.resizeHandler = () => {
      canvas.width = window.innerWidth; canvas.height = window.innerHeight;
      this.state.canvasWidth = canvas.width; this.state.canvasHeight = canvas.height;
    };
    this.inputSystem.attach(); window.addEventListener('resize', this.resizeHandler);
  }

  start(): void { this.running = true; this.lastTime = performance.now(); this.loop(); }
  destroy(): void { this.running = false; cancelAnimationFrame(this.rafId); this.inputSystem.detach(); window.removeEventListener('resize', this.resizeHandler); }

  private loop(): void {
    if (!this.running) return;
    const now = performance.now(); const dt = now - this.lastTime; this.lastTime = now;
    if (!this.state.showModeSelect) { this.boardSystem.update(this.state, dt); this.aiSystem.update(this.state, dt); }
    if (this.state.activeDrop === null && this.state.dropQueue.length > 0 && !this.state.gameOver) {
      const next = this.state.dropQueue.shift()!;
      this.boardSystem.dropDisc(this.state, next.col, next.player);
    }
    this.boardRenderer.render(this.ctx, this.state);
    this.hudRenderer.render(this.ctx, this.state);
    this.rafId = requestAnimationFrame(() => this.loop());
  }

  private onColumnClick(col: number): void {
    if (this.state.showModeSelect || this.state.gameOver || this.state.aiThinking || this.state.activeDrop !== null) return;
    if (this.state.mode === 'ai' && this.state.currentPlayer === 'yellow') return;
    this.boardSystem.dropDisc(this.state, col, this.state.currentPlayer);
  }

  private onModeSelect(mode: GameMode): void {
    this.state.mode = mode; this.state.showModeSelect = false;
    this.state.scoreRed = 0; this.state.scoreYellow = 0; this.state.draws = 0;
    this.resetBoard();
  }

  private resetBoard(): void {
    this.state.board = this.createEmptyBoard();
    this.state.currentPlayer = 'red'; this.state.winner = null; this.state.winLine = null;
    this.state.isDraw = false; this.state.gameOver = false; this.state.aiThinking = false;
    this.state.activeDrop = null; this.state.dropQueue = []; this.state.hoverCol = -1;
    this.aiSystem.reset();
  }

  private createInitialState(w: number, h: number): ConnectFourState {
    return {
      board: this.createEmptyBoard(), currentPlayer: 'red', mode: 'ai',
      winner: null, winLine: null, isDraw: false, gameOver: false, paused: false,
      scoreRed: 0, scoreYellow: 0, draws: 0, canvasWidth: w, canvasHeight: h,
      aiThinking: false, showModeSelect: true, hoverCol: -1, animationTime: 0,
      activeDrop: null, dropQueue: [],
    };
  }

  private createEmptyBoard(): (null)[][] {
    const board: (null)[][] = [];
    for (let r = 0; r < ROWS; r++) { const row: null[] = []; for (let c = 0; c < COLS; c++) row.push(null); board.push(row); }
    return board;
  }
}
```

---

## Test It

1. **Run:** `npm run dev`
2. **Open:** the Connect Four game
3. **Observe:**
   - **Mode selection screen** appears with "vs AI" and "2 Players" buttons
   - Click "vs AI" -- play against the computer
   - Click "2 Players" -- take turns locally
   - The **scoreboard** at the top tracks wins and draws across games
   - Press **R** to restart, **M** to change mode, **ESC** to exit
   - "AI is thinking..." shows during the computer's turn

---

## What You Learned

- Building a mode selection screen with clickable button regions
- Tracking scores across multiple game rounds
- Keyboard shortcuts for game control
- Cleanly resetting board state while preserving scores
- Complete game flow from mode select to gameplay to game-over to restart

**Congratulations!** You have built a complete Connect Four game with disc dropping animations, four-direction win detection, a Minimax AI with alpha-beta pruning, mode selection, and score tracking.

**Next game:** [Sokoban](../29-sokoban/step-1.md) -- classic box-pushing puzzle!
