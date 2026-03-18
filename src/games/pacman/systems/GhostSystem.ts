import type { Updatable } from '@shared/Updatable';
import type { PacManState, Ghost, Direction, Position } from '../types';
import {
  GHOST_SPEED,
  GHOST_FRIGHTENED_SPEED,
  GHOST_EATEN_SPEED,
  MODE_DURATIONS,
} from '../types';

const DIRECTIONS: Direction[] = ['up', 'left', 'down', 'right'];

export class GhostSystem implements Updatable<PacManState> {
  update(state: PacManState, dt: number): void {
    if (state.paused || state.gameOver || !state.started || state.won) return;

    this.updateModeTimers(state, dt);
    this.updateFrightenedTimer(state, dt);

    for (const ghost of state.ghosts) {
      this.updateGhostRelease(ghost, state, dt);
      if (!ghost.active) continue;
      this.moveGhost(ghost, state, dt);
    }
  }

  private updateModeTimers(state: PacManState, dt: number): void {
    if (state.frightenedTimer > 0) return; // Don't advance mode timer during fright

    state.modeTimer += dt;
    const duration = MODE_DURATIONS[state.modeIndex] ?? Infinity;

    if (state.modeTimer >= duration) {
      state.modeTimer = 0;
      state.modeIndex = Math.min(state.modeIndex + 1, MODE_DURATIONS.length - 1);
      state.globalMode = state.modeIndex % 2 === 0 ? 'scatter' : 'chase';

      // Update non-frightened ghost modes and reverse
      for (const ghost of state.ghosts) {
        if (ghost.mode !== 'frightened' && !ghost.eaten) {
          ghost.mode = state.globalMode;
          ghost.dir = this.reverseDir(ghost.dir);
        }
      }
    }
  }

  private updateFrightenedTimer(state: PacManState, dt: number): void {
    if (state.frightenedTimer <= 0) return;

    state.frightenedTimer -= dt;
    if (state.frightenedTimer <= 0) {
      state.frightenedTimer = 0;
      // Revert all frightened ghosts
      for (const ghost of state.ghosts) {
        if (ghost.mode === 'frightened') {
          ghost.mode = state.globalMode;
        }
      }
    }
  }

  private updateGhostRelease(ghost: Ghost, state: PacManState, dt: number): void {
    if (ghost.active) return;
    ghost.releaseTimer -= dt;
    if (ghost.releaseTimer <= 0) {
      ghost.active = true;
      // Place ghost just outside the house
      ghost.pos = { x: 13.5, y: 11 };
      ghost.dir = 'left';
      ghost.mode = state.frightenedTimer > 0 ? 'frightened' : state.globalMode;
    }
  }

  private moveGhost(ghost: Ghost, state: PacManState, dt: number): void {
    let speed: number;
    if (ghost.eaten) {
      speed = GHOST_EATEN_SPEED;
    } else if (ghost.mode === 'frightened') {
      speed = GHOST_FRIGHTENED_SPEED;
    } else {
      speed = GHOST_SPEED;
    }

    const movement = speed * dt;
    const delta = this.dirToDelta(ghost.dir);
    ghost.pos.x += delta.x * movement;
    ghost.pos.y += delta.y * movement;

    // Tunnel wrap
    if (ghost.pos.x < -0.5) ghost.pos.x = state.gridWidth - 0.5;
    if (ghost.pos.x > state.gridWidth - 0.5) ghost.pos.x = -0.5;

    // Snap and choose direction at intersections
    const cx = Math.round(ghost.pos.x);
    const cy = Math.round(ghost.pos.y);
    const distToCenter = Math.abs(ghost.pos.x - cx) + Math.abs(ghost.pos.y - cy);

    if (distToCenter < 0.15) {
      ghost.pos.x = cx;
      ghost.pos.y = cy;

      // If eaten, check if back at home
      if (ghost.eaten) {
        if (Math.abs(cx - ghost.homePos.x) < 1 && Math.abs(cy - ghost.homePos.y) < 1) {
          ghost.eaten = false;
          ghost.mode = state.frightenedTimer > 0 ? 'frightened' : state.globalMode;
        }
      }

      const target = this.getTarget(ghost, state);
      ghost.dir = this.chooseBestDirection(ghost, state, target);
    }
  }

