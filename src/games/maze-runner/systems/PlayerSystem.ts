import type { Updatable } from '@shared/Updatable.ts';
import type { MazeState } from '../types.ts';
import type { InputSystem } from './InputSystem.ts';

/**
 * Handles grid-based player movement with wall collision and fog-of-war reveal.
 */
export class PlayerSystem implements Updatable<MazeState> {
  private input: InputSystem;

  constructor(input: InputSystem) {
    this.input = input;
  }

  update(state: MazeState, _dt: number): void {
    if (state.paused || state.won || state.lost || !state.started) return;

    const dir = this.input.pendingDir;
    if (!dir) return;
    this.input.pendingDir = null;

    const { player, grid } = state;
    const cell = grid[player.y][player.x];

    let nx = player.x;
    let ny = player.y;

    if (dir === 'up' && !cell.walls.top) ny -= 1;
    else if (dir === 'down' && !cell.walls.bottom) ny += 1;
    else if (dir === 'left' && !cell.walls.left) nx -= 1;
    else if (dir === 'right' && !cell.walls.right) nx += 1;

    // Only move if position actually changed (wall not blocking)
    if (nx !== player.x || ny !== player.y) {
      player.x = nx;
      player.y = ny;

      // Reveal cells around new position
      this.revealAround(state);

      // Check win
      if (player.x === state.exit.x && player.y === state.exit.y) {
        state.won = true;
      }
    }
  }

  /** Mark cells within reveal radius as permanently revealed */
  revealAround(state: MazeState): void {
    const { player, revealRadius, mazeW, mazeH, revealed } = state;
    for (let dy = -revealRadius; dy <= revealRadius; dy++) {
      for (let dx = -revealRadius; dx <= revealRadius; dx++) {
        const cx = player.x + dx;
        const cy = player.y + dy;
        if (cx >= 0 && cx < mazeW && cy >= 0 && cy < mazeH) {
          if (dx * dx + dy * dy <= revealRadius * revealRadius) {
            revealed.add(`${cx},${cy}`);
          }
        }
      }
    }
  }
}
