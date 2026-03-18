import type { Updatable } from '@shared/Updatable';
import { Cell, type SokobanState, type Pos } from '../types';
import { LEVELS } from '../data/levels';

export class LevelSystem implements Updatable<SokobanState> {
  /** Load a level by index into state */
  loadLevel(state: SokobanState, levelIndex: number): void {
    const raw = LEVELS[levelIndex];
    const height = raw.length;
    const width = Math.max(...raw.map((r) => r.length));

    const grid: Cell[][] = [];
    const boxes: Pos[] = [];
    let player: Pos = { x: 0, y: 0 };

    for (let y = 0; y < height; y++) {
      const row: Cell[] = [];
      for (let x = 0; x < width; x++) {
        const ch = raw[y][x] ?? ' ';
        switch (ch) {
          case '#':
            row.push(Cell.Wall);
            break;
          case '.':
            row.push(Cell.Target);
            break;
          case '@':
            row.push(Cell.Floor);
            player = { x, y };
            break;
          case '$':
            row.push(Cell.Floor);
            boxes.push({ x, y });
            break;
          case '*': // box on target
            row.push(Cell.Target);
            boxes.push({ x, y });
            break;
          case '+': // player on target
            row.push(Cell.Target);
            player = { x, y };
            break;
          default:
            row.push(Cell.Floor);
            break;
        }
      }
      grid.push(row);
    }

    state.grid = grid;
    state.width = width;
    state.height = height;
    state.player = player;
    state.boxes = boxes;
    state.level = levelIndex;
    state.moves = 0;
    state.undoStack = [];
    state.levelComplete = false;
    state.gameWon = false;
    state.queuedDir = null;
    state.undoRequested = false;
    state.restartRequested = false;
    state.advanceRequested = false;
  }

  update(state: SokobanState, _dt: number): void {
    // Handle undo
    if (state.undoRequested) {
      state.undoRequested = false;
      this.undo(state);
    }

    // Handle restart
    if (state.restartRequested) {
      state.restartRequested = false;
      this.loadLevel(state, state.level);
      return;
    }

    // Handle advance
    if (state.advanceRequested) {
      state.advanceRequested = false;
      if (state.level + 1 < LEVELS.length) {
        this.loadLevel(state, state.level + 1);
      }
      return;
    }

    // Win detection: all targets must have a box
    if (!state.levelComplete) {
      const allTargetsCovered = this.checkWin(state);
      if (allTargetsCovered) {
        state.levelComplete = true;
        if (state.level + 1 >= LEVELS.length) {
          state.gameWon = true;
        }
      }
    }
  }

  private checkWin(state: SokobanState): boolean {
    for (let y = 0; y < state.height; y++) {
      for (let x = 0; x < state.width; x++) {
        if (state.grid[y][x] === Cell.Target) {
          const hasBox = state.boxes.some((b) => b.x === x && b.y === y);
          if (!hasBox) return false;
        }
      }
    }
    return true;
  }

  private undo(state: SokobanState): void {
    if (state.undoStack.length === 0) return;
    const snap = state.undoStack.pop()!;
    state.player = snap.player;
    state.boxes = snap.boxes;
    state.moves = Math.max(0, state.moves - 1);
  }

  get totalLevels(): number {
    return LEVELS.length;
  }
}
