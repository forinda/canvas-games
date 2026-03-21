# Step 6: AI Opponents

**Goal:** Add three computer-controlled cars that follow the racing line, compete for position, and make the race feel alive.

**Time:** ~15 minutes

---

## What You'll Build

- **AI system** that steers each computer car toward sequential waypoints
- **Speed variation** so AI cars have different skill levels
- **Waypoint following** with random offsets for natural-looking racing lines
- **Sharp turn slowdown** so AI cars brake into corners realistically
- **Full race integration** with AI cars counted in positions, checkpoints, and lap completion

---

## Concepts

- **Waypoint Following**: Each AI car has a `waypointIndex` pointing to the next waypoint it is heading toward. When it gets close enough (`AI_WAYPOINT_RADIUS = 60`), it advances to the next waypoint. This creates a path-following behavior that naturally traces the track.
- **Angle Steering with Smoothing**: The AI computes the desired angle toward its target waypoint using `Math.atan2()`, then smoothly interpolates its current angle toward it using `angleDiff * AI_STEER_SMOOTHING * dt`. This prevents jerky instant turns and creates realistic steering.
- **Angle Normalization**: When computing the difference between two angles, we normalize to [-PI, PI] to avoid the car spinning the "long way around" when crossing the +/-PI boundary.
- **Speed Factor Variation**: Each AI car gets a random `speedFactor` between `AI_SPEED_FACTOR_MIN` (0.78) and `AI_SPEED_FACTOR_MAX` (0.92). This caps their top speed as a fraction of `MAX_SPEED`, creating naturally varied difficulty levels without complex behavior tuning.
- **Waypoint Offset Jitter**: Each AI car adds a random offset (`AI_VARIATION = 30` pixels) to each waypoint target. This prevents all AI cars from following the exact same line, making overtaking possible and the race visually interesting.

---

## Code

### 1. Create the AI System

**File:** `src/games/racing/systems/AISystem.ts`

Controls all AI car movement: waypoint following, steering, acceleration, and turn braking.

```typescript
import type { RacingState, Car } from '../types';
import {
  MAX_SPEED,
  ACCELERATION,
  FRICTION,
  AI_SPEED_FACTOR_MIN,
  AI_SPEED_FACTOR_MAX,
  AI_STEER_SMOOTHING,
  AI_WAYPOINT_RADIUS,
  AI_VARIATION,
  SKID_MARK_MAX,
} from '../types';

interface AIData {
  speedFactor: number;
  waypointOffsetX: number;
  waypointOffsetY: number;
}

export class AISystem {
  private aiData: Map<Car, AIData> = new Map();

  initCar(car: Car): void {
    this.aiData.set(car, {
      speedFactor:
        AI_SPEED_FACTOR_MIN +
        Math.random() * (AI_SPEED_FACTOR_MAX - AI_SPEED_FACTOR_MIN),
      waypointOffsetX: (Math.random() - 0.5) * AI_VARIATION * 2,
      waypointOffsetY: (Math.random() - 0.5) * AI_VARIATION * 2,
    });
  }

  update(state: RacingState, dt: number): void {
    if (state.phase !== 'racing' || state.paused) return;

    const secs = dt / 1000;

    for (const car of state.aiCars) {
      if (car.finished) continue;

      this.updateAICar(car, state, secs);
    }
  }

  private updateAICar(car: Car, state: RacingState, secs: number): void {
    const data = this.aiData.get(car);

    if (!data) return;

    const wp = state.track.waypoints;
    const target = wp[car.waypointIndex % wp.length];
    const tx = target.x + data.waypointOffsetX;
    const ty = target.y + data.waypointOffsetY;

    // Distance to target waypoint
    const dx = tx - car.x;
    const dy = ty - car.y;
    const dist = Math.hypot(dx, dy);

    // If close enough, advance to next waypoint
    if (dist < AI_WAYPOINT_RADIUS) {
      car.waypointIndex = (car.waypointIndex + 1) % wp.length;
      // Randomize offset for next waypoint
      data.waypointOffsetX = (Math.random() - 0.5) * AI_VARIATION * 2;
      data.waypointOffsetY = (Math.random() - 0.5) * AI_VARIATION * 2;
    }

    // Steer toward target
    const desiredAngle = Math.atan2(dy, dx);
    let angleDiff = desiredAngle - car.angle;

    // Normalize angle diff to [-PI, PI]
    while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
    while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

    car.angle += angleDiff * AI_STEER_SMOOTHING * secs;

    // Accelerate (but limited by speed factor)
    const maxAISpeed = MAX_SPEED * data.speedFactor;

    if (car.speed < maxAISpeed) {
      car.speed += ACCELERATION * secs * 0.8;
    } else {
      car.speed -= FRICTION * secs;
    }

    // Slow down on sharp turns
    if (Math.abs(angleDiff) > 0.5) {
      car.speed *= Math.pow(0.95, secs * 60);
    }

    // Clamp
    car.speed = Math.max(0, Math.min(maxAISpeed, car.speed));

    // Move
    car.x += Math.cos(car.angle) * car.speed * secs;
    car.y += Math.sin(car.angle) * car.speed * secs;

    // Skid marks on sharp turns at speed
    if (Math.abs(angleDiff) > 0.4 && car.speed > maxAISpeed * 0.5) {
      car.skidMarks.push({ x: car.x, y: car.y, alpha: 0.4 });

      if (car.skidMarks.length > SKID_MARK_MAX) car.skidMarks.shift();
    }

    // Fade skid marks
    for (let i = car.skidMarks.length - 1; i >= 0; i--) {
      car.skidMarks[i].alpha -= secs * 0.3;

      if (car.skidMarks[i].alpha <= 0) car.skidMarks.splice(i, 1);
    }
  }
}
```

