import type { Updatable } from '@shared/Updatable';
import type { Game2048State, Tile, Direction } from '../types';
import { GRID_SIZE, createEmptyGrid } from '../types';

export class BoardSystem implements Updatable<Game2048State> {
  /** Spawn initial two tiles */
  init(state: Game2048State): void {
    state.grid = createEmptyGrid();
    this.spawnTile(state);
    this.spawnTile(state);
    // Clear new/merge flags after init so no animation on first render
    this.clearAnimFlags(state);
  }

  update(state: Game2048State, dt: number): void {
    // Handle restart
    if (state.restartRequested) {
      state.restartRequested = false;
      state.score = 0;
      state.bestTile = 0;
      state.gameOver = false;
      state.won = false;
      state.keepPlaying = false;
      state.animating = false;
      state.animProgress = 1;
      state.pendingDirection = null;
      this.init(state);
      return;
    }

    // Handle continue after win
    if (state.continueRequested) {
      state.continueRequested = false;
      state.keepPlaying = true;
      return;
    }

    // Handle animation
    if (state.animating) {
      state.animProgress += dt / state.animDuration;
      if (state.animProgress >= 1) {
        state.animProgress = 1;
        state.animating = false;
      }
      return;
    }

    // Process pending direction
    if (state.pendingDirection) {
      const dir = state.pendingDirection;
      state.pendingDirection = null;
      this.slide(state, dir);
    }
  }

  private slide(state: Game2048State, direction: Direction): void {
    // Clear previous animation flags
    this.clearAnimFlags(state);

    const moved = this.moveTiles(state, direction);

    if (moved) {
      // Start animation
      state.animProgress = 0;
      state.animating = true;

      // Spawn new tile
      this.spawnTile(state);

      // Update best tile
      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          const t = state.grid[r][c];
          if (t && t.value > state.bestTile) {
            state.bestTile = t.value;
          }
        }
      }

      // Check game over
      if (!this.hasMovesLeft(state)) {
        state.gameOver = true;
      }
    }
  }

  private moveTiles(state: Game2048State, direction: Direction): boolean {
    let moved = false;
    const grid = state.grid;

    // Build traversal orders
    const rows: number[] = [];
    const cols: number[] = [];
    for (let i = 0; i < GRID_SIZE; i++) {
      rows.push(i);
      cols.push(i);
    }

    if (direction === 'down') rows.reverse();
    if (direction === 'right') cols.reverse();

    const merged = new Set<string>();

    for (const r of rows) {
      for (const c of cols) {
        const tile = grid[r][c];
        if (!tile) continue;

        let newRow = r;
        let newCol = c;

        // Find farthest empty position
        while (true) {
          const nextRow = newRow + (direction === 'down' ? 1 : direction === 'up' ? -1 : 0);
          const nextCol = newCol + (direction === 'right' ? 1 : direction === 'left' ? -1 : 0);

          if (nextRow < 0 || nextRow >= GRID_SIZE || nextCol < 0 || nextCol >= GRID_SIZE) break;

          const target = grid[nextRow][nextCol];
          if (!target) {
            newRow = nextRow;
            newCol = nextCol;
          } else if (
            target.value === tile.value &&
            !merged.has(`${nextRow},${nextCol}`)
          ) {
            // Merge
            newRow = nextRow;
            newCol = nextCol;
            break;
          } else {
            break;
          }
        }

        if (newRow !== r || newCol !== c) {
          moved = true;
          tile.prevRow = r;
          tile.prevCol = c;

          const target = grid[newRow][newCol];
          if (target && target.value === tile.value) {
            // Merge tiles
            const mergedTile: Tile = {
              value: tile.value * 2,
              row: newRow,
              col: newCol,
              prevRow: newRow,
              prevCol: newCol,
              mergedFrom: [
                { ...tile, prevRow: r, prevCol: c },
                { ...target, prevRow: target.row, prevCol: target.col },
              ],
              isNew: false,
            };
            grid[newRow][newCol] = mergedTile;
            grid[r][c] = null;
            merged.add(`${newRow},${newCol}`);

            state.score += mergedTile.value;
            if (state.score > state.highScore) {
              state.highScore = state.score;
            }

            // Win detection
            if (mergedTile.value === 2048 && !state.keepPlaying && !state.won) {
              state.won = true;
            }
          } else {
            // Just move
            grid[r][c] = null;
            tile.row = newRow;
            tile.col = newCol;
            grid[newRow][newCol] = tile;
          }
        }
      }
    }

    return moved;
  }

  spawnTile(state: Game2048State): void {
    const empty: { r: number; c: number }[] = [];
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (!state.grid[r][c]) empty.push({ r, c });
      }
    }
    if (empty.length === 0) return;

    const { r, c } = empty[Math.floor(Math.random() * empty.length)];
    const value = Math.random() < 0.9 ? 2 : 4;
    state.grid[r][c] = {
      value,
      row: r,
      col: c,
      prevRow: r,
      prevCol: c,
      mergedFrom: null,
      isNew: true,
    };
  }

  private hasMovesLeft(state: Game2048State): boolean {
    const grid = state.grid;
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        if (!grid[r][c]) return true;
        const val = grid[r][c]!.value;
        // Check right
        if (c < GRID_SIZE - 1 && grid[r][c + 1]?.value === val) return true;
        // Check down
        if (r < GRID_SIZE - 1 && grid[r + 1]?.[c]?.value === val) return true;
      }
    }
    return false;
  }

  private clearAnimFlags(state: Game2048State): void {
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const t = state.grid[r][c];
        if (t) {
          t.prevRow = t.row;
          t.prevCol = t.col;
          t.mergedFrom = null;
          t.isNew = false;
        }
      }
    }
  }
}
