# Step 3: Scoring & Game Flow

**Goal:** Add score detection, visual score indicators, a complete game flow state machine, and game registration.

**Time:** ~15 minutes

---

## What You'll Build

- **Score detection** — ball passing beyond a paddle scores a point for the opponent
- **Score visualization** — colored cubes along the table sides (no text HUD needed)
- **Game phases** — start, playing, scored (brief pause), win
- **Ball speed reset** after each point
- **Win condition** — first to `WIN_SCORE = 7`
- **Game registration** in the platform

---

## Concepts

- **Scored Pause**: After a point, the game pauses briefly (`scoreTimer = 1` second) before relaunching the ball. This gives the player a moment to register what happened — instant relaunch feels jarring.

- **Score Cubes**: Instead of text, score is shown as small cubes stacked along the table edge. Blue cubes on the left for the player, red cubes on the right for the AI. This keeps the game purely WebGL without needing a DOM overlay or text rendering.

- **State Machine**: `phase` cycles through: `"start"` (waiting for Space) -> `"playing"` (active) -> `"scored"` (brief pause, then back to playing or to win) -> `"win"` (game over, Space to restart).

---

## Code

### 3.1 — Score Detection

At the bottom of the `update()` method, after ball movement and collision:

```typescript
// Ball passed the player's side (+Z)
if (s.ballZ > TABLE_H / 2 + 1) {
    s.aiScore++;
    s.phase = "scored";
    s.scoreTimer = 1;
    s.ballSpeed = BALL_SPEED_INIT;  // reset speed
}
// Ball passed the AI's side (-Z)
else if (s.ballZ < -(TABLE_H / 2 + 1)) {
    s.playerScore++;
    s.phase = "scored";
    s.scoreTimer = 1;
    s.ballSpeed = BALL_SPEED_INIT;
}
```

**What's happening:**
- The detection zone is `TABLE_H / 2 + 1` — one unit beyond the table edge. This margin ensures the ball is clearly past the paddle before scoring, preventing edge-case double-scores.
- `ballSpeed` resets to `BALL_SPEED_INIT = 6` each point. The speed ramp is per-rally, not per-game.
- Setting `phase = "scored"` stops the update loop from processing ball physics during the pause.

---

### 3.2 — Scored Pause & Win Check

```typescript
if (s.phase === "scored") {
    s.scoreTimer -= dt;

    if (s.scoreTimer <= 0) {
        if (s.playerScore >= WIN_SCORE || s.aiScore >= WIN_SCORE) {
            s.phase = "win";
            s.winner = s.playerScore >= WIN_SCORE ? "player" : "ai";
        } else {
            s.phase = "playing";
            this.launchBall();
        }
    }
    return;  // skip normal update during scored phase
}
```

**What's happening:**
- `scoreTimer` counts down from 1.0 second. During this time, nothing moves — the ball stays wherever it went off-screen.
- After the pause, either the game ends (if someone reached `WIN_SCORE = 7`) or the ball relaunches.
- `return` early exits the update — no ball movement, no AI, no collision during the pause.

---

### 3.3 — Score Visualization

In the render method, draw score cubes along the table edges:

```typescript
// Player score — blue cubes on the left
for (let i = 0; i < s.playerScore; i++) {
    this.drawBox(
        -(TABLE_W / 2 + 0.5),           // left of table
        0.15,                            // slightly above surface
        TABLE_H / 2 - 1 - i * 0.6,      // stacked along Z
        0.15, 0.15, 0.15,               // small cube
        0.2, 0.6, 1.0                   // blue (matches player paddle)
    );
}

// AI score — red cubes on the right
for (let i = 0; i < s.aiScore; i++) {
    this.drawBox(
        TABLE_W / 2 + 0.5,              // right of table
        0.15,
        -(TABLE_H / 2 - 1 - i * 0.6),   // stacked on AI's side
        0.15, 0.15, 0.15,
        1.0, 0.3, 0.2                   // red (matches AI paddle)
    );
}
```

**What's happening:**
- Each score point adds a 0.15-unit cube. They're spaced 0.6 units apart along Z.
- Player cubes are on the left side, stacking from the player's end. AI cubes are on the right, stacking from the AI's end. This creates a visual scoreboard that's part of the 3D scene.
- Colors match the paddle colors — blue for player, red for AI — for instant recognition.

