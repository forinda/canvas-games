import type { CourseData } from '../types';
import { HOLE_RADIUS } from '../types';

export const COURSES: CourseData[] = [
  // Hole 1: Straight shot, easy intro
  {
    par: 2,
    ballStart: { x: 200, y: 520 },
    hole: { pos: { x: 200, y: 80 }, radius: HOLE_RADIUS },
    walls: [
      { x1: 50, y1: 30, x2: 350, y2: 30 },
      { x1: 50, y1: 570, x2: 350, y2: 570 },
      { x1: 50, y1: 30, x2: 50, y2: 570 },
      { x1: 350, y1: 30, x2: 350, y2: 570 },
    ],
    obstacles: [],
    slopes: [],
  },

  // Hole 2: Center obstacle
  {
    par: 3,
    ballStart: { x: 200, y: 520 },
    hole: { pos: { x: 200, y: 80 }, radius: HOLE_RADIUS },
    walls: [
      { x1: 50, y1: 30, x2: 350, y2: 30 },
      { x1: 50, y1: 570, x2: 350, y2: 570 },
      { x1: 50, y1: 30, x2: 50, y2: 570 },
      { x1: 350, y1: 30, x2: 350, y2: 570 },
    ],
    obstacles: [
      { shape: 'rect', x: 130, y: 270, width: 140, height: 20 },
    ],
    slopes: [],
  },

  // Hole 3: Dogleg right
  {
    par: 3,
    ballStart: { x: 100, y: 520 },
    hole: { pos: { x: 300, y: 80 }, radius: HOLE_RADIUS },
    walls: [
      { x1: 50, y1: 30, x2: 350, y2: 30 },
      { x1: 50, y1: 570, x2: 200, y2: 570 },
      { x1: 50, y1: 30, x2: 50, y2: 570 },
      { x1: 350, y1: 30, x2: 350, y2: 570 },
      { x1: 200, y1: 300, x2: 200, y2: 570 },
      { x1: 200, y1: 300, x2: 350, y2: 300 },
    ],
    obstacles: [],
    slopes: [],
  },

  // Hole 4: Narrow corridor with bumpers
  {
    par: 3,
    ballStart: { x: 200, y: 520 },
    hole: { pos: { x: 200, y: 80 }, radius: HOLE_RADIUS },
    walls: [
      { x1: 50, y1: 30, x2: 350, y2: 30 },
      { x1: 50, y1: 570, x2: 350, y2: 570 },
      { x1: 50, y1: 30, x2: 50, y2: 570 },
      { x1: 350, y1: 30, x2: 350, y2: 570 },
      { x1: 140, y1: 150, x2: 140, y2: 450 },
      { x1: 260, y1: 150, x2: 260, y2: 450 },
    ],
    obstacles: [
      { shape: 'circle', x: 200, y: 300, width: 20, height: 20, radius: 10 },
    ],
    slopes: [],
  },

  // Hole 5: Slope push
  {
    par: 3,
    ballStart: { x: 200, y: 520 },
    hole: { pos: { x: 200, y: 80 }, radius: HOLE_RADIUS },
    walls: [
      { x1: 50, y1: 30, x2: 350, y2: 30 },
      { x1: 50, y1: 570, x2: 350, y2: 570 },
      { x1: 50, y1: 30, x2: 50, y2: 570 },
      { x1: 350, y1: 30, x2: 350, y2: 570 },
    ],
    obstacles: [],
    slopes: [
      { x: 100, y: 200, width: 200, height: 150, dirX: 1, dirY: 0, strength: 0.6 },
    ],
  },

  // Hole 6: Zigzag walls
  {
    par: 4,
    ballStart: { x: 100, y: 520 },
    hole: { pos: { x: 300, y: 80 }, radius: HOLE_RADIUS },
    walls: [
      { x1: 50, y1: 30, x2: 350, y2: 30 },
      { x1: 50, y1: 570, x2: 350, y2: 570 },
      { x1: 50, y1: 30, x2: 50, y2: 570 },
      { x1: 350, y1: 30, x2: 350, y2: 570 },
      { x1: 50, y1: 430, x2: 260, y2: 430 },
      { x1: 140, y1: 300, x2: 350, y2: 300 },
      { x1: 50, y1: 170, x2: 260, y2: 170 },
    ],
    obstacles: [],
    slopes: [],
  },

  // Hole 7: Obstacle maze
  {
    par: 4,
    ballStart: { x: 200, y: 520 },
    hole: { pos: { x: 200, y: 80 }, radius: HOLE_RADIUS },
    walls: [
      { x1: 50, y1: 30, x2: 350, y2: 30 },
      { x1: 50, y1: 570, x2: 350, y2: 570 },
      { x1: 50, y1: 30, x2: 50, y2: 570 },
      { x1: 350, y1: 30, x2: 350, y2: 570 },
    ],
    obstacles: [
      { shape: 'rect', x: 100, y: 200, width: 80, height: 20 },
      { shape: 'rect', x: 220, y: 200, width: 80, height: 20 },
      { shape: 'rect', x: 150, y: 340, width: 100, height: 20 },
      { shape: 'circle', x: 120, y: 440, width: 24, height: 24, radius: 12 },
      { shape: 'circle', x: 280, y: 440, width: 24, height: 24, radius: 12 },
    ],
    slopes: [],
  },

  // Hole 8: Slopes and obstacles combined
  {
    par: 4,
    ballStart: { x: 100, y: 520 },
    hole: { pos: { x: 300, y: 80 }, radius: HOLE_RADIUS },
    walls: [
      { x1: 50, y1: 30, x2: 350, y2: 30 },
      { x1: 50, y1: 570, x2: 350, y2: 570 },
      { x1: 50, y1: 30, x2: 50, y2: 570 },
      { x1: 350, y1: 30, x2: 350, y2: 570 },
    ],
    obstacles: [
      { shape: 'rect', x: 160, y: 250, width: 80, height: 20 },
      { shape: 'rect', x: 160, y: 380, width: 80, height: 20 },
    ],
    slopes: [
      { x: 50, y: 150, width: 300, height: 80, dirX: 0, dirY: -1, strength: 0.5 },
      { x: 50, y: 400, width: 300, height: 80, dirX: -1, dirY: 0, strength: 0.4 },
    ],
  },

  // Hole 9: Grand finale - tight with everything
  {
    par: 5,
    ballStart: { x: 100, y: 540 },
    hole: { pos: { x: 300, y: 60 }, radius: HOLE_RADIUS },
    walls: [
      { x1: 50, y1: 30, x2: 350, y2: 30 },
      { x1: 50, y1: 570, x2: 350, y2: 570 },
      { x1: 50, y1: 30, x2: 50, y2: 570 },
      { x1: 350, y1: 30, x2: 350, y2: 570 },
      { x1: 50, y1: 460, x2: 220, y2: 460 },
      { x1: 180, y1: 320, x2: 350, y2: 320 },
      { x1: 50, y1: 180, x2: 220, y2: 180 },
    ],
    obstacles: [
      { shape: 'circle', x: 280, y: 400, width: 20, height: 20, radius: 10 },
      { shape: 'circle', x: 120, y: 260, width: 20, height: 20, radius: 10 },
      { shape: 'rect', x: 250, y: 120, width: 50, height: 15 },
    ],
    slopes: [
      { x: 230, y: 340, width: 120, height: 120, dirX: 1, dirY: 1, strength: 0.5 },
      { x: 50, y: 50, width: 150, height: 120, dirX: 0, dirY: 1, strength: 0.4 },
    ],
  },
];
