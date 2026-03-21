# Step 5: Visual Polish & Extra Features

**Goal:** Add final polish with click handlers, visual improvements, and complete UX.

**Time:** ~15 minutes

---

## What You'll Build

Polish features:
- **Click handlers**: Exit button, restart button
- **Visual feedback**: Smooth gradients, better shadows
- **Score tracking**: Real-time best score updates
- **Code organization**: Clean adapter pattern
- **Help system**: Integrated controls overlay

---

## Concepts

- **Mouse Input**: Click regions for UI buttons
- **Visual Hierarchy**: Layering and contrast
- **User Feedback**: Clear interactive elements
- **Complete Game Loop**: All edge cases handled

---

## Code

### 1. Add Click Handler to Input System

**File:** `src/contexts/canvas2d/games/snake/systems/InputSystem.ts`

Add mouse/touch support:

```typescript
import type { SnakeState, Direction } from '../types';
import { INITIAL_SPEED } from '../types';

export class InputSystem {
  private boundKey: (e: KeyboardEvent) => void;
  private boundClick: (e: MouseEvent) => void;
  private state: SnakeState | null = null;
  private onExit: () => void;
  private canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement, onExit: () => void) {
    this.canvas = canvas;
    this.onExit = onExit;
    this.boundKey = (e: KeyboardEvent) => this.handleKey(e);
    this.boundClick = (e: MouseEvent) => this.handleClick(e);
  }

  attach(state: SnakeState): void {
    this.state = state;
    window.addEventListener('keydown', this.boundKey);
    this.canvas.addEventListener('click', this.boundClick);
  }

  detach(): void {
    window.removeEventListener('keydown', this.boundKey);
    this.canvas.removeEventListener('click', this.boundClick);
    this.state = null;
  }

  private handleClick(e: MouseEvent): void {
    if (!this.state) return;

    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;

    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;

    // Exit button (top-left corner, during gameplay)
    if (this.state.started && !this.state.gameOver) {
      if (mx < 80 && my < 40) {
        this.onExit();
        return;
      }
    }

    // Restart button (center, after game over)
    if (this.state.gameOver) {
      const W = this.canvas.width;
      const H = this.canvas.height;

      const centerX = W / 2;
      const centerY = H / 2 + 130;

      const dx = mx - centerX;
      const dy = my - centerY;

      // Check if clicked near restart text (35-65% width, 50-65% height)
      if (mx > W * 0.35 && mx < W * 0.65 && my > H * 0.5 && my < H * 0.65) {
        this.restart(this.state);
        return;
      }
    }

    // Start game (anywhere during start screen)
    if (!this.state.started && !this.state.gameOver) {
      this.state.started = true;
    }
  }

  private handleKey(e: KeyboardEvent): void {
    if (!this.state) return;

    const key = e.key.toLowerCase();

    // Start game on first input
    if (!this.state.started && !this.state.gameOver) {
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd', ' '].includes(key)) {
        this.state.started = true;
      }
    }

    // Restart after game over
    if (this.state.gameOver && (key === ' ' || key === 'enter')) {
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

    (state as any).justAte = false;
  }
}
```

**Click regions:**
- Exit: Top-left 80×40px during gameplay
- Restart: Center region (35-65% width) after game over
- Start: Anywhere on start screen

---

### 2. Update Engine Constructor

**File:** `src/contexts/canvas2d/games/snake/SnakeEngine.ts`

Pass canvas to InputSystem:

```typescript
// Update InputSystem initialization:
this.inputSystem = new InputSystem(canvas, onExit);
```

---

### 3. Enhance Board Renderer Visuals

**File:** `src/contexts/canvas2d/games/snake/renderers/BoardRenderer.ts`

Add better shadows and effects:

