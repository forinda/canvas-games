import type { Updatable } from '@shared/Updatable';
import type { PlatState } from '../types';
import { JUMP_SPEED } from '../types';

export class EnemySystem implements Updatable<PlatState> {
  update(state: PlatState, dt: number): void {
    const s = state;

    for (const e of s.enemies) {
      e.x += e.speed * e.dir * dt;
      if (e.x < e.minX || e.x > e.maxX) e.dir *= -1;

      // Player collision
      if (
        s.px + s.pw > e.x &&
        s.px < e.x + e.w &&
        s.py + s.ph > e.y &&
        s.py < e.y + e.h
      ) {
        if (s.vy > 0 && s.py + s.ph < e.y + e.h * 0.5) {
          // Stomp
          e.y = 9999;
          s.vy = JUMP_SPEED * 0.6;
          s.score += 100;
        } else {
          // Hit
          s.lives--;
          if (s.lives <= 0) {
            s.gameOver = true;
            return;
          }
          s.px = 60;
          s.py = 460;
          s.vx = 0;
          s.vy = 0;
        }
      }
    }
  }
}
