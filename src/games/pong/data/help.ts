import type { GameHelp } from '@shared/GameInterface';

export const PONG_HELP: GameHelp = {
  goal: 'Score 11 points before your opponent by getting the ball past their paddle.',
  controls: [
    { key: 'W / S', action: 'Move left paddle up / down' },
    { key: 'Up / Down', action: 'Move right paddle (2P mode)' },
    { key: 'P', action: 'Pause / resume' },
    { key: '1 / 2', action: 'Select mode (AI / 2 Player)' },
    { key: 'H', action: 'Toggle help overlay' },
    { key: 'ESC', action: 'Exit to menu' },
  ],
  tips: [
    'Hit the ball near the edge of your paddle for sharper angles.',
    'The ball speeds up after each rally hit — stay alert!',
    'In AI mode, the computer has slight reaction delay — exploit it.',
  ],
};
