# Step 4: Orbital Camera & Polish

**Goal:** Add mouse-driven orbital camera controls, window resize handling, ESC exit, and register the game in the platform.

**Time:** ~15 minutes

---

## What You'll Build

- **Orbital camera** — drag to orbit around the cube, scroll to zoom in/out
- **Resize handling** — canvas + viewport update on window resize
- **ESC to exit** — keyboard handler returns to the game menu
- **Game registration** — the game appears in the "3D" category tab
- **Complete `SpinningCubeEngine`** implementing the `GameInstance` interface

---

## Concepts

- **Orbital Camera**: The camera sits on a sphere around a target point. Two angles define its position:
  - **Azimuth** — rotation around the Y axis (left/right orbit)
  - **Elevation** — rotation up/down from the equator
  - **Distance** — how far from the target (zoom)

  Mouse drag changes azimuth/elevation, scroll changes distance. The camera always looks at the target.

- **Spherical → Cartesian**: To get the camera's 3D position from (azimuth, elevation, distance):
  ```
  x = distance × cos(elevation) × sin(azimuth)
  y = distance × sin(elevation)
  z = distance × cos(elevation) × cos(azimuth)
  ```

- **GameInstance Interface**: Every game in the platform implements `{ start(), destroy() }`. The launcher calls `start()` after creation and `destroy()` when exiting. `destroy()` must clean up ALL event listeners to prevent memory leaks.

---

## Code

### 4.1 — Orbital Camera

**File:** `src/contexts/webgl/shared/Camera.ts` (already exists)

The shared `OrbitalCamera` class handles all the math and input:

```typescript
import { OrbitalCamera } from "@webgl/shared/Camera";

// In constructor:
this.camera = new OrbitalCamera(canvas, {
    distance: 4,       // start 4 units from the cube
    elevation: 0.4,    // slightly above the equator (radians)
    azimuth: 0.6,      // rotated slightly right
});

// In render():
const viewMatrix = this.camera.getViewMatrix();
gl.uniformMatrix4fv(this.uView, false, viewMatrix);

// In destroy():
this.camera.dispose();  // removes mousedown/mousemove/mouseup/wheel listeners
```

**What's happening:**
- The camera listens for `mousedown` → `mousemove` → `mouseup` to detect drags, and `wheel` for zoom.
- On drag: azimuth changes by `movementX × sensitivity`, elevation by `movementY × sensitivity`.
- On scroll: distance multiplies by `1 ± zoomSensitivity`.
- `getViewMatrix()` converts the spherical coordinates to a `lookAt` matrix every frame.
- `dispose()` removes all 4 event listeners — critical for the cleanup lifecycle.

---

### 4.2 — Resize Handling

```typescript
this.resizeHandler = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);
};
window.addEventListener("resize", this.resizeHandler);
gl.viewport(0, 0, canvas.width, canvas.height); // initial viewport
```

**What's happening:**
- When the window resizes, the canvas dimensions must update, AND the GL viewport must be told the new size.
- Without updating `gl.viewport`, the rendered image would be stretched or cropped.
- The projection matrix uses `canvas.width / canvas.height` for aspect ratio — this is recalculated every frame in `render()`, so it auto-adapts.

---

### 4.3 — ESC Exit & Destroy

```typescript
this.keyHandler = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
        e.preventDefault();
        this.onExit();
    }
};
window.addEventListener("keydown", this.keyHandler);

// In destroy():
destroy(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
    this.camera.dispose();
    window.removeEventListener("resize", this.resizeHandler);
    window.removeEventListener("keydown", this.keyHandler);
}
```

**What's happening:**
- `onExit` is the callback from the platform launcher — it destroys this game and shows the menu.
- `destroy()` must stop everything: the render loop (`running = false`), the animation frame, the camera's listeners, and our own listeners.
- Forgetting to remove even one listener causes a memory leak and "ghost" behavior from a dead game.

---

### 4.4 — Game Definition & Registration