**What's happening:**
- `initCar()` assigns each AI car a random `speedFactor` between 0.78 and 0.92, plus an initial waypoint offset. This is called once per car at game start and on reset.
- `updateAICar()` runs every frame for each non-finished AI car. It computes the vector to the current target waypoint (with jitter offset), determines the desired angle, and smoothly steers toward it.
- Angle normalization (`while (angleDiff > PI) angleDiff -= 2*PI`) ensures the car always turns the shorter direction. Without this, crossing the PI/-PI boundary would cause the car to spin 360 degrees.
- Acceleration is throttled at 80% of the player's rate (`ACCELERATION * 0.8`), and the speed cap is further reduced by `speedFactor`. Combined, this means AI cars are consistently slightly slower than a skilled player.
- Sharp turn detection (`angleDiff > 0.5 radians`, about 29 degrees) triggers exponential speed decay (`0.95^(dt*60)`), simulating brake-into-corner behavior. This prevents AI cars from flying off the track at corners.
- AI cars also produce skid marks on tight turns, making them visually consistent with the player car.

---

### 2. Update the Engine with AI Cars

**File:** `src/games/racing/RacingEngine.ts`

Add AI car creation, AI system initialization, and AI updates to the engine.

```typescript
import type { RacingState, Car } from './types';
import {
  TOTAL_LAPS,
  COUNTDOWN_SECONDS,
  PLAYER_COLOR,
  AI_COLORS,
  AI_NAMES,
} from './types';
import { defaultTrack } from './data/tracks';
import { InputSystem } from './systems/InputSystem';
import { PhysicsSystem } from './systems/PhysicsSystem';
import { TrackSystem } from './systems/TrackSystem';
import { AISystem } from './systems/AISystem';
import { TrackRenderer } from './renderers/TrackRenderer';
import { CarRenderer } from './renderers/CarRenderer';
import { HUDRenderer } from './renderers/HUDRenderer';

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
  private aiSystem: AISystem;

  // Renderers
  private trackRenderer: TrackRenderer;
  private carRenderer: CarRenderer;
  private hudRenderer: HUDRenderer;

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
    this.aiSystem = new AISystem();

    // Init AI data
    for (const car of this.state.aiCars) {
      this.aiSystem.initCar(car);
    }

    // Renderers
    this.trackRenderer = new TrackRenderer();
    this.carRenderer = new CarRenderer();
    this.hudRenderer = new HUDRenderer();

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
      this.aiSystem.update(this.state, dt);
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
    this.hudRenderer.render(ctx, this.state);
  }

  private reset(): void {
    const newState = this.createInitialState();
    Object.assign(this.state, newState);

    // Reinitialize AI data
    for (const car of this.state.aiCars) {
      this.aiSystem.initCar(car);
    }
  }

  private createInitialState(): RacingState {
    const track = defaultTrack;
    const startWP = track.waypoints[0];
    const nextWP = track.waypoints[1];
    const startAngle = Math.atan2(nextWP.y - startWP.y, nextWP.x - startWP.x);

    // Player starts at first waypoint
    const player = this.createCar(
      startWP.x,
      startWP.y,
      startAngle,
      true,
      PLAYER_COLOR,
      'You',
      1,
    );

    // AI cars staggered behind player
    const dx = Math.cos(startAngle);
    const dy = Math.sin(startAngle);
    // Normal to track direction for side offset
    const nx = -dy;
    const ny = dx;

    const aiCars: Car[] = AI_COLORS.map((color, i) => {
      const backOffset = (i + 1) * 40;
      const sideOffset = (i % 2 === 0 ? 1 : -1) * 20;

      return this.createCar(
        startWP.x - dx * backOffset + nx * sideOffset,
        startWP.y - dy * backOffset + ny * sideOffset,
        startAngle,
        false,
        color,
        AI_NAMES[i],
        1,
      );
    });

    return {
      player,
      aiCars,
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
      positions: [player, ...aiCars],
    };
  }

  private createCar(
    x: number,
    y: number,
    angle: number,
    isPlayer: boolean,
    color: string,
    name: string,
    waypointIndex: number,
  ): Car {
    return {
      x,
      y,
      angle,
      speed: 0,
      acceleration: 0,
      isPlayer,
      color,
      name,
      waypointIndex,
      laps: 0,
      lastCheckpoint: 0,
      finished: false,
      finishTime: 0,
      skidMarks: [],
    };
  }
}
```

