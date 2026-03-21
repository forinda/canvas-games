# Step 5: Score, Death & Polish

**Goal:** Display the score HUD, detect death when the player falls below the camera, persist the high score to localStorage, and add a game over screen with restart.

**Time:** ~15 minutes

---

## What You'll Build

Final additions:
- **Score HUD**: Current score and best score displayed in the top-left corner
- **Death detection**: Falling below the camera viewport triggers game over
- **High score persistence**: Best score saved to `localStorage` and loaded on startup
- **Game over overlay**: Dimmed screen with score panel, "NEW BEST" callout, and restart prompt
- **Idle screen**: Title, pulsing start prompt, and controls hint
- **Reset flow**: Press Space or Enter to restart after death

---

## Concepts

- **localStorage for Persistence**: Simple key-value storage that survives page reloads. Wrap in try/catch because it can throw in private browsing or when storage is full.
- **Game Phase State Machine**: `idle` -> `playing` -> `dead` -> `idle`. Each phase determines what gets updated and rendered.
- **HUD Rendering**: Drawn after restoring the camera transform so it stays fixed on screen regardless of scroll position.

---

## Code

### 1. Create the HUD Renderer

**File:** `src/contexts/canvas2d/games/doodle-jump/renderers/HUDRenderer.ts`

Draw score, idle overlay, and game over screen:

```typescript
import type { DoodleState } from '../types';

export class HUDRenderer {
  render(ctx: CanvasRenderingContext2D, state: DoodleState): void {
    const { phase } = state;

    if (phase === 'playing') {
      this.drawScore(ctx, state);
    } else if (phase === 'idle') {
      this.drawIdleOverlay(ctx, state);
    } else if (phase === 'dead') {
      this.drawScore(ctx, state);
      this.drawDeathOverlay(ctx, state);
    }
  }

  private drawScore(ctx: CanvasRenderingContext2D, state: DoodleState): void {
    const text = `Score: ${state.score}`;

    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    // White outline for readability over any background
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    ctx.strokeText(text, 16, 16);

    ctx.fillStyle = '#333';
    ctx.fillText(text, 16, 16);

    // Best score
    if (state.highScore > 0) {
      const best = `Best: ${state.highScore}`;
      ctx.strokeText(best, 16, 42);
      ctx.fillStyle = '#66bb6a';
      ctx.fillText(best, 16, 42);
    }
  }

  private drawIdleOverlay(ctx: CanvasRenderingContext2D, state: DoodleState): void {
    const cx = state.canvasW / 2;

    // Title
    ctx.font = 'bold 42px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 5;
    ctx.lineJoin = 'round';
    ctx.strokeText('Doodle Jump', cx, state.canvasH * 0.22);
    ctx.fillStyle = '#388e3c';
    ctx.fillText('Doodle Jump', cx, state.canvasH * 0.22);

    // Pulsing start prompt
    const alpha = 0.5 + 0.5 * Math.sin(performance.now() * 0.004);
    ctx.globalAlpha = alpha;
    ctx.font = 'bold 18px monospace';
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.strokeText('Press any key to start', cx, state.canvasH * 0.55);
    ctx.fillStyle = '#555';
    ctx.fillText('Press any key to start', cx, state.canvasH * 0.55);
    ctx.globalAlpha = 1;

    // Controls hint
    ctx.font = '14px monospace';
    ctx.fillStyle = '#888';
    ctx.fillText('Arrow Keys or A/D to move', cx, state.canvasH * 0.62);

    // High score
    if (state.highScore > 0) {
      ctx.font = 'bold 18px monospace';
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 3;
      ctx.strokeText(`Best: ${state.highScore}`, cx, state.canvasH * 0.70);
      ctx.fillStyle = '#66bb6a';
      ctx.fillText(`Best: ${state.highScore}`, cx, state.canvasH * 0.70);
    }
  }

  private drawDeathOverlay(ctx: CanvasRenderingContext2D, state: DoodleState): void {
    const cx = state.canvasW / 2;
    const cy = state.canvasH / 2;

    // Dim overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.fillRect(0, 0, state.canvasW, state.canvasH);

    // Panel
    const panelW = 260;
    const panelH = 200;
    const px = cx - panelW / 2;
    const py = cy - panelH / 2;

    ctx.fillStyle = '#faf8ef';
    ctx.strokeStyle = '#66bb6a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(px, py, panelW, panelH, 12);
    ctx.fill();
    ctx.stroke();

    // Game Over title
    ctx.font = 'bold 32px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#c62828';
    ctx.fillText('Game Over', cx, py + 40);

    // Final score
    ctx.font = 'bold 22px monospace';
    ctx.fillStyle = '#333';
    ctx.fillText(`Score: ${state.score}`, cx, cy + 5);

    // Best score
    ctx.font = 'bold 18px monospace';
    ctx.fillStyle = '#66bb6a';
    ctx.fillText(`Best: ${state.highScore}`, cx, cy + 35);

    // New best callout
    if (state.score > 0 && state.score >= state.highScore) {
      ctx.font = 'bold 14px monospace';
      ctx.fillStyle = '#f44336';
      ctx.fillText('NEW BEST!', cx, cy + 58);
    }

    // Pulsing restart prompt
    const alpha = 0.5 + 0.5 * Math.sin(performance.now() * 0.004);
    ctx.globalAlpha = alpha;
    ctx.font = 'bold 16px monospace';
    ctx.fillStyle = '#555';
    ctx.fillText('Press Space to Restart', cx, py + panelH - 25);
    ctx.globalAlpha = 1;
  }
}
```

