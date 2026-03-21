# Step 4: Fog, Levels & Polish

**Goal:** Fine-tune the fog atmosphere, add level progression with growing mazes, implement win detection, and register the game.

**Time:** ~15 minutes

---

## What You'll Build

- **Fog tuning** — density that limits visibility to a few corridors
- **Win detection** — reaching the exit cell advances to the next level
- **Level progression** — each level generates a larger, fresh maze
- **Camera reset** — reposition at the start of each new maze
- **Game registration** — touchLayout for mobile, pointer lock handling in destroy

---

## Concepts

- **Fog as Gameplay Element**: Fog isn't just visual polish — it's a core mechanic. Without fog, you could see the entire maze and navigate trivially. With `fogDensity = 0.06`, you can see about 2-3 cells ahead, forcing you to explore and remember paths.

- **Level Reset Pattern**: When advancing, the engine creates a fresh `Maze3DState` (with a new `generateMaze` call), disposes the old FPS camera, and creates a new one positioned at cell (0,0). This clean-slate approach avoids subtle state bugs.

- **Pointer Lock Cleanup**: The FPS camera locks the pointer on click. When exiting (ESC), we must `document.exitPointerLock()` before calling `onExit()`, or the pointer stays locked in the menu.

---

## Code

### 4.1 — Fog Density and Projection

```typescript
// In render():
Mat4.perspective(this.projMatrix, Math.PI / 3, aspect, 0.1, 200);
gl.uniform1f(this.uFogDensity, 0.06);
```

**What's happening:**
- FOV is `Math.PI / 3` (60 degrees) — wider than the typical 45 degrees used in other games. This gives more peripheral vision, which is important in tight corridors.
- `uFogDensity = 0.06` means:
  - At 5 units (~1.7 cells): `1 - exp(-5 * 0.06) = 0.26` — 26% fogged, still clearly visible
  - At 15 units (~5 cells): `1 - exp(-15 * 0.06) = 0.59` — 59% fogged, details fading
  - At 30 units (~10 cells): `1 - exp(-30 * 0.06) = 0.83` — mostly fog
- This creates a 2-3 cell "clear zone" and gradual falloff, perfect for a maze where you want local awareness but not global knowledge.

---

### 4.2 — Win Detection

In the `update()` method, after updating the player's grid position:

```typescript
// Win check
if (this.state.playerRow === this.state.exitRow &&
    this.state.playerCol === this.state.exitCol) {
    this.state.phase = "won";
}
```

**What's happening:**
- The exit is at `(rows - 1, cols - 1)` — the bottom-right corner. The player starts at `(0, 0)` — the top-left.
- Win detection uses grid coordinates, not world coordinates. This means the player just needs to be inside the exit cell, not precisely at its center. Forgiving and frustration-free.

---

### 4.3 — Level Advancement

```typescript
private advanceLevel(): void {
    this.state = this.createLevel(this.state.level + 1);

    // Reset camera position to new maze start
    this.camera.dispose();
    this.camera = new FPSCamera(this.canvas, {
        position: [CELL_SIZE / 2, PLAYER_HEIGHT, CELL_SIZE / 2],
        moveSpeed: 4,
        lookSensitivity: 0.002,
    });
}

private createLevel(level: number): Maze3DState {
    const { rows, cols } = getMazeSize(level);
    const grid = generateMaze(rows, cols);

    return {
        grid, rows, cols,
        playerRow: 0, playerCol: 0,
        exitRow: rows - 1, exitCol: cols - 1,
        phase: "playing",
        level,
        timer: 0,
    };
}
```

**What's happening:**
- `getMazeSize(level)` returns `{ rows: 5 + level*2, cols: 5 + level*2 }`, capping at 15. So: Level 0 = 5x5 (25 cells), Level 1 = 7x7 (49 cells), Level 5 = 15x15 (225 cells).
- `generateMaze` is called fresh — a completely new random maze each time.
- The old camera must be `dispose()`d to remove its event listeners (pointer lock, mousemove, keydown). A new camera is created at cell (0,0) center.
- `timer` tracks elapsed time per level. This could be displayed or used for scoring.

---

### 4.4 — ESC Handling and Cleanup

