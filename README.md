# Canvas Game Arcade

A multi-game arcade platform with **50 playable games** built with TypeScript and HTML5 Canvas (Vite).

## Quick Start

```bash
pnpm install
pnpm dev        # http://localhost:3000
pnpm build      # production build
```

## Games (50)

### Arcade (16)
| Game | Description |
|------|-------------|
| Snake | Eat food, grow longer, avoid yourself |
| Breakout | Paddle + ball, break bricks, powerups |
| Asteroids | Rotate, thrust, shoot splitting rocks |
| Space Invaders | Shoot descending aliens, shield cover |
| Flappy Bird | Tap to fly through pipe gaps |
| Tetris | Stack blocks, clear lines |
| Whack-a-Mole | Timed reflex clicking |
| Helicopter | One-button cave scroller |
| Pong | Paddle tennis vs AI or 2-player |
| Pac-Man | Eat dots, avoid/eat ghosts |
| Doodle Jump | Endless vertical platform jumping |
| Rhythm Tap | Tap shrinking circles in time |
| Reaction Timer | Test your reflexes (red/green screen) |
| Balloon Pop | Click balloons before they escape |
| Color Switch | Pass through matching color gates |
| Frogger | Cross roads and rivers |
| Typing Speed | Type falling words |

### Action (9)
| Game | Description |
|------|-------------|
| Tower Defense | Place towers, survive enemy waves |
| Platformer | Jump, collect coins, stomp enemies |
| Top-Down Shooter | WASD + mouse aim, wave survival |
| Zombie Survival | Day/night cycle, barricades, limited ammo |
| Racing | Top-down track with AI opponents |
| Fruit Ninja | Slice flying fruit, avoid bombs |
| Lava Floor | Platforms sink into lava, keep jumping |
| Basketball | Drag to aim, physics arc shooting |
| Golf | Top-down mini golf, 9 holes |

### Puzzle (14)
| Game | Description |
|------|-------------|
| Physics Puzzle | Place pieces, simulate gravity |
| Minesweeper | Reveal cells, flag mines |
| Match-3 | Swap gems, cascade combos |
| 2048 | Slide + merge number tiles |
| Sokoban | Push boxes onto targets |
| Maze Runner | Fog of war, timed procedural mazes |
| Word Search | Find hidden words in letter grid |
| Sudoku | 9x9 number placement, 3 difficulties |
| Pipe Connect | Rotate pipes to connect water flow |
| Lights Out | Toggle adjacent lights off |
| Memory Match | Flip cards to find pairs |
| Simon Says | Repeat growing color sequences |
| Gravity Ball | Toggle gravity direction to solve |
| Hangman | Guess the word letter by letter |

### Strategy (5)
| Game | Description |
|------|-------------|
| City Builder | Manage population, food, power, happiness |
| Card Battle | Draw cards, defeat AI enemies |
| Ant Colony | Emergent ant simulation |
| Tic-Tac-Toe | Unbeatable minimax AI |
| Connect Four | Drop discs, connect 4 vs AI |

### Chill (6)
| Game | Description |
|------|-------------|
| Fishing | Cast, hook timing, reel tension |
| Idle Clicker | Click + buy upgrades, persistent |
| Particle Sand | Sand/water/fire cellular automata |
| Brick Builder | LEGO-like creative stacking |
| Pixel Art | Draw pixel art with palette |

## Project Structure

```
src/
├── main.ts                     # Platform entry point
├── platform/
│   ├── GameRegistry.ts         # Record<GameCategory, GameDefinition[]>
│   ├── GameLauncher.ts         # Create/destroy game instances
│   └── PlatformMenu.ts        # Game selector with category tabs
├── shared/
│   ├── GameInterface.ts        # GameDefinition + GameInstance + GameHelp
│   ├── HelpOverlay.ts          # Shared in-game help renderer
│   ├── Updatable.ts            # System interface
│   ├── Renderable.ts           # Renderer interface
│   └── InputHandler.ts         # Input handler interface
└── games/
    └── <game-name>/            # Each game is self-contained
        ├── index.ts            # GameDefinition export
        ├── types.ts            # Game-specific types + constants
        ├── <Game>Engine.ts     # Game loop orchestrator
        ├── adapters/
        │   └── PlatformAdapter.ts
        ├── systems/            # Game logic (Updatable)
        ├── renderers/          # Drawing (Renderable)
        └── data/               # Static data (levels, words, etc.)
```

## Adding a New Game

### 1. Create the game folder

```bash
mkdir -p src/games/my-game/{systems,renderers,adapters,data}
```

### 2. Define types

```typescript
// src/games/my-game/types.ts
export interface MyGameState {
  score: number;
  // ... your game state
}
```

### 3. Create systems

Each system implements `Updatable<MyGameState>`:

