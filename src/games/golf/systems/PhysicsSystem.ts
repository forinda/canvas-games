import type { Updatable } from '@shared/Updatable';
import type { GolfState, Wall, Obstacle, Slope } from '../types';
import {
  FRICTION,
  MIN_VELOCITY,
  SINK_SPEED_THRESHOLD,
  SINK_DISTANCE_THRESHOLD,
} from '../types';
import { COURSES } from '../data/courses';

export class PhysicsSystem implements Updatable<GolfState> {
  update(state: GolfState, _dt: number): void {
    const ball = state.ball;
    if (!state.ballMoving) return;

    const course = COURSES[state.currentHole];

    // Apply slopes
    this.applySlopes(state, course.slopes);

    // Apply friction
    ball.vel.x *= FRICTION;
    ball.vel.y *= FRICTION;

    // Move ball
    ball.pos.x += ball.vel.x;
    ball.pos.y += ball.vel.y;

    // Wall collisions (course boundary walls + internal walls)
    this.handleWallCollisions(state, course.walls);

    // Obstacle collisions
    this.handleObstacleCollisions(state, course.obstacles);

    // Hole detection
    this.checkHoleSink(state, course);

    // Stop ball if moving very slowly
    const speed = Math.sqrt(ball.vel.x * ball.vel.x + ball.vel.y * ball.vel.y);
    if (speed < MIN_VELOCITY) {
      ball.vel.x = 0;
      ball.vel.y = 0;
      state.ballMoving = false;
    }
  }

  private applySlopes(state: GolfState, slopes: Slope[]): void {
    const ball = state.ball;
    for (let i = 0; i < slopes.length; i++) {
      const slope = slopes[i];
      if (
        ball.pos.x >= slope.x &&
        ball.pos.x <= slope.x + slope.width &&
        ball.pos.y >= slope.y &&
        ball.pos.y <= slope.y + slope.height
      ) {
        ball.vel.x += slope.dirX * slope.strength;
        ball.vel.y += slope.dirY * slope.strength;
      }
    }
  }

  private handleWallCollisions(state: GolfState, walls: Wall[]): void {
    const ball = state.ball;
    const r = ball.radius;

    for (let i = 0; i < walls.length; i++) {
      const wall = walls[i];

      // Project ball onto line segment
      const wx = wall.x2 - wall.x1;
      const wy = wall.y2 - wall.y1;
      const len = Math.sqrt(wx * wx + wy * wy);
      if (len === 0) continue;

      const nx = wx / len;
      const ny = wy / len;

      // Vector from wall start to ball
      const dx = ball.pos.x - wall.x1;
      const dy = ball.pos.y - wall.y1;

      // Project onto wall direction
      const proj = dx * nx + dy * ny;
      const clampedProj = Math.max(0, Math.min(len, proj));

      // Closest point on wall
      const closestX = wall.x1 + nx * clampedProj;
      const closestY = wall.y1 + ny * clampedProj;

      // Distance from ball to closest point
      const distX = ball.pos.x - closestX;
      const distY = ball.pos.y - closestY;
      const dist = Math.sqrt(distX * distX + distY * distY);

      if (dist < r && dist > 0) {
        // Normal from wall to ball
        const normX = distX / dist;
        const normY = distY / dist;

        // Push ball out
        ball.pos.x = closestX + normX * r;
        ball.pos.y = closestY + normY * r;

        // Reflect velocity
        const dot = ball.vel.x * normX + ball.vel.y * normY;
        ball.vel.x -= 2 * dot * normX;
        ball.vel.y -= 2 * dot * normY;

        // Dampen on bounce
        ball.vel.x *= 0.8;
        ball.vel.y *= 0.8;
      }
    }
  }

  private handleObstacleCollisions(state: GolfState, obstacles: Obstacle[]): void {
    const ball = state.ball;
    const r = ball.radius;

    for (let i = 0; i < obstacles.length; i++) {
      const obs = obstacles[i];

      if (obs.shape === 'circle' && obs.radius) {
        const dx = ball.pos.x - obs.x;
        const dy = ball.pos.y - obs.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const minDist = r + obs.radius;

        if (dist < minDist && dist > 0) {
          const normX = dx / dist;
          const normY = dy / dist;

          ball.pos.x = obs.x + normX * minDist;
          ball.pos.y = obs.y + normY * minDist;

          const dot = ball.vel.x * normX + ball.vel.y * normY;
          ball.vel.x -= 2 * dot * normX;
          ball.vel.y -= 2 * dot * normY;

          ball.vel.x *= 0.85;
          ball.vel.y *= 0.85;
        }
      } else {
        // Rectangle collision
        const closestX = Math.max(obs.x, Math.min(ball.pos.x, obs.x + obs.width));
        const closestY = Math.max(obs.y, Math.min(ball.pos.y, obs.y + obs.height));

        const dx = ball.pos.x - closestX;
        const dy = ball.pos.y - closestY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < r && dist > 0) {
          const normX = dx / dist;
          const normY = dy / dist;

          ball.pos.x = closestX + normX * r;
          ball.pos.y = closestY + normY * r;

          const dot = ball.vel.x * normX + ball.vel.y * normY;
          ball.vel.x -= 2 * dot * normX;
          ball.vel.y -= 2 * dot * normY;

          ball.vel.x *= 0.85;
          ball.vel.y *= 0.85;
        }
      }
    }
  }

  private checkHoleSink(
    state: GolfState,
    course: { hole: { pos: { x: number; y: number }; radius: number } }
  ): void {
    const ball = state.ball;
    const hole = course.hole;

    const dx = ball.pos.x - hole.pos.x;
    const dy = ball.pos.y - hole.pos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const speed = Math.sqrt(ball.vel.x * ball.vel.x + ball.vel.y * ball.vel.y);

    if (dist < SINK_DISTANCE_THRESHOLD && speed < SINK_SPEED_THRESHOLD) {
      ball.pos.x = hole.pos.x;
      ball.pos.y = hole.pos.y;
      ball.vel.x = 0;
      ball.vel.y = 0;
      state.ballMoving = false;
      state.holeSunk = true;
      state.sunkTimer = performance.now();
    }
  }
}
