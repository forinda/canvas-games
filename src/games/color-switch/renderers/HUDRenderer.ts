import type { Renderable } from '@shared/Renderable';
import type { ColorSwitchState } from '../types';

export class HUDRenderer implements Renderable<ColorSwitchState> {
  render(ctx: CanvasRenderingContext2D, state: ColorSwitchState): void {
    const { canvasW, canvasH } = state;

    if (state.phase === 'idle') {
      this.drawIdleOverlay(ctx, canvasW, canvasH);
    }

    if (state.phase === 'playing') {
      this.drawScore(ctx, canvasW, state.score);
    }

    if (state.phase === 'dead') {
      this.drawDeathOverlay(ctx, canvasW, canvasH, state.score, state.bestScore);
    }
  }

  private drawScore(ctx: CanvasRenderingContext2D, canvasW: number, score: number): void {
    ctx.save();
    ctx.font = 'bold 64px monospace';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(String(score), canvasW / 2, 40);
    ctx.restore();
  }

  private drawIdleOverlay(
    ctx: CanvasRenderingContext2D,
    canvasW: number,
    canvasH: number,
  ): void {
    ctx.save();

    // Title
    ctx.font = 'bold 36px monospace';
    ctx.fillStyle = '#e040fb';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Color Switch', canvasW / 2, canvasH * 0.3);

    // Subtitle
    ctx.font = '16px monospace';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.fillText('Tap or press SPACE to start', canvasW / 2, canvasH * 0.3 + 50);

    // Pulsing arrow
    const pulse = Math.sin(performance.now() * 0.004) * 5;
    ctx.font = '28px monospace';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.fillText('\u25B2', canvasW / 2, canvasH * 0.5 + pulse);

    ctx.restore();
  }

  private drawDeathOverlay(
    ctx: CanvasRenderingContext2D,
    canvasW: number,
    canvasH: number,
    score: number,
    bestScore: number,
  ): void {
    ctx.save();

    // Dim background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, canvasW, canvasH);

    // Panel
    const panelW = Math.min(300, canvasW * 0.7);
    const panelH = 220;
    const panelX = (canvasW - panelW) / 2;
    const panelY = (canvasH - panelH) / 2;

    ctx.fillStyle = '#12121f';
    ctx.beginPath();
    ctx.roundRect(panelX, panelY, panelW, panelH, 16);
    ctx.fill();

    ctx.strokeStyle = '#e040fb';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(panelX, panelY, panelW, panelH, 16);
    ctx.stroke();

    // Game Over
    ctx.font = 'bold 28px monospace';
    ctx.fillStyle = '#e040fb';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Game Over', canvasW / 2, panelY + 40);

    // Score
    ctx.font = 'bold 48px monospace';
    ctx.fillStyle = '#fff';
    ctx.fillText(String(score), canvasW / 2, panelY + 95);

    // Best
    ctx.font = '16px monospace';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.fillText(`Best: ${bestScore}`, canvasW / 2, panelY + 140);

    // Restart hint
    ctx.font = '14px monospace';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.fillText('Tap or SPACE to restart', canvasW / 2, panelY + 185);

    ctx.restore();
  }
}