```typescript
// src/games/my-game/systems/PhysicsSystem.ts
import type { Updatable } from '@shared/Updatable';
import type { MyGameState } from '../types';

export class PhysicsSystem implements Updatable<MyGameState> {
  update(state: MyGameState, dt: number): void {
    // game logic here
  }
}
```

### 4. Create renderers

Each renderer implements `Renderable<MyGameState>`:

```typescript
// src/games/my-game/renderers/GameRenderer.ts
import type { Renderable } from '@shared/Renderable';
import type { MyGameState } from '../types';

export class GameRenderer implements Renderable<MyGameState> {
  render(ctx: CanvasRenderingContext2D, state: MyGameState): void {
    // draw here
  }
}
```

### 5. Create input handler

```typescript
// src/games/my-game/systems/InputSystem.ts
import type { InputHandler } from '@shared/InputHandler';

export class InputSystem implements InputHandler {
  attach(): void { /* add event listeners */ }
  detach(): void { /* remove event listeners */ }
}
```

### 6. Create the engine

Wire systems + renderers in a `requestAnimationFrame` loop.

### 7. Create the adapter

```typescript
// src/games/my-game/adapters/PlatformAdapter.ts
import type { GameInstance } from '@shared/GameInterface';
import { MyGameEngine } from '../MyGameEngine';

export class PlatformAdapter implements GameInstance {
  private engine: MyGameEngine;
  constructor(canvas: HTMLCanvasElement, onExit: () => void) {
    this.engine = new MyGameEngine(canvas, onExit);
  }
  start(): void { this.engine.start(); }
  destroy(): void { this.engine.destroy(); }
}
```

### 8. Export the GameDefinition

```typescript
// src/games/my-game/index.ts
import type { GameDefinition } from '@shared/GameInterface';
import { PlatformAdapter } from './adapters/PlatformAdapter';

export const MyGame: GameDefinition = {
  id: 'my-game',
  name: 'My Game',
  description: 'Short description',
  icon: '🎮',
  color: '#ff5722',
  category: 'arcade',  // arcade | action | puzzle | strategy | chill
  help: {
    goal: 'What the player needs to do.',
    controls: [
      { key: 'Arrow Keys', action: 'Move' },
      { key: 'Space', action: 'Action' },
      { key: 'ESC', action: 'Exit to menu' },
    ],
    tips: [
      'Helpful tip for new players',
    ],
  },
  create(canvas, onExit) {
    const inst = new PlatformAdapter(canvas, onExit);
    inst.start();
    return inst;
  },
};
```

### 9. Register in the GameRegistry

```typescript
// src/platform/GameRegistry.ts
import { MyGame } from '@games/my-game';

// Add to the appropriate category array:
export const GAME_REGISTRY: Record<GameCategory, GameDefinition[]> = {
  arcade: [
    // ...existing games
    MyGame,
  ],
};
```

### Checklist

- [ ] All event listeners removed in `destroy()` / `detach()`
- [ ] Uses `@shared/...` path aliases (not relative `../../shared/`)
- [ ] No constructor parameter properties (`erasableSyntaxOnly`)
- [ ] `help` field with goal, controls, and tips
- [ ] `category` field set
- [ ] `ESC` key exits to platform menu
- [ ] `npx tsc --noEmit` passes with zero errors

## Path Aliases

| Alias | Maps to |
|-------|---------|
| `@shared/*` | `src/shared/*` |
| `@platform/*` | `src/platform/*` |
| `@games/*` | `src/games/*` |

## Architecture (SOLID)

| Principle | Application |
|-----------|-------------|
| **Single Responsibility** | Each system/renderer does one thing |
| **Open/Closed** | New mechanics = new system files |
| **Liskov Substitution** | All games implement `GameInstance` |
| **Interface Segregation** | `Updatable`, `Renderable`, `InputHandler` |
| **Dependency Inversion** | Systems depend on state interfaces, not engine |

## Contributing

1. Fork the repo
2. Create a feature branch: `git checkout -b feat/my-new-game`
3. Add your game following the steps above
4. Ensure `npx tsc --noEmit` and `pnpm build` pass
5. Commit with descriptive message: `feat: add My Game (#N) — short description`
6. Open a pull request

### Guidelines

- **One game per PR** for clean review
- **SOLID architecture** — separate systems, renderers, adapters
- **Clean up listeners** — all event handlers must be removed on `destroy()`
- **Help data required** — every game needs `goal`, `controls`, and `tips`
- **No external dependencies** — pure TypeScript + Canvas API only
- **Test locally** — run `pnpm dev`, verify the game launches, plays, and exits cleanly

## Tech Stack

- **TypeScript** — strict mode, zero errors
- **Vite** — dev server + production build
- **HTML5 Canvas** — all rendering
- **No frameworks** — pure vanilla TS

## License

MIT
