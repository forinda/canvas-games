import type { Renderable } from '@shared/Renderable';
import type { CheckersState, Cell } from '../types';
import { BOARD_SIZE, cellsEqual } from '../types';

export class BoardRenderer implements Renderable<CheckersState> {
  render(ctx: CanvasRenderingContext2D, state: CheckersState): void {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    // Background
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, W, H);

    if (state.showModeSelector) return;

    const layout = this.getBoardLayout(W, H);
    this.drawBoard(ctx, state, layout);
    this.drawPieces(ctx, state, layout);
  }

  private getBoardLayout(W: number, H: number): { x: number; y: number; size: number; cellSize: number } {
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
    layout: { x: number; y: number; size: number; cellSize: number }
  ): void {
    const { x, y, cellSize } = layout;

    // Board border
    ctx.strokeStyle = '#8B4513';
    ctx.lineWidth = 4;
    ctx.strokeRect(x - 4, y - 4, BOARD_SIZE * cellSize + 8, BOARD_SIZE * cellSize + 8);

    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const cx = x + c * cellSize;
        const cy = y + r * cellSize;
        const isDark = (r + c) % 2 === 1;

        // Base cell color
        ctx.fillStyle = isDark ? '#8B4513' : '#D2B48C';
        ctx.fillRect(cx, cy, cellSize, cellSize);

        // Last move highlight
        if (state.lastMove) {
          const cell: Cell = { row: r, col: c };
          if (cellsEqual(cell, state.lastMove.from) || cellsEqual(cell, state.lastMove.to)) {
            ctx.fillStyle = 'rgba(255, 255, 0, 0.2)';
            ctx.fillRect(cx, cy, cellSize, cellSize);
          }
        }

        // Selected cell highlight
        if (state.selectedCell && state.selectedCell.row === r && state.selectedCell.col === c) {
          ctx.fillStyle = 'rgba(0, 200, 255, 0.35)';
          ctx.fillRect(cx, cy, cellSize, cellSize);

          ctx.strokeStyle = '#00c8ff';
          ctx.lineWidth = 2;
          ctx.strokeRect(cx + 1, cy + 1, cellSize - 2, cellSize - 2);
        }

        // Legal move indicators
        if (state.legalMovesForSelected.length > 0) {
          for (const move of state.legalMovesForSelected) {
            if (move.to.row === r && move.to.col === c) {
              if (move.captures.length > 0) {
                // Jump indicator (red tint)
                ctx.fillStyle = 'rgba(255, 80, 80, 0.35)';
                ctx.fillRect(cx, cy, cellSize, cellSize);
              }
              // Dot indicator
              ctx.fillStyle = 'rgba(0, 255, 100, 0.5)';
              ctx.beginPath();
              ctx.arc(cx + cellSize / 2, cy + cellSize / 2, cellSize * 0.15, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }
      }
    }

    // Row/column labels
    ctx.font = `${Math.max(10, cellSize * 0.22)}px monospace`;
    ctx.fillStyle = '#888';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < BOARD_SIZE; i++) {
      // Row numbers
      ctx.fillText(`${BOARD_SIZE - i}`, x - 16, y + i * cellSize + cellSize / 2);
      // Column letters
      ctx.fillText(String.fromCharCode(65 + i), x + i * cellSize + cellSize / 2, y + BOARD_SIZE * cellSize + 16);
    }
  }

  private drawPieces(
    ctx: CanvasRenderingContext2D,
    state: CheckersState,
    layout: { x: number; y: number; size: number; cellSize: number }
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
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.arc(cx + 2, cy + 3, pieceRadius, 0, Math.PI * 2);
        ctx.fill();

        // Piece body
        const gradient = ctx.createRadialGradient(
          cx - pieceRadius * 0.3,
          cy - pieceRadius * 0.3,
          pieceRadius * 0.1,
          cx,
          cy,
          pieceRadius
        );
        if (piece.color === 'red') {
          gradient.addColorStop(0, '#ff4444');
          gradient.addColorStop(1, '#aa0000');
        } else {
          gradient.addColorStop(0, '#555555');
          gradient.addColorStop(1, '#111111');
        }
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(cx, cy, pieceRadius, 0, Math.PI * 2);
        ctx.fill();

        // Piece border
        ctx.strokeStyle = piece.color === 'red' ? '#cc0000' : '#333333';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, pieceRadius, 0, Math.PI * 2);
        ctx.stroke();

        // Inner ring
        ctx.strokeStyle = piece.color === 'red' ? '#ff6666' : '#444444';
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
    color: string
  ): void {
    const crownColor = color === 'red' ? '#FFD700' : '#FFD700';
    ctx.fillStyle = crownColor;
    ctx.strokeStyle = color === 'red' ? '#B8860B' : '#B8860B';
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
    ctx.fillStyle = color === 'red' ? '#cc0000' : '#222';
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
