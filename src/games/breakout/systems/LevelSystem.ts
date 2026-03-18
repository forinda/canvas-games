import type { Updatable } from '@shared/Updatable';
import type { BreakoutState, Brick } from '../types';
import {
  BRICK_GAP, BRICK_H, BRICK_TOP_OFFSET, BALL_BASE_SPEED, MAX_LEVEL,
} from '../types';
import { LEVELS } from '../data/levels';

export class LevelSystem implements Updatable<BreakoutState> {
  update(state: BreakoutState, _dt: number): void {
    // Check if all bricks are cleared
    const allCleared = state.bricks.every((b) => !b.alive);
    if (!allCleared) return;

    if (state.level >= MAX_LEVEL) {
      state.phase = 'win';
      return;
    }

    // Advance to next level
    state.level++;
    this.loadLevel(state);
  }

  loadLevel(state: BreakoutState): void {
    const levelIdx = Math.min(state.level - 1, LEVELS.length - 1);
    const def = LEVELS[levelIdx];

    const rows = def.layout.length;
    const cols = def.layout[0].length;
    const brickW = (state.canvasW - BRICK_GAP * (cols + 1)) / cols;

    const bricks: Brick[] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const hp = def.layout[r][c];
        if (hp <= 0) continue;
        bricks.push({
          x: BRICK_GAP + c * (brickW + BRICK_GAP),
          y: BRICK_TOP_OFFSET + r * (BRICK_H + BRICK_GAP),
          w: brickW,
          h: BRICK_H,
          hp,
          maxHp: hp,
          color: def.colors[r % def.colors.length],
          alive: true,
        });
      }
    }

    state.bricks = bricks;
    state.baseBallSpeed = BALL_BASE_SPEED * def.speedMult;
    state.powerups = [];
    state.effects = [];

    // Reset paddle width
    state.paddle.w = state.paddle.baseW;

    // Reset ball
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.5;
    state.balls = [
      {
        x: state.paddle.x + state.paddle.w / 2,
        y: state.paddle.y - 8,
        vx: Math.cos(angle) * state.baseBallSpeed,
        vy: Math.sin(angle) * state.baseBallSpeed,
        r: 6,
      },
    ];
  }
}
