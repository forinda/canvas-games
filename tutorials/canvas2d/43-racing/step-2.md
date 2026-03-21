# Step 2: Car Rendering & Controls

**Goal:** Draw a car on the track and make it respond to keyboard input for steering, acceleration, and braking.

**Time:** ~15 minutes

---

## What You'll Build

- **Car renderer** that draws a colored rectangle with windshield, headlights, taillights, and a name label
- **Input system** that tracks arrow key / WASD state for up, down, left, and right
- **Basic movement** -- the car accelerates forward, brakes, and steers
- **Camera follow** so the viewport tracks the player car smoothly

---

## Concepts

- **Rotate-Then-Draw Pattern**: To draw a car at an angle, we `ctx.translate()` to the car's position, `ctx.rotate()` to its angle, then draw the body centered at the origin. The canvas transform handles all the trigonometry for us.
- **Input Polling vs. Events**: We store key states (`up`, `down`, `left`, `right`) in a plain object updated by `keydown`/`keyup` events. The physics update reads these states every frame -- this is the polling pattern that gives smooth, responsive controls.
- **Speed-Dependent Steering**: Steering sensitivity decreases at high speed using a linear interpolation factor. This prevents unrealistic instant turns at full throttle and encourages the player to brake before corners.
- **Camera Lerp**: The camera does not snap to the player; instead it smoothly interpolates toward the player position each frame (`lerp = 0.1`). This creates a natural, cinematic feel.

---

## Code

### 1. Create the Car Renderer

**File:** `src/contexts/canvas2d/games/racing/renderers/CarRenderer.ts`

Draws each car as a colored rectangle with visual details, plus skid marks underneath.

```typescript
import type { RacingState, Car } from '../types';
import { CAR_LENGTH, CAR_WIDTH } from '../types';

export class CarRenderer {
  render(ctx: CanvasRenderingContext2D, state: RacingState): void {
    const { cameraX, cameraY, canvasW, canvasH } = state;

    ctx.save();
    ctx.translate(-cameraX + canvasW / 2, -cameraY + canvasH / 2);

    // Draw skid marks first (under cars)
    const allCars = [state.player, ...state.aiCars];

    for (const car of allCars) {
      this.renderSkidMarks(ctx, car);
    }

    // Draw AI cars
    for (const car of state.aiCars) {
      this.renderCar(ctx, car);
    }

    // Draw player on top
    this.renderCar(ctx, state.player);

    ctx.restore();
  }

  private renderSkidMarks(ctx: CanvasRenderingContext2D, car: Car): void {
    for (const mark of car.skidMarks) {
      ctx.fillStyle = `rgba(40,40,40,${mark.alpha})`;
      ctx.beginPath();
      ctx.arc(mark.x, mark.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private renderCar(ctx: CanvasRenderingContext2D, car: Car): void {
    ctx.save();
    ctx.translate(car.x, car.y);
    ctx.rotate(car.angle);

    // Car body
    ctx.fillStyle = car.color;
    ctx.fillRect(-CAR_LENGTH / 2, -CAR_WIDTH / 2, CAR_LENGTH, CAR_WIDTH);

    // Car windshield (front portion)
    ctx.fillStyle = 'rgba(150,220,255,0.6)';
    ctx.fillRect(CAR_LENGTH / 2 - 8, -CAR_WIDTH / 2 + 2, 6, CAR_WIDTH - 4);

    // Car outline
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-CAR_LENGTH / 2, -CAR_WIDTH / 2, CAR_LENGTH, CAR_WIDTH);

    // Headlights
    ctx.fillStyle = '#ffee88';
    ctx.fillRect(CAR_LENGTH / 2 - 2, -CAR_WIDTH / 2 + 1, 3, 3);
    ctx.fillRect(CAR_LENGTH / 2 - 2, CAR_WIDTH / 2 - 4, 3, 3);

    // Taillights
    ctx.fillStyle = '#ff3333';
    ctx.fillRect(-CAR_LENGTH / 2 - 1, -CAR_WIDTH / 2 + 1, 3, 3);
    ctx.fillRect(-CAR_LENGTH / 2 - 1, CAR_WIDTH / 2 - 4, 3, 3);

    ctx.restore();

    // Name label
    ctx.font = 'bold 10px monospace';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(car.name, car.x, car.y - CAR_WIDTH / 2 - 4);
  }
}
```

**What's happening:**
- `renderCar()` uses save/translate/rotate/restore to draw the car body at the correct world position and angle. The body is a `CAR_LENGTH x CAR_WIDTH` (30x16) rectangle centered on the origin.
- A semi-transparent blue rectangle at the front represents the windshield. Yellow squares at the front corners are headlights; red squares at the back are taillights. These tiny details make the car recognizable even at small sizes.
- Skid marks are drawn first (under all cars) as fading circles. They are populated by the physics system when the car drifts.
- The player car is drawn last so it always renders on top of AI cars.

