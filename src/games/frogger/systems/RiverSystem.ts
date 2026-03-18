import type { Updatable } from '@shared/Updatable';
import type { FroggerState, Log } from '../types';

export class RiverSystem implements Updatable<FroggerState> {
  /** Populate logs for all river lanes on level start / reset */
  populate(state: FroggerState): void {
    state.logs = [];

    for (let row = 0; row < state.lanes.length; row++) {
      const lane = state.lanes[row];
      if (lane.kind !== 'river') continue;

      for (const tmpl of lane.objects) {
        const widthPx = tmpl.width * state.cellW;
        const gapPx = (tmpl.gap + tmpl.width) * state.cellW;
        const count = Math.ceil(state.canvasW / gapPx) + 1;
        const signedSpeed = lane.speed * lane.direction;

        for (let i = 0; i < count; i++) {
          const log: Log = {
            x: i * gapPx,
            row,
            width: widthPx,
            speed: signedSpeed,
          };
          state.logs.push(log);
        }
      }
    }
  }

  update(state: FroggerState, dt: number): void {
    const w = state.canvasW;

    // Move logs
    for (const log of state.logs) {
      log.x += log.speed * dt;

      if (log.speed > 0 && log.x > w) {
        log.x = -log.width;
      } else if (log.speed < 0 && log.x + log.width < 0) {
        log.x = w;
      }
    }

    // If frog is on a river row and not hopping, ride the log
    const frog = state.frog;
    if (frog.hopping) return;

    const lane = state.lanes[frog.row];
    if (!lane || lane.kind !== 'river') return;

    // Find log under frog
    const frogPx = frog.col * state.cellW + state.cellW * 0.5;
    let onLog = false;

    for (const log of state.logs) {
      if (log.row !== frog.row) continue;
      if (frogPx >= log.x && frogPx <= log.x + log.width) {
        // Ride the log — shift frog with log
        const shift = log.speed * dt;
        const newFrogCenter = frogPx + shift;
        const newCol = Math.round((newFrogCenter - state.cellW * 0.5) / state.cellW);
        frog.col = newCol;
        onLog = true;
        break;
      }
    }

    // If in river but not on a log, frog drowns (handled by CollisionSystem)
    // We just mark it here via a flag check in CollisionSystem
    if (!onLog) {
      state.dying = true;
    }
  }
}
