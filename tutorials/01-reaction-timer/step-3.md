# Step 3: Multi-Round System & Persistence

> **Game:** Reaction Timer | **Step 3 of 3** | **Time:** ~15 minutes  
> **Previous:** [Step 2](./step-2.md)

## What You'll Learn

- Track multiple rounds and attempts
- Calculate statistics (average, best)
- Save high scores with localStorage
- Render a HUD (heads-up display)
- Show a final results screen

## Prerequisites

- Completed Step 2
- Game with working reaction timer for one round

## Let's Code

### 3.1 — Extend Game State for Multiple Rounds

Update the state interface and initialization at the top of `src/main.ts`:

```typescript
// Define phase types
type Phase = "waiting" | "ready" | "tooEarly" | "result" | "finished";

interface AttemptResult {
	reactionMs: number;
	tooEarly: boolean;
}

interface GameState {
	phase: Phase;
	waitStartedAt: number;
	scheduledDelay: number;
	greenAt: number;
	reactionMs: number;

	// Multi-round tracking
	round: number; // Current round (1-5)
	attempts: AttemptResult[]; // History of all attempts
	bestAllTime: number; // Persisted best score
}

const MAX_ROUNDS = 5;
const LS_BEST_KEY = "reaction_timer_best";

// Load best score from localStorage
let savedBest = 0;
try {
	savedBest = parseInt(localStorage.getItem(LS_BEST_KEY) ?? "0", 10) || 0;
} catch (e) {
	console.warn("localStorage not available");
}

// Initialize state
const state: GameState = {
	phase: "waiting",
	waitStartedAt: performance.now(),
	scheduledDelay: 2000 + Math.random() * 3000,
	greenAt: 0,
	reactionMs: 0,
	round: 1,
	attempts: [],
	bestAllTime: savedBest,
};
```

**What's happening:**

- Line 1: Added 'finished' phase for end screen
- Line 4-7: Track each attempt with time + whether it was too early
- Line 17-19: New fields for round tracking
- Line 22-23: Constants for game configuration
- Line 26-31: Load saved best score safely
- Line 40-42: Initialize multi-round fields

### 3.2 — Update Click Handler for Round Progression

Replace the `handleClick()` and `startNewRound()` functions:

```typescript
function handleClick() {
	if (state.phase === "waiting") {
		// Clicked too early
		state.phase = "tooEarly";
		state.attempts.push({ reactionMs: 0, tooEarly: true });
		state.round++;
	} else if (state.phase === "ready") {
		// Good click - measure time
		const reactionMs = performance.now() - state.greenAt;
		state.reactionMs = Math.round(reactionMs);
		state.phase = "result";
		state.attempts.push({ reactionMs: state.reactionMs, tooEarly: false });

		// Update all-time best
		if (
			state.reactionMs > 0 &&
			(state.bestAllTime === 0 || state.reactionMs < state.bestAllTime)
		) {
			state.bestAllTime = state.reactionMs;
			try {
				localStorage.setItem(LS_BEST_KEY, String(state.reactionMs));
			} catch (e) {
				console.warn("Could not save to localStorage");
			}
		}

		state.round++;
	} else if (state.phase === "tooEarly" || state.phase === "result") {
		// Check if all rounds complete
		if (state.round > MAX_ROUNDS) {
			state.phase = "finished";
		} else {
			startNewRound();
		}
	} else if (state.phase === "finished") {
		// Restart game
		state.round = 1;
		state.attempts = [];
		state.reactionMs = 0;
		startNewRound();
	}
}

function startNewRound() {
	state.phase = "waiting";
	state.waitStartedAt = performance.now();
	state.scheduledDelay = 2000 + Math.random() * 3000;
	state.greenAt = 0;
	state.reactionMs = 0;
}
```

**What's happening:**

