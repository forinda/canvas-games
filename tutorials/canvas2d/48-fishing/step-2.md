# Step 2: Casting Mechanic

**Goal:** Add a power gauge for cast distance and animate the line arc to the bobber landing point.

**Time:** ~15 minutes

---

## What You'll Build

- **Power meter** that oscillates while holding SPACE, with color feedback and a sweet-spot marker
- **Cast release** that computes bobber landing position based on power
- **Fishing line** drawn from rod tip to bobber
- **Bobber** with a bobbing animation on the water surface
- **Input system** handling keydown/keyup for the casting flow
- **HUD renderer** displaying phase-specific UI overlays

---

## Concepts

- **Oscillating Power Gauge**: The cast power increases linearly while SPACE is held, but wraps at 1.0 back toward 0. The displayed power is `power <= 1 ? power : 2 - power`, creating a ping-pong effect that requires timing skill.
- **Phase Transitions**: When SPACE is pressed in `idle` phase, the state transitions to `casting` with `castCharging = true`. Releasing SPACE sets `castCharging = false`, which the CastingSystem detects to compute the landing position and transition to `waiting`.
- **Coordinate Mapping**: Cast distance (0-1) maps to a screen x-position between 25% and 95% of the canvas width. Further casts also push the bobber slightly deeper (lower y), creating a visual sense of distance.
- **Input Decoupling**: The InputSystem only sets flags on state (`castCharging`, `hookSuccess`, `reelHolding`). The actual logic lives in dedicated systems that check those flags during `update()`. This keeps input handling simple and testable.

---

## Code

### 1. Create the Input System

**File:** `src/contexts/canvas2d/games/fishing/systems/InputSystem.ts`

Handles keyboard and mouse events, setting flags on state that other systems react to.

```typescript
import type { FishingState } from '../types';

export class InputSystem {
  private keydownHandler: (e: KeyboardEvent) => void;
  private keyupHandler: (e: KeyboardEvent) => void;
  private clickHandler: (e: MouseEvent) => void;
  private state: FishingState;
  private canvas: HTMLCanvasElement;
  private onExit: () => void;
  private onToggleCatalog: () => void;
  private onToggleHelp: () => void;

  constructor(
    state: FishingState,
    canvas: HTMLCanvasElement,
    onExit: () => void,
    onToggleCatalog: () => void,
    onToggleHelp: () => void,
  ) {
    this.state = state;
    this.canvas = canvas;
    this.onExit = onExit;
    this.onToggleCatalog = onToggleCatalog;
    this.onToggleHelp = onToggleHelp;
    this.keydownHandler = this.handleKeyDown.bind(this);
    this.keyupHandler = this.handleKeyUp.bind(this);
    this.clickHandler = this.handleClick.bind(this);
  }

  attach(): void {
    window.addEventListener('keydown', this.keydownHandler);
    window.addEventListener('keyup', this.keyupHandler);
    this.canvas.addEventListener('click', this.clickHandler);
  }

  detach(): void {
    window.removeEventListener('keydown', this.keydownHandler);
    window.removeEventListener('keyup', this.keyupHandler);
    this.canvas.removeEventListener('click', this.clickHandler);
  }

  private handleKeyDown(e: KeyboardEvent): void {
    const s = this.state;

    if (e.key === 'Escape') { this.onExit(); return; }
    if (e.key === 'h' || e.key === 'H') { this.onToggleHelp(); return; }
    if (e.key === 'c' || e.key === 'C') { this.onToggleCatalog(); return; }

    if (e.key === ' ') {
      e.preventDefault();

      if (s.phase === 'idle') {
        // Start charging cast
        s.phase = 'casting';
        s.castCharging = true;
        s.castPower = 0;
      } else if (s.phase === 'hooking') {
        // Hook the fish (used in Step 3)
        s.hookSuccess = true;
      } else if (s.phase === 'reeling') {
        // Reel in (used in Step 4)
        s.reelHolding = true;
      }
    }
  }

  private handleKeyUp(e: KeyboardEvent): void {
    const s = this.state;

    if (e.key === ' ') {
      e.preventDefault();

      if (s.phase === 'casting' && s.castCharging) {
        // Release cast
        s.castCharging = false;
      } else if (s.phase === 'reeling') {
        s.reelHolding = false;
      }
    }
  }

  private handleClick(_e: MouseEvent): void {
    const s = this.state;
    if (s.phase === 'hooking') {
      s.hookSuccess = true;
    }
  }
}
```

