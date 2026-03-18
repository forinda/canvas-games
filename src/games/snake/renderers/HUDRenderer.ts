import type { Renderable } from '../../../shared/Renderable';
import type { SnakeState } from '../types';

export class HUDRenderer implements Renderable<SnakeState> {
  render(ctx: CanvasRenderingContext2D, state: SnakeState): void {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    // Score bar
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, W, 36);
    ctx.font = 'bold 14px monospace';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';

    // Exit button
    ctx.fillStyle = '#666';
    ctx.fillText('< EXIT', 12, 18);

    ctx.fillStyle = '#4ade80';
    ctx.textAlign = 'center';
    ctx.fillText(`Score: ${state.score}`, W / 2, 18);

    if (state.highScore > 0) {
      ctx.fillStyle = '#666';
      ctx.textAlign = 'right';
      ctx.fillText(`Best: ${state.highScore}`, W - 12, 18);
    }

    // Overlays
    if (!state.started) {
      this.drawOverlay(ctx, W, H, 'SNAKE', 'Press ARROW KEYS or WASD to start', '#4ade80');
    } else if (state.gameOver) {
      this.drawOverlay(ctx, W, H, 'GAME OVER', `Score: ${state.score}  |  Click or SPACE to restart`, '#ef4444');
    } else if (state.paused) {
      this.drawOverlay(ctx, W, H, 'PAUSED', 'Press P to resume', '#f59e0b');
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
    ctx.fillText(title, W / 2, H * 0.38);
    ctx.shadowBlur = 0;
    ctx.font = `${Math.min(18, W * 0.025)}px monospace`;
    ctx.fillStyle = '#aaa';
    ctx.fillText(sub, W / 2, H * 0.50);
  }
}
