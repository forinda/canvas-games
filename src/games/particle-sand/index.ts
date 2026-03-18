import type { GameDefinition } from '@shared/GameInterface';
import { PlatformAdapter } from './adapters/PlatformAdapter';

export const ParticleSandGame: GameDefinition = {
  id: 'particle-sand',
  category: 'chill' as const,
  name: 'Particle Sand',
  description: 'Cellular automata sandbox with sand, water, fire, stone & steam',
  icon: '\uD83C\uDFD6\uFE0F',
  color: '#ffb74d',
  help: {
    goal: 'Create and watch particles interact in a sandbox simulation.',
    controls: [
      { key: 'Click / Drag', action: 'Place particles' },
      { key: '1-5', action: 'Select material (Sand, Water, Fire, Stone, Steam)' },
      { key: '[ / ]', action: 'Decrease / increase brush size' },
      { key: 'C', action: 'Clear all particles' },
      { key: 'P', action: 'Pause / resume simulation' },
      { key: 'H', action: 'Toggle help overlay' },
      { key: 'ESC', action: 'Exit to menu' },
    ],
    tips: [
      'Sand falls and piles up realistically',
      'Water flows sideways and fills containers',
      'Fire rises and fades — combine with water to make steam!',
      'Stone is static — build walls and containers',
      'Adjust brush size with [ and ] for fine or broad strokes',
    ],
  },
  create(canvas, onExit) {
    const instance = new PlatformAdapter(canvas, onExit);
    instance.start();
    return instance;
  },
};
