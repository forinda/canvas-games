# Step 7: Upgrades & Polish

**Goal:** Weapon upgrades, wave counter, death screen, help overlay, and final polish.

**Time:** ~15 minutes

---

## What You'll Build

- **Help overlay** toggled with H showing all controls, tips, and the game goal
- **Complete game over screen** with wave count, score, kills, and restart/exit options
- **Restart flow** that resets all state cleanly on R key press
- **Exit flow** with Escape key to return to the game launcher
- **Full system integration** -- every system wired into the final engine
- **The complete, polished game** matching the source at `src/contexts/canvas2d/games/zombie-survival/`

---

## Concepts

- **Help Overlay Pattern**: A toggleable overlay that pauses gameplay and displays controls. The `HelpOverlay` class tracks a `visible` boolean. When visible, `update()` returns early (freezing game logic) but `render()` still runs (drawing the overlay on top).
- **Clean Restart**: On game over, pressing R calls `createInitialState()` to produce a fresh `GameState`. Because the state is a plain object with no circular references, this is a complete reset -- no zombie ghosts, no leftover particles, no stale timers.
- **System Execution Order**: The final update pipeline is: `InputSystem.snapshot()` -> pause/help checks -> `PlayerSystem` -> `WaveSystem` -> `ZombieSystem` -> `CombatSystem`. This order ensures input is fresh, waves spawn before zombies move, and collisions resolve after all movement.
- **Render Layering**: The render pipeline is: dark background -> `GameRenderer` (arena, barricades, bullets, zombies, player, particles, flashlight) -> `HUDRenderer` (top bar, wave info, cycle bar, hints, pause/gameover overlays) -> `HelpOverlay`. Each layer draws on top of the previous.

---

## Code

### 1. Final Engine

**File:** `src/contexts/canvas2d/games/zombie-survival/ZombieEngine.ts`

The complete engine with all systems, help overlay, restart, and exit support.

```typescript
import type { GameState } from './types.ts';
import { ARENA_W, ARENA_H, MAX_AMMO, DAY_DURATION } from './types.ts';

import { InputSystem } from './systems/InputSystem.ts';
import { PlayerSystem } from './systems/PlayerSystem.ts';
import { ZombieSystem } from './systems/ZombieSystem.ts';
import { CombatSystem } from './systems/CombatSystem.ts';
import { WaveSystem } from './systems/WaveSystem.ts';
import { GameRenderer } from './renderers/GameRenderer.ts';
import { HUDRenderer } from './renderers/HUDRenderer.ts';
import { HelpOverlay } from '@shared/HelpOverlay.ts';
import type { GameHelp } from '@core/GameInterface';

const GAME_HELP: GameHelp = {
  goal: 'Survive as many zombie waves as possible. Day = scavenge, Night = fight!',
  controls: [
    { key: 'W/A/S/D', action: 'Move player' },
    { key: 'Mouse', action: 'Aim flashlight / weapon' },
    { key: 'Click', action: 'Shoot' },
    { key: 'E', action: 'Place barricade (costs resources)' },
    { key: 'P / ESC', action: 'Pause' },
    { key: 'H', action: 'Toggle help' },
    { key: 'R', action: 'Restart (game over only)' },
  ],
  tips: [
    'During the day you auto-scavenge ammo and resources',
    'Place barricades to slow zombies before nightfall',
    'Runners are fast but fragile. Tanks are slow but tough',
    'Your flashlight cone is the only visibility at night',
    'Conserve ammo - headcount increases each wave',
  ],
};

export class ZombieEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private state: GameState;

  private inputSystem: InputSystem;
  private playerSystem: PlayerSystem;
  private zombieSystem: ZombieSystem;
  private combatSystem: CombatSystem;
  private waveSystem: WaveSystem;
  private gameRenderer: GameRenderer;
  private hudRenderer: HUDRenderer;
  private helpOverlay: HelpOverlay;

  private lastTime = 0;
  private rafId = 0;
  private running = false;
  private onExit: () => void;

  private resizeHandler: () => void;
  private restartHandler: (e: KeyboardEvent) => void;

  constructor(canvas: HTMLCanvasElement, onExit: () => void) {
    this.canvas = canvas;
    this.onExit = onExit;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2D context');
    this.ctx = ctx;

    this.state = this.createInitialState();

    this.inputSystem = new InputSystem(canvas, () => this.state);
    this.playerSystem = new PlayerSystem();
    this.zombieSystem = new ZombieSystem();
    this.combatSystem = new CombatSystem();
    this.waveSystem = new WaveSystem();
    this.gameRenderer = new GameRenderer();
    this.hudRenderer = new HUDRenderer();
    this.helpOverlay = new HelpOverlay();

    this.resizeHandler = () => this.handleResize();
    this.restartHandler = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'r' && this.state.screen === 'gameover') {
        this.state = this.createInitialState();
      }

      if (e.key === 'Escape' && this.state.screen === 'gameover') {
        this.onExit();
      }
    };
  }

  private createInitialState(): GameState {
    return {
      screen: 'playing',
      player: {
        x: ARENA_W / 2,
        y: ARENA_H / 2,
        angle: 0,
        hp: 100,
        maxHp: 100,
        ammo: MAX_AMMO,
        maxAmmo: MAX_AMMO,
        resources: 40,
        shootCooldown: 0,
        invincibleTimer: 0,
      },
      zombies: [],
      bullets: [],
      barricades: [],
      particles: [],
      wave: 0,
      timeOfDay: 'day',
      cycleTimer: DAY_DURATION,
      zombiesRemainingInWave: 0,
      spawnTimer: 0,
      spawnQueue: [],
      score: 0,
      nextId: 1,
      totalKills: 0,
    };
  }

  private handleResize(): void {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  start(): void {
    this.running = true;
    this.handleResize();
    window.addEventListener('resize', this.resizeHandler);
    window.addEventListener('keydown', this.restartHandler);
    this.inputSystem.attach();
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  private loop(timestamp: number): void {
    if (!this.running) return;

    const dt = Math.min((timestamp - this.lastTime) / 1000, 0.05);
    this.lastTime = timestamp;

    this.update(dt);
    this.render();

    this.rafId = requestAnimationFrame((t) => this.loop(t));
  }

  private update(dt: number): void {
    const input = this.inputSystem.snapshot();

    // Handle pause toggle
    if (input.pause) {
      if (this.state.screen === 'playing') {
        this.state.screen = 'paused';
        return;
      } else if (this.state.screen === 'paused') {
        this.state.screen = 'playing';
        return;
      }
    }

    // Handle help toggle
    if (input.help) {
      this.helpOverlay.toggle();
    }

    if (this.state.screen !== 'playing') return;

    if (this.helpOverlay.visible) return;

    this.playerSystem.setInput(input);
    this.playerSystem.update(this.state, dt);
    this.waveSystem.update(this.state, dt);
    this.zombieSystem.update(this.state, dt);
    this.combatSystem.update(this.state, dt);
  }

  private render(): void {
    const { ctx, canvas } = this;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Dark background
    ctx.fillStyle = '#080a08';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    this.gameRenderer.render(ctx, this.state);
    this.hudRenderer.render(ctx, this.state);
    this.helpOverlay.render(ctx, GAME_HELP, 'Zombie Survival', '#27ae60');
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
    window.removeEventListener('resize', this.resizeHandler);
    window.removeEventListener('keydown', this.restartHandler);
    this.inputSystem.detach();
  }
}
```

