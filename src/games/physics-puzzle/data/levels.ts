import type { Body, PuzzleState } from '../types';
import { makeBody, resetBodyId } from '../types';

export function buildLevel(level: number, canvasWidth: number, canvasHeight: number): PuzzleState {
  resetBodyId();
  const H = canvasHeight;
  const groundY = H - 60;
  const bodies: Body[] = [];

  // Ground
  bodies.push(makeBody('ground', 0, groundY, canvasWidth, 60, true, '#4a6741'));

  // Level designs
  if (level === 1) {
    // Simple: get ball to goal on the right. Provide planks to build a ramp.
    bodies.push(makeBody('ball', 100, groundY - 30, 30, 30, false, '#f59e0b'));
    bodies[bodies.length - 1].radius = 15;
    bodies.push(makeBody('goal', 600, groundY - 40, 40, 40, true, '#4ade80'));
    // Obstacle - gap
    bodies.push(makeBody('box', 300, groundY - 80, 40, 80, true, '#666'));
    return {
      bodies, level, solved: false, started: false, gameOver: false,
      dragging: null, dragOffX: 0, dragOffY: 0,
      placed: 0, maxPieces: 3,
      inventory: [
        { type: 'plank', color: '#8b5e3c', w: 120, h: 16 },
        { type: 'plank', color: '#8b5e3c', w: 80, h: 16 },
        { type: 'box', color: '#a0522d', w: 40, h: 40 },
      ],
      selectedInventory: 0, simulating: false, score: 0,
      message: 'Place pieces to guide the ball to the green goal. Press SPACE to simulate!',
    };
  } else if (level === 2) {
    bodies.push(makeBody('ball', 80, groundY - 200, 30, 30, false, '#f59e0b'));
    bodies[bodies.length - 1].radius = 15;
    bodies.push(makeBody('goal', 700, groundY - 40, 40, 40, true, '#4ade80'));
    bodies.push(makeBody('box', 200, groundY - 60, 200, 20, true, '#666'));
    bodies.push(makeBody('box', 450, groundY - 120, 30, 120, true, '#666'));
    return {
      bodies, level, solved: false, started: false, gameOver: false,
      dragging: null, dragOffX: 0, dragOffY: 0,
      placed: 0, maxPieces: 4,
      inventory: [
        { type: 'plank', color: '#8b5e3c', w: 150, h: 16 },
        { type: 'plank', color: '#8b5e3c', w: 100, h: 16 },
        { type: 'box', color: '#a0522d', w: 50, h: 50 },
        { type: 'box', color: '#a0522d', w: 30, h: 80 },
      ],
      selectedInventory: 0, simulating: false, score: 0,
      message: 'More obstacles! Build bridges and ramps.',
    };
  } else {
    // Procedural levels
    bodies.push(makeBody('ball', 80, groundY - 100, 30, 30, false, '#f59e0b'));
    bodies[bodies.length - 1].radius = 15;
    const goalX = 300 + level * 100;
    bodies.push(makeBody('goal', Math.min(goalX, canvasWidth - 100), groundY - 40, 40, 40, true, '#4ade80'));
    for (let i = 0; i < level; i++) {
      bodies.push(makeBody('box', 200 + i * 150, groundY - 40 - i * 40, 30 + i * 10, 40 + i * 20, true, '#666'));
    }
    const inv = [];
    for (let i = 0; i < 2 + level; i++) {
      inv.push({ type: (i % 2 === 0 ? 'plank' : 'box') as Body['type'], color: i % 2 === 0 ? '#8b5e3c' : '#a0522d', w: 60 + Math.random() * 80, h: i % 2 === 0 ? 16 : 30 + Math.random() * 30 });
    }
    return {
      bodies, level, solved: false, started: false, gameOver: false,
      dragging: null, dragOffX: 0, dragOffY: 0,
      placed: 0, maxPieces: inv.length,
      inventory: inv, selectedInventory: 0, simulating: false, score: 0,
      message: `Level ${level} — Guide the ball!`,
    };
  }
}
