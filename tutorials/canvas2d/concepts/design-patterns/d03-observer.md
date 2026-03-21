# Observer Pattern (Callback-Based Events)

## What Is It?
The Observer pattern lets one object (the "subject") notify many other objects (the "observers") when something happens, without the subject knowing who is listening. Think of a radio station: the station broadcasts a signal, and anyone with a radio tuned to that frequency hears it. The station does not keep a list of every listener's name.

In this codebase, the pattern appears as callback-based event handling. The browser fires DOM events (click, keydown, mousemove). The `InputSystem` subscribes to those events and translates them into game-state mutations, effectively bridging the browser's observer system into the engine.

## The Pattern
```
  Browser (Subject)
  +addEventListener(type, callback)
  +removeEventListener(type, callback)
       |
       | fires events
       v
  InputSystem (Observer)
  +attach()  --> subscribes to DOM events
  +detach()  --> unsubscribes from DOM events
  - keyHandler(e)   --> mutates game state
  - clickHandler(e) --> mutates game state
       |
       | modifies
       v
  GameState
  - dir, nextDir, paused, started, ...
```

## Code Example
```typescript
export class InputSystem implements InputHandler {
  private state: SnakeState;
  private canvas: HTMLCanvasElement;
  private onExit: () => void;
  private onReset: () => void;

  // Pre-bound handlers (so we can remove the exact same reference)
  private keyHandler: (e: KeyboardEvent) => void;
  private clickHandler: (e: MouseEvent) => void;

  constructor(state: SnakeState, canvas: HTMLCanvasElement,
              onExit: () => void, onReset: () => void) {
    this.state = state;
    this.canvas = canvas;
    this.onExit = onExit;
    this.onReset = onReset;

    // Bind once in constructor -- critical for clean removal
    this.keyHandler = (e) => this.handleKey(e);
    this.clickHandler = (e) => this.handleClick(e);
  }

  // Subscribe to browser events
  attach(): void {
    window.addEventListener('keydown', this.keyHandler);
    this.canvas.addEventListener('click', this.clickHandler);
  }

  // Unsubscribe -- prevents memory leaks and ghost listeners
  detach(): void {
    window.removeEventListener('keydown', this.keyHandler);
    this.canvas.removeEventListener('click', this.clickHandler);
  }

  private handleKey(e: KeyboardEvent): void {
    if (e.key === 'Escape') { this.onExit(); return; }
    const dirs: Record<string, Direction> = {
      ArrowUp: 'up', ArrowDown: 'down',
      ArrowLeft: 'left', ArrowRight: 'right',
    };
    const newDir = dirs[e.key];
    if (newDir) this.state.nextDir = newDir;
  }
}
```

## When to Use It
- **Decoupling event producers from consumers**: The browser does not know about `SnakeState`. The `InputSystem` translates events into state changes.
- **Multiple listeners on one event**: The City Builder's `InputSystem` listens to click, mousemove, keydown, and resize -- all from different DOM sources.
- **Clean lifecycle management**: Games must attach listeners on start and detach them on destroy. The `attach()`/`detach()` pair makes this explicit.

## Used In These Games
- **Snake**: `InputSystem` listens to keydown (arrow keys change direction) and click (start/restart)
- **City Builder**: `InputSystem` listens to click (place buildings, select types), mousemove (hover highlight), keydown (number keys for building shortcuts, +/- for speed), and resize
- **Platformer**: `InputSystem` listens to keydown/keyup for movement, plus click for start/restart
- **Tower Defense**: `InputSystem` listens to click (place/select towers), mousemove (hover), keydown (pause, escape)
- **Platform Menu**: `PlatformMenu` listens to click (select game), mousemove (hover cards), wheel (scroll), keydown (category shortcuts)

## Anti-Patterns
- **Forgetting to detach**: If a game is destroyed but its keydown listener is still on `window`, keypresses in the next game will trigger the old handler. Always pair `attach()` with `detach()`.
- **Anonymous arrow functions in addEventListener**: `window.addEventListener('keydown', (e) => ...)` cannot be removed because you have no reference to the function. Always store the handler reference.
- **Direct polling instead of events**: Checking `isKeyDown['ArrowUp']` every frame is valid for continuous input (movement), but for discrete actions (pause toggle, menu selection), event callbacks are cleaner and more responsive.
- **Over-notifying**: Firing an event every frame when nothing changed. Events should signal meaningful state transitions, not redundant ticks.