---

### 2. Create the Input System

**File:** `src/contexts/canvas2d/games/racing/systems/InputSystem.ts`

Tracks which directional keys are currently held down.

```typescript
import type { RacingState } from '../types';

export interface RacingInput {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
}

export class InputSystem {
  readonly keys: RacingInput = {
    up: false,
    down: false,
    left: false,
    right: false,
  };

  private state: RacingState;
  private onExit: () => void;
  private onReset: () => void;

  private keyDownHandler: (e: KeyboardEvent) => void;
  private keyUpHandler: (e: KeyboardEvent) => void;

  constructor(
    state: RacingState,
    onExit: () => void,
    onReset: () => void,
  ) {
    this.state = state;
    this.onExit = onExit;
    this.onReset = onReset;

    this.keyDownHandler = (e: KeyboardEvent) => this.onKeyDown(e);
    this.keyUpHandler = (e: KeyboardEvent) => this.onKeyUp(e);
  }

  attach(): void {
    window.addEventListener('keydown', this.keyDownHandler);
    window.addEventListener('keyup', this.keyUpHandler);
  }

  detach(): void {
    window.removeEventListener('keydown', this.keyDownHandler);
    window.removeEventListener('keyup', this.keyUpHandler);
  }

  private mapKey(code: string): keyof RacingInput | null {
    switch (code) {
      case 'ArrowUp':
      case 'KeyW':
        return 'up';
      case 'ArrowDown':
      case 'KeyS':
        return 'down';
      case 'ArrowLeft':
      case 'KeyA':
        return 'left';
      case 'ArrowRight':
      case 'KeyD':
        return 'right';
      default:
        return null;
    }
  }

  private onKeyDown(e: KeyboardEvent): void {
    const mapped = this.mapKey(e.code);

    if (mapped) {
      e.preventDefault();
      this.keys[mapped] = true;
      return;
    }

    if (e.code === 'Escape') {
      e.preventDefault();
      this.onExit();
      return;
    }

    if (e.code === 'KeyP') {
      e.preventDefault();
      if (this.state.phase === 'racing') {
        this.state.paused = !this.state.paused;
      }
      return;
    }

    if (e.code === 'Space' || e.code === 'KeyR') {
      e.preventDefault();
      if (this.state.phase === 'finished') {
        this.onReset();
      }
      return;
    }
  }

  private onKeyUp(e: KeyboardEvent): void {
    const mapped = this.mapKey(e.code);

    if (mapped) {
      e.preventDefault();
      this.keys[mapped] = false;
    }
  }
}
```

**What's happening:**
- `mapKey()` translates both arrow keys and WASD to a unified `RacingInput` interface. This gives the player two control schemes for free.
- `keydown` sets the flag to `true`; `keyup` sets it to `false`. The physics system reads these booleans each frame, so holding a key produces continuous acceleration.
- Pause (`P`), exit (`Escape`), and reset (`Space`/`R` when finished) are handled as one-shot actions inside `onKeyDown`.
- `attach()`/`detach()` cleanly add and remove listeners so the game does not leak event handlers when destroyed.

---

### 3. Create Basic Physics

**File:** `src/contexts/canvas2d/games/racing/systems/PhysicsSystem.ts`

Applies acceleration, braking, steering, and basic friction to the player car.

