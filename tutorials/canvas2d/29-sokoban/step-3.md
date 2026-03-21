# Step 3: Win Detection & Levels

**Goal:** Detect when all boxes are on targets, show level complete, and load the next level.

**Time:** ~15 minutes

---

## What You'll Build

- **Win detection** that checks if every target cell has a box on it
- **Level complete overlay** showing the move count and prompting for the next level
- **10+ puzzle levels** of increasing difficulty
- **Level progression** from one puzzle to the next
- **Game won screen** when all levels are completed

---

## Concepts

- **Target Coverage Check**: Iterate all cells. For each target cell, check if any box occupies that position. If all targets are covered, the level is won.
- **Level Advancement**: Increment the level index and call `loadLevel` with the new index
- **Progressive Difficulty**: Early levels have 1-2 boxes in simple rooms. Later levels have 4-6 boxes with tight corridors and tricky layouts.

---

## Code

### 1. Expand Level Data

**File:** `src/contexts/canvas2d/games/sokoban/data/levels.ts`

Add 12 levels total with increasing complexity.

```typescript
export const LEVELS: string[][] = [
  ['  ####  ', '###  ###', '#   .  #', '# $  @ #', '#      #', '########'],
  ['######  ', '#    ###', '# $ $ .#', '# @  ..#', '#      #', '########'],
  ['  #####', '###   #', '#  $  #', '# .#$ #', '# .# @#', '#     #', '#######'],
  ['########', '#      #', '# $$ . #', '#  # . #', '# @#   #', '#  #####', '####    '],
  [' ####   ', '##  ### ', '# . $ ##', '# .$$  #', '# . $@ #', '##    ##', ' ######'],
  ['########', '#      #', '# #### #', '# #..# #', '# $ $  #', '#  $ # #', '# @  # #', '########'],
  ['  ######', '###    #', '#  # $ #', '# .#$  #', '# .  $.#', '# @# # #', '#  #   #', '########'],
  ['   ####  ', '  ##  ## ', ' ## $  ##', '## .$. @#', '#  .$. ##', '## $  ## ', ' ##  ##  ', '  ####   '],
  [' ########', '##  #   #', '#   $   #', '# #.$.# #', '#  .@.  #', '# #.$.# #', '#   $   #', '##  #  ##', ' #######'],
  ['  ########', '###      #', '#  $ # $ #', '# #..#.. #', '#  $ # $ #', '# #..   ##', '#   #@# # ', '###     # ', '  ####### '],
  ['   ###   ', '   # #   ', '####$####', '#  ...  #', '# $@$$ #', '#  ...  #', '####$####', '   # #   ', '   ###   '],
  ['##########', '#        #', '# ## ##$ #', '# #....# #', '# # $$ # #', '#   $$   #', '## #  # ##', ' # # @# # ', ' #      # ', ' ######## '],
];
```

---

### 2. Update the Level System

**File:** `src/contexts/canvas2d/games/sokoban/systems/LevelSystem.ts`

Add win detection and level advancement logic.

```typescript
import { Cell, type SokobanState, type Pos } from '../types';
import { LEVELS } from '../data/levels';

export class LevelSystem {
  loadLevel(state: SokobanState, levelIndex: number): void {
    const raw = LEVELS[levelIndex];
    const height = raw.length;
    const width = Math.max(...raw.map((r) => r.length));
    const grid: Cell[][] = [];
    const boxes: Pos[] = [];
    let player: Pos = { x: 0, y: 0 };

    for (let y = 0; y < height; y++) {
      const row: Cell[] = [];
      for (let x = 0; x < width; x++) {
        const ch = raw[y][x] ?? ' ';
        switch (ch) {
          case '#': row.push(Cell.Wall); break;
          case '.': row.push(Cell.Target); break;
          case '@': row.push(Cell.Floor); player = { x, y }; break;
          case '$': row.push(Cell.Floor); boxes.push({ x, y }); break;
          case '*': row.push(Cell.Target); boxes.push({ x, y }); break;
          case '+': row.push(Cell.Target); player = { x, y }; break;
          default:  row.push(Cell.Floor); break;
        }
      }
      grid.push(row);
    }

    state.grid = grid; state.width = width; state.height = height;
    state.player = player; state.boxes = boxes;
    state.level = levelIndex; state.moves = 0; state.undoStack = [];
    state.levelComplete = false; state.gameWon = false;
    state.queuedDir = null; state.undoRequested = false;
    state.restartRequested = false; state.advanceRequested = false;
  }

  update(state: SokobanState, _dt: number): void {
    if (state.restartRequested) { state.restartRequested = false; this.loadLevel(state, state.level); return; }
    if (state.advanceRequested) {
      state.advanceRequested = false;
      if (state.level + 1 < LEVELS.length) this.loadLevel(state, state.level + 1);
      return;
    }

    // Win detection
    if (!state.levelComplete) {
      let allCovered = true;
      for (let y = 0; y < state.height; y++) {
        for (let x = 0; x < state.width; x++) {
          if (state.grid[y][x] === Cell.Target) {
            if (!state.boxes.some((b) => b.x === x && b.y === y)) { allCovered = false; break; }
          }
        }
        if (!allCovered) break;
      }
      if (allCovered) {
        state.levelComplete = true;
        if (state.level + 1 >= LEVELS.length) state.gameWon = true;
      }
    }
  }

  get totalLevels(): number { return LEVELS.length; }
}
```

