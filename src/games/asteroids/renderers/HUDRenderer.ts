import type { Renderable } from '@shared/Renderable';
import type { AsteroidsState } from '../types';

export class HUDRenderer implements Renderable<AsteroidsState> {
  render(ctx: CanvasRenderingContext2D, state: AsteroidsState): void {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    // Top bar
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, W, 40);

    ctx.font = 'bold 14px monospace';
    ctx.textBaseline = 'middle';

    // Exit button
    ctx.fillStyle = '#666';
    ctx.textAlign = 'left';
    ctx.fillText('< EXIT', 12, 20);

    // Score
    ctx.fillStyle = '#9b59b6';
    ctx.textAlign = 'center';
    ctx.fillText(`Score: ${state.score}`, W / 2, 20);

    // Wave
    ctx.fillStyle = '#888';
    ctx.textAlign = 'center';
    ctx.fillText(`Wave ${state.wave}`, W / 2 + 120, 20);

    // High score
    if (state.highScore > 0) {
      ctx.fillStyle = '#666';
      ctx.textAlign = 'right';
      ctx.fillText(`Best: ${state.highScore}`, W - 12, 20);
    }

    // Lives (small ship icons)
    this.drawLives(ctx, state);

    // Overlays
    if (!state.started) {
      this.drawOverlay(ctx, W, H, 'ASTEROIDS', 'Arrow keys to move, SPACE to shoot\nPress SPACE or ENTER to start', '#9b59b6');
    } else if (state.gameOver) {
      this.drawOverlay(ctx, W, H, 'GAME OVER', `Score: ${state.score}  |  Press SPACE to restart`, '#ef4444');
    } else if (state.paused) {
      this.drawOverlay(ctx, W, H, 'PAUSED', 'Press P to resume', '#f59e0b');
    }
  }

  private drawLives(ctx: CanvasRenderingContext2D, state: AsteroidsState): void {
    const startX = 100;
    const y = 20;
    const size = 8;
    ctx.strokeStyle = '#9b59b6';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < state.lives; i++) {
      const x = startX + i * 22;
      ctx.beginPath();
      ctx.moveTo(x, y - size);
      ctx.lineTo(x - size * 0.6, y + size * 0.5);
      ctx.lineTo(x, y + size * 0.2);
      ctx.lineTo(x + size * 0.6, y + size * 0.5);
      ctx.closePath();
      ctx.stroke();
    }
  }

  private drawOverlay(
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
    title: string,
    sub: string,
    color: string,
  ): void {
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `bold ${Math.min(64, W * 0.08)}px monospace`;
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 20;
    ctx.fillText(title, W / 2, H * 0.36);
    ctx.shadowBlur = 0;
    ctx.font = `${Math.min(18, W * 0.025)}px monospace`;
    ctx.fillStyle = '#aaa';
    const lines = sub.split('\n');
    lines.forEach((line, i) => {
      ctx.fillText(line, W / 2, H * 0.48 + i * 26);
    });
  }
}
