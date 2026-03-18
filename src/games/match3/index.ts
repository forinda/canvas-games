import type { GameDefinition } from '@shared/GameInterface';
import { PlatformAdapter } from './adapters/PlatformAdapter';

export const Match3Game: GameDefinition = {
  id: 'match3',
  name: 'Match-3',
  description: 'Swap gems to match 3+ in a row!',
  icon: '💎',
  color: '#e91e63',
  help: {
    goal: 'Swap adjacent gems to create lines of 3+ matching colours and score points within 30 moves.',
    controls: [
      { key: 'Click', action: 'Select a gem' },
      { key: 'Click adjacent', action: 'Swap two gems' },
      { key: 'P', action: 'Pause / Resume' },
      { key: 'H', action: 'Toggle help overlay' },
      { key: 'Space', action: 'Restart after game over' },
      { key: 'ESC', action: 'Exit to menu' },
    ],
    tips: [
      'Chain cascading combos for massive score multipliers',
      'Plan swaps near the bottom — gravity creates more cascades',
      'You have 30 moves per round, make each one count',
    ],
  },
  create(canvas, onExit) {
    const instance = new PlatformAdapter(canvas, onExit);
    instance.start();
    return instance;
  },
};
