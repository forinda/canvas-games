# Step 5: Weapons & Pickups

**Goal:** Add weapon upgrades, health drops, invincibility timer feedback, and the player's HP bar HUD.

**Time:** ~15 minutes

---

## What You'll Build

- **Invincibility feedback** -- the player flashes red when hit and briefly invulnerable
- **Player HP bar** in the top-left corner with color-coded health states
- **Wave and score display** in the top-right corner
- **Help hint bar** at the bottom of the screen
- **HUD Renderer** as a separate rendering layer on top of the game

---

## Concepts

- **Invincibility Frames (i-frames)**: After taking damage, the player becomes briefly invincible. This is a classic game design pattern that prevents a single enemy from instantly killing the player through repeated collision. The flashing visual makes the state obvious.
- **HP Bar Color Coding**: Health bars use green (> 50%), orange (25-50%), and red (< 25%) to create urgency without requiring the player to read numbers. The numeric display inside the bar provides exact values for precise play.
- **HUD Layer Separation**: The HUD (Heads-Up Display) renders on top of everything. By putting it in a separate renderer, we keep game rendering clean and can overlay UI elements without mixing concerns.
- **Rounded Rectangles**: `ctx.roundRect()` draws rectangles with rounded corners, giving the HP bar a polished appearance compared to sharp-edged `fillRect()`.

---

## Code

### 1. Update the Player System

**File:** `src/contexts/canvas2d/games/topdown-shooter/systems/PlayerSystem.ts`

Add invincibility countdown to the existing system.

```typescript
import type { ShooterState, Vec2 } from '../types';
import {
  PLAYER_SPEED,
  SHOOT_COOLDOWN,
  BULLET_SPEED,
  BULLET_RADIUS,
  ARENA_PADDING,
} from '../types';

export class PlayerSystem {
  update(state: ShooterState, dt: number): void {
    const { player, keys } = state;

    // ── Movement ──────────────────────────────────────────────────
    let dx = 0;
    let dy = 0;

    if (keys.has('w') || keys.has('arrowup')) dy -= 1;
    if (keys.has('s') || keys.has('arrowdown')) dy += 1;
    if (keys.has('a') || keys.has('arrowleft')) dx -= 1;
    if (keys.has('d') || keys.has('arrowright')) dx += 1;

    // Normalize diagonal
    const mag = Math.sqrt(dx * dx + dy * dy);
    if (mag > 0) {
      dx /= mag;
      dy /= mag;
    }

    player.pos.x += dx * PLAYER_SPEED * dt;
    player.pos.y += dy * PLAYER_SPEED * dt;

    // Clamp inside arena
    const pad = ARENA_PADDING + player.radius;
    player.pos.x = Math.max(pad, Math.min(state.canvasW - pad, player.pos.x));
    player.pos.y = Math.max(pad, Math.min(state.canvasH - pad, player.pos.y));

    // ── Invincibility countdown ──────────────────────────────────
    if (player.invincibleTimer > 0) {
      player.invincibleTimer -= dt;
    }

    // ── Shooting ─────────────────────────────────────────────────
    player.shootCooldown -= dt;

    if (state.mouseDown && player.shootCooldown <= 0) {
      player.shootCooldown = SHOOT_COOLDOWN;
      this.shoot(state);
    }
  }

  private shoot(state: ShooterState): void {
    const { player, mouse, bullets } = state;
    const aim: Vec2 = {
      x: mouse.x - player.pos.x,
      y: mouse.y - player.pos.y,
    };
    const len = Math.sqrt(aim.x * aim.x + aim.y * aim.y);

    if (len === 0) return;

    bullets.push({
      pos: { x: player.pos.x, y: player.pos.y },
      vel: {
        x: (aim.x / len) * BULLET_SPEED,
        y: (aim.y / len) * BULLET_SPEED,
      },
      age: 0,
      radius: BULLET_RADIUS,
      fromPlayer: true,
    });
  }
}
```

**What's happening:**
- The `invincibleTimer` countdown is now explicitly included. It decreases by `dt` each frame. While positive, the EnemySystem and BulletSystem skip damage checks against the player (as coded in Step 4).
- This is the complete PlayerSystem with movement, boundary clamping, invincibility, and shooting all working together.

---

### 2. Update the Game Renderer

**File:** `src/contexts/canvas2d/games/topdown-shooter/renderers/GameRenderer.ts`

