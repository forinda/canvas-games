# Step 4: More Gate Types

**Goal:** Add horizontal bar gates and square gates alongside rings. Introduce a GateType union and procedural gate cycling.

**Time:** ~15 minutes

---

## What You'll Build

Building on step 3:
- **Bar gates** -- horizontal rectangles split into 4 colored sections
- **Square gates** -- hollow squares with 4 colored sides
- **Gate type cycling** -- gates cycle through ring, bar, square as the player climbs
- **Rotated collision** -- transform the ball into the gate's local coordinate space for AABB checks

---

## Concepts

- **Local-space collision**: Rotate the ball position by the negative of the gate's rotation angle
- **AABB nearest-point**: Find the closest point on a rectangle to the ball center, then check distance
- **Gate type union**: `'ring' | 'bar' | 'square'` so each gate carries its own shape

---

## Code

### 1. Update Types

**File:** `src/contexts/canvas2d/games/color-switch/types.ts`

Add the GateType union and bar/square constants:

```typescript
// ── Gate types ──────────────────────────────────────────────
export type GateType = 'ring' | 'bar' | 'square';

export interface Gate {
  type: GateType;
  y: number;
  rotation: number;
  colors: string[];
  scored: boolean;
}

// ── Ball ────────────────────────────────────────────────────
export interface Ball {
  x: number;
  y: number;
  velocity: number;
  radius: number;
  color: string;
}

// ── Color Switcher ──────────────────────────────────────────
export interface ColorSwitcher {
  x: number;
  y: number;
  radius: number;
  rotation: number;
  consumed: boolean;
}

// ── Game phase ──────────────────────────────────────────────
export type Phase = 'idle' | 'playing' | 'dead';

// ── Top-level state ─────────────────────────────────────────
export interface ColorSwitchState {
  ball: Ball;
  gates: Gate[];
  switchers: ColorSwitcher[];
  phase: Phase;
  score: number;
  bestScore: number;
  canvasW: number;
  canvasH: number;
  flashTimer: number;
  cameraY: number;
}

// ── Constants ───────────────────────────────────────────────
export const GAME_COLORS: string[] = [
  '#f44336', // red
  '#ffeb3b', // yellow
  '#4caf50', // green
  '#2196f3', // blue
];

export const GRAVITY = 0.0018;
export const BOUNCE_FORCE = -0.55;
export const TERMINAL_VELOCITY = 0.8;

export const BALL_RADIUS = 14;
export const BALL_START_Y_RATIO = 0.65;

export const GATE_SPACING = 260;
export const GATE_RING_OUTER = 80;
export const GATE_RING_INNER = 55;
export const GATE_BAR_WIDTH = 220;
export const GATE_BAR_HEIGHT = 20;
export const GATE_SQUARE_SIZE = 140;

export const GATE_ROTATION_SPEED = 0.0012;

export const SWITCHER_RADIUS = 14;
export const SWITCHER_ROTATION_SPEED = 0.004;
```

---

### 2. Update the Gate System

**File:** `src/contexts/canvas2d/games/color-switch/systems/GateSystem.ts`

Cycle through gate types using a counter:

```typescript
import type { ColorSwitchState, Gate, ColorSwitcher, GateType } from '../types';
import {
  GAME_COLORS,
  GATE_SPACING,
  GATE_ROTATION_SPEED,
  SWITCHER_RADIUS,
  SWITCHER_ROTATION_SPEED,
} from '../types';

export class GateSystem {
  private nextGateY: number = 0;
  private gateCount: number = 0;

  reset(startY: number): void {
    this.nextGateY = startY;
    this.gateCount = 0;
  }

  update(state: ColorSwitchState, dt: number): void {
    if (state.phase !== 'playing') return;

    // Rotate existing gates
    for (const gate of state.gates) {
      gate.rotation += GATE_ROTATION_SPEED * dt;
    }

    // Rotate existing switchers
    for (const sw of state.switchers) {
      sw.rotation += SWITCHER_ROTATION_SPEED * dt;
    }

    // Generate gates ahead of the ball
    const generateAheadDistance = state.canvasH * 1.5;
    while (this.nextGateY > state.ball.y - generateAheadDistance) {
      this.spawnGate(state);
    }

    // Cleanup
    const removeBelow = state.ball.y + state.canvasH;
    state.gates = state.gates.filter((g) => g.y < removeBelow);
    state.switchers = state.switchers.filter((s) => s.y < removeBelow);
  }

  private spawnGate(state: ColorSwitchState): void {
    const gateTypes: GateType[] = ['ring', 'bar', 'square'];
    const type = gateTypes[this.gateCount % gateTypes.length];

    const colors = this.shuffleColors();

    const gate: Gate = {
      type,
      y: this.nextGateY,
      rotation: Math.random() * Math.PI * 2,
      colors,
      scored: false,
    };

    state.gates.push(gate);

    // Spawn a color switcher between this gate and the next
    const switcher: ColorSwitcher = {
      x: state.canvasW / 2,
      y: this.nextGateY - GATE_SPACING / 2,
      radius: SWITCHER_RADIUS,
      rotation: 0,
      consumed: false,
    };
    state.switchers.push(switcher);

    this.nextGateY -= GATE_SPACING;
    this.gateCount++;
  }

  private shuffleColors(): string[] {
    const colors = [...GAME_COLORS];
    for (let i = colors.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = colors[i];
      colors[i] = colors[j];
      colors[j] = temp;
    }
    return colors;
  }
}
```

