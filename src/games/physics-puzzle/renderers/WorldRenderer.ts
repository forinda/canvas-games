import type { Renderable } from '@shared/Renderable';
import type { PuzzleState } from '../types';

export class WorldRenderer implements Renderable<PuzzleState> {
  render(ctx: CanvasRenderingContext2D, state: PuzzleState): void {
    const canvas = ctx.canvas;
    const W = canvas.width, H = canvas.height;

    // Background
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#1a1020');
    grad.addColorStop(1, '#0a1520');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Bodies
    for (const b of state.bodies) {
      ctx.fillStyle = b.color;

      if (b.type === 'goal') {
        // Glowing goal
        ctx.shadowColor = '#4ade80';
        ctx.shadowBlur = 15;
        ctx.fillStyle = '#4ade80';
        ctx.fillRect(b.x, b.y, b.w, b.h);
        ctx.shadowBlur = 0;
        ctx.font = `${b.w}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('\u2B50', b.x + b.w / 2, b.y + b.h / 2);
      } else if (b.radius) {
        // Ball
        ctx.shadowColor = b.color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(b.x + b.w / 2, b.y + b.h / 2, b.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      } else {
        ctx.fillRect(b.x, b.y, b.w, b.h);
        ctx.strokeStyle = 'rgba(255,255,255,0.1)';
        ctx.lineWidth = 1;
        ctx.strokeRect(b.x, b.y, b.w, b.h);
      }
    }
  }
}
