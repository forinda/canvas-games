import type { GameStateData } from '../types';

export class HUDRenderer {
  readonly height = 52;

  render(
    ctx: CanvasRenderingContext2D,
    state: GameStateData,
    canvasW: number,
  ): void {
    const h = this.height;

    // Background
    ctx.fillStyle = '#0d1a0d';
    ctx.fillRect(0, 0, canvasW, h);

    // Bottom border
    ctx.fillStyle = '#2a4a2a';
    ctx.fillRect(0, h - 2, canvasW, 2);

    const fontSize = 16;
    ctx.font = `bold ${fontSize}px monospace`;
    ctx.textBaseline = 'middle';
    const cy = h / 2;
    const pad = 18;
    let x = pad;

    // Lives
    this.drawStat(ctx, x, cy, '❤️', `${state.lives}/${state.maxLives}`, '#e74c3c');
    x += 110;

    // Gold
    this.drawStat(ctx, x, cy, '💰', `${state.gold}`, '#f1c40f');
    x += 100;

    // Score
    this.drawStat(ctx, x, cy, '⭐', `${state.score}`, '#9b59b6');
    x += 110;

    // Wave
    const waveText = state.mode === 'endless'
      ? `Wave ${state.currentWave}`
      : `Wave ${state.currentWave}/${state.totalWaves}`;
    this.drawStat(ctx, x, cy, '🌊', waveText, '#3498db');
    x += 140;

    // Mode badge
    const modeColors: Record<string, string> = {
      classic: '#2ecc71',
      endless: '#e67e22',
      challenge: '#e74c3c',
    };
    ctx.fillStyle = modeColors[state.mode] ?? '#888';
    ctx.font = `bold ${fontSize - 2}px monospace`;
    const modeLabel = state.mode.toUpperCase();
    const mw = ctx.measureText(modeLabel).width + 16;
    const mx = x;
    ctx.beginPath();
    ctx.roundRect(mx, cy - 11, mw, 22, 5);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.fillText(modeLabel, mx + mw / 2, cy);
    ctx.textAlign = 'left';

    // High score (right side)
    if (state.highScore > 0) {
      ctx.font = `${fontSize - 4}px monospace`;
      ctx.fillStyle = '#666';
      ctx.textAlign = 'right';
      ctx.fillText(`Best: ${state.highScore}`, canvasW - pad, cy);
      ctx.textAlign = 'left';
    }
  }

  private drawStat(
    ctx: CanvasRenderingContext2D,
    x: number,
    cy: number,
    icon: string,
    value: string,
    color: string,
  ) {
    ctx.font = '18px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(icon, x, cy);
    ctx.font = 'bold 14px monospace';
    ctx.fillStyle = color;
    ctx.fillText(value, x + 24, cy);
  }
}
