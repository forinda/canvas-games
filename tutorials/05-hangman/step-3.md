# Step 3: Hangman Figure Drawing

**Goal:** Draw the progressive hangman figure, adding a body part for each wrong guess (6 stages total).

**Time:** ~15 minutes

---

## What You'll Build

A gallows and hanging man that builds up with each incorrect guess:

```
Stage 0: Empty    Stage 3: Head+Body+Arms    Stage 6: Complete
                                                (Game Over)
   +---+             +---+                    +---+
   |   |             |   |                    |   |
   |                 |   O                    |   O
   |                 |  /|\                   |  /|\
   |                 |                        |  / \
   |                 |                        |
 =====             =====                    =====
```

---

## Concepts

- **Progressive Drawing**: 6 stages (0-6 wrong guesses)
- **Canvas Paths**: Lines and circles for body parts
- **Stage Sequence**: Base → Pole → Top → Rope → Head → Body → Left Arm → Right Arm → Left Leg → Right Leg

---

## Code

### 1. Create Game Renderer

**File:** `src/games/hangman/renderers/GameRenderer.ts`

```typescript
import type { HangmanState } from '../types';

export class GameRenderer {
  render(ctx: CanvasRenderingContext2D, state: HangmanState): void {
    const W = state.canvasWidth;
    const H = state.canvasHeight;

    // Draw gallows
    this.drawGallows(ctx, W, H);

    // Draw hangman parts based on wrong guess count
    this.drawHangman(ctx, W, H, state.wrongGuesses.length);
  }

  private drawGallows(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    const baseX = W / 4;
    const baseY = H / 2 - 50;
    const poleHeight = 200;
    const armLength = 100;

    ctx.strokeStyle = '#8b4513'; // Brown
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';

    ctx.beginPath();
    // Base
    ctx.moveTo(baseX - 50, baseY + poleHeight);
    ctx.lineTo(baseX + 50, baseY + poleHeight);
    // Vertical pole
    ctx.moveTo(baseX, baseY + poleHeight);
    ctx.lineTo(baseX, baseY);
    // Top beam
    ctx.moveTo(baseX, baseY);
    ctx.lineTo(baseX + armLength, baseY);
    // Rope
    ctx.moveTo(baseX + armLength, baseY);
    ctx.lineTo(baseX + armLength, baseY + 40);
    ctx.stroke();
  }

  private drawHangman(ctx: CanvasRenderingContext2D, W: number, H: number, stage: number): void {
    const baseX = W / 4;
    const baseY = H / 2 - 50;
    const armLength = 100;
    const headRadius = 20;
    const ropeY = baseY + 40;
    const headCenterY = ropeY + headRadius;
    const bodyTop = headCenterY + headRadius;
    const bodyBottom = bodyTop + 60;
    const armY = bodyTop + 20;
    const legY = bodyBottom;

    const centerX = baseX + armLength;

    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';

    // Stage 1: Head
    if (stage >= 1) {
      ctx.beginPath();
      ctx.arc(centerX, headCenterY, headRadius, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Stage 2: Body
    if (stage >= 2) {
      ctx.beginPath();
      ctx.moveTo(centerX, bodyTop);
      ctx.lineTo(centerX, bodyBottom);
      ctx.stroke();
    }

    // Stage 3: Left Arm
    if (stage >= 3) {
      ctx.beginPath();
      ctx.moveTo(centerX, armY);
      ctx.lineTo(centerX - 30, armY + 25);
      ctx.stroke();
    }

    // Stage 4: Right Arm
    if (stage >= 4) {
      ctx.beginPath();
      ctx.moveTo(centerX, armY);
      ctx.lineTo(centerX + 30, armY + 25);
      ctx.stroke();
    }

    // Stage 5: Left Leg
    if (stage >= 5) {
      ctx.beginPath();
      ctx.moveTo(centerX, legY);
      ctx.lineTo(centerX - 25, legY + 30);
      ctx.stroke();
    }

    // Stage 6: Right Leg (Game Over!)
    if (stage >= 6) {
      ctx.beginPath();
      ctx.moveTo(centerX, legY);
      ctx.lineTo(centerX + 25, legY + 30);
      ctx.stroke();
    }
  }
}
```

**Key Points:**
- **Gallows**: Always visible (brown wood)
- **Body Parts**: Conditionally rendered based on `wrongGuesses.length`
- **Stage Order**: Head → Body → Arms (L/R) → Legs (L/R)

---

### 2. Update Engine to Use Renderer

**File:** `src/games/hangman/HangmanEngine.ts`

```typescript
import { GameRenderer } from './renderers/GameRenderer';

export class HangmanEngine {
  // ... existing properties ...
  private gameRenderer: GameRenderer;

  constructor(canvas: HTMLCanvasElement) {
    // ... existing setup ...

    this.gameRenderer = new GameRenderer();
    
    // ... rest of constructor ...
  }

  private render(): void {
    const { ctx } = this;
    const W = this.state.canvasWidth;
    const H = this.state.canvasHeight;

    // Background
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, W, H);

    this.gameRenderer.render(ctx, this.state); // ← Render gallows + hangman
    this.renderCategory();
    this.renderWord();
    this.renderKeyboard();
  }

  // ... existing methods ...
}
```

---

### 3. Add Wrong Guess Counter Display

Update `renderCategory()` to show remaining guesses:

```typescript
private renderCategory(): void {
  const { ctx, state } = this;
  const W = state.canvasWidth;

  ctx.fillStyle = '#888';
  ctx.font = '20px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`Category: ${state.category}`, W / 2, 50);

  // Show remaining guesses
  const remaining = MAX_WRONG - state.wrongGuesses.length;
  ctx.fillStyle = remaining <= 2 ? '#ff4444' : '#fff';
  ctx.fillText(`Guesses left: ${remaining}`, W / 2, 80);
}
```

---

## Test It

1. **Run:** `npm run dev`
2. **Make wrong guesses**: Press letters not in "ELEPHANT" (e.g., X, Z, Q)
3. **Watch figure build**:
   - 1 wrong → Head appears
   - 2 wrong → Body added
   - 3 wrong → Left arm
   - 4 wrong → Right arm
   - 5 wrong → Left leg
   - 6 wrong → Right leg (complete)
4. **Check counter**: "Guesses left" decreases with each wrong guess

---

## Stage Breakdown

| Wrong Guesses | Body Parts |
|---------------|------------|
| 0 | Empty gallows |
| 1 | Head (○) |
| 2 | Body (\|) |
| 3 | Left arm (/) |
| 4 | Right arm (\\) |
| 5 | Left leg (/) |
| 6 | Right leg (\\) — GAME OVER |

---

## What You Learned

✅ Draw complex shapes with Canvas paths  
✅ Render conditionally based on game state  
✅ Create progressive visual feedback  
✅ Use `lineCap: 'round'` for smooth lines

---

## Next Step

→ [Step 4: Win/Loss Detection & Categories](./step-4.md) — Detect game end conditions and add randomized word lists
