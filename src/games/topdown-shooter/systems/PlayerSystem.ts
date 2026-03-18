import type { Updatable } from '@shared/Updatable';
import type { ShooterState, Vec2 } from '../types';
import {
  PLAYER_SPEED,
  SHOOT_COOLDOWN,
  BULLET_SPEED,
  BULLET_RADIUS,
  ARENA_PADDING,
} from '../types';

export class PlayerSystem implements Updatable<ShooterState> {
  update(state: ShooterState, dt: number): void {
    const { player, keys } = state;

    // ── Movement ──────────────────────────────────────────────────
    let dx = 0;
    let dy = 0;
    if (keys.has('w') || keys.has('arrowup')) dy -= 1;
    if (keys.has('s') || keys.has('arrowdown')) dy += 1;
    if (keys.has('a') || keys.has('arrowleft')) dx -= 1;
    if (keys.has('d') || keys.has('arrowright')) dx += 1;

    // Normalize diagonal
    const mag = Math.sqrt(dx * dx + dy * dy);
    if (mag > 0) {
      dx /= mag;
      dy /= mag;
    }

    player.pos.x += dx * PLAYER_SPEED * dt;
    player.pos.y += dy * PLAYER_SPEED * dt;

    // Clamp inside arena
    const pad = ARENA_PADDING + player.radius;
    player.pos.x = Math.max(pad, Math.min(state.canvasW - pad, player.pos.x));
    player.pos.y = Math.max(pad, Math.min(state.canvasH - pad, player.pos.y));

    // ── Invincibility countdown ──────────────────────────────────
    if (player.invincibleTimer > 0) {
      player.invincibleTimer -= dt;
    }

    // ── Shooting ─────────────────────────────────────────────────
    player.shootCooldown -= dt;
    if (state.mouseDown && player.shootCooldown <= 0) {
      player.shootCooldown = SHOOT_COOLDOWN;
      this.shoot(state);
    }
  }

  private shoot(state: ShooterState): void {
    const { player, mouse, bullets } = state;
    const aim: Vec2 = {
      x: mouse.x - player.pos.x,
      y: mouse.y - player.pos.y,
    };
    const len = Math.sqrt(aim.x * aim.x + aim.y * aim.y);
    if (len === 0) return;

    bullets.push({
      pos: { x: player.pos.x, y: player.pos.y },
      vel: {
        x: (aim.x / len) * BULLET_SPEED,
        y: (aim.y / len) * BULLET_SPEED,
      },
      age: 0,
      radius: BULLET_RADIUS,
      fromPlayer: true,
    });
  }
}
