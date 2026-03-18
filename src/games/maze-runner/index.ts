import type { GameDefinition } from '@shared/GameInterface.ts';
import { PlatformAdapter } from './adapters/PlatformAdapter.ts';

export const MazeRunnerGame: GameDefinition = {
  id: 'maze-runner',
  name: 'Maze Runner',
  description: 'Navigate fog-shrouded mazes before time runs out!',
  icon: '🏃‍♂️',
  color: '#607d8b',
  help: {
    goal: 'Navigate through the maze to the EXIT before time runs out.',
    controls: [
      { key: 'Arrow Keys / WASD', action: 'Move through the maze' },
      { key: 'P', action: 'Pause / resume' },
      { key: 'H', action: 'Toggle help overlay' },
      { key: 'Space', action: 'Start / next level / restart' },
      { key: 'ESC', action: 'Exit to menu' },
    ],
    tips: [
      'You can only see cells within 3 squares of your position',
      'Maze size grows every level — plan your route quickly',
      'Completing a level gives +15 bonus seconds on the next',
      'Hug one wall to eventually find the exit (wall-following)',
    ],
  },
  create(canvas: HTMLCanvasElement, onExit: () => void) {
    const instance = new PlatformAdapter(canvas, onExit);
    instance.start();
    return instance;
  },
};
