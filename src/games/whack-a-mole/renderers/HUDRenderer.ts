import type { Renderable } from '@shared/Renderable';
import type { WhackState } from '../types';

const GAME_COLOR = '#8d6e63';

export class HUDRenderer implements Renderable<WhackState> {
  render(ctx: CanvasRenderingContext2D, state: WhackState): void {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    // Top bar
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, W, 36);
    ctx.font = 'bold 14px monospace';
    ctx.textBaseline = 'middle';

    // Exit button
    ctx.fillStyle = '#666';
    ctx.textAlign = 'left';
    ctx.fillText('< EXIT', 12, 18);

    // Score
    ctx.fillStyle = GAME_COLOR;
    ctx.textAlign = 'center';
    ctx.fillText(`Score: ${state.score}`, W / 2 - 80, 18);

    // Time
    const secs = Math.ceil(state.timeRemaining);
    const timeColor = secs <= 10 ? '#ef4444' : '#fff';
    ctx.fillStyle = timeColor;
    ctx.fillText(`Time: ${secs}s`, W / 2 + 80, 18);

    // Combo
    if (state.combo >= 2) {
      ctx.fillStyle = '#fbbf24';
      ctx.textAlign = 'center';
      ctx.fillText(`Combo x${Math.min(state.combo, 5)}!`, W / 2, 18);
    }

    // High score
    if (state.highScore > 0) {
      ctx.fillStyle = '#666';
      ctx.textAlign = 'right';
      ctx.fillText(`Best: ${state.highScore}`, W - 12, 18);
    }

    // Round indicator
    ctx.fillStyle = '#aaa';
    ctx.textAlign = 'left';
    ctx.font = '12px monospace';
    ctx.fillText(`Round ${state.round}`, 12, H - 12);

    // Phase overlays
    if (state.phase === 'ready') {
      this.drawOverlay(ctx, W, H, 'WHACK-A-MOLE', 'Click or press SPACE to start!', GAME_COLOR);
    } else if (state.phase === 'gameover') {
      this.drawGameOver(ctx, W, H, state);
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

  private drawGameOver(
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
    state: WhackState,
  ): void {
    ctx.fillStyle = 'rgba(0,0,0,0.8)';
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.font = `bold ${Math.min(56, W * 0.07)}px monospace`;
    ctx.fillStyle = '#ef4444';
    ctx.shadowColor = '#ef4444';
    ctx.shadowBlur = 20;
    ctx.fillText("TIME'S UP!", W / 2, H * 0.30);
    ctx.shadowBlur = 0;

    ctx.font = `bold ${Math.min(28, W * 0.04)}px monospace`;
    ctx.fillStyle = GAME_COLOR;
    ctx.fillText(`Final Score: ${state.score}`, W / 2, H * 0.42);

    ctx.font = `${Math.min(18, W * 0.025)}px monospace`;
    ctx.fillStyle = '#aaa';
    ctx.fillText(`Best Combo: x${state.maxCombo}`, W / 2, H * 0.50);

    if (state.score >= state.highScore && state.score > 0) {
      ctx.fillStyle = '#fbbf24';
      ctx.font = `bold ${Math.min(20, W * 0.028)}px monospace`;
      ctx.fillText('NEW HIGH SCORE!', W / 2, H * 0.57);
    }

    ctx.font = `${Math.min(16, W * 0.022)}px monospace`;
    ctx.fillStyle = '#888';
    ctx.fillText('Click or press SPACE to play again', W / 2, H * 0.65);
  }
}
