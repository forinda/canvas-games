import type { GameDefinition } from '@shared/GameInterface';
import { PlatformAdapter } from './adapters/PlatformAdapter';

const help = {
  goal: 'Fill every row, column, and 3x3 box with the numbers 1-9 without repeats.',
  controls: [
    { key: 'Click / Arrows', action: 'Select a cell' },
    { key: '1-9', action: 'Place a number (or toggle note)' },
    { key: '0 / Delete', action: 'Clear selected cell' },
    { key: 'N', action: 'Toggle notes mode' },
    { key: 'U / Ctrl+Z', action: 'Undo last move' },
    { key: 'R', action: 'New game (same difficulty)' },
    { key: 'H', action: 'Toggle help overlay' },
    { key: 'ESC', action: 'Exit to menu' },
  ],
  tips: [
    'Given numbers (bold white) cannot be changed',
    'Use notes mode to pencil in candidates before committing',
    'Red highlights indicate row, column, or box conflicts',
    'Click difficulty buttons at top-left to switch difficulty',
    'Completed numbers are dimmed in the number pad',
  ],
};

export const SudokuGame: GameDefinition = {
  id: 'sudoku',
  name: 'Sudoku',
  description: 'Classic number-placement puzzle — fill the 9x9 grid!',
  icon: '\u{1F522}',
  color: '#7e57c2',
  category: 'puzzle',
  help,
  create(canvas, onExit) {
    const instance = new PlatformAdapter(canvas, onExit, help);
    instance.start();
    return instance;
  },
};
