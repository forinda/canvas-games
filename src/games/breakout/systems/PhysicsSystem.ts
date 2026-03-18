import type { Updatable } from '@shared/Updatable';
import type { BreakoutState } from '../types';

export class PhysicsSystem implements Updatable<BreakoutState> {
  update(state: BreakoutState, dt: number): void {
    const { paddle, canvasW } = state;

    // Move paddle to mouse position
    paddle.x = Math.max(
      0,
      Math.min(canvasW - paddle.w, state.mouseX - paddle.w / 2),
    );

    // Move balls
    for (const ball of state.balls) {
      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;

      // Wall bounce: left/right
      if (ball.x - ball.r <= 0) {
        ball.x = ball.r;
        ball.vx = Math.abs(ball.vx);
      } else if (ball.x + ball.r >= canvasW) {
        ball.x = canvasW - ball.r;
        ball.vx = -Math.abs(ball.vx);
      }

      // Wall bounce: top
      if (ball.y - ball.r <= 0) {
        ball.y = ball.r;
        ball.vy = Math.abs(ball.vy);
      }
    }

    // Remove balls that fell below screen
    const lostBalls: number[] = [];
    for (let i = state.balls.length - 1; i >= 0; i--) {
      if (state.balls[i].y - state.balls[i].r > state.canvasH) {
        lostBalls.push(i);
      }
    }
    for (const idx of lostBalls) {
      state.balls.splice(idx, 1);
    }

    // If all balls lost, lose a life
    if (state.balls.length === 0) {
      state.lives--;
      if (state.lives <= 0) {
        state.phase = 'gameover';
      } else {
        // Respawn a ball on the paddle
        state.balls.push(this.createBall(state));
      }
    }

    // Move powerups
    for (const p of state.powerups) {
      if (p.alive) {
        p.y += p.vy * dt;
        if (p.y > state.canvasH) {
          p.alive = false;
        }
      }
    }

    // Clean dead powerups
    state.powerups = state.powerups.filter((p) => p.alive);
  }

  createBall(state: BreakoutState): { x: number; y: number; vx: number; vy: number; r: number } {
    const { paddle, baseBallSpeed } = state;
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.6;
    return {
      x: paddle.x + paddle.w / 2,
      y: paddle.y - 8,
      vx: Math.cos(angle) * baseBallSpeed,
      vy: Math.sin(angle) * baseBallSpeed,
      r: 6,
    };
  }
}
