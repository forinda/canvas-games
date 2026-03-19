# Particle System

## What Is It?

A particle system creates visual effects by spawning many tiny, short-lived elements that move, shrink, and fade away. Think of fireworks: a burst of sparks flies outward, each following its own path, gradually fading into nothing. In games, particles are used for explosions, smoke, sparks, rain, blood splatter, coin pickup effects, and much more.

Particles are purely visual -- they do not affect gameplay physics or collision. They exist to make the game feel alive and satisfying.

## How It Works

```
Lifecycle of a particle:
  1. SPAWN: set position, velocity, color, size, lifetime
  2. UPDATE: move, apply gravity, shrink, fade alpha
  3. REMOVE: when lifetime reaches 0 or alpha reaches 0

Burst spawn (explosion):
  for i in range(count):
    angle = random(0, 2*PI)
    speed = random(minSpeed, maxSpeed)
    create particle at (x, y) with velocity from angle+speed

Per frame:
  for each particle:
    particle.vy += gravity * dt
    particle.x += particle.vx * dt
    particle.y += particle.vy * dt
    particle.life -= dt
    particle.alpha = particle.life / particle.maxLife
    particle.size *= shrinkRate
```

Visual stages:

```
  Frame 0:   * * *    (burst, full size, full alpha)
             * O *
             * * *

  Frame 10:  . . .    (spread out, smaller, fading)
              . .
             .   .

  Frame 20:             (gone)
```

## Code Example

```typescript
interface Particle {
  x: number;  y: number;
  vx: number; vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

class ParticleSystem {
  private particles: Particle[] = [];
  private pool: Particle[] = []; // reuse dead particles

  burst(x: number, y: number, count: number, color: string): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 50 + Math.random() * 150;
      const life = 0.4 + Math.random() * 0.6;
      const p = this.pool.pop() || ({} as Particle);
      p.x = x; p.y = y;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      p.life = life; p.maxLife = life;
      p.size = 2 + Math.random() * 3;
      p.color = color;
      this.particles.push(p);
    }
  }

  update(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.vy += 200 * dt;        // gravity on particles
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) {
        this.pool.push(p);     // recycle
        this.particles.splice(i, 1);
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
  }
}

// Usage: explosion at (400, 300)
const particles = new ParticleSystem();
particles.burst(400, 300, 30, "#ff6600");
```

## Used In These Games

- **Tower Defense**: Explosions when enemies die, muzzle flashes from towers, and impact sparks on hits. The `ParticleRenderer` in `src/games/tower-defense/renderers/ParticleRenderer.ts` draws these effects.
- **Breakout**: Brick destruction spawns colored particles matching the brick color, making breaks feel impactful.
- **Platformer**: Dust puffs when the player lands, coin sparkles on pickup, and death explosions for enemies.
- **Asteroids**: Asteroid destruction creates rock fragments, and ship thrust emits flame particles.

## Common Pitfalls

- **Too many particles cause lag**: Spawning 500 particles per explosion on a budget device tanks the frame rate. Set a reasonable cap (20-50 per burst) and test on low-end hardware.
- **Not using object pooling**: Creating and garbage-collecting particle objects every frame causes GC pauses (stuttering). Reuse dead particle objects from a pool instead of `new`-ing them.
- **Forgetting to reset globalAlpha**: After drawing faded particles with `ctx.globalAlpha = 0.3`, all subsequent draws are also faded. Always reset to `1.0` after the particle draw pass.
- **Particles that live too long**: Particles with a 5-second lifetime pile up and clutter the screen. Keep lifetimes short (0.3-1.5 seconds) for action effects.
