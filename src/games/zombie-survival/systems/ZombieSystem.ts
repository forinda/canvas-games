import type { Updatable } from '@shared/Updatable.ts';
import type { GameState, Zombie } from '../types.ts';
import { ARENA_W, ARENA_H, BARRICADE_SIZE } from '../types.ts';

export class ZombieSystem implements Updatable<GameState> {
  update(state: GameState, dt: number): void {
    const player = state.player;

    for (const z of state.zombies) {
      if (z.dead) continue;

      z.attackCooldown = Math.max(0, z.attackCooldown - dt);

      // Determine target: check barricades in path first
      const nearestBarricade = this.findNearestBarricade(z, state);
      const distToPlayer = this.dist(z.x, z.y, player.x, player.y);

      // Decide state
      if (nearestBarricade) {
        const distToBarricade = this.dist(z.x, z.y, nearestBarricade.x, nearestBarricade.y);
        if (distToBarricade < distToPlayer * 0.7) {
          z.state = 'attacking_barricade';
          z.targetBarricadeId = nearestBarricade.id;
        } else {
          z.state = 'chasing';
          z.targetBarricadeId = null;
        }
      } else {
        z.state = 'chasing';
        z.targetBarricadeId = null;
      }

      // Move toward target
      this.moveZombie(z, state, dt);
    }

    // Remove dead zombies
    state.zombies = state.zombies.filter(z => !z.dead);
  }

  private moveZombie(z: Zombie, state: GameState, dt: number): void {
    let targetX: number;
    let targetY: number;

    if (z.state === 'attacking_barricade' && z.targetBarricadeId !== null) {
      const barricade = state.barricades.find(b => b.id === z.targetBarricadeId && !b.dead);
      if (barricade) {
        targetX = barricade.x;
        targetY = barricade.y;
        const dist = this.dist(z.x, z.y, targetX, targetY);
        if (dist < z.radius + BARRICADE_SIZE / 2 + 4) {
          // In attack range of barricade
          return; // CombatSystem handles damage
        }
      } else {
        z.state = 'chasing';
        z.targetBarricadeId = null;
        targetX = state.player.x;
        targetY = state.player.y;
      }
    } else {
      targetX = state.player.x;
      targetY = state.player.y;

      const dist = this.dist(z.x, z.y, targetX, targetY);
      if (dist < z.radius + 14 + 2) {
        z.state = 'attacking_player';
        return; // CombatSystem handles damage
      }
    }

    const dx = targetX - z.x;
    const dy = targetY - z.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 1) {
      z.x += (dx / dist) * z.speed * dt;
      z.y += (dy / dist) * z.speed * dt;
    }

    // Clamp to arena
    z.x = Math.max(z.radius, Math.min(ARENA_W - z.radius, z.x));
    z.y = Math.max(z.radius, Math.min(ARENA_H - z.radius, z.y));
  }

  private findNearestBarricade(z: Zombie, state: GameState) {
    let nearest = null;
    let nearestDist = Infinity;
    for (const b of state.barricades) {
      if (b.dead) continue;
      // Only target barricades that are between zombie and player
      const dToB = this.dist(z.x, z.y, b.x, b.y);
      if (dToB < nearestDist && dToB < 200) {
        nearest = b;
        nearestDist = dToB;
      }
    }
    return nearest;
  }

  private dist(x1: number, y1: number, x2: number, y2: number): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
  }
}
