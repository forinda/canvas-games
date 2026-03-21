# Step 7: Start Screen, Game Over & High Scores

**Goal:** Add a title screen, game-over screen with stats, restart functionality, and persistent high score tracking via localStorage.

**Time:** ~15 minutes

---

## What You'll Build

- **Start screen** with game title, instructions, and "click to start" prompt
- **Game-over screen** showing final score, wave reached, kills, and new high score badge
- **Restart logic** that resets all state while preserving the high score
- **High score persistence** using localStorage so scores survive page reloads
- **Complete InputSystem** with start/restart triggers and ESC to exit
- **Full game loop** with `started` state gating

---

## Concepts

- **Game State Machine**: The game has three states: `not started` (title screen), `playing` (gameplay), and `game over` (results screen). The `started` and `gameOver` flags control which state is active, and the update loop only runs during `playing`.
- **State Reset Pattern**: On restart, we rebuild the entire state object from scratch using `createInitialState()`, then copy it over with `Object.assign()`. This ensures no stale references from the previous game leak through.
- **localStorage Persistence**: `localStorage.setItem()` and `getItem()` store the high score as a string. The `try/catch` wrapper handles environments where localStorage is blocked (private browsing, iframes).
- **Overlay Composition**: Title and game-over screens are semi-transparent overlays drawn on top of the game. The game renders underneath (frozen), giving visual context while presenting UI text.

---

## Code

### 1. Update the Input System

**File:** `src/contexts/canvas2d/games/topdown-shooter/systems/InputSystem.ts`

Add start/restart triggers and ESC handling for the complete input system.

```typescript
import type { ShooterState } from '../types';

export class InputSystem {
  private state: ShooterState;
  private canvas: HTMLCanvasElement;
  private onRestart: () => void;

  private keyDown = (e: KeyboardEvent): void => {
    const key = e.key.toLowerCase();
    this.state.keys.add(key);

    if (key === 'p' && this.state.started && !this.state.gameOver) {
      this.state.paused = !this.state.paused;
      return;
    }

    if (!this.state.started || this.state.gameOver) {
      if (key === ' ' || key === 'enter') {
        this.onRestart();
      }
    }
  };

  private keyUp = (e: KeyboardEvent): void => {
    this.state.keys.delete(e.key.toLowerCase());
  };

  private mouseMove = (e: MouseEvent): void => {
    const rect = this.canvas.getBoundingClientRect();
    this.state.mouse.x = e.clientX - rect.left;
    this.state.mouse.y = e.clientY - rect.top;
  };

  private mouseDownHandler = (): void => {
    this.state.mouseDown = true;

    if (!this.state.started) {
      this.onRestart();
    }
  };

  private mouseUpHandler = (): void => {
    this.state.mouseDown = false;
  };

  constructor(
    state: ShooterState,
    canvas: HTMLCanvasElement,
    onRestart: () => void,
  ) {
    this.state = state;
    this.canvas = canvas;
    this.onRestart = onRestart;
  }

  attach(): void {
    window.addEventListener('keydown', this.keyDown);
    window.addEventListener('keyup', this.keyUp);
    this.canvas.addEventListener('mousemove', this.mouseMove);
    this.canvas.addEventListener('mousedown', this.mouseDownHandler);
    this.canvas.addEventListener('mouseup', this.mouseUpHandler);
  }

  detach(): void {
    window.removeEventListener('keydown', this.keyDown);
    window.removeEventListener('keyup', this.keyUp);
    this.canvas.removeEventListener('mousemove', this.mouseMove);
    this.canvas.removeEventListener('mousedown', this.mouseDownHandler);
    this.canvas.removeEventListener('mouseup', this.mouseUpHandler);
    this.state.keys.clear();
    this.state.mouseDown = false;
  }
}
```

