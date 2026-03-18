import type { ActiveEnemy, GameStateData, PlacedTower, Projectile } from '../types';
import { TOWER_DEFS, getTowerStats } from '../data/towers';
import { GridSystem } from './GridSystem';
import { pathProgress } from './PathSystem';

let _projCounter = 0;

export class TowerSystem {
  static update(state: GameStateData, grid: GridSystem): void {
    const now = performance.now();

    for (const tower of state.towers) {
      const stats = getTowerStats(tower.type, tower.level);

      // Find target: enemy furthest along path within range
      const target = TowerSystem.findTarget(state, tower, stats.range, grid);
      tower.targetId = target ? target.id : null;

      if (!target) continue;

      // Check fire rate
      if (now - tower.lastFiredAt < stats.fireInterval) continue;
      tower.lastFiredAt = now;

      // Spawn projectile
      const center = grid.cellCenter(tower.col, tower.row);
      const proj: Projectile = {
        id: `proj_${++_projCounter}`,
        type: stats.projectileType,
        fromX: center.x,
        fromY: center.y,
        toX: target.x,
        toY: target.y,
        x: center.x,
        y: center.y,
        speed: stats.projectileSpeed,
        damage: stats.damage,
        splashRadius: stats.splashRadius,
        slowFactor: stats.slowFactor,
        targetId: target.id,
        done: false,
        color: TOWER_DEFS[tower.type].color,
      };
      state.projectiles.push(proj);
    }
  }

  static findTarget(
    state: GameStateData,
    tower: PlacedTower,
    range: number,
    grid: GridSystem,
  ): ActiveEnemy | null {
    const center = grid.cellCenter(tower.col, tower.row);
    let best: ActiveEnemy | null = null;
    let bestProgress = -1;

    for (const enemy of state.enemies) {
      if (enemy.dead || enemy.reachedEnd) continue;
      const dx = enemy.x - center.x;
      const dy = enemy.y - center.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > range) continue;
      const pp = pathProgress(enemy);
      if (pp > bestProgress) {
        bestProgress = pp;
        best = enemy;
      }
    }

    return best;
  }
}
