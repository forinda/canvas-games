import type { Renderable } from '@shared/Renderable';
import type { BasketballState } from '../types';
import {
  BALL_RADIUS,
  RIM_THICKNESS,
  NET_HEIGHT,
  GRAVITY,
} from '../types';

export class GameRenderer implements Renderable<BasketballState> {
  render(ctx: CanvasRenderingContext2D, state: BasketballState): void {
    this.drawCourt(ctx, state);
    this.drawHoop(ctx, state);

    if (state.aim.dragging && !state.ball.inFlight) {
      this.drawTrajectoryPreview(ctx, state);
      this.drawPowerLine(ctx, state);
    }

    this.drawBall(ctx, state);
    this.drawParticles(ctx, state);
    this.drawSwishText(ctx, state);
  }

  private drawCourt(ctx: CanvasRenderingContext2D, state: BasketballState): void {
    const W = state.canvasW;
    const H = state.canvasH;

    // Sky / gym background gradient
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#1a1a2e');
    grad.addColorStop(0.6, '#16213e');
    grad.addColorStop(1, '#0f3460');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Court floor
    const floorY = H - 50;
    const floorGrad = ctx.createLinearGradient(0, floorY, 0, H);
    floorGrad.addColorStop(0, '#c17f3a');
    floorGrad.addColorStop(1, '#a06830');
    ctx.fillStyle = floorGrad;
    ctx.fillRect(0, floorY, W, H - floorY);

    // Floor line
    ctx.strokeStyle = '#dda15e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, floorY);
    ctx.lineTo(W, floorY);
    ctx.stroke();

    // Court markings
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(W / 2, floorY);
    ctx.lineTo(W / 2, H);
    ctx.stroke();

    // Center circle hint
    ctx.beginPath();
    ctx.arc(W / 2, floorY + 25, 30, 0, Math.PI);
    ctx.stroke();
  }

  private drawHoop(ctx: CanvasRenderingContext2D, state: BasketballState): void {
    const hoop = state.hoop;
    const rimLeft = hoop.x - hoop.rimWidth / 2;
    const rimRight = hoop.x + hoop.rimWidth / 2;

    // Backboard
    const bbLeft = rimRight;
    const bbTop = hoop.y - hoop.backboardHeight / 2;
    ctx.fillStyle = '#e0e0e0';
    ctx.fillRect(bbLeft, bbTop, hoop.backboardWidth, hoop.backboardHeight);
    ctx.strokeStyle = '#999';
    ctx.lineWidth = 2;
    ctx.strokeRect(bbLeft, bbTop, hoop.backboardWidth, hoop.backboardHeight);

    // Backboard inner rectangle
    const innerMargin = 12;
    ctx.strokeStyle = '#e74c3c';
    ctx.lineWidth = 2;
    ctx.strokeRect(
      bbLeft + 1,
      hoop.y - innerMargin,
      hoop.backboardWidth - 2,
      innerMargin * 2,
    );

    // Rim
    ctx.strokeStyle = '#e74c3c';
    ctx.lineWidth = RIM_THICKNESS;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(rimLeft, hoop.y);
    ctx.lineTo(rimRight, hoop.y);
    ctx.stroke();

    // Rim end circles
    ctx.fillStyle = '#e74c3c';
    ctx.beginPath();
    ctx.arc(rimLeft, hoop.y, RIM_THICKNESS / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(rimRight, hoop.y, RIM_THICKNESS / 2, 0, Math.PI * 2);
    ctx.fill();

    // Net
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 1.5;
    const netSegments = 6;
    const netWidth = hoop.rimWidth * 0.8;
    const netBottomWidth = hoop.rimWidth * 0.3;

    for (let i = 0; i <= netSegments; i++) {
      const t = i / netSegments;
      const topX = rimLeft + (hoop.rimWidth - netWidth) / 2 + netWidth * (i / netSegments);
      const bottomX = hoop.x - netBottomWidth / 2 + netBottomWidth * (i / netSegments);

      ctx.beginPath();
      ctx.moveTo(topX, hoop.y);

      // Wavy net lines
      const midY = hoop.y + NET_HEIGHT * 0.5;
      const midX = topX + (bottomX - topX) * 0.5 + Math.sin(t * Math.PI * 3) * 3;
      ctx.quadraticCurveTo(midX, midY, bottomX, hoop.y + NET_HEIGHT);
      ctx.stroke();
    }

    // Horizontal net lines
    for (let row = 1; row < 4; row++) {
      const rowT = row / 4;
      const rowY = hoop.y + NET_HEIGHT * rowT;
      const rowWidth = netWidth - (netWidth - netBottomWidth) * rowT;
      const rowX = hoop.x - rowWidth / 2;

      ctx.beginPath();
      ctx.moveTo(rowX, rowY);
      ctx.lineTo(rowX + rowWidth, rowY);
      ctx.stroke();
    }

    // Support rod from backboard
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(bbLeft + hoop.backboardWidth, hoop.y);
    ctx.lineTo(bbLeft + hoop.backboardWidth + 15, hoop.y);
    ctx.stroke();
  }

  private drawBall(ctx: CanvasRenderingContext2D, state: BasketballState): void {
    const ball = state.ball;

    ctx.save();
    ctx.translate(ball.x, ball.y);
    ctx.rotate(ball.rotation);

    // Ball body
    const gradient = ctx.createRadialGradient(-3, -3, 2, 0, 0, BALL_RADIUS);
    gradient.addColorStop(0, '#ff8a50');
    gradient.addColorStop(0.6, '#e65100');
    gradient.addColorStop(1, '#bf360c');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(0, 0, BALL_RADIUS, 0, Math.PI * 2);
    ctx.fill();

    // Ball texture lines
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 1.5;

    // Vertical line
    ctx.beginPath();
    ctx.moveTo(0, -BALL_RADIUS);
    ctx.lineTo(0, BALL_RADIUS);
    ctx.stroke();

    // Horizontal line
    ctx.beginPath();
    ctx.moveTo(-BALL_RADIUS, 0);
    ctx.lineTo(BALL_RADIUS, 0);
    ctx.stroke();

    // Curved lines
    ctx.beginPath();
    ctx.arc(0, 0, BALL_RADIUS * 0.6, -Math.PI * 0.5, Math.PI * 0.5);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, 0, BALL_RADIUS * 0.6, Math.PI * 0.5, -Math.PI * 0.5);
    ctx.stroke();

    // Ball outline
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, BALL_RADIUS, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }

  private drawPowerLine(ctx: CanvasRenderingContext2D, state: BasketballState): void {
    const aim = state.aim;

    ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 4]);
    ctx.beginPath();
    ctx.moveTo(aim.startX, aim.startY);
    ctx.lineTo(aim.currentX, aim.currentY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Arrow at start pointing in shoot direction
    const dx = aim.startX - aim.currentX;
    const dy = aim.startY - aim.currentY;
    const len = Math.sqrt(dx * dx + dy * dy);

    if (len > 10) {
      const nx = dx / len;
      const ny = dy / len;
      const arrowLen = Math.min(len * 0.3, 30);

      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.beginPath();
      ctx.moveTo(state.ball.x + nx * (BALL_RADIUS + 5), state.ball.y + ny * (BALL_RADIUS + 5));
      ctx.lineTo(
        state.ball.x + nx * (BALL_RADIUS + 5 + arrowLen) - ny * 5,
        state.ball.y + ny * (BALL_RADIUS + 5 + arrowLen) + nx * 5,
      );
      ctx.lineTo(
        state.ball.x + nx * (BALL_RADIUS + 5 + arrowLen) + ny * 5,
        state.ball.y + ny * (BALL_RADIUS + 5 + arrowLen) - nx * 5,
      );
      ctx.closePath();
      ctx.fill();
    }
  }

  private drawTrajectoryPreview(ctx: CanvasRenderingContext2D, state: BasketballState): void {
    const aim = state.aim;
    const ball = state.ball;

    const dx = aim.startX - aim.currentX;
    const dy = aim.startY - aim.currentY;
    const power = Math.sqrt(dx * dx + dy * dy);
    if (power < 10) return;

    let vx = dx * 3.5;
    let vy = dy * 3.5;

    const mag = Math.sqrt(vx * vx + vy * vy);
    if (mag > 800) {
      const scale = 800 / mag;
      vx *= scale;
      vy *= scale;
    }

    // Simulate trajectory as dotted arc
    let px = ball.x;
    let py = ball.y;
    let pvx = vx;
    let pvy = vy;
    const simDt = 0.03;
    const steps = 30;

    ctx.fillStyle = 'rgba(255,255,255,0.4)';

    for (let i = 0; i < steps; i++) {
      pvy += GRAVITY * simDt;
      px += pvx * simDt;
      py += pvy * simDt;

      if (py > state.canvasH) break;
      if (px < 0 || px > state.canvasW) break;

      if (i % 2 === 0) {
        const alpha = 1 - i / steps;
        ctx.globalAlpha = alpha * 0.5;
        ctx.beginPath();
        ctx.arc(px, py, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  private drawParticles(ctx: CanvasRenderingContext2D, state: BasketballState): void {
    for (const p of state.particles) {
      ctx.globalAlpha = p.life / p.maxLife;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (p.life / p.maxLife), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  private drawSwishText(ctx: CanvasRenderingContext2D, state: BasketballState): void {
    if (!state.showSwish) return;

    const elapsed = (performance.now() - state.lastScoredTime) / 1000;
    const alpha = Math.max(0, 1 - elapsed);
    const yOff = elapsed * 30;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = 'bold 36px monospace';
    ctx.fillStyle = '#ff7043';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    let text = 'SWISH!';
    if (state.streak >= 5) text = 'ON FIRE!';
    else if (state.streak >= 3) text = 'STREAK x' + state.streak + '!';
    else if (state.streak >= 2) text = 'NICE SHOT!';

    ctx.fillText(text, state.hoop.x, state.hoop.y - 50 - yOff);

    // Points indicator
    const streakBonus = Math.min(state.streak - 1, 5);
    const points = 2 + streakBonus;
    ctx.font = 'bold 24px monospace';
    ctx.fillStyle = '#ffab91';
    ctx.fillText('+' + points, state.hoop.x, state.hoop.y - 20 - yOff);

    ctx.restore();
  }
}