**What's happening:**
- The `onRestart` callback is provided by the engine. When the player presses Space, Enter, or clicks while not started or game-over, it triggers a full restart.
- On the title screen, clicking starts the game immediately. During gameplay, clicking shoots (handled by PlayerSystem). After game over, clicking restarts.
- The P key only works during active gameplay (`started && !gameOver`) to prevent toggling pause on the title screen.

---

### 2. Update the HUD Renderer

**File:** `src/contexts/canvas2d/games/topdown-shooter/renderers/HUDRenderer.ts`

Add start screen and game-over overlays.

```typescript
import type { ShooterState } from '../types';

const GAME_COLOR = '#e53935';

export class HUDRenderer {
  render(ctx: CanvasRenderingContext2D, state: ShooterState): void {
    const W = state.canvasW;

    // ── HP bar ───────────────────────────────────────────────────
    const barW = 200;
    const barH = 16;
    const barX = 20;
    const barY = 20;
    const hpFrac = state.player.hp / state.player.maxHp;

    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, barH, 4);
    ctx.fill();

    const hpColor =
      hpFrac > 0.5 ? '#4caf50' : hpFrac > 0.25 ? '#ff9800' : '#f44336';

    ctx.fillStyle = hpColor;
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW * hpFrac, barH, 4);
    ctx.fill();

    ctx.strokeStyle = '#555';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, barH, 4);
    ctx.stroke();

    ctx.font = 'bold 11px monospace';
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      `${state.player.hp} / ${state.player.maxHp}`,
      barX + barW / 2,
      barY + barH / 2,
    );

    // ── Wave / Score / Kills ─────────────────────────────────────
    ctx.font = 'bold 14px monospace';
    ctx.fillStyle = '#ddd';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    const waveLabel = state.waveData.active
      ? `Wave ${state.waveData.wave}`
      : `Next wave in ${Math.max(0, state.waveData.betweenWaveTimer).toFixed(1)}s`;

    ctx.fillText(waveLabel, W - 20, 20);
    ctx.fillText(`Score: ${state.score}`, W - 20, 40);
    ctx.fillText(`Kills: ${state.kills}`, W - 20, 60);

    if (state.highScore > 0) {
      ctx.fillStyle = '#999';
      ctx.font = '12px monospace';
      ctx.fillText(`Best: ${state.highScore}`, W - 20, 80);
    }

    // ── Help hint ────────────────────────────────────────────────
    ctx.font = '11px monospace';
    ctx.fillStyle = '#555';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText('[H] Help  [P] Pause  [ESC] Exit', 20, state.canvasH - 10);

    // ── Paused overlay ───────────────────────────────────────────
    if (state.paused) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(0, 0, W, state.canvasH);
      ctx.font = 'bold 36px monospace';
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('PAUSED', W / 2, state.canvasH / 2);
      ctx.font = '16px monospace';
      ctx.fillStyle = '#aaa';
      ctx.fillText('Press [P] to resume', W / 2, state.canvasH / 2 + 40);
    }

    // ── Start screen ─────────────────────────────────────────────
    if (!state.started) {
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(0, 0, W, state.canvasH);
      ctx.font = 'bold 40px monospace';
      ctx.fillStyle = GAME_COLOR;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('TOP-DOWN SHOOTER', W / 2, state.canvasH / 2 - 40);
      ctx.font = '18px monospace';
      ctx.fillStyle = '#ccc';
      ctx.fillText(
        'Click or press Space to start',
        W / 2,
        state.canvasH / 2 + 10,
      );
      ctx.font = '14px monospace';
      ctx.fillStyle = '#888';
      ctx.fillText(
        'WASD to move, Mouse to aim, Click to shoot',
        W / 2,
        state.canvasH / 2 + 45,
      );
    }

    // ── Game Over overlay ────────────────────────────────────────
    if (state.gameOver) {
      ctx.fillStyle = 'rgba(0,0,0,0.75)';
      ctx.fillRect(0, 0, W, state.canvasH);
      ctx.font = 'bold 42px monospace';
      ctx.fillStyle = '#f44336';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('GAME OVER', W / 2, state.canvasH / 2 - 50);
      ctx.font = 'bold 20px monospace';
      ctx.fillStyle = '#fff';
      ctx.fillText(
        `Score: ${state.score}  |  Wave: ${state.waveData.wave}  |  Kills: ${state.kills}`,
        W / 2,
        state.canvasH / 2,
      );

      if (state.score >= state.highScore && state.highScore > 0) {
        ctx.fillStyle = '#ffeb3b';
        ctx.font = 'bold 16px monospace';
        ctx.fillText('NEW HIGH SCORE!', W / 2, state.canvasH / 2 + 30);
      }

      ctx.font = '16px monospace';
      ctx.fillStyle = '#aaa';
      ctx.fillText(
        'Click or press Space to restart',
        W / 2,
        state.canvasH / 2 + 65,
      );
    }
  }
}
```

