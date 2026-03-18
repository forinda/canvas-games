import type { GameDefinition, GameHelp } from '@shared/GameInterface';
import { PlatformAdapter } from './adapters/PlatformAdapter';

export const golfHelp: GameHelp = {
  goal: 'Complete all 9 holes in as few strokes as possible.',
  controls: [
    { key: 'Click + Drag', action: 'Aim and set power (drag away from ball)' },
    { key: 'Release', action: 'Putt the ball' },
    { key: 'H', action: 'Toggle help overlay' },
    { key: 'R', action: 'Restart game' },
    { key: 'ESC', action: 'Exit to menu' },
  ],
  tips: [
    'Drag further from the ball for more power',
    'The aim line shows shot direction (opposite of drag)',
    'Green arrows on the course indicate slope direction',
    'The ball must slow down near the hole to sink',
    'Aim for par or under on each hole for the best score',
  ],
};

export const GolfGame: GameDefinition = {
  id: 'golf',
  name: 'Golf',
  description: 'Mini golf with 9 unique holes!',
  icon: '\u26f3',
  color: '#388e3c',
  category: 'action' as const,
  help: golfHelp,
  create(canvas, onExit) {
    const instance = new PlatformAdapter(canvas, onExit);
    instance.start();
    return instance;
  },
};
