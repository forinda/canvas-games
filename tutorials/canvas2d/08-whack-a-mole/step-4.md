# Step 4: Speed Ramp, Bombs & Polish

**Goal:** Add difficulty progression, bomb mechanics, particle effects, and visual polish.

**Time:** ~20 minutes

---

## What You'll Build

Final features:
- **Difficulty Scaling**: Moles spawn faster and stay up shorter as time progresses  
- **Bomb Moles**: Red bombs that subtract points and reset combo (appear from round 2+)
- **Particle Effects**: Green burst for mole hits, red for bomb hits
- **Hammer Effect**: Emoji shows where you clicked
- **Complete Game Loop**: Rounds with increasing difficulty

```
Early Game:          Late Game:
Spawn: 1200ms       Spawn: 400ms
Up Time: 1200ms     Up Time: 400ms
Bombs: None         Bombs: 20% chance
```

---

## Concepts

- **Progress-Based Scaling**: Difficulty increases smoothly over time
- **Particle Physics**: Radial burst with gravity
- **Visual Feedback**: Immediate response to player actions
- **Entity Types**: Different behaviors for moles vs. bombs

---

## Code

### 1. Update Mole System with Difficulty Scaling

**File:** `src/contexts/canvas2d/games/whack-a-mole/systems/MoleSystem.ts`

```typescript
import type { WhackState } from '../types';
import {
  GRID_SIZE,
  RISE_DURATION,
  SINK_DURATION,
  UP_DURATION_BASE,
  ROUND_DURATION,
  SPAWN_INTERVAL_BASE,
  SPAWN_INTERVAL_MIN,
} from '../types';

export class MoleSystem {
  update(state: WhackState, dt: number): void {
    if (state.phase !== 'playing') return;

    // Calculate difficulty scaling
    const elapsed = ROUND_DURATION - state.timeRemaining;
    const progress = elapsed / ROUND_DURATION;

    // Spawn interval decreases over time (1200ms → 400ms)
    state.spawnInterval =
      SPAWN_INTERVAL_BASE -
      (SPAWN_INTERVAL_BASE - SPAWN_INTERVAL_MIN) * progress;

    // Mole up-time also decreases (1200ms → 400ms)
    const upDuration = UP_DURATION_BASE - elapsed * 10; // 10ms less per second
    const clampedUpDuration = Math.max(400, upDuration);

    // Update existing moles
    for (const hole of state.holes) {
      if (hole.state === 'empty') continue;

      hole.timer += dt;

      // State transitions
      if (hole.state === 'rising' && hole.timer >= RISE_DURATION) {
        hole.state = 'up';
        hole.timer = 0;
      } else if (hole.state === 'up' && hole.timer >= clampedUpDuration) {
        hole.state = 'sinking';
        hole.timer = 0;
      } else if (hole.state === 'sinking' && hole.timer >= SINK_DURATION) {
        hole.state = 'empty';
        hole.timer = 0;
        hole.isBomb = false;
        hole.hit = false;
      }
    }

    // Spawn new moles
    this.trySpawn(state, dt);
  }

  private trySpawn(state: WhackState, dt: number): void {
    state.spawnTimer += dt;

    if (state.spawnTimer >= state.spawnInterval) {
      state.spawnTimer = 0;

      const emptyIndices: number[] = [];
      for (let i = 0; i < GRID_SIZE; i++) {
        if (state.holes[i].state === 'empty') {
          emptyIndices.push(i);
        }
      }

      if (emptyIndices.length > 0) {
        const idx = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
        const hole = state.holes[idx];

        hole.state = 'rising';
        hole.timer = 0;
        hole.hit = false;

        // Bombs appear from round 2+, 20% chance
        hole.isBomb = state.round >= 2 && Math.random() < 0.2;
      }
    }
  }
}
```

**Key Changes:**
- **Progress Calculation**: `progress = elapsed / ROUND_DURATION` (0.0 → 1.0)
- **Spawn Interval**: Linearly interpolates from 1200ms to 400ms
- **Up Duration**: Decreases by 10ms per second elapsed
- **Bomb Spawning**: 20% chance starting from round 2

---

### 2. Update Score System with Particles

**File:** `src/contexts/canvas2d/games/whack-a-mole/systems/ScoreSystem.ts`

