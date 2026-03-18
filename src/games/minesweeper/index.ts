import type { GameDefinition } from '@shared/GameInterface';
import { PlatformAdapter } from './adapters/PlatformAdapter';

export const MinesweeperGame: GameDefinition = {
  id: 'minesweeper',
  category: 'puzzle' as const,
  name: 'Minesweeper',
  description: 'Clear the minefield without detonating any mines!',
  icon: '\u{1F4A3}',
  color: '#95a5a6',
  help: {
    goal: 'Reveal all safe cells without clicking on a mine.',
    controls: [
      { key: 'Left Click', action: 'Reveal a cell (or chord-reveal if numbered)' },
      { key: 'Right Click', action: 'Place / remove a flag' },
      { key: '1 / 2 / 3', action: 'Switch difficulty (Easy / Medium / Hard)' },
      { key: 'R', action: 'Restart current game' },
      { key: 'ESC', action: 'Exit to menu' },
    ],
    tips: [
      'Your first click is always safe — mines are placed after it',
      'Numbers show how many adjacent cells contain mines',
      'Left-click a revealed number to chord-reveal if enough flags are placed',
      'Right-click to flag cells you suspect contain mines',
    ],
  },
  create(canvas, onExit) {
    const instance = new PlatformAdapter(canvas, onExit);
    instance.start();
    return instance;
  },
};
