import type { GameDefinition } from '../../shared/GameInterface';
import { PlatformAdapter } from './adapters/PlatformAdapter';

export const SnakeGame: GameDefinition = {
  id: 'snake',
  name: 'Snake',
  description: 'Eat food, grow longer!',
  icon: '🐍',
  color: '#4ade80',
  create(canvas, onExit) {
    const instance = new PlatformAdapter(canvas, onExit);
    instance.start();
    return instance;
  },
};
