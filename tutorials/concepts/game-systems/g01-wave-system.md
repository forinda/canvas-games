# Wave System

## What Is It?

A wave system spawns groups of enemies in timed batches, with each wave harder than the last. Think of it like an arcade machine that sends enemies in rounds: first a handful of slow ones, then more of them, then faster ones, then a mix with a boss. Between waves there is usually a brief rest period so the player can breathe, spend gold, or repair.

Wave systems turn a continuous game into a series of escalating challenges, giving the player clear milestones and a sense of progression.

## How It Works

```
Wave definition:
  wave = {
    enemies: [{ type, count, spawnDelay }],
    restTime: seconds before next wave starts
  }

Difficulty scaling options:
  1. Authored: hand-design each wave in a data file.
  2. Formula: wave N has (baseCount + N * 2) enemies with
     (baseHP * 1.1^N) health.
  3. Hybrid: author early waves, formula for endless mode.

State machine:
  WAITING → (timer expires) → SPAWNING → (all dead) → WAITING
                                 ↓
                          spawn one enemy every spawnDelay
```

Timeline:

```
  Wave 1         Rest    Wave 2              Rest    Wave 3
  ├──E─E─E─E──┤  ····  ├──E─E─E─E─E─E──┤  ····  ├──E─E─E─B──┤
  4 enemies            6 enemies                   3 + boss
```

## Code Example

```typescript
interface WaveEnemy {
  type: string;
  count: number;
  spawnInterval: number; // seconds between spawns
}

interface WaveConfig {
  enemies: WaveEnemy[];
  restTime: number; // seconds before next wave
}

class WaveSystem {
  private waves: WaveConfig[];
  private currentWave = 0;
  private spawnTimer = 0;
  private restTimer = 0;
  private spawned = 0;
  private groupIndex = 0;
  private state: "resting" | "spawning" = "resting";

  constructor(waves: WaveConfig[]) {
    this.waves = waves;
    this.restTimer = 3; // initial countdown
  }

  update(dt: number, spawnCallback: (type: string) => void): void {
    if (this.currentWave >= this.waves.length) return; // all done

    const wave = this.waves[this.currentWave];

    if (this.state === "resting") {
      this.restTimer -= dt;
      if (this.restTimer <= 0) {
        this.state = "spawning";
        this.groupIndex = 0;
        this.spawned = 0;
        this.spawnTimer = 0;
      }
      return;
    }

    const group = wave.enemies[this.groupIndex];
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0 && this.spawned < group.count) {
      spawnCallback(group.type);
      this.spawned++;
      this.spawnTimer = group.spawnInterval;
    }

    if (this.spawned >= group.count) {
      this.groupIndex++;
      this.spawned = 0;
      if (this.groupIndex >= wave.enemies.length) {
        this.currentWave++;
        this.state = "resting";
        this.restTimer = wave.restTime;
      }
    }
  }
}
```

## Used In These Games

- **Tower Defense**: The core game loop. Waves of enemies march along the path with increasing speed, health, and count. The `WaveSystem` in `src/games/tower-defense/systems/WaveSystem.ts` manages timing and spawning.
- **Asteroids**: Each wave spawns more asteroids than the last. After clearing all asteroids, the next wave begins with a brief pause.
- **Space Invaders**: Each formation of aliens is effectively a wave. When the last alien dies, a new formation spawns faster and lower.

## Common Pitfalls

- **Difficulty spikes too fast**: Exponential scaling (`count * 1.5^wave`) gets brutal quickly. Test at least 10 waves and flatten the curve if wave 5 is already impossible.
- **No rest between waves**: Without a breather, the player feels overwhelmed and has no time to upgrade or reposition. Even 3-5 seconds helps.
- **Spawning all enemies at once**: Dumping 20 enemies simultaneously creates lag and an unreadable screen. Stagger spawns with intervals (0.3-1.0s apart).
- **Hardcoded wave data**: Putting wave definitions directly in code is rigid. Use a data file (array of configs) so designers can tweak balance without touching game logic.
