import type { Renderable } from '@shared/Renderable.ts';
import type { IdleState } from '../types.ts';
import { SHOP_WIDTH_RATIO, SHOP_MIN_WIDTH, SHOP_MAX_WIDTH } from '../types.ts';
import { formatNumber, getUpgradeCost } from '../utils.ts';

/**
 * Renders the right-side shop panel with all available upgrades.
 * Each upgrade shows icon, name, owned count, cost, and CPS contribution.
 * Affordable upgrades are highlighted.
 */
export class ShopRenderer implements Renderable<IdleState> {
  render(ctx: CanvasRenderingContext2D, state: IdleState): void {
    const W = state.width;
    const H = state.height;
    const shopW = Math.max(SHOP_MIN_WIDTH, Math.min(SHOP_MAX_WIDTH, W * SHOP_WIDTH_RATIO));
    const shopX = W - shopW;

    // Shop background
    ctx.fillStyle = 'rgba(10, 10, 20, 0.95)';
    ctx.fillRect(shopX, 0, shopW, H);

    // Left border
    ctx.strokeStyle = '#ffc107';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(shopX, 0);
    ctx.lineTo(shopX, H);
    ctx.stroke();

    // Header
    const headerH = 60;
    ctx.fillStyle = 'rgba(255, 193, 7, 0.1)';
    ctx.fillRect(shopX, 0, shopW, headerH);

    ctx.fillStyle = '#ffc107';
    ctx.font = `bold ${Math.min(20, shopW * 0.06)}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('UPGRADES', shopX + shopW / 2, headerH / 2);

    // Clip shop items area
    ctx.save();
    ctx.beginPath();
    ctx.rect(shopX, headerH, shopW, H - headerH);
    ctx.clip();

    // Render upgrade items
    const itemH = 72;
    const pad = 10;

    for (let i = 0; i < state.upgrades.length; i++) {
      const u = state.upgrades[i];
      const y = headerH + i * itemH - state.shopScroll;

      // Skip if off-screen
      if (y + itemH < headerH || y > H) continue;

      const cost = getUpgradeCost(u);
      const canAfford = state.coins >= cost;

      // Item background
      if (canAfford) {
        ctx.fillStyle = 'rgba(255, 193, 7, 0.08)';
      } else {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
      }
      ctx.fillRect(shopX + 4, y + 2, shopW - 8, itemH - 4);

      // Border for affordable items
      if (canAfford) {
        ctx.strokeStyle = 'rgba(255, 193, 7, 0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(shopX + 4, y + 2, shopW - 8, itemH - 4, 4);
        ctx.stroke();
      }

      // Icon
      const iconSize = Math.min(28, shopW * 0.08);
      ctx.font = `${iconSize}px serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(u.icon, shopX + pad, y + itemH / 2);

      const textX = shopX + pad + iconSize + 8;
      const maxTextW = shopW - pad * 2 - iconSize - 12;

      // Name + owned count
      ctx.fillStyle = canAfford ? '#fff' : '#666';
      ctx.font = `bold ${Math.min(14, shopW * 0.04)}px monospace`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(`${u.name}`, textX, y + 8);

      // Owned badge
      if (u.owned > 0) {
        const ownedText = `x${u.owned}`;
        const nameW = ctx.measureText(u.name).width;
        ctx.fillStyle = '#ffc107';
        ctx.font = `bold ${Math.min(12, shopW * 0.035)}px monospace`;
        ctx.fillText(ownedText, textX + nameW + 8, y + 9);
      }

      // Cost
      ctx.fillStyle = canAfford ? '#4caf50' : '#c62828';
      ctx.font = `${Math.min(12, shopW * 0.035)}px monospace`;
      ctx.textBaseline = 'middle';
      ctx.fillText(`Cost: ${formatNumber(cost)}`, textX, y + itemH / 2 + 2);

      // CPS contribution
      ctx.fillStyle = '#888';
      ctx.font = `${Math.min(11, shopW * 0.032)}px monospace`;
      ctx.textBaseline = 'bottom';
      const totalCps = u.cps * u.owned;
      const cpsText = u.owned > 0
        ? `+${formatNumber(u.cps)}/s each | Total: ${formatNumber(totalCps)}/s`
        : `+${formatNumber(u.cps)}/s each`;
      ctx.fillText(cpsText, textX, y + itemH - 6, maxTextW);
    }

    ctx.restore();
  }
}