**What's happening:**
- The `GAME_HELP` constant defines the help overlay content: a one-line goal, a list of controls with their keys, and gameplay tips. This is passed to `helpOverlay.render()` each frame.
- `helpOverlay.toggle()` is called when the H key is pressed. When visible, the `if (this.helpOverlay.visible) return` guard prevents any game systems from updating, effectively pausing gameplay.
- The render pipeline calls all three renderers in order: `gameRenderer` (arena + entities), `hudRenderer` (stats + overlays), `helpOverlay` (if visible). Each layer composites on top.
- The `restartHandler` is a separate `keydown` listener (not part of `InputSystem`) because it needs to work even on the game over screen when the normal input snapshot flow is not processing.

---

### 2. Final Platform Adapter

**File:** `src/contexts/canvas2d/games/zombie-survival/adapters/PlatformAdapter.ts`

The adapter implements the `GameInstance` interface for the launcher.

```typescript
import type { GameInstance } from '@core/GameInterface';
import { ZombieEngine } from '../ZombieEngine.ts';

export class PlatformAdapter implements GameInstance {
  private engine: ZombieEngine;

  constructor(canvas: HTMLCanvasElement, onExit: () => void) {
    this.engine = new ZombieEngine(canvas, onExit);
  }

  start(): void {
    this.engine.start();
  }

  destroy(): void {
    this.engine.stop();
  }
}
```

**What's happening:**
- `PlatformAdapter` implements the `GameInstance` interface (`start()` and `destroy()`), making the game compatible with the launcher's create/destroy lifecycle.
- `destroy()` calls `engine.stop()`, which cancels the animation frame, removes event listeners, and detaches input. This prevents memory leaks when switching games.

---

### 3. Final Entry Point

**File:** `src/contexts/canvas2d/games/zombie-survival/index.ts`

Exports the game definition for the launcher registry.

