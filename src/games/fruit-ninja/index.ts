import type { GameDefinition } from '@shared/GameInterface';
import { PlatformAdapter } from './adapters/PlatformAdapter';

export const FruitNinjaGame: GameDefinition = {
  id: 'fruit-ninja',
  name: 'Fruit Ninja',
  description: 'Slice flying fruits with your finger — avoid the bombs!',
  icon: '🍉',
  color: '#e91e63',
  category: 'action',
  help: {
    goal: 'Slice as many fruits as possible without missing 3 or hitting a bomb.',
    controls: [
      { key: 'Mouse / Touch', action: 'Swipe to slice fruits' },
      { key: 'P', action: 'Pause game' },
      { key: 'Space', action: 'Restart after game over' },
      { key: 'ESC', action: 'Exit to menu' },
    ],
    tips: [
      'Slice multiple fruits in one swipe for combo bonuses',
      'Bombs end the game instantly — avoid them!',
      'Missing 3 fruits costs all your lives',
      'Fruits launch faster as your score increases',
    ],
  },
  create(canvas, onExit) {
    const instance = new PlatformAdapter(canvas, onExit);
    instance.start();
    return instance;
  },
};
