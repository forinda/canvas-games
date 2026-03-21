# Delayed Auto Shift (DAS)

## What Is It?

Delayed Auto Shift is the input handling pattern for held keys: when you press and hold a direction, the action fires once immediately, then pauses briefly (the "delay"), then repeats rapidly (the "repeat rate"). You experience this every day when holding a letter key on your keyboard -- one character appears, a pause, then the character repeats quickly.

In Tetris, DAS controls how the piece moves left and right when the player holds a direction. Without DAS, either the piece moves once per key press (tedious) or flies across the board instantly (uncontrollable). DAS gives the sweet spot: quick initial response, then fast repeated movement.

## How It Works

```
Parameters:
  DAS_DELAY  = initial delay before repeating (ms), typically 150-300
  DAS_RATE   = interval between repeats (ms), typically 30-80

State machine per key:

  IDLE → (key down) → FIRST_PRESS → (DAS_DELAY elapsed) → REPEATING
                          ↑                                    |
                          |          fires action every DAS_RATE
                          |
  (key up) → IDLE   ←────┘──── (key up) ← IDLE

Timeline:
  key pressed                                          key released
  |                                                    |
  v                                                    v
  [fire]----delay----[fire][fire][fire][fire][fire]----stop
  ^                   ^    ^    ^    ^    ^
  immediate         repeats at DAS_RATE interval
```

## Code Example

```typescript
class DASHandler {
  private dasDelay: number;   // ms before repeat starts
  private dasRate: number;    // ms between repeats
  private timer = 0;
  private isHeld = false;
  private initialFired = false;
  private delayElapsed = false;

  constructor(dasDelay = 200, dasRate = 50) {
    this.dasDelay = dasDelay;
    this.dasRate = dasRate;
  }

  press(): void {
    this.isHeld = true;
    this.initialFired = false;
    this.delayElapsed = false;
    this.timer = 0;
  }

  release(): void {
    this.isHeld = false;
    this.initialFired = false;
    this.delayElapsed = false;
    this.timer = 0;
  }

  /** Call every frame with dt in milliseconds. Returns true when action should fire. */
  update(dtMs: number): boolean {
    if (!this.isHeld) return false;

    // Fire immediately on first frame
    if (!this.initialFired) {
      this.initialFired = true;
      return true;
    }

    this.timer += dtMs;

    // Waiting for initial delay
    if (!this.delayElapsed) {
      if (this.timer >= this.dasDelay) {
        this.delayElapsed = true;
        this.timer -= this.dasDelay;
        return true;
      }
      return false;
    }

    // Repeating phase
    if (this.timer >= this.dasRate) {
      this.timer -= this.dasRate;
      return true;
    }
    return false;
  }
}

// Usage in a Tetris-like game
const dasLeft = new DASHandler(170, 50);
const dasRight = new DASHandler(170, 50);

// On keydown:
// if (key === "ArrowLeft") dasLeft.press();
// if (key === "ArrowRight") dasRight.press();

// On keyup:
// if (key === "ArrowLeft") dasLeft.release();
// if (key === "ArrowRight") dasRight.release();

// In update loop:
// const dtMs = dt * 1000;
// if (dasLeft.update(dtMs)) movePieceLeft();
// if (dasRight.update(dtMs)) movePieceRight();
```

## Used In These Games

- **Tetris**: The primary use case. DAS controls horizontal piece movement. Competitive Tetris players tune DAS delay (100-170ms) and repeat rate (0-50ms) for maximum speed.
- **Snake**: Holding a direction key could use DAS if the snake does not auto-move, allowing the player to tap for single steps or hold for continuous turning.
- **City Builder**: Keyboard-based cursor movement on the grid benefits from DAS so the cursor does not fly across the map or require repeated tapping.
- **Breakout**: Holding left/right to move the paddle can use DAS for initial responsiveness before continuous movement kicks in.

## Common Pitfalls

- **No DAS at all**: Making the player tap the key 10 times to move a Tetris piece across the board is exhausting. DAS is expected in any game with repeated directional input.
- **DAS delay too long**: A 500ms delay feels laggy. Competitive players want 100-200ms. Casual players are comfortable with 200-300ms. Offer a settings option if possible.
- **DAS does not reset on direction change**: If the player switches from left to right, the DAS timer should reset. Otherwise the new direction inherits the old timer state and may fire at the wrong time.
- **Frame-rate dependent timing**: Using frame counts instead of elapsed milliseconds makes DAS speed vary with frame rate. Always track time in milliseconds and compare against thresholds.
