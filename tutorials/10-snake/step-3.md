# Step 3: Food Spawning & Growth

**Goal:** Add food that spawns randomly and makes the snake grow when eaten.

**Time:** ~20 minutes

---

## What You'll Build

Food mechanics:
- **Random spawning**: Food appears at empty grid cell
- **Collision detection**: Head touches food → eat
- **Growth mechanism**: Skip tail removal when eating
- **Score tracking**: +10 points per food
- **Visual feedback**: Pulsing red circle

---

## Concepts

- **Spawn Validation**: Ensure food doesn't spawn on snake
- **Head Collision**: Distance check with grid coords
- **Conditional Pop**: Growth by omitting tail removal
- **Score System**: Separate concern for point tracking

---

## Code

### 1. Create Food System

**File:** `src/games/snake/systems/FoodSystem.ts`

Handle spawning and eating:

```typescript
import type { SnakeState, Coord } from '../types';

export class FoodSystem {
  update(state: SnakeState): void {
    if (state.gameOver || state.paused || !state.started) return;

    // Spawn food if none exists
    if (!state.food) {
      state.food = this.spawnFood(state);
    }

    // Check if snake ate food
    const head = state.snake[0];
    if (state.food && head.x === state.food.x && head.y === state.food.y) {
      // Eat food
      state.food = null;
      state.score += 10;

      // Growth happens by NOT popping tail in MovementSystem
      // We'll add a flag for this
      (state as any).justAte = true;

      // Save high score
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

  private spawnFood(state: SnakeState): Coord {
    const { gridW, gridH, snake } = state;

    let attempts = 0;
    const maxAttempts = 1000;

    while (attempts < maxAttempts) {
      const x = Math.floor(Math.random() * gridW);
      const y = Math.floor(Math.random() * gridH);

      // Check if position is occupied by snake
      const occupied = snake.some(seg => seg.x === x && seg.y === y);

      if (!occupied) {
        return { x, y };
      }

      attempts++;
    }

    // Fallback (should never happen unless grid is full)
    return { x: 0, y: 0 };
  }
}
```

**Key patterns:**
- `some()` check: Efficient collision detection with snake body
- `justAte` flag: Communication between systems
- High score updates: Immediate persistence on improvement

---

### 2. Update Movement System to Handle Growth

**File:** `src/games/snake/systems/MovementSystem.ts`

Modify to skip tail pop when eating:

```typescript
import type { SnakeState, Coord } from '../types';

export class MovementSystem {
  update(state: SnakeState): void {
    if (state.gameOver || state.paused || !state.started) return;

    // Apply queued direction
    state.dir = state.nextDir;

    // Calculate new head position
    const head = state.snake[0];
    const newHead: Coord = { x: head.x, y: head.y };

    switch (state.dir) {
      case 'up':
        newHead.y -= 1;
        break;
      case 'down':
        newHead.y += 1;
        break;
      case 'left':
        newHead.x -= 1;
        break;
      case 'right':
        newHead.x += 1;
        break;
    }

    // Add new head to front
    state.snake.unshift(newHead);

    // Remove tail ONLY if didn't just eat
    const justAte = (state as any).justAte;
    if (justAte) {
      (state as any).justAte = false; // Reset flag
    } else {
      state.snake.pop(); // Normal movement
    }
  }
}
```

**Growth logic:** When eating, we unshift head but DON'T pop tail → snake grows by 1 segment

---

### 3. Update Board Renderer with Pulsing Food

**File:** `src/games/snake/renderers/BoardRenderer.ts`

Add animation to food rendering:

```typescript
// At the top, add a field to track animation time
private startTime: number = performance.now();

render(ctx: CanvasRenderingContext2D, state: SnakeState): void {
  const W = ctx.canvas.width;
  const H = ctx.canvas.height;

  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, W, H);

  this.drawGrid(ctx, state.gridW, state.gridH);
  this.drawSnake(ctx, state.snake);

  if (state.food) {
    const now = performance.now();
    this.drawFood(ctx, state.food, now);
  }
}

// Update drawFood to accept time and add pulsing:
private drawFood(ctx: CanvasRenderingContext2D, food: Coord, now: number): void {
  // Pulsing effect: 0.8 to 1.0
  const pulse = 0.8 + 0.2 * Math.sin(now * 0.006);
  const radius = (CELL / 2 - 2) * pulse;

  ctx.shadowColor = '#ef4444';
  ctx.shadowBlur = 10 * pulse;
  ctx.fillStyle = '#ef4444';

  ctx.beginPath();
  ctx.arc(
    food.x * CELL + CELL / 2,
    food.y * CELL + CELL / 2,
    radius,
    0,
    Math.PI * 2
  );
  ctx.fill();

  ctx.shadowBlur = 0;
}
```