**Rendering tricks:**
- Text has a white stroke drawn first, then a colored fill on top. This ensures readability over any background -- the graph paper, platforms, or the dim overlay.
- The pulsing effect uses `Math.sin(performance.now() * 0.004)` to oscillate alpha between 0 and 1. The `0.004` multiplier gives a smooth ~1.5-second cycle.
- The game over panel is a rounded rectangle with a green border matching the game's theme.

---

### 2. Update the Collision System

**File:** `src/contexts/canvas2d/games/doodle-jump/systems/CollisionSystem.ts`

Add death detection and high score saving:

```typescript
import type { DoodleState } from '../types';
import { JUMP_FORCE, SPRING_FORCE, HS_KEY } from '../types';

export class CollisionSystem {
  update(state: DoodleState, _dt: number): void {
    if (state.phase !== 'playing') return;

    const p = state.player;

    // Only check collisions when falling
    if (p.vy <= 0) return;

    const playerBottom = p.y + p.height;
    const playerLeft = p.x;
    const playerRight = p.x + p.width;

    for (const plat of state.platforms) {
      if (plat.broken) continue;

      const platTop = plat.y;
      const platBottom = plat.y + plat.height;
      const platLeft = plat.x;
      const platRight = plat.x + plat.width;

      const verticalOverlap =
        playerBottom >= platTop &&
        playerBottom <= platBottom + p.vy * 16;

      const horizontalOverlap =
        playerRight > platLeft &&
        playerLeft < platRight;

      if (verticalOverlap && horizontalOverlap) {
        p.y = platTop - p.height;

        if (plat.type === 'breaking') {
          plat.broken = true;
          plat.breakVy = 0.05;
          continue;
        }

        if (plat.type === 'spring') {
          p.vy = SPRING_FORCE;
          plat.springTimer = 300;
        } else {
          p.vy = JUMP_FORCE;
        }

        return;
      }
    }

    // Check if player fell below camera view -> game over
    const deathLine = state.cameraY + state.canvasH + 50;
    if (p.y > deathLine) {
      state.phase = 'dead';

      // Save high score
      if (state.score > state.highScore) {
        state.highScore = state.score;
        try {
          localStorage.setItem(HS_KEY, String(state.highScore));
        } catch {
          /* localStorage may be unavailable in private browsing */
        }
      }
    }
  }
}
```

The death check sits at the bottom of `update()`, after the platform collision loop. If no platform caught the player and they have fallen 50px below the visible area, the game transitions to the `dead` phase.

The `+ 50` buffer means the player visually falls off-screen before the game over triggers. Without it, the game over panel would appear while the player's feet are still visible, which feels abrupt.

**High score flow:**
1. Compare `state.score` to `state.highScore`
2. If it is higher, update the in-memory value
3. Persist to `localStorage` with a try/catch (private browsing mode throws)
4. On next game launch, the engine constructor reads the stored value back

---

### 3. Update the Game Engine

**File:** `src/contexts/canvas2d/games/doodle-jump/DoodleEngine.ts`

Add the HUD renderer, high score loading, and reset logic:

