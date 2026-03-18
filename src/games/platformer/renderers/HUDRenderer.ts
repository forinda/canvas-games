import type { Renderable } from '@shared/Renderable';
import type { PlatState } from '../types';

export class HUDRenderer implements Renderable<PlatState> {
  private canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
  }

  render(ctx: CanvasRenderingContext2D, state: PlatState): void {
    const W = this.canvas.width;
    const H = this.canvas.height;
    const s = state;

    // Score bar
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, W, 40);
    ctx.font = 'bold 14px monospace';
    ctx.textBaseline = 'middle';

    ctx.fillStyle = '#666';
    ctx.textAlign = 'left';
    ctx.fillText('< EXIT', 12, 20);

    ctx.fillStyle = '#ffd700';
    ctx.textAlign = 'center';
    ctx.fillText(`Score: ${s.score}  |  Level ${s.level}`, W / 2, 20);

    ctx.fillStyle = '#ef4444';
    ctx.textAlign = 'right';
    ctx.fillText('\u2764\uFE0F'.repeat(s.lives), W - 12, 20);

    // Overlays
    if (!s.started) {
      this.drawOverlay(ctx, W, H, 'PLATFORMER', 'Arrow keys / WASD to move, Space to jump\nClick to start', '#60a5fa');
    } else if (s.gameOver) {
      this.drawOverlay(ctx, W, H, 'GAME OVER', `Score: ${s.score}  |  Click to restart`, '#ef4444');
    } else if (s.won) {
      this.drawOverlay(ctx, W, H, `LEVEL ${s.level} COMPLETE!`, `Score: ${s.score}  |  Click for next level`, '#4ade80');
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
    ctx.font = `bold ${Math.min(56, W * 0.07)}px monospace`;
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 20;
    ctx.fillText(title, W / 2, H * 0.35);
    ctx.shadowBlur = 0;

    ctx.font = `${Math.min(16, W * 0.02)}px monospace`;
    ctx.fillStyle = '#aaa';
    const lines = sub.split('\n');
    lines.forEach((line, i) => ctx.fillText(line, W / 2, H * 0.48 + i * 24));
  }
}