---

### 3. Create the HUD Renderer

**File:** `src/contexts/canvas2d/games/sokoban/renderers/HUDRenderer.ts`

Display level info and completion overlays.

```typescript
import { COLORS, type SokobanState } from '../types';
import { LEVELS } from '../data/levels';

export class HUDRenderer {
  render(ctx: CanvasRenderingContext2D, state: SokobanState): void {
    const W = ctx.canvas.width; const H = ctx.canvas.height;
    this.drawTopBar(ctx, state, W);
    if (state.levelComplete && !state.gameWon) this.drawLevelComplete(ctx, state, W, H);
    if (state.gameWon) this.drawGameWon(ctx, W, H);
  }

  private drawTopBar(ctx: CanvasRenderingContext2D, state: SokobanState, W: number): void {
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0, 0, W, 44);
    ctx.font = 'bold 16px monospace'; ctx.textBaseline = 'middle';
    ctx.fillStyle = COLORS.accent; ctx.textAlign = 'left';
    ctx.fillText(`Level ${state.level + 1} / ${LEVELS.length}`, 12, 22);
    ctx.fillStyle = COLORS.hud; ctx.textAlign = 'center';
    ctx.fillText(`Moves: ${state.moves}`, W / 2, 22);
    ctx.fillStyle = COLORS.hudDim; ctx.textAlign = 'right';
    ctx.font = '12px monospace';
    ctx.fillText('[R] Restart  [ESC] Exit', W - 12, 22);
  }

  private drawLevelComplete(ctx: CanvasRenderingContext2D, state: SokobanState, W: number, H: number): void {
    ctx.fillStyle = COLORS.overlay; ctx.fillRect(0, 0, W, H);
    ctx.font = 'bold 36px monospace'; ctx.fillStyle = '#4ecdc4';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('Level Complete!', W / 2, H / 2 - 40);
    ctx.font = '18px monospace'; ctx.fillStyle = COLORS.hud;
    ctx.fillText(`Completed in ${state.moves} moves`, W / 2, H / 2 + 10);
    ctx.fillStyle = COLORS.hudDim; ctx.font = '14px monospace';
    ctx.fillText('Press [Space] or [Enter] for next level', W / 2, H / 2 + 50);
  }

  private drawGameWon(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    ctx.fillStyle = COLORS.overlay; ctx.fillRect(0, 0, W, H);
    ctx.font = 'bold 42px monospace'; ctx.fillStyle = COLORS.accent;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('You Win!', W / 2, H / 2 - 40);
    ctx.font = '20px monospace'; ctx.fillStyle = COLORS.hud;
    ctx.fillText('All levels completed!', W / 2, H / 2 + 10);
    ctx.fillStyle = COLORS.hudDim; ctx.font = '14px monospace';
    ctx.fillText('Press [Space] or [Enter] to play again', W / 2, H / 2 + 50);
  }
}
```

---

### 4. Update the Input System

Add Space/Enter for level advancement.

```typescript
// Add these cases to the handleKey method in InputSystem:
// After level complete, advance
if (state.levelComplete && !state.gameWon) {
  if (e.key === ' ' || e.key === 'Enter') {
    e.preventDefault();
    state.advanceRequested = true;
    return;
  }
}
// After game won, restart from level 1
if (state.gameWon) {
  if (e.key === ' ' || e.key === 'Enter') {
    e.preventDefault();
    state.level = 0;
    state.restartRequested = true;
    state.gameWon = false;
    return;
  }
}
// Block game input if level is complete
if (state.levelComplete) return;
```

---

### 5. Update the Engine

Add LevelSystem update and HUD rendering.

```typescript
// In the engine loop, add after moveSystem.update:
this.levelSystem.update(this.state, 0);

// In the render section, add after boardRenderer:
this.hudRenderer.render(this.ctx, this.state);
```

---

## Test It

1. **Run:** `npm run dev`
2. **Open:** the Sokoban game
3. **Observe:**
   - Push all boxes onto target markers -- "**Level Complete!**" overlay appears
   - Press Space or Enter -- the **next level** loads
   - The HUD shows **Level X / 12** and **Moves** count
   - Complete all 12 levels -- "**You Win!**" screen appears
   - Press Space again to restart from Level 1

---

## Challenges

**Easy:**
- Add 3 more levels to the LEVELS array.

**Medium:**
- Display a star rating based on move count (e.g., under 20 = 3 stars).

**Hard:**
- Add a level select screen that lets you jump to any previously completed level.

---

## What You Learned

- Win detection by checking target coverage
- Level progression with index-based level loading
- Designing progressive difficulty in puzzle levels
- Overlay screens for level completion and game-won states
- Handling level advancement via keyboard input

**Next:** Undo system -- press Z to take back moves!
