import type { GameHelp } from '@shared/GameInterface';

/**
 * Shared help overlay that any game can render.
 * Toggle with [H] key. Each game passes its GameHelp data.
 */
export class HelpOverlay {
  visible = false;

  toggle(): void {
    this.visible = !this.visible;
  }

  show(): void {
    this.visible = true;
  }

  hide(): void {
    this.visible = false;
  }

  render(ctx: CanvasRenderingContext2D, help: GameHelp, gameName: string, gameColor: string): void {
    if (!this.visible) return;

    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    // Dim background
    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.fillRect(0, 0, W, H);

    // Panel
    const panelW = Math.min(520, W * 0.7);
    const panelH = Math.min(500, H * 0.8);
    const panelX = (W - panelW) / 2;
    const panelY = (H - panelH) / 2;
    const r = 16;

    ctx.fillStyle = '#12121f';
    ctx.beginPath();
    ctx.roundRect(panelX, panelY, panelW, panelH, r);
    ctx.fill();

    ctx.strokeStyle = gameColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(panelX, panelY, panelW, panelH, r);
    ctx.stroke();

    const cx = panelX + panelW / 2;
    const pad = 24;
    let y = panelY + pad;

    // Title
    ctx.font = `bold ${Math.min(24, panelW * 0.05)}px monospace`;
    ctx.fillStyle = gameColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(`${gameName} — Help`, cx, y);
    y += 38;

    // Goal
    ctx.font = `${Math.min(14, panelW * 0.03)}px monospace`;
    ctx.fillStyle = '#ccc';
    ctx.fillText(help.goal, cx, y);
    y += 32;

    // Divider
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(panelX + pad, y);
    ctx.lineTo(panelX + panelW - pad, y);
    ctx.stroke();
    y += 16;

    // Controls header
    ctx.font = `bold ${Math.min(15, panelW * 0.032)}px monospace`;
    ctx.fillStyle = gameColor;
    ctx.textAlign = 'left';
    ctx.fillText('Controls', panelX + pad, y);
    y += 24;

    // Controls list
    ctx.font = `${Math.min(13, panelW * 0.028)}px monospace`;
    const keyColW = Math.min(140, panelW * 0.35);

    for (const ctrl of help.controls) {
      // Key badge
      const keyW = ctx.measureText(ctrl.key).width + 16;
      const keyX = panelX + pad;
      const keyH = 22;

      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.beginPath();
      ctx.roundRect(keyX, y - 2, keyW, keyH, 4);
      ctx.fill();

      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(keyX, y - 2, keyW, keyH, 4);
      ctx.stroke();

      ctx.fillStyle = '#fff';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(ctrl.key, keyX + 8, y + 2);

      // Action text
      ctx.fillStyle = '#aaa';
      ctx.fillText(ctrl.action, panelX + pad + keyColW, y + 2);
      y += 28;
    }

    y += 8;

    // Divider
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.beginPath();
    ctx.moveTo(panelX + pad, y);
    ctx.lineTo(panelX + panelW - pad, y);
    ctx.stroke();
    y += 16;

    // Tips header
    ctx.font = `bold ${Math.min(15, panelW * 0.032)}px monospace`;
    ctx.fillStyle = gameColor;
    ctx.textAlign = 'left';
    ctx.fillText('Tips', panelX + pad, y);
    y += 24;

    // Tips list
    ctx.font = `${Math.min(12, panelW * 0.026)}px monospace`;
    ctx.fillStyle = '#999';

    for (const tip of help.tips) {
      ctx.fillText(`  ${tip}`, panelX + pad, y);
      y += 22;
    }

    // Close hint at bottom
    ctx.font = `${Math.min(12, panelW * 0.025)}px monospace`;
    ctx.fillStyle = '#555';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText('Press [H] to close', cx, panelY + panelH - 12);
  }
}
