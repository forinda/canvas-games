# Step 1: Level Parsing & Grid Rendering

**Goal:** Parse string-based level definitions and draw walls, floors, and targets on a grid.

**Time:** ~15 minutes

---

## What You'll Build

- **String-based level format** using characters like `#` (wall), `.` (target), `@` (player), `$` (box)
- **Level parser** that converts strings into a 2D grid of cell types plus entity positions
- **Grid renderer** with 3D-style walls, subtle floor tiles, and glowing red target markers
- **Player circle** with eyes drawn at the starting position
- **Box squares** with cross marks and drop shadows
- **Responsive layout** that scales and centers the board in any viewport

---

## Concepts

- **String Level Format**: Each row is a string, each character maps to a cell type. `#` = wall, `.` = target, `@` = player start, `$` = box, `*` = box on target, `+` = player on target.
- **Separation of Grid and Entities**: The grid stores static cell types (wall/floor/target). Player and box positions are stored separately so they can move independently.
- **Tile-Based Rendering**: Calculate `tileSize` from available space, then draw each cell at `offsetX + x * tileSize`.

---

## Code

### 1. Create Types

**File:** `src/contexts/canvas2d/games/sokoban/types.ts`

```typescript
export const Cell = { Floor: 0, Wall: 1, Target: 2 } as const;
export type Cell = (typeof Cell)[keyof typeof Cell];

export interface Pos { x: number; y: number; }
export interface Dir { dx: number; dy: number; }
export interface Snapshot { player: Pos; boxes: Pos[]; }

export interface SokobanState {
  grid: Cell[][];
  width: number;
  height: number;
  player: Pos;
  boxes: Pos[];
  level: number;
  moves: number;
  undoStack: Snapshot[];
  levelComplete: boolean;
  gameWon: boolean;
  paused: boolean;
  canvasWidth: number;
  canvasHeight: number;
  queuedDir: Dir | null;
  undoRequested: boolean;
  restartRequested: boolean;
  advanceRequested: boolean;
}

export const COLORS = {
  background: '#1a1a2e',
  wall: '#4a4a6a', wallTop: '#5a5a7a',
  floor: '#2a2a3e',
  target: '#ff6b6b', targetDim: 'rgba(255, 107, 107, 0.3)',
  box: '#f0a030', boxOnTarget: '#4ecdc4',
  boxBorder: '#c0801a', boxOnTargetBorder: '#35a89a',
  player: '#6c5ce7', playerEye: '#fff',
  hud: '#e0e0e0', hudDim: '#888',
  overlay: 'rgba(0, 0, 0, 0.7)', overlayText: '#fff',
  accent: '#795548',
};
```

---

### 2. Create Level Data

**File:** `src/contexts/canvas2d/games/sokoban/data/levels.ts`

Define puzzle levels as arrays of strings. Start with 3 levels for this step.

```typescript
/**
 * Sokoban level definitions.
 * # = wall, (space) = floor, . = target, @ = player, $ = box, * = box on target, + = player on target
 */
export const LEVELS: string[][] = [
  // Level 1 -- 1 box, 1 target
  [
    '  ####  ',
    '###  ###',
    '#   .  #',
    '# $  @ #',
    '#      #',
    '########',
  ],
  // Level 2 -- 2 boxes
  [
    '######  ',
    '#    ###',
    '# $ $ .#',
    '# @  ..#',
    '#      #',
    '########',
  ],
  // Level 3 -- L-shape corridor
  [
    '  #####',
    '###   #',
    '#  $  #',
    '# .#$ #',
    '# .# @#',
    '#     #',
    '#######',
  ],
];
```

---

### 3. Create the Level System

**File:** `src/contexts/canvas2d/games/sokoban/systems/LevelSystem.ts`

Parse a level string array into grid, player position, and box positions.

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

    state.grid = grid;
    state.width = width;
    state.height = height;
    state.player = player;
    state.boxes = boxes;
    state.level = levelIndex;
    state.moves = 0;
    state.undoStack = [];
    state.levelComplete = false;
    state.gameWon = false;
  }

  get totalLevels(): number { return LEVELS.length; }
}
```

**What's happening:**
- The parser iterates every character in every row. Each character maps to a cell type (wall/floor/target).
- `@` and `$` also record entity positions (player and boxes) while placing a floor cell underneath.
- `*` (box on target) places a target cell and records a box at that position.
- `+` (player on target) places a target cell and records the player position.

---

### 4. Create the Board Renderer

**File:** `src/contexts/canvas2d/games/sokoban/renderers/BoardRenderer.ts`

Draw the grid, boxes, and player with visual polish.

```typescript
import { Cell, COLORS, type SokobanState } from '../types';

export class BoardRenderer {
  render(ctx: CanvasRenderingContext2D, state: SokobanState): void {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, W, H);

    const hudTop = 50;
    const padding = 20;
    const availW = W - padding * 2;
    const availH = H - hudTop - padding * 2;
    const tileSize = Math.floor(Math.min(availW / state.width, availH / state.height));
    const boardW = tileSize * state.width;
    const boardH = tileSize * state.height;
    const offsetX = Math.floor((W - boardW) / 2);
    const offsetY = Math.floor((H - boardH) / 2) + hudTop / 2;

