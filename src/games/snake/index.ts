import type { GameDefinition } from '@shared/GameInterface';
import { PlatformAdapter } from './adapters/PlatformAdapter';

export const SnakeGame: GameDefinition = {
  id: 'snake',
  category: 'arcade' as const,
  name: 'Snake',
  description: 'Eat food, grow longer!',
  icon: '🐍',
  color: '#4ade80',
  help: {
    goal: 'Eat food to grow longer without hitting walls or yourself.',
    controls: [
      { key: 'Arrow Keys / WASD', action: 'Change direction' },
      { key: 'P', action: 'Pause game' },
      { key: 'Space', action: 'Restart after game over' },
      { key: 'ESC', action: 'Exit to menu' },
    ],
    tips: [
      'Plan your path ahead — the longer you get, the tighter it becomes',
      'Speed increases as you eat more food',
      'You cannot reverse direction directly into yourself',
    ],
  },
  create(canvas, onExit) {
    const instance = new PlatformAdapter(canvas, onExit);
    instance.start();
    return instance;
  },
};