  private getTarget(ghost: Ghost, state: PacManState): Position {
    if (ghost.eaten) {
      return { x: 13, y: 14 }; // Ghost house entrance
    }

    if (ghost.mode === 'scatter') {
      return ghost.scatterTarget;
    }

    if (ghost.mode === 'frightened') {
      // Random target
      return {
        x: Math.floor(Math.random() * state.gridWidth),
        y: Math.floor(Math.random() * state.gridHeight),
      };
    }

    // Chase mode - different per ghost
    const pac = state.pacman;
    const px = Math.round(pac.pos.x);
    const py = Math.round(pac.pos.y);

    switch (ghost.name) {
      case 'blinky':
        // Direct chase
        return { x: px, y: py };

      case 'pinky': {
        // 4 tiles ahead of Pac-Man
        const d = this.dirToDelta(pac.dir);
        return { x: px + d.x * 4, y: py + d.y * 4 };
      }

      case 'inky': {
        // Flank: 2 tiles ahead of pac-man, then double the vector from Blinky
        const d2 = this.dirToDelta(pac.dir);
        const ahead = { x: px + d2.x * 2, y: py + d2.y * 2 };
        const blinky = state.ghosts.find(g => g.name === 'blinky')!;
        const bx = Math.round(blinky.pos.x);
        const by = Math.round(blinky.pos.y);
        return {
          x: ahead.x + (ahead.x - bx),
          y: ahead.y + (ahead.y - by),
        };
      }

      case 'clyde': {
        // If far, chase directly. If close, scatter.
        const dist = Math.sqrt(
          (ghost.pos.x - px) ** 2 + (ghost.pos.y - py) ** 2,
        );
        if (dist > 8) {
          return { x: px, y: py };
        }
        return ghost.scatterTarget;
      }

      default:
        return { x: px, y: py };
    }
  }

  private chooseBestDirection(
    ghost: Ghost,
    state: PacManState,
    target: Position,
  ): Direction {
    const cx = Math.round(ghost.pos.x);
    const cy = Math.round(ghost.pos.y);
    const reverse = this.reverseDir(ghost.dir);

    let bestDir: Direction = ghost.dir;
    let bestDist = Infinity;

    // Ghosts prioritize: up, left, down, right (in case of tie)
    for (const dir of DIRECTIONS) {
      if (dir === reverse) continue; // Can't reverse

      const d = this.dirToDelta(dir);
      const nx = cx + d.x;
      const ny = cy + d.y;

      if (!this.canGhostEnter(state, nx, ny, ghost.eaten)) continue;

      const dist = (nx - target.x) ** 2 + (ny - target.y) ** 2;
      if (dist < bestDist) {
        bestDist = dist;
        bestDir = dir;
      }
    }

    return bestDir;
  }

  private canGhostEnter(
    state: PacManState,
    x: number,
    y: number,
    eaten: boolean,
  ): boolean {
    // Allow tunnel
    if (x < 0 || x >= state.gridWidth) return true;
    if (y < 0 || y >= state.gridHeight) return false;

    const cell = state.grid[y][x];
    if (cell.type === 'wall') return false;
    if (cell.type === 'door') return eaten; // Only eaten ghosts can re-enter
    return true;
  }

  private dirToDelta(dir: Direction): Position {
    switch (dir) {
      case 'up': return { x: 0, y: -1 };
      case 'down': return { x: 0, y: 1 };
      case 'left': return { x: -1, y: 0 };
      case 'right': return { x: 1, y: 0 };
      default: return { x: 0, y: 0 };
    }
  }

  private reverseDir(dir: Direction): Direction {
    switch (dir) {
      case 'up': return 'down';
      case 'down': return 'up';
      case 'left': return 'right';
      case 'right': return 'left';
      default: return dir;
    }
  }
}
