import type { GameDefinition } from '@shared/GameInterface';
import { PlatformAdapter } from './adapters/PlatformAdapter';

export const PlatformerGame: GameDefinition = {
  id: 'platformer',
  name: 'Platformer',
  description: 'Jump, collect coins, reach the flag!',
  icon: '\u{1F3C3}',
  color: '#60a5fa',
  create(canvas, onExit) {
    const inst = new PlatformAdapter(canvas, onExit);
    inst.start();
    return inst;
  },
};
