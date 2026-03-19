# Delta Time

## What Is It?

Delta time (dt) is the elapsed time between the current frame and the previous frame, usually measured in seconds. Multiplying movement and animations by dt makes your game run at the same speed regardless of frame rate. Without it, your game speeds up on fast computers and slows down on slow ones.

The problem is simple: if your game loop runs at 60 FPS, each frame takes about 16.7ms. If you move an object 5 pixels per frame, it moves 300 pixels per second. But if the frame rate drops to 30 FPS, each frame takes 33.3ms, and the object moves only 150 pixels per second -- half speed. Players on slower hardware experience a different game. With delta time, you express movement as "300 pixels per second" and multiply by dt each frame: `position += speed * dt`. At 60 FPS, that is `300 * 0.0167 = 5 pixels`. At 30 FPS, that is `300 * 0.0333 = 10 pixels`. Different per-frame increments, same real-world speed.

Think of it like driving. Your speedometer says 60 mph. If you check your position every second, you have moved 1/60th of a mile. If you check every half-second, you have moved 1/120th of a mile. The speed is constant -- the distance per check varies with the check interval. Delta time is that check interval.

## The Algorithm

```
previousTime = now()

function gameLoop():
  currentTime = now()
  dt = (currentTime - previousTime) / 1000   // convert ms to seconds
  previousTime = currentTime

  // Clamp dt to prevent spiral of death
  dt = min(dt, 0.1)  // max 100ms per frame

  update(dt)
  render()
  requestAnimationFrame(gameLoop)

function update(dt):
  // WRONG: position.x += 5           (frame-dependent)
  // RIGHT: position.x += speed * dt  (frame-independent)
  player.x += player.vx * dt
  player.y += player.vy * dt
```

### With vs Without dt Comparison

```
WITHOUT delta time (frame-dependent):
  speed = 5 pixels/frame

  60 FPS:  5 px/frame * 60 frames/sec = 300 px/sec
  30 FPS:  5 px/frame * 30 frames/sec = 150 px/sec  <-- HALF SPEED!
  120 FPS: 5 px/frame * 120 frames/sec = 600 px/sec <-- DOUBLE SPEED!

  Frame 1     Frame 2     Frame 3
  |--5px--|--5px--|--5px--|
  Same distance per frame, but different real-world speed.


WITH delta time (frame-independent):
  speed = 300 pixels/second

  60 FPS:  dt = 0.0167s,  300 * 0.0167 = 5.0 px/frame,  300 px/sec
  30 FPS:  dt = 0.0333s,  300 * 0.0333 = 10.0 px/frame, 300 px/sec  <-- SAME!
  120 FPS: dt = 0.0083s,  300 * 0.0083 = 2.5 px/frame,  300 px/sec  <-- SAME!

  60 FPS frames:   |--5px--|--5px--|--5px--|--5px--|--5px--|--5px--|
  30 FPS frames:   |----10px----|----10px----|----10px----|
  Total after 0.1s: 30px                      30px
  Same real-world distance!


VISUAL COMPARISON over 1 second:

  Without dt at 60 FPS:  Player at x=300
  Without dt at 30 FPS:  Player at x=150  <-- unfair!

  With dt at 60 FPS:     Player at x=300
  With dt at 30 FPS:     Player at x=300  <-- fair!
```

## Code Example

```typescript
interface Entity {
  x: number;
  y: number;
  vx: number; // pixels per second
  vy: number; // pixels per second
}

class GameLoop {
  private previousTime = 0;
  private entities: Entity[] = [];

  start(): void {
    this.previousTime = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  }

  private loop(currentTime: number): void {
    let dt = (currentTime - this.previousTime) / 1000; // seconds
    this.previousTime = currentTime;

    // Clamp to prevent huge jumps after tab switch or lag spike
    dt = Math.min(dt, 0.1);

    this.update(dt);
    this.render();
    requestAnimationFrame((t) => this.loop(t));
  }

  private update(dt: number): void {
    for (const entity of this.entities) {
      entity.x += entity.vx * dt;
      entity.y += entity.vy * dt;

      // Gravity (acceleration: pixels per second squared)
      entity.vy += 980 * dt; // 980 px/s^2
    }
  }

  private render(): void {
    // Draw all entities at their current positions
  }
}

// --- Fixed timestep alternative (for physics) ---

class FixedTimestepLoop {
  private accumulator = 0;
  private readonly fixedDt = 1 / 60; // 60 Hz physics
  private previousTime = 0;

  private loop(currentTime: number): void {
    let frameDt = (currentTime - this.previousTime) / 1000;
    this.previousTime = currentTime;
    frameDt = Math.min(frameDt, 0.1);

    this.accumulator += frameDt;

    while (this.accumulator >= this.fixedDt) {
      this.physicsUpdate(this.fixedDt); // always same dt
      this.accumulator -= this.fixedDt;
    }

    const alpha = this.accumulator / this.fixedDt;
    this.render(alpha); // interpolate for smooth visuals

    requestAnimationFrame((t) => this.loop(t));
  }

  private physicsUpdate(dt: number): void { /* ... */ }
  private render(alpha: number): void { /* ... */ }
}
```

## Complexity

| Metric | Big O |
|--------|-------|
| Time   | O(1) -- one subtraction and one multiplication per value updated. |
| Space  | O(1) -- just store the previous timestamp. |

## Used In These Games

- **Every real-time game**: Any game that updates positions, timers, or animations over time should use delta time.
- **Physics simulations**: Gravity, velocity, acceleration all need dt to be frame-rate independent.
- **Animation systems**: Sprite animation frame timing, tweens, and easing functions all take dt as input.
- **Particle systems**: Particle lifetime, velocity decay, and spawn rates all depend on dt.

## Common Pitfalls

- **Not clamping dt**: If the user switches browser tabs, `requestAnimationFrame` pauses. When they return, dt can be several seconds, causing objects to teleport. Clamp dt to a maximum (e.g., 100ms).
- **Using dt for physics but not for timers**: If your countdown timer decrements by 1 each frame instead of by dt each frame, it runs faster at higher frame rates.
- **Inconsistent dt in physics**: Variable dt can cause non-deterministic physics. A ball might clip through a wall at low frame rates but not at high frame rates. Use a fixed timestep for physics (see the fixed timestep example above).
- **Confusing milliseconds and seconds**: `performance.now()` returns milliseconds. If you forget to divide by 1000, your dt is 16.7 instead of 0.0167, and everything moves 1000x too fast.
- **Multiplying dt twice**: If a function already accounts for dt internally, passing dt-scaled values to it doubles the effect.

## Further Reading

- [Fix Your Timestep! by Glenn Fiedler](https://gafferongames.com/post/fix_your_timestep/)
- [Game Programming Patterns: Game Loop](https://gameprogrammingpatterns.com/game-loop.html)
- [MDN: requestAnimationFrame](https://developer.mozilla.org/en-US/docs/Web/API/window/requestAnimationFrame)
