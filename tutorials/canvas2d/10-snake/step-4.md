# Step 4: Collision Detection & Game Over

**Goal:** End the game when snake hits walls or itself, with restart functionality.

**Time:** ~15 minutes

---

## What You'll Build

Collision system:
- **Wall detection**: Check if head is out of bounds
- **Self-collision**: Detect if head hits body segment
- **Game over state**: Stop movement, show overlay
- **Restart mechanism**: Reset all state, start fresh

---

## Concepts

- **Boundary Checking**: Grid edge validation
- **Self-Intersection**: Loop through body segments
- **State Reset**: Clean slate for new game
- **Event Ordering**: Check collisions AFTER movement

---

## Code

### 1. Create Collision System

**File:** `src/contexts/canvas2d/games/snake/systems/CollisionSystem.ts`

Detect walls and self-collisions:

```typescript
import type { SnakeState } from '../types';

export class CollisionSystem {
  update(state: SnakeState): void {
    if (state.gameOver || state.paused || !state.started) return;

    const head = state.snake[0];

    // Check wall collision
    if (
      head.x < 0 ||
      head.x >= state.gridW ||
      head.y < 0 ||
      head.y >= state.gridH
    ) {
      this.triggerGameOver(state);
      return;
    }

    // Check self-collision (skip head at index 0)
    for (let i = 1; i < state.snake.length; i++) {
      const segment = state.snake[i];
      if (head.x === segment.x && head.y === segment.y) {
        this.triggerGameOver(state);
        return;
      }
    }
  }

  private triggerGameOver(state: SnakeState): void {
    state.gameOver = true;

    // Remove invalid head that caused collision
    state.snake.shift();

    // Save high score if improved
    if (state.score > state.highScore) {
      state.highScore = state.score;
      try {
        localStorage.setItem('snake_highscore', String(state.highScore));
      } catch (e) {
        console.warn('Could not save high score');
      }
    }
  }
}
```