Add the invincibility flash effect to the player rendering.

```typescript
import type { ShooterState } from '../types';
import { ARENA_PADDING, PLAYER_RADIUS } from '../types';

export class GameRenderer {
  render(ctx: CanvasRenderingContext2D, state: ShooterState): void {
    const W = state.canvasW;
    const H = state.canvasH;

    // ── Background ───────────────────────────────────────────────
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, W, H);

    // ── Arena border ─────────────────────────────────────────────
    const ap = ARENA_PADDING;
    ctx.strokeStyle = '#333355';
    ctx.lineWidth = 2;
    ctx.strokeRect(ap, ap, W - ap * 2, H - ap * 2);

    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 1;
    const gridSize = 60;

    for (let x = ap; x < W - ap; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, ap);
      ctx.lineTo(x, H - ap);
      ctx.stroke();
    }

    for (let y = ap; y < H - ap; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(ap, y);
      ctx.lineTo(W - ap, y);
      ctx.stroke();
    }

    // ── Bullets ──────────────────────────────────────────────────
    for (const b of state.bullets) {
      ctx.fillStyle = b.fromPlayer ? '#ffeb3b' : '#e040fb';
      ctx.beginPath();
      ctx.arc(b.pos.x, b.pos.y, b.radius, 0, Math.PI * 2);
      ctx.fill();

      // Glow
      ctx.shadowColor = b.fromPlayer ? '#ffeb3b' : '#e040fb';
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // ── Enemies ──────────────────────────────────────────────────
    for (const e of state.enemies) {
      // Body
      ctx.fillStyle = e.color;
      ctx.beginPath();
      ctx.arc(e.pos.x, e.pos.y, e.radius, 0, Math.PI * 2);
      ctx.fill();

      // HP bar (if damaged)
      if (e.hp < e.maxHp) {
        const barW = e.radius * 2;
        const barH = 4;
        const barX = e.pos.x - barW / 2;
        const barY = e.pos.y - e.radius - 8;

        ctx.fillStyle = '#333';
        ctx.fillRect(barX, barY, barW, barH);
        ctx.fillStyle = '#4caf50';
        ctx.fillRect(barX, barY, barW * (e.hp / e.maxHp), barH);
      }

      // Type indicator
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${Math.max(9, e.radius * 0.7)}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const label =
        e.type === 'tank'
          ? 'T'
          : e.type === 'fast'
            ? 'F'
            : e.type === 'ranged'
              ? 'R'
              : '';

      if (label) ctx.fillText(label, e.pos.x, e.pos.y);
    }

    // ── Player ───────────────────────────────────────────────────
    const { player, mouse } = state;

    // Aim line
    const aimDx = mouse.x - player.pos.x;
    const aimDy = mouse.y - player.pos.y;
    const aimLen = Math.sqrt(aimDx * aimDx + aimDy * aimDy);

    if (aimLen > 0) {
      const nx = aimDx / aimLen;
      const ny = aimDy / aimLen;

      ctx.strokeStyle = 'rgba(255,235,59,0.35)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(
        player.pos.x + nx * PLAYER_RADIUS,
        player.pos.y + ny * PLAYER_RADIUS,
      );
      ctx.lineTo(player.pos.x + nx * 60, player.pos.y + ny * 60);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Flash when invincible
    const flash =
      player.invincibleTimer > 0 &&
      Math.floor(player.invincibleTimer * 10) % 2 === 0;

    // Player body
    ctx.fillStyle = flash ? '#ff8a80' : '#42a5f5';
    ctx.beginPath();
    ctx.arc(player.pos.x, player.pos.y, player.radius, 0, Math.PI * 2);
    ctx.fill();

    // Player outline glow
    ctx.strokeStyle = '#90caf9';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(player.pos.x, player.pos.y, player.radius, 0, Math.PI * 2);
    ctx.stroke();

    // Gun direction indicator
    if (aimLen > 0) {
      const nx = aimDx / aimLen;
      const ny = aimDy / aimLen;

      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(
        player.pos.x + nx * (player.radius - 4),
        player.pos.y + ny * (player.radius - 4),
        4,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
  }
}
```