```typescript
import type { WhackState, Particle } from '../types';
import { HS_KEY } from '../types';

export class ScoreSystem {
  update(state: WhackState, dt: number): void {
    if (state.phase !== 'playing') return;

    // Countdown timer
    state.timeRemaining -= dt / 1000;

    if (state.timeRemaining <= 0) {
      state.timeRemaining = 0;
      state.phase = 'gameover';

      if (state.score > state.highScore) {
        state.highScore = state.score;
        this.saveHighScore(state.highScore);
      }
    }

    // Update particles
    for (let i = state.particles.length - 1; i >= 0; i--) {
      const p = state.particles[i];
      p.life -= dt;

      if (p.life <= 0) {
        state.particles.splice(i, 1);
        continue;
      }

      // Physics
      p.x += p.vx * (dt / 1000);
      p.y += p.vy * (dt / 1000);
      p.vy += 200 * (dt / 1000); // Gravity
    }

    // Update hammer effect
    if (state.hammerEffect) {
      state.hammerEffect.life -= dt;
      if (state.hammerEffect.life <= 0) {
        state.hammerEffect = null;
      }
    }
  }

  loadHighScore(): number {
    try {
      return parseInt(localStorage.getItem(HS_KEY) ?? '0', 10) || 0;
    } catch (e) {
      return 0;
    }
  }

  saveHighScore(score: number): void {
    try {
      localStorage.setItem(HS_KEY, String(score));
    } catch (e) {
      console.warn('Could not save high score');
    }
  }
}
```

---

### 3. Update Input System with Bombs & Particles

**File:** `src/contexts/canvas2d/games/whack-a-mole/systems/InputSystem.ts`

```typescript
import type { WhackState, Particle } from '../types';
import { GRID_COLS, GRID_ROWS, MOLE_POINTS, BOMB_PENALTY } from '../types';

export class InputSystem {
  private canvas: HTMLCanvasElement;
  private boundClick: (e: MouseEvent) => void;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.boundClick = (e: MouseEvent) => this.handleClick(e);
  }

  attach(state: WhackState): void {
    this.canvas.addEventListener('click', this.boundClick);
    (this.canvas as any).__whackState = state;
  }

  detach(): void {
    this.canvas.removeEventListener('click', this.boundClick);
  }

  private handleClick(e: MouseEvent): void {
    const state: WhackState = (this.canvas as any).__whackState;
    if (!state || state.phase !== 'playing') return;

    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;

    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;

    const W = this.canvas.width;
    const H = this.canvas.height;

    const gridSize = Math.min(W * 0.8, H * 0.65);
    const cellW = gridSize / GRID_COLS;
    const cellH = gridSize / GRID_ROWS;
    const gridX = (W - gridSize) / 2;
    const gridY = (H - gridSize) / 2 + 60;

    // Show hammer effect at click position
    state.hammerEffect = { x: mx, y: my, life: 300 };

    if (
      mx < gridX ||
      mx > gridX + gridSize ||
      my < gridY ||
      my > gridY + gridSize
    ) {
      state.combo = 0;
      return;
    }

    const col = Math.floor((mx - gridX) / cellW);
    const row = Math.floor((my - gridY) / cellH);

    if (row < 0 || row >= GRID_ROWS || col < 0 || col >= GRID_COLS) {
      state.combo = 0;
      return;
    }

    const idx = row * GRID_COLS + col;
    const hole = state.holes[idx];

    if ((hole.state === 'rising' || hole.state === 'up') && !hole.hit) {
      hole.hit = true;
      hole.state = 'sinking';
      hole.timer = 0;

      // Calculate particle spawn position
      const cx = gridX + col * cellW + cellW / 2;
      const cy = gridY + row * cellH + cellH / 2;

      if (hole.isBomb) {
        // Hit a bomb - penalty!
        state.score = Math.max(0, state.score - BOMB_PENALTY);
        state.combo = 0;

        // Red particles
        this.spawnParticles(state, cx, cy, '#ff4444', 12);
      } else {
        // Hit a mole - score!
        state.combo += 1;
        if (state.combo > state.maxCombo) {
          state.maxCombo = state.combo;
        }

        const multiplier = Math.min(state.combo, 5);
        const points = MOLE_POINTS * multiplier;
        state.score += points;

        // Green particles
        this.spawnParticles(state, cx, cy, '#4ade80', 8);
      }
    } else if (hole.state === 'empty' || hole.state === 'sinking') {
      state.combo = 0;
    }
  }

  private spawnParticles(
    state: WhackState,
    x: number,
    y: number,
    color: string,
    count: number
  ): void {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3;
      const speed = 80 + Math.random() * 120;

      state.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 400 + Math.random() * 200,
        color,
        size: 3 + Math.random() * 4,
      });
    }
  }
}
```

**Key Changes:**
- **Bomb Detection**: Check `hole.isBomb` before scoring
- **Bomb Penalty**: Subtract 20 points, reset combo
- **Particle Spawning**: Radial burst with random speeds
- **Hammer Effect**: Show emoji at click position

---

### 4. Update Game Renderer with Bombs & Effects

**File:** `src/contexts/canvas2d/games/whack-a-mole/renderers/GameRenderer.ts`

