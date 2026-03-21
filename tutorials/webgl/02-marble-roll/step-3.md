# Step 3: Gems, Goal & Levels

**Goal:** Add spinning gem collectibles, a goal marker that activates when all gems are collected, and a multi-level progression system.

**Time:** ~15 minutes

---

## What You'll Build

- **Spinning golden gems** — small cubes that rotate and can be collected by the marble
- **Goal marker** — a flat cube that turns green when all gems are collected
- **Level data** — structured definitions for platform size, gem positions, start/goal positions
- **Level progression** — win to advance, fall to retry, levels get larger
- **Game registration** — wiring the game into the platform

---

## Concepts

- **Distance-Based Collection**: To check if the marble touches a gem, compute the 2D distance between them. If `dx*dx + dz*dz < threshold^2`, the gem is collected. Squaring avoids a `Math.sqrt` call — a classic game optimization.

- **Game Phases**: The `phase` field acts as a state machine: `"playing"` -> `"won"` (reached goal with all gems) or `"fell"` (off the edge). Input handlers check the phase to decide whether to advance or retry.

- **Level Data as Plain Objects**: Each level is a simple TypeScript object with `size`, `startX/Z`, `goalX/Z`, and a `gems` array. No class hierarchy needed — data-driven design keeps things simple and easy to extend.

---

## Code

### 3.1 — Level Data Structure

**File:** `src/contexts/webgl/games/marble-roll/types.ts`

```typescript
export interface Gem {
    x: number;
    z: number;
    collected: boolean;
}

export interface LevelData {
    size: number;       // Platform half-extent
    goalX: number;
    goalZ: number;
    gems: Gem[];
    startX: number;
    startZ: number;
}

export const LEVELS: LevelData[] = [
    {
        size: 4,
        goalX: 3, goalZ: 3,
        gems: [
            { x: -2, z: 1, collected: false },
            { x: 1, z: -2, collected: false },
        ],
        startX: -3, startZ: -3,
    },
    {
        size: 5,
        goalX: 4, goalZ: -4,
        gems: [
            { x: 2, z: 2, collected: false },
            { x: -3, z: 0, collected: false },
            { x: 0, z: -3, collected: false },
        ],
        startX: -4, startZ: 4,
    },
    {
        size: 6,
        goalX: -5, goalZ: 5,
        gems: [
            { x: 3, z: -2, collected: false },
            { x: -2, z: -4, collected: false },
            { x: 0, z: 3, collected: false },
            { x: 4, z: 1, collected: false },
        ],
        startX: 5, startZ: -5,
    },
];
```

**What's happening:**
- Each level increases `size` (platform half-extent) and adds more gems.
- Start and goal are placed at opposite corners, forcing the player to traverse the whole surface.
- The `collected` field is cloned per-play so the original data stays immutable: `this.gems = lvl.gems.map(g => ({ ...g }))`.

---

### 3.2 — Gem Collection Logic

In the `update()` method, after moving the marble:

```typescript
// Gem collection
for (const gem of this.gems) {
    if (gem.collected) continue;

    const dx = s.x - gem.x;
    const dz = s.z - gem.z;

    if (dx * dx + dz * dz < 0.5 * 0.5) {
        gem.collected = true;
        s.gems++;
    }
}

// Goal check — only if all gems collected
const gdx = s.x - this.currentLevel.goalX;
const gdz = s.z - this.currentLevel.goalZ;

if (gdx * gdx + gdz * gdz < 0.6 * 0.6 && s.gems >= s.totalGems) {
    s.phase = "won";
}
```

**What's happening:**
- `dx * dx + dz * dz < 0.5 * 0.5` checks if the marble center is within 0.5 units of the gem center. This is a circle-point collision test without `sqrt`.
- `s.gems >= s.totalGems` gates the goal — the goal marker stays gray until all gems are collected, then turns green.
- The goal has a slightly larger radius (0.6) than gems (0.5) to be forgiving — rolling to the goal at speed should still register.

---

### 3.3 — Rendering Gems and Goal

Gems are spinning cubes transformed through the tilt matrix, just like the marble:

```typescript
const time = performance.now() / 1000;

for (const gem of this.gems) {
    if (gem.collected) continue;

    // Transform gem position by platform tilt
    const gemWorld = Vec3.create(gem.x, 0.25, gem.z);
    const gemT = Vec3.create();
    // ... manual mat4 × vec3 transform (same as marble) ...

    Mat4.identity(this.modelMatrix);
    Mat4.translate(this.modelMatrix, this.modelMatrix, gemT);
    Mat4.rotateY(this.modelMatrix, this.modelMatrix, time * 2);   // spin
    Mat4.scale(this.modelMatrix, this.modelMatrix, [0.15, 0.15, 0.15]);

    gl.uniformMatrix4fv(this.uModel, false, this.modelMatrix);
    gl.uniform3f(this.uColor, 1.0, 0.85, 0.0);  // gold
    this.drawMesh(this.cubeMesh);
}
```

The goal marker changes color based on collection state:

```typescript
// Goal marker — flat cube
Mat4.identity(this.modelMatrix);
Mat4.translate(this.modelMatrix, this.modelMatrix, goalT);
Mat4.scale(this.modelMatrix, this.modelMatrix, [0.5, 0.05, 0.5]);

gl.uniformMatrix4fv(this.uModel, false, this.modelMatrix);

if (s.gems >= s.totalGems) {
    gl.uniform3f(this.uColor, 0.2, 0.9, 0.3);   // green = ready
} else {
    gl.uniform3f(this.uColor, 0.4, 0.4, 0.4);   // gray = collect gems first
}

this.drawMesh(this.cubeMesh);
```

**What's happening:**
- Gems hover at `y = 0.25` and spin at `time * 2` radians per second — about one rotation every 3 seconds.
- Gems are scaled to `0.15` — small but visible.
- The goal marker is a very flat cube (`0.05` Y-scale) — essentially a colored tile on the platform.
- Color feedback (gray vs green) is the primary UI for collection progress. No HUD is needed.

---

### 3.4 — Level Progression and Game Registration

```typescript
private resetLevel(): void {
    this.state = this.createState(this.state.level);
}

private nextLevel(): void {
    this.state = this.createState(this.state.level + 1);
}

// In keyDown handler:
if ((e.code === "Space" || e.code === "Enter") &&
    (this.state.phase === "won" || this.state.phase === "fell")) {
    if (this.state.phase === "won") {
        this.nextLevel();
    } else {
        this.resetLevel();
    }
}

if (e.code === "KeyR") {
    this.resetLevel();
}
```

**File:** `src/contexts/webgl/games/marble-roll/index.ts`

```typescript
export const MarbleRollGame: GameDefinition = {
    id: "marble-roll",
    name: "Marble Roll",
    description: "Tilt the platform, roll to the goal!",
    icon: "🔴",
    color: "#ff6f00",
    category: "3d",
    renderContext: "webgl",
    touchLayout: "dpad",
    help: {
        goal: "Tilt the platform to roll the marble to the green goal. Collect all gems first!",
        controls: [
            { key: "Arrow Keys / WASD", action: "Tilt platform" },
            { key: "Mouse drag", action: "Orbit camera" },
            { key: "R", action: "Restart level" },
            { key: "Space", action: "Next level / Retry" },
            { key: "ESC", action: "Exit to menu" },
        ],
        tips: [
            "Collect all yellow gems before the goal turns green",
            "Small tilts give more control",
        ],
    },
    create(canvas, onExit) {
        const engine = new MarbleRollEngine(canvas, onExit);
        engine.start();
        return engine;
    },
};
```

**What's happening:**
- `createState(levelIdx)` resets everything: marble position to level start, velocity to zero, clones gem array, resets phase. The `% LEVELS.length` wraps around if the player beats all levels.
- R always restarts the current level — useful during testing.
- Space/Enter after winning advances; after falling, retries.
- `touchLayout: "dpad"` tells the mobile touch system to show a directional pad for tilt control.

---

## Test It

```bash
pnpm dev
```

1. **Golden cubes** should spin slowly on the platform surface
2. Roll the marble into a gem — it should **disappear** and the gem count increases
3. The goal starts **gray**. After collecting all gems, it turns **green**
4. Roll onto the green goal — the level should switch to the next (larger platform, more gems)
5. Press **R** at any time to restart the current level
6. Fall off the edge, then press **Space** to retry

---

## Challenges

**Easy:**
- Add a fourth level to the `LEVELS` array with `size: 7` and 5 gems.

**Medium:**
- Make gems bob up and down with `gem.y = 0.25 + Math.sin(time * 3 + gem.x) * 0.1`. Each gem bobs at a slightly different phase because of the `+ gem.x` offset.

**Hard:**
- Add a countdown timer per level. Display it by changing the platform color gradually from blue to red as time runs out. If the timer hits zero, set `phase = "fell"`.

---

## What You Learned

- Squared-distance checks (`dx*dx + dz*dz < r*r`) avoid `sqrt` for circle collision detection
- Game phases (`"playing"`, `"won"`, `"fell"`) act as a simple state machine controlling update and input behavior
- Data-driven levels are plain TypeScript objects — easy to extend without changing game logic
- Visual feedback (gem color, goal color change) can replace complex HUD elements
- `touchLayout: "dpad"` enables mobile play without code changes

---

## Complete Architecture

```
src/contexts/webgl/games/marble-roll/
├── shaders.ts              ← Blinn-Phong vertex + fragment shaders
├── types.ts                ← MarbleState, LevelData, Gem interfaces + constants + LEVELS
├── MarbleRollEngine.ts     ← WebGL2 engine: meshes, tilt physics, rendering, game loop
└── index.ts                ← GameDefinition export for registry
```

**Congratulations!** You've built a physics-based marble game with multiple levels. The tilt-to-roll mechanic, specular lighting, and per-object color uniforms are patterns you'll reuse in every game that follows.

---
[← Previous Step](./step-2.md) | [Back to README](./README.md)
