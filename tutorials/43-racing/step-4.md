# Step 4: Track Boundaries & Collision

**Goal:** Keep the car on the track with boundary enforcement, add wall collision response, and build the countdown and pause overlays.

**Time:** ~15 minutes

---

## What You'll Build

- **Wall collision response** that pushes the car back toward the road when it strays too far
- **Boundary enforcement** using the track system's distance calculations
- **Countdown overlay** with animated 3-2-1-GO! display
- **Pause overlay** toggled with the P key
- **HUD top bar** showing lap count, race timer, and position

---

## Concepts

- **Soft vs. Hard Boundaries**: Rather than an instant wall bounce, we use a soft boundary approach. Off-track friction (from Step 3) handles mild excursions. For extreme cases where the car is far from any segment, we push it back toward the nearest track point. This feels more natural than a rigid wall.
- **Nearest-Point Correction**: When the car is beyond the road edge, we find the closest point on the nearest segment and push the car position back toward it. The push strength increases with distance, creating a rubbery wall feel.
- **Countdown State Machine**: The `GamePhase` type (`countdown | racing | finished`) drives the game flow. During countdown, input is ignored and a shrinking number animates on screen. This prevents unfair starts.
- **HUD Layer Separation**: The HUD renders in screen-space (no camera transform), on top of the world-space track and cars. This keeps UI elements fixed regardless of where the camera is.

---

## Code

### 1. Add Boundary Enforcement to TrackSystem

**File:** `src/games/racing/systems/TrackSystem.ts`

Extend the track system to push cars back onto the road when they stray too far beyond the boundary.

```typescript
import type { RacingState, Car, TrackDefinition } from '../types';
import { OFF_TRACK_FRICTION, OFF_TRACK_MAX_SPEED } from '../types';

export class TrackSystem {
  update(state: RacingState, dt: number): void {
    if (state.phase !== 'racing' || state.paused) return;

    const secs = dt / 1000;
    const allCars = [state.player, ...state.aiCars];

    for (const car of allCars) {
      if (car.finished) continue;

      // Off-track slowdown
      if (!this.isOnTrack(car, state.track)) {
        car.speed -= OFF_TRACK_FRICTION * secs * Math.sign(car.speed || 1);

        if (Math.abs(car.speed) > OFF_TRACK_MAX_SPEED) {
          car.speed = OFF_TRACK_MAX_SPEED * Math.sign(car.speed);
        }

        // Push car back toward track
        this.pushTowardTrack(car, state.track, secs);
      }
    }
  }

  /** Check if car is within road width of any track segment */
  isOnTrack(car: Car, track: TrackDefinition): boolean {
    const wp = track.waypoints;
    const halfW = track.roadWidth / 2;

    for (let i = 0; i < wp.length; i++) {
      const a = wp[i];
      const b = wp[(i + 1) % wp.length];
      const dist = this.pointToSegmentDist(car.x, car.y, a.x, a.y, b.x, b.y);

      if (dist < halfW) return true;
    }

    return false;
  }

  /** Gently push a car back toward the nearest track point */
  private pushTowardTrack(car: Car, track: TrackDefinition, secs: number): void {
    const wp = track.waypoints;
    let closestDist = Infinity;
    let closestX = car.x;
    let closestY = car.y;

    // Find the closest point on any segment
    for (let i = 0; i < wp.length; i++) {
      const a = wp[i];
      const b = wp[(i + 1) % wp.length];
      const pt = this.closestPointOnSegment(car.x, car.y, a.x, a.y, b.x, b.y);
      const d = Math.hypot(car.x - pt.x, car.y - pt.y);

      if (d < closestDist) {
        closestDist = d;
        closestX = pt.x;
        closestY = pt.y;
      }
    }

    // Only push if car is significantly off-track (beyond road width)
    const pushThreshold = track.roadWidth * 0.8;

    if (closestDist > pushThreshold) {
      const pushStrength = 120 * secs; // px/s push force
      const dx = closestX - car.x;
      const dy = closestY - car.y;
      const dist = Math.hypot(dx, dy) || 1;

      car.x += (dx / dist) * pushStrength;
      car.y += (dy / dist) * pushStrength;
    }
  }

  private closestPointOnSegment(
    px: number, py: number,
    ax: number, ay: number,
    bx: number, by: number,
  ): { x: number; y: number } {
    const abx = bx - ax;
    const aby = by - ay;
    const ab2 = abx * abx + aby * aby;

    if (ab2 === 0) return { x: ax, y: ay };

    let t = ((px - ax) * abx + (py - ay) * aby) / ab2;
    t = Math.max(0, Math.min(1, t));

    return { x: ax + t * abx, y: ay + t * aby };
  }

  private pointToSegmentDist(
    px: number, py: number,
    ax: number, ay: number,
    bx: number, by: number,
  ): number {
    const pt = this.closestPointOnSegment(px, py, ax, ay, bx, by);
    return Math.hypot(px - pt.x, py - pt.y);
  }

  /** Get closest waypoint index for a position */
  getClosestWaypoint(x: number, y: number, track: TrackDefinition): number {
    let best = 0;
    let bestDist = Infinity;

    for (let i = 0; i < track.waypoints.length; i++) {
      const w = track.waypoints[i];
      const d = Math.hypot(x - w.x, y - w.y);

      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    }

    return best;
  }
}
```