Add bomb drawing and particle rendering:

```typescript
import type { WhackState, Hole, Particle } from '../types';
import { GRID_COLS, GRID_ROWS, RISE_DURATION, SINK_DURATION } from '../types';

export class GameRenderer {
  render(ctx: CanvasRenderingContext2D, state: WhackState): void {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    this.drawBackground(ctx, W, H);

    const gridSize = Math.min(W * 0.8, H * 0.65);
    const cellW = gridSize / GRID_COLS;
    const cellH = gridSize / GRID_ROWS;
    const gridX = (W - gridSize) / 2;
    const gridY = (H - gridSize) / 2 + 60;

    // Draw holes
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const idx = row * GRID_COLS + col;
        const cx = gridX + col * cellW + cellW / 2;
        const cy = gridY + row * cellH + cellH / 2;
        this.drawHole(ctx, cx, cy, cellW, cellH);
      }
    }

    // Draw moles
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const idx = row * GRID_COLS + col;
        const hole = state.holes[idx];

        if (hole.state !== 'empty') {
          const cx = gridX + col * cellW + cellW / 2;
          const cy = gridY + row * cellH + cellH / 2;

          if (hole.isBomb) {
            this.drawBomb(ctx, hole, cx, cy, cellW, cellH);
          } else {
            this.drawMole(ctx, hole, cx, cy, cellW, cellH);
          }
        }
      }
    }

    // Draw particles
    for (const p of state.particles) {
      this.drawParticle(ctx, p);
    }

    // Draw hammer effect
    if (state.hammerEffect) {
      this.drawHammer(ctx, state.hammerEffect);
    }
  }

  private drawBackground(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    ctx.fillStyle = '#66bb6a';
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = 'rgba(76, 175, 80, 0.3)';
    const squareSize = 40;
    for (let y = 0; y < H; y += squareSize) {
      for (let x = 0; x < W; x += squareSize) {
        if ((x / squareSize + y / squareSize) % 2 === 0) {
          ctx.fillRect(x, y, squareSize, squareSize);
        }
      }
    }
  }

  private drawHole(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    cellW: number,
    cellH: number
  ): void {
    const holeRadiusX = cellW * 0.35;
    const holeRadiusY = cellH * 0.2;

    ctx.fillStyle = '#1a0f05';
    ctx.beginPath();
    ctx.ellipse(cx, cy + holeRadiusY * 0.3, holeRadiusX * 1.15, holeRadiusY * 1.15, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#2a1a0a';
    ctx.beginPath();
    ctx.ellipse(cx, cy + holeRadiusY * 0.5, holeRadiusX, holeRadiusY, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawBomb(
    ctx: CanvasRenderingContext2D,
    hole: Hole,
    cx: number,
    cy: number,
    cellW: number,
    cellH: number
  ): void {
    let popFraction = 1;
    if (hole.state === 'rising') {
      popFraction = hole.timer / RISE_DURATION;
    } else if (hole.state === 'sinking') {
      popFraction = 1 - hole.timer / SINK_DURATION;
    }

    const bombRadius = cellW * 0.28;
    const bombY = cy - bombRadius * popFraction * 1.2;

    // Bomb body (red)
    ctx.fillStyle = '#cc2222';
    ctx.beginPath();
    ctx.arc(cx, bombY, bombRadius, 0, Math.PI * 2);
    ctx.fill();

    // Fuse (curved line)
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx, bombY - bombRadius);
    ctx.quadraticCurveTo(
      cx + bombRadius * 0.5,
      bombY - bombRadius * 1.5,
      cx + bombRadius * 0.3,
      bombY - bombRadius * 1.8
    );
    ctx.stroke();

    // Fuse spark (yellow)
    ctx.fillStyle = '#ffeb3b';
    ctx.beginPath();
    ctx.arc(cx + bombRadius * 0.3, bombY - bombRadius * 1.8, 4, 0, Math.PI * 2);
    ctx.fill();

    // Eyes (X shapes)
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    const eyeOffset = bombRadius * 0.35;
    const eyeSize = bombRadius * 0.15;

    // Left X
    ctx.beginPath();
    ctx.moveTo(cx - eyeOffset - eyeSize, bombY - eyeSize);
    ctx.lineTo(cx - eyeOffset + eyeSize, bombY + eyeSize);
    ctx.moveTo(cx - eyeOffset + eyeSize, bombY - eyeSize);
    ctx.lineTo(cx - eyeOffset - eyeSize, bombY + eyeSize);
    ctx.stroke();

    // Right X
    ctx.beginPath();
    ctx.moveTo(cx + eyeOffset - eyeSize, bombY - eyeSize);
    ctx.lineTo(cx + eyeOffset + eyeSize, bombY + eyeSize);
    ctx.moveTo(cx + eyeOffset + eyeSize, bombY - eyeSize);
    ctx.lineTo(cx + eyeOffset - eyeSize, bombY + eyeSize);
    ctx.stroke();
  }

  private drawMole(
    ctx: CanvasRenderingContext2D,
    hole: Hole,
    cx: number,
    cy: number,
    cellW: number,
    cellH: number
  ): void {
    let popFraction = 1;
    if (hole.state === 'rising') {
      popFraction = hole.timer / RISE_DURATION;
    } else if (hole.state === 'sinking') {
      popFraction = 1 - hole.timer / SINK_DURATION;
    }

    const moleRadius = cellW * 0.28;
    const moleY = cy - moleRadius * popFraction * 1.2;

    ctx.fillStyle = '#8b4513';
    ctx.beginPath();
    ctx.arc(cx, moleY, moleRadius, 0, Math.PI * 2);
    ctx.fill();

    const eyeOffset = moleRadius * 0.35;
    const eyeRadius = moleRadius * 0.15;

    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(cx - eyeOffset, moleY - eyeRadius, eyeRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(cx + eyeOffset, moleY - eyeRadius, eyeRadius, 0, Math.PI * 2);
    ctx.fill();

    const pupilRadius = eyeRadius * 0.6;
    ctx.fillStyle = '#000';

    ctx.beginPath();
    ctx.arc(cx - eyeOffset, moleY - eyeRadius, pupilRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(cx + eyeOffset, moleY - eyeRadius, pupilRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ff69b4';
    ctx.beginPath();
    ctx.arc(cx, moleY + eyeRadius, eyeRadius * 0.8, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawParticle(ctx: CanvasRenderingContext2D, p: Particle): void {
    ctx.fillStyle = p.color;
    ctx.globalAlpha = Math.min(1, p.life / 200);
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  private drawHammer(
    ctx: CanvasRenderingContext2D,
    hammer: { x: number; y: number; life: number }
  ): void {
    ctx.globalAlpha = Math.min(1, hammer.life / 150);
    ctx.font = '48px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🔨', hammer.x, hammer.y);
    ctx.globalAlpha = 1;
  }
}
```