**What's happening:**
- `createInitialState()` now creates 3 AI cars from `AI_COLORS` and `AI_NAMES`. They are staggered behind the player using the track direction vector (`dx`, `dy`) for back offset and the normal vector (`nx`, `ny`) for side offset. This creates a realistic starting grid.
- Each AI car is initialized with `this.aiSystem.initCar(car)` which assigns its random speed factor and waypoint jitter.
- The update loop now calls `this.aiSystem.update()` between the physics and track system updates. This order means: (1) player moves, (2) AI cars move, (3) off-track penalties and checkpoint logic apply to everyone.
- `reset()` re-initializes AI data after rebuilding the state, so each restart gets fresh random speed factors.
- `createCar()` is extracted as a helper to avoid duplicating the Car object literal for the player and each AI car.

---

## Test It

1. **Run:** `npm run dev`
2. **Observe the starting grid:** Your red car is in front, with Blue, Orange, and Purple cars staggered behind you
3. **Wait for the countdown** and then race:
   - AI cars **accelerate and follow the track** automatically
   - They **steer smoothly** around curves, slowing down for sharp turns
   - They leave **skid marks** on tight corners
4. **Check the position list** on the right side of the screen:
   - Positions update in real time as cars pass each other
   - Your position in the top-right changes between 1st through 4th
5. **Complete 3 laps** and see your final position:
   - AI cars may finish before or after you depending on how well you drive
   - The finish screen shows your position and time
6. **Restart** with Space/R and notice AI cars have **different speeds** each time (random speed factors)
7. **Watch the AI racing lines** -- they do not all follow the exact same path due to waypoint offset jitter

---

## Challenges

**Easy:**
- Add a 4th AI car by extending `AI_COLORS` and `AI_NAMES` with another entry.
- Change `AI_SPEED_FACTOR_MAX` to 0.98 to make the fastest AI car nearly match player speed.

**Medium:**
- Implement "rubber banding": when an AI car is far behind the leader, increase its speed factor temporarily. When it is in 1st place, decrease it. This keeps races close and exciting.

**Hard:**
- Add AI overtaking awareness: when an AI car detects another car directly ahead (within 60px and within 30 degrees of its heading), have it steer slightly to one side to attempt an overtake rather than slowing down behind.

---

## What You Learned

- Implementing waypoint-following AI with smooth angle interpolation
- Using angle normalization to prevent spinning artifacts at the PI/-PI boundary
- Creating varied AI difficulty through random speed factors
- Adding waypoint jitter for natural-looking racing lines
- Staggering starting positions using direction and normal vectors
- Integrating AI cars into the existing checkpoint, lap, and position systems

**Next:** Mini-Map & Polish -- add a mini-map overlay showing all car positions, and polish the game with final visual touches!