**What's happening:**
- `pushTowardTrack()` finds the closest point on any track segment to the car. If the car is beyond 80% of the road width from the center line, a gentle push force (120 px/s) nudges it back toward the road.
- `closestPointOnSegment()` is extracted as a reusable method -- it returns the actual closest point coordinates, not just the distance. The same projection math is used by `pointToSegmentDist()`.
- The push is directional (toward the nearest road point) so it works on any track shape, including tight curves.

---

### 2. Create the HUD Renderer

**File:** `src/games/racing/renderers/HUDRenderer.ts`

Draws the top bar (lap, timer, position), speed gauge, countdown, pause, and finish overlays.

```typescript
import type { RacingState } from '../types';
import { MAX_SPEED, TOTAL_LAPS, PLAYER_COLOR } from '../types';

export class HUDRenderer {
  render(ctx: CanvasRenderingContext2D, state: RacingState): void {
    const W = state.canvasW;
    const H = state.canvasH;

    // ── Top bar ──
    this.renderTopBar(ctx, state, W);

    // ── Speed gauge (bottom-right) ──
    this.renderSpeedGauge(ctx, state, W, H);

    // ── Countdown overlay ──
    if (state.phase === 'countdown') {
      this.renderCountdown(ctx, state, W, H);
    }

    // ── Paused overlay ──
    if (state.paused) {
      this.renderOverlay(ctx, W, H, 'PAUSED', 'Press [P] to resume');
    }
  }

  private renderTopBar(
    ctx: CanvasRenderingContext2D,
    state: RacingState,
    W: number,
  ): void {
    // Background
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, W, 44);

    ctx.font = 'bold 16px monospace';
    ctx.textBaseline = 'middle';
    const y = 22;

    // Lap counter (left)
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'left';
    const lap = Math.min(state.player.laps + 1, TOTAL_LAPS);

    ctx.fillText(`Lap ${lap}/${TOTAL_LAPS}`, 16, y);

    // Race timer (center)
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd700';
    const mins = Math.floor(state.raceTime / 60);
    const secs = Math.floor(state.raceTime % 60);
    const ms = Math.floor((state.raceTime % 1) * 100);

    ctx.fillText(
      `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`,
      W / 2,
      y,
    );
  }

  private renderSpeedGauge(
    ctx: CanvasRenderingContext2D,
    state: RacingState,
    W: number,
    H: number,
  ): void {
    const gaugeW = 160;
    const gaugeH = 20;
    const x = W - gaugeW - 16;
    const y = H - 40;
    const speedRatio = Math.abs(state.player.speed) / MAX_SPEED;

    // Background
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(x - 4, y - 20, gaugeW + 8, gaugeH + 28);

    // Label
    ctx.font = 'bold 11px monospace';
    ctx.fillStyle = '#aaa';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText('SPEED', x, y - 4);

    // Speed value
    ctx.textAlign = 'right';
    ctx.fillStyle = '#fff';
    ctx.fillText(
      `${Math.round(Math.abs(state.player.speed))}`,
      x + gaugeW,
      y - 4,
    );

    // Bar background
    ctx.fillStyle = '#333';
    ctx.fillRect(x, y, gaugeW, gaugeH);

    // Bar fill (green -> red as speed increases)
    const r = Math.round(255 * speedRatio);
    const g = Math.round(255 * (1 - speedRatio));

    ctx.fillStyle = `rgb(${r},${g},80)`;
    ctx.fillRect(x, y, gaugeW * speedRatio, gaugeH);

    // Border
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, gaugeW, gaugeH);
  }

  private renderCountdown(
    ctx: CanvasRenderingContext2D,
    state: RacingState,
    W: number,
    H: number,
  ): void {
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(0, 0, W, H);

    const num = Math.ceil(state.countdownTimer);
    const text = num > 0 ? num.toString() : 'GO!';
    const scale = 1 + (state.countdownTimer % 1) * 0.3;

    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.scale(scale, scale);

    ctx.font = 'bold 80px monospace';
    ctx.fillStyle = num > 0 ? '#fff' : '#4caf50';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 0, 0);
    ctx.restore();
  }

  private renderOverlay(
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
    title: string,
    subtitle: string,
  ): void {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, W, H);

    ctx.font = 'bold 48px monospace';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(title, W / 2, H / 2 - 20);

    ctx.font = '18px monospace';
    ctx.fillStyle = '#aaa';
    ctx.fillText(subtitle, W / 2, H / 2 + 30);
  }
}
```

