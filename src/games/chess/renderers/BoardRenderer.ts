import type { Renderable } from '@shared/Renderable.ts';
import type { ChessState, PieceType, PieceColor } from '../types.ts';
import { BOARD_SIZE } from '../types.ts';
import { PIECE_UNICODE } from '../data/pieces.ts';

const LIGHT_SQUARE = '#f0d9b5';
const DARK_SQUARE = '#b58863';
const SELECTED_COLOR = 'rgba(255, 255, 0, 0.4)';
const LEGAL_MOVE_COLOR = 'rgba(0, 0, 0, 0.2)';
const LAST_MOVE_COLOR = 'rgba(155, 199, 0, 0.41)';
const CHECK_COLOR = 'rgba(255, 0, 0, 0.5)';
const LEGAL_CAPTURE_COLOR = 'rgba(0, 0, 0, 0.2)';

export class BoardRenderer implements Renderable<ChessState> {
  render(ctx: CanvasRenderingContext2D, state: ChessState): void {
    const layout = this.getLayout(state);

    this.drawBoard(ctx, state, layout);
    this.drawCoordinates(ctx, layout);
    this.drawPieces(ctx, state, layout);

    if (state.pendingPromotion) {
      this.drawPromotionPicker(ctx, state, layout);
    }
  }

  getLayout(state: ChessState): {
    x: number;
    y: number;
    size: number;
    cellSize: number;
  } {
    const size = Math.min(state.canvasWidth * 0.65, state.canvasHeight * 0.8);
    const cellSize = size / BOARD_SIZE;
    const x = (state.canvasWidth - size) / 2 - state.canvasWidth * 0.08;
    const y = (state.canvasHeight - size) / 2;
    return { x, y, size, cellSize };
  }

