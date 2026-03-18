import type { Renderable } from '@shared/Renderable';
import type { BalloonState } from '../types';
import { MAX_LIVES } from '../types';

export class HUDRenderer implements Renderable<BalloonState> {
  render(ctx: CanvasRenderingContext2D, state: BalloonState): void {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    this.drawTopBar(ctx, state, W);
    this.drawCombo(ctx, state, W, H);

    if (state.phase === 'ready') {
      this.drawReadyOverlay(ctx, W, H);
    } else if (state.phase === 'gameover') {
      this.drawGameOverOverlay(ctx, state, W, H);
    } else if (state.paused) {
      this.drawPausedOverlay(ctx, W, H);
    }
  }

  private drawTopBar(ctx: CanvasRenderingContext2D, state: BalloonState, W: number): void {
    // Semi-transparent bar
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, W, 48);

    ctx.textBaseline = 'middle';
    const y = 24;

    // Exit button
    ctx.font = 'bold 14px monospace';
    ctx.fillStyle = '#ff6b6b';
    ctx.textAlign = 'left';
    ctx.fillText('< EXIT', 12, y);

    // Score
    ctx.font = 'bold 18px monospace';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.fillText(`Score: ${state.score}`, W / 2, y);

    // High score (smaller, below center)
    if (state.highScore > 0) {
      ctx.font = '11px monospace';
      ctx.fillStyle = '#aaa';
      ctx.fillText(`HI: ${state.highScore}`, W / 2, 42);
    }

    // Timer
    const secs = Math.ceil(state.timeRemaining);
    const mins = Math.floor(secs / 60);
    const secPart = secs % 60;
    const timeStr = `${mins}:${secPart.toString().padStart(2, '0')}`;
    ctx.font = 'bold 16px monospace';
    ctx.fillStyle = state.timeRemaining <= 10 ? '#ff4444' : '#ffd700';
    ctx.textAlign = 'right';
    ctx.fillText(timeStr, W - 14, y - 6);

    // Lives
    ctx.font = '14px monospace';
    ctx.textAlign = 'right';
    let livesStr = '';
    for (let i = 0; i < MAX_LIVES; i++) {
      livesStr += i < state.lives ? '\u2764' : '\u2661';
    }
    ctx.fillStyle = '#ff6b6b';
    ctx.fillText(livesStr, W - 14, y + 12);
  }

  private drawCombo(ctx: CanvasRenderingContext2D, state: BalloonState, W: number, _H: number): void {
    if (state.combo < 2 || state.phase !== 'playing') return;

    const alpha = Math.min(1, state.comboTimer / 500);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = `bold ${24 + state.combo * 2}px monospace`;
    ctx.fillStyle = '#ffd700';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`x${state.combo} COMBO!`, W / 2, 90);
    ctx.restore();
  }

  private drawReadyOverlay(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, W, H);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.font = `bold ${Math.min(48, W * 0.08)}px monospace`;
    ctx.fillStyle = '#e91e63';
    ctx.fillText('Balloon Pop', W / 2, H / 2 - 50);

    ctx.font = `${Math.min(20, W * 0.035)}px monospace`;
    ctx.fillStyle = '#ccc';
    ctx.fillText('Click or tap balloons to pop them!', W / 2, H / 2 + 10);

    ctx.font = `${Math.min(16, W * 0.028)}px monospace`;
    ctx.fillStyle = '#999';
    ctx.fillText('Smaller balloons = more points', W / 2, H / 2 + 40);

    ctx.font = `bold ${Math.min(18, W * 0.03)}px monospace`;
    ctx.fillStyle = '#ffd700';
    ctx.fillText('Press SPACE or click to start', W / 2, H / 2 + 85);

    ctx.font = `${Math.min(13, W * 0.022)}px monospace`;
    ctx.fillStyle = '#666';
    ctx.fillText('[P] Pause  |  [ESC] Exit', W / 2, H / 2 + 120);
  }

  private drawGameOverOverlay(ctx: CanvasRenderingContext2D, state: BalloonState, W: number, H: number): void {
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, W, H);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.font = `bold ${Math.min(42, W * 0.07)}px monospace`;
    ctx.fillStyle = '#ff4444';
    ctx.fillText('Game Over', W / 2, H / 2 - 70);

    ctx.font = `bold ${Math.min(28, W * 0.05)}px monospace`;
    ctx.fillStyle = '#fff';
    ctx.fillText(`Score: ${state.score}`, W / 2, H / 2 - 20);

    if (state.score >= state.highScore && state.highScore > 0) {
      ctx.font = `bold ${Math.min(18, W * 0.032)}px monospace`;
      ctx.fillStyle = '#ffd700';
      ctx.fillText('NEW HIGH SCORE!', W / 2, H / 2 + 15);
    }

    ctx.font = `${Math.min(16, W * 0.028)}px monospace`;
    ctx.fillStyle = '#aaa';
    ctx.fillText(`Best Combo: x${state.maxCombo}`, W / 2, H / 2 + 45);
    ctx.fillText(`High Score: ${state.highScore}`, W / 2, H / 2 + 70);

    ctx.font = `bold ${Math.min(16, W * 0.028)}px monospace`;
    ctx.fillStyle = '#ffd700';
    ctx.fillText('Press SPACE or click to play again', W / 2, H / 2 + 115);
  }

  private drawPausedOverlay(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, W, H);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.font = `bold ${Math.min(36, W * 0.06)}px monospace`;
    ctx.fillStyle = '#fff';
    ctx.fillText('PAUSED', W / 2, H / 2 - 10);

    ctx.font = `${Math.min(16, W * 0.028)}px monospace`;
    ctx.fillStyle = '#aaa';
    ctx.fillText('Press [P] to resume', W / 2, H / 2 + 30);
  }
}