```typescript
import type { DoodleState } from './types';
import { PLAYER_WIDTH, PLAYER_HEIGHT, HS_KEY } from './types';
import { InputSystem } from './systems/InputSystem';
import { PhysicsSystem } from './systems/PhysicsSystem';
import { PlatformSystem } from './systems/PlatformSystem';
import { CollisionSystem } from './systems/CollisionSystem';
import { GameRenderer } from './renderers/GameRenderer';
import { HUDRenderer } from './renderers/HUDRenderer';

export class DoodleEngine {
  private ctx: CanvasRenderingContext2D;
  private state: DoodleState;
  private running: boolean;
  private rafId: number;
  private lastTime: number;

  private inputSystem: InputSystem;
  private physicsSystem: PhysicsSystem;
  private platformSystem: PlatformSystem;
  private collisionSystem: CollisionSystem;
  private gameRenderer: GameRenderer;
  private hudRenderer: HUDRenderer;
  private resizeHandler: () => void;

  constructor(canvas: HTMLCanvasElement, onExit: () => void) {
    this.ctx = canvas.getContext('2d')!;
    this.running = false;
    this.rafId = 0;
    this.lastTime = 0;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Load persisted high score
    let hs = 0;
    try {
      hs = parseInt(localStorage.getItem(HS_KEY) ?? '0', 10) || 0;
    } catch {
      /* noop */
    }

    this.platformSystem = new PlatformSystem();
    this.state = this.createInitialState(canvas.width, canvas.height, hs);

    this.physicsSystem = new PhysicsSystem();
    this.collisionSystem = new CollisionSystem();
    this.gameRenderer = new GameRenderer();
    this.hudRenderer = new HUDRenderer();
    this.inputSystem = new InputSystem(
      this.state,
      onExit,
      () => this.reset(),
    );

    this.resizeHandler = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      this.state.canvasW = canvas.width;
      this.state.canvasH = canvas.height;
    };

    this.inputSystem.attach();
    window.addEventListener('resize', this.resizeHandler);
  }

  start(): void {
    this.running = true;
    this.lastTime = performance.now();
    this.loop();
  }

  destroy(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
    this.inputSystem.detach();
    window.removeEventListener('resize', this.resizeHandler);
  }

  private loop(): void {
    if (!this.running) return;

    const now = performance.now();
    const dt = Math.min(now - this.lastTime, 32);
    this.lastTime = now;

    this.update(dt);
    this.render();

    this.rafId = requestAnimationFrame(() => this.loop());
  }

  private update(dt: number): void {
    this.inputSystem.applyMovement();
    this.physicsSystem.update(this.state, dt);
    this.platformSystem.update(this.state, dt);
    this.collisionSystem.update(this.state, dt);
  }

  private render(): void {
    this.ctx.clearRect(0, 0, this.state.canvasW, this.state.canvasH);
    this.gameRenderer.render(this.ctx, this.state);
    this.hudRenderer.render(this.ctx, this.state);
  }

  private reset(): void {
    const hs = this.state.highScore;
    const w = this.state.canvasW;
    const h = this.state.canvasH;
    const newState = this.createInitialState(w, h, hs);
    newState.phase = 'idle';

    // Copy into existing state object so InputSystem's reference stays valid
    Object.assign(this.state, newState);
  }

  private createInitialState(
    canvasW: number,
    canvasH: number,
    highScore: number,
  ): DoodleState {
    return {
      player: {
        x: canvasW / 2 - PLAYER_WIDTH / 2,
        y: canvasH - 120,
        vx: 0,
        vy: 0,
        width: PLAYER_WIDTH,
        height: PLAYER_HEIGHT,
        facingRight: true,
      },
      platforms: this.platformSystem.generateInitial(canvasW, canvasH),
      phase: 'idle',
      score: 0,
      highScore,
      canvasW,
      canvasH,
      cameraY: 0,
      maxHeight: 0,
    };
  }
}
```

**The reset trick:** `Object.assign(this.state, newState)` copies all properties from the fresh state into the existing state object. This is critical because `InputSystem` holds a reference to `this.state`. If we replaced the object entirely (`this.state = newState`), the input system would still point at the old, stale state. By mutating in place, every system sees the reset immediately.

---

### 4. Update the Game Export

