# Step 2: Mole Pop-Up & Click Detection

**Goal:** Animate moles rising from holes and detect when the player clicks them.

**Time:** ~15 minutes

---

## What You'll Build

Moles randomly pop up from holes, stay visible briefly, then sink back down. Players can click them!

```
State Machine:
empty → rising (200ms) → up (1200ms) → sinking (200ms) → empty
         ↑___________________________________________________↑
                    Click = instant sinking
```

---

## Concepts

- **State Machine**: Transitions between hole states
- **Timer-Based Animation**: Use delta time for smooth motion
- **Interpolation**: Calculate pop-up position (0.0 to 1.0)
- **Click-to-Grid Mapping**: Convert mouse coords to hole index
- **Collision Detection**: Check if click hits an active mole

---

## Code

### 1. Create Mole System

**File:** `src/contexts/canvas2d/games/whack-a-mole/systems/MoleSystem.ts`

```typescript
import type { WhackState } from "../types";
import {
	GRID_SIZE,
	RISE_DURATION,
	SINK_DURATION,
	UP_DURATION_BASE,
	ROUND_DURATION,
} from "../types";

export class MoleSystem {
	/** Update all holes: advance timers, transition states, spawn new moles */
	update(state: WhackState, dt: number): void {
		if (state.phase !== "playing") return;

		// Update existing moles
		for (const hole of state.holes) {
			if (hole.state === "empty") continue;

			hole.timer += dt;

			// State transitions
			if (hole.state === "rising" && hole.timer >= RISE_DURATION) {
				hole.state = "up";
				hole.timer = 0;
			} else if (hole.state === "up" && hole.timer >= UP_DURATION_BASE) {
				// Mole stayed up too long → sink back down
				hole.state = "sinking";
				hole.timer = 0;
			} else if (hole.state === "sinking" && hole.timer >= SINK_DURATION) {
				// Back to empty
				hole.state = "empty";
				hole.timer = 0;
				hole.isBomb = false;
				hole.hit = false;
			}
		}

		// Spawn new moles
		this.trySpawn(state, dt);
	}

	private trySpawn(state: WhackState, dt: number): void {
		state.spawnTimer += dt;

		if (state.spawnTimer >= state.spawnInterval) {
			state.spawnTimer = 0;

			// Find all empty holes
			const emptyIndices: number[] = [];
			for (let i = 0; i < GRID_SIZE; i++) {
				if (state.holes[i].state === "empty") {
					emptyIndices.push(i);
				}
			}

			// Pick a random empty hole
			if (emptyIndices.length > 0) {
				const idx =
					emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
				const hole = state.holes[idx];

				hole.state = "rising";
				hole.timer = 0;
				hole.isBomb = false; // For now, no bombs (added in Step 4)
				hole.hit = false;
			}
		}
	}
}
```

**Key Logic:**

- **Timers**: Each hole tracks time in its current state
- **Transitions**: Automatic state changes based on elapsed time
- **Spawning**: Periodically pick a random empty hole

---

### 2. Create Input System

**File:** `src/contexts/canvas2d/games/whack-a-mole/systems/InputSystem.ts`

