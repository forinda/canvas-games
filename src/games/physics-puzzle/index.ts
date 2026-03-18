import type { GameDefinition } from '@shared/GameInterface';
import { PlatformAdapter } from './adapters/PlatformAdapter';

export const PhysicsPuzzleGame: GameDefinition = {
  id: 'physics-puzzle',
  name: 'Physics Puzzle',
  description: 'Place pieces, simulate physics!',
  icon: '\uD83E\uDDE9',
  color: '#f59e0b',
  create(canvas, onExit) {
    const inst = new PlatformAdapter(canvas, onExit);
    inst.start();
    return inst;
  },
};