**File:** `src/contexts/webgl/games/spinning-cube/index.ts`

Export a `GameDefinition` that the registry uses:

```typescript
import type { GameDefinition, GameInstance } from "@core/GameInterface";
import { SpinningCubeEngine } from "./SpinningCubeEngine";

export const SpinningCubeGame: GameDefinition = {
    id: "spinning-cube",
    name: "Spinning Cube",
    description: "Interactive 3D cube!",
    icon: "🧊",
    color: "#ff6f00",
    category: "3d",
    renderContext: "webgl",
    help: {
        goal: "Drag to orbit the camera around a lit, spinning cube.",
        controls: [
            { key: "Mouse drag", action: "Orbit camera" },
            { key: "Scroll", action: "Zoom in/out" },
            { key: "ESC", action: "Exit to menu" },
        ],
        tips: [
            "The cube auto-rotates and shifts color over time",
            "This is the simplest WebGL demo",
        ],
    },
    touchLayout: "tap-only",
    create(canvas: HTMLCanvasElement, onExit: () => void): GameInstance {
        const engine = new SpinningCubeEngine(canvas, onExit);
        engine.start();
        return engine;
    },
};
```

**File:** `src/core/registry/GameRegistry.ts`

Register it with `lazyGame` in the `"3d"` category:

```typescript
"3d": [
    lazyGame(
        "spinning-cube",
        "Spinning Cube",
        "Interactive 3D cube!",
        "🧊",
        "#ff6f00",
        "3d",
        { goal: "...", controls: [...], tips: [...] },
        () => import("@webgl/games/spinning-cube"),
        "SpinningCubeGame",
        "tap-only",
        "webgl",   // ← renderContext — tells the launcher to use a WebGL canvas
    ),
],
```

**What's happening:**
- `renderContext: "webgl"` tells the platform launcher to replace the canvas (since the menu used a 2D context) before calling `create()`.
- `lazyGame` wraps the import in a `Promise` so the WebGL game code is only loaded when the player selects it.
- The `"3d"` category shows up as an orange tab in the platform menu.

---

## Test It

```bash
pnpm dev
```

1. Open the game menu — you should see a **"3D" tab** with the Spinning Cube
2. Click it — the cube should render with **lighting and rotation**
3. **Drag** the mouse — the camera should orbit around the cube
4. **Scroll** — should zoom in and out
5. **Press ESC** — should return to the game menu
6. **Resize the window** — the cube should adapt without stretching
7. Launch a 2D game after — it should work normally (canvas is replaced)

---

## Challenges

**Easy:**
- Change the initial camera distance from 4 to 8. How does the cube look from further away?

**Medium:**
- Add a `"P"` key handler that pauses/resumes the auto-rotation (stop updating `time` in the model matrix while paused).

**Hard:**
- Add a second cube at position `(3, 0, 0)`. You'll need to: draw the first cube, change the model matrix (add a translation), draw again. Two draw calls, same VAO, different model matrices.

---

## What You Learned

- Orbital cameras use spherical coordinates (azimuth, elevation, distance) converted to Cartesian for `lookAt`
- `gl.viewport` must be updated on resize alongside the canvas dimensions
- `destroy()` must clean up ALL listeners: camera, keyboard, resize
- `renderContext: "webgl"` in the game definition triggers canvas replacement in the launcher
- Lazy loading via `import()` keeps WebGL code out of the initial bundle

---

## Complete Architecture

```
src/contexts/webgl/games/spinning-cube/
├── shaders.ts              ← GLSL vertex + fragment shader source
├── SpinningCubeEngine.ts   ← WebGL2 engine: context, buffers, VAO, render loop
└── index.ts                ← GameDefinition export for the registry
```

**Congratulations!** You've built your first WebGL game. Every concept here — shaders, buffers, VAOs, MVP matrices, lighting, camera — is the foundation for all the 3D games that follow.

---
[← Previous Step](./step-3.md) | [Back to README](./README.md)
