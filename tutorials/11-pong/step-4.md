# Step 4: Scoring & Game Flow

**Goal:** Implement complete game loop with scoring, winning conditions, and phase management.

**Time:** ~25 minutes

---

## What You'll Build

Game state management:
- **Scoring system**: Points awarded when ball exits court
- **Win condition**: First to 11 points wins
- **Game phases**: Mode select → Start → Playing → Win
- **Score display**: Large semi-transparent numbers
- **Overlay screens**: Mode selection, start, pause, winner
- **Restart/replay**: Full game flow

---

## Concepts

- **State Machine**: Phase transitions
- **Score Detection**: Ball exit left/right
- **UI Overlays**: Modal screens over gameplay
- **Phase-based Rendering**: Different UI per phase

---

## Code

### 1. Create Score System

**File:** `src/games/pong/systems/ScoreSystem.ts`

```typescript
import type { PongState } from '../types';
import { WINNING_SCORE, BALL_INITIAL_SPEED } from '../types';

export class ScoreSystem {
  update(state: PongState): void {
    if (state.phase !== 'playing') return;

    const { ball, canvasW } = state;

    // Check if ball exited left side (right player scores)
    if (ball.x + ball.radius < 0) {
      state.rightScore += 1;
      this.checkWinCondition(state);
      if (state.phase === 'playing') {
        this.resetBallAfterScore(state, 1); // Serve to left
      }
    }

    // Check if ball exited right side (left player scores)
    if (ball.x - ball.radius > canvasW) {
      state.leftScore += 1;
      this.checkWinCondition(state);
      if (state.phase === 'playing') {
        this.resetBallAfterScore(state, -1); // Serve to right
      }
    }
  }

  private checkWinCondition(state: PongState): void {
    if (state.leftScore >= WINNING_SCORE) {
      state.winner = 'left';
      state.phase = 'win';
    } else if (state.rightScore >= WINNING_SCORE) {
      state.winner = 'right';
      state.phase = 'win';
    }
  }

  private resetBallAfterScore(state: PongState, serveDirection: number): void {
    const { ball, canvasW, canvasH } = state;

    // Center position
    ball.x = canvasW / 2;
    ball.y = canvasH / 2;

    // Random angle (-30° to +30°)
    const angle = (Math.random() - 0.5) * (Math.PI / 3);

    // Reset speed
    ball.speed = BALL_INITIAL_SPEED;

    // Serve in specified direction
    ball.vx = serveDirection * Math.cos(angle) * ball.speed;
    ball.vy = Math.sin(angle) * ball.speed;

    // Clear trail and rally
    ball.trail = [];
    state.rallyHits = 0;
  }
}
```

**Scoring logic:**
- Ball exits left (x < 0) → right player +1 point
- Ball exits right (x > canvasW) → left player +1 point
- Check for winner after each score
- Reset ball with serve direction toward scored player

---

### 2. Update Physics System

**File:** `src/games/pong/systems/PhysicsSystem.ts`

Remove ball reset from physics (now handled by ScoreSystem):

```typescript
private updateBall(state: PongState, dtSec: number): void {
  const { ball, canvasH } = state;

  // Move ball
  ball.x += ball.vx * dtSec;
  ball.y += ball.vy * dtSec;

  // Wall collision (top/bottom)
  if (ball.y - ball.radius <= 0) {
    ball.y = ball.radius;
    ball.vy = Math.abs(ball.vy);
  } else if (ball.y + ball.radius >= canvasH) {
    ball.y = canvasH - ball.radius;
    ball.vy = -Math.abs(ball.vy);
  }

  // Remove the reset logic - scoring now handled by ScoreSystem
}

// Remove or comment out the resetBall method
```

---

### 3. Create HUD Renderer

**File:** `src/games/pong/renderers/HUDRenderer.ts`

