# Event Listener Lifecycle

## What Is It?

Event listener lifecycle is the practice of adding event listeners when a component starts and removing them when it stops. Think of it like subscribing to a magazine: when you move into a new apartment (attach), you subscribe. When you move out (detach), you cancel the subscription. If you forget to cancel, magazines keep arriving at the old address -- wasted resources. In code, forgotten event listeners cause memory leaks, duplicate handlers, and ghost behavior from "dead" game screens.

The pattern is simple: every `addEventListener` must have a matching `removeEventListener` with the exact same function reference.

## How It Works

```
Lifecycle:
  attach()  → called when game/screen starts
              addEventListener("keydown", this.handleKey)
              addEventListener("click", this.handleClick)

  detach()  → called when game/screen ends
              removeEventListener("keydown", this.handleKey)
              removeEventListener("click", this.handleClick)

Critical rule:
  The function reference passed to remove MUST be the same object
  as the one passed to add.

  BAD:  addEventListener("keydown", (e) => {...})     ← anonymous
        removeEventListener("keydown", (e) => {...})  ← different object!

  GOOD: this.handleKey = this.onKey.bind(this);       ← store reference
        addEventListener("keydown", this.handleKey)
        removeEventListener("keydown", this.handleKey) ← same reference
```

Memory leak diagram:

```
  Game A starts → adds listener
  Game A stops  → forgets to remove
  Game B starts → adds another listener
  Game B stops  → forgets to remove

  Result: 2 orphaned listeners still fire on every keypress,
          referencing objects from dead game screens.
          Repeat 10 times → 10 orphaned listeners, growing memory.
```

## Code Example

```typescript
class GameScreen {
  private canvas: HTMLCanvasElement;
  private boundHandleKey: (e: KeyboardEvent) => void;
  private boundHandleClick: (e: MouseEvent) => void;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    // Bind once and store the reference
    this.boundHandleKey = this.handleKey.bind(this);
    this.boundHandleClick = this.handleClick.bind(this);
  }

  attach(): void {
    window.addEventListener("keydown", this.boundHandleKey);
    window.addEventListener("keyup", this.boundHandleKey);
    this.canvas.addEventListener("click", this.boundHandleClick);
  }

  detach(): void {
    window.removeEventListener("keydown", this.boundHandleKey);
    window.removeEventListener("keyup", this.boundHandleKey);
    this.canvas.removeEventListener("click", this.boundHandleClick);
  }

  private handleKey(e: KeyboardEvent): void {
    if (e.type === "keydown") {
      console.log(`Key pressed: ${e.key}`);
    }
  }

  private handleClick(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    console.log(`Clicked at canvas (${x}, ${y})`);
  }
}

// Lifecycle in practice
const screen = new GameScreen(document.querySelector("canvas")!);
screen.attach();  // game starts: listeners active
// ... game runs ...
screen.detach();  // game ends: listeners removed, no leaks
```

## Used In These Games

- **All games**: Every game in this project uses the attach/detach pattern through `PlatformAdapter` classes (e.g., `src/contexts/canvas2d/games/tower-defense/adapters/PlatformAdapter.ts`). The adapter adds input listeners on start and removes them on stop.
- **Tower Defense**: Mouse click for tower placement, keyboard for hotkeys. All registered in `InputSystem` and cleaned up when leaving the game.
- **Platformer**: Keyboard listeners for movement and jumping. Registered via the adapter and removed on game exit.
- **Snake**: Arrow key listeners for direction changes, cleaned up when the game screen is exited.

## Common Pitfalls

- **Anonymous functions cannot be removed**: `addEventListener("keydown", (e) => {...})` creates a new function every time. You can never pass that same reference to `removeEventListener`. Always store a named or bound reference.
- **Forgetting to call detach()**: If your game-switching logic does not call `detach()` on the old game before `attach()` on the new one, listeners pile up. Use a game manager that enforces this transition.
- **Adding listeners in the game loop**: Calling `addEventListener` inside `update()` adds a new listener every frame (60 per second). Listeners should only be added once, in `attach()`.
- **Arrow functions in class properties**: `handleKey = (e: KeyboardEvent) => {...}` auto-binds, which is convenient. But if you create multiple instances, each has its own copy of the function, which can be wasteful. For singletons (one game screen at a time), this is fine.
