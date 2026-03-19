import type { Renderable } from '@shared/Renderable.ts';
import type { ChessState } from '../types.ts';
import { PIECE_UNICODE } from '../data/pieces.ts';

export class HUDRenderer implements Renderable<ChessState> {
  render(ctx: CanvasRenderingContext2D, state: ChessState): void {
    if (state.showModeSelect) {
      this.drawModeSelect(ctx, state);
      return;
    }

    this.drawTurnIndicator(ctx, state);
    this.drawCapturedPieces(ctx, state);
    this.drawMoveHistory(ctx, state);
    this.drawStatusBar(ctx, state);

    if (state.gameOver) {
      this.drawGameOverOverlay(ctx, state);
    }
  }

  private drawModeSelect(ctx: CanvasRenderingContext2D, state: ChessState): void {
    const W = state.canvasWidth;
    const H = state.canvasHeight;

    ctx.fillStyle = '#1a1210';
    ctx.fillRect(0, 0, W, H);

    // Title
    ctx.font = 'bold 48px serif';
    ctx.fillStyle = '#d4a76a';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('\u265A Chess \u2654', W / 2, H / 2 - 120);

    ctx.font = '18px monospace';
    ctx.fillStyle = '#888';
    ctx.fillText('Select Game Mode', W / 2, H / 2 - 70);

    const btnW = 220;
    const btnH = 50;
    const centerX = W / 2;
    const centerY = H / 2;

    // AI button
    const aiX = centerX - btnW / 2;
    const aiY = centerY - 10 - btnH;
    ctx.fillStyle = '#5d4037';
    ctx.beginPath();
    ctx.roundRect(aiX, aiY, btnW, btnH, 10);
    ctx.fill();
    ctx.font = 'bold 18px monospace';
    ctx.fillStyle = '#fff';
    ctx.fillText('vs Computer (AI)', centerX, aiY + btnH / 2);

    // 2-player button
    const twoX = centerX - btnW / 2;
    const twoY = centerY + 10;
    ctx.fillStyle = '#37474f';
    ctx.beginPath();
    ctx.roundRect(twoX, twoY, btnW, btnH, 10);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillText('2 Players (Local)', centerX, twoY + btnH / 2);
  }

  private drawTurnIndicator(ctx: CanvasRenderingContext2D, state: ChessState): void {
    const boardLayout = this.getBoardLayout(state);
    const x = boardLayout.x;
    const y = boardLayout.y - 36;

    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    const turnText = state.aiThinking
      ? 'AI thinking...'
      : `${state.currentPlayer === 'white' ? 'White' : 'Black'} to move`;

    // Draw circle indicator
    ctx.fillStyle = state.currentPlayer === 'white' ? '#fff' : '#1a1a1a';
    ctx.strokeStyle = '#5d4037';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x + 10, y, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ddd';
    ctx.fillText(turnText, x + 26, y);

    if (state.isCheck && !state.gameOver) {
      ctx.fillStyle = '#ff4444';
      ctx.font = 'bold 14px monospace';
      ctx.fillText(' CHECK!', x + 26 + ctx.measureText(turnText).width, y);
    }

    // Mode indicator
    ctx.font = '12px monospace';
    ctx.fillStyle = '#666';
    ctx.textAlign = 'right';
    ctx.fillText(
      state.mode === 'ai' ? 'vs AI' : '2 Player',
      boardLayout.x + boardLayout.size,
      y,
    );
  }

  private drawCapturedPieces(ctx: CanvasRenderingContext2D, state: ChessState): void {
    const boardLayout = this.getBoardLayout(state);
    const x = boardLayout.x;
    const yTop = boardLayout.y + boardLayout.size + 12;
    const yBottom = boardLayout.y - 52;

    ctx.font = '18px serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    // Captured by white (black pieces taken)
    let px = x;
    ctx.fillStyle = '#ccc';
    for (const piece of state.capturedByWhite) {
      ctx.fillText(PIECE_UNICODE[piece.color][piece.type], px, yTop);
      px += 20;
    }

    // Captured by black (white pieces taken)
    px = x;
    for (const piece of state.capturedByBlack) {
      ctx.fillText(PIECE_UNICODE[piece.color][piece.type], px, yBottom);
      px += 20;
    }
  }