- Line 5-6: Record too-early attempt and increment round
- Line 12: Record successful attempt
- Line 15-23: Check if this is a new all-time best and save it
- Line 25: Increment round after result shown
- Line 28-32: Check if all rounds complete, show finish screen
- Line 34-38: Allow restart from finish screen

### 3.3 — Add HUD (Heads-Up Display)

Replace the rendering section in the `loop()` function with this comprehensive version:

```typescript
function loop() {
	const width = canvas.width;
	const height = canvas.height;
	const centerX = width / 2;
	const centerY = height / 2;
	const now = performance.now();

	// Update phase transitions
	if (state.phase === "waiting") {
		const elapsed = now - state.waitStartedAt;
		if (elapsed >= state.scheduledDelay) {
			state.phase = "ready";
			state.greenAt = now;
		}
	}

	// Background color
	let bgColor = "#cc0000";
	if (state.phase === "ready") bgColor = "#00cc00";
	if (state.phase === "tooEarly") bgColor = "#0066cc";
	if (state.phase === "result") bgColor = "#111111";
	if (state.phase === "finished") bgColor = "#222222";

	ctx.fillStyle = bgColor;
	ctx.fillRect(0, 0, width, height);

	// Draw main content based on phase
	ctx.fillStyle = "#ffffff";
	ctx.font = "bold 48px monospace";
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";

	if (state.phase === "finished") {
		// Final results screen
		renderFinishScreen(ctx, centerX, centerY);
	} else if (state.phase === "waiting") {
		ctx.fillText("Wait for green...", centerX, centerY);
	} else if (state.phase === "ready") {
		ctx.fillText("CLICK NOW!", centerX, centerY);
	} else if (state.phase === "tooEarly") {
		ctx.fillText("Too early!", centerX, centerY - 60);
		ctx.font = "32px monospace";
		ctx.fillText("Click to continue", centerX, centerY + 20);
	} else if (state.phase === "result") {
		ctx.fillText(`${state.reactionMs} ms`, centerX, centerY);
		ctx.font = "28px monospace";
		ctx.fillStyle = "#00ff00";
		ctx.fillText(getFeedback(state.reactionMs), centerX, centerY + 60);
		ctx.fillStyle = "#888888";
		ctx.fillText("Click to continue", centerX, centerY + 120);
	}

	// Draw HUD (except on finish screen)
	if (state.phase !== "finished") {
		renderHUD(ctx, width, height);
	}

	requestAnimationFrame(loop);
}
```

Now add these rendering helper functions before the `loop()` function:

