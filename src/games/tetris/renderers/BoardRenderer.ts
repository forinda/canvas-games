import type { Renderable } from '@shared/Renderable';
import type { TetrisState } from '../types';
import { COLS, ROWS } from '../types';
import { PIECES } from '../data/pieces';
import { BoardSystem } from '../systems/BoardSystem';

export class BoardRenderer implements Renderable<TetrisState> {
  private boardSystem: BoardSystem;

  constructor(boardSystem: BoardSystem) {
    this.boardSystem = boardSystem;
  }

  render(ctx: CanvasRenderingContext2D, state: TetrisState): void {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    // Calculate cell size and board position (centered)
    const cellSize = Math.floor(Math.min((H - 40) / ROWS, (W * 0.5) / COLS));
    const boardW = cellSize * COLS;
    const boardH = cellSize * ROWS;
    const offsetX = Math.floor((W - boardW) / 2);
    const offsetY = Math.floor((H - boardH) / 2);

    // Background
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, W, H);

    // Board background
    ctx.fillStyle = '#111122';
    ctx.fillRect(offsetX, offsetY, boardW, boardH);

    // Grid lines
    ctx.strokeStyle = '#1a1a33';
    ctx.lineWidth = 0.5;
    for (let r = 0; r <= ROWS; r++) {
      ctx.beginPath();
      ctx.moveTo(offsetX, offsetY + r * cellSize);
      ctx.lineTo(offsetX + boardW, offsetY + r * cellSize);
      ctx.stroke();
    }
    for (let c = 0; c <= COLS; c++) {
      ctx.beginPath();
      ctx.moveTo(offsetX + c * cellSize, offsetY);
      ctx.lineTo(offsetX + c * cellSize, offsetY + boardH);
      ctx.stroke();
    }

    // Placed blocks
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const color = state.board[r][c];
        if (color) {
          // Check if this row is being cleared (flash animation)
          if (state.clearingLines.includes(r)) {
            const flash = Math.sin(state.clearTimer * 0.02) > 0;
            if (flash) {
              this.drawCell(ctx, offsetX + c * cellSize, offsetY + r * cellSize, cellSize, '#ffffff');
            } else {
              this.drawCell(ctx, offsetX + c * cellSize, offsetY + r * cellSize, cellSize, color);
            }
          } else {
            this.drawCell(ctx, offsetX + c * cellSize, offsetY + r * cellSize, cellSize, color);
          }
        }
      }
    }

    // Ghost piece
    if (state.currentPiece && state.clearingLines.length === 0) {
      const ghostY = this.boardSystem.getGhostY(state);
      const piece = state.currentPiece;
      const def = PIECES[piece.defIndex];
      const cells = def.rotations[piece.rotation];
      for (const [row, col] of cells) {
        const bx = piece.x + col;
        const by = ghostY + row;
        if (by >= 0 && by < ROWS && bx >= 0 && bx < COLS) {
          const px = offsetX + bx * cellSize;
          const py = offsetY + by * cellSize;
          ctx.strokeStyle = def.color;
          ctx.globalAlpha = 0.3;
          ctx.lineWidth = 2;
          ctx.strokeRect(px + 1, py + 1, cellSize - 2, cellSize - 2);
          ctx.globalAlpha = 1;
        }
      }
    }

    // Current piece
    if (state.currentPiece && state.clearingLines.length === 0) {
      const piece = state.currentPiece;
      const def = PIECES[piece.defIndex];
      const cells = def.rotations[piece.rotation];
      for (const [row, col] of cells) {
        const bx = piece.x + col;
        const by = piece.y + row;
        if (by >= 0 && by < ROWS && bx >= 0 && bx < COLS) {
          this.drawCell(ctx, offsetX + bx * cellSize, offsetY + by * cellSize, cellSize, def.color);
        }
      }
    }

    // Board border
    ctx.strokeStyle = '#334';
    ctx.lineWidth = 2;
    ctx.strokeRect(offsetX - 1, offsetY - 1, boardW + 2, boardH + 2);
  }

  private drawCell(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string): void {
    const gap = 1;
    ctx.fillStyle = color;
    ctx.fillRect(x + gap, y + gap, size - gap * 2, size - gap * 2);

    // Highlight (top-left)
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(x + gap, y + gap, size - gap * 2, 2);
    ctx.fillRect(x + gap, y + gap, 2, size - gap * 2);

    // Shadow (bottom-right)
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(x + gap, y + size - gap - 2, size - gap * 2, 2);
    ctx.fillRect(x + size - gap - 2, y + gap, 2, size - gap * 2);
  }
}