The only change from step 3 is `gateTypes[this.gateCount % gateTypes.length]`. The first gate is a ring, the second a bar, the third a square, then back to ring. This gives the player variety without randomness (which could chain three of the same type).

---

### 3. Update the Collision System

**File:** `src/contexts/canvas2d/games/color-switch/systems/CollisionSystem.ts`

Add bar and square collision methods:

```typescript
import type { ColorSwitchState, Gate } from '../types';
import {
  GAME_COLORS,
  GATE_RING_OUTER,
  GATE_RING_INNER,
  GATE_BAR_WIDTH,
  GATE_BAR_HEIGHT,
  GATE_SQUARE_SIZE,
} from '../types';

export class CollisionSystem {
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
      if (!gate.scored && ballY < gate.y - 30) {
        gate.scored = true;
        state.score++;
        continue;
      }

      const dy = Math.abs(ballY - gate.y);
      if (dy > GATE_RING_OUTER + ballR + 5) continue;

      const hit = this.checkGateCollision(gate, ballX, ballY, ballR, state.canvasW);
      if (hit) {
        state.phase = 'dead';
        state.flashTimer = 200;
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

    if (dist > GATE_RING_OUTER + br || dist < GATE_RING_INNER - br) {
      return false;
    }

    const angle = Math.atan2(dy, dx) - gate.rotation;
    const normalizedAngle = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const quadrant = Math.floor(normalizedAngle / (Math.PI / 2)) % 4;
    const quadrantColor = gate.colors[quadrant];

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

    // AABB nearest-point check in local space
    const closestX = Math.max(-halfW, Math.min(halfW, localX));
    const closestY = Math.max(-halfH, Math.min(halfH, localY));
    const distX = localX - closestX;
    const distY = localY - closestY;

    if (distX * distX + distY * distY > br * br) {
      return false; // No collision with bar
    }

    // Determine which color section (4 equal sections along width)
    const sectionWidth = GATE_BAR_WIDTH / 4;
    const sectionIndex = Math.min(
      3,
      Math.max(0, Math.floor((localX + halfW) / sectionWidth)),
    );
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

    // Check if ball overlaps any of the 4 sides
    const sides = [
      { x1: -halfSize, y1: -halfSize, x2: halfSize, y2: -halfSize + thickness, colorIdx: 0 }, // top
      { x1: halfSize - thickness, y1: -halfSize, x2: halfSize, y2: halfSize, colorIdx: 1 },   // right
      { x1: -halfSize, y1: halfSize - thickness, x2: halfSize, y2: halfSize, colorIdx: 2 },   // bottom
      { x1: -halfSize, y1: -halfSize, x2: -halfSize + thickness, y2: halfSize, colorIdx: 3 }, // left
    ];

    for (const side of sides) {
      const closestX = Math.max(side.x1, Math.min(side.x2, localX));
      const closestY = Math.max(side.y1, Math.min(side.y2, localY));
      const distX = localX - closestX;
      const distY = localY - closestY;

      if (distX * distX + distY * distY < br * br) {
        if (gate.colors[side.colorIdx] !== this.ballColor) {
          return true;
        }
      }
    }

    return false;
  }
}
```