**Pulse formula:** `sin(time * frequency)` creates smooth breathing animation

---

### 4. Create Score System

**File:** `src/games/snake/systems/ScoreSystem.ts`

Track score and speed progression:

```typescript
import type { SnakeState } from '../types';
import { SPEED_INCREMENT, MIN_SPEED } from '../types';

export class ScoreSystem {
  private lastFoodPos: string | null = null;

  update(state: SnakeState): void {
    if (state.gameOver || !state.started) return;

    // Detect food eaten (position changed)
    const currentFoodPos = state.food ? `${state.food.x},${state.food.y}` : null;

    if (this.lastFoodPos !== null && currentFoodPos !== this.lastFoodPos) {
      // Food was eaten - increase speed
      state.speed = Math.max(MIN_SPEED, state.speed + SPEED_INCREMENT);
    }

    this.lastFoodPos = currentFoodPos;
  }
}
```

**Speed progression:** Each food makes game 2ms faster (easier → harder), capped at 50ms

---

### 5. Update HUD to Show Score

**File:** `src/games/snake/renderers/HUDRenderer.ts`

Add score bar:

```typescript
import type { SnakeState } from '../types';

export class HUDRenderer {
  render(ctx: CanvasRenderingContext2D, state: SnakeState): void {
    if (!state.started) {
      this.drawStartScreen(ctx, state);
    } else if (state.paused) {
      this.drawPausedOverlay(ctx);
    } else {
      this.drawScoreBar(ctx, state);
    }
  }

  private drawScoreBar(ctx: CanvasRenderingContext2D, state: SnakeState): void {
    const W = ctx.canvas.width;

    // Dark bar at top
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(0, 0, W, 36);

    // Score (center)
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`Score: ${state.score} | Length: ${state.snake.length}`, W / 2, 18);

    // Best (right)
    ctx.font = '18px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffd700';
    ctx.fillText(`Best: ${state.highScore}`, W - 20, 18);

    // Exit button (left)
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

    // Show high score
    if (state.highScore > 0) {
      ctx.fillStyle = '#ffd700';
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText(`🏆 High Score: ${state.highScore}`, W / 2, H / 2 + 60);
    }

    ctx.fillStyle = '#aaa';
    ctx.font = '18px sans-serif';
    ctx.fillText('Press any arrow key to start', W / 2, H / 2 + 100);
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

### 6. Update Engine with New Systems

**File:** `src/games/snake/SnakeEngine.ts`

Add food and score systems:

```typescript
import { FoodSystem } from './systems/FoodSystem';
import { ScoreSystem } from './systems/ScoreSystem';

// Add fields:
private foodSystem: FoodSystem;
private scoreSystem: ScoreSystem;

// In constructor, initialize:
this.foodSystem = new FoodSystem();
this.scoreSystem = new ScoreSystem();

// Update the update method:
private update(): void {
  this.movementSystem.update(this.state);
  this.foodSystem.update(this.state);
  this.scoreSystem.update(this.state);
}
```

---

## Test It

1. **Run:** `npm run dev`
2. **Navigate:** Select "Snake"
3. **Gameplay:**
   - Red pulsing circle appears (food)
   - Move snake head to food
   - Food disappears, score increases by 10
   - Snake grows by 1 segment
   - New food spawns at random location
4. **Score Bar:**
   - Shows current score and snake length
   - Shows best score (persists across sessions)
5. **Speed:**
   - Each food eaten makes snake slightly faster
   - Try eating 10+ foods to feel the difference

---

## Challenges

**Easy:**
- Change food value to 25 points
- Spawn multiple food items at once
- Change food color to gold

**Medium:**
- Add "super food" that's worth 50 points (different color)
- Show speed multiplier on HUD
- Add combo system (eat 5 in a row = bonus)

**Hard:**
- Power-ups (slow-motion, invincibility, ghost mode)
- Food timer (disappears after 10 seconds)
- Visual trail effect when snake grows

---

## What You Learned

✅ Random spawning with validation  
✅ Grid-based collision detection  
✅ Growth by conditional array pop  
✅ Score tracking and persistence  
✅ Speed progression mechanics  
✅ Animated visual effects (pulsing)

**Next:** Collision detection and game over!