**What's happening:**
- The **start screen** uses the game's theme color (`#e53935`, a bold red) for the title and provides three lines: title, start prompt, and controls summary. The 70% black overlay dims the empty arena behind it.
- The **game-over screen** shows "GAME OVER" in red, then a stats line with score, wave reached, and total kills. If the player beat their high score, a yellow "NEW HIGH SCORE!" badge appears.
- Both screens use `fillRect` with rgba black to create semi-transparent overlays, and both offer "Click or press Space" as the action prompt.
- The overlays render last (after the pause overlay check), so they always appear on top of everything.

---

### 3. Update the Engine

**File:** `src/contexts/canvas2d/games/topdown-shooter/ShooterEngine.ts`

Add restart logic, high score persistence, and the `started` gate.

```typescript
import type { ShooterState } from './types';
import { PLAYER_RADIUS, PLAYER_MAX_HP, HS_KEY } from './types';
import { InputSystem } from './systems/InputSystem';
import { PlayerSystem } from './systems/PlayerSystem';
import { EnemySystem } from './systems/EnemySystem';
import { BulletSystem } from './systems/BulletSystem';
import { WaveSystem } from './systems/WaveSystem';
import { GameRenderer } from './renderers/GameRenderer';
import { HUDRenderer } from './renderers/HUDRenderer';

export class ShooterEngine {
  private ctx: CanvasRenderingContext2D;
  private state: ShooterState;
  private running = false;
  private rafId = 0;
  private lastTime = 0;

  private inputSystem: InputSystem;
  private playerSystem: PlayerSystem;
  private enemySystem: EnemySystem;
  private bulletSystem: BulletSystem;
  private waveSystem: WaveSystem;
  private gameRenderer: GameRenderer;
  private hudRenderer: HUDRenderer;
  private resizeHandler: () => void;

  constructor(canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    let hs = 0;
    try {
      hs = parseInt(localStorage.getItem(HS_KEY) ?? '0', 10) || 0;
    } catch {
      /* noop */
    }

    this.state = this.createInitialState(canvas.width, canvas.height, hs);

    // Systems
    this.playerSystem = new PlayerSystem();
    this.enemySystem = new EnemySystem();
    this.bulletSystem = new BulletSystem();
    this.waveSystem = new WaveSystem(this.enemySystem);
    this.gameRenderer = new GameRenderer();
    this.hudRenderer = new HUDRenderer();

    this.inputSystem = new InputSystem(
      this.state,
      canvas,
      () => this.restart(),
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
    const dt = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;

    if (this.state.started && !this.state.paused && !this.state.gameOver) {
      this.playerSystem.update(this.state, dt);
      this.enemySystem.update(this.state, dt);
      this.bulletSystem.update(this.state, dt);
      this.waveSystem.update(this.state, dt);
    }

    this.gameRenderer.render(this.ctx, this.state);
    this.hudRenderer.render(this.ctx, this.state);

    this.rafId = requestAnimationFrame(() => this.loop());
  }

  private restart(): void {
    // Save high score
    if (this.state.score > this.state.highScore) {
      this.state.highScore = this.state.score;

      try {
        localStorage.setItem(HS_KEY, String(this.state.highScore));
      } catch {
        /* noop */
      }
    }

    const hs = this.state.highScore;
    const w = this.state.canvasW;
    const h = this.state.canvasH;

    Object.assign(this.state, this.createInitialState(w, h, hs));
    this.state.started = true;
  }

  private createInitialState(
    w: number,
    h: number,
    highScore: number,
  ): ShooterState {
    return {
      canvasW: w,
      canvasH: h,
      player: {
        pos: { x: w / 2, y: h / 2 },
        hp: PLAYER_MAX_HP,
        maxHp: PLAYER_MAX_HP,
        radius: PLAYER_RADIUS,
        shootCooldown: 0,
        invincibleTimer: 0,
      },
      bullets: [],
      enemies: [],
      particles: [],
      waveData: {
        wave: 0,
        enemiesRemaining: 0,
        spawnTimer: 0,
        spawnInterval: 1,
        betweenWaveTimer: 1.5,
        active: false,
      },
      score: 0,
      highScore,
      kills: 0,
      gameOver: false,
      paused: false,
      started: false,
      keys: new Set(),
      mouse: { x: w / 2, y: h / 2 },
      mouseDown: false,
    };
  }
}
```

