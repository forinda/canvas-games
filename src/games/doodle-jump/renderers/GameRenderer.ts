import type { Renderable } from '@shared/Renderable';
import type { DoodleState } from '../types';

export class GameRenderer implements Renderable<DoodleState> {
  render(ctx: CanvasRenderingContext2D, state: DoodleState): void {
    // Graph paper background
    this.drawBackground(ctx, state);

    ctx.save();
    // Apply camera translation
    ctx.translate(0, -state.cameraY);

    // Draw platforms
    this.drawPlatforms(ctx, state);

    // Draw player
    this.drawPlayer(ctx, state);

    ctx.restore();
  }

  private drawBackground(ctx: CanvasRenderingContext2D, state: DoodleState): void {
    const { canvasW, canvasH, cameraY } = state;

    // Cream/white background like graph paper
    ctx.fillStyle = '#faf8ef';
    ctx.fillRect(0, 0, canvasW, canvasH);

    // Grid lines
    const gridSize = 30;
    ctx.strokeStyle = 'rgba(200, 210, 230, 0.4)';
    ctx.lineWidth = 0.5;

    const offsetY = -(cameraY % gridSize);
    for (let y = offsetY; y < canvasH; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvasW, y);
      ctx.stroke();
    }

    for (let x = 0; x < canvasW; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvasH);
      ctx.stroke();
    }
  }

  private drawPlatforms(ctx: CanvasRenderingContext2D, state: DoodleState): void {
    for (const plat of state.platforms) {
      ctx.save();

      // Platform colors by type
      let color: string;
      switch (plat.type) {
        case 'normal':
          color = '#4caf50'; // green
          break;
        case 'moving':
          color = '#2196f3'; // blue
          break;
        case 'breaking':
          color = plat.broken ? '#8d6e63' : '#a1887f'; // brown, darker when broken
          break;
        case 'spring':
          color = '#f44336'; // red
          break;
      }

      // Platform body
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(plat.x, plat.y, plat.width, plat.height, 4);
      ctx.fill();

      // Platform top highlight
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.fillRect(plat.x + 2, plat.y + 1, plat.width - 4, 3);

      // Platform border
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(plat.x, plat.y, plat.width, plat.height, 4);
      ctx.stroke();

      // Breaking platform cracks
      if (plat.type === 'breaking' && !plat.broken) {
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.lineWidth = 1;
        const mx = plat.x + plat.width / 2;
        const my = plat.y + plat.height / 2;
        ctx.beginPath();
        ctx.moveTo(mx - 8, my - 3);
        ctx.lineTo(mx, my + 2);
        ctx.lineTo(mx + 6, my - 4);
        ctx.stroke();
      }

      // Spring coil on spring platforms
      if (plat.type === 'spring') {
        this.drawSpring(ctx, plat.x + plat.width / 2, plat.y, plat.springTimer > 0);
      }

      ctx.restore();
    }
  }

  private drawSpring(ctx: CanvasRenderingContext2D, cx: number, platTop: number, compressed: boolean): void {
    const coilHeight = compressed ? 6 : 14;
    const coilWidth = 10;
    const coils = 3;
    const startY = platTop - coilHeight;

    // Spring base on platform
    ctx.fillStyle = '#ff8a80';
    ctx.fillRect(cx - 8, platTop - 3, 16, 3);

    // Coil segments
    ctx.strokeStyle = '#d32f2f';
    ctx.lineWidth = 2;
    ctx.beginPath();

    const segH = coilHeight / coils;
    for (let i = 0; i < coils; i++) {
      const y1 = startY + i * segH;
      const y2 = startY + (i + 0.5) * segH;
      const y3 = startY + (i + 1) * segH;
      const dir = i % 2 === 0 ? 1 : -1;

      if (i === 0) {
        ctx.moveTo(cx, y1);
      }
      ctx.lineTo(cx + coilWidth * dir, y2);
      ctx.lineTo(cx, y3);
    }

    ctx.stroke();

    // Spring top cap
    ctx.fillStyle = '#e57373';
    ctx.beginPath();
    ctx.arc(cx, startY, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawPlayer(ctx: CanvasRenderingContext2D, state: DoodleState): void {
    const p = state.player;

    ctx.save();
    ctx.translate(p.x + p.width / 2, p.y + p.height / 2);

    if (!p.facingRight) {
      ctx.scale(-1, 1);
    }

    const hw = p.width / 2;
    const hh = p.height / 2;

    // Body (green doodle character)
    ctx.fillStyle = '#66bb6a';
    ctx.beginPath();
    ctx.ellipse(0, 2, hw, hh - 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#388e3c';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Belly
    ctx.fillStyle = '#a5d6a7';
    ctx.beginPath();
    ctx.ellipse(0, 6, hw * 0.6, hh * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.ellipse(-5, -8, 6, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(5, -8, 6, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    // Pupils
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(-3, -8, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(7, -8, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Nose/snout
    ctx.fillStyle = '#4caf50';
    ctx.beginPath();
    ctx.ellipse(2, -2, 8, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // Nostrils
    ctx.fillStyle = '#2e7d32';
    ctx.beginPath();
    ctx.arc(-1, -2, 1.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(5, -2, 1.2, 0, Math.PI * 2);
    ctx.fill();

    // Legs (two little feet)
    ctx.fillStyle = '#66bb6a';
    ctx.beginPath();
    ctx.ellipse(-8, hh - 2, 6, 4, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(8, hh - 2, 6, 4, 0.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}