**What's happening:**
- The constructor binds three event handlers and stores references to state and callbacks. `attach()` and `detach()` allow clean setup/teardown.
- SPACE keydown in `idle` phase starts the cast by setting `phase = 'casting'` and `castCharging = true`. The CastingSystem will start oscillating the power meter.
- SPACE keyup during `casting` sets `castCharging = false`, signaling the CastingSystem to compute the landing point and transition to `waiting`.
- ESC, H, and C are handled as immediate actions (exit, help, catalog). The input system delegates these to callbacks rather than modifying state directly.

---

### 2. Create the Casting System

**File:** `src/contexts/canvas2d/games/fishing/systems/CastingSystem.ts`

Oscillates the power gauge while charging and computes the bobber landing point on release.

```typescript
import type { FishingState } from '../types';

export class CastingSystem {
  private readonly CHARGE_SPEED = 1.2; // full charge in ~0.83s

  update(state: FishingState, dt: number): void {
    if (state.phase !== 'casting') return;

    if (state.castCharging) {
      // Power oscillates 0 -> 1 -> 0 for skill-based casting
      state.castPower += this.CHARGE_SPEED * dt;
      if (state.castPower > 2) state.castPower -= 2;
    } else {
      // Cast released — compute landing point
      const power = state.castPower <= 1
        ? state.castPower
        : 2 - state.castPower;

      state.castDistance = Math.max(0.1, power);

      // Position bobber based on cast distance
      const waterStartX = state.width * 0.25;
      const waterEndX = state.width * 0.95;
      state.bobberX = waterStartX + state.castDistance * (waterEndX - waterStartX);
      state.bobberY = state.height * 0.45 + state.castDistance * state.height * 0.15;
      state.bobberBobTime = 0;

      // Transition to waiting
      state.phase = 'waiting';
      state.waitElapsed = 0;
      state.waitTimer = 2 + Math.random() * 6; // 2-8 seconds
      state.fishBiting = false;
    }
  }
}
```

**What's happening:**
- `castPower` increases by `CHARGE_SPEED * dt` each frame. At 1.2 per second, a full 0-to-1 charge takes about 0.83 seconds. When it passes 1.0, it wraps by subtracting 2, effectively creating a triangular wave (0 -> 1 -> 0 -> 1...).
- On release, the displayed power is `power <= 1 ? power : 2 - power`, folding the raw value back into the 0-1 range. This means releasing at the peak gives maximum distance.
- The bobber's x-position interpolates between 25% and 95% of canvas width based on `castDistance`. Its y-position is slightly below the waterline (45% of height), pushed deeper for longer casts to suggest the bobber landing further out.
- `waitTimer` is randomized between 2 and 8 seconds, creating suspense -- the player never knows exactly when a fish will bite.

---

### 3. Create the HUD Renderer

**File:** `src/contexts/canvas2d/games/fishing/renderers/HUDRenderer.ts`

Draws the power meter during casting and the idle prompt when waiting to cast.

