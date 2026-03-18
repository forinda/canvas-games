import type { Renderable } from '@shared/Renderable';
import type { FlappyState } from '../types';
import { GAP_SIZE, GROUND_HEIGHT } from '../types';

export class GameRenderer implements Renderable<FlappyState> {
  render(ctx: CanvasRenderingContext2D, state: FlappyState): void {
    const { canvasW, canvasH } = state;

    // Sky gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, canvasH);
    skyGrad.addColorStop(0, '#4dc9f6');
    skyGrad.addColorStop(0.7, '#87ceeb');
    skyGrad.addColorStop(1, '#b0e0e6');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, canvasW, canvasH);

    // Scrolling clouds (decorative)
    this.drawClouds(ctx, state);

    // Pipes
    this.drawPipes(ctx, state);

    // Ground
    this.drawGround(ctx, state);

    // Bird
    this.drawBird(ctx, state);

    // Death flash
    if (state.flashTimer > 0) {
      const alpha = state.flashTimer / 150;
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.7})`;
      ctx.fillRect(0, 0, canvasW, canvasH);
    }
  }

  private drawClouds(ctx: CanvasRenderingContext2D, state: FlappyState): void {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    const offset = (state.backgroundOffset * 0.3) % (state.canvasW + 200);
    for (let i = 0; i < 4; i++) {
      const cx = ((i * 300 + 100 - offset) % (state.canvasW + 200)) - 100;
      const cy = 60 + i * 40;
      ctx.beginPath();
      ctx.ellipse(cx, cy, 60, 25, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(cx + 40, cy - 5, 40, 20, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(cx - 30, cy + 3, 35, 18, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawPipes(ctx: CanvasRenderingContext2D, state: FlappyState): void {
    for (const pipe of state.pipes) {
      const gapTop = pipe.gapY - GAP_SIZE / 2;
      const gapBottom = pipe.gapY + GAP_SIZE / 2;

      // Pipe body color
      const pipeGrad = ctx.createLinearGradient(
        pipe.x, 0, pipe.x + pipe.width, 0,
      );
      pipeGrad.addColorStop(0, '#3a8d3a');
      pipeGrad.addColorStop(0.3, '#5cbf2a');
      pipeGrad.addColorStop(0.7, '#5cbf2a');
      pipeGrad.addColorStop(1, '#3a8d3a');

      // Top pipe
      ctx.fillStyle = pipeGrad;
      ctx.fillRect(pipe.x, 0, pipe.width, gapTop);

      // Top pipe cap
      const capOverhang = 4;
      const capHeight = 26;
      ctx.fillStyle = '#4aa82e';
      ctx.fillRect(
        pipe.x - capOverhang,
        gapTop - capHeight,
        pipe.width + capOverhang * 2,
        capHeight,
      );
      ctx.strokeStyle = '#2d6e1e';
      ctx.lineWidth = 2;
      ctx.strokeRect(
        pipe.x - capOverhang,
        gapTop - capHeight,
        pipe.width + capOverhang * 2,
        capHeight,
      );

      // Bottom pipe
      ctx.fillStyle = pipeGrad;
      ctx.fillRect(pipe.x, gapBottom, pipe.width, state.groundY - gapBottom);

      // Bottom pipe cap
      ctx.fillStyle = '#4aa82e';
      ctx.fillRect(
        pipe.x - capOverhang,
        gapBottom,
        pipe.width + capOverhang * 2,
        capHeight,
      );
      ctx.strokeStyle = '#2d6e1e';
      ctx.lineWidth = 2;
      ctx.strokeRect(
        pipe.x - capOverhang,
        gapBottom,
        pipe.width + capOverhang * 2,
        capHeight,
      );

      // Pipe border
      ctx.strokeStyle = '#2d6e1e';
      ctx.lineWidth = 2;
      ctx.strokeRect(pipe.x, 0, pipe.width, gapTop);
      ctx.strokeRect(pipe.x, gapBottom, pipe.width, state.groundY - gapBottom);
    }
  }

  private drawGround(ctx: CanvasRenderingContext2D, state: FlappyState): void {
    const gY = state.groundY;
    const gH = GROUND_HEIGHT;

    // Ground fill
    const groundGrad = ctx.createLinearGradient(0, gY, 0, gY + gH);
    groundGrad.addColorStop(0, '#ded895');
    groundGrad.addColorStop(0.15, '#d2b04c');
    groundGrad.addColorStop(1, '#8b6914');
    ctx.fillStyle = groundGrad;
    ctx.fillRect(0, gY, state.canvasW, gH);

    // Grass strip on top
    ctx.fillStyle = '#5cbf2a';
    ctx.fillRect(0, gY, state.canvasW, 6);

    // Scrolling ground detail lines
    ctx.strokeStyle = 'rgba(139, 105, 20, 0.3)';
    ctx.lineWidth = 1;
    const offset = state.groundOffset % 40;
    for (let x = -offset; x < state.canvasW + 40; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, gY + 15);
      ctx.lineTo(x + 20, gY + gH - 10);
      ctx.stroke();
    }
  }

  private drawBird(ctx: CanvasRenderingContext2D, state: FlappyState): void {
    const bird = state.bird;

    ctx.save();
    ctx.translate(bird.x, bird.y);
    ctx.rotate(bird.rotation);

    const r = bird.radius;

    // Body
    ctx.fillStyle = '#f1c40f';
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#d4a017';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Belly highlight
    ctx.fillStyle = '#f9e076';
    ctx.beginPath();
    ctx.ellipse(2, 3, r * 0.55, r * 0.45, 0.2, 0, Math.PI * 2);
    ctx.fill();

    // Eye (white)
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(r * 0.4, -r * 0.25, r * 0.32, 0, Math.PI * 2);
    ctx.fill();

    // Pupil
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(r * 0.52, -r * 0.22, r * 0.16, 0, Math.PI * 2);
    ctx.fill();

    // Beak
    ctx.fillStyle = '#e74c3c';
    ctx.beginPath();
    ctx.moveTo(r * 0.7, -r * 0.05);
    ctx.lineTo(r * 1.4, r * 0.1);
    ctx.lineTo(r * 0.7, r * 0.3);
    ctx.closePath();
    ctx.fill();

    // Wing
    const wingY = r * 0.1 + bird.wingAngle * 4;
    ctx.fillStyle = '#e8b710';
    ctx.beginPath();
    ctx.ellipse(-r * 0.3, wingY, r * 0.55, r * 0.3, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#c9990a';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.restore();
  }
}
