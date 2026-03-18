import type { Updatable } from '@shared/Updatable';
import type { ColorSwitchState, Gate } from '../types';
import {
  GAME_COLORS,
  GATE_RING_OUTER,
  GATE_RING_INNER,
  GATE_BAR_WIDTH,
  GATE_BAR_HEIGHT,
  GATE_SQUARE_SIZE,
  HS_KEY,
} from '../types';

export class CollisionSystem implements Updatable<ColorSwitchState> {
  private ballColor: string = '';

  update(state: ColorSwitchState, _dt: number): void {
    if (state.phase !== 'playing') return;

    const ball = state.ball;
    this.ballColor = ball.color;
    const ballX = ball.x;
    const ballY = ball.y;
    const ballR = ball.radius;

    // Check gate collisions
    for (const gate of state.gates) {
      // Score: ball passed above gate center
      if (!gate.scored && ballY < gate.y - 30) {
        gate.scored = true;
        state.score++;
        continue;
      }

      // Only check collision when ball is near the gate vertically
      const dy = Math.abs(ballY - gate.y);
      if (dy > GATE_RING_OUTER + ballR + 5) continue;

      const hit = this.checkGateCollision(gate, ballX, ballY, ballR, state.canvasW);
      if (hit) {
        state.phase = 'dead';
        state.flashTimer = 200;
        this.saveBest(state);
        return;
      }
    }

    // Check color switcher collisions
    for (const sw of state.switchers) {
      if (sw.consumed) continue;
      const dx = ballX - sw.x;
      const dy = ballY - sw.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < ballR + sw.radius) {
        sw.consumed = true;
        // Change ball to a random different color
        const otherColors = GAME_COLORS.filter((c) => c !== ball.color);
        ball.color = otherColors[Math.floor(Math.random() * otherColors.length)];
        this.ballColor = ball.color;
      }
    }
  }

  private checkGateCollision(
    gate: Gate,
    bx: number,
    by: number,
    br: number,
    canvasW: number,
  ): boolean {
    const cx = canvasW / 2;

    if (gate.type === 'ring') {
      return this.checkRingCollision(gate, bx, by, br, cx);
    }
    if (gate.type === 'bar') {
      return this.checkBarCollision(gate, bx, by, br, cx);
    }
    if (gate.type === 'square') {
      return this.checkSquareCollision(gate, bx, by, br, cx);
    }
    return false;
  }

  private checkRingCollision(
    gate: Gate,
    bx: number,
    by: number,
    br: number,
    cx: number,
  ): boolean {
    const dx = bx - cx;
    const dy = by - gate.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Ball is outside the ring or inside the hole -- no collision with the ring body
    if (dist > GATE_RING_OUTER + br || dist < GATE_RING_INNER - br) {
      return false;
    }

    // Ball overlaps the ring body -- determine which color quadrant
    const angle = Math.atan2(dy, dx) - gate.rotation;
    const normalizedAngle = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const quadrant = Math.floor(normalizedAngle / (Math.PI / 2)) % 4;
    const quadrantColor = gate.colors[quadrant];

    // If ball color does NOT match the quadrant, it's a death
    return quadrantColor !== this.ballColor;
  }

  private checkBarCollision(
    gate: Gate,
    bx: number,
    by: number,
    br: number,
    cx: number,
  ): boolean {
    const halfW = GATE_BAR_WIDTH / 2;
    const halfH = GATE_BAR_HEIGHT / 2;

    // Rotate ball position into bar's local space
    const dx = bx - cx;
    const dy = by - gate.y;
    const cos = Math.cos(-gate.rotation);
    const sin = Math.sin(-gate.rotation);
    const localX = dx * cos - dy * sin;
    const localY = dx * sin + dy * cos;

    // AABB check in local space
    const closestX = Math.max(-halfW, Math.min(halfW, localX));
    const closestY = Math.max(-halfH, Math.min(halfH, localY));
    const distX = localX - closestX;
    const distY = localY - closestY;

    if (distX * distX + distY * distY > br * br) {
      return false; // No collision with bar
    }

    // Determine which color section the ball is in (4 equal sections along width)
    const sectionWidth = GATE_BAR_WIDTH / 4;
    const sectionIndex = Math.min(3, Math.max(0, Math.floor((localX + halfW) / sectionWidth)));
    const sectionColor = gate.colors[sectionIndex];

    return sectionColor !== this.ballColor;
  }

  private checkSquareCollision(
    gate: Gate,
    bx: number,
    by: number,
    br: number,
    cx: number,
  ): boolean {
    const halfSize = GATE_SQUARE_SIZE / 2;
    const thickness = 18;

    // Rotate ball into square's local space
    const dx = bx - cx;
    const dy = by - gate.y;
    const cos = Math.cos(-gate.rotation);
    const sin = Math.sin(-gate.rotation);
    const localX = dx * cos - dy * sin;
    const localY = dx * sin + dy * cos;

    // Check if ball overlaps any of the 4 sides of the square
    const sides = [
      { x1: -halfSize, y1: -halfSize, x2: halfSize, y2: -halfSize + thickness, colorIdx: 0 }, // top
      { x1: halfSize - thickness, y1: -halfSize, x2: halfSize, y2: halfSize, colorIdx: 1 },     // right
      { x1: -halfSize, y1: halfSize - thickness, x2: halfSize, y2: halfSize, colorIdx: 2 },     // bottom
      { x1: -halfSize, y1: -halfSize, x2: -halfSize + thickness, y2: halfSize, colorIdx: 3 },   // left
    ];

    for (const side of sides) {
      const closestX = Math.max(side.x1, Math.min(side.x2, localX));
      const closestY = Math.max(side.y1, Math.min(side.y2, localY));
      const distX = localX - closestX;
      const distY = localY - closestY;

      if (distX * distX + distY * distY < br * br) {
        // Ball is touching this side
        if (gate.colors[side.colorIdx] !== this.ballColor) {
          return true;
        }
      }
    }

    return false;
  }

  private saveBest(state: ColorSwitchState): void {
    if (state.score > state.bestScore) {
      state.bestScore = state.score;
      try {
        localStorage.setItem(HS_KEY, String(state.bestScore));
      } catch {
        /* noop */
      }
    }
  }
}