```typescript
import type { PongState } from '../types';

export class HUDRenderer {
  render(ctx: CanvasRenderingContext2D, state: PongState): void {
    if (state.phase === 'mode-select') {
      this.drawModeSelect(ctx, state);
    } else if (state.phase === 'start') {
      this.drawStartScreen(ctx, state);
    } else if (state.phase === 'paused') {
      this.drawPausedScreen(ctx, state);
    } else if (state.phase === 'win') {
      this.drawWinScreen(ctx, state);
    } else if (state.phase === 'playing') {
      this.drawScores(ctx, state);
    }
  }

  private drawScores(ctx: CanvasRenderingContext2D, state: PongState): void {
    const { canvasW, canvasH, leftScore, rightScore } = state;

    // Calculate font size (6% of viewport width, clamped 18-72px)
    const fontSize = Math.max(18, Math.min(72, canvasW * 0.06));

    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.font = `bold ${fontSize}px monospace`;
    ctx.textBaseline = 'top';

    // Left score (1/4 position)
    ctx.textAlign = 'center';
    ctx.fillText(String(leftScore), canvasW * 0.25, 40);

    // Right score (3/4 position)
    ctx.fillText(String(rightScore), canvasW * 0.75, 40);
  }

  private drawModeSelect(ctx: CanvasRenderingContext2D, state: PongState): void {
    const { canvasW, canvasH } = state;

    this.dimBackground(ctx, canvasW, canvasH);

    ctx.fillStyle = '#26c6da';
    ctx.font = 'bold 72px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('PONG', canvasW / 2, canvasH / 2 - 80);

    ctx.font = '28px sans-serif';
    ctx.fillStyle = '#fff';
    ctx.fillText('Select Game Mode', canvasW / 2, canvasH / 2);

    ctx.font = '24px monospace';
    ctx.fillText('1 - vs AI', canvasW / 2, canvasH / 2 + 60);
    ctx.fillText('2 - 2 Players', canvasW / 2, canvasH / 2 + 100);
  }

  private drawStartScreen(ctx: CanvasRenderingContext2D, state: PongState): void {
    const { canvasW, canvasH, mode } = state;

    this.dimBackground(ctx, canvasW, canvasH);

    const modeText = mode === 'ai' ? 'VS AI' : '2 PLAYERS';

    ctx.fillStyle = '#26c6da';
    ctx.font = 'bold 48px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(modeText, canvasW / 2, canvasH / 2 - 40);

    ctx.font = '24px sans-serif';
    ctx.fillStyle = '#aaa';
    ctx.fillText('Press SPACE to start', canvasW / 2, canvasH / 2 + 20);

    ctx.font = '18px sans-serif';
    ctx.fillText('First to 11 wins', canvasW / 2, canvasH / 2 + 60);
  }

  private drawPausedScreen(ctx: CanvasRenderingContext2D, state: PongState): void {
    const { canvasW, canvasH } = state;

    this.dimBackground(ctx, canvasW, canvasH);

    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 48px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('PAUSED', canvasW / 2, canvasH / 2);

    ctx.font = '20px sans-serif';
    ctx.fillStyle = '#aaa';
    ctx.fillText('Press P to resume', canvasW / 2, canvasH / 2 + 50);
  }

  private drawWinScreen(ctx: CanvasRenderingContext2D, state: PongState): void {
    const { canvasW, canvasH, winner, leftScore, rightScore } = state;

    this.dimBackground(ctx, canvasW, canvasH);

    const winnerText = winner === 'left' ? 'LEFT PLAYER WINS!' : 'RIGHT PLAYER WINS!';

    ctx.fillStyle = '#4ade80';
    ctx.font = 'bold 56px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(winnerText, canvasW / 2, canvasH / 2 - 60);

    ctx.font = '32px monospace';
    ctx.fillStyle = '#fff';
    ctx.fillText(`${leftScore} - ${rightScore}`, canvasW / 2, canvasH / 2);

    ctx.font = '20px sans-serif';
    ctx.fillStyle = '#aaa';
    ctx.fillText('SPACE - Play Again', canvasW / 2, canvasH / 2 + 70);
    ctx.fillText('M - Mode Select', canvasW / 2, canvasH / 2 + 105);
    ctx.fillText('ESC - Exit', canvasW / 2, canvasH / 2 + 140);
  }

  private dimBackground(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, w, h);
  }
}
```

---

### 4. Update Input System with Phase Transitions

**File:** `src/games/pong/systems/InputSystem.ts`

Add phase-based input handling:

```typescript
import type { PongState } from '../types';
import { PADDLE_SPEED, BALL_INITIAL_SPEED } from '../types';

export class InputSystem {
  private pressedKeys: Set<string> = new Set();
  private onExit: () => void;

  constructor(onExit: () => void) {
    this.onExit = onExit;
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
  }

  attach(): void {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
  }

  detach(): void {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
  }

  private handleKeyDown(e: KeyboardEvent): void {
    const key = e.key.toLowerCase();
    this.pressedKeys.add(key);

    // Prevent default for game keys
    if (['w', 's', 'arrowup', 'arrowdown', ' ', 'p', '1', '2', 'm'].includes(key)) {
      e.preventDefault();
    }
  }

  private handleKeyUp(e: KeyboardEvent): void {
    const key = e.key.toLowerCase();
    this.pressedKeys.delete(key);
  }

  handlePhaseInput(state: PongState): void {
    // Mode selection
    if (state.phase === 'mode-select') {
      if (this.pressedKeys.has('1')) {
        state.mode = 'ai';
        state.phase = 'start';
        this.pressedKeys.clear();
      } else if (this.pressedKeys.has('2')) {
        state.mode = '2p';
        state.phase = 'start';
        this.pressedKeys.clear();
      }
    }

    // Start game
    else if (state.phase === 'start') {
      if (this.pressedKeys.has(' ') || this.pressedKeys.has('enter')) {
        state.phase = 'playing';
        this.pressedKeys.clear();
      }
    }

    // Pause toggle
    else if (state.phase === 'playing') {
      if (this.pressedKeys.has('p')) {
        state.phase = 'paused';
        this.pressedKeys.delete('p');
      }
    } else if (state.phase === 'paused') {
      if (this.pressedKeys.has('p')) {
        state.phase = 'playing';
        this.pressedKeys.delete('p');
      }
    }

    // Win screen options
    else if (state.phase === 'win') {
      if (this.pressedKeys.has(' ') || this.pressedKeys.has('enter')) {
        this.restartGame(state);
        this.pressedKeys.clear();
      } else if (this.pressedKeys.has('m')) {
        this.returnToModeSelect(state);
        this.pressedKeys.clear();
      }
    }

    // Exit (any phase)
    if (this.pressedKeys.has('escape')) {
      this.onExit();
    }
  }

  applyInput(state: PongState): void {
    if (state.phase !== 'playing') return;

    // Left paddle (W/S keys)
    if (this.pressedKeys.has('w')) {
      state.leftPaddle.dy = -PADDLE_SPEED;
    } else if (this.pressedKeys.has('s')) {
      state.leftPaddle.dy = PADDLE_SPEED;
    } else {
      state.leftPaddle.dy = 0;
    }

    // Right paddle (Arrow keys - 2P mode only)
    if (state.mode === '2p') {
      if (this.pressedKeys.has('arrowup')) {
        state.rightPaddle.dy = -PADDLE_SPEED;
      } else if (this.pressedKeys.has('arrowdown')) {
        state.rightPaddle.dy = PADDLE_SPEED;
      } else {
        state.rightPaddle.dy = 0;
      }
    }
  }

  private restartGame(state: PongState): void {
    state.leftScore = 0;
    state.rightScore = 0;
    state.winner = null;
    state.rallyHits = 0;

    // Reset ball
    state.ball.x = state.canvasW / 2;
    state.ball.y = state.canvasH / 2;
    state.ball.speed = BALL_INITIAL_SPEED;
    state.ball.vx = BALL_INITIAL_SPEED;
    state.ball.vy = 0;
    state.ball.trail = [];

    // Reset paddle positions
    state.leftPaddle.y = state.canvasH / 2 - state.leftPaddle.h / 2;
    state.rightPaddle.y = state.canvasH / 2 - state.rightPaddle.h / 2;

    state.phase = 'playing';
  }

  private returnToModeSelect(state: PongState): void {
    this.restartGame(state);
    state.phase = 'mode-select';
  }
}
```

---

### 5. Update Game Engine

**File:** `src/games/pong/PongEngine.ts`

Add ScoreSystem and HUDRenderer:

```typescript
import { ScoreSystem } from './systems/ScoreSystem';
import { HUDRenderer } from './renderers/HUDRenderer';

// Add fields:
private scoreSystem: ScoreSystem;
private hudRenderer: HUDRenderer;

// In constructor:
this.scoreSystem = new ScoreSystem();
this.hudRenderer = new HUDRenderer();

// Change initial phase:
this.state = {
  phase: 'mode-select', // Start with mode selection
  // ... rest of state
};

// Update methods:
private update(dt: number): void {
  this.inputSystem.handlePhaseInput(this.state);
  this.inputSystem.applyInput(this.state);
  this.physicsSystem.update(this.state, dt);
  this.scoreSystem.update(this.state);
}

private render(): void {
  this.gameRenderer.render(this.ctx, this.state);
  this.hudRenderer.render(this.ctx, this.state);
}
```

---

## Test It

1. **Run:** `npm run dev`
2. **Navigate:** Select "Pong"
3. **Mode Selection:**
   - Press **1** for vs AI mode (right paddle inactive for now)
   - Press **2** for 2-player mode
4. **Start Screen:**
   - Shows selected mode
   - Press **SPACE** to begin
5. **Gameplay:**
   - Use W/S for left paddle
   - Use Arrow keys for right paddle (2P mode)
   - Ball resets after each score
   - Scores displayed at top (semi-transparent)
6. **Pause:**
   - Press **P** to pause
   - Press **P** again to resume
7. **Winning:**
   - Play to 11 points
   - Win screen shows winner and final score
   - Press **SPACE** to play again
   - Press **M** to return to mode select
   - Press **ESC** to exit

---

## Challenges

**Easy:**
- Change winning score to 7
- Add countdown before serve (3...2...1...GO!)
- Show rally counter on score overlay

**Medium:**
- Add match point indicator when 10-X
- Victory animation (confetti, screen flash)
- Best of 3 sets system

**Hard:**
- Tournament bracket (4 players)
- Statistics tracking (longest rally, fastest ball)
- Replay system (save and playback match)

---

## What You Learned

✅ State machine implementation  
✅ Phase-based game flow  
✅ Scoring system with win conditions  
✅ Modal UI overlays  
✅ Input handling per game state  
✅ Game restart and reset logic  
✅ Semi-transparent score display

**Next:** AI opponent system!
