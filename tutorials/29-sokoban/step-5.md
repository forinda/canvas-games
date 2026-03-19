# Step 5: Polish

**Goal:** Add box-on-target color change, complete HUD, and final polish.

**Time:** ~15 minutes

---

## What You'll Build

- **Box-on-target coloring** -- boxes turn teal when placed on a target
- **Level counter** in the HUD showing progress through all levels
- **Move counter** prominently displayed
- **Control hints** for all keyboard shortcuts
- **Complete overlays** for level completion and game won
- **ESC to exit** back to the menu

---

## Concepts

- **Conditional Coloring**: Check `state.grid[box.y][box.x] === Cell.Target` to decide the box color. This gives immediate visual feedback that a box is correctly placed.
- **HUD Design**: Persistent information (level, moves) in a top bar. Contextual overlays (complete, won) appear on top.
- **Polish Layer**: Small touches like different border colors for placed boxes, control hints, and responsive font sizing make the game feel complete.

---

## Code

### 1. Final Board Renderer

The board renderer from Step 1 already handles box-on-target coloring via the `onTarget` flag. Here is the complete final version.

**File:** `src/games/sokoban/renderers/BoardRenderer.ts`

```typescript
import { Cell, COLORS, type SokobanState } from '../types';

export class BoardRenderer {
  render(ctx: CanvasRenderingContext2D, state: SokobanState): void {
    const W = ctx.canvas.width; const H = ctx.canvas.height;
    ctx.fillStyle = COLORS.background; ctx.fillRect(0, 0, W, H);

    const hudTop = 50; const padding = 20;
    const availW = W - padding * 2; const availH = H - hudTop - padding * 2;
    const tileSize = Math.floor(Math.min(availW / state.width, availH / state.height));
    const boardW = tileSize * state.width; const boardH = tileSize * state.height;
    const offsetX = Math.floor((W - boardW) / 2);
    const offsetY = Math.floor((H - boardH) / 2) + hudTop / 2;

    for (let y = 0; y < state.height; y++) {
      for (let x = 0; x < state.width; x++) {
        const cell = state.grid[y][x];
        const px = offsetX + x * tileSize; const py = offsetY + y * tileSize;
        if (cell === Cell.Wall) {
          ctx.fillStyle = COLORS.wall; ctx.fillRect(px + 1, py + 1, tileSize - 2, tileSize - 2);
          ctx.fillStyle = COLORS.wallTop; ctx.fillRect(px + 1, py + 1, tileSize - 2, tileSize - 5);
        } else {
          ctx.fillStyle = COLORS.floor; ctx.fillRect(px, py, tileSize, tileSize);
          ctx.strokeStyle = 'rgba(255,255,255,0.03)'; ctx.lineWidth = 1;
          ctx.strokeRect(px + 0.5, py + 0.5, tileSize - 1, tileSize - 1);
          if (cell === Cell.Target) {
            const cx = px + tileSize / 2; const cy = py + tileSize / 2;
            ctx.fillStyle = COLORS.targetDim;
            ctx.beginPath(); ctx.arc(cx, cy, tileSize * 0.24, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = COLORS.target;
            ctx.beginPath(); ctx.arc(cx, cy, tileSize * 0.2, 0, Math.PI * 2); ctx.fill();
          }
        }
      }
    }

    // Boxes -- color changes when on target
    for (const box of state.boxes) {
      const px = offsetX + box.x * tileSize; const py = offsetY + box.y * tileSize;
      const onTarget = state.grid[box.y][box.x] === Cell.Target;
      const inset = 3; const bx = px + inset; const by = py + inset; const bs = tileSize - inset * 2;
      ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(bx + 2, by + 2, bs, bs);
      ctx.fillStyle = onTarget ? COLORS.boxOnTarget : COLORS.box;
      ctx.fillRect(bx, by, bs, bs);
      ctx.strokeStyle = onTarget ? COLORS.boxOnTargetBorder : COLORS.boxBorder;
      ctx.lineWidth = 2; ctx.strokeRect(bx, by, bs, bs);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(bx + 4, by + 4); ctx.lineTo(bx + bs - 4, by + bs - 4);
      ctx.moveTo(bx + bs - 4, by + 4); ctx.lineTo(bx + 4, by + bs - 4);
      ctx.stroke();
    }

    // Player
    const ppx = offsetX + state.player.x * tileSize; const ppy = offsetY + state.player.y * tileSize;
    const cx = ppx + tileSize / 2; const cy = ppy + tileSize / 2; const r = tileSize * 0.35;
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.arc(cx + 2, cy + 2, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = COLORS.player;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = COLORS.playerEye; const eyeR = r * 0.15;
    ctx.beginPath(); ctx.arc(cx - r * 0.25, cy - r * 0.15, eyeR, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + r * 0.25, cy - r * 0.15, eyeR, 0, Math.PI * 2); ctx.fill();
  }
}
```