```typescript
import type { FishingState } from '../types';

export class HUDRenderer {
  render(ctx: CanvasRenderingContext2D, state: FishingState): void {
    const W = state.width;
    const H = state.height;

    // ── Top-left stats ──
    this.drawStats(ctx, state);

    // ── Phase-specific UI ──
    switch (state.phase) {
      case 'idle':
        this.drawIdlePrompt(ctx, W, H);
        break;
      case 'casting':
        this.drawPowerMeter(ctx, state, W, H);
        break;
      case 'waiting':
        this.drawWaitingHint(ctx, state, W, H);
        break;
    }

    // ── Bottom hint ──
    ctx.font = '12px monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText('[H] Help  [C] Catalog  [ESC] Exit', W / 2, H - 8);
  }

  private drawStats(ctx: CanvasRenderingContext2D, state: FishingState): void {
    ctx.font = 'bold 16px monospace';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`Score: ${state.totalScore}`, 16, 16);
    ctx.font = '13px monospace';
    ctx.fillStyle = '#aaa';
    ctx.fillText(`Fish caught: ${state.totalCaught}`, 16, 38);
  }

  private drawIdlePrompt(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    ctx.font = 'bold 20px monospace';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Press SPACE to cast your line!', W / 2, H * 0.75);

    ctx.font = '14px monospace';
    ctx.fillStyle = '#aaa';
    ctx.fillText('Hold to charge, release to cast', W / 2, H * 0.75 + 28);
  }

  private drawPowerMeter(
    ctx: CanvasRenderingContext2D, state: FishingState, W: number, H: number
  ): void {
    const meterW = 300;
    const meterH = 24;
    const x = (W - meterW) / 2;
    const y = H * 0.75;

    // Label
    ctx.font = 'bold 16px monospace';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText('CAST POWER', W / 2, y - 8);

    // Background
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath();
    ctx.roundRect(x, y, meterW, meterH, 4);
    ctx.fill();

    // Power fill (oscillates)
    const displayPower = state.castPower <= 1
      ? state.castPower
      : 2 - state.castPower;
    const fillW = displayPower * meterW;

    // Color feedback: green -> orange -> red
    let color = '#4caf50';
    if (displayPower > 0.7) color = '#ff9800';
    if (displayPower > 0.9) color = '#f44336';

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(x, y, fillW, meterH, 4);
    ctx.fill();

    // Sweet spot indicator at 80%
    ctx.strokeStyle = '#ffd54f';
    ctx.lineWidth = 2;
    const sweetX = x + meterW * 0.8;
    ctx.beginPath();
    ctx.moveTo(sweetX, y - 4);
    ctx.lineTo(sweetX, y + meterH + 4);
    ctx.stroke();

    // Percentage text
    ctx.font = 'bold 13px monospace';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${Math.round(displayPower * 100)}%`, W / 2, y + meterH / 2);

    ctx.font = '12px monospace';
    ctx.fillStyle = '#aaa';
    ctx.textBaseline = 'top';
    ctx.fillText('Release SPACE to cast', W / 2, y + meterH + 8);
  }

  private drawWaitingHint(
    ctx: CanvasRenderingContext2D, state: FishingState, W: number, H: number
  ): void {
    const dots = '.'.repeat(Math.floor(state.waitElapsed * 2) % 4);
    ctx.font = '16px monospace';
    ctx.fillStyle = '#4fc3f7';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`Waiting for a bite${dots}`, W / 2, H * 0.75);
  }
}
```

**What's happening:**
- The HUD renderer uses a `switch` on `state.phase` to show contextually appropriate UI. Only the relevant overlay draws each frame.
- The power meter is a 300px wide rounded rectangle. The fill width is `displayPower * meterW`, and the fill color changes from green (safe) to orange (strong) to red (risky) as power increases.
- A golden vertical line at 80% marks the "sweet spot" -- the ideal release point for maximum cast distance without overshooting.
- The waiting hint uses an animated dots string (`...` cycling) to indicate the game is waiting for a fish bite, giving the player feedback that something is happening.

---

### 4. Update the Scene Renderer

**File:** `src/contexts/canvas2d/games/fishing/renderers/SceneRenderer.ts`

Add the fishing line and bobber drawing methods to the existing scene renderer.

```typescript
// Add these methods to the SceneRenderer class from Step 1.
// Also update the render() method to draw line and bobber when phase
// is 'waiting', 'hooking', 'reeling', or during cast animation.

// Inside render(), after this.drawDock(ctx, state), add:
//
//   if (state.phase === 'waiting' || state.phase === 'hooking' || state.phase === 'reeling') {
//     this.drawLine(ctx, state);
//     this.drawBobber(ctx, state);
//   }
//   if (state.phase === 'casting' && !state.castCharging) {
//     this.drawLine(ctx, state);
//     this.drawBobber(ctx, state);
//   }

// Add these private methods to SceneRenderer:

private drawLine(ctx: CanvasRenderingContext2D, state: FishingState): void {
  const dockW = state.width * 0.18;
  const dockY = state.height * 0.38;
  const rodTipX = dockW + 30;
  const rodTipY = dockY - 30;

  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(rodTipX, rodTipY);
  ctx.lineTo(state.bobberX, state.bobberY);
  ctx.stroke();
}

