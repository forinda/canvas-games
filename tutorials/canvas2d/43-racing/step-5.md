# Step 5: Checkpoints & Lap Counting

**Goal:** Add checkpoint gates at each waypoint, count laps as the player crosses the start/finish line, track race time, and display a finish screen.

**Time:** ~15 minutes

---

## What You'll Build

- **Checkpoint detection** using distance to each waypoint in sequence
- **Lap counting** that increments only after visiting checkpoints in order
- **Race completion** when the player crosses the start line after 3 laps
- **Finish overlay** showing final position and time
- **Position sorting** that ranks cars by laps, checkpoints, and distance to next waypoint

---

## Concepts

- **Sequential Checkpoint Validation**: The car must pass checkpoints in order. Each car tracks its `lastCheckpoint` index. When the car comes within range of checkpoint `lastCheckpoint + 1`, that checkpoint is marked as crossed. A lap only counts when checkpoint 0 (the start line) is reached after visiting subsequent checkpoints. This prevents cheating by driving backward across the finish line.
- **Distance-Based Trigger**: A checkpoint is considered "crossed" when the car is within `roadWidth * 0.8` of the waypoint. Using a generous radius means the player does not need pixel-perfect positioning.
- **Position Ranking Algorithm**: All cars are sorted by: (1) finished cars first, by finish time, (2) more laps completed, (3) higher checkpoint index, (4) closer distance to next checkpoint. This gives an accurate live position leaderboard.
- **Race Completion**: When `car.laps >= totalLaps`, the car's `finished` flag is set and its `finishTime` is recorded. When the player finishes, the game phase changes to `finished`.

---

## Code

### 1. Update TrackSystem with Checkpoint and Lap Logic

**File:** `src/contexts/canvas2d/games/racing/systems/TrackSystem.ts`

