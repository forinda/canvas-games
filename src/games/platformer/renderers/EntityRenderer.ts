import type { Renderable } from '@shared/Renderable';
import type { PlatState } from '../types';

export class EntityRenderer implements Renderable<PlatState> {
  render(ctx: CanvasRenderingContext2D, state: PlatState): void {
    const s = state;

    ctx.save();
    ctx.translate(-s.camX, -s.camY);

    // Coins
    for (const c of s.coins) {
      if (c.collected) continue;
      const pulse = 0.8 + 0.2 * Math.sin(performance.now() * 0.005 + c.x);
      ctx.fillStyle = '#ffd700';
      ctx.shadowColor = '#ffd700';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(c.x, c.y, 8 * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Enemies
    for (const e of s.enemies) {
      if (e.y > 900) continue;
      ctx.fillStyle = '#e74c3c';
      ctx.fillRect(e.x, e.y, e.w, e.h);
      ctx.fillStyle = '#fff';
      ctx.font = `${e.w}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('\u{1F47E}', e.x + e.w / 2, e.y + e.h / 2);
    }

    // Player
    ctx.fillStyle = s.onGround ? '#60a5fa' : '#93c5fd';
    ctx.fillRect(s.px, s.py, s.pw, s.ph);
    // Eyes
    const eyeX = s.facing > 0 ? s.px + s.pw * 0.65 : s.px + s.pw * 0.2;
    ctx.fillStyle = '#fff';
    ctx.fillRect(eyeX, s.py + 6, 5, 6);
    ctx.fillStyle = '#000';
    ctx.fillRect(eyeX + (s.facing > 0 ? 2 : 0), s.py + 8, 3, 3);

    ctx.restore();
  }
}