**Key patterns:**
- Wall check: Simple boundary comparison
- Self-check: Loop from index 1 (skip head)
- Remove invalid head: Visual clarity (don't show segment off-grid)

---

### 2. Update HUD with Game Over Overlay

**File:** `src/contexts/canvas2d/games/snake/renderers/HUDRenderer.ts`

Add game over screen:

```typescript
import type { SnakeState } from '../types';

export class HUDRenderer {
  render(ctx: CanvasRenderingContext2D, state: SnakeState): void {
    if (!state.started) {
      this.drawStartScreen(ctx, state);
    } else if (state.gameOver) {
      this.drawGameOverScreen(ctx, state);
    } else if (state.paused) {
      this.drawPausedOverlay(ctx);
    } else {
      this.drawScoreBar(ctx, state);
    }
  }

  private drawScoreBar(ctx: CanvasRenderingContext2D, state: SnakeState): void {
    const W = ctx.canvas.width;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, W, 36);

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`Score: ${state.score} | Length: ${state.snake.length}`, W / 2, 18);

    ctx.font = '18px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffd700';
    ctx.fillText(`Best: ${state.highScore}`, W - 20, 18);

    ctx.textAlign = 'left';
    ctx.fillStyle = '#aaa';
    ctx.fillText('< EXIT', 20, 18);
  }

  private drawStartScreen(ctx: CanvasRenderingContext2D, state: SnakeState): void {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    ctx.fillStyle = 'rgba(15, 15, 26, 0.85)';
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = '#4ade80';
    ctx.font = 'bold 72px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('SNAKE', W / 2, H / 2 - 60);

    ctx.font = '24px sans-serif';
    ctx.fillStyle = '#fff';
    ctx.fillText('Use arrow keys or WASD to move', W / 2, H / 2 + 20);

    if (state.highScore > 0) {
      ctx.fillStyle = '#ffd700';
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText(`🏆 High Score: ${state.highScore}`, W / 2, H / 2 + 60);
    }

    ctx.fillStyle = '#aaa';
    ctx.font = '18px sans-serif';
    ctx.fillText('Press any arrow key to start', W / 2, H / 2 + 100);
  }

  private drawGameOverScreen(ctx: CanvasRenderingContext2D, state: SnakeState): void {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    // Semi-transparent overlay
    ctx.fillStyle = 'rgba(15, 15, 26, 0.9)';
    ctx.fillRect(0, 0, W, H);

    // Title
    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 64px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('GAME OVER', W / 2, H / 2 - 80);

    // Final score
    ctx.fillStyle = '#fff';
    ctx.font = '32px sans-serif';
    ctx.fillText(`Final Score: ${state.score}`, W / 2, H / 2 - 10);

    // Length
    ctx.font = '24px sans-serif';
    ctx.fillStyle = '#aaa';
    ctx.fillText(`Length: ${state.snake.length}`, W / 2, H / 2 + 30);

    // High score indicator
    if (state.score === state.highScore && state.score > 0) {
      ctx.fillStyle = '#ffd700';
      ctx.font = 'bold 28px sans-serif';
      ctx.fillText('🎉 New High Score! 🎉', W / 2, H / 2 + 80);
    } else {
      ctx.fillStyle = '#ffd700';
      ctx.font = '20px sans-serif';
      ctx.fillText(`Best: ${state.highScore}`, W / 2, H / 2 + 70);
    }

    // Restart prompt
    ctx.fillStyle = '#aaa';
    ctx.font = '18px sans-serif';
    ctx.fillText('Press SPACE to restart', W / 2, H / 2 + 130);
    ctx.fillText('Press ESC to exit', W / 2, H / 2 + 160);
  }

  private drawPausedOverlay(ctx: CanvasRenderingContext2D): void {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 48px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('PAUSED', W / 2, H / 2);

    ctx.font = '20px sans-serif';
    ctx.fillStyle = '#aaa';
    ctx.fillText('Press P to resume', W / 2, H / 2 + 50);
  }
}
```

---

### 3. Add Restart Functionality to Input System

**File:** `src/contexts/canvas2d/games/snake/systems/InputSystem.ts`

Implement restart with state reset:

```typescript
import type { SnakeState, Direction } from '../types';
import { INITIAL_SPEED } from '../types';

export class InputSystem {
  private boundKey: (e: KeyboardEvent) => void;
  private state: SnakeState | null = null;
  private onExit: () => void;

  constructor(onExit: () => void) {
    this.onExit = onExit;
    this.boundKey = (e: KeyboardEvent) => this.handleKey(e);
  }

  attach(state: SnakeState): void {
    this.state = state;
    window.addEventListener('keydown', this.boundKey);
  }

  detach(): void {
    window.removeEventListener('keydown', this.boundKey);
    this.state = null;
  }

  private handleKey(e: KeyboardEvent): void {
    if (!this.state) return;

    const key = e.key.toLowerCase();

    // Start game on first input
    if (!this.state.started && !this.state.gameOver) {
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd'].includes(key)) {
        this.state.started = true;
      }
    }

    // Restart after game over
    if (this.state.gameOver && key === ' ') {
      this.restart(this.state);
      return;
    }

    // Direction changes
    if (this.state.started && !this.state.gameOver && !this.state.paused) {
      let newDir: Direction | null = null;

      switch (key) {
        case 'arrowup':
        case 'w':
          newDir = 'up';
          break;
        case 'arrowdown':
        case 's':
          newDir = 'down';
          break;
        case 'arrowleft':
        case 'a':
          newDir = 'left';
          break;
        case 'arrowright':
        case 'd':
          newDir = 'right';
          break;
      }

      if (newDir) {
        const opposites: Record<Direction, Direction> = {
          up: 'down',
          down: 'up',
          left: 'right',
          right: 'left',
        };

        if (opposites[newDir] !== this.state.dir) {
          this.state.nextDir = newDir;
        }
      }
    }

    // Pause toggle
    if (key === 'p' && this.state.started && !this.state.gameOver) {
      this.state.paused = !this.state.paused;
    }

    // Exit
    if (key === 'escape') {
      this.onExit();
    }
  }

  private restart(state: SnakeState): void {
    // Reset snake to center
    const centerX = Math.floor(state.gridW / 2);
    const centerY = Math.floor(state.gridH / 2);

    state.snake = [{ x: centerX, y: centerY }];
    state.dir = 'right';
    state.nextDir = 'right';
    state.food = null;
    state.score = 0;
    state.speed = INITIAL_SPEED;
    state.started = true;
    state.gameOver = false;
    state.paused = false;

    // Reset internal flags
    (state as any).justAte = false;
  }
}
```

**Restart pattern:** Reset all mutable state, keep high score

---

### 4. Update Engine with Collision System

**File:** `src/contexts/canvas2d/games/snake/SnakeEngine.ts`

Add collision checking to update loop:

```typescript
import { CollisionSystem } from './systems/CollisionSystem';

// Add field:
private collisionSystem: CollisionSystem;

// In constructor:
this.collisionSystem = new CollisionSystem();

// Update the update method (order matters!):
private update(): void {
  this.movementSystem.update(this.state);
  this.collisionSystem.update(this.state); // Check AFTER movement
  this.foodSystem.update(this.state);
  this.scoreSystem.update(this.state);
}
```

**Critical:** Collision must run AFTER movement but BEFORE food system

---

## Test It

1. **Run:** `npm run dev`
2. **Navigate:** Select "Snake"
3. **Wall Collision:**
   - Move snake toward edge
   - Hit wall → "GAME OVER" overlay appears
   - Shows final score and length
4. **Self-Collision:**
   - Grow snake by eating food
   - Turn snake to hit its own body
   - Game ends immediately
5. **Restart:**
   - After game over, press **SPACE**
   - Snake resets to center with length 1
   - Score resets to 0
   - Speed resets to initial (120ms)
   - High score persists
6. **High Score:**
   - Beat your previous score
   - "New High Score!" message appears
   - Restart game → high score still shown

---

## Challenges

**Easy:**
- Add sound effect on game over
- Show death reason ("Hit wall" vs "Hit self")
- Change wall collision to wrap around (opposite edge)

**Medium:**
- Add "lives" system (3 chances before game over)
- Shrink snake by 1 segment on collision instead of game over
- Add visual "death animation" (flash red)

**Hard:**
- Replay system (record moves, play back on game over)
- Leaderboard with top 5 scores
- Ghost replay (show previous best run while playing)

---

## What You Learned

✅ Boundary validation (edge detection)  
✅ Self-collision with array iteration  
✅ Game state transitions (playing → game over)  
✅ State reset mechanics  
✅ System execution order importance  
✅ localStorage persistence patterns

**Next:** Visual polish and features!
