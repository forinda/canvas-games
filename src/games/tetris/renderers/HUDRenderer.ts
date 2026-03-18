import type { Renderable } from '@shared/Renderable';
import type { TetrisState } from '../types';
import { COLS, ROWS } from '../types';
import { PIECES } from '../data/pieces';

export class HUDRenderer implements Renderable<TetrisState> {
  render(ctx: CanvasRenderingContext2D, state: TetrisState): void {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    const cellSize = Math.floor(Math.min((H - 40) / ROWS, (W * 0.5) / COLS));
    const boardW = cellSize * COLS;
    const offsetX = Math.floor((W - boardW) / 2);
    const offsetY = Math.floor((H - cellSize * ROWS) / 2);

    const rightX = offsetX + boardW + 30;
    const leftX = offsetX - 160;
    const previewCellSize = Math.floor(cellSize * 0.8);

    // Exit button
    ctx.fillStyle = '#445';
    ctx.fillRect(8, 8, 70, 28);
    ctx.fillStyle = '#aab';
    ctx.font = '14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('< Exit', 43, 27);

    // --- Right panel: Score info ---
    ctx.textAlign = 'left';
    ctx.font = 'bold 14px monospace';
    ctx.fillStyle = '#667';
    ctx.fillText('SCORE', rightX, offsetY + 20);
    ctx.font = 'bold 22px monospace';
    ctx.fillStyle = '#fff';
    ctx.fillText(String(state.score), rightX, offsetY + 48);

    ctx.font = 'bold 14px monospace';
    ctx.fillStyle = '#667';
    ctx.fillText('HIGH SCORE', rightX, offsetY + 80);
    ctx.font = 'bold 18px monospace';
    ctx.fillStyle = '#ffd600';
    ctx.fillText(String(state.highScore), rightX, offsetY + 104);

    ctx.font = 'bold 14px monospace';
    ctx.fillStyle = '#667';
    ctx.fillText('LEVEL', rightX, offsetY + 140);
    ctx.font = 'bold 20px monospace';
    ctx.fillStyle = '#0f0';
    ctx.fillText(String(state.level), rightX, offsetY + 164);

    ctx.font = 'bold 14px monospace';
    ctx.fillStyle = '#667';
    ctx.fillText('LINES', rightX, offsetY + 200);
    ctx.font = 'bold 20px monospace';
    ctx.fillStyle = '#0cf';
    ctx.fillText(String(state.lines), rightX, offsetY + 224);

    // --- Next piece preview ---
    ctx.font = 'bold 14px monospace';
    ctx.fillStyle = '#667';
    ctx.fillText('NEXT', rightX, offsetY + 270);

    const nextDef = PIECES[state.nextPieceIndex];
    const nextCells = nextDef.rotations[0];
    const previewY = offsetY + 280;
    ctx.fillStyle = '#111122';
    ctx.fillRect(rightX, previewY, previewCellSize * 5, previewCellSize * 4);
    ctx.strokeStyle = '#334';
    ctx.lineWidth = 1;
    ctx.strokeRect(rightX, previewY, previewCellSize * 5, previewCellSize * 4);

    for (const [row, col] of nextCells) {
      const px = rightX + 8 + col * previewCellSize;
      const py = previewY + 8 + row * previewCellSize;
      this.drawMiniCell(ctx, px, py, previewCellSize, nextDef.color);
    }

    // --- Left panel: Controls ---
    if (leftX > 10) {
      ctx.textAlign = 'left';
      ctx.font = 'bold 14px monospace';
      ctx.fillStyle = '#667';
      ctx.fillText('CONTROLS', leftX, offsetY + 20);

      ctx.font = '12px monospace';
      ctx.fillStyle = '#556';
      const controls = [
        ['\u2190 \u2192  Move', ''],
        ['\u2191     Rotate', ''],
        ['\u2193     Soft drop', ''],
        ['Space  Hard drop', ''],
        ['P      Pause', ''],
        ['Esc    Exit', ''],
      ];
      controls.forEach(([text], i) => {
        ctx.fillText(text, leftX, offsetY + 48 + i * 22);
      });
    }

    // --- Overlays ---
    if (!state.started) {
      this.drawOverlay(ctx, W, H, 'TETRIS', 'Press Enter or Space to start', '#00bcd4');
    } else if (state.gameOver) {
      this.drawOverlay(ctx, W, H, 'GAME OVER', `Score: ${state.score}  |  Click or press Enter to restart`, '#ff1744');
    } else if (state.paused) {
      this.drawOverlay(ctx, W, H, 'PAUSED', 'Press P to resume', '#ffd600');
    }
  }

  private drawOverlay(
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
    title: string,
    subtitle: string,
    color: string,
  ): void {
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, W, H);

    ctx.textAlign = 'center';
    ctx.font = 'bold 48px monospace';
    ctx.fillStyle = color;
    ctx.fillText(title, W / 2, H / 2 - 20);

    ctx.font = '16px monospace';
    ctx.fillStyle = '#aab';
    ctx.fillText(subtitle, W / 2, H / 2 + 30);
  }

  private drawMiniCell(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string): void {
    ctx.fillStyle = color;
    ctx.fillRect(x + 1, y + 1, size - 2, size - 2);
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(x + 1, y + 1, size - 2, 1);
    ctx.fillRect(x + 1, y + 1, 1, size - 2);
  }
}
