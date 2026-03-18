import type { Renderable } from '@shared/Renderable';
import type { ReactionState } from '../types';

export class HUDRenderer implements Renderable<ReactionState> {
  render(ctx: CanvasRenderingContext2D, state: ReactionState): void {
    if (state.finished) return;

    const W = ctx.canvas.width;
    const pad = 16;

    // Exit button (top-left)
    ctx.font = `bold ${Math.min(14, W * 0.02)}px monospace`;
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('← ESC', pad, pad);

    // Help hint (top-right)
    ctx.textAlign = 'right';
    ctx.fillText('[H] Help', W - pad, pad);

    // Recent attempts overlay (top-right, below help)
    if (state.attempts.length > 0) {
      const last5 = state.attempts.slice(-5);
      const valid = state.attempts.filter(a => !a.tooEarly);
      const avg = valid.length > 0
        ? Math.round(valid.reduce((s, a) => s + a.reactionMs, 0) / valid.length)
        : 0;
      const best = valid.length > 0
        ? Math.min(...valid.map(a => a.reactionMs))
        : 0;

      ctx.font = `${Math.min(13, W * 0.018)}px monospace`;
      let y = pad + 30;

      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      const boxH = last5.length * 20 + (valid.length > 0 ? 50 : 10);
      ctx.fillRect(W - 200 - pad, y - 4, 200, boxH);

      ctx.textAlign = 'right';
      ctx.textBaseline = 'top';

      for (let i = 0; i < last5.length; i++) {
        const a = last5[i];
        const idx = state.attempts.length - last5.length + i + 1;
        if (a.tooEarly) {
          ctx.fillStyle = '#ff6666';
          ctx.fillText(`#${idx}: Too early`, W - pad - 8, y);
        } else {
          ctx.fillStyle = '#aaffaa';
          ctx.fillText(`#${idx}: ${a.reactionMs} ms`, W - pad - 8, y);
        }
        y += 20;
      }

      if (valid.length > 0) {
        y += 6;
        ctx.fillStyle = '#ffcc00';
        ctx.fillText(`Avg: ${avg} ms`, W - pad - 8, y);
        y += 18;
        ctx.fillStyle = '#00ffcc';
        ctx.fillText(`Best: ${best} ms`, W - pad - 8, y);
      }
    }

    // All-time best (bottom-left)
    if (state.bestAllTime > 0) {
      ctx.font = `${Math.min(14, W * 0.02)}px monospace`;
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      ctx.fillText(`All-time best: ${state.bestAllTime} ms`, pad, ctx.canvas.height - pad);
    }
  }
}
