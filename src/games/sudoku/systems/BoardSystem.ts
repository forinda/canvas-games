import type { Updatable } from '@shared/Updatable';
import {
  GRID,
  BOX,
  type SudokuState,
  type Cell,
  type Difficulty,
  type UndoEntry,
} from '../types';
import { generatePuzzle } from '../data/puzzles';

export class BoardSystem implements Updatable<SudokuState> {
  private timerAccum = 0;

  /** Initialise (or re-initialise) the board for a given difficulty. */
  initBoard(state: SudokuState): void {
    const { puzzle, solution } = generatePuzzle(state.difficulty);
    state.solution = solution;
    state.board = [];
    for (let r = 0; r < GRID; r++) {
      const row: Cell[] = [];
      for (let c = 0; c < GRID; c++) {
        row.push({
          value: puzzle[r][c],
          given: puzzle[r][c] !== 0,
          notes: new Set(),
          invalid: false,
        });
      }
      state.board.push(row);
    }
    state.status = 'playing';
    state.selectedRow = -1;
    state.selectedCol = -1;
    state.notesMode = false;
    state.timer = 0;
    state.undoStack = [];
    this.timerAccum = 0;
    this.validate(state);
  }

  /** Reset with optional new difficulty. */
  reset(state: SudokuState, difficulty?: Difficulty): void {
    if (difficulty) state.difficulty = difficulty;
    this.initBoard(state);
  }

  /** Place a number (or toggle a note) at the selected cell. */
  placeNumber(state: SudokuState, num: number): void {
    const { selectedRow: r, selectedCol: c } = state;
    if (r < 0 || c < 0 || state.status === 'won') return;
    const cell = state.board[r][c];
    if (cell.given) return;

    // Save undo entry
    const undo: UndoEntry = {
      row: r,
      col: c,
      prevValue: cell.value,
      prevNotes: new Set(cell.notes),
    };
    state.undoStack.push(undo);

    if (state.notesMode) {
      if (num === 0) {
        cell.notes.clear();
      } else {
        if (cell.notes.has(num)) {
          cell.notes.delete(num);
        } else {
          cell.notes.add(num);
        }
        cell.value = 0; // clear value when adding notes
      }
    } else {
      if (num === 0) {
        cell.value = 0;
      } else {
        cell.value = num;
        cell.notes.clear(); // clear notes when placing value
      }
    }

    this.validate(state);
    this.checkCompletion(state);
  }

  /** Clear the selected cell. */
  clearCell(state: SudokuState): void {
    this.placeNumber(state, 0);
  }

  /** Undo last action. */
  undo(state: SudokuState): void {
    if (state.undoStack.length === 0 || state.status === 'won') return;
    const entry = state.undoStack.pop()!;
    const cell = state.board[entry.row][entry.col];
    cell.value = entry.prevValue;
    cell.notes = new Set(entry.prevNotes);
    this.validate(state);
  }

  /** Validate the entire board — flag conflicting cells. */
  validate(state: SudokuState): void {
    // Clear all invalid flags
    for (let r = 0; r < GRID; r++) {
      for (let c = 0; c < GRID; c++) {
        state.board[r][c].invalid = false;
      }
    }

    // Check rows
    for (let r = 0; r < GRID; r++) {
      this.flagDuplicates(
        state,
        Array.from({ length: GRID }, (_, c) => [r, c]),
      );
    }

    // Check columns
    for (let c = 0; c < GRID; c++) {
      this.flagDuplicates(
        state,
        Array.from({ length: GRID }, (_, r) => [r, c]),
      );
    }

    // Check boxes
    for (let br = 0; br < GRID; br += BOX) {
      for (let bc = 0; bc < GRID; bc += BOX) {
        const positions: [number, number][] = [];
        for (let r = br; r < br + BOX; r++) {
          for (let c = bc; c < bc + BOX; c++) {
            positions.push([r, c]);
          }
        }
        this.flagDuplicates(state, positions);
      }
    }
  }

  private flagDuplicates(state: SudokuState, positions: [number, number][]): void {
    const seen = new Map<number, [number, number][]>();
    for (const [r, c] of positions) {
      const v = state.board[r][c].value;
      if (v === 0) continue;
      if (!seen.has(v)) seen.set(v, []);
      seen.get(v)!.push([r, c]);
    }
    for (const cells of seen.values()) {
      if (cells.length > 1) {
        for (const [r, c] of cells) {
          state.board[r][c].invalid = true;
        }
      }
    }
  }

  /** Check if the puzzle is completed (all filled, no conflicts). */
  private checkCompletion(state: SudokuState): void {
    for (let r = 0; r < GRID; r++) {
      for (let c = 0; c < GRID; c++) {
        const cell = state.board[r][c];
        if (cell.value === 0 || cell.invalid) return;
      }
    }
    state.status = 'won';
  }

  /** Update timer. */
  update(state: SudokuState, dt: number): void {
    if (state.status !== 'playing') return;
    this.timerAccum += dt;
    if (this.timerAccum >= 1000) {
      state.timer += Math.floor(this.timerAccum / 1000);
      this.timerAccum %= 1000;
    }
  }
}
