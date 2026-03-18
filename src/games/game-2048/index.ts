import type { GameDefinition } from '@shared/GameInterface';
import { PlatformAdapter } from './adapters/PlatformAdapter';

const help = {
  goal: 'Slide tiles to combine them and reach the 2048 tile!',
  controls: [
    { key: 'Arrow Keys / WASD', action: 'Slide tiles' },
    { key: 'R', action: 'Restart game' },
    { key: 'C', action: 'Continue after winning' },
    { key: 'H', action: 'Toggle help' },
    { key: 'ESC', action: 'Exit to menu' },
  ],
  tips: [
    'Keep your highest tile in a corner',
    'Build a chain of decreasing values along an edge',
    'Avoid moving in the direction that breaks your chain',
    'New tiles are 90% chance of 2, 10% chance of 4',
    'You can keep playing after reaching 2048',
  ],
};

export const Game2048: GameDefinition = {
  id: 'game-2048',
  name: '2048',
  description: 'Slide and merge tiles to reach 2048!',
  icon: '\uD83D\uDD22',
  color: '#ff9800',
  help,
  create(canvas, onExit) {
    const instance = new PlatformAdapter(canvas, onExit, help);
    instance.start();
    return instance;
  },
};