Both bar and square collisions use the same trick: **rotate the ball into the gate's local space** by applying the negative of the gate's rotation angle. Once in local space, the gate is axis-aligned and we can use simple AABB math.

For the bar, we clamp the ball's local position to the rectangle to find the nearest point, then check distance. The section index comes from dividing the bar into 4 equal widths.

For the square, we test each of the 4 thin sides as separate rectangles. The ball can touch the top side (color 0), right side (color 1), bottom side (color 2), or left side (color 3). If any touched side has a non-matching color, the player dies.

---

### 4. Update the Game Renderer

**File:** `src/contexts/canvas2d/games/color-switch/renderers/GameRenderer.ts`

Add bar and square drawing methods. Route gates by type:

```typescript
import type { ColorSwitchState } from '../types';
import {
  GAME_COLORS,
  GATE_RING_OUTER,
  GATE_RING_INNER,
  GATE_BAR_WIDTH,
  GATE_BAR_HEIGHT,
  GATE_SQUARE_SIZE,
  SWITCHER_RADIUS,
} from '../types';

export class GameRenderer {
  render(ctx: CanvasRenderingContext2D, state: ColorSwitchState): void {
    const { canvasW, canvasH } = state;

    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvasW, canvasH);

    this.drawBackground(ctx, state);

    ctx.save();
    ctx.translate(0, state.cameraY);

    // Draw gates
    for (const gate of state.gates) {
      this.drawGate(ctx, gate, canvasW);
    }

    // Draw switchers
    for (const sw of state.switchers) {
      if (!sw.consumed) {
        this.drawSwitcher(ctx, sw);
      }
    }

    // Draw ball
    this.drawBall(ctx, state);

    ctx.restore();

    // Death flash
    if (state.flashTimer > 0) {
      const alpha = state.flashTimer / 200;
      ctx.fillStyle = `rgba(255, 50, 50, ${alpha * 0.5})`;
      ctx.fillRect(0, 0, canvasW, canvasH);
    }
  }

  private drawBackground(ctx: CanvasRenderingContext2D, state: ColorSwitchState): void {
    const { canvasW, canvasH } = state;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    const gridSize = 40;
    const offsetY = (state.cameraY % gridSize + gridSize) % gridSize;

    for (let x = 0; x < canvasW; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvasH);
      ctx.stroke();
    }
    for (let y = offsetY; y < canvasH + gridSize; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvasW, y);
      ctx.stroke();
    }
  }

  private drawGate(
    ctx: CanvasRenderingContext2D,
    gate: { type: string; y: number; rotation: number; colors: string[] },
    canvasW: number,
  ): void {
    const cx = canvasW / 2;

    if (gate.type === 'ring') {
      this.drawRingGate(ctx, cx, gate.y, gate.rotation, gate.colors);
    } else if (gate.type === 'bar') {
      this.drawBarGate(ctx, cx, gate.y, gate.rotation, gate.colors);
    } else if (gate.type === 'square') {
      this.drawSquareGate(ctx, cx, gate.y, gate.rotation, gate.colors);
    }
  }

  private drawRingGate(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    rotation: number,
    colors: string[],
  ): void {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rotation);

    for (let i = 0; i < 4; i++) {
      const startAngle = (i * Math.PI) / 2;
      const endAngle = ((i + 1) * Math.PI) / 2;

      ctx.beginPath();
      ctx.arc(0, 0, GATE_RING_OUTER, startAngle, endAngle);
      ctx.arc(0, 0, GATE_RING_INNER, endAngle, startAngle, true);
      ctx.closePath();
      ctx.fillStyle = colors[i];
      ctx.fill();

      ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    ctx.restore();
  }

  private drawBarGate(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    rotation: number,
    colors: string[],
  ): void {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rotation);

    const halfW = GATE_BAR_WIDTH / 2;
    const halfH = GATE_BAR_HEIGHT / 2;
    const sectionW = GATE_BAR_WIDTH / 4;

    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = colors[i];
      ctx.fillRect(-halfW + i * sectionW, -halfH, sectionW, GATE_BAR_HEIGHT);

      ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.lineWidth = 1;
      ctx.strokeRect(-halfW + i * sectionW, -halfH, sectionW, GATE_BAR_HEIGHT);
    }

    // Rounded ends
    ctx.beginPath();
    ctx.fillStyle = colors[0];
    ctx.arc(-halfW, 0, halfH, Math.PI / 2, Math.PI * 1.5);
    ctx.fill();
    ctx.beginPath();
    ctx.fillStyle = colors[3];
    ctx.arc(halfW, 0, halfH, -Math.PI / 2, Math.PI / 2);
    ctx.fill();

    ctx.restore();
  }

  private drawSquareGate(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    rotation: number,
    colors: string[],
  ): void {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rotation);

    const halfSize = GATE_SQUARE_SIZE / 2;
    const thickness = 18;

    // Top side
    ctx.fillStyle = colors[0];
    ctx.fillRect(-halfSize, -halfSize, GATE_SQUARE_SIZE, thickness);

    // Right side
    ctx.fillStyle = colors[1];
    ctx.fillRect(halfSize - thickness, -halfSize, thickness, GATE_SQUARE_SIZE);

    // Bottom side
    ctx.fillStyle = colors[2];
    ctx.fillRect(-halfSize, halfSize - thickness, GATE_SQUARE_SIZE, thickness);

    // Left side
    ctx.fillStyle = colors[3];
    ctx.fillRect(-halfSize, -halfSize, thickness, GATE_SQUARE_SIZE);

    // Border
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.lineWidth = 2;
    ctx.strokeRect(-halfSize, -halfSize, GATE_SQUARE_SIZE, GATE_SQUARE_SIZE);

    ctx.restore();
  }

  private drawSwitcher(
    ctx: CanvasRenderingContext2D,
    sw: { x: number; y: number; radius: number; rotation: number },
  ): void {
    ctx.save();
    ctx.translate(sw.x, sw.y);
    ctx.rotate(sw.rotation);

    const r = SWITCHER_RADIUS;

    for (let i = 0; i < 4; i++) {
      const startAngle = (i * Math.PI) / 2;
      const endAngle = ((i + 1) * Math.PI) / 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, r, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = GAME_COLORS[i];
      ctx.fill();
    }

    ctx.beginPath();
    ctx.arc(0, 0, r * 0.35, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();

    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(0, 0, r + 2, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.restore();
  }

  private drawBall(ctx: CanvasRenderingContext2D, state: ColorSwitchState): void {
    const ball = state.ball;

    ctx.save();
    ctx.translate(ball.x, ball.y);

    ctx.shadowColor = ball.color;
    ctx.shadowBlur = 20;

    ctx.beginPath();
    ctx.arc(0, 0, ball.radius, 0, Math.PI * 2);
    ctx.fillStyle = ball.color;
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(-ball.radius * 0.25, -ball.radius * 0.25, ball.radius * 0.45, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(0, 0, ball.radius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.restore();
  }
}
```