---

## Test It

1. **Run:** `npm run dev`
2. **Navigate:** Select "Whack-a-Mole"
3. **Test Difficulty:**
   - Start game → moles spawn slowly
   - Wait 30s → notice faster spawning
   - End of game → very fast spawning (400ms intervals)
4. **Test Bombs:**
   - Play until round 2 (or modify code to start at round 2)
   - Notice red bombs with fuses
   - Hit a bomb → lose 20 points, combo resets
5. **Test Particles:**
   - Hit mole → green burst
   - Hit bomb → red burst
   - Particles fall with gravity
6. **Test Hammer:**
   - Click anywhere → hammer emoji appears briefly

---

## Difficulty Progression

### Early Game (0-20s):
- Spawn Interval: 1200ms
- Up Duration: 1200ms
- No bombs

### Mid Game (20-40s):
- Spawn Interval: 800ms
- Up Duration: 900ms
- Bombs: 20% chance

### Late Game (40-60s):
- Spawn Interval: 400ms
- Up Duration: 400ms
- Bombs: 20% chance

---

## What You Learned

✅ Implement progress-based difficulty scaling  
✅ Create entity variants (moles vs. bombs)  
✅ Build particle systems with physics  
✅ Add visual feedback (hammer effect)  
✅ Balance gameplay with penalties  
✅ Coordinate multiple animation systems

---

## Congratulations! 🎉

You've built a complete Whack-a-Mole game with:
- ✅ 3×3 grid of holes with responsive layout
- ✅ Mole pop-up animations with state machine
- ✅ Click detection and hit validation
- ✅ Scoring with combo multipliers (up to 5x)
- ✅ 60-second countdown timer
- ✅ Difficulty scaling (spawn rate + mole speed)
- ✅ Bomb mechanics with penalties
- ✅ Particle effects with gravity
- ✅ Hammer visual feedback
- ✅ High score persistence

---

## Next Challenges

**Easy:**
- Add sound effects (hit, miss, bomb)
- Power-ups (freeze time, double points)
- Different mole types (fast moles, golden moles)

**Medium:**
- Multi-round progression (endless mode)
- Special moles (worth more points, harder to hit)
- Touch support for mobile

**Hard:**
- Leaderboard with backend API
- Multiplayer competitive mode
- Custom level editor

---

## What You Learned Overall

✅ Grid-based game logic  
✅ State machines with timers  
✅ Click-to-grid coordinate mapping  
✅ Combo streak systems  
✅ Progress-based difficulty  
✅ Particle physics  
✅ Entity type differentiation  
✅ Visual polish and feedback

**Great job!** 🔨
