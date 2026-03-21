# AABB Collision Detection

## What Is It?

AABB stands for Axis-Aligned Bounding Box. It is the simplest and fastest way to check if two rectangles overlap, as long as those rectangles are not rotated -- their edges are always parallel to the x and y axes. In 2D games, most sprites are rectangular, and most of the time, a simple box check is good enough.

The idea is straightforward: two boxes overlap if and only if they overlap on BOTH axes. If there is any gap between them on either the x-axis or the y-axis, they cannot be colliding. This is called the Separating Axis Theorem applied to axis-aligned rectangles, and it reduces to checking just four conditions.

Think of it like checking if two time ranges overlap on a calendar. Meeting A is from 2-4pm, Meeting B is from 3-5pm. They overlap because A does not end before B starts AND B does not end before A starts. AABB collision is the same idea, but in two dimensions instead of one.

## The Algorithm

```
Given two boxes:
  Box A: left=ax1, right=ax2, top=ay1, bottom=ay2
  Box B: left=bx1, right=bx2, top=by1, bottom=by2

They do NOT collide if ANY of these are true:
  1. A is to the left of B:   ax2 < bx1
  2. A is to the right of B:  ax1 > bx2
  3. A is above B:            ay2 < by1
  4. A is below B:            ay1 > by2

They DO collide if NONE of those are true:
  ax2 >= bx1 AND ax1 <= bx2 AND ay2 >= by1 AND ay1 <= by2
```

### The 4 Separation Conditions

```
  Case 1: A left of B          Case 2: A right of B
  +-----+     +-----+          +-----+     +-----+
  |  A  |     |  B  |          |  B  |     |  A  |
  +-----+     +-----+          +-----+     +-----+
    ax2 < bx1                     ax1 > bx2

  Case 3: A above B            Case 4: A below B
  +-----+                      +-----+
  |  A  |                      |  B  |
  +-----+                      +-----+

  +-----+                      +-----+
  |  B  |                      |  A  |
  +-----+                      +-----+
    ay2 < by1                     ay1 > by2

  Collision (none of the 4 cases):
  +--------+
  |  A  +--+----+
  |     |##|    |     ## = overlap region
  +-----+--+   |
       |   B   |
       +-------+
```

## Code Example

```typescript
interface AABB {
  x: number;      // left edge
  y: number;      // top edge
  width: number;
  height: number;
}

function aabbOverlap(a: AABB, b: AABB): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

// --- With overlap depth (for collision response) ---

interface Overlap {
  dx: number; // horizontal penetration (shortest push-out)
  dy: number; // vertical penetration (shortest push-out)
}

function aabbOverlapDepth(a: AABB, b: AABB): Overlap | null {
  const overlapX = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
  const overlapY = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);

  if (overlapX <= 0 || overlapY <= 0) return null;

  // Push out along the axis with the smallest overlap
  if (overlapX < overlapY) {
    const sign = a.x + a.width / 2 < b.x + b.width / 2 ? -1 : 1;
    return { dx: overlapX * sign, dy: 0 };
  } else {
    const sign = a.y + a.height / 2 < b.y + b.height / 2 ? -1 : 1;
    return { dx: 0, dy: overlapY * sign };
  }
}

// Usage in a game loop
const player: AABB = { x: 50, y: 80, width: 32, height: 32 };
const wall: AABB = { x: 70, y: 60, width: 64, height: 64 };

if (aabbOverlap(player, wall)) {
  const push = aabbOverlapDepth(player, wall);
  if (push) {
    player.x += push.dx;
    player.y += push.dy;
  }
}
```

## Complexity

| Metric | Big O |
|--------|-------|
| Time   | O(1) per pair -- just 4 comparisons. |
| Space  | O(1) -- no allocations. |

Checking all pairs in a scene: O(n^2). Use spatial partitioning (grid, quadtree) to reduce this.

## Used In These Games

- **Platformers**: Player vs platform, player vs enemy bounding box checks. Nearly every 2D game starts with AABB.
- **Breakout / Arkanoid**: Paddle and brick collision (before refining with circle-rect for the ball).
- **Top-down RPGs**: Character vs wall, character vs interactable object zones.
- **Bullet hell / shmups**: Fast broad-phase check before doing pixel-perfect or circle collision.

## Common Pitfalls

- **Mixing up coordinate systems**: Some systems use (x, y) as the center; others use it as the top-left corner. Be consistent, or your boxes will be offset by half their size.
- **Using `<=` vs `<` for edge touching**: `a.x + a.width == b.x` means the edges are touching but not overlapping. Whether this counts as a collision depends on your game. Use `<` for strict overlap, `<=` to include touching.
- **Rotated rectangles**: AABB does NOT work for rotated sprites. You need OBB (Oriented Bounding Box) collision or SAT (Separating Axis Theorem) for arbitrary rectangles.
- **Tunneling at high speeds**: A fast object can move entirely through a thin wall in one frame. Neither box overlaps because the object was on one side in the previous frame and the other side in the current frame. Use swept AABB or continuous collision detection for fast objects.

## Further Reading

- [MDN: 2D collision detection](https://developer.mozilla.org/en-US/docs/Games/Techniques/2D_collision_detection)
- [Real-Time Collision Detection by Christer Ericson](https://realtimecollisiondetection.net/)
- Broad phase vs narrow phase collision detection
