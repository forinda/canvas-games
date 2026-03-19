import type { InputHandler } from '@shared/InputHandler';
import type { CheckersState, Cell, Move } from '../types';
import { BOARD_SIZE, cellsEqual } from '../types';
import { MoveSystem } from './MoveSystem';
import { GameSystem } from './GameSystem';

export class InputSystem implements InputHandler {
  private state: CheckersState;
  private canvas: HTMLCanvasElement;
  private onExit: () => void;
  private onReset: () => void;
  private moveSystem: MoveSystem;
  private gameSystem: GameSystem;
  private keyHandler: (e: KeyboardEvent) => void;
  private clickHandler: (e: MouseEvent) => void;
  private onMoveComplete: () => void;

  constructor(
    state: CheckersState,
    canvas: HTMLCanvasElement,
    onExit: () => void,
    onReset: () => void,
    moveSystem: MoveSystem,
    gameSystem: GameSystem,
    onMoveComplete: () => void
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
    window.addEventListener('keydown', this.keyHandler);
    this.canvas.addEventListener('click', this.clickHandler);
  }

  detach(): void {
    window.removeEventListener('keydown', this.keyHandler);
    this.canvas.removeEventListener('click', this.clickHandler);
  }

  private handleKey(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      if (this.state.showModeSelector) {
        this.onExit();
      } else {
        this.state.showModeSelector = true;
        this.state.started = false;
      }
      return;
    }
    if (e.key === 'h' || e.key === 'H') {
      this.state.paused = !this.state.paused;
      return;
    }
    if (e.key === 'r' || e.key === 'R') {
      if (this.state.gameOver) {
        this.onReset();
      }
      return;
    }
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

    // Game over: restart
    if (s.gameOver) {
      if (mx > W * 0.3 && mx < W * 0.7 && my > H * 0.55 && my < H * 0.7) {
        this.onReset();
      }
      return;
    }

    if (s.paused || s.aiThinking) return;

    // In AI mode, only allow red (human) to play
    if (s.mode === 'ai' && s.currentTurn === 'black') return;

    // Convert click to board cell
    const boardInfo = this.getBoardLayout(W, H);
    const cell = this.pixelToCell(mx, my, boardInfo);
    if (!cell) return;

    this.handleCellClick(cell);
  }

  private handleModeSelectorClick(mx: number, my: number, W: number, H: number): void {
    const s = this.state;
    const cx = W / 2;
    const btnW = 220;
    const btnH = 50;

    // "vs AI" button
    const aiY = H / 2 - 35;
    if (mx > cx - btnW / 2 && mx < cx + btnW / 2 && my > aiY && my < aiY + btnH) {
      s.mode = 'ai';
      s.showModeSelector = false;
      s.started = true;
      return;
    }

    // "2 Player" button
    const tpY = H / 2 + 35;
    if (mx > cx - btnW / 2 && mx < cx + btnW / 2 && my > tpY && my < tpY + btnH) {
      s.mode = 'two-player';
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
      const move = s.legalMovesForSelected.find(m => cellsEqual(m.to, cell));
      if (move) {
        this.executeMove(move);
        return;
      }
    }

    // Select a piece of the current player's color
    if (piece && piece.color === s.currentTurn) {
      // If mid-chain jump, can only move the jumping piece
      if (s.mustContinueJump && !cellsEqual(cell, s.mustContinueJump)) return;

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
    this.moveSystem.applyMove(s, move);
    s.selectedCell = null;
    s.legalMovesForSelected = [];
    s.mustContinueJump = null;

    // After the move, switch turn
    this.gameSystem.switchTurn(s);
    this.onMoveComplete();
  }

  private getBoardLayout(W: number, H: number): { x: number; y: number; size: number; cellSize: number } {
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
    board: { x: number; y: number; size: number; cellSize: number }
  ): Cell | null {
    const col = Math.floor((mx - board.x) / board.cellSize);
    const row = Math.floor((my - board.y) / board.cellSize);
    if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) return null;
    return { row, col };
  }
}