**File:** `src/contexts/canvas2d/games/doodle-jump/index.ts`

Add the complete help information:

```typescript
import type { GameDefinition } from '@core/GameInterface';
import { PlatformAdapter } from './adapters/PlatformAdapter';

export const DoodleJumpGame: GameDefinition = {
  id: 'doodle-jump',
  category: 'arcade' as const,
  name: 'Doodle Jump',
  description: 'Bounce your way to the top in this endless vertical scroller!',
  icon: '🐸',
  color: '#66bb6a',
  help: {
    goal: 'Jump from platform to platform and climb as high as you can without falling.',
    controls: [
      { key: 'Arrow Left / A', action: 'Move left' },
      { key: 'Arrow Right / D', action: 'Move right' },
      { key: 'Space / Enter', action: 'Restart after game over' },
      { key: 'ESC', action: 'Exit to menu' },
    ],
    tips: [
      'Green platforms are safe — they always hold your weight',
      'Blue platforms move horizontally — time your landing',
      'Brown platforms break after one use — keep moving!',
      'Red platforms have springs — they launch you extra high',
      'You wrap around the screen edges — use this to your advantage',
    ],
  },
  create(canvas, onExit) {
    const instance = new PlatformAdapter(canvas, onExit);
    instance.start();
    return instance;
  },
};
```

---

## Test It

1. **Run:** `npm run dev`
2. **Navigate:** Select "Doodle Jump"
3. **Observe:**
   - **Idle screen**: "Doodle Jump" title, pulsing "Press any key to start", controls hint, and high score (if any)
   - **Playing**: Score and best score displayed in the top-left. Numbers update as you climb.
   - **Death**: Fall below the screen. A dimmed overlay appears with a panel showing your score, best score, and "NEW BEST!" if applicable. "Press Space to Restart" pulses at the bottom.
   - **Restart**: Press Space or Enter. The game resets to the idle screen with your high score preserved.
   - **Persistence**: Refresh the page. Your high score is still there.
   - **Graph paper background**: The grid scrolls smoothly with the camera, giving a notebook feel.

---

## Complete File Summary

Here is every file in the final game and what it does:

| File | Purpose |
|------|---------|
| `types.ts` | Interfaces, type aliases, and all numeric constants |
| `DoodleEngine.ts` | Game loop, state creation, reset logic, system wiring |
| `systems/InputSystem.ts` | Keyboard input, phase transitions, movement application |
| `systems/PhysicsSystem.ts` | Gravity, friction, position updates, screen wrapping |
| `systems/PlatformSystem.ts` | Camera scroll, platform updates, cleanup, generation |
| `systems/CollisionSystem.ts` | Landing detection, platform type responses, death check |
| `renderers/GameRenderer.ts` | Background, platforms (4 types), player character |
| `renderers/HUDRenderer.ts` | Score, idle overlay, game over panel |
| `adapters/PlatformAdapter.ts` | Adapter between framework and engine |
| `index.ts` | Game definition export with metadata and help text |

---

## Challenges

**Easy:**
- Change the game over panel border color to red
- Add the current date and time to the game over panel
- Make the "NEW BEST!" text flash between red and gold

**Medium:**
- Add a "height meter" on the right edge of the screen -- a thin bar that fills as you climb
- Save the top 5 scores (not just the best) and display them on the idle screen
- Add a subtle parallax effect: draw a second, larger grid behind the main grid that scrolls at half speed

**Hard:**
- Add screen shake when the player lands on a spring platform
- Implement a "combo" system: landing on platforms in quick succession multiplies the score
- Add a "ghost" replay: record position data from your best run and show a transparent ghost character on subsequent attempts

---

## What You Learned

- Persisting game data with `localStorage` and defensive try/catch
- Game phase state machine controlling update and render paths
- HUD rendering in screen space (outside the camera transform)
- Object reset via `Object.assign` to preserve shared references
- Pulsing UI effects with `Math.sin(performance.now())`
- Building a complete game loop: idle -> play -> die -> restart

**Congratulations!** You have built a complete Doodle Jump clone. The character bounces endlessly upward through procedurally generated platforms of four types, with a scrolling camera, score tracking, death detection, and persistent high scores -- all rendered on a charming graph paper background.

**Next Game:** Continue to [Basketball](../16-basketball/README.md) -- where you will learn arc-based projectile physics and swipe aiming.