```typescript
import type { WhackState } from "../types";
import { GRID_COLS, GRID_ROWS } from "../types";

export class InputSystem {
	private canvas: HTMLCanvasElement;
	private boundClick: (e: MouseEvent) => void;

	constructor(canvas: HTMLCanvasElement) {
		this.canvas = canvas;
		this.boundClick = (e: MouseEvent) => this.handleClick(e);
	}

	attach(state: WhackState): void {
		this.canvas.addEventListener("click", this.boundClick);
		// Store state reference for click handling
		(this.canvas as any).__whackState = state;
	}

	detach(): void {
		this.canvas.removeEventListener("click", this.boundClick);
	}

	private handleClick(e: MouseEvent): void {
		const state: WhackState = (this.canvas as any).__whackState;
		if (!state || state.phase !== "playing") return;

		const rect = this.canvas.getBoundingClientRect();
		const scaleX = this.canvas.width / rect.width;
		const scaleY = this.canvas.height / rect.height;

		// Convert screen coords to canvas coords
		const mx = (e.clientX - rect.left) * scaleX;
		const my = (e.clientY - rect.top) * scaleY;

		const W = this.canvas.width;
		const H = this.canvas.height;

		// Grid layout (must match GameRenderer calculations)
		const gridSize = Math.min(W * 0.8, H * 0.65);
		const cellW = gridSize / GRID_COLS;
		const cellH = gridSize / GRID_ROWS;
		const gridX = (W - gridSize) / 2;
		const gridY = (H - gridSize) / 2 + 60;

		// Check if click is inside grid bounds
		if (
			mx < gridX ||
			mx > gridX + gridSize ||
			my < gridY ||
			my > gridY + gridSize
		) {
			return; // Outside grid
		}

		// Map to grid cell
		const col = Math.floor((mx - gridX) / cellW);
		const row = Math.floor((my - gridY) / cellH);

		if (row < 0 || row >= GRID_ROWS || col < 0 || col >= GRID_COLS) return;

		const idx = row * GRID_COLS + col;
		const hole = state.holes[idx];

		// Check if mole is hittable
		if ((hole.state === "rising" || hole.state === "up") && !hole.hit) {
			hole.hit = true;
			hole.state = "sinking"; // Instantly start sinking
			hole.timer = 0;

			// Score will be added in Step 3
			console.log(`Hit mole at hole ${idx}!`);
		}
	}
}
```

**Key Logic:**

- **Coordinate Transform**: Screen → Canvas → Grid Cell
- **Bounds Check**: Only process clicks inside grid
- **Hit Validation**: Only hit moles that are rising or up (not already hit)
- **Instant Sink**: Clicking forces immediate transition to sinking state

---

### 3. Update Game Renderer to Draw Moles

**File:** `src/contexts/canvas2d/games/whack-a-mole/renderers/GameRenderer.ts`

Add mole drawing after holes:

```typescript
import type { WhackState, Hole } from "../types";
import { GRID_COLS, GRID_ROWS, RISE_DURATION, SINK_DURATION } from "../types";

export class GameRenderer {
	render(ctx: CanvasRenderingContext2D, state: WhackState): void {
		const W = ctx.canvas.width;
		const H = ctx.canvas.height;

		this.drawBackground(ctx, W, H);

		const gridSize = Math.min(W * 0.8, H * 0.65);
		const cellW = gridSize / GRID_COLS;
		const cellH = gridSize / GRID_ROWS;
		const gridX = (W - gridSize) / 2;
		const gridY = (H - gridSize) / 2 + 60;

		// Draw holes
		for (let row = 0; row < GRID_ROWS; row++) {
			for (let col = 0; col < GRID_COLS; col++) {
				const idx = row * GRID_COLS + col;
				const hole = state.holes[idx];
				const cx = gridX + col * cellW + cellW / 2;
				const cy = gridY + row * cellH + cellH / 2;

				this.drawHole(ctx, cx, cy, cellW, cellH);
			}
		}

		// Draw moles (on top of holes)
		for (let row = 0; row < GRID_ROWS; row++) {
			for (let col = 0; col < GRID_COLS; col++) {
				const idx = row * GRID_COLS + col;
				const hole = state.holes[idx];

				if (hole.state !== "empty") {
					const cx = gridX + col * cellW + cellW / 2;
					const cy = gridY + row * cellH + cellH / 2;
					this.drawMole(ctx, hole, cx, cy, cellW, cellH);
				}
			}
		}
	}

	private drawBackground(
		ctx: CanvasRenderingContext2D,
		W: number,
		H: number,
	): void {
		ctx.fillStyle = "#66bb6a";
		ctx.fillRect(0, 0, W, H);

		ctx.fillStyle = "rgba(76, 175, 80, 0.3)";
		const squareSize = 40;
		for (let y = 0; y < H; y += squareSize) {
			for (let x = 0; x < W; x += squareSize) {
				if ((x / squareSize + y / squareSize) % 2 === 0) {
					ctx.fillRect(x, y, squareSize, squareSize);
				}
			}
		}
	}

	private drawHole(
		ctx: CanvasRenderingContext2D,
		cx: number,
		cy: number,
		cellW: number,
		cellH: number,
	): void {
		const holeRadiusX = cellW * 0.35;
		const holeRadiusY = cellH * 0.2;

		ctx.fillStyle = "#1a0f05";
		ctx.beginPath();
		ctx.ellipse(
			cx,
			cy + holeRadiusY * 0.3,
			holeRadiusX * 1.15,
			holeRadiusY * 1.15,
			0,
			0,
			Math.PI * 2,
		);
		ctx.fill();

		ctx.fillStyle = "#2a1a0a";
		ctx.beginPath();
		ctx.ellipse(
			cx,
			cy + holeRadiusY * 0.5,
			holeRadiusX,
			holeRadiusY,
			0,
			0,
			Math.PI * 2,
		);
		ctx.fill();
	}

	private drawMole(
		ctx: CanvasRenderingContext2D,
		hole: Hole,
		cx: number,
		cy: number,
		cellW: number,
		cellH: number,
	): void {
		// Calculate pop-up fraction (0.0 = hidden, 1.0 = fully visible)
		let popFraction = 1;

		if (hole.state === "rising") {
			popFraction = hole.timer / RISE_DURATION;
		} else if (hole.state === "sinking") {
			popFraction = 1 - hole.timer / SINK_DURATION;
		}

		const moleRadius = cellW * 0.28;
		const moleY = cy - moleRadius * popFraction * 1.2; // Pop up above hole

		// Mole body (brown circle)
		ctx.fillStyle = "#8b4513";
		ctx.beginPath();
		ctx.arc(cx, moleY, moleRadius, 0, Math.PI * 2);
		ctx.fill();

		// Mole eyes (white)
		const eyeOffset = moleRadius * 0.35;
		const eyeRadius = moleRadius * 0.15;

		ctx.fillStyle = "#fff";
		ctx.beginPath();
		ctx.arc(cx - eyeOffset, moleY - eyeRadius, eyeRadius, 0, Math.PI * 2);
		ctx.fill();

		ctx.beginPath();
		ctx.arc(cx + eyeOffset, moleY - eyeRadius, eyeRadius, 0, Math.PI * 2);
		ctx.fill();

		// Pupils (black)
		const pupilRadius = eyeRadius * 0.6;
		ctx.fillStyle = "#000";

		ctx.beginPath();
		ctx.arc(cx - eyeOffset, moleY - eyeRadius, pupilRadius, 0, Math.PI * 2);
		ctx.fill();

		ctx.beginPath();
		ctx.arc(cx + eyeOffset, moleY - eyeRadius, pupilRadius, 0, Math.PI * 2);
		ctx.fill();

		// Nose (pink)
		ctx.fillStyle = "#ff69b4";
		ctx.beginPath();
		ctx.arc(cx, moleY + eyeRadius, eyeRadius * 0.8, 0, Math.PI * 2);
		ctx.fill();
	}
}
```

**Animation Details:**

- **Rising**: `popFraction = timer / RISE_DURATION` (0.0 → 1.0)
- **Up**: `popFraction = 1.0` (fully visible)
- **Sinking**: `popFraction = 1 - timer / SINK_DURATION` (1.0 → 0.0)
- **Position**: `moleY = cy - moleRadius * popFraction * 1.2` (below hole → above hole)

---

### 4. Update Game Engine

**File:** `src/contexts/canvas2d/games/whack-a-mole/WhackEngine.ts`

