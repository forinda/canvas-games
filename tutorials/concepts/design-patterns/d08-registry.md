# Registry Pattern

## What Is It?
The Registry pattern provides a central, well-known place to look up objects by key. Think of a phone book: you do not need to know where someone lives to find their number -- you look them up by name. The phone book is the registry.

In this codebase, `GAME_REGISTRY` is a `Record<GameCategory, GameDefinition[]>` that maps category names to lists of game definitions. The platform menu, launcher, and any future feature (search, favorites, filtering) all consult this single source of truth. Tower and enemy definitions (`TOWER_DEFS`, `ENEMY_DEFS`, `BUILDING_DEFS`) follow the same pattern at a smaller scale.

## The Pattern
```
  GAME_REGISTRY: Record<GameCategory, GameDefinition[]>
  +------------------------------------------------------+
  | 'arcade'   -> [ SnakeGame, BreakoutGame, ... ]       |
  | 'action'   -> [ TowerDefenseGame, PlatformerGame, .. ]|
  | 'puzzle'   -> [ PhysicsPuzzleGame, MinesweeperGame.. ]|
  | 'strategy' -> [ CityBuilderGame, CardBattleGame, .. ] |
  | 'chill'    -> [ FishingGame, IdleClickerGame, ... ]   |
  +------------------------------------------------------+
       |
       | read by
       v
  GameLauncher -- shows menu, launches games
  PlatformMenu -- filters by category, renders cards
  getAllGames() -- flattens for search/count
```

## Code Example
```typescript
import type { GameCategory, GameDefinition } from '@shared/GameInterface';
import { TowerDefenseGame } from '@games/tower-defense';
import { SnakeGame } from '@games/snake';
import { PlatformerGame } from '@games/platformer';
// ... more imports

// The registry: one Record mapping categories to game lists
export const GAME_REGISTRY: Record<GameCategory, GameDefinition[]> = {
  arcade: [
    SnakeGame,
    BreakoutGame,
    AsteroidsGame,
    SpaceInvadersGame,
    FlappyBirdGame,
    TetrisGame,
    PongGame,
    PacManGame,
    // ... 17 arcade games total
  ],
  action: [
    TowerDefenseGame,
    PlatformerGame,
    TopDownShooterGame,
    RacingGame,
    FruitNinjaGame,
    // ... 9 action games total
  ],
  puzzle: [
    PhysicsPuzzleGame,
    MinesweeperGame,
    Match3Game,
    SudokuGame,
    // ... 14 puzzle games total
  ],
  strategy: [
    CityBuilderGame,
    CardBattleGame,
    AntColonyGame,
    // ... 5 strategy games total
  ],
  chill: [
    FishingGame,
    IdleClickerGame,
    ParticleSandGame,
    // ... 5 chill games total
  ],
};

// Utility: flatten the registry into a single list
export function getAllGames(): GameDefinition[] {
  return Object.values(GAME_REGISTRY).flat();
}

// Utility: look up games by category
export function getGamesByCategory(category: GameCategory): GameDefinition[] {
  return GAME_REGISTRY[category];
}

// Consumer: the launcher passes the registry to the menu
class GameLauncher {
  start(): void {
    this.menu.show(GAME_REGISTRY, getAllGames());
  }
}

// Consumer: the menu filters by active category
class PlatformMenu {
  private getFilteredGames(): GameDefinition[] {
    if (this.activeCategory === 'all') return this.allGames;
    return this.registry[this.activeCategory] ?? [];
  }
}
```

## When to Use It
- You have a collection of items organized by type/category that multiple parts of the system need to look up.
- You want a single source of truth that is easy to extend (adding a new game = adding one entry to the array).
- You need both category-based access and flat iteration.
- You want compile-time exhaustiveness checks (TypeScript will warn if a `Record<GameCategory, ...>` is missing a key).

## Used In These Games
- **Platform layer**: `GAME_REGISTRY` in `src/platform/GameRegistry.ts` maps 5 categories to 50+ games. Used by `GameLauncher` and `PlatformMenu`.
- **Tower Defense**: `TOWER_DEFS: Record<TowerType, TowerDef>` maps `'archer' | 'cannon' | 'frost' | 'sniper'` to their stats. `ENEMY_DEFS: Record<EnemyType, EnemyDef>` maps `'goblin' | 'orc' | 'ghost' | 'boss'` to their stats.
- **City Builder**: `BUILDING_DEFS: Record<BuildingType, BuildingDef>` maps `'house' | 'farm' | 'factory' | 'park' | 'road' | 'powerplant'` to cost, icon, name, color, and stat effects.

## Anti-Patterns
- **Scattered definitions**: Defining tower stats inline in the combat system, enemy stats inline in the wave system, and more stats inline in the renderer. When you need to change the archer's damage, you hunt through five files. Put it all in one registry.
- **Mutable registries without controls**: If any code can call `GAME_REGISTRY.arcade.push(...)` at runtime, the registry becomes unpredictable. Use `as const` or freeze the registry if it should be immutable.
- **Registry as god object**: If the registry starts holding runtime state (current health, cooldown timers) alongside static definitions, it is doing too much. Registries hold *definitions*; runtime state belongs in the game state.
- **String-keyed lookups without type safety**: Using `Record<string, ...>` instead of `Record<TowerType, ...>` means typos like `'archr'` compile fine and fail silently at runtime. Use union types as keys.
