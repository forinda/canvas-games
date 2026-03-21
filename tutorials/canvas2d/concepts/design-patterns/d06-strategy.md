# Strategy Pattern

## What Is It?
The Strategy pattern defines a family of algorithms, encapsulates each one, and makes them interchangeable. The caller picks which algorithm to use at runtime without changing the code that uses it. Think of navigation apps: you choose "fastest route," "shortest route," or "avoid tolls." The routing engine runs whichever strategy you picked through the same interface.

The classic game example is Pac-Man ghost AI. All four ghosts move on the same grid, follow the same movement rules, and have the same interface. But each ghost uses a *different targeting strategy* during chase mode:

- **Blinky** (red): targets the player's current tile directly.
- **Pinky** (pink): targets 4 tiles ahead of the player.
- **Inky** (cyan): uses Blinky's position to compute a reflected target.
- **Clyde** (orange): chases when far, scatters when close.

Same interface, four different algorithms.

## The Pattern
```
  <<interface>>
  ChaseStrategy
  +getTarget(ghost, player, allGhosts): Point
       ^
       |
  +---------+---------+---------+---------+
  |         |         |         |         |
 Blinky   Pinky     Inky     Clyde
 Strategy Strategy  Strategy  Strategy

  Ghost
  - chaseStrategy: ChaseStrategy
  +update(dt)
    calls chaseStrategy.getTarget(...)
```

## Code Example
```typescript
interface Point { x: number; y: number; }

// The strategy interface: same signature, different algorithms
interface ChaseStrategy {
  getTarget(ghost: Ghost, player: Player, allGhosts: Ghost[]): Point;
}

// Blinky: direct pursuit -- target the player's current position
const blinkyChase: ChaseStrategy = {
  getTarget(_ghost, player) {
    return { x: player.tileX, y: player.tileY };
  },
};

// Pinky: ambush -- target 4 tiles ahead of the player
const pinkyChase: ChaseStrategy = {
  getTarget(_ghost, player) {
    const ahead = directionOffset(player.direction, 4);
    return { x: player.tileX + ahead.dx, y: player.tileY + ahead.dy };
  },
};

// Inky: flanking -- reflect Blinky's position through a point
// 2 tiles ahead of the player
const inkyChase: ChaseStrategy = {
  getTarget(_ghost, player, allGhosts) {
    const blinky = allGhosts.find(g => g.name === 'blinky')!;
    const pivot = {
      x: player.tileX + directionOffset(player.direction, 2).dx,
      y: player.tileY + directionOffset(player.direction, 2).dy,
    };
    return {
      x: pivot.x + (pivot.x - blinky.tileX),
      y: pivot.y + (pivot.y - blinky.tileY),
    };
  },
};

// Clyde: shy -- chase when far, scatter when close
const clydeChase: ChaseStrategy = {
  getTarget(ghost, player) {
    const dist = Math.hypot(ghost.tileX - player.tileX,
                            ghost.tileY - player.tileY);
    if (dist > 8) {
      return { x: player.tileX, y: player.tileY };  // chase
    }
    return { x: ghost.cornerX, y: ghost.cornerY };   // scatter
  },
};

// The ghost uses whichever strategy it was assigned:
class Ghost {
  private chaseStrategy: ChaseStrategy;

  constructor(name: string, strategy: ChaseStrategy) {
    this.chaseStrategy = strategy;
  }

  update(player: Player, allGhosts: Ghost[], dt: number): void {
    const target = this.chaseStrategy.getTarget(this, player, allGhosts);
    this.moveToward(target, dt);
  }
}

// Wiring: same Ghost class, four different behaviors
const ghosts = [
  new Ghost('blinky', blinkyChase),
  new Ghost('pinky',  pinkyChase),
  new Ghost('inky',   inkyChase),
  new Ghost('clyde',  clydeChase),
];
```

## When to Use It
- Multiple algorithms solve the same problem with different trade-offs (targeting, pathfinding, sorting, AI difficulty).
- You want to swap behavior at runtime without modifying the entity (e.g., a ghost enters frightened mode and switches to a random-walk strategy).
- You want to avoid giant switch statements or if/else chains that select behavior by type.
- New variants are expected (adding a 5th ghost should not require modifying existing ghost code).

## Used In These Games
- **Tower Defense**: `TOWER_DEFS` defines four tower types (archer, cannon, frost, sniper) with different stats. The `CombatSystem` uses the tower's type to select projectile behavior (splash damage, slow effect, long range). Each tower type is effectively a strategy for dealing damage.
- **Tower Defense enemies**: `ENEMY_DEFS` defines goblin (fast/weak), orc (slow/tough), ghost (immune to slow), boss (massive HP). The `EnemySystem` applies speed/health based on the definition -- different "strategies" for surviving.
- **Platformer**: Platform types ('solid', 'moving', 'crumble') determine collision behavior. The `PhysicsSystem` and `CollisionSystem` handle each type differently -- same interface, different behavior.
- **Pac-Man**: The four ghost AI targeting algorithms are the textbook example of the Strategy pattern.

## Anti-Patterns
- **Hardcoding behavior in the entity**: Putting all four ghost targeting algorithms in a single `Ghost.update()` method behind `if (this.name === 'blinky')` checks. This violates Open/Closed and makes it painful to add a fifth ghost.
- **Strategy that knows about the context**: A chase strategy that directly mutates the ghost's position instead of just returning a target. Strategies should compute and return -- the caller decides what to do with the result.
- **Too many strategies for trivial differences**: If two "strategies" differ by a single constant (speed = 100 vs speed = 120), use a parameter instead of a separate class.
