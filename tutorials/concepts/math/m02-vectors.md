# 2D Vectors

## What Is It?

A vector is a quantity that has both a magnitude (size) and a direction. Think of it like an arrow: it points somewhere and has a length. In game development, vectors represent positions, velocities, forces, and directions. They are arguably the single most important math concept in all of game programming.

Imagine you are giving someone walking directions. "Go 3 blocks east and 4 blocks north" is a vector: it has an x component (3) and a y component (4). The actual distance walked (the magnitude) is 5 blocks (thanks to the Pythagorean theorem). If you only care about the direction and not the distance, you can "normalize" the vector -- shrink it so its length is exactly 1 while preserving the direction.

Vectors become powerful when you combine them. Adding a velocity vector to a position vector moves an object. Adding an acceleration vector to a velocity vector changes how fast something is moving. This building-block approach lets you simulate realistic physics with just a few lines of code.

## The Math

A 2D vector is a pair of numbers: `(x, y)`.

**Addition** -- combine two vectors component-wise:

```
A + B = (Ax + Bx, Ay + By)

     B
    /
   /
  A-------> A + B
```

**Subtraction** -- find the vector FROM B TO A:

```
A - B = (Ax - Bx, Ay - By)
```

**Magnitude** (length):

```
|V| = sqrt(Vx^2 + Vy^2)
```

**Normalization** -- make length = 1:

```
norm(V) = (Vx / |V|, Vy / |V|)
```

**Scalar multiplication** -- scale the vector:

```
V * s = (Vx * s, Vy * s)
```

**Dot product** -- measures how much two vectors point in the same direction:

```
A . B = Ax*Bx + Ay*By

If A . B > 0  --> same general direction
If A . B = 0  --> perpendicular
If A . B < 0  --> opposite directions
```

Geometric interpretation:

```
A . B = |A| * |B| * cos(angle between them)
```

## Code Example

```typescript
interface Vec2 {
  x: number;
  y: number;
}

const vec = {
  add:       (a: Vec2, b: Vec2): Vec2 => ({ x: a.x + b.x, y: a.y + b.y }),
  sub:       (a: Vec2, b: Vec2): Vec2 => ({ x: a.x - b.x, y: a.y - b.y }),
  scale:     (v: Vec2, s: number): Vec2 => ({ x: v.x * s, y: v.y * s }),
  mag:       (v: Vec2): number => Math.sqrt(v.x * v.x + v.y * v.y),
  normalize: (v: Vec2): Vec2 => {
    const m = vec.mag(v);
    return m > 0 ? { x: v.x / m, y: v.y / m } : { x: 0, y: 0 };
  },
  dot:       (a: Vec2, b: Vec2): number => a.x * b.x + a.y * b.y,
};

// Usage: apply acceleration to velocity, then velocity to position
interface Particle {
  pos: Vec2;
  vel: Vec2;
}

function applyGravity(p: Particle, dt: number): void {
  const gravity: Vec2 = { x: 0, y: 400 }; // pixels/s^2 downward
  p.vel = vec.add(p.vel, vec.scale(gravity, dt));
  p.pos = vec.add(p.pos, vec.scale(p.vel, dt));
}
```

## Used In These Games

- **Platformer**: Velocity and gravity vectors are added each frame to produce arc-shaped jumps.
- **Asteroids clone**: Ship thrust is a vector in the direction of rotation, added to the velocity vector each frame.
- **Particle systems**: Each particle has position and velocity vectors; updating them produces natural-looking motion for sparks, explosions, and smoke.

## Common Pitfalls

- **Normalizing a zero-length vector**: If `magnitude` is 0, dividing by it gives `NaN`. Always guard against zero-length vectors before normalizing.
- **Confusing position and direction vectors**: A position `(100, 200)` is a point on screen. A direction `(1, 0)` means "to the right." They are both `Vec2` but mean different things. Subtracting two positions gives a direction vector.
- **Forgetting to multiply by delta time**: Adding raw velocity to position without `dt` makes your game run at different speeds on different machines. Always scale by the time step.

## Further Reading

- "Game Programming Patterns" by Robert Nystrom -- https://gameprogrammingpatterns.com/
- 3Blue1Brown: Essence of Linear Algebra (YouTube series) -- outstanding visual intuition for vectors
- MDN: Typed Arrays can be useful for high-performance vector math
