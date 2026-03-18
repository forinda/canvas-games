import type { Renderable } from '@shared/Renderable';
import { type InvadersState, AlienType } from '../types';

// ── Tiny pixel-art sprites encoded as 1-bit rows ───────────────────────────
// Each number is a row of pixels; bit 1 = pixel on. Width varies per type.

const SPRITE_SMALL: number[] = [
  0b00100000100,
  0b00010001000,
  0b00111111100,
  0b01101110110,
  0b11111111111,
  0b10111111101,
  0b10100000101,
  0b00011011000,
];
const SPRITE_SMALL_W = 11;

const SPRITE_MEDIUM: number[] = [
  0b00100000100,
  0b10010001001,
  0b10111111101,
  0b11101110111,
  0b11111111111,
  0b01111111110,
  0b00100000100,
  0b01000000010,
];
const SPRITE_MEDIUM_W = 11;

const SPRITE_LARGE: number[] = [
  0b00001111100000,
  0b01111111111100,
  0b11111111111110,
  0b11100110011100,
  0b11111111111110,
  0b00011001100000,
  0b00110110110000,
  0b11000000001100,
];
const SPRITE_LARGE_W = 14;

const ALIEN_COLORS: Record<AlienType, string> = {
  [AlienType.Small]: '#ff4444',
  [AlienType.Medium]: '#44ff44',
  [AlienType.Large]: '#44aaff',
};

function drawSprite(
  ctx: CanvasRenderingContext2D,
  rows: number[],
  spriteW: number,
  x: number,
  y: number,
  destW: number,
  destH: number,
  color: string,
): void {
  const pxW = destW / spriteW;
  const pxH = destH / rows.length;
  ctx.fillStyle = color;

  for (let r = 0; r < rows.length; r++) {
    for (let c = 0; c < spriteW; c++) {
      if ((rows[r] >> (spriteW - 1 - c)) & 1) {
        ctx.fillRect(
          x + c * pxW,
          y + r * pxH,
          Math.ceil(pxW),
          Math.ceil(pxH),
        );
      }
    }
  }
}

function getSpriteData(type: AlienType): { rows: number[]; w: number } {
  switch (type) {
    case AlienType.Small:
      return { rows: SPRITE_SMALL, w: SPRITE_SMALL_W };
    case AlienType.Medium:
      return { rows: SPRITE_MEDIUM, w: SPRITE_MEDIUM_W };
    case AlienType.Large:
      return { rows: SPRITE_LARGE, w: SPRITE_LARGE_W };
  }
}

export class GameRenderer implements Renderable<InvadersState> {
  render(ctx: CanvasRenderingContext2D, state: InvadersState): void {
    // ── Clear ───────────────────────────────────────────────────────────
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, state.canvasW, state.canvasH);

    // ── Shields ─────────────────────────────────────────────────────────
    ctx.fillStyle = '#33cc33';
    for (const shield of state.shields) {
      for (let r = 0; r < shield.rows; r++) {
        for (let c = 0; c < shield.cols; c++) {
          if (shield.grid[r][c]) {
            ctx.fillRect(
              shield.x + c * shield.blockSize,
              shield.y + r * shield.blockSize,
              shield.blockSize,
              shield.blockSize,
            );
          }
        }
      }
    }

    // ── Aliens ──────────────────────────────────────────────────────────
    for (const alien of state.aliens) {
      if (!alien.alive) continue;
      const { rows, w } = getSpriteData(alien.type);
      drawSprite(
        ctx,
        rows,
        w,
        alien.x,
        alien.y,
        alien.w,
        alien.h,
        ALIEN_COLORS[alien.type],
      );
    }

    // ── UFO ─────────────────────────────────────────────────────────────
    if (state.ufo?.active) {
      const u = state.ufo;
      ctx.fillStyle = '#ff2277';
      // simple saucer shape
      ctx.beginPath();
      ctx.ellipse(u.x + u.w / 2, u.y + u.h / 2, u.w / 2, u.h / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ff88aa';
      ctx.beginPath();
      ctx.ellipse(u.x + u.w / 2, u.y + u.h / 2 - 2, u.w / 4, u.h / 4, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // ── Player ──────────────────────────────────────────────────────────
    if (state.player.alive || state.phase === 'respawning') {
      const p = state.player;
      const alpha = state.phase === 'respawning' ? 0.4 : 1;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#00ff88';
      // Body
      ctx.fillRect(p.x, p.y + 6, p.w, p.h - 6);
      // Turret
      ctx.fillRect(p.x + p.w / 2 - 3, p.y, 6, 8);
      ctx.globalAlpha = 1;
    }

    // ── Bullets ─────────────────────────────────────────────────────────
    for (const b of state.bullets) {
      if (!b.active) continue;
      ctx.fillStyle = b.fromPlayer ? '#ffffff' : '#ff6644';
      ctx.fillRect(b.x, b.y, b.w, b.h);
    }
  }
}