```typescript
import type { GameDefinition, GameInstance } from '@core/GameInterface';
import { PlatformAdapter } from './adapters/PlatformAdapter.ts';

export const ZombieSurvivalGame: GameDefinition = {
  id: 'zombie-survival',
  category: 'action' as const,
  name: 'Zombie Survival',
  description: 'Survive waves of zombies in a dark arena with limited ammo!',
  icon: '\uD83E\uDDDF',
  color: '#27ae60',
  help: {
    goal: 'Survive as many zombie waves as possible. Day = scavenge, Night = fight!',
    controls: [
      { key: 'W/A/S/D', action: 'Move player' },
      { key: 'Mouse', action: 'Aim flashlight / weapon' },
      { key: 'Click', action: 'Shoot' },
      { key: 'E', action: 'Place barricade (costs resources)' },
      { key: 'P / ESC', action: 'Pause' },
      { key: 'H', action: 'Toggle help overlay' },
      { key: 'R', action: 'Restart (game over screen)' },
    ],
    tips: [
      'During the day you auto-scavenge ammo and resources',
      'Place barricades before nightfall to slow zombies',
      'Runners are fast but fragile, Tanks are slow but tough',
      'Your flashlight cone is the only light at night',
      'Conserve ammo - zombie count increases each wave',
    ],
  },
  create(canvas: HTMLCanvasElement, onExit: () => void): GameInstance {
    const instance = new PlatformAdapter(canvas, onExit);
    instance.start();
    return instance;
  },
};
```

**What's happening:**
- `GameDefinition` provides metadata (id, name, description, icon, color) for the launcher's game selection screen.
- The `help` field is a standalone copy of the game help, used by the launcher's own help system (separate from the in-game `HelpOverlay`).
- `create()` is a factory function: the launcher calls it with a canvas and exit callback, and gets back a `GameInstance` with `start()` and `destroy()` methods.

---

## Test It

1. **Run:** `npm run dev`
2. **Open:** the Zombie Survival game from the launcher
3. **Complete gameplay test:**
   - **Day phase**: move around, watch ammo/resources/HP regenerate
   - **Place barricades** with E during day to prepare defenses
   - **Night falls**: darkness overlay with flashlight cone activates
   - **Survive wave 1**: 5 walkers spawn from edges, shoot them
   - **Clear the wave** to return to day early (bonus scavenge time)
   - **Wave 2+**: runners (red, fast) appear alongside walkers
   - **Wave 4+**: tanks (purple, big HP) join the horde
   - Zombies **target barricades** when they are closer -- watch them attack and destroy them
   - **HP bar** changes color as health decreases (green -> yellow -> red)
   - **Press H** -- help overlay appears with all controls and tips
   - **Press H again** -- overlay dismisses, game resumes
   - **Press P** -- game pauses with overlay
   - **Let HP reach 0** -- "GAME OVER" screen with score and kills
   - **Press R** -- full restart with clean state
   - **Press Escape on game over** -- exits to launcher
4. **Visual polish check:**
   - Flashlight cone with warm glow at night
   - Blood particles on zombie hits (dark red)
   - Wood splinter particles on barricade hits (brown)
   - Particle fade-out and 200-particle cap
   - Cycle progress bar (orange for day, purple for night)
   - Zombies remaining counter during night

---

## Challenges

**Easy:**
- Adjust the starting resources from 40 to 60 for an easier start.
- Change the game accent color from `#27ae60` to another color in the entry point.

**Medium:**
- Add a "wave survived" bonus: award 50 bonus score points each time the player clears a wave (all zombies dead before night ends).

**Hard:**
- Implement a weapon upgrade system: after every 3 waves, offer the player a choice between increased damage (+10), faster fire rate (-0.03s cooldown), or more max ammo (+10). Display the choice as a modal between night and day.

---

## What You Learned

- Integrating a help overlay that pauses gameplay without breaking state
- Implementing clean restart by reconstructing the entire state object
- Wiring an exit callback so the game integrates with a multi-game launcher
- Structuring a complete game with systems (Input, Player, Zombie, Combat, Wave), renderers (Game, HUD), and adapters (Platform)
- Building a game definition with metadata, help content, and a factory function

---

## Complete Architecture

Here is the final file structure of the Zombie Survival game:

```
src/contexts/canvas2d/games/zombie-survival/
  types.ts                        # Constants, interfaces, GameState
  ZombieEngine.ts                 # Main engine: loop, update, render
  index.ts                        # GameDefinition export for launcher
  adapters/
    PlatformAdapter.ts            # GameInstance wrapper
  data/
    zombies.ts                    # ZombieDef table (walker, runner, tank)
    waves.ts                      # Wave spawn formulas + HP multiplier
  renderers/
    GameRenderer.ts               # Arena, entities, flashlight overlay
    HUDRenderer.ts                # Top bar, wave info, cycle bar, overlays
  systems/
    InputSystem.ts                # Keyboard + mouse -> InputSnapshot
    PlayerSystem.ts               # Movement, shooting, barricade placement
    ZombieSystem.ts               # Chase AI, barricade targeting
    CombatSystem.ts               # Bullet/zombie/barricade collisions, particles
    WaveSystem.ts                 # Day/night cycle, spawning, scavenging
```

**Congratulations!** You have built a complete top-down zombie survival game with WASD movement, mouse aiming, shooting mechanics, three zombie types with chase AI, destructible barricades, resource management, a day/night cycle with flashlight visibility, wave scaling, and full game-over/restart flow.

**Next Game:** Continue to [City Builder](../45-city-builder/README.md) -- where you will learn grid placement, resource economies, and simulation loops!