**What's happening:**
- The **flash effect** uses `Math.floor(player.invincibleTimer * 10) % 2 === 0` to alternate between red (`#ff8a80`) and blue (`#42a5f5`) every 0.1 seconds. This creates a rapid blinking that clearly signals "I was hit and am temporarily invincible."
- The flash only appears when `invincibleTimer > 0`, so during normal gameplay the player is always its standard blue color.

---

### 3. Create the HUD Renderer

**File:** `src/contexts/canvas2d/games/topdown-shooter/renderers/HUDRenderer.ts`

Draws the HP bar, wave counter, score, kills, and controls hint.

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
  }
}
```

**What's happening:**
- The **HP bar** has three layers: a dark background (`#333`), a colored fill, and a thin border. The fill color changes based on remaining health -- green when healthy, orange when getting low, red when critical.
- `roundRect` with a radius of 4 gives the bar soft corners. The numeric display ("80 / 100") is centered inside the bar.
- The **wave label** switches between "Wave N" during active waves and a countdown timer between waves, so the player always knows what is happening.
- **Score, kills, and high score** are right-aligned in the top-right corner.
- The **help hint** at the bottom reminds players of key controls in an unobtrusive dim color.

---

### 4. Update the Engine

**File:** `src/contexts/canvas2d/games/topdown-shooter/ShooterEngine.ts`

Add HUDRenderer to the render pipeline.

```typescript
import type { ShooterState } from './types';
import { PLAYER_RADIUS, PLAYER_MAX_HP } from './types';
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

    this.state = this.createInitialState(canvas.width, canvas.height);

    this.playerSystem = new PlayerSystem();
    this.enemySystem = new EnemySystem();
    this.bulletSystem = new BulletSystem();
    this.waveSystem = new WaveSystem(this.enemySystem);
    this.gameRenderer = new GameRenderer();
    this.hudRenderer = new HUDRenderer();
    this.inputSystem = new InputSystem(this.state, canvas);

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

    if (!this.state.paused && !this.state.gameOver) {
      this.playerSystem.update(this.state, dt);
      this.enemySystem.update(this.state, dt);
      this.bulletSystem.update(this.state, dt);
      this.waveSystem.update(this.state, dt);
    }

    this.gameRenderer.render(this.ctx, this.state);
    this.hudRenderer.render(this.ctx, this.state);

    this.rafId = requestAnimationFrame(() => this.loop());
  }

  private createInitialState(w: number, h: number): ShooterState {
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
      highScore: 0,
      kills: 0,
      gameOver: false,
      paused: false,
      started: true,
      keys: new Set(),
      mouse: { x: w / 2, y: h / 2 },
      mouseDown: false,
    };
  }
}
```

**What's happening:**
- `HUDRenderer` is instantiated alongside `GameRenderer` and called after it in the render pipeline. Since the HUD draws on top, it appears over all game elements.
- The two renderers are independent -- `GameRenderer` handles the arena and game objects, `HUDRenderer` handles UI overlays.

---

## Test It

1. **Run:** `npm run dev`
2. **Open:** the Top-Down Shooter game in your browser
3. **Observe:**
   - An **HP bar** appears in the top-left with "100 / 100" in green
   - **Wave counter**, **score**, and **kills** appear in the top-right
   - Between waves, the counter shows "Next wave in 2.5s" with a live countdown
   - Let an enemy touch you -- the player **flashes red** briefly
   - The HP bar **changes color**: green above 50%, orange 25-50%, red below 25%
   - The numeric HP display updates in real-time as you take damage
   - A controls hint ("[H] Help [P] Pause [ESC] Exit") appears at the bottom

---

## Challenges

**Easy:**
- Change the HP bar width from 200 to 300 for a larger health display.
- Move the score display to the center-top of the screen instead of the right side.

**Medium:**
- Add a "damage number" that floats up from the player when hit, showing how much HP was lost (e.g., "-10" floating upward and fading out).

**Hard:**
- Implement a health pickup: after killing an enemy, there is a 10% chance a green circle drops at their position. Walking over it restores 15 HP (capped at max).

---

## What You Learned

- Implementing invincibility frames with a timer and visual flash feedback
- Drawing color-coded HP bars with rounded rectangles and numeric overlays
- Creating a separate HUD renderer for UI elements layered on top of the game
- Displaying dynamic game state (wave number, countdown, score, kills) in real time
- Using `Math.floor(timer * 10) % 2` for rapid alternating visual effects

**Next:** Damage effects, explosions, and polish -- particle effects, pause overlay, and game-over screen!