```typescript
import type { SnakeState } from '../types';
import { CELL } from '../types';

export class BoardRenderer {
  private startTime: number = performance.now();

  render(ctx: CanvasRenderingContext2D, state: SnakeState): void {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    // Dark background with subtle gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
    bgGrad.addColorStop(0, '#1a1a2e');
    bgGrad.addColorStop(1, '#16213e');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    this.drawGrid(ctx, state.gridW, state.gridH);
    this.drawSnake(ctx, state.snake);

    if (state.food) {
      const now = performance.now();
      this.drawFood(ctx, state.food, now);
    }
  }

  private drawGrid(ctx: CanvasRenderingContext2D, gridW: number, gridH: number): void {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;

    // Vertical lines
    for (let x = 0; x <= gridW; x++) {
      const px = x * CELL;
      ctx.beginPath();
      ctx.moveTo(px, 0);
      ctx.lineTo(px, gridH * CELL);
      ctx.stroke();
    }

    // Horizontal lines
    for (let y = 0; y <= gridH; y++) {
      const py = y * CELL;
      ctx.beginPath();
      ctx.moveTo(0, py);
      ctx.lineTo(gridW * CELL, py);
      ctx.stroke();
    }
  }

  private drawSnake(ctx: CanvasRenderingContext2D, snake: Coord[]): void {
    for (let i = snake.length - 1; i >= 0; i--) {
      const seg = snake[i];
      const isHead = i === 0;
      const pct = 1 - i / snake.length;

      if (isHead) {
        // Head: bright green with stronger glow
        ctx.shadowColor = '#4ade80';
        ctx.shadowBlur = 12;
        ctx.fillStyle = '#4ade80';
      } else {
        // Body: smooth gradient
        const lightness = 30 + pct * 25;
        ctx.shadowBlur = 2;
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.fillStyle = `hsl(145, 70%, ${lightness}%)`;
      }

      // Rounded corners effect with stroke
      ctx.fillRect(
        seg.x * CELL + 1,
        seg.y * CELL + 1,
        CELL - 2,
        CELL - 2
      );

      // Subtle border on body
      if (!isHead) {
        ctx.strokeStyle = `hsl(145, 70%, ${lightness - 10}%)`;
        ctx.lineWidth = 1;
        ctx.strokeRect(
          seg.x * CELL + 1,
          seg.y * CELL + 1,
          CELL - 2,
          CELL - 2
        );
      }

      ctx.shadowBlur = 0;
    }
  }

  private drawFood(ctx: CanvasRenderingContext2D, food: Coord, now: number): void {
    // Breathing pulse
    const pulse = 0.8 + 0.2 * Math.sin(now * 0.006);
    const radius = (CELL / 2 - 2) * pulse;

    // Outer glow
    ctx.shadowColor = '#ef4444';
    ctx.shadowBlur = 15 * pulse;

    // Inner gradient
    const centerX = food.x * CELL + CELL / 2;
    const centerY = food.y * CELL + CELL / 2;

    const grad = ctx.createRadialGradient(
      centerX - radius * 0.3,
      centerY - radius * 0.3,
      0,
      centerX,
      centerY,
      radius
    );
    grad.addColorStop(0, '#fca5a5');
    grad.addColorStop(0.7, '#ef4444');
    grad.addColorStop(1, '#dc2626');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
  }
}
```

**Visual improvements:**
- Background gradient (depth)
- Stronger head glow
- Body segment borders
- Food radial gradient (3D look)

---

### 4. Add Game Info to Index

**File:** `src/contexts/canvas2d/games/snake/index.ts`

Complete game definition:

```typescript
import type { GameDefinition } from '@core/GameInterface';
import { PlatformAdapter } from './adapters/PlatformAdapter';

export const SnakeGame: GameDefinition = {
  id: 'snake',
  name: 'Snake',
  description: 'Classic snake game - eat food, grow longer, avoid walls and yourself',
  genre: 'Arcade',
  difficulty: 'Medium',
  controls: ['keyboard', 'mouse'],
  HelpComponent: () => {
    return `
