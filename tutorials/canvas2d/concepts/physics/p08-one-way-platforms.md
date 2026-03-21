# One-Way Platforms

## What Is It?

A one-way platform is a surface you can jump through from below but land on from above. Think of the thin platforms in Doodle Jump or the floating ledges in Super Mario Bros: the character jumps up through them and then stands on top. Unlike solid walls, these platforms only block movement in one direction (downward).

This is essential for platformer games with vertically stacked levels where the player needs to jump upward through platforms to progress.

## How It Works

```
Standard solid platform collision:
  Block movement from ALL directions (left, right, top, bottom)

One-way platform collision:
  ONLY block movement when:
    1. Object is moving downward (vy > 0)
    2. Object's feet were ABOVE the platform last frame
    3. Object's feet are AT or BELOW the platform this frame

Pseudocode:
  previousBottom = obj.y + obj.height  (last frame)
  currentBottom  = obj.y + obj.height  (this frame)
  platformTop    = platform.y

  if (vy >= 0                          // falling or stationary
      && previousBottom <= platformTop  // was above last frame
      && currentBottom >= platformTop   // now at or below
      && horizontally overlapping) {
    obj.y = platformTop - obj.height;   // snap to top
    obj.vy = 0;                         // stop falling
    obj.grounded = true;
  }
```

ASCII diagram:

```
  Frame N:        Frame N+1:
                    +---+
    +---+           | P |  ← player lands on platform
    | P |           +---+
    +---+         =========  platform

  =========       Player was above, is now at surface.
                  vy > 0. Collision triggers.

  Jump through:
                  =========  platform
    +---+           +---+
    | P |  ↑        | P |  ← passes through, no collision
    +---+           +---+

  vy < 0 (moving up). No collision.
```

## Code Example

```typescript
interface Player {
  x: number;
  y: number;
  width: number;
  height: number;
  vy: number;
  prevY: number;
  grounded: boolean;
}

interface Platform {
  x: number;
  y: number;
  width: number;
  oneWay: boolean;
}

function checkOneWayPlatform(player: Player, plat: Platform): boolean {
  // Only collide when falling
  if (player.vy < 0) return false;

  const playerBottom = player.y + player.height;
  const prevBottom = player.prevY + player.height;

  // Was feet above platform top last frame?
  if (prevBottom > plat.y) return false;

  // Is feet at or past platform top this frame?
  if (playerBottom < plat.y) return false;

  // Horizontal overlap check
  if (player.x + player.width < plat.x) return false;
  if (player.x > plat.x + plat.width) return false;

  // Collision! Snap to platform surface
  player.y = plat.y - player.height;
  player.vy = 0;
  player.grounded = true;
  return true;
}

// Remember to save prevY at the start of each frame:
function preUpdate(player: Player): void {
  player.prevY = player.y;
  player.grounded = false;
}
```

## Used In These Games

- **Platformer**: Levels use one-way platforms for vertical progression. The player jumps upward through platforms and lands on them from above.
- **Flappy Bird**: Not used directly, but the concept applies if you add resting perches the bird can land on.
- **Physics Puzzle**: One-way gates that let objects pass in one direction but not the other can act as funnels or valves in puzzle design.

## Common Pitfalls

- **Not storing previous position**: Without `prevY`, you cannot tell whether the player was above the platform last frame. The player might teleport onto a platform from the side, which looks wrong.
- **Checking `vy > 0` alone is not enough**: An object moving sideways with `vy = 0` that horizontally overlaps should not snap to the platform unless it is at the right height. Always check vertical position, not just velocity direction.
- **High fall speeds skip the check**: If `vy * dt` is greater than the platform thickness, the player can fall through. Use the previous-position check rather than overlap testing to avoid this.
- **Forgetting drop-through**: Many games let the player press Down+Jump to fall through a one-way platform. Implement this by temporarily disabling collision for that platform for a few frames.
