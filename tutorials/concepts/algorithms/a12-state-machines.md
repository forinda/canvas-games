# State Machines

## What Is It?

A finite state machine (FSM) is a way to organize behavior into distinct states, where only one state is active at a time, and transitions between states are triggered by specific events or conditions. At any given moment, the system is in exactly one state, and it can only do the things that state allows.

In games, state machines are everywhere. A game itself has states: title screen, playing, paused, game over. A character has states: idle, walking, jumping, attacking, dying. An enemy has states: patrolling, chasing, attacking, retreating. Without a state machine, this logic turns into a tangle of boolean flags (`isJumping && !isAttacking && !isDead`) that quickly becomes unmaintainable. With a state machine, each state is a clean, self-contained block of logic.

Think of a traffic light. It has three states: green, yellow, red. It transitions between them in a fixed order on a timer. While it is green, it does "green things" (allow traffic). It never does "red things" and "green things" at the same time. A state machine gives your game objects that same clarity: each state knows what to do, and the transitions define when to switch.

## The Algorithm

```
1. Define all possible states.
2. Define transitions: for each state, which events cause a switch to which other state.
3. Set an initial state.
4. Each frame:
   a. Run the current state's UPDATE logic.
   b. Check transition conditions.
   c. If a transition fires:
      - Run the current state's EXIT logic.
      - Switch to the new state.
      - Run the new state's ENTER logic.
```

### State Diagram: Game Phases

```
  +----------+     start      +---------+
  |  TITLE   | ------------> | PLAYING  |
  |  SCREEN  |               |          |
  +----------+               +---------+
                             /    |     \
                      pause /     |      \ player dies
                           v      |       v
                     +---------+  |   +-----------+
                     | PAUSED  |  |   | GAME OVER |
                     |         |--+   |           |
                     +---------+      +-----------+
                       resume |         |  restart
                              v         v
                           +---------+  +----------+
                           | PLAYING |  |  TITLE   |
                           +---------+  |  SCREEN  |
                                        +----------+
```

### State Diagram: Character States

```
                    +-------+
               +--->| IDLE  |<---+
               |    +-------+    |
               |     |     |     |
          land |move |     | attack
               |     v     v     |
          +--------+ +----------+
          | JUMP   | | WALKING  |
          +--------+ +----------+
               |           |
               |     attack|
               v           v
          +--------+ +----------+
          | FALLING| |ATTACKING |
          +--------+ +----------+

  Transitions:
    IDLE ---(move key)--> WALKING
    IDLE ---(jump key)--> JUMP
    IDLE ---(attack key)--> ATTACKING
    WALKING ---(release key)--> IDLE
    WALKING ---(attack key)--> ATTACKING
    JUMP ---(apex reached)--> FALLING
    FALLING ---(hit ground)--> IDLE
    ATTACKING ---(animation done)--> IDLE
```

## Code Example

```typescript
interface State {
  enter?: () => void;
  update?: (dt: number) => void;
  exit?: () => void;
}

class StateMachine {
  private states = new Map<string, State>();
  private current: string = "";

  addState(name: string, state: State): void {
    this.states.set(name, state);
  }

  start(name: string): void {
    this.current = name;
    this.states.get(name)?.enter?.();
  }

  transition(name: string): void {
    if (name === this.current) return;
    if (!this.states.has(name)) return;

    this.states.get(this.current)?.exit?.();
    this.current = name;
    this.states.get(name)?.enter?.();
  }

  update(dt: number): void {
    this.states.get(this.current)?.update?.(dt);
  }

  get currentState(): string {
    return this.current;
  }
}

// --- Usage: Game phase manager ---

const game = new StateMachine();

game.addState("title", {
  enter: () => console.log("Show title screen"),
  update: () => {
    if (startButtonPressed()) game.transition("playing");
  },
});

game.addState("playing", {
  enter: () => console.log("Start game"),
  update: (dt) => {
    updateGameLogic(dt);
    if (playerDead()) game.transition("gameOver");
    if (pausePressed()) game.transition("paused");
  },
});

game.addState("paused", {
  enter: () => console.log("Game paused"),
  update: () => {
    if (pausePressed()) game.transition("playing");
  },
});

game.addState("gameOver", {
  enter: () => console.log("Game over!"),
  update: () => {
    if (restartPressed()) game.transition("title");
  },
});

game.start("title");

// In the game loop:
function gameLoop(dt: number) {
  game.update(dt);
}
```

## Complexity

| Metric | Big O |
|--------|-------|
| Time   | O(1) per frame -- just run the current state's update and check transitions. |
| Space  | O(S) where S = number of states. Typically very small (5-20 states). |

## Used In These Games

- **Every game ever**: Game phase management (menu, playing, paused, game over) is a state machine.
- **Platformers**: Character states (idle, run, jump, fall, attack, hurt, dead). Each state has its own animation and physics behavior.
- **Fighting games**: Complex character state machines with dozens of states and frame-precise transitions.
- **Strategy games**: Unit AI states (idle, moving, attacking, fleeing, garrisoned).
- **UI systems**: Button states (normal, hovered, pressed, disabled).

## Common Pitfalls

- **Boolean flag soup instead of states**: `if (isJumping && !isAttacking && !isDead && hasLanded)` is a sign you need a state machine. Each combination of flags is implicitly a state -- make it explicit.
- **Forgetting enter/exit logic**: Many bugs come from not cleaning up the old state or not initializing the new one. Always use enter/exit hooks for setup and teardown (starting/stopping animations, resetting timers, etc.).
- **Allowing invalid transitions**: A dead character should not be able to transition to "attacking." Define which transitions are valid from each state, and reject the rest.
- **One giant state machine**: If your state machine has 50+ states, it is too complex. Use hierarchical state machines (states within states) or split behavior into multiple independent state machines (one for movement, one for combat, one for animation).

## Further Reading

- [Wikipedia: Finite-state machine](https://en.wikipedia.org/wiki/Finite-state_machine)
- [Game Programming Patterns: State pattern](https://gameprogrammingpatterns.com/state.html)
- [AI for Games by Ian Millington -- FSM chapter](https://www.oreilly.com/library/view/ai-for-games/9781351053280/)