  private drawMoveHistory(ctx: CanvasRenderingContext2D, state: ChessState): void {
    const boardLayout = this.getBoardLayout(state);
    const panelX = boardLayout.x + boardLayout.size + 20;
    const panelY = boardLayout.y;
    const panelW = Math.min(200, state.canvasWidth - panelX - 10);
    const panelH = boardLayout.size;

    if (panelW < 60) return; // Not enough room

    // Background
    ctx.fillStyle = 'rgba(30, 24, 18, 0.9)';
    ctx.beginPath();
    ctx.roundRect(panelX, panelY, panelW, panelH, 8);
    ctx.fill();

    ctx.strokeStyle = '#5d4037';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(panelX, panelY, panelW, panelH, 8);
    ctx.stroke();

    // Title
    ctx.font = 'bold 13px monospace';
    ctx.fillStyle = '#d4a76a';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText('Moves', panelX + panelW / 2, panelY + 8);

    // Move list
    ctx.font = '12px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    const lineHeight = 18;
    const startY = panelY + 30;
    const maxLines = Math.floor((panelH - 40) / lineHeight);

    // Build move pairs
    const pairs: string[] = [];
    for (let i = 0; i < state.moveHistory.length; i += 2) {
      const moveNum = Math.floor(i / 2) + 1;
      const white = state.moveHistory[i]?.notation ?? '';
      const black = state.moveHistory[i + 1]?.notation ?? '';
      pairs.push(`${moveNum}. ${white}  ${black}`);
    }

    // Show last N moves that fit
    const visiblePairs = pairs.slice(-maxLines);
    const scrollOffset = pairs.length > maxLines ? pairs.length - maxLines : 0;

    for (let i = 0; i < visiblePairs.length; i++) {
      const moveIdx = (i + scrollOffset) * 2;
      const isLatest =
        moveIdx === state.moveHistory.length - 1 ||
        moveIdx === state.moveHistory.length - 2;

      ctx.fillStyle = isLatest ? '#e0c080' : '#999';
      ctx.fillText(visiblePairs[i], panelX + 8, startY + i * lineHeight);
    }

    if (state.moveHistory.length === 0) {
      ctx.fillStyle = '#555';
      ctx.textAlign = 'center';
      ctx.fillText('No moves yet', panelX + panelW / 2, startY + 20);
    }
  }

  private drawStatusBar(ctx: CanvasRenderingContext2D, state: ChessState): void {
    const y = state.canvasHeight - 28;
    ctx.font = '11px monospace';
    ctx.fillStyle = '#555';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      '[R] Restart  [M] Mode  [U] Undo  [H] Help  [ESC] Exit',
      state.canvasWidth / 2,
      y,
    );
  }

  private drawGameOverOverlay(ctx: CanvasRenderingContext2D, state: ChessState): void {
    const W = state.canvasWidth;
    const H = state.canvasHeight;

    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, W, H);

    const panelW = 340;
    const panelH = 160;
    const px = (W - panelW) / 2;
    const py = (H - panelH) / 2;

    ctx.fillStyle = '#1e1812';
    ctx.beginPath();
    ctx.roundRect(px, py, panelW, panelH, 12);
    ctx.fill();

    ctx.strokeStyle = '#d4a76a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(px, py, panelW, panelH, 12);
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (state.isCheckmate) {
      const winner = state.currentPlayer === 'white' ? 'Black' : 'White';
      ctx.font = 'bold 28px serif';
      ctx.fillStyle = '#d4a76a';
      ctx.fillText('Checkmate!', W / 2, py + 50);

      ctx.font = '18px monospace';
      ctx.fillStyle = '#ccc';
      ctx.fillText(`${winner} wins`, W / 2, py + 85);
    } else if (state.isStalemate) {
      ctx.font = 'bold 28px serif';
      ctx.fillStyle = '#d4a76a';
      ctx.fillText('Stalemate!', W / 2, py + 50);

      ctx.font = '18px monospace';
      ctx.fillStyle = '#ccc';
      ctx.fillText('Draw', W / 2, py + 85);
    }

    ctx.font = '14px monospace';
    ctx.fillStyle = '#888';
    ctx.fillText('Press [R] to play again', W / 2, py + 125);
  }

  private getBoardLayout(state: ChessState): {
    x: number;
    y: number;
    size: number;
  } {
    const size = Math.min(state.canvasWidth * 0.65, state.canvasHeight * 0.8);
    const x = (state.canvasWidth - size) / 2 - state.canvasWidth * 0.08;
    const y = (state.canvasHeight - size) / 2;
    return { x, y, size };
  }
}
