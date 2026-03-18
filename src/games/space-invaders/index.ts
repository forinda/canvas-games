import type { GameDefinition } from '@shared/GameInterface';
import { PlatformAdapter } from './adapters/PlatformAdapter';

export const SpaceInvadersGame: GameDefinition = {
  id: 'space-invaders',
  category: 'arcade' as const,
  name: 'Space Invaders',
  description: 'Defend Earth from waves of descending aliens!',
  icon: '\uD83D\uDC7E',
  color: '#e67e22',
  help: {
    goal: 'Destroy all aliens before they reach the ground. Dodge their shots!',
    controls: [
      { key: 'Left/Right', action: 'Move ship' },
      { key: 'Space', action: 'Shoot' },
      { key: 'ESC', action: 'Exit to menu' },
    ],
    tips: [
      'Aliens speed up as fewer remain — clear rows strategically',
      'Shields absorb shots from both sides — use them wisely',
      'UFO appears randomly at the top for bonus points',
      'Each wave gets faster and aliens shoot more often',
    ],
  },
  create(canvas, onExit) {
    const instance = new PlatformAdapter(canvas, onExit);
    instance.start();
    return instance;
  },
};