---

### 2. Final HUD Renderer

**File:** `src/games/sokoban/renderers/HUDRenderer.ts`

```typescript
import { COLORS, type SokobanState } from '../types';
import { LEVELS } from '../data/levels';

export class HUDRenderer {
  render(ctx: CanvasRenderingContext2D, state: SokobanState): void {
    const W = ctx.canvas.width; const H = ctx.canvas.height;
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0, 0, W, 44);
    const fs = Math.min(16, W * 0.025);
    ctx.font = `bold ${fs}px monospace`; ctx.textBaseline = 'middle';
    ctx.fillStyle = COLORS.accent; ctx.textAlign = 'left';
    ctx.fillText(`Level ${state.level + 1} / ${LEVELS.length}`, 12, 22);
    ctx.fillStyle = COLORS.hud; ctx.textAlign = 'center';
    ctx.fillText(`Moves: ${state.moves}`, W / 2, 22);
    ctx.fillStyle = COLORS.hudDim; ctx.textAlign = 'right';
    ctx.font = `${Math.min(12, W * 0.018)}px monospace`;
    ctx.fillText('[Z] Undo  [R] Restart  [H] Help  [ESC] Exit', W - 12, 22);

    if (state.levelComplete && !state.gameWon) {
      ctx.fillStyle = COLORS.overlay; ctx.fillRect(0, 0, W, H);
      ctx.font = `bold ${Math.min(36, W * 0.06)}px monospace`;
      ctx.fillStyle = COLORS.boxOnTarget; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('Level Complete!', W / 2, H / 2 - 40);
      ctx.font = `${Math.min(18, W * 0.03)}px monospace`; ctx.fillStyle = COLORS.hud;
      ctx.fillText(`Completed in ${state.moves} moves`, W / 2, H / 2 + 10);
      ctx.fillStyle = COLORS.hudDim; ctx.font = `${Math.min(14, W * 0.022)}px monospace`;
      ctx.fillText('Press [Space] or [Enter] for next level', W / 2, H / 2 + 50);
    }

    if (state.gameWon) {
      ctx.fillStyle = COLORS.overlay; ctx.fillRect(0, 0, W, H);
      ctx.font = `bold ${Math.min(42, W * 0.07)}px monospace`;
      ctx.fillStyle = COLORS.accent; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('You Win!', W / 2, H / 2 - 40);
      ctx.font = `${Math.min(20, W * 0.03)}px monospace`; ctx.fillStyle = COLORS.hud;
      ctx.fillText('All levels completed!', W / 2, H / 2 + 10);
      ctx.fillStyle = COLORS.hudDim; ctx.font = `${Math.min(14, W * 0.022)}px monospace`;
      ctx.fillText('Press [Space] or [Enter] to play again', W / 2, H / 2 + 50);
    }
  }
}
```

---

### 3. Final Engine