  private drawBoard(
    ctx: CanvasRenderingContext2D,
    state: ChessState,
    layout: { x: number; y: number; size: number; cellSize: number },
  ): void {
    const { x, y, cellSize } = layout;

    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        const isLight = (row + col) % 2 === 0;
        const sx = x + col * cellSize;
        const sy = y + row * cellSize;

        // Base square color
        ctx.fillStyle = isLight ? LIGHT_SQUARE : DARK_SQUARE;
        ctx.fillRect(sx, sy, cellSize, cellSize);

        // Last move highlight
        if (state.lastMove) {
          const { from, to } = state.lastMove;
          if (
            (row === from.row && col === from.col) ||
            (row === to.row && col === to.col)
          ) {
            ctx.fillStyle = LAST_MOVE_COLOR;
            ctx.fillRect(sx, sy, cellSize, cellSize);
          }
        }

        // Selected piece highlight
        if (
          state.selectedPosition &&
          state.selectedPosition.row === row &&
          state.selectedPosition.col === col
        ) {
          ctx.fillStyle = SELECTED_COLOR;
          ctx.fillRect(sx, sy, cellSize, cellSize);
        }

        // Check highlight on king
        if (state.isCheck) {
          const kingPos = state.kingPositions[state.currentPlayer];
          if (kingPos && kingPos.row === row && kingPos.col === col) {
            ctx.fillStyle = CHECK_COLOR;
            ctx.fillRect(sx, sy, cellSize, cellSize);
          }
        }

        // Legal move indicators
        const isLegalTarget = state.legalMoves.some(
          (m) => m.row === row && m.col === col,
        );
        if (isLegalTarget) {
          const piece = state.board[row][col];
          if (piece) {
            // Capture indicator: ring around the square
            ctx.strokeStyle = LEGAL_CAPTURE_COLOR;
            ctx.lineWidth = cellSize * 0.08;
            ctx.beginPath();
            ctx.arc(
              sx + cellSize / 2,
              sy + cellSize / 2,
              cellSize * 0.46,
              0,
              Math.PI * 2,
            );
            ctx.stroke();
          } else {
            // Empty square: dot
            ctx.fillStyle = LEGAL_MOVE_COLOR;
            ctx.beginPath();
            ctx.arc(
              sx + cellSize / 2,
              sy + cellSize / 2,
              cellSize * 0.15,
              0,
              Math.PI * 2,
            );
            ctx.fill();
          }
        }
      }
    }

    // Board border
    ctx.strokeStyle = '#5d4037';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, layout.size, layout.size);
  }

  private drawCoordinates(
    ctx: CanvasRenderingContext2D,
    layout: { x: number; y: number; cellSize: number },
  ): void {
    const { x, y, cellSize } = layout;
    const fontSize = Math.max(10, cellSize * 0.18);
    ctx.font = `${fontSize}px monospace`;
    ctx.textBaseline = 'top';

    for (let row = 0; row < BOARD_SIZE; row++) {
      // Rank numbers (8..1)
      const rank = String(BOARD_SIZE - row);
      const isLight = row % 2 === 0;
      ctx.fillStyle = isLight ? DARK_SQUARE : LIGHT_SQUARE;
      ctx.textAlign = 'left';
      ctx.fillText(rank, x + 2, y + row * cellSize + 2);
    }

    for (let col = 0; col < BOARD_SIZE; col++) {
      // File letters (a..h)
      const file = String.fromCharCode(97 + col);
      const isLight = (7 + col) % 2 === 0;
      ctx.fillStyle = isLight ? DARK_SQUARE : LIGHT_SQUARE;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';
      ctx.fillText(
        file,
        x + (col + 1) * cellSize - 2,
        y + BOARD_SIZE * cellSize - 2,
      );
    }
  }

  private drawPieces(
    ctx: CanvasRenderingContext2D,
    state: ChessState,
    layout: { x: number; y: number; cellSize: number },
  ): void {
    const { x, y, cellSize } = layout;
    const fontSize = cellSize * 0.75;
    ctx.font = `${fontSize}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        const piece = state.board[row][col];
        if (!piece) continue;

        const char = PIECE_UNICODE[piece.color][piece.type];
        const px = x + col * cellSize + cellSize / 2;
        const py = y + row * cellSize + cellSize / 2;

        // Draw shadow for better visibility
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillText(char, px + 1, py + 1);

        ctx.fillStyle = piece.color === 'white' ? '#ffffff' : '#1a1a1a';
        ctx.fillText(char, px, py);
      }
    }
  }

  private drawPromotionPicker(
    ctx: CanvasRenderingContext2D,
    state: ChessState,
    layout: { x: number; y: number; size: number; cellSize: number },
  ): void {
    const promo = state.pendingPromotion;
    if (!promo) return;

    const { x, y, cellSize } = layout;
    const choices: PieceType[] = ['queen', 'rook', 'bishop', 'knight'];
    const piece = state.board[promo.row][promo.col];
    const color: PieceColor = piece ? piece.color : 'white';
    const goingDown = promo.row === 0;

    // Semi-transparent overlay behind the board
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(x, y, layout.size, layout.size);

    const pickerX = x + promo.col * cellSize;

    for (let i = 0; i < choices.length; i++) {
      const pickerY = goingDown
        ? y + i * cellSize
        : y + (BOARD_SIZE - 1 - i) * cellSize;

      // Background
      ctx.fillStyle = i % 2 === 0 ? '#f0f0f0' : '#d0d0d0';
      ctx.fillRect(pickerX, pickerY, cellSize, cellSize);

      // Border
      ctx.strokeStyle = '#5d4037';
      ctx.lineWidth = 2;
      ctx.strokeRect(pickerX, pickerY, cellSize, cellSize);

      // Piece icon
      const char = PIECE_UNICODE[color][choices[i]];
      const fontSize = cellSize * 0.75;
      ctx.font = `${fontSize}px serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillText(char, pickerX + cellSize / 2 + 1, pickerY + cellSize / 2 + 1);

      ctx.fillStyle = color === 'white' ? '#ffffff' : '#1a1a1a';
      ctx.fillText(char, pickerX + cellSize / 2, pickerY + cellSize / 2);
    }
  }
}