**What's happening:**
- **High score loading**: On construction, the engine reads the high score from `localStorage` using the `HS_KEY` constant. The `try/catch` handles environments where storage is unavailable.
- **`started` gate**: The update loop now checks `this.state.started` in addition to `paused` and `gameOver`. On initial load, `started` is `false`, so the game shows the title screen without running any systems.
- **`restart()` method**: First saves the high score if the current score beat it (writing to localStorage). Then builds a fresh state with `createInitialState()`, copies it onto the existing state object with `Object.assign()`, and sets `started = true`.
- Using `Object.assign()` instead of replacing `this.state` is important because the `InputSystem` holds a reference to the state object. Replacing it would leave the input system writing to the old, orphaned object.

---

## Test It

1. **Run:** `npm run dev`
2. **Open:** the Top-Down Shooter game in your browser
3. **Observe:**
   - A **title screen** appears with "TOP-DOWN SHOOTER" in red, start instructions, and controls
   - **Click or press Space** -- the game starts and the title screen disappears
   - Play until you die -- a **"GAME OVER"** screen appears showing your score, wave, and kills
   - **Click or press Space** again -- the game restarts with a fresh state
   - Play again and beat your score -- a **"NEW HIGH SCORE!"** badge appears in yellow
   - **Refresh the page** -- your high score is **preserved** from the previous session
   - The "Best: N" display in the top-right shows your all-time high score

---

## Challenges

**Easy:**
- Change the title screen color from red (`#e53935`) to a different theme color.
- Add your name as a subtitle below the game title on the start screen.

**Medium:**
- Display the high score on the title screen so players see their best before starting.

**Hard:**
- Store the top 5 scores with wave number and date in localStorage and display a leaderboard on the title screen.

---

## What You Learned

- Implementing a game state machine with title, playing, and game-over states
- Drawing overlay screens with semi-transparent backgrounds and centered text
- Resetting game state safely using `Object.assign()` to preserve object references
- Persisting data with `localStorage` including error handling for restricted environments
- Wiring start/restart callbacks through the input system
- Gating the update loop based on game state flags (`started`, `paused`, `gameOver`)
- Displaying conditional UI elements (new high score badge) based on game state

**Congratulations!** You have built a complete top-down shooter from scratch. The game features WASD+mouse dual-input controls, wave-based enemy spawning with four enemy types, bullet collision with particle effects, a full HUD, and persistent high scores. Continue to [Racing](../43-racing/README.md) to learn track rendering, lap timing, and vehicle physics.