```typescript
function readerHUD(
	ctx: CanvasRenderingContext2D,
	width: number,
	height: number,
) {
	ctx.textAlign = "left";
	ctx.textBaseline = "top";
	ctx.font = "20px monospace";
	ctx.fillStyle = "#ffffff";

	// Top-left: Round counter
	ctx.fillText(`Round: ${state.round}/${MAX_ROUNDS}`, 20, 20);

	// Top-right: Recent attempts
	if (state.attempts.length > 0) {
		ctx.textAlign = "right";
		ctx.fillText("Recent:", width - 20, 20);

		const recentCount = Math.min(3, state.attempts.length);
		const recent = state.attempts.slice(-recentCount).reverse();

		recent.forEach((attempt, idx) => {
			const y = 50 + idx * 30;
			if (attempt.tooEarly) {
				ctx.fillStyle = "#ff6666";
				ctx.fillText("Too early", width - 20, y);
			} else {
				ctx.fillStyle = "#66ff66";
				ctx.fillText(`${attempt.reactionMs} ms`, width - 20, y);
			}
		});
	}

	// Bottom: All-time best
	if (state.bestAllTime > 0) {
		ctx.textAlign = "center";
		ctx.fillStyle = "#ffff00";
		ctx.fillText(
			`🏆 All-time best: ${state.bestAllTime} ms`,
			width / 2,
			height - 30,
		);
	}
}

function renderFinishScreen(
	ctx: CanvasRenderingContext2D,
	cx: number,
	cy: number,
) {
	ctx.fillText("Game Complete!", cx, cy - 150);

	// Calculate stats
	const validAttempts = state.attempts.filter((a) => !a.tooEarly);
	const tooEarlyCount = state.attempts.filter((a) => a.tooEarly).length;

	if (validAttempts.length > 0) {
		const times = validAttempts.map((a) => a.reactionMs);
		const avg = Math.round(times.reduce((sum, t) => sum + t, 0) / times.length);
		const best = Math.min(...times);

		ctx.font = "28px monospace";
		ctx.fillStyle = "#00ff00";
		ctx.fillText(`Average: ${avg} ms`, cx, cy - 60);

		ctx.fillStyle = "#ffff00";
		ctx.fillText(`Session Best: ${best} ms`, cx, cy - 20);
	}

	if (tooEarlyCount > 0) {
		ctx.font = "24px monospace";
		ctx.fillStyle = "#ff6666";
		ctx.fillText(`Too Early: ${tooEarlyCount} times`, cx, cy + 30);
	}

	// Show all attempts
	ctx.font = "18px monospace";
	ctx.fillStyle = "#888888";
	ctx.fillText("All Attempts:", cx, cy + 80);

	state.attempts.forEach((attempt, idx) => {
		const y = cy + 110 + idx * 25;
		ctx.textAlign = "center";
		if (attempt.tooEarly) {
			ctx.fillStyle = "#ff6666";
			ctx.fillText(`Round ${idx + 1}: Too early`, cx, y);
		} else {
			ctx.fillStyle = "#66ff66";
			ctx.fillText(`Round ${idx + 1}: ${attempt.reactionMs} ms`, cx, y);
		}
	});

	ctx.font = "24px monospace";
	ctx.fillStyle = "#ffffff";
	ctx.fillText("Click to play again", cx, cy + 240);
}

function getFeedback(ms: number): string {
	if (ms < 200) return "🚀 Lightning fast!";
	if (ms < 250) return "⚡ Excellent!";
	if (ms < 300) return "👍 Great!";
	if (ms < 400) return "👌 Good!";
	return "🐌 Keep practicing!";
}
```

**What's happening:**

- Line 1-36: HUD shows round counter, recent attempts, and all-time best
- Line 38-84: Finish screen displays complete statistics
- Line 44-48: Calculate average and best from valid attempts
- Line 69-81: List all attempts with color coding
- Line 86-92: Feedback messages based on speed

## Try It

```bash
npm run dev
```

Now you have a complete game! Try the full flow:

1. **Round 1-5:** React to the green screen
2. **HUD:** See your round progress and recent attempts (top corners)
3. **Mistakes:** Too-early clicks are tracked in red
4. **Finish:** After 5 rounds, see your complete stats
5. **All-time best:** Refresh the page — your best score persists!
6. **Replay:** Click to start a new 5-round session

## What We Built

✅ 5-round game system  
✅ Attempt history tracking  
✅ Real-time HUD with stats  
✅ Final results screen  
✅ localStorage persistence  
✅ Full game loop (start → play → finish → restart)

You now have a complete, polished reaction timer game!

## Challenge

Try these advanced features:

1. **Difficulty modes:** Easy (3-6s delay), Normal (2-5s), Hard (1-3s)
2. **Visual countdown:** Show shrinking circle during waiting phase
3. **Sound effects:** Beep when screen turns green (Web Audio API)
4. **Leaderboard:** Store top 5 scores instead of just best
5. **Statistics:** Track total games played, average across all sessions
6. **Mobile support:** Add touch event listeners

## Full Code

The complete, production-ready implementation is at:  
[`src/games/reaction-timer/`](../../src/games/reaction-timer/)

## Next Game

Continue to [Lights Out](../../02-lights-out/README.md) where you'll learn grid-based rendering, toggle logic, and win detection! →
