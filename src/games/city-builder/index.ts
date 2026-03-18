import type { GameDefinition } from '@shared/GameInterface';
import { PlatformAdapter } from './adapters/PlatformAdapter';

export const CityBuilderGame: GameDefinition = {
  id: 'city-builder',
  name: 'City Builder',
  description: 'Build and manage your city!',
  icon: '\u{1F3D9}\uFE0F',
  color: '#3498db',
  create(canvas, onExit) {
    const inst = new PlatformAdapter(canvas, onExit);
    inst.start();
    return inst;
  },
};
