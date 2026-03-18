import type { GameDefinition } from '@shared/GameInterface';
import { PlatformAdapter } from './adapters/PlatformAdapter';

export const DoodleJumpGame: GameDefinition = {
  id: 'doodle-jump',
  category: 'arcade' as const,
  name: 'Doodle Jump',
  description: 'Bounce your way to the top in this endless vertical scroller!',
  icon: '🐸',
  color: '#66bb6a',
  help: {
    goal: 'Jump from platform to platform and climb as high as you can without falling.',
    controls: [
      { key: 'Arrow Left / A', action: 'Move left' },
      { key: 'Arrow Right / D', action: 'Move right' },
      { key: 'Space / Enter', action: 'Restart after game over' },
      { key: 'ESC', action: 'Exit to menu' },
    ],
    tips: [
      'Green platforms are safe — they always hold your weight',
      'Blue platforms move horizontally — time your landing',
      'Brown platforms break after one use — keep moving!',
      'Red platforms have springs — they launch you extra high',
      'You wrap around the screen edges — use this to your advantage',
    ],
  },
  create(canvas, onExit) {
    const instance = new PlatformAdapter(canvas, onExit);
    instance.start();
    return instance;
  },
};
