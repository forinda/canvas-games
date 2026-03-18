import type { Updatable } from '@shared/Updatable';
import type {
  Ant,
  AntColonyState,
  Pheromone,
} from '../types';
import {
  ANT_SPEED,
  COLONY_RADIUS,
  DELIVERY_DISTANCE,
  MAX_PHEROMONES,
  PHEROMONE_DECAY,
  PHEROMONE_DROP_INTERVAL,
  PICKUP_DISTANCE,
} from '../types';

export class AntSystem implements Updatable<AntColonyState> {
  update(state: AntColonyState, dt: number): void {
    this._assignTasks(state);
    this._decayPheromones(state, dt);

    for (const ant of state.ants) {
      switch (ant.task) {
        case 'forage':
          this._updateForager(ant, state, dt);
          break;
        case 'build':
          this._updateBuilder(ant, state, dt);
          break;
        case 'idle':
          this._updateIdle(ant, state, dt);
          break;
      }
      this._dropPheromone(ant, state, dt);
    }
  }

  /** Reassign ant tasks based on current ratio */
  private _assignTasks(state: AntColonyState): void {
    const { ants, taskRatio } = state;
    const n = ants.length;
    if (n === 0) return;

    const forageCount = Math.round(n * taskRatio.forage);
    const buildCount = Math.round(n * taskRatio.build);

    let fi = 0;
    let bi = 0;
    for (const ant of ants) {
      if (fi < forageCount) {
        if (ant.task !== 'forage') {
          ant.task = 'forage';
          ant.returning = false;
          ant.carrying = false;
        }
        fi++;
      } else if (bi < buildCount) {
        if (ant.task !== 'build') {
          ant.task = 'build';
          ant.returning = false;
          ant.carrying = false;
        }
        bi++;
      } else {
        if (ant.task !== 'idle') {
          ant.task = 'idle';
          ant.returning = false;
          ant.carrying = false;
        }
      }
    }
  }

  private _updateForager(ant: Ant, state: AntColonyState, dt: number): void {
    const speed = ANT_SPEED * dt;

    if (ant.returning) {
      // Head back to colony
      this._moveToward(ant, state.colony.x, state.colony.y, speed);
      const d = this._dist(ant.x, ant.y, state.colony.x, state.colony.y);
      if (d < DELIVERY_DISTANCE) {
        if (ant.carrying) {
          state.colony.food += 1;
          ant.carrying = false;
        }
        ant.returning = false;
      }
      return;
    }

    // Find nearest food source
    let nearest = this._findNearestFood(ant, state);
    if (!nearest) {
      // Follow food pheromones or wander
      const phTarget = this._followPheromone(ant, state, 'food');
      if (phTarget) {
        this._moveToward(ant, phTarget.x, phTarget.y, speed);
      } else {
        this._wander(ant, state, speed);
      }
      return;
    }

    this._moveToward(ant, nearest.x, nearest.y, speed);
    const d = this._dist(ant.x, ant.y, nearest.x, nearest.y);
    if (d < PICKUP_DISTANCE && nearest.amount > 0) {
      nearest.amount -= 1;
      ant.carrying = true;
      ant.returning = true;
    }
  }

  private _updateBuilder(ant: Ant, state: AntColonyState, dt: number): void {
    const speed = ANT_SPEED * dt;

    // Find incomplete tunnel
    const tunnel = state.tunnels.find((t) => !t.complete);
    if (!tunnel) {
      this._wander(ant, state, speed);
      return;
    }

    // Move toward the midpoint of the incomplete tunnel
    const mx = (tunnel.x1 + tunnel.x2) / 2;
    const my = (tunnel.y1 + tunnel.y2) / 2;
    this._moveToward(ant, mx, my, speed);

    const d = this._dist(ant.x, ant.y, mx, my);
    if (d < 20) {
      tunnel.progress += 0.3 * dt;
      if (tunnel.progress >= 1) {
        tunnel.progress = 1;
        tunnel.complete = true;
      }
    }
  }

