import type { GameDefinition } from '@shared/GameInterface';
import { PlatformAdapter } from './adapters/PlatformAdapter';
import { antColonyHelp } from './data/help';

export const AntColonyGame: GameDefinition = {
  id: 'ant-colony',
  name: 'Ant Colony',
  description: 'Build and manage a thriving ant colony — forage, dig, and survive!',
  icon: '\u{1F41C}',
  color: '#6d4c41',
  category: 'strategy' as const,
  help: antColonyHelp,
  create(canvas, onExit) {
    const instance = new PlatformAdapter(canvas, onExit);
    instance.start();
    return instance;
  },
};
