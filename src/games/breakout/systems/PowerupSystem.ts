import type { Updatable } from '@shared/Updatable';
import type { BreakoutState } from '../types';
import { PADDLE_BASE_W } from '../types';

export class PowerupSystem implements Updatable<BreakoutState> {
  update(state: BreakoutState, dt: number): void {
    const dtMs = dt * 1000;

    // Tick down effect timers
    for (const effect of state.effects) {
      effect.remaining -= dtMs;
    }

    // Apply active effects
    this.applyEffects(state);

    // Remove expired effects
    state.effects = state.effects.filter((e) => e.remaining > 0);

    // Re-apply after cleanup (to revert expired ones)
    this.applyEffects(state);
  }

  private applyEffects(state: BreakoutState): void {
    // Reset paddle width to base
    let paddleW = PADDLE_BASE_W;

    // Determine ball speed multiplier
    let speedMult = 1.0;

    let hasMultiball = false;

    for (const effect of state.effects) {
      if (effect.remaining <= 0) continue;

      switch (effect.type) {
        case 'wide':
          paddleW = PADDLE_BASE_W * 1.6;
          break;
        case 'slow':
          speedMult = 0.65;
          break;
        case 'multiball':
          if (!hasMultiball) {
            hasMultiball = true;
            // Add extra balls if we only have one
            if (state.balls.length === 1) {
              const b = state.balls[0];
              const speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
              // Spawn two extra balls at different angles
              for (let i = 0; i < 2; i++) {
                const angle = Math.atan2(b.vy, b.vx) + (i === 0 ? 0.4 : -0.4);
                state.balls.push({
                  x: b.x,
                  y: b.y,
                  vx: Math.cos(angle) * speed,
                  vy: Math.sin(angle) * speed,
                  r: b.r,
                });
              }
            }
            // Mark it so we only add once — set remaining to just 1 to expire next frame
            effect.remaining = 1;
          }
          break;
      }
    }

    // Apply paddle width
    const oldCenterX = state.paddle.x + state.paddle.w / 2;
    state.paddle.w = paddleW;
    state.paddle.x = Math.max(
      0,
      Math.min(state.canvasW - paddleW, oldCenterX - paddleW / 2),
    );

    // Apply speed multiplier to balls
    const targetSpeed = state.baseBallSpeed * speedMult;
    for (const ball of state.balls) {
      const currentSpeed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
      if (currentSpeed > 0 && Math.abs(currentSpeed - targetSpeed) > 1) {
        const scale = targetSpeed / currentSpeed;
        ball.vx *= scale;
        ball.vy *= scale;
      }
    }
  }
}
