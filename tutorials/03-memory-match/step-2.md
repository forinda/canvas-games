# Step 2: Card Flipping & Reveal

**Goal:** Click a card to flip it face-up and reveal its icon.

**Time:** ~15 minutes

---

## What You'll Build

Interactive card flipping: click a face-down card to reveal the emoji underneath.

```
Before click:        After click:
?  ?  ?  ?          ?  🐱 ?  ?
?  ?  ?  ?    →     ?  ?  ?  ?
?  ?  ?  ?          ?  ?  ?  ?
?  ?  ?  ?          ?  ?  ?  ?
```

---

## Concepts

- **Mouse-to-Grid Coordinates**: Convert click position to card index
- **Flipped State**: Toggle `card.flipped` to show the icon
- **Icon Rendering**: Display emoji symbols on face-up cards

---

## Code

### 1. Create Input System

**File:** `src/games/memory-match/systems/InputSystem.ts`

```typescript
import type { MemoryState } from '../types';

export class InputSystem {
  private clickHandler: (e: MouseEvent) => void;

  constructor(
    private state: MemoryState,
    private canvas: HTMLCanvasElement,
  ) {
    this.clickHandler = (e: MouseEvent) => this.onClick(e);
  }

  attach(): void {
    this.canvas.addEventListener('click', this.clickHandler);
  }

  detach(): void {
    this.canvas.removeEventListener('click', this.clickHandler);
  }

  private onClick(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Convert pixel coordinates to grid coordinates
    const col = Math.floor((x - this.state.boardOffsetX) / this.state.cellSize);
    const row = Math.floor((y - this.state.boardOffsetY) / this.state.cellSize);

    // Validate click is within grid bounds
    if (row >= 0 && row < this.state.rows && col >= 0 && col < this.state.cols) {
      const index = row * this.state.cols + col;
      this.flipCard(index);
    }
  }

  private flipCard(index: number): void {
    const card = this.state.board[index];
    
    // Don't allow flipping if already flipped or matched
    if (card.flipped || card.matched) return;

    // Flip the card face-up
    card.flipped = true;
  }
}
```

**Key Points:**
- **Row/Col Calculation**: `Math.floor((y - offsetY) / cellSize)` converts pixel Y to row
- **Index Calculation**: `row * cols + col` converts 2D coordinates to 1D array index
- **Validation**: Check bounds before accessing the `board[]` array

---

### 2. Update Rendering to Show Icons

**File:** `src/games/memory-match/MemoryEngine.ts`

```typescript
import { InputSystem } from './systems/InputSystem';

export class MemoryEngine {
  // ... existing properties ...
  private inputSystem: InputSystem;

  constructor(canvas: HTMLCanvasElement) {
    // ... existing setup ...

    this.inputSystem = new InputSystem(this.state, canvas);
    this.inputSystem.attach(); // ← Start listening to clicks
  }

  destroy(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
    this.inputSystem.detach(); // ← Remove event listeners
  }

  private renderBoard(): void {
    for (const card of this.state.board) {
      const x = this.state.boardOffsetX + card.col * this.state.cellSize;
      const y = this.state.boardOffsetY + card.row * this.state.cellSize;
      const size = this.state.cellSize - 8;

      if (card.flipped || card.matched) {
        // Face-up: Show white background with icon
        this.ctx.fillStyle = card.matched ? '#2e7d32' : 'white';
        this.ctx.fillRect(x + 4, y + 4, size, size);

        // Draw the emoji icon
        const icon = ICONS[card.iconIndex];
        this.ctx.font = `${size * 0.6}px sans-serif`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(icon, x + this.state.cellSize / 2, y + this.state.cellSize / 2);
      } else {
        // Face-down: Show purple background with "?"
        this.ctx.fillStyle = GAME_COLOR;
        this.ctx.fillRect(x + 4, y + 4, size, size);

        this.ctx.fillStyle = 'white';
        this.ctx.font = `${size * 0.5}px sans-serif`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('?', x + this.state.cellSize / 2, y + this.state.cellSize / 2);
      }
    }
  }

  // ... rest of the code ...
}
```

**Why:**
- **Face-Up Cards**: White background + emoji from `ICONS[iconIndex]`
- **Face-Down Cards**: Purple background + "?" symbol
- **Matched Cards**: Green background (we'll implement matching in the next step)

---

## Test It

1. **Run:** `npm run dev`
2. **Click any card**: It should flip to reveal an emoji
3. **Click multiple cards**: Each card you click should stay face-up

---

## Expected Behavior

| Action | Result |
|--------|--------|
| Click face-down card | Card flips to show emoji |
| Click face-up card | Nothing happens (already flipped) |
| Click multiple cards | All clicked cards stay face-up |

---

## Current Limitation

Right now, cards stay face-up forever after clicking. In the next step, we'll add logic to:
- Allow only **2 cards flipped at a time**
- **Check for matches** after two cards are flipped
- **Hide non-matching cards** after a short delay

---

## What You Learned

✅ Convert mouse coordinates to array indices  
✅ Handle click events on a grid  
✅ Render different states (face-up vs face-down)  
✅ Display emoji symbols on Canvas

---

## Next Step

→ [Step 3: Pair Matching Logic](./step-3.md) — Implement the "flip 2 cards, check for match, hide or keep" mechanic
