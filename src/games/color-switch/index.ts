import type { GameDefinition } from '@shared/GameInterface';
import { PlatformAdapter } from './adapters/PlatformAdapter';

export const ColorSwitchGame: GameDefinition = {
  id: 'color-switch',
  name: 'Color Switch',
  description: 'Match your ball color to pass through gates!',
  icon: '🎨',
  color: '#e040fb',
  category: 'arcade' as const,
  help: {
    goal: 'Pass through gate sections that match your ball color. Collect color switchers to change color.',
    controls: [
      { key: 'Space / Tap', action: 'Bounce ball upward' },
      { key: 'ESC', action: 'Exit to menu' },
    ],
    tips: [
      'Time your taps to align with the matching color section',
      'Gates rotate -- wait for your color to line up before passing through',
      'Color switchers appear between gates -- they change your ball color',
      'Each gate passed scores one point',
    ],
  },
  create(canvas, onExit) {
    const instance = new PlatformAdapter(canvas, onExit);
    instance.start();
    return instance;
  },
};