---

### 3.4 — Game Flow & Input

```typescript
// In keyDown handler:
if (e.code === "Space" || e.code === "Enter") {
    if (this.state.phase === "start") {
        this.state.phase = "playing";
        this.launchBall();
    } else if (this.state.phase === "win") {
        this.state = this.createState();  // full reset
    }
}

// State interface:
export interface Pong3DState {
    ballX: number; ballZ: number;
    ballVX: number; ballVZ: number;
    ballSpeed: number;
    playerX: number; aiX: number;
    playerScore: number; aiScore: number;
    phase: "start" | "playing" | "scored" | "win";
    winner: "player" | "ai" | null;
    scoreTimer: number;
    rallyHits: number;
}
```

**What's happening:**
- `"start"` phase: nothing moves. Space begins the game.
- `"playing"` phase: full update loop runs — ball moves, paddles respond, collision checks fire.
- `"scored"` phase: only the score timer counts down. Everything else is frozen.
- `"win"` phase: game over. Space creates a completely fresh state.
- `createState()` returns a clean object with all zeros and `phase: "start"`.

---

### 3.5 — Game Registration

**File:** `src/contexts/webgl/games/pong-3d/index.ts`

```typescript
export const Pong3DGame: GameDefinition = {
    id: "pong-3d",
    name: "3D Pong",
    description: "Classic Pong in 3D!",
    icon: "🏓",
    color: "#ff6f00",
    category: "3d",
    renderContext: "webgl",
    touchLayout: "dpad",
    help: {
        goal: "Score 7 points before the AI. Ball speeds up each rally.",
        controls: [
            { key: "Left/Right or A/D", action: "Move paddle" },
            { key: "Space", action: "Start / Restart" },
            { key: "Mouse drag", action: "Orbit camera" },
            { key: "ESC", action: "Exit to menu" },
        ],
        tips: [
            "Hit the ball with the paddle edge to angle it",
            "Ball speeds up with each hit",
        ],
    },
    create(canvas, onExit) {
        const engine = new Pong3DEngine(canvas, onExit);
        engine.start();
        return engine;
    },
};
```

---

## Test It

```bash
pnpm dev
```

1. Press **Space** to start a game
2. Score a point — a **blue cube** should appear on the left side of the table
3. Let the AI score — a **red cube** should appear on the right side
4. After each score, there should be a **1-second pause** before the ball relaunches
5. Ball speed should **reset** after each point (slow initial launch)
6. First to **7 points** wins — game enters win phase
7. Press **Space** again to restart with a fresh score

---

## Challenges

**Easy:**
- Change `WIN_SCORE` from 7 to 3 for faster games during testing.

**Medium:**
- Add a "rally bonus": if `rallyHits > 10`, the next point scored is worth 2 instead of 1. Track this by incrementing the score by `rallyHits > 10 ? 2 : 1`.

**Hard:**
- Add a brief screen flash when a point is scored: change `gl.clearColor` to a bright color for the first 0.2 seconds of the scored phase, then fade back to the dark background.

---

## What You Learned

- Score detection uses a boundary check beyond the table edge with a margin
- A "scored" pause phase prevents jarring instant ball relaunch
- Score cubes are a text-free HUD — colored boxes that match paddle colors
- A 4-phase state machine (`start` -> `playing` -> `scored` -> `win`) manages the complete game flow
- Ball speed resets per-point but ramps per-rally, creating tension within each exchange

---

## Complete Architecture

```
src/contexts/webgl/games/pong-3d/
├── shaders.ts          ← Blinn-Phong + emissive fragment shader
├── types.ts            ← Pong3DState interface + all gameplay constants
├── Pong3DEngine.ts     ← WebGL2 engine: table, paddles, ball, AI, scoring
└── index.ts            ← GameDefinition export for registry
```

**Congratulations!** You've built a complete 3D Pong game with AI, physics, and scoring. The emissive uniform, AABB collision, and state machine patterns appear in nearly every game that follows.

---
[← Previous Step](./step-2.md) | [Back to README](./README.md)