**What's happening:**
- The top bar renders at screen-space position (no camera transform). It shows the current lap on the left and the race timer in gold in the center, formatted as `MM:SS.ms`.
- The speed gauge is a horizontal bar in the bottom-right. Its fill color transitions from green (slow) to red (fast) using `rgb(255*ratio, 255*(1-ratio), 80)`.
- The countdown uses `Math.ceil(countdownTimer)` to display 3, 2, 1, then "GO!". A scale animation (`1 + fraction * 0.3`) makes each number pulse as it counts down.
- The pause overlay is a simple semi-transparent dark screen with centered text.

---

### 3. Update the Engine

**File:** `src/games/racing/RacingEngine.ts`

Add the HUD renderer to the render pipeline.

Add this import at the top:

```typescript
import { HUDRenderer } from './renderers/HUDRenderer';
```

Add this to the constructor alongside the other renderers:

```typescript
private hudRenderer: HUDRenderer;

// In constructor:
this.hudRenderer = new HUDRenderer();
```

Update the `render()` method to include the HUD:

```typescript
private render(): void {
  const ctx = this.ctx;

  ctx.clearRect(0, 0, this.state.canvasW, this.state.canvasH);

  this.trackRenderer.render(ctx, this.state);
  this.carRenderer.render(ctx, this.state);
  this.hudRenderer.render(ctx, this.state);
}
```

**What's happening:**
- The HUD renders last, on top of everything else. Since it draws in screen-space (no camera transform), UI elements stay fixed on screen while the world scrolls underneath.

---

## Test It

1. **Run:** `npm run dev`
2. **Observe the countdown:** 3, 2, 1, GO! with pulsing animation
3. **Check the HUD:**
   - **Top-left:** Lap counter showing "Lap 1/3"
   - **Top-center:** Race timer counting up in gold
   - **Bottom-right:** Speed gauge that fills green-to-red as you accelerate
4. **Drive off the road** far into the grass:
   - You slow down dramatically (from Step 3)
   - If you go very far, the **boundary push** gently nudges you back toward the track
   - You cannot escape infinitely into the grass
5. **Press P** to pause -- the overlay appears with "PAUSED" text
6. **Press P** again to resume racing

---

## Challenges

**Easy:**
- Change the countdown "GO!" color from green to gold (`#ffd700`).
- Add the current speed as a number displayed inside the speed gauge bar.

**Medium:**
- Add a "Wrong Way" warning that appears when the car's angle points away from the next waypoint direction (dot product of car forward vector and waypoint direction is negative).

**Hard:**
- Implement a hard wall mode: instead of a gentle push, reflect the car's velocity when it hits the boundary, simulating a bounce off a barrier. Reduce speed by 50% on each bounce.

---

## What You Learned

- Finding the closest point on a line segment for boundary enforcement
- Implementing soft collision response that pushes objects back toward valid areas
- Rendering screen-space HUD elements independently of the world camera
- Building countdown and pause overlays as game phase state machines
- Creating a dynamic speed gauge with color interpolation

**Next:** Checkpoints & Lap Counting -- add checkpoint gates, a lap counter, and a lap timer!
