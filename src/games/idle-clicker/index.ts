import type { GameDefinition } from '@shared/GameInterface.ts';
import { PlatformAdapter } from './adapters/PlatformAdapter.ts';
import { IDLE_CLICKER_HELP } from './data/help.ts';

export const IdleClickerGame: GameDefinition = {
  id: 'idle-clicker',
  name: 'Idle Clicker',
  description: 'Click coins and build a passive income empire!',
  icon: '\u{1F4B0}',
  color: '#ffc107',
  category: 'chill' as const,
  help: IDLE_CLICKER_HELP,
  create(canvas, onExit) {
    const instance = new PlatformAdapter(canvas, onExit);
    instance.start();
    return instance;
  },
};
