import type { GameDefinition, GameHelp } from '@shared/GameInterface';
import { PlatformAdapter } from './adapters/PlatformAdapter';

export const helpData: GameHelp = {
  goal: 'Build anything you want! Stack bricks on a grid in this creative sandbox.',
  controls: [
    { key: 'Left Click', action: 'Place selected brick on grid' },
    { key: 'Right Click', action: 'Remove a brick' },
    { key: 'Scroll Wheel', action: 'Rotate brick (swap width/height)' },
    { key: '1-5', action: 'Select brick size' },
    { key: 'C', action: 'Cycle through colors' },
    { key: 'Delete', action: 'Clear all bricks' },
    { key: 'H', action: 'Toggle help overlay' },
    { key: 'ESC', action: 'Exit to menu' },
  ],
  tips: [
    'Bricks fall with gravity -- stack from the bottom up',
    'Removing a brick causes above bricks to fall',
    'Use scroll wheel to rotate non-square bricks',
    'Click the palette on the right to pick brick sizes',
    'Click color swatches to change the active color',
  ],
};

export const BrickBuilderGame: GameDefinition = {
  id: 'brick-builder',
  name: 'Brick Builder',
  description: 'Creative LEGO-like sandbox -- stack colorful bricks freely!',
  icon: '\uD83E\uDDF1',
  color: '#ff7043',
  category: 'chill' as const,
  help: helpData,
  create(canvas, onExit) {
    const instance = new PlatformAdapter(canvas, onExit, helpData);
    instance.start();
    return instance;
  },
};
