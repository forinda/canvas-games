import type { GameDefinition } from '@shared/GameInterface';
import { PlatformAdapter } from './adapters/PlatformAdapter';

export const TetrisGame: GameDefinition = {
  id: 'tetris',
  category: 'arcade' as const,
  name: 'Tetris',
  description: 'Classic block-stacking puzzle game!',
  icon: '🟦',
  color: '#00bcd4',
  help: {
    goal: 'Clear lines by filling complete rows. Survive as long as possible!',
    controls: [
      { key: 'Left/Right', action: 'Move piece' },
      { key: 'Up', action: 'Rotate piece' },
      { key: 'Down', action: 'Soft drop' },
      { key: 'Space', action: 'Hard drop' },
      { key: 'ESC', action: 'Exit to menu' },
    ],
    tips: [
      'Clear 4 lines at once (Tetris) for 800 points',
      'The ghost piece shows where your block will land',
      'Keep the board flat — avoid holes under blocks',
      'Speed increases every 10 lines cleared',
    ],
  },
  create(canvas, onExit) {
    const instance = new PlatformAdapter(canvas, onExit);
    instance.start();
    return instance;
  },
};
