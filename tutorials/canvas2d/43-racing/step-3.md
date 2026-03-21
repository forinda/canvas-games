# Step 3: Vehicle Physics

**Goal:** Add realistic friction, drift mechanics, and off-track slowdown so driving feels weighty and punishing when you leave the road.

**Time:** ~15 minutes

---

## What You'll Build

- **Off-track detection** that checks whether the car is within the road width of any track segment
- **Off-track penalty** -- heavy friction and reduced max speed when driving on grass
- **Enhanced drift system** with exponential speed decay and visible skid mark trails
- **Point-to-segment distance** math for precise track boundary checking

---

## Concepts

- **Point-to-Segment Distance**: To test if a car is "on the road," we compute the shortest distance from the car's position to each line segment between consecutive waypoints. If any distance is less than half the road width, the car is on-track. The formula projects the point onto the segment and clamps the parameter `t` to [0, 1].
- **Off-Track Penalty**: Driving on grass applies extra friction (`OFF_TRACK_FRICTION = 200`, vs normal `FRICTION = 60`) and caps speed at `OFF_TRACK_MAX_SPEED = 120` (vs `MAX_SPEED = 320`). This rewards clean driving and punishes cutting corners.
- **Exponential Drift Decay**: When the car is turning at high speed, `car.speed *= DRIFT_FACTOR^(dt*60)`. This models tire grip loss -- the faster you go while turning, the more speed you bleed. The `^(dt*60)` normalizes to 60fps so drift feels the same at any frame rate.
- **Skid Mark Trail**: Each drift frame pushes a `{ x, y, alpha }` entry. Alpha fades over time and marks are removed when they become invisible. The `SKID_MARK_MAX = 200` cap prevents memory growth.

---

## Code

### 1. Create the Track System

**File:** `src/contexts/canvas2d/games/racing/systems/TrackSystem.ts`

