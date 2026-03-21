# Mobile Touch Controls

## What Is It?

Touch controls are virtual on-screen buttons that replace keyboard/mouse input on mobile devices. Since phones and tablets have no physical keyboard, games need a way to accept directional input (move left/right/up/down) and action input (jump, shoot) through the touchscreen itself.

The `TouchControls` system in this project renders semi-transparent virtual buttons on the canvas and translates touch events into the same input state that keyboard handlers produce. This means game logic doesn't need to know whether the player is using a keyboard or touching the screen — it just reads the same input state.

## How It Works

```
Architecture:

  GameDefinition.touchLayout = "dpad" | "dpad-jump" | "dpad-action" | "dual-stick" | "flap" | "tap-only" | "none"
       │
       ▼
  TouchControls(canvas, layout, size?)
       │
       ├── buildZones()     → creates hit-test rectangles for each button
       ├── attach()         → adds touchstart/touchmove/touchend listeners
       ├── getState()       → returns { up, down, left, right, action, action2 }
       ├── render(ctx)      → draws buttons on the canvas
       └── detach()         → removes listeners on cleanup

  Integration flow:

  Engine constructor:
    this.touchControls = new TouchControls(canvas, "dpad");

  InputSystem.attach():
    this.touchControls.attach();    // starts listening for touch events

  Game loop (each frame):
    inputSystem.pollTouch();        // merge touch state into input
    physicsSystem.update(state);    // game logic uses merged input

  Render loop:
    gameRenderer.render(ctx);
    this.touchControls.render(ctx); // draw buttons on top of game

  Engine.destroy():
    this.touchControls.detach();    // clean up listeners
```

Touch layout selection:

```
Layout         Buttons                        Best For
─────────────  ───────────────────────────     ────────────────────────
dpad           ▲▼◄►                           Grid movement (Snake, Pac-Man, Frogger)
dpad-jump      ▲▼◄► + Jump                    Platformers (Doodle Jump, Lava Floor)
dpad-action    ▲▼◄► + Action + Alt            Shooters (Space Invaders, Asteroids)
dual-stick     ▲▼◄► + Fire                    Twin-stick (Top-Down Shooter, Zombies)
flap           Full-screen tap                 One-button (Flappy Bird, Helicopter)
tap-only       No virtual controls             Native touch works (Match-3, Balloon Pop)
none           Disabled                        Keyboard-only or custom touch handling
```

## Code Example

### 1. Basic Integration (Snake Pattern)

The Snake game is the reference implementation. Here's the pattern every game follows:

**Engine (creates and renders controls):**

```typescript
import { TouchControls } from "@shared/TouchControls";

export class SnakeEngine {
  private touchControls: TouchControls;

  constructor(canvas: HTMLCanvasElement) {
    // Create touch controls matching the game's input needs
    this.touchControls = new TouchControls(canvas, "dpad");

    // Pass to input system
    this.inputSystem = new InputSystem(state, this.touchControls);
  }

  private loop(): void {
    this.inputSystem.pollTouch(); // read touch state each frame
    this.update();
    this.render();
  }

  private render(): void {
    this.gameRenderer.render(this.ctx, this.state);
    this.touchControls.render(this.ctx); // draw on top of game
  }

  destroy(): void {
    this.inputSystem.detach(); // calls touchControls.detach() internally
  }
}
```

**InputSystem (reads touch state):**

```typescript
import type { TouchControls } from "@shared/TouchControls";

export class InputSystem {
  private touchControls: TouchControls | null;

  constructor(state: GameState, touchControls?: TouchControls) {
    this.touchControls = touchControls ?? null;
  }

  attach(): void {
    window.addEventListener("keydown", this.keyDownHandler);
    this.touchControls?.attach(); // start listening for touches
  }

  detach(): void {
    window.removeEventListener("keydown", this.keyDownHandler);
    this.touchControls?.detach(); // stop listening
  }

  pollTouch(): void {
    if (!this.touchControls?.visible) return;

    const t = this.touchControls.getState();

    // Merge touch input with keyboard input
    // Touch OR keyboard — either source can drive the game
    if (t.up) this.direction = "up";
    if (t.down) this.direction = "down";
    if (t.left) this.direction = "left";
    if (t.right) this.direction = "right";
  }
}
```