private drawBobber(ctx: CanvasRenderingContext2D, state: FishingState): void {
  const bob = Math.sin(state.bobberBobTime * 3) * 4;
  const x = state.bobberX;
  const y = state.bobberY + bob;

  // Bobber body (orange ellipse)
  ctx.fillStyle = '#ff5722';
  ctx.beginPath();
  ctx.ellipse(x, y, 6, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  // Bobber top (white cap)
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.ellipse(x, y - 8, 4, 4, 0, 0, Math.PI * 2);
  ctx.fill();
}
```

**What's happening:**
- The fishing line is a simple straight line from the rod tip (computed from the dock's dimensions) to the bobber's current position. The semi-transparent white color looks like monofilament fishing line against the water.
- The bobber oscillates vertically using `Math.sin(bobberBobTime * 3) * 4`, giving it a gentle 4-pixel bob at about 0.5 Hz -- realistic for a bobber resting on water.
- The bobber is two ellipses: an orange body and a white cap, mimicking a classic fishing float.
- Line and bobber only draw when the phase is `waiting`, `hooking`, `reeling`, or during the brief moment after cast release (phase is still `casting` but `castCharging` is false).

---

### 5. Update the Engine

**File:** `src/contexts/canvas2d/games/fishing/FishingEngine.ts`

Wire up the InputSystem, CastingSystem, and HUDRenderer.

```typescript
// Add to the constructor, after creating sceneRenderer:
this.inputSystem = new InputSystem(
  this.state,
  canvas,
  () => {}, // onExit placeholder
  () => { this.state.showCatalog = !this.state.showCatalog; },
  () => {}, // onToggleHelp placeholder
);
this.hudRenderer = new HUDRenderer();
this.castingSystem = new CastingSystem();
this.inputSystem.attach();

// Add to update(dt):
if (!this.state.paused && !this.state.showCatalog) {
  this.castingSystem.update(this.state, dt);
}
if (this.state.phase === 'waiting' || this.state.phase === 'hooking') {
  this.state.bobberBobTime += dt;
}

// Add to render(), after sceneRenderer:
this.hudRenderer.render(this.ctx, this.state);

// Add to destroy():
this.inputSystem.detach();
```

**What's happening:**
- The InputSystem is attached during construction and detached on destroy, ensuring no event listener leaks.
- The CastingSystem's `update()` runs every frame but returns early unless the phase is `casting`. This pattern lets us call all systems unconditionally.
- `bobberBobTime` accumulates during `waiting` and `hooking` phases so the bobber keeps bobbing even while waiting for a bite.
- The HUD renders after the scene so overlays appear on top of the water and dock.

---

## Test It

1. **Run:** `npm run dev`
2. **Open:** the Fishing game in your browser
3. **Observe:**
   - See the **"Press SPACE to cast your line!"** prompt at the bottom
   - **Hold SPACE** and watch the power meter oscillate green -> orange -> red
   - **Release SPACE** and see the fishing line appear, connecting the rod tip to a bobber on the water
   - The **bobber bobs** gently up and down on the water surface
   - The **"Waiting for a bite..."** text appears with animated dots
   - Try casting at different power levels -- low power lands the bobber close, high power sends it far right
   - The **score and fish count** display in the top-left corner

---

## Challenges

**Easy:**
- Change `CHARGE_SPEED` to 0.6 for an easier cast, or 2.0 for a very fast and tricky one.
- Move the sweet-spot indicator from 80% to 70% and see how it changes the ideal timing.

**Medium:**
- Add a cast arc animation: instead of the bobber appearing instantly, interpolate it from the rod tip to the landing point over 0.5 seconds using `lerp`.

**Hard:**
- Make the power meter non-linear: use `Math.pow(displayPower, 1.5)` for the cast distance so low power casts are very short but high power casts reach much further.

---

## What You Learned

- Building an oscillating power gauge with triangular-wave wrapping
- Mapping a 0-1 power value to screen coordinates for the bobber position
- Separating input handling (flag-setting) from game logic (systems reading flags)
- Drawing a phase-aware HUD that switches overlays based on game state
- Animating a bobber with sine-wave vertical oscillation

**Next:** Bite Detection & Hook -- add randomized fish spawning and a timed reaction window to hook the catch!
