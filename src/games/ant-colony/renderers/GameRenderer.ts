import type { Renderable } from '@shared/Renderable';
import type { AntColonyState } from '../types';
import { COLONY_RADIUS } from '../types';

export class GameRenderer implements Renderable<AntColonyState> {
  render(ctx: CanvasRenderingContext2D, state: AntColonyState): void {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    // ── Underground dirt background ──
    this._drawBackground(ctx, W, H, state);

    // ── Pheromone trails ──
    this._drawPheromones(ctx, state);

    // ── Tunnels ──
    this._drawTunnels(ctx, state);

    // ── Food sources ──
    this._drawFoodSources(ctx, state);

    // ── Colony heart ──
    this._drawColony(ctx, state);

    // ── Ants ──
    this._drawAnts(ctx, state);
  }

  private _drawBackground(
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
    state: AntColonyState,
  ): void {
    // Base dirt gradient
    const seasonColors: Record<string, [string, string]> = {
      spring: ['#5a3e28', '#3e2a18'],
      summer: ['#6b4226', '#4a2e1a'],
      autumn: ['#5c3d1e', '#3a2510'],
      winter: ['#3e3e4a', '#2a2a34'],
    };
    const [c1, c2] = seasonColors[state.season] || seasonColors.summer;

    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, c1);
    grad.addColorStop(1, c2);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Dirt texture (subtle dots)
    ctx.fillStyle = 'rgba(0,0,0,0.08)';
    const seed = 42;
    for (let i = 0; i < 300; i++) {
      const rx = ((seed * (i + 1) * 16807) % 2147483647) / 2147483647;
      const ry = ((seed * (i + 1) * 48271) % 2147483647) / 2147483647;
      ctx.beginPath();
      ctx.arc(rx * W, ry * H, 1 + Math.random() * 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Surface line at top
    ctx.strokeStyle = '#7a9a5a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 8);
    for (let x = 0; x < W; x += 20) {
      ctx.lineTo(x, 6 + Math.sin(x * 0.05) * 3);
    }
    ctx.stroke();
  }

  private _drawPheromones(ctx: CanvasRenderingContext2D, state: AntColonyState): void {
    for (const p of state.pheromones) {
      const alpha = p.strength * 0.25;
      if (alpha < 0.01) continue;
      ctx.fillStyle =
        p.type === 'food'
          ? `rgba(0,200,100,${alpha})`
          : `rgba(100,150,255,${alpha})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private _drawTunnels(ctx: CanvasRenderingContext2D, state: AntColonyState): void {
    for (const t of state.tunnels) {
      const alpha = t.complete ? 0.9 : 0.3 + t.progress * 0.5;
      ctx.strokeStyle = `rgba(80,60,40,${alpha})`;
      ctx.lineWidth = t.complete ? 10 : 6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(t.x1, t.y1);
      // Draw only to progress point
      const px = t.x1 + (t.x2 - t.x1) * t.progress;
      const py = t.y1 + (t.y2 - t.y1) * t.progress;
      ctx.lineTo(px, py);
      ctx.stroke();

      // Completed tunnel inner glow
      if (t.complete) {
        ctx.strokeStyle = 'rgba(139,109,78,0.5)';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(t.x1, t.y1);
        ctx.lineTo(t.x2, t.y2);
        ctx.stroke();
      }
    }
  }

  private _drawFoodSources(ctx: CanvasRenderingContext2D, state: AntColonyState): void {
    for (const fs of state.foodSources) {
      const ratio = fs.amount / fs.maxAmount;
      const r = fs.radius * (0.5 + 0.5 * ratio);

      // Glow
      ctx.fillStyle = `rgba(100,220,80,${0.15 * ratio})`;
      ctx.beginPath();
      ctx.arc(fs.x, fs.y, r + 8, 0, Math.PI * 2);
      ctx.fill();

      // Food
      ctx.fillStyle = `rgba(80,200,50,${0.5 + 0.5 * ratio})`;
      ctx.beginPath();
      ctx.arc(fs.x, fs.y, r, 0, Math.PI * 2);
      ctx.fill();

      // Amount label
      if (fs.amount > 0) {
        ctx.font = '9px monospace';
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${Math.ceil(fs.amount)}`, fs.x, fs.y);
      }
    }
  }

  private _drawColony(ctx: CanvasRenderingContext2D, state: AntColonyState): void {
    const { x, y } = state.colony;

    // Outer glow
    const grad = ctx.createRadialGradient(x, y, 5, x, y, COLONY_RADIUS + 15);
    grad.addColorStop(0, 'rgba(180,120,60,0.6)');
    grad.addColorStop(0.6, 'rgba(140,90,40,0.3)');
    grad.addColorStop(1, 'rgba(100,60,20,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, COLONY_RADIUS + 15, 0, Math.PI * 2);
    ctx.fill();

    // Colony mound
    ctx.fillStyle = '#8b6d3e';
    ctx.beginPath();
    ctx.arc(x, y, COLONY_RADIUS, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#a0804a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, COLONY_RADIUS, 0, Math.PI * 2);
    ctx.stroke();

    // Entrance hole
    ctx.fillStyle = '#2a1a0a';
    ctx.beginPath();
    ctx.ellipse(x, y + 5, 8, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Crown icon for queen
    ctx.font = '14px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffd700';
    ctx.fillText('\u265B', x, y - 10);
  }

  private _drawAnts(ctx: CanvasRenderingContext2D, state: AntColonyState): void {
    for (const ant of state.ants) {
      ctx.save();
      ctx.translate(ant.x, ant.y);
      ctx.rotate(ant.angle);

      // Body
      const color =
        ant.task === 'forage'
          ? '#1a1a1a'
          : ant.task === 'build'
            ? '#3a2a1a'
            : '#2a2a2a';
      ctx.fillStyle = color;

      // Thorax
      ctx.beginPath();
      ctx.ellipse(-2, 0, 2.5, 1.5, 0, 0, Math.PI * 2);
      ctx.fill();
      // Abdomen
      ctx.beginPath();
      ctx.ellipse(2, 0, 3, 2, 0, 0, Math.PI * 2);
      ctx.fill();
      // Head
      ctx.beginPath();
      ctx.arc(-5, 0, 1.5, 0, Math.PI * 2);
      ctx.fill();

      // Legs
      ctx.strokeStyle = color;
      ctx.lineWidth = 0.5;
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(i * 2, 0);
        ctx.lineTo(i * 2 - 1, -3);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(i * 2, 0);
        ctx.lineTo(i * 2 - 1, 3);
        ctx.stroke();
      }

      // Carrying indicator
      if (ant.carrying) {
        ctx.fillStyle = '#50c832';
        ctx.beginPath();
        ctx.arc(-6, 0, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }
}