Add `checkLap()` and `updatePositions()` methods to the existing track system.

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

      // Checkpoint / lap detection
      this.checkLap(car, state);
    }

    // Sort positions
    this.updatePositions(state);
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

  private pushTowardTrack(car: Car, track: TrackDefinition, secs: number): void {
    const wp = track.waypoints;
    let closestDist = Infinity;
    let closestX = car.x;
    let closestY = car.y;

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

    const pushThreshold = track.roadWidth * 0.8;

    if (closestDist > pushThreshold) {
      const pushStrength = 120 * secs;
      const dx = closestX - car.x;
      const dy = closestY - car.y;
      const dist = Math.hypot(dx, dy) || 1;

      car.x += (dx / dist) * pushStrength;
      car.y += (dy / dist) * pushStrength;
    }
  }

  private checkLap(car: Car, state: RacingState): void {
    const wp = state.track.waypoints;
    const nextCP = (car.lastCheckpoint + 1) % wp.length;
    const target = wp[nextCP];
    const dx = car.x - target.x;
    const dy = car.y - target.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < state.track.roadWidth * 0.8) {
      car.lastCheckpoint = nextCP;

      // If we've crossed checkpoint 0 and visited enough checkpoints, count a lap
      if (nextCP === 0 && car.laps >= 0) {
        car.laps++;

        if (car.laps >= state.totalLaps) {
          car.finished = true;
          car.finishTime = state.raceTime;
        }
      }
    }
  }

  private updatePositions(state: RacingState): void {
    const allCars = [state.player, ...state.aiCars];

    allCars.sort((a, b) => {
      // Finished cars first, by finish time
      if (a.finished && b.finished) return a.finishTime - b.finishTime;
      if (a.finished) return -1;
      if (b.finished) return 1;

      // More laps = better position
      if (b.laps !== a.laps) return b.laps - a.laps;

      // More checkpoints = better
      if (b.lastCheckpoint !== a.lastCheckpoint)
        return b.lastCheckpoint - a.lastCheckpoint;

      // Closer to next checkpoint = better
      const wp = state.track.waypoints;
      const aNext = wp[(a.lastCheckpoint + 1) % wp.length];
      const bNext = wp[(b.lastCheckpoint + 1) % wp.length];
      const aDist = Math.hypot(a.x - aNext.x, a.y - aNext.y);
      const bDist = Math.hypot(b.x - bNext.x, b.y - bNext.y);

      return aDist - bDist;
    });
    state.positions = allCars;

    // Check if player finished -> end race
    if (state.player.finished) {
      state.phase = 'finished';
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
- `checkLap()` monitors the car's distance to the next checkpoint in sequence. When the car comes within `roadWidth * 0.8` of that checkpoint, `lastCheckpoint` advances. This sequential requirement means you cannot skip checkpoints.
- When `nextCP === 0` (the start/finish line), a full lap is counted. Once `car.laps >= totalLaps` (3), the car is marked as finished and its race time is recorded.
- `updatePositions()` sorts all cars into a leaderboard. The ranking criteria cascade: finished status, then laps, then checkpoints, then proximity to the next checkpoint. This ensures accurate position tracking at every moment.

---

### 2. Update the HUD Renderer with Finish Screen and Position Display

**File:** `src/contexts/canvas2d/games/racing/renderers/HUDRenderer.ts`

Add the position display, finish overlay, and position helper methods to the existing HUD renderer.

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

    // ── Mini position list (right side) ──
    this.renderPositions(ctx, state, W);

    // ── Countdown overlay ──
    if (state.phase === 'countdown') {
      this.renderCountdown(ctx, state, W, H);
    }

    // ── Paused overlay ──
    if (state.paused) {
      this.renderOverlay(ctx, W, H, 'PAUSED', 'Press [P] to resume');
    }

    // ── Finished overlay ──
    if (state.phase === 'finished') {
      this.renderFinished(ctx, state, W, H);
    }
  }

  private renderTopBar(
    ctx: CanvasRenderingContext2D,
    state: RacingState,
    W: number,
  ): void {
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

    // Position (right)
    const pos = this.getPlayerPosition(state);
    ctx.textAlign = 'right';
    ctx.fillStyle = pos === 1 ? '#ffd700' : pos === 2 ? '#c0c0c0' : '#cd7f32';
    ctx.fillText(`${this.ordinal(pos)}`, W - 16, y);
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

    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(x - 4, y - 20, gaugeW + 8, gaugeH + 28);

    ctx.font = 'bold 11px monospace';
    ctx.fillStyle = '#aaa';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText('SPEED', x, y - 4);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#fff';
    ctx.fillText(`${Math.round(Math.abs(state.player.speed))}`, x + gaugeW, y - 4);

    ctx.fillStyle = '#333';
    ctx.fillRect(x, y, gaugeW, gaugeH);

    const r = Math.round(255 * speedRatio);
    const g = Math.round(255 * (1 - speedRatio));
    ctx.fillStyle = `rgb(${r},${g},80)`;
    ctx.fillRect(x, y, gaugeW * speedRatio, gaugeH);

    ctx.strokeStyle = '#888';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, gaugeW, gaugeH);
  }

  private renderPositions(
    ctx: CanvasRenderingContext2D,
    state: RacingState,
    W: number,
  ): void {
    const x = W - 140;
    const startY = 60;

    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(x - 8, startY - 4, 136, state.positions.length * 22 + 8);

    ctx.font = '12px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    state.positions.forEach((car, i) => {
      const y = startY + i * 22;

      ctx.fillStyle = car.isPlayer ? PLAYER_COLOR : car.color;
      ctx.fillRect(x, y + 2, 10, 10);
      ctx.fillStyle = car.isPlayer ? '#fff' : '#ccc';
      ctx.fillText(`${i + 1}. ${car.name}`, x + 16, y);
    });
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

  private renderFinished(
    ctx: CanvasRenderingContext2D,
    state: RacingState,
    W: number,
    H: number,
  ): void {
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, W, H);

    const pos = this.getPlayerPosition(state);
    const cx = W / 2;
    let y = H / 2 - 80;

    ctx.font = 'bold 48px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = pos === 1 ? '#ffd700' : '#fff';
    ctx.fillText('RACE COMPLETE', cx, y);

    y += 60;
    ctx.font = 'bold 36px monospace';
    ctx.fillStyle = pos === 1 ? '#ffd700' : pos === 2 ? '#c0c0c0' : '#cd7f32';
    ctx.fillText(`You finished ${this.ordinal(pos)}!`, cx, y);

    y += 50;
    ctx.font = '20px monospace';
    ctx.fillStyle = '#ccc';
    const t = state.player.finishTime;
    const mins = Math.floor(t / 60);
    const secs = Math.floor(t % 60);
    const ms = Math.floor((t % 1) * 100);
    ctx.fillText(
      `Time: ${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`,
      cx,
      y,
    );

    y += 50;
    ctx.font = '16px monospace';
    ctx.fillStyle = '#888';
    ctx.fillText('Press [Space] or [R] to restart', cx, y);
    ctx.fillText('Press [ESC] to exit', cx, y + 24);
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

  private getPlayerPosition(state: RacingState): number {
    const idx = state.positions.indexOf(state.player);
    return idx >= 0 ? idx + 1 : state.positions.length;
  }

  private ordinal(n: number): string {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  }
}
```

**What's happening:**
- `renderPositions()` draws a live leaderboard on the right side of the screen. Each car gets a colored square and its name, listed in order from the `state.positions` array.
- The top bar now shows the player's ordinal position (1st, 2nd, 3rd, 4th) on the right side, color-coded: gold for 1st, silver for 2nd, bronze for 3rd/4th.
- `renderFinished()` creates a dark overlay showing "RACE COMPLETE", the player's finishing position, their total time, and restart instructions.
- `ordinal()` converts a number to its ordinal string using a compact suffix lookup table.

---

## Test It

1. **Run:** `npm run dev`
2. **Drive around the track** and watch the HUD:
   - The **lap counter** increments from "Lap 1/3" to "Lap 2/3" to "Lap 3/3" as you cross the start line
   - The **race timer** counts upward in `MM:SS.ms` format
   - Your **position** shows as "1st" (since there are no AI cars yet)
3. **Complete 3 full laps** by driving the entire circuit three times:
   - After crossing the start line for the third time, the **finish screen** appears
   - It shows "RACE COMPLETE", your position, and your total time
4. **Press Space or R** to restart the race
5. **Try driving backward** across the start line -- notice that the lap does NOT count because you have not passed the intermediate checkpoints in order

---

## Challenges

**Easy:**
- Change `TOTAL_LAPS` from 3 to 5 and race a longer event.
- Change the position colors to different shades.

**Medium:**
- Add a "best lap time" tracker that records the fastest individual lap and displays it in the HUD. Store the timestamp when each lap starts and compute the difference.

**Hard:**
- Add checkpoint gate visuals: draw a thin line perpendicular to the track at each waypoint position. Color it green when crossed and grey when upcoming. This gives visual feedback of progress around the circuit.

---

## What You Learned

- Implementing sequential checkpoint validation to prevent lap-count cheating
- Using distance-based triggers for checkpoint crossing detection
- Sorting cars by multiple criteria (laps, checkpoints, distance) for live position tracking
- Building a race completion screen with finish time and restart flow
- Displaying live position and lap information in the HUD

**Next:** AI Opponents -- add computer-controlled cars that follow the racing line and compete against you!