```typescript
import type { WhackState, Hole } from "./types";
import {
	GRID_SIZE,
	SPAWN_INTERVAL_BASE,
	ROUND_DURATION,
	HS_KEY,
} from "./types";
import { GameRenderer } from "./renderers/GameRenderer";
import { MoleSystem } from "./systems/MoleSystem";
import { InputSystem } from "./systems/InputSystem";

export class WhackEngine {
	private ctx: CanvasRenderingContext2D;
	private state: WhackState;
	private running: boolean;
	private rafId: number;
	private lastTime: number;

	private gameRenderer: GameRenderer;
	private moleSystem: MoleSystem;
	private inputSystem: InputSystem;

	constructor(canvas: HTMLCanvasElement) {
		this.ctx = canvas.getContext("2d")!;
		this.running = false;
		this.rafId = 0;
		this.lastTime = 0;

		canvas.width = window.innerWidth;
		canvas.height = window.innerHeight;

		let highScore = 0;
		try {
			highScore = parseInt(localStorage.getItem(HS_KEY) ?? "0", 10) || 0;
		} catch (e) {
			console.warn("Could not load high score");
		}

		const holes: Hole[] = [];
		for (let i = 0; i < GRID_SIZE; i++) {
			holes.push({
				state: "empty",
				timer: 0,
				isBomb: false,
				hit: false,
			});
		}

		this.state = {
			holes,
			score: 0,
			highScore,
			combo: 0,
			maxCombo: 0,
			timeRemaining: ROUND_DURATION,
			round: 1,
			phase: "playing", // Start playing immediately for testing
			paused: false,
			particles: [],
			hammerEffect: null,
			spawnInterval: SPAWN_INTERVAL_BASE,
			spawnTimer: 0,
		};

		this.gameRenderer = new GameRenderer();
		this.moleSystem = new MoleSystem();
		this.inputSystem = new InputSystem(canvas);

		this.inputSystem.attach(this.state);
	}

	start(): void {
		this.running = true;
		this.lastTime = performance.now();
		this.loop();
	}

	destroy(): void {
		this.running = false;
		cancelAnimationFrame(this.rafId);
		this.inputSystem.detach();
	}

	private loop(): void {
		if (!this.running) return;

		const now = performance.now();
		const dt = now - this.lastTime;
		this.lastTime = now;

		this.update(dt);
		this.render();

		this.rafId = requestAnimationFrame(() => this.loop());
	}

	private update(dt: number): void {
		this.moleSystem.update(this.state, dt);
	}

	private render(): void {
		this.gameRenderer.render(this.ctx, this.state);
	}
}
```

**Changes:**

- Added `MoleSystem` and `InputSystem`
- Delta time tracking (`lastTime`, `dt`)
- Set `phase = 'playing'` for immediate testing
- Attached input system to canvas

---

## Test It

1. **Run:** `npm run dev`
2. **Navigate:** Select "Whack-a-Mole"
3. **Observe:**
   - Moles randomly pop up from holes
   - They rise → stay visible → sink back down
   - **Click a mole** → console logs "Hit mole at hole X!"
   - Mole immediately sinks when clicked
4. **Timing:**
   - Rising: 200ms
   - Up: 1200ms
   - Sinking: 200ms
   - Spawn interval: ~1200ms between moles

---

## State Machine Diagram

```
┌─────────┐
│  empty  │ ← Initial state
└────┬────┘
     │ spawnTimer hits interval
     ↓
┌─────────┐
│ rising  │ ← 200ms animation
└────┬────┘
     │ timer >= RISE_DURATION
     ↓
┌─────────┐              ┌──────────┐
│   up    │ ← visible    │  Click!  │
└────┬────┘              └────┬─────┘
     │ timer >= UP_TIME       │
     ↓                        ↓
┌─────────┐              ┌─────────┐
│ sinking │ ←────────────┤ sinking │
└────┬────┘  forced      └─────────┘
     │ timer >= SINK_DURATION
     ↓
┌─────────┐
│  empty  │ (loop)
└─────────┘
```

---

## What You Learned

✅ Implement state machines with timers  
✅ Interpolate animation values (0.0 → 1.0)  
✅ Convert mouse coordinates to grid indices  
✅ Detect clicks on specific game objects  
✅ Force state transitions on events (click → sinking)

---

## Next Step

→ [Step 3: Scoring, Combo & Countdown Timer](./step-3.md) — Add score tracking, combo multipliers, and 60-second timer