🎮 CONTROLS
━━━━━━━━━━━━━━━━━━━━
Arrow Keys / WASD: Move snake
P: Pause/Resume
SPACE / ENTER: Start/Restart
ESC: Exit to menu
Mouse: Click EXIT or RESTART

🎯 OBJECTIVE
━━━━━━━━━━━━━━━━━━━━
• Eat red food to grow longer
• Each food = +10 points
• Game speeds up as you grow
• Avoid hitting walls
• Don't run into yourself

💡 TIPS
━━━━━━━━━━━━━━━━━━━━
• Plan your path ahead
• Use the edges carefully
• Create spirals for safety
• Speed increases with each food

🏆 SCORING
━━━━━━━━━━━━━━━━━━━━
• Food: +10 points
• High score persists across games
    `.trim();
  },
  instanceFactory: (canvas, onExit) => new PlatformAdapter(canvas, onExit),
};
```

---

### 5. Final Score System Polish

**File:** `src/contexts/canvas2d/games/snake/systems/ScoreSystem.ts`

Clean up tracking:

```typescript
import type { SnakeState } from '../types';
import { SPEED_INCREMENT, MIN_SPEED } from '../types';

export class ScoreSystem {
  private lastFoodPos: string | null = null;

  update(state: SnakeState): void {
    if (state.gameOver || !state.started) return;

    // Detect food eaten
    const currentFoodPos = state.food ? `${state.food.x},${state.food.y}` : null;

    if (this.lastFoodPos !== null && currentFoodPos !== this.lastFoodPos) {
      // Food was eaten - increase speed
      state.speed = Math.max(MIN_SPEED, state.speed + SPEED_INCREMENT);
    }

    this.lastFoodPos = currentFoodPos;

    // Update high score in real-time
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

---

## Test It

1. **Run:** `npm run dev`
2. **Navigate:** Select "Snake"
3. **Start Screen:**
   - Shows title and instructions
   - Click anywhere or press arrow key to start
4. **Gameplay:**
   - Smooth movement on dark gradient background
   - Head has bright glow effect
   - Food pulses with radial gradient
   - Score and length displayed in top bar
   - Click "< EXIT" to return to menu
5. **Game Over:**
   - Hit wall or self
   - Shows final stats
   - Click center or press Space to restart
6. **Persistence:**
   - Close browser tab
   - Reopen game
   - High score still displayed
7. **Help System:**
   - From platform menu, view help overlay
   - Shows all controls and tips

---

## Congratulations! 🎉

You've built a complete Snake game with:
- ✅ Grid-based coordinate system
- ✅ Smooth tick-based movement
- ✅ Arrow key + WASD controls
- ✅ Reverse direction prevention
- ✅ Random food spawning (avoiding snake)
- ✅ Growth by tail retention
- ✅ Wall and self-collision detection
- ✅ Progressive speed difficulty
- ✅ Score tracking with persistence
- ✅ Pause/resume functionality
- ✅ Full game state machine (start/playing/paused/gameover)
- ✅ Click handlers for UI
- ✅ Polished visual effects

---

## Next Challenges

**Easy:**
- Add sound effects (eat, game over)
- Multiple food colors (different point values)
- Show "x2" text when eating food

**Medium:**
- Obstacles (walls in middle of grid)
- Power-ups (speed boost, slow-motion, ghost mode)
- Multiplayer (2 snakes on same grid)

**Hard:**
- AI opponent snake
- Level system with increasing obstacles
- Pathfinding algorithm (auto-play mode)
- Mobile touch controls (swipe to turn)

---

## What You Learned Overall

✅ Grid-based game architecture  
✅ Tick vs frame separation (discrete logic, smooth render)  
✅ Input buffering and validation  
✅ Array-based entity systems  
✅ Collision detection patterns  
✅ State machine design  
✅ localStorage persistence  
✅ Visual effects (gradients, shadows, animation)  
✅ Click region detection  
✅ System separation (SOLID principles)

**Great job!** 🐍
