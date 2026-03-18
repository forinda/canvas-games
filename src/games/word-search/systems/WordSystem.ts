import type { WordSearchState } from '../types';
import { HIGHLIGHT_COLORS } from '../types';

export class WordSystem {
  private colorIndex = 0;

  /** Check if the current selection matches any unfound word */
  checkSelection(state: WordSearchState): void {
    if (state.selection.length < 2) return;

    // Build the selected string
    const selectedLetters = state.selection
      .map((c) => state.grid[c.row][c.col].letter)
      .join('');

    // Also check reverse
    const reversedLetters = selectedLetters.split('').reverse().join('');

    for (const pw of state.placedWords) {
      if (pw.found) continue;

      if (pw.word === selectedLetters || pw.word === reversedLetters) {
        // Verify cells match
        const match =
          this.cellsMatch(state.selection, pw.cells) ||
          this.cellsMatch([...state.selection].reverse(), pw.cells);

        if (match) {
          pw.found = true;
          const color = HIGHLIGHT_COLORS[this.colorIndex % HIGHLIGHT_COLORS.length];
          this.colorIndex++;
          state.foundColors.set(pw.word, color);
          break;
        }
      }
    }

    // Check win
    if (state.placedWords.every((pw) => pw.found)) {
      state.status = 'won';
    }
  }

  private cellsMatch(
    selection: { row: number; col: number }[],
    wordCells: { row: number; col: number }[],
  ): boolean {
    if (selection.length !== wordCells.length) return false;
    return selection.every(
      (s, i) => s.row === wordCells[i].row && s.col === wordCells[i].col,
    );
  }

  reset(): void {
    this.colorIndex = 0;
  }
}
