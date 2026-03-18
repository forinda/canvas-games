import type { Renderable } from '@shared/Renderable';
import type { LightsOutState } from '../types';
import { GRID_SIZE } from '../types';

export class BoardRenderer implements Renderable<LightsOutState> {
  render(ctx: CanvasRenderingContext2D, state: LightsOutState): void {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    // Clear
    ctx.fillStyle = '#121218';
    ctx.fillRect(0, 0, W, H);

    const { board, offsetX, offsetY, cellSize, ripples } = state;
    const now = performance.now();

    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const cell = board[r][c];
        const x = offsetX + c * cellSize;
        const y = offsetY + r * cellSize;
        const cx = x + cellSize / 2;
        const cy = y + cellSize / 2;
        const gap = 3;

        // Cell background
        if (cell.on) {
          // Lit cell — yellow glow
          const gradient = ctx.createRadialGradient(
            cx, cy, cellSize * 0.1,
            cx, cy, cellSize * 0.7,
          );
          gradient.addColorStop(0, '#fff9c4');
          gradient.addColorStop(0.4, '#ffca28');
          gradient.addColorStop(1, '#f9a825');
          ctx.fillStyle = gradient;
        } else {
          // Off cell — dark
          ctx.fillStyle = '#1e1e2e';
        }

        ctx.beginPath();
        ctx.roundRect(x + gap, y + gap, cellSize - gap * 2, cellSize - gap * 2, 6);
        ctx.fill();

        // Border for off cells
        if (!cell.on) {
          ctx.strokeStyle = '#2a2a3a';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.roundRect(x + gap, y + gap, cellSize - gap * 2, cellSize - gap * 2, 6);
          ctx.stroke();
        }

        // Glow effect for lit cells
        if (cell.on) {
          ctx.shadowColor = '#ffca28';
          ctx.shadowBlur = 18;
          ctx.fillStyle = 'rgba(255, 202, 40, 0.15)';
          ctx.beginPath();
          ctx.roundRect(x + gap, y + gap, cellSize - gap * 2, cellSize - gap * 2, 6);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }
    }

    // Ripple animations
    for (const ripple of ripples) {
      const elapsed = now - ripple.startTime;
      const progress = elapsed / ripple.duration;
      if (progress >= 1) continue;

      const rx = offsetX + ripple.col * cellSize + cellSize / 2;
      const ry = offsetY + ripple.row * cellSize + cellSize / 2;
      const maxRadius = cellSize * 1.5;
      const radius = maxRadius * progress;
      const alpha = 0.4 * (1 - progress);

      ctx.strokeStyle = `rgba(255, 202, 40, ${alpha})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(rx, ry, radius, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Board border
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(
      offsetX,
      offsetY,
      GRID_SIZE * cellSize,
      GRID_SIZE * cellSize,
      8,
    );
    ctx.stroke();
  }
}
