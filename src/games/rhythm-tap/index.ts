import type { GameDefinition } from '@shared/GameInterface';
import { PlatformAdapter } from './adapters/PlatformAdapter';

export const RhythmTapGame: GameDefinition = {
  id: 'rhythm-tap',
  name: 'Rhythm Tap',
  description: 'Tap circles in time as rings shrink — Perfect timing scores big!',
  icon: '🎵',
  color: '#e040fb',
  category: 'arcade',
  help: {
    goal: 'Tap circles when the shrinking ring aligns with the target for maximum points.',
    controls: [
      { key: 'Click / Tap', action: 'Hit a circle' },
      { key: 'P', action: 'Pause game' },
      { key: 'H', action: 'Toggle help overlay' },
      { key: 'Space', action: 'Restart after game over' },
      { key: 'ESC', action: 'Exit to menu' },
    ],
    tips: [
      'Click when the outer ring meets the inner circle for Perfect',
      'Build combos for score multipliers (5x=2x, 10x=3x, 20x=4x, 30x=8x)',
      'Circles spawn faster as the round progresses',
      'A 60-second round — aim for the highest score!',
    ],
  },
  create(canvas, onExit) {
    const instance = new PlatformAdapter(canvas, onExit);
    instance.start();
    return instance;
  },
};
