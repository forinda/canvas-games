import type { Renderable } from '@shared/Renderable';
import type { SandState } from '../types';
import { PARTICLE_TYPES, PARTICLE_COLORS, PARTICLE_LABELS } from '../types';

export class HUDRenderer implements Renderable<SandState> {
  render(ctx: CanvasRenderingContext2D, state: SandState): void {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    // Top bar
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, W, 36);

    ctx.font = 'bold 14px monospace';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';

    // Exit button
    ctx.fillStyle = '#666';
    ctx.fillText('< EXIT', 12, 18);

    // Selected material
    ctx.fillStyle = '#ffb74d';
    ctx.textAlign = 'center';
    ctx.fillText(`Material: ${PARTICLE_LABELS[state.selectedType]}`, W / 2, 18);

    // Particle count
    ctx.fillStyle = '#888';
    ctx.textAlign = 'right';
    ctx.fillText(`Particles: ${state.particleCount}`, W - 120, 18);

    // Brush size
    ctx.fillStyle = '#666';
    ctx.fillText(`Brush: ${state.brushSize}`, W - 12, 18);

    // Bottom palette bar
    this.renderPalette(ctx, state, W, H);

    // Paused overlay
    if (state.paused) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(0, 0, W, H);
      ctx.font = `bold ${Math.min(48, W * 0.06)}px monospace`;
      ctx.fillStyle = '#ffb74d';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = '#ffb74d';
      ctx.shadowBlur = 20;
      ctx.fillText('PAUSED', W / 2, H / 2 - 20);
      ctx.shadowBlur = 0;
      ctx.font = `${Math.min(16, W * 0.025)}px monospace`;
      ctx.fillStyle = '#aaa';
      ctx.fillText('Press P to resume', W / 2, H / 2 + 20);
    }

    // Help hint
    ctx.font = '11px monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.fillText('[H] Help', W - 12, 42);
  }

  private renderPalette(
    ctx: CanvasRenderingContext2D,
    state: SandState,
    W: number,
    H: number,
  ): void {
    const barH = 44;
    const barY = H - barH;

    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, barY, W, barH);

    const slotW = 64;
    const totalW = PARTICLE_TYPES.length * slotW;
    const startX = (W - totalW) / 2;

    for (let i = 0; i < PARTICLE_TYPES.length; i++) {
      const type = PARTICLE_TYPES[i];
      const x = startX + i * slotW;
      const isSelected = state.selectedType === type;

      // Slot background
      if (isSelected) {
        ctx.fillStyle = 'rgba(255, 183, 77, 0.25)';
        ctx.beginPath();
        ctx.roundRect(x + 2, barY + 4, slotW - 4, barH - 8, 6);
        ctx.fill();
        ctx.strokeStyle = '#ffb74d';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(x + 2, barY + 4, slotW - 4, barH - 8, 6);
        ctx.stroke();
      }

      // Color swatch
      const colors = PARTICLE_COLORS[type];
      ctx.fillStyle = colors[0];
      ctx.beginPath();
      ctx.roundRect(x + 10, barY + 8, 16, 16, 3);
      ctx.fill();

      // Label
      ctx.font = '10px monospace';
      ctx.fillStyle = isSelected ? '#ffb74d' : '#888';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(PARTICLE_LABELS[type], x + slotW / 2, barY + 27);

      // Key number
      ctx.font = 'bold 9px monospace';
      ctx.fillStyle = isSelected ? '#ffb74d' : '#555';
      ctx.fillText(`${i + 1}`, x + slotW - 12, barY + 8);
    }
  }
}
