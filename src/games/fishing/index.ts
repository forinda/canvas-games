import type { GameDefinition } from '@shared/GameInterface';
import { PlatformAdapter } from './adapters/PlatformAdapter';
import { FISHING_HELP } from './FishingEngine';

export const FishingGame: GameDefinition = {
  id: 'fishing',
  category: 'chill' as const,
  name: 'Fishing',
  description: 'Cast your line, hook fish, and complete your catalog!',
  icon: '🎣',
  color: '#0288d1',
  help: FISHING_HELP,
  create(canvas, onExit) {
    const instance = new PlatformAdapter(canvas, onExit);
    instance.start();
    return instance;
  },
};