```typescript
this.keyHandler = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
        e.preventDefault();

        // Release pointer lock before exiting
        if (document.pointerLockElement === canvas) {
            document.exitPointerLock();
        }

        this.onExit();
    }

    if ((e.code === "Space" || e.code === "Enter") &&
        this.state.phase === "won") {
        this.advanceLevel();
    }
};

destroy(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
    this.camera.dispose();
    window.removeEventListener("resize", this.resizeHandler);
    window.removeEventListener("keydown", this.keyHandler);
}
```

**What's happening:**
- ESC must release pointer lock *before* calling `onExit()`. If the menu renders while the pointer is locked, the user can't interact with it.
- `camera.dispose()` is critical — the FPS camera holds `mousemove`, `keydown`, `keyup`, `click`, and `pointerlockchange` listeners. Forgetting this causes ghost movement from a dead game.
- The maze game only has one keyboard handler (not separate keyDown/keyUp) because the camera handles WASD internally.

---

### 4.5 — Game Registration

**File:** `src/contexts/webgl/games/maze-3d/index.ts`

```typescript
export const Maze3DGame: GameDefinition = {
    id: "maze-3d",
    name: "3D Maze",
    description: "First-person maze escape!",
    icon: "🏗️",
    color: "#ff6f00",
    category: "3d",
    renderContext: "webgl",
    touchLayout: "dual-stick",
    help: {
        goal: "Navigate the maze in first-person to find the glowing exit.",
        controls: [
            { key: "WASD", action: "Move" },
            { key: "Mouse", action: "Look around (click to lock)" },
            { key: "Space", action: "Next level (after winning)" },
            { key: "ESC", action: "Exit to menu" },
        ],
        tips: [
            "Click the canvas to lock the mouse for looking",
            "Follow the right wall to eventually find any exit",
            "The green pillar marks the exit — look for its glow",
        ],
    },
    create(canvas, onExit) {
        const engine = new Maze3DEngine(canvas, onExit);
        engine.start();
        return engine;
    },
};
```

**What's happening:**
- `touchLayout: "dual-stick"` provides a virtual joystick for movement (left) and look (right) on mobile, approximating WASD + mouse.
- The "follow the right wall" tip is a real maze-solving strategy — in a perfect maze, always turning right will eventually find any exit (though not efficiently).

---

## Test It

```bash
pnpm dev
```

1. Start the maze — you're in a **5x5 maze** (Level 0)
2. Navigate to the **green pillar** — it should be at the far corner
3. Walk into the exit cell — the game should enter **"won"** state
4. Press **Space** — a **larger maze** (7x7) should generate
5. Complete a few levels — mazes grow up to **15x15**
6. **Fog** should make later levels harder: you can't see as far relative to maze size
7. Press **ESC** — pointer should unlock and you should return to the menu

---

## Challenges

**Easy:**
- Change `uFogDensity` to 0.15 for an extremely foggy maze. Can you still find the exit?

**Medium:**
- Add a "breadcrumb" system: every cell the player visits gets a small cube drawn on the floor. Use a `Set<string>` keyed by `"row,col"` to track visited cells.

**Hard:**
- Add a minimap: in a corner of the screen, draw the maze grid as a 2D overlay (using orthographic projection). Show the player's position and the exit. This requires a second render pass with a different projection/viewport.

---

## What You Learned

- Fog density controls gameplay difficulty — less visibility means more exploration
- Win detection uses grid coordinates for a forgiving check
- Level advancement disposes old resources and creates fresh state
- Pointer lock must be released before exiting to the menu
- `touchLayout: "dual-stick"` maps FPS controls to mobile

---

## Complete Architecture

```
src/contexts/webgl/games/maze-3d/
├── shaders.ts          ← Blinn-Phong + distance fog fragment shader
├── types.ts            ← Maze3DState, MazeCell, CellWalls + constants
├── mazeGen.ts          ← DFS maze generation algorithm
├── Maze3DEngine.ts     ← WebGL2 engine: FPS camera, wall rendering, collision
└── index.ts            ← GameDefinition export for registry
```

**Congratulations!** You've built a procedurally generated 3D maze with first-person navigation. The DFS generation, fog, and FPS camera are powerful techniques that extend to many types of first-person games.

---
[← Previous Step](./step-3.md) | [Back to README](./README.md)