Handles off-track detection and applies the grass slowdown penalty. Also prepares the checkpoint/lap structure used in Step 5.

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

  private pointToSegmentDist(
    px: number,
    py: number,
    ax: number,
    ay: number,
    bx: number,
    by: number,
  ): number {
    const abx = bx - ax;
    const aby = by - ay;
    const apx = px - ax;
    const apy = py - ay;
    const ab2 = abx * abx + aby * aby;

    if (ab2 === 0) return Math.hypot(apx, apy);

    let t = (apx * abx + apy * aby) / ab2;

    t = Math.max(0, Math.min(1, t));
    const cx = ax + t * abx;
    const cy = ay + t * aby;

    return Math.hypot(px - cx, py - cy);
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
- `isOnTrack()` loops through every segment (pair of consecutive waypoints, with the last wrapping to the first). For each segment it computes the shortest distance from the car to the line. If any distance is under `roadWidth / 2`, the car is on the road.
- `pointToSegmentDist()` projects point P onto segment AB. The parameter `t = dot(AP, AB) / |AB|^2` is clamped to [0, 1] so the closest point stays within the segment endpoints. The distance is then `|P - closestPoint|`.
- When off-track, `OFF_TRACK_FRICTION` (200 px/s^2) applies -- more than 3x normal friction. Speed is also hard-capped at `OFF_TRACK_MAX_SPEED` (120 px/s), less than half the on-road maximum.
- `getClosestWaypoint()` is a utility that finds which waypoint the car is nearest to, useful for AI and checkpoint logic in later steps.

---

### 2. Update the Engine

**File:** `src/contexts/canvas2d/games/racing/RacingEngine.ts`

Add the TrackSystem to the update pipeline.

```typescript
import type { RacingState, Car } from './types';
import {
  TOTAL_LAPS,
  COUNTDOWN_SECONDS,
  PLAYER_COLOR,
} from './types';
import { defaultTrack } from './data/tracks';
import { InputSystem } from './systems/InputSystem';
import { PhysicsSystem } from './systems/PhysicsSystem';
import { TrackSystem } from './systems/TrackSystem';
import { TrackRenderer } from './renderers/TrackRenderer';
import { CarRenderer } from './renderers/CarRenderer';

export class RacingEngine {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private state: RacingState;
  private running = false;
  private rafId = 0;
  private lastTime = 0;

  // Systems
  private inputSystem: InputSystem;
  private physicsSystem: PhysicsSystem;
  private trackSystem: TrackSystem;

  // Renderers
  private trackRenderer: TrackRenderer;
  private carRenderer: CarRenderer;

  private resizeHandler: () => void;

  constructor(canvas: HTMLCanvasElement, onExit?: () => void) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    this.state = this.createInitialState();

    // Systems
    this.inputSystem = new InputSystem(
      this.state,
      onExit ?? (() => {}),
      () => this.reset(),
    );
    this.physicsSystem = new PhysicsSystem(this.inputSystem.keys);
    this.trackSystem = new TrackSystem();

    // Renderers
    this.trackRenderer = new TrackRenderer();
    this.carRenderer = new CarRenderer();

    // Resize
    this.resizeHandler = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      this.state.canvasW = canvas.width;
      this.state.canvasH = canvas.height;
    };

    this.inputSystem.attach();
    window.addEventListener('resize', this.resizeHandler);
  }

  start(): void {
    this.running = true;
    this.lastTime = performance.now();
    this.loop();
  }

  destroy(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
    this.inputSystem.detach();
    window.removeEventListener('resize', this.resizeHandler);
  }

  private loop(): void {
    if (!this.running) return;

    const now = performance.now();
    const dt = Math.min(now - this.lastTime, 50);

    this.lastTime = now;

    this.update(dt);
    this.render();

    this.rafId = requestAnimationFrame(() => this.loop());
  }

  private update(dt: number): void {
    if (this.state.paused) return;

    if (this.state.phase === 'countdown') {
      this.state.countdownTimer -= dt / 1000;

      if (this.state.countdownTimer <= 0) {
        this.state.phase = 'racing';
        this.state.countdownTimer = 0;
      }

      return;
    }

    if (this.state.phase === 'racing') {
      this.state.raceTime += dt / 1000;
      this.physicsSystem.update(this.state, dt);
      this.trackSystem.update(this.state, dt);
      this.updateCamera();
    }
  }

  private updateCamera(): void {
    const targetX = this.state.player.x;
    const targetY = this.state.player.y;
    const lerp = 0.1;

    this.state.cameraX += (targetX - this.state.cameraX) * lerp;
    this.state.cameraY += (targetY - this.state.cameraY) * lerp;
  }

  private render(): void {
    const ctx = this.ctx;

    ctx.clearRect(0, 0, this.state.canvasW, this.state.canvasH);

    this.trackRenderer.render(ctx, this.state);
    this.carRenderer.render(ctx, this.state);
  }

  private reset(): void {
    const newState = this.createInitialState();
    Object.assign(this.state, newState);
  }

  private createInitialState(): RacingState {
    const track = defaultTrack;
    const startWP = track.waypoints[0];
    const nextWP = track.waypoints[1];
    const startAngle = Math.atan2(nextWP.y - startWP.y, nextWP.x - startWP.x);

    const player: Car = {
      x: startWP.x,
      y: startWP.y,
      angle: startAngle,
      speed: 0,
      acceleration: 0,
      isPlayer: true,
      color: PLAYER_COLOR,
      name: 'You',
      waypointIndex: 1,
      laps: 0,
      lastCheckpoint: 0,
      finished: false,
      finishTime: 0,
      skidMarks: [],
    };

    return {
      player,
      aiCars: [],
      track,
      phase: 'countdown',
      countdownTimer: COUNTDOWN_SECONDS,
      raceTime: 0,
      totalLaps: TOTAL_LAPS,
      canvasW: this.canvas.width,
      canvasH: this.canvas.height,
      cameraX: startWP.x,
      cameraY: startWP.y,
      paused: false,
      positions: [player],
    };
  }
}
```

**What's happening:**
- The only change from Step 2 is adding `this.trackSystem = new TrackSystem()` and calling `this.trackSystem.update(this.state, dt)` after the physics update.
- The order matters: physics moves the car first, then the track system checks whether the new position is on or off the road and applies penalties.

---

## Test It

1. **Run:** `npm run dev`
2. **Accelerate** along the track -- the car reaches full speed (~320 px/s) on the road
3. **Drive off the road** onto the green grass:
   - You will feel the car **slow down dramatically** as `OFF_TRACK_FRICTION` kicks in
   - Your speed caps at **120 px/s** even with the gas held down
4. **Return to the road** and accelerate again -- you quickly recover to full speed
5. **Take a fast corner while turning** -- notice the drift:
   - Speed bleeds off exponentially
   - Dark **skid marks** appear on the road behind you
   - The marks **fade away** after a few seconds
6. **Try cutting a corner** across the grass -- the penalty makes it slower than staying on the road

---

## Challenges

**Easy:**
- Change `OFF_TRACK_MAX_SPEED` to 60 and `OFF_TRACK_FRICTION` to 400 to make grass feel like deep mud.
- Change `DRIFT_FACTOR` to 0.80 for more aggressive drift speed loss.

**Medium:**
- Add a visual indicator when the car is off-track: tint the screen edges red or flash a "OFF TRACK" warning text.

**Hard:**
- Implement a "rumble strip" zone at the road edges (between 80% and 100% of road width from center). In this zone, apply half the off-track friction and draw alternating red/white curb markers.

---

## What You Learned

- Computing point-to-line-segment distance for collision detection
- Using the distance to determine if a car is within the road boundaries
- Applying different friction and speed cap values based on terrain
- Implementing exponential speed decay for drift mechanics
- Managing a trail of fading visual effects (skid marks) with alpha decay

**Next:** Track Boundaries & Collision -- add wall collisions that bounce the car back onto the road!
