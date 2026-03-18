import type { Updatable } from '@shared/Updatable';
import type { PipeState } from '../types';
import { getOpenings, DIR_OFFSETS, oppositeDir } from '../types';

/**
 * BFS from source to find all connected pipes.
 * A pipe connects to its neighbor if:
 * - The current pipe has an opening toward the neighbor
 * - The neighbor pipe has an opening back toward the current pipe
 *
 * Also animates water fill and detects win condition.
 */
export class FlowSystem implements Updatable<PipeState> {
  private readonly FILL_SPEED = 3; // fill units per second

  update(state: PipeState, dt: number): void {
    if (state.status === 'won') return;

    // Update timer
    state.timer += dt / 1000;

    // Run connectivity BFS
    this.computeConnections(state);

    // Animate water fill
    this.animateWater(state, dt);

    // Check win: drain connected
    if (state.grid[state.drainRow]?.[state.drainCol]?.connected) {
      // Check if drain is fully filled
      if (state.grid[state.drainRow][state.drainCol].waterFill >= 1) {
        state.status = 'won';
      }
    }
  }

  private computeConnections(state: PipeState): void {
    const { grid, rows, cols, sourceRow, sourceCol } = state;

    // Reset all connections
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        grid[r][c].connected = false;
      }
    }

    // BFS from source
    const queue: [number, number][] = [[sourceRow, sourceCol]];
    grid[sourceRow][sourceCol].connected = true;

    while (queue.length > 0) {
      const [r, c] = queue.shift()!;
      const pipe = grid[r][c];
      const openings = getOpenings(pipe);

      for (const dir of openings) {
        const nr = r + DIR_OFFSETS[dir][0];
        const nc = c + DIR_OFFSETS[dir][1];

        if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;

        const neighbor = grid[nr][nc];
        if (neighbor.connected) continue;

        // Check if neighbor has an opening back toward us
        const neighborOpenings = getOpenings(neighbor);
        if (neighborOpenings.includes(oppositeDir(dir))) {
          neighbor.connected = true;
          queue.push([nr, nc]);
        }
      }
    }
  }

  private animateWater(state: PipeState, dt: number): void {
    const dtSec = dt / 1000;
    for (let r = 0; r < state.rows; r++) {
      for (let c = 0; c < state.cols; c++) {
        const pipe = state.grid[r][c];
        if (pipe.connected) {
          pipe.waterFill = Math.min(1, pipe.waterFill + this.FILL_SPEED * dtSec);
        } else {
          pipe.waterFill = Math.max(0, pipe.waterFill - this.FILL_SPEED * 2 * dtSec);
        }
      }
    }
  }
}
