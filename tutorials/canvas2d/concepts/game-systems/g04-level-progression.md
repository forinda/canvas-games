# Level Progression

## What Is It?

Level progression is the system that moves the player from one stage to the next when they complete an objective. Think of it like chapters in a book: finish chapter 1 and move on to chapter 2, which introduces new challenges. The system tracks what the player has completed, decides when a level is "done," and transitions to the next one.

Good progression gives the player a sense of accomplishment and a reason to keep playing. Each level should teach or test something new.

## How It Works

```
Core loop:
  1. Load level data (layout, enemies, goals)
  2. Player plays until goal is met
  3. Show completion screen (score, stars, time)
  4. Advance to next level or return to level select

Goal types:
  - Reach the exit / flag
  - Kill all enemies
  - Survive N waves
  - Collect all items
  - Score threshold
  - Time limit

Difficulty curve (ideal):
  difficulty
    |          ____
    |        /
    |      /     ← steady climb
    |    /
    |  /
    |/_____________ level
     1  2  3  4  5
```

Difficulty tuning strategies:

```
  Linear:      difficulty = base + level * step
  Exponential: difficulty = base * (1.1 ^ level)
  Stepped:     every 5 levels, jump in difficulty + new mechanic
  Saw-tooth:   hard boss level, then easier breather level
```

## Code Example

```typescript
interface LevelConfig {
  id: number;
  name: string;
  enemyCount: number;
  enemySpeed: number;
  goalType: "kill-all" | "reach-exit" | "survive-time";
  goalValue: number; // kill count, exit position, or seconds
}

class LevelProgression {
  private levels: LevelConfig[];
  private currentIndex = 0;
  private completed: Set<number> = new Set();

  constructor(levels: LevelConfig[]) {
    this.levels = levels;
  }

  getCurrentLevel(): LevelConfig {
    return this.levels[this.currentIndex];
  }

  completeCurrentLevel(): LevelConfig | null {
    this.completed.add(this.levels[this.currentIndex].id);
    this.currentIndex++;
    if (this.currentIndex >= this.levels.length) {
      return null; // all levels beaten
    }
    return this.levels[this.currentIndex];
  }

  isLevelUnlocked(index: number): boolean {
    if (index === 0) return true;
    return this.completed.has(this.levels[index - 1].id);
  }

  getProgress(): string {
    return `${this.completed.size} / ${this.levels.length}`;
  }
}

// Define levels with scaling difficulty
const levels: LevelConfig[] = Array.from({ length: 10 }, (_, i) => ({
  id: i + 1,
  name: `Level ${i + 1}`,
  enemyCount: 3 + i * 2,
  enemySpeed: 50 + i * 10,
  goalType: "kill-all" as const,
  goalValue: 3 + i * 2,
}));

const progression = new LevelProgression(levels);
console.log(progression.getCurrentLevel().name); // "Level 1"
progression.completeCurrentLevel();
console.log(progression.getCurrentLevel().name); // "Level 2"
console.log(progression.getProgress());          // "1 / 10"
```

## Used In These Games

- **Platformer**: Each level has platforms, enemies, and a goal flag. Completing a level loads the next layout from `src/contexts/canvas2d/games/platformer/data/levels.ts`. The `GoalSystem` detects when the player reaches the exit.
- **Physics Puzzle**: Each puzzle level has a unique arrangement of objects and a target to hit. Levels progress from simple to complex, introducing new mechanics. Level data is in `src/contexts/canvas2d/games/physics-puzzle/data/levels.ts`.
- **Breakout**: Each level has a different brick layout. Clearing all bricks advances to the next layout from `src/contexts/canvas2d/games/breakout/data/levels.ts`.
- **Tower Defense**: Waves act as implicit levels. After all waves are cleared, the player "wins" the map and can move to a harder one.

## Common Pitfalls

- **Difficulty cliff at level 3**: Many games are too easy for levels 1-2, then suddenly brutal at level 3. Playtest the transition between each pair of levels, not just individual levels.
- **No way to retry**: If the player fails and has no restart option, frustration builds. Always offer a quick retry that reloads the current level without going through menus.
- **Locking all content behind progression**: If level 10 has the most fun mechanic but the player quits at level 5, they never see it. Consider unlocking mechanics early and using levels to test mastery.
- **No save between sessions**: If progress is lost on page refresh, the player has to replay everything. Persist `completed` levels to localStorage (see `e03-localstorage.md`).
