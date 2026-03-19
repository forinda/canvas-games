# Sine Wave Oscillation

## What Is It?

A sine wave is a smooth, repeating oscillation -- the mathematical heartbeat of cyclical motion. Think of a buoy floating on ocean waves: it bobs up and down in a smooth, predictable pattern. The highest point, the lowest point, and the smooth transitions in between are all described perfectly by the sine function.

In games, sine waves create organic, living motion. A floating item gently bobs up and down. A glowing aura pulses brighter and dimmer. An enemy patrol sweeps back and forth. A title screen logo gently sways. Any time you want smooth, repeating motion that feels natural rather than mechanical, reach for `Math.sin()`.

The three knobs you can turn are amplitude (how far it moves), frequency (how fast it repeats), and phase (where in the cycle it starts). By combining multiple sine waves with different settings, you can create complex, organic-looking patterns -- this is the basis of procedural animation.

## The Math

The basic sine wave formula:

```
value = amplitude * Math.sin(frequency * time + phase)
```

Where:
- `amplitude` = how far the value swings from center (half the total range)
- `frequency` = how quickly it oscillates (in radians per second)
- `time` = current time (usually in seconds)
- `phase` = horizontal offset (shifts the start of the wave)

```
amplitude = 1, frequency = 1

 +1 |    *         *
    |  *   *     *   *
  0 |*-------*-------*-------> time
    |         *     *
 -1 |           *

    |<- period ->|
    period = 2 * PI / frequency
```

**Mapping to a useful range** [min, max]:

```
// sin returns -1 to +1, remap to min..max range
value = min + (max - min) * (Math.sin(time) * 0.5 + 0.5)

This shifts sin output from [-1, +1] to [0, 1], then scales to [min, max].
```

**Combining waves for complex motion:**

```
// Two waves with different frequencies create a more organic pattern
y = sin(t) + 0.5 * sin(2.3 * t)

       *                     More complex,
      * *   *               less repetitive
    *     * * *    *         motion pattern
   *           *  * *
  *              *   *
```

## Code Example

```typescript
// Bobbing animation for a floating collectible
interface Collectible {
  baseX: number;
  baseY: number;
  x: number;
  y: number;
}

function updateBobbing(item: Collectible, time: number): void {
  const bobAmplitude = 8;     // pixels up and down
  const bobFrequency = 2.5;   // oscillations per second
  const freq = bobFrequency * Math.PI * 2;

  item.x = item.baseX;
  item.y = item.baseY + bobAmplitude * Math.sin(freq * time);
}

// Pulsing glow effect
function pulseAlpha(time: number): number {
  const minAlpha = 0.4;
  const maxAlpha = 1.0;
  // Map sin from [-1,1] to [minAlpha, maxAlpha]
  const t = Math.sin(time * 3) * 0.5 + 0.5; // 0 to 1
  return minAlpha + (maxAlpha - minAlpha) * t;
}

// Enemy that patrols side to side
interface PatrolEnemy {
  centerX: number;
  y: number;
  x: number;
  patrolWidth: number;
}

function updatePatrol(enemy: PatrolEnemy, time: number): void {
  enemy.x = enemy.centerX + enemy.patrolWidth * Math.sin(time * 1.5);
}

// Draw a collectible with bob and pulse
function drawCollectible(
  ctx: CanvasRenderingContext2D,
  item: Collectible,
  time: number
): void {
  updateBobbing(item, time);
  ctx.globalAlpha = pulseAlpha(time);
  ctx.fillStyle = "gold";
  ctx.beginPath();
  ctx.arc(item.x, item.y, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}
```

## Used In These Games

- **Platformer collectibles**: Coins and power-ups bob up and down using a sine wave, making them visually appealing and clearly distinguishable from static scenery.
- **Title screens**: Logos and menu elements gently sway or pulse using sine-based animation to keep the screen feeling alive.
- **Water simulation**: Simple water surfaces can be rendered as layered sine waves with different amplitudes and frequencies, creating a convincing ripple effect.
- **Enemy AI**: Sine-wave patrol paths create smooth side-to-side movement for flying enemies, more natural than linear back-and-forth.

## Common Pitfalls

- **Forgetting to convert frequency to radians**: `Math.sin` expects radians. If you want N oscillations per second, use `frequency = N * 2 * Math.PI`. Without the `2 * Math.PI` factor, you get roughly 1 cycle every 6.28 seconds instead of every second.
- **Time value growing too large**: After hours of gameplay, `time` can become a very large float. While `Math.sin` handles this correctly, precision gradually decreases. For very long sessions, consider wrapping time with modulo: `time = time % (2 * Math.PI / frequency)`.
- **Everything oscillating in sync**: If every object uses the same phase, they all bob in unison, which looks artificial. Add a per-object phase offset (e.g., based on position or spawn time): `Math.sin(freq * time + item.id * 0.7)`.

## Further Reading

- "The Art of Game Design" by Jesse Schell -- discusses how oscillation and rhythm create engaging game feel
- Wikipedia: Sine Wave -- https://en.wikipedia.org/wiki/Sine_wave
- Desmos Graphing Calculator -- https://www.desmos.com/calculator (great for visualizing sine waves interactively)