**File:** `src/games/sokoban/SokobanEngine.ts`

Complete engine with all systems and ESC to exit.

```typescript
import type { SokobanState } from './types';
import { InputSystem } from './systems/InputSystem';
import { MoveSystem } from './systems/MoveSystem';
import { LevelSystem } from './systems/LevelSystem';
import { BoardRenderer } from './renderers/BoardRenderer';
import { HUDRenderer } from './renderers/HUDRenderer';

export class SokobanEngine {
  private ctx: CanvasRenderingContext2D;
  private state: SokobanState;
  private running = false;
  private rafId = 0;
  private inputSystem: InputSystem;
  private moveSystem: MoveSystem;
  private levelSystem: LevelSystem;
  private boardRenderer: BoardRenderer;
  private hudRenderer: HUDRenderer;
  private resizeHandler: () => void;

  constructor(canvas: HTMLCanvasElement, onExit: () => void) {
    this.ctx = canvas.getContext('2d')!;
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    this.state = {
      grid: [], width: 0, height: 0, player: { x: 0, y: 0 }, boxes: [],
      level: 0, moves: 0, undoStack: [], levelComplete: false, gameWon: false,
      paused: false, canvasWidth: canvas.width, canvasHeight: canvas.height,
      queuedDir: null, undoRequested: false, restartRequested: false, advanceRequested: false,
    };
    this.moveSystem = new MoveSystem();
    this.levelSystem = new LevelSystem();
    this.boardRenderer = new BoardRenderer();
    this.hudRenderer = new HUDRenderer();
    this.inputSystem = new InputSystem(this.state, onExit);
    this.levelSystem.loadLevel(this.state, 0);
    this.resizeHandler = () => {
      canvas.width = window.innerWidth; canvas.height = window.innerHeight;
      this.state.canvasWidth = canvas.width; this.state.canvasHeight = canvas.height;
    };
    this.inputSystem.attach(); window.addEventListener('resize', this.resizeHandler);
  }

  start(): void { this.running = true; this.loop(); }
  destroy(): void { this.running = false; cancelAnimationFrame(this.rafId); this.inputSystem.detach(); window.removeEventListener('resize', this.resizeHandler); }

  private loop(): void {
    if (!this.running) return;
    this.moveSystem.update(this.state, 0);
    this.levelSystem.update(this.state, 0);
    this.boardRenderer.render(this.ctx, this.state);
    this.hudRenderer.render(this.ctx, this.state);
    this.rafId = requestAnimationFrame(() => this.loop());
  }
}
```

---

## Test It

1. **Run:** `npm run dev`
2. **Open:** the Sokoban game
3. **Observe:**
   - Boxes turn **teal** when pushed onto a target, **orange** when off a target
   - The HUD shows **Level X / 12**, **Moves**, and keyboard hints
   - Press **Z** to undo -- boxes and player snap back to previous positions
   - Press **R** to restart the current level
   - Complete a level -- overlay shows moves taken, press Space for next
   - Complete all 12 levels -- "You Win!" screen
   - Press **ESC** to exit to the menu

---

## Challenges

**Easy:**
- Add a subtle animation when a box snaps onto a target (brief green flash).

**Medium:**
- Track and display the best (fewest moves) score per level using localStorage.

**Hard:**
- Add smooth sliding animations when the player and boxes move between tiles.

---

## What You Learned

- Conditional visual styling based on game state (box-on-target color)
- Building a complete HUD with level progress, move counter, and control hints
- Responsive font sizing with `Math.min` for different screen sizes
- Complete game flow: start, play, complete, advance, win, restart
- Polish details that make a puzzle game feel satisfying

**Congratulations!** You have built a complete Sokoban puzzle game with level parsing, box pushing, win detection, undo, 12 levels, and polished UI.

**Next game:** [Minesweeper](../30-minesweeper/step-1.md) -- classic mine-finding puzzle!
