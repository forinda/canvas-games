import type { GameDefinition } from '@shared/GameInterface';
import { PlatformAdapter } from './adapters/PlatformAdapter';
import { racingHelp } from './RacingEngine';

export const RacingGame: GameDefinition = {
  id: 'racing',
  name: 'Racing',
  description: 'Top-down racing with AI opponents!',
  icon: '\uD83C\uDFCE\uFE0F',
  color: '#ff5722',
  help: racingHelp,
  create(canvas, onExit) {
    const instance = new PlatformAdapter(canvas, onExit);
    instance.start();
    return instance;
  },
};