```typescript
import type { RacingState, Car } from '../types';
import {
  MAX_SPEED,
  ACCELERATION,
  BRAKE_FORCE,
  FRICTION,
  STEER_SPEED,
  MIN_STEER_SPEED_FACTOR,
  DRIFT_FACTOR,
  SKID_MARK_MAX,
} from '../types';
import type { RacingInput } from './InputSystem';

export class PhysicsSystem {
  private input: RacingInput;

  constructor(input: RacingInput) {
    this.input = input;
  }

  update(state: RacingState, dt: number): void {
    if (state.phase !== 'racing' || state.paused) return;

    this.updateCar(state.player, dt, true);
  }

  updateCar(car: Car, dt: number, useInput: boolean): void {
    const secs = dt / 1000;

    if (useInput) {
      // Acceleration / braking
      if (this.input.up) {
        car.speed += ACCELERATION * secs;
      } else if (this.input.down) {
        car.speed -= BRAKE_FORCE * secs;
      } else {
        // Natural friction
        car.speed -= FRICTION * secs;
      }

      // Steering (less effective at high speed)
      const speedRatio = Math.abs(car.speed) / MAX_SPEED;
      const steerFactor = 1 - speedRatio * (1 - MIN_STEER_SPEED_FACTOR);
      const steer = STEER_SPEED * steerFactor * secs;

      if (this.input.left) car.angle -= steer;
      if (this.input.right) car.angle += steer;

      // Drift: at high speed + turning, add skid marks
      if (
        Math.abs(car.speed) > MAX_SPEED * 0.5 &&
        (this.input.left || this.input.right)
      ) {
        car.speed *= Math.pow(DRIFT_FACTOR, secs * 60);
        car.skidMarks.push({ x: car.x, y: car.y, alpha: 0.6 });

        if (car.skidMarks.length > SKID_MARK_MAX) {
          car.skidMarks.shift();
        }
      }
    }

    // Clamp speed
    car.speed = Math.max(-MAX_SPEED * 0.3, Math.min(MAX_SPEED, car.speed));

    if (Math.abs(car.speed) < 2) car.speed = 0;

    // Move
    car.x += Math.cos(car.angle) * car.speed * secs;
    car.y += Math.sin(car.angle) * car.speed * secs;

    // Fade skid marks
    for (let i = car.skidMarks.length - 1; i >= 0; i--) {
      car.skidMarks[i].alpha -= secs * 0.3;

      if (car.skidMarks[i].alpha <= 0) {
        car.skidMarks.splice(i, 1);
      }
    }
  }
}
```

**What's happening:**
- When `up` is held, speed increases by `ACCELERATION * dt`. When `down` is held, speed decreases by `BRAKE_FORCE * dt` (braking is stronger than accelerating, as in real cars). When neither is held, `FRICTION` naturally slows the car.
- Steering rotates the car's angle by `STEER_SPEED * steerFactor * dt`. The `steerFactor` linearly interpolates from 1.0 (full steering at zero speed) down to `MIN_STEER_SPEED_FACTOR` (0.3) at max speed. This makes high-speed turns feel heavy.
- Drift detection: if the car is above 50% max speed and the player is turning, the `DRIFT_FACTOR` (0.92) exponentially reduces speed while depositing a skid mark at the current position.
- Speed is clamped to `[-MAX_SPEED*0.3, MAX_SPEED]` so reversing is slower than going forward. Below 2 px/s, speed snaps to zero to prevent creep.

---

### 4. Update the Engine

**File:** `src/contexts/canvas2d/games/racing/RacingEngine.ts`

Add the input system, physics system, car renderer, camera follow, and a delta-time game loop.

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
    const dt = Math.min(now - this.lastTime, 50); // cap at 50ms

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
- The game loop now computes `dt` (delta time in milliseconds) and caps it at 50ms to prevent physics explosions if the tab loses focus.
- `update()` handles the countdown phase first (decrementing the timer), then switches to the racing phase where physics runs and the camera follows.
- `updateCamera()` uses linear interpolation (`lerp = 0.1`) to smoothly chase the player. Each frame, the camera moves 10% of the distance toward the player's position.
- The render pipeline now draws the track first, then the car on top. The camera transform in both renderers keeps everything aligned.

---

## Test It

1. **Run:** `npm run dev`
2. **Open:** the Racing game in your browser
3. **Wait** for the 3-second countdown to finish (the car cannot move during countdown)
4. **Press Up/W** to accelerate -- the red car moves forward and the camera follows
5. **Press Left/A or Right/D** to steer -- the car rotates and curves
6. **Press Down/S** to brake -- the car slows down quickly
7. **Drive at high speed and turn** -- notice the car slows slightly (drift) and dark skid marks appear on the road
8. **Release all keys** and watch friction gradually bring the car to a stop
9. **Press P** to pause and unpause

---

## Challenges

**Easy:**
- Change `PLAYER_COLOR` to a different color and see your car change.
- Increase `CAR_LENGTH` and `CAR_WIDTH` to make a larger car and see how it feels.

**Medium:**
- Add a rear-view indicator: draw a small triangle behind the car pointing backward so you can tell which end is the front at a glance.

**Hard:**
- Implement a "turbo boost" that activates on `Shift` key, temporarily doubling `MAX_SPEED` for 2 seconds with a 5-second cooldown. Show a cooldown bar in the corner.

---

## What You Learned

- Drawing a rotated sprite using translate/rotate/restore on the canvas context
- Building a polling-based input system with keydown/keyup state tracking
- Implementing basic vehicle physics: acceleration, braking, friction, and speed-dependent steering
- Creating a smooth camera follow using linear interpolation
- Structuring the game loop with delta-time for frame-rate-independent physics

**Next:** Vehicle Physics -- add friction, drift mechanics, and off-track slowdown for realistic driving feel!