### 2. Continuous Input (Racing Pattern)

For games where buttons are held (not single-press), merge touch state into boolean flags:

```typescript
pollTouch(): void {
  if (!this.touchControls?.visible) return;

  const t = this.touchControls.getState();

  // OR with keyboard — both can be active simultaneously
  this.keys.up    = this.keys.up    || t.up;
  this.keys.down  = this.keys.down  || t.down;
  this.keys.left  = this.keys.left  || t.left;
  this.keys.right = this.keys.right || t.right;
}
```

### 3. Inline Merge (Pong Pattern)

For simple cases, read touch state directly in `applyInput()`:

```typescript
applyInput(): void {
  const touch = this.touchControls?.visible
    ? this.touchControls.getState()
    : null;

  if (this.keys.has("w") || touch?.up) {
    state.paddle.dy = -PADDLE_SPEED;
  } else if (this.keys.has("s") || touch?.down) {
    state.paddle.dy = PADDLE_SPEED;
  } else {
    state.paddle.dy = 0;
  }
}
```

### 4. Control Sizes

The `TouchControls` constructor accepts an optional size parameter:

```typescript
// Small controls (110px d-pad) — less screen obstruction
new TouchControls(canvas, "dpad", "small");

// Medium controls (140px d-pad) — default
new TouchControls(canvas, "dpad", "medium");

// Large controls (170px d-pad) — easier to hit
new TouchControls(canvas, "dpad", "large");
```

### 5. Auto-Detection

Controls only appear on touch devices. Desktop users never see them:

```typescript
get visible(): boolean {
  return this.isTouchDevice && this.layout !== "none";
}

// Detection uses two checks for broad compatibility:
this.isTouchDevice = "ontouchstart" in window || navigator.maxTouchPoints > 0;
```

## Common Pitfalls

1. **Forgetting `passive: false`** — Touch event listeners must use `{ passive: false }` to call `preventDefault()`, which stops the browser from scrolling/bouncing the page during gameplay.

2. **Not calling `detach()`** — Touch listeners on the canvas persist across game switches if not removed. Always detach in the engine's `destroy()` method.

3. **Polling before attach** — `getState()` returns all-false before `attach()` is called. Make sure `attach()` runs before the game loop starts.

4. **D-pad sliding** — The `TouchControls` system handles finger sliding between d-pad buttons automatically. When a finger moves from "up" to "right", the old zone is released and the new one activated without requiring a lift.

5. **Choosing the wrong layout** — Click-based games (Chess, Minesweeper) work better with native `tap-only` touch than with a virtual d-pad. Only use d-pad layouts for games that have directional keyboard input.

6. **Rendering order** — Always render touch controls AFTER the game content so buttons appear on top. Render before the help overlay so help can cover the controls.

## Games Using Each Layout

| Layout | Games |
|--------|-------|
| `dpad` | Snake, Pac-Man, Frogger, 2048, Maze Runner, Gravity Ball, Sokoban, Racing, Pong |
| `dpad-jump` | Doodle Jump, Platformer, Lava Floor |
| `dpad-action` | Asteroids, Space Invaders, Tetris |
| `dual-stick` | Top-Down Shooter, Zombie Survival |
| `flap` | Flappy Bird, Helicopter, Color Switch |

## Key Files

- `src/shared/TouchControls.ts` — The virtual control system
- `src/shared/GameInterface.ts` — `TouchLayout` type and `GameDefinition.touchLayout`
- `src/platform/GameRegistry.ts` — Each game declares its `touchLayout`
- `src/games/snake/` — Reference implementation (engine + input system)

## Testing on Mobile

```bash
# Start dev server accessible on local network
pnpm dev --host

# Open on your phone: http://<your-ip>:5173
# Or use Chrome DevTools → Toggle Device Toolbar (Ctrl+Shift+M)
```
