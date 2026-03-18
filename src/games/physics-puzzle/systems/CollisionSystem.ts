import type { Updatable } from '@shared/Updatable';
import type { Body, PuzzleState } from '../types';

export function boxOverlap(a: Body, b: Body): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export class CollisionSystem implements Updatable<PuzzleState> {
  update(state: PuzzleState, _dt: number): void {
    for (const b of state.bodies) {
      if (b.isStatic) continue;

      // Collision with static bodies
      for (const other of state.bodies) {
        if (other === b || !other.isStatic) continue;
        if (boxOverlap(b, other)) {
          // Simple top collision
          const overlapY = (b.y + b.h) - other.y;
          const overlapBottom = (other.y + other.h) - b.y;
          const overlapLeft = (b.x + b.w) - other.x;
          const overlapRight = (other.x + other.w) - b.x;

          const minOverlap = Math.min(overlapY, overlapBottom, overlapLeft, overlapRight);

          if (minOverlap === overlapY && b.vy > 0) {
            b.y = other.y - b.h;
            b.vy = -b.vy * b.restitution;
            b.vx *= 0.95; // friction
          } else if (minOverlap === overlapBottom && b.vy < 0) {
            b.y = other.y + other.h;
            b.vy = -b.vy * b.restitution;
          } else if (minOverlap === overlapLeft) {
            b.x = other.x - b.w;
            b.vx = -b.vx * b.restitution;
          } else if (minOverlap === overlapRight) {
            b.x = other.x + other.w;
            b.vx = -b.vx * b.restitution;
          }
        }
      }
    }
  }
}