    // Draw grid
    for (let y = 0; y < state.height; y++) {
      for (let x = 0; x < state.width; x++) {
        const cell = state.grid[y][x];
        const px = offsetX + x * tileSize;
        const py = offsetY + y * tileSize;

        if (cell === Cell.Wall) {
          ctx.fillStyle = COLORS.wall;
          ctx.fillRect(px + 1, py + 1, tileSize - 2, tileSize - 2);
          ctx.fillStyle = COLORS.wallTop;
          ctx.fillRect(px + 1, py + 1, tileSize - 2, tileSize - 5);
        } else {
          ctx.fillStyle = COLORS.floor;
          ctx.fillRect(px, py, tileSize, tileSize);
          ctx.strokeStyle = 'rgba(255,255,255,0.03)';
          ctx.lineWidth = 1;
          ctx.strokeRect(px + 0.5, py + 0.5, tileSize - 1, tileSize - 1);

          if (cell === Cell.Target) {
            const cx = px + tileSize / 2;
            const cy = py + tileSize / 2;
            ctx.fillStyle = COLORS.targetDim;
            ctx.beginPath(); ctx.arc(cx, cy, tileSize * 0.24, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = COLORS.target;
            ctx.beginPath(); ctx.arc(cx, cy, tileSize * 0.2, 0, Math.PI * 2); ctx.fill();
          }
        }
      }
    }

    // Draw boxes
    for (const box of state.boxes) {
      const px = offsetX + box.x * tileSize;
      const py = offsetY + box.y * tileSize;
      const onTarget = state.grid[box.y][box.x] === Cell.Target;
      const inset = 3;
      const bx = px + inset; const by = py + inset; const bs = tileSize - inset * 2;
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(bx + 2, by + 2, bs, bs);
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

    // Draw player
    const ppx = offsetX + state.player.x * tileSize;
    const ppy = offsetY + state.player.y * tileSize;
    const cx = ppx + tileSize / 2;
    const cy = ppy + tileSize / 2;
    const r = tileSize * 0.35;
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath(); ctx.arc(cx + 2, cy + 2, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = COLORS.player;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = COLORS.playerEye;
    const eyeR = r * 0.15;
    ctx.beginPath(); ctx.arc(cx - r * 0.25, cy - r * 0.15, eyeR, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx + r * 0.25, cy - r * 0.15, eyeR, 0, Math.PI * 2); ctx.fill();
  }
}
```

---

### 5. Create the Engine

**File:** `src/contexts/canvas2d/games/sokoban/SokobanEngine.ts`

```typescript
import type { SokobanState } from './types';
import { LevelSystem } from './systems/LevelSystem';
import { BoardRenderer } from './renderers/BoardRenderer';

export class SokobanEngine {
  private ctx: CanvasRenderingContext2D;
  private state: SokobanState;
  private running = false;
  private rafId = 0;
  private levelSystem: LevelSystem;
  private boardRenderer: BoardRenderer;
  private resizeHandler: () => void;

  constructor(canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    this.state = {
      grid: [], width: 0, height: 0, player: { x: 0, y: 0 }, boxes: [],
      level: 0, moves: 0, undoStack: [], levelComplete: false, gameWon: false,
      paused: false, canvasWidth: canvas.width, canvasHeight: canvas.height,
      queuedDir: null, undoRequested: false, restartRequested: false, advanceRequested: false,
    };
    this.levelSystem = new LevelSystem();
    this.boardRenderer = new BoardRenderer();
    this.levelSystem.loadLevel(this.state, 0);
    this.resizeHandler = () => {
      canvas.width = window.innerWidth; canvas.height = window.innerHeight;
      this.state.canvasWidth = canvas.width; this.state.canvasHeight = canvas.height;
    };
    window.addEventListener('resize', this.resizeHandler);
  }

  start(): void { this.running = true; this.loop(); }
  destroy(): void { this.running = false; cancelAnimationFrame(this.rafId); window.removeEventListener('resize', this.resizeHandler); }

  private loop(): void {
    if (!this.running) return;
    this.boardRenderer.render(this.ctx, this.state);
    this.rafId = requestAnimationFrame(() => this.loop());
  }
}
```

---

### 6. Create the Entry Point

**File:** `src/contexts/canvas2d/games/sokoban/index.ts`

```typescript
import { SokobanEngine } from './SokobanEngine';

export function createSokoban(canvas: HTMLCanvasElement): { destroy: () => void } {
  const engine = new SokobanEngine(canvas);
  engine.start();
  return { destroy: () => engine.destroy() };
}
```

---

## Test It

1. **Run:** `npm run dev`
2. **Open:** the Sokoban game
3. **Observe:**
   - A dark background with a centered puzzle grid
   - **Gray 3D walls** with a lighter top face
   - **Dark floor tiles** with subtle grid lines
   - **Red glowing target markers** showing where boxes need to go
   - **Orange boxes** with cross marks and drop shadows
   - A **purple player circle** with white eyes
   - The board scales and centers when you resize the window

---

## Challenges

**Easy:**
- Change the player color from purple to blue.
- Make the target markers larger.

**Medium:**
- Add a border around the entire playable area.

**Hard:**
- Animate the target markers with a subtle pulse effect.

---

## What You Learned

- Designing string-based level formats for tile games
- Parsing level strings into separate grid and entity data
- Drawing 3D-style walls with a top-face highlight
- Rendering circle entities (player) and square entities (boxes) with shadows
- Responsive tile-based layout that adapts to any screen size

**Next:** Player movement and box pushing -- arrow keys to move, push boxes around!
