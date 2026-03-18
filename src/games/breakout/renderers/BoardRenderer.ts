import type { Renderable } from '@shared/Renderable';
import type { BreakoutState } from '../types';

export class BoardRenderer implements Renderable<BreakoutState> {
  render(ctx: CanvasRenderingContext2D, state: BreakoutState): void {
    const W = state.canvasW;
    const H = state.canvasH;

    // Background
    ctx.fillStyle = '#0a0a18';
    ctx.fillRect(0, 0, W, H);

    // Subtle grid
    ctx.strokeStyle = 'rgba(255,255,255,0.02)';
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let y = 0; y < H; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }

    // Bricks
    for (const brick of state.bricks) {
      if (!brick.alive) continue;
      this.drawBrick(ctx, brick);
    }

    // Paddle
    this.drawPaddle(ctx, state);

    // Balls
    for (const ball of state.balls) {
      this.drawBall(ctx, ball);
    }

    // Powerups
    for (const p of state.powerups) {
      if (!p.alive) continue;
      this.drawPowerup(ctx, p);
    }
  }

  private drawBrick(
    ctx: CanvasRenderingContext2D,
    brick: { x: number; y: number; w: number; h: number; hp: number; maxHp: number; color: string },
  ): void {
    const hpRatio = brick.hp / brick.maxHp;

    // Darken brick as it takes damage
    ctx.fillStyle = brick.color;
    ctx.globalAlpha = 0.4 + 0.6 * hpRatio;
    ctx.shadowColor = brick.color;
    ctx.shadowBlur = 4;

    // Rounded rect
    const r = 3;
    ctx.beginPath();
    ctx.moveTo(brick.x + r, brick.y);
    ctx.lineTo(brick.x + brick.w - r, brick.y);
    ctx.quadraticCurveTo(brick.x + brick.w, brick.y, brick.x + brick.w, brick.y + r);
    ctx.lineTo(brick.x + brick.w, brick.y + brick.h - r);
    ctx.quadraticCurveTo(brick.x + brick.w, brick.y + brick.h, brick.x + brick.w - r, brick.y + brick.h);
    ctx.lineTo(brick.x + r, brick.y + brick.h);
    ctx.quadraticCurveTo(brick.x, brick.y + brick.h, brick.x, brick.y + brick.h - r);
    ctx.lineTo(brick.x, brick.y + r);
    ctx.quadraticCurveTo(brick.x, brick.y, brick.x + r, brick.y);
    ctx.closePath();
    ctx.fill();

    // HP indicator for multi-hp bricks
    if (brick.maxHp > 1) {
      ctx.globalAlpha = 0.8;
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        String(brick.hp),
        brick.x + brick.w / 2,
        brick.y + brick.h / 2,
      );
    }

    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }

  private drawPaddle(ctx: CanvasRenderingContext2D, state: BreakoutState): void {
    const p = state.paddle;

    // Check for active wide effect
    const isWide = state.effects.some((e) => e.type === 'wide' && e.remaining > 0);
    const color = isWide ? '#f39c12' : '#3498db';

    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;

    // Rounded paddle
    const r = p.h / 2;
    ctx.beginPath();
    ctx.moveTo(p.x + r, p.y);
    ctx.lineTo(p.x + p.w - r, p.y);
    ctx.arc(p.x + p.w - r, p.y + r, r, -Math.PI / 2, Math.PI / 2);
    ctx.lineTo(p.x + r, p.y + p.h);
    ctx.arc(p.x + r, p.y + r, r, Math.PI / 2, (3 * Math.PI) / 2);
    ctx.closePath();
    ctx.fill();

    ctx.shadowBlur = 0;
  }

  private drawBall(
    ctx: CanvasRenderingContext2D,
    ball: { x: number; y: number; r: number },
  ): void {
    const pulse = 0.85 + 0.15 * Math.sin(performance.now() * 0.008);
    ctx.fillStyle = '#ecf0f1';
    ctx.shadowColor = '#ecf0f1';
    ctx.shadowBlur = 12 * pulse;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  private drawPowerup(
    ctx: CanvasRenderingContext2D,
    p: { x: number; y: number; w: number; h: number; type: string },
  ): void {
    const colors: Record<string, string> = {
      wide: '#f39c12',
      multiball: '#2ecc71',
      slow: '#9b59b6',
    };
    const icons: Record<string, string> = {
      wide: 'W',
      multiball: 'M',
      slow: 'S',
    };

    const color = colors[p.type] ?? '#fff';

    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(p.x + p.w / 2, p.y + p.h / 2, p.w / 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(icons[p.type] ?? '?', p.x + p.w / 2, p.y + p.h / 2);
  }
}
