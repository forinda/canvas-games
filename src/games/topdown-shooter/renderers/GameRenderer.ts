import type { Renderable } from '@shared/Renderable';
import type { ShooterState } from '../types';
import { ARENA_PADDING, PLAYER_RADIUS } from '../types';

export class GameRenderer implements Renderable<ShooterState> {
  render(ctx: CanvasRenderingContext2D, state: ShooterState): void {
    const W = state.canvasW;
    const H = state.canvasH;

    // ── Background ───────────────────────────────────────────────
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, W, H);

    // ── Arena border ─────────────────────────────────────────────
    const ap = ARENA_PADDING;
    ctx.strokeStyle = '#333355';
    ctx.lineWidth = 2;
    ctx.strokeRect(ap, ap, W - ap * 2, H - ap * 2);

    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 1;
    const gridSize = 60;
    for (let x = ap; x < W - ap; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, ap);
      ctx.lineTo(x, H - ap);
      ctx.stroke();
    }
    for (let y = ap; y < H - ap; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(ap, y);
      ctx.lineTo(W - ap, y);
      ctx.stroke();
    }

    // ── Particles (behind everything) ────────────────────────────
    for (const p of state.particles) {
      const alpha = 1 - p.age / p.lifetime;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.pos.x, p.pos.y, p.radius * alpha, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // ── Bullets ──────────────────────────────────────────────────
    for (const b of state.bullets) {
      ctx.fillStyle = b.fromPlayer ? '#ffeb3b' : '#e040fb';
      ctx.beginPath();
      ctx.arc(b.pos.x, b.pos.y, b.radius, 0, Math.PI * 2);
      ctx.fill();

      // Glow
      ctx.shadowColor = b.fromPlayer ? '#ffeb3b' : '#e040fb';
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // ── Enemies ──────────────────────────────────────────────────
    for (const e of state.enemies) {
      // Body
      ctx.fillStyle = e.color;
      ctx.beginPath();
      ctx.arc(e.pos.x, e.pos.y, e.radius, 0, Math.PI * 2);
      ctx.fill();

      // HP bar (if damaged)
      if (e.hp < e.maxHp) {
        const barW = e.radius * 2;
        const barH = 4;
        const barX = e.pos.x - barW / 2;
        const barY = e.pos.y - e.radius - 8;
        ctx.fillStyle = '#333';
        ctx.fillRect(barX, barY, barW, barH);
        ctx.fillStyle = '#4caf50';
        ctx.fillRect(barX, barY, barW * (e.hp / e.maxHp), barH);
      }

      // Type indicator
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${Math.max(9, e.radius * 0.7)}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const label = e.type === 'tank' ? 'T' : e.type === 'fast' ? 'F' : e.type === 'ranged' ? 'R' : '';
      if (label) ctx.fillText(label, e.pos.x, e.pos.y);
    }

    // ── Player ───────────────────────────────────────────────────
    const { player, mouse } = state;

    // Aim line
    const aimDx = mouse.x - player.pos.x;
    const aimDy = mouse.y - player.pos.y;
    const aimLen = Math.sqrt(aimDx * aimDx + aimDy * aimDy);
    if (aimLen > 0) {
      const nx = aimDx / aimLen;
      const ny = aimDy / aimLen;
      ctx.strokeStyle = 'rgba(255,235,59,0.35)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(player.pos.x + nx * PLAYER_RADIUS, player.pos.y + ny * PLAYER_RADIUS);
      ctx.lineTo(player.pos.x + nx * 60, player.pos.y + ny * 60);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Flash when invincible
    const flash = player.invincibleTimer > 0 && Math.floor(player.invincibleTimer * 10) % 2 === 0;

    // Player body
    ctx.fillStyle = flash ? '#ff8a80' : '#42a5f5';
    ctx.beginPath();
    ctx.arc(player.pos.x, player.pos.y, player.radius, 0, Math.PI * 2);
    ctx.fill();

    // Player outline glow
    ctx.strokeStyle = '#90caf9';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(player.pos.x, player.pos.y, player.radius, 0, Math.PI * 2);
    ctx.stroke();

    // Gun direction indicator
    if (aimLen > 0) {
      const nx = aimDx / aimLen;
      const ny = aimDy / aimLen;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(
        player.pos.x + nx * (player.radius - 4),
        player.pos.y + ny * (player.radius - 4),
        4, 0, Math.PI * 2,
      );
      ctx.fill();
    }
  }
}
