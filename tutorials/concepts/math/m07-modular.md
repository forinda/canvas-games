# Modular Arithmetic

## What Is It?

Modular arithmetic is clock math. When a clock shows 11 and you add 3 hours, it wraps around to 2, not 14. The modulo operation (`%`) gives you the remainder after division, which is exactly how wrapping works. In games, any time a value needs to wrap around -- rotation states, array indices, scrolling backgrounds, animation frames -- modular arithmetic is the tool.

Think of a circular track with 4 checkpoints numbered 0, 1, 2, 3. If a car passes checkpoint 3, the next checkpoint is not 4 (which does not exist) -- it is 0 again. The expression `(checkpoint + 1) % 4` handles this automatically. No if-statements, no bounds checking -- just clean, wrapping math.

This concept extends beyond simple integers. You can use modular arithmetic to wrap floating-point values (like keeping an angle between 0 and 2*PI) or to cycle through colors, spawn points, or any repeating sequence.

## The Math

The modulo operation:

```
a % n = remainder when a is divided by n
```

Examples:

```
7 % 4 = 3      (7 / 4 = 1 remainder 3)
8 % 4 = 0      (8 / 4 = 2 remainder 0)
0 % 4 = 0
```

Wrapping forward through indices:

```
next = (current + 1) % total

Index:  0  1  2  3  0  1  2  3  0 ...
        |  |  |  |  |  |  |  |  |
        +--+--+--+--+--+--+--+--+-->  time
```

Wrapping angle to [0, 2*PI):

```
angle = ((angle % TWO_PI) + TWO_PI) % TWO_PI
```

The double-mod trick handles negative values (since `-1 % 4 = -1` in JavaScript, not 3).

Grid coordinate wrapping (screen wrap like Pac-Man):

```
x = ((x % width) + width) % width
y = ((y % height) + height) % height

  +----------+
  |   ->  *  |   Object exits right edge...
  |          |
  | *  ->    |   ...and reappears on left edge
  +----------+
```

## Code Example

```typescript
// Positive modulo that handles negative numbers correctly
function mod(value: number, modulus: number): number {
  return ((value % modulus) + modulus) % modulus;
}

// Tetris: cycle through 4 rotation states
type RotationState = 0 | 1 | 2 | 3;

function rotateClockwise(state: RotationState): RotationState {
  return ((state + 1) % 4) as RotationState;
}

function rotateCounterClockwise(state: RotationState): RotationState {
  return mod(state - 1, 4) as RotationState;
}

// Screen wrapping for asteroids-style movement
interface Entity {
  x: number;
  y: number;
}

function wrapPosition(
  entity: Entity,
  screenW: number,
  screenH: number
): void {
  entity.x = mod(entity.x, screenW);
  entity.y = mod(entity.y, screenH);
}

// Animation frame cycling
function getAnimFrame(time: number, frameDuration: number, totalFrames: number): number {
  return Math.floor(time / frameDuration) % totalFrames;
}
```

## Used In These Games

- **Tetris**: Piece rotation cycles through 4 states (0, 1, 2, 3) using `(rotation + 1) % 4` for clockwise and `mod(rotation - 1, 4)` for counterclockwise.
- **Asteroids**: When the ship flies off one edge of the screen, it wraps around to the opposite edge using modular position wrapping.
- **Sprite animation**: The current animation frame is selected by `floor(time / frameDuration) % frameCount`, cycling through the sprite sheet forever.

## Common Pitfalls

- **Negative modulo in JavaScript**: In JavaScript, `-1 % 4` returns `-1`, not `3`. This is a language quirk. Always use the double-mod pattern `((value % n) + n) % n` when values can be negative.
- **Off-by-one with array indexing**: If your array has 5 elements (indices 0-4), use `% array.length`, not `% (array.length - 1)`. The latter skips the last element.
- **Floating-point accumulation**: Repeatedly adding small floats and taking modulo can accumulate rounding errors over time. For angles, consider periodically re-normalizing.

## Further Reading

- Khan Academy: Modular Arithmetic -- https://www.khanacademy.org/computing/computer-science/cryptography/modarithmetic
- Wikipedia: Modular Arithmetic -- https://en.wikipedia.org/wiki/Modular_arithmetic