The bar gate draws 4 colored rectangles side by side, with semicircular caps at each end for polish. The square gate draws 4 thin rectangles for the top, right, bottom, and left sides. Note that the corners overlap -- the left and top sides both cover the top-left corner. This is fine visually because the overlap is only 18x18 pixels.

---

## Test It

1. **Run:** `npm run dev`
2. **Navigate:** Select "Color Switch"
3. **Observe:**
   - First gate is a ring, second is a bar, third is a square, then repeats
   - Bars rotate like a propeller -- time your pass through the matching color section
   - Squares rotate -- pass through the opening between two sides, matching one of them
   - Wrong-color collision works on all three gate types
   - Switchers still appear between every gate pair

---

## Challenges

**Easy:**
- Change the gate cycle order to square, ring, bar
- Make bars wider (`GATE_BAR_WIDTH = 300`)
- Make squares thicker (`thickness = 24` in both renderer and collision)

**Medium:**
- Add a diamond gate type (rotated square with triangular sides)
- Randomize gate types instead of cycling
- Make gates spin faster the higher you climb

**Hard:**
- Add a "cross" gate (two intersecting bars)
- Implement gates with only 2 or 3 colored sections
- Add gates that reverse rotation direction periodically

---

## What You Learned

- Local-space collision by rotating ball coordinates with cos/sin
- AABB nearest-point distance test for circle-vs-rectangle
- Per-side collision for hollow square shapes
- Type-driven dispatching (`gate.type` routes to the correct check/draw)
- Modulo cycling for predictable variety in procedural generation

**Next:** Score display, high score persistence, and start/death overlays!
