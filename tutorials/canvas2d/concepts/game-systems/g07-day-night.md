# Day-Night Cycle

## What Is It?

A day-night cycle divides game time into phases -- typically dawn, day, dusk, and night -- where each phase changes the game's look and behavior. Think of a farming game where crops grow during the day and monsters appear at night, or a city builder where traffic patterns shift between work hours and evening.

The cycle adds rhythm to gameplay. Players learn to prepare during safe phases and brace for danger during risky ones. It also creates visual variety without needing different levels.

## How It Works

```
Core state:
  timeOfDay = 0.0 to 1.0 (0 = midnight, 0.5 = noon)
  phase = "night" | "dawn" | "day" | "dusk"

Each frame:
  timeOfDay += (dt / dayDuration)   // dayDuration in seconds
  timeOfDay %= 1.0

Phase boundaries (example):
  0.00 - 0.20  night
  0.20 - 0.30  dawn    (transition)
  0.30 - 0.70  day
  0.70 - 0.80  dusk    (transition)
  0.80 - 1.00  night

Visual overlay:
  nightAlpha = 0 during day, ramps to 0.6 during night
  Draw a semi-transparent dark rectangle over everything

Behavior changes by phase:
  night → spawn zombies, reduce visibility
  day   → shops open, crops grow, enemies sleep
  dawn  → night enemies flee, day begins
  dusk  → warning: night is coming
```

Timeline:

```
  midnight          noon            midnight
  |---night---|dawn|-----day------|dusk|---night---|
  dark         ↑   bright          ↑    dark
           transition          transition
```

## Code Example

```typescript
type Phase = "night" | "dawn" | "day" | "dusk";

class DayNightCycle {
  time = 0.3; // start at morning
  dayDuration: number; // real seconds for one full cycle

  constructor(dayDurationSeconds = 120) {
    this.dayDuration = dayDurationSeconds;
  }

  update(dt: number): void {
    this.time += dt / this.dayDuration;
    this.time %= 1.0;
  }

  getPhase(): Phase {
    if (this.time < 0.20) return "night";
    if (this.time < 0.30) return "dawn";
    if (this.time < 0.70) return "day";
    if (this.time < 0.80) return "dusk";
    return "night";
  }

  getDarknessAlpha(): number {
    const phase = this.getPhase();
    if (phase === "day") return 0;
    if (phase === "night") return 0.55;
    // Transitions: lerp between 0 and 0.55
    if (phase === "dawn") {
      const t = (this.time - 0.20) / 0.10; // 0→1 during dawn
      return 0.55 * (1 - t);
    }
    // dusk
    const t = (this.time - 0.70) / 0.10; // 0→1 during dusk
    return 0.55 * t;
  }

  drawOverlay(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    const alpha = this.getDarknessAlpha();
    if (alpha > 0) {
      ctx.fillStyle = `rgba(10, 10, 40, ${alpha})`;
      ctx.fillRect(0, 0, w, h);
    }
  }
}

// Usage
const cycle = new DayNightCycle(90); // 90 second full cycle
// In game loop:
// cycle.update(dt);
// ... draw world ...
// cycle.drawOverlay(ctx, canvas.width, canvas.height);
// if (cycle.getPhase() === "night") spawnNightEnemies();
```

## Used In These Games

- **City Builder**: Time phases affect population behavior, energy consumption, and building output. A factory produces during the day; residential zones generate tax at night.
- **Tower Defense**: Night waves could be harder with faster or invisible enemies, while daytime waves allow tower maintenance and upgrades.
- **Platformer**: Visual atmosphere changes (dark caves, sunset levels) can use the same overlay system even if time does not cycle continuously.

## Common Pitfalls

- **Cycle too fast or too slow**: A 10-second day feels frantic; a 10-minute day feels stale. Start with 60-120 seconds and adjust based on gameplay pace.
- **Night is unplayable**: If the darkness overlay is too opaque (alpha > 0.7), the player cannot see. Keep it at 0.4-0.6 or add a player-centered light radius.
- **No warning before phase change**: If night enemies spawn instantly at the boundary, the player feels ambushed. Give 5-10 seconds of "dusk" with a visual and audio cue.
- **Phase logic with floating point**: Comparing `time === 0.3` will never be true with floats. Use ranges (`time >= 0.3 && time < 0.7`) or phase enums derived from ranges.
