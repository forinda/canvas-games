import type { GameDefinition } from '@shared/GameInterface';
import { PlatformAdapter } from './adapters/PlatformAdapter';

const help = {
  goal: 'Survive waves of enemies in an arena. Shoot everything that moves!',
  controls: [
    { key: 'W / A / S / D', action: 'Move player' },
    { key: 'Mouse', action: 'Aim direction' },
    { key: 'Click', action: 'Shoot' },
    { key: 'P', action: 'Pause / resume' },
    { key: 'H', action: 'Toggle help overlay' },
    { key: 'Space', action: 'Start / restart' },
    { key: 'ESC', action: 'Exit to menu' },
  ],
  tips: [
    'Keep moving — standing still makes you an easy target',
    'Prioritize fast enemies (orange) before they close in',
    'Tank enemies (brown, "T") take extra hits but are slow',
    'Ranged enemies (purple, "R") shoot back — take them out quickly',
    'Waves get harder — ammo is unlimited so keep firing!',
  ],
};

export const TopDownShooterGame: GameDefinition = {
  id: 'topdown-shooter',
  name: 'Top-Down Shooter',
  description: 'Arena survival shooter — defeat waves of enemies!',
  icon: '\uD83D\uDD2B',
  color: '#e53935',
  help,
  create(canvas, onExit) {
    const instance = new PlatformAdapter(canvas, onExit, help);
    instance.start();
    return instance;
  },
};
