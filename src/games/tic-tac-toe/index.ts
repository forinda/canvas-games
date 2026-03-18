import type { GameDefinition } from '@shared/GameInterface.ts';
import { PlatformAdapter } from './adapters/PlatformAdapter.ts';

export const TicTacToeGame: GameDefinition = {
  id: 'tic-tac-toe',
  name: 'Tic-Tac-Toe',
  description: 'Classic 3x3 strategy game — beat the unbeatable AI or challenge a friend!',
  icon: '❌',
  color: '#ef5350',
  category: 'strategy',
  help: {
    goal: 'Get three in a row (horizontally, vertically, or diagonally) to win.',
    controls: [
      { key: 'Click', action: 'Place your mark on an empty cell' },
      { key: 'R', action: 'Restart current game' },
      { key: 'M', action: 'Change game mode' },
      { key: 'H', action: 'Toggle help overlay' },
      { key: 'ESC', action: 'Exit to menu' },
    ],
    tips: [
      'In AI mode, the computer plays as O and is unbeatable',
      'Try to control the center and corners for an advantage',
      'A perfect game against the AI always ends in a draw',
    ],
  },
  create(canvas, onExit) {
    const instance = new PlatformAdapter(canvas, onExit);
    instance.start();
    return instance;
  },
};
