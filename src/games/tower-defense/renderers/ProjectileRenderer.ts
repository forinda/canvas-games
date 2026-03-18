import type { GameStateData, Projectile } from '../types';

const PROJ_COLORS: Record<string, { trail: string; head: string; size: number }> = {
  arrow: { trail: '#c8a050', head: '#ffd080', size: 3 },
  cannonball: { trail: '#666', head: '#333', size: 6 },
  frostbolt: { trail: '#80d8ff', head: '#e1f5fe', size: 4 },
  bullet: { trail: '#ffeb3b', head: '#fff', size: 2 },
};

export class ProjectileRenderer {
  render(ctx: CanvasRenderingContext2D, state: GameStateData): void {
    for (const proj of state.projectiles) {
      if (proj.done) continue;
      this.drawProjectile(ctx, proj);
    }
  }

  private drawProjectile(ctx: CanvasRenderingContext2D, proj: Projectile) {
    const style = PROJ_COLORS[proj.type] ?? { trail: '#fff', head: '#fff', size: 3 };

    // Direction vector for trail
    const dx = proj.x - proj.fromX;
    const dy = proj.y - proj.fromY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 0) {
      const nx = dx / dist;
      const ny = dy / dist;
      const trailLen = Math.min(dist, style.size * 8);

      // Trail gradient
      const tx = proj.x - nx * trailLen;
      const ty = proj.y - ny * trailLen;
      const grad = ctx.createLinearGradient(tx, ty, proj.x, proj.y);
      grad.addColorStop(0, 'transparent');
      grad.addColorStop(1, style.trail);

      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(proj.x, proj.y);
      ctx.strokeStyle = grad;
      ctx.lineWidth = style.size * 0.7;
      ctx.lineCap = 'round';
      ctx.stroke();
    }

    // Projectile head
    ctx.shadowColor = style.head;
    ctx.shadowBlur = style.size * 2;
    ctx.beginPath();
    ctx.arc(proj.x, proj.y, style.size, 0, Math.PI * 2);
    ctx.fillStyle = style.head;
    ctx.fill();
    ctx.shadowBlur = 0;
  }
}