  private _updateIdle(ant: Ant, state: AntColonyState, dt: number): void {
    const speed = ANT_SPEED * 0.5 * dt;
    // Wander near colony
    const d = this._dist(ant.x, ant.y, state.colony.x, state.colony.y);
    if (d > COLONY_RADIUS * 3) {
      this._moveToward(ant, state.colony.x, state.colony.y, speed);
    } else {
      this._wander(ant, state, speed);
    }
  }

  private _dropPheromone(ant: Ant, state: AntColonyState, dt: number): void {
    ant.pheromoneTimer -= dt;
    if (ant.pheromoneTimer <= 0) {
      ant.pheromoneTimer = PHEROMONE_DROP_INTERVAL;
      const type = ant.returning ? 'food' : 'home';
      state.pheromones.push({
        x: ant.x,
        y: ant.y,
        strength: ant.carrying ? 1.0 : 0.5,
        type,
      });
      // Prune
      if (state.pheromones.length > MAX_PHEROMONES) {
        state.pheromones.splice(0, state.pheromones.length - MAX_PHEROMONES);
      }
    }
  }

  private _decayPheromones(state: AntColonyState, dt: number): void {
    for (let i = state.pheromones.length - 1; i >= 0; i--) {
      state.pheromones[i].strength -= PHEROMONE_DECAY * dt;
      if (state.pheromones[i].strength <= 0) {
        state.pheromones.splice(i, 1);
      }
    }
  }

  private _findNearestFood(ant: Ant, state: AntColonyState) {
    let best = null;
    let bestDist = Infinity;
    for (const fs of state.foodSources) {
      if (fs.amount <= 0) continue;
      const d = this._dist(ant.x, ant.y, fs.x, fs.y);
      if (d < bestDist) {
        bestDist = d;
        best = fs;
      }
    }
    return bestDist < 400 ? best : null; // vision range
  }

  private _followPheromone(
    ant: Ant,
    state: AntColonyState,
    type: Pheromone['type'],
  ): { x: number; y: number } | null {
    let best = null;
    let bestScore = 0;
    for (const p of state.pheromones) {
      if (p.type !== type) continue;
      const d = this._dist(ant.x, ant.y, p.x, p.y);
      if (d < 5 || d > 100) continue;
      const score = p.strength / d;
      if (score > bestScore) {
        bestScore = score;
        best = p;
      }
    }
    return best;
  }

  private _moveToward(ant: Ant, tx: number, ty: number, speed: number): void {
    const dx = tx - ant.x;
    const dy = ty - ant.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 1) return;
    const targetAngle = Math.atan2(dy, dx);
    // Smooth turning
    let angleDiff = targetAngle - ant.angle;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    ant.angle += angleDiff * 0.15;
    ant.x += Math.cos(ant.angle) * Math.min(speed, dist);
    ant.y += Math.sin(ant.angle) * Math.min(speed, dist);
  }

  private _wander(ant: Ant, state: AntColonyState, speed: number): void {
    ant.angle += (Math.random() - 0.5) * 0.6;
    ant.x += Math.cos(ant.angle) * speed;
    ant.y += Math.sin(ant.angle) * speed;
    // Keep in bounds
    const margin = 10;
    if (ant.x < margin) { ant.x = margin; ant.angle = Math.random() * Math.PI - Math.PI / 2; }
    if (ant.x > state.width - margin) { ant.x = state.width - margin; ant.angle = Math.PI + (Math.random() * Math.PI - Math.PI / 2); }
    if (ant.y < margin) { ant.y = margin; ant.angle = Math.random() * Math.PI; }
    if (ant.y > state.height - margin) { ant.y = state.height - margin; ant.angle = -Math.random() * Math.PI; }
  }

  private _dist(x1: number, y1: number, x2: number, y2: number): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
  }
}
