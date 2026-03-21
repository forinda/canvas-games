# Step 2: Game State & Click Events

> **Game:** Reaction Timer | **Step 2 of 3** | **Time:** ~15 minutes  
> **Previous:** [Step 1](./step-1.md) | **Next:** [Step 3](./step-3.md)

## What You'll Learn

- Implement a state machine with multiple phases
- Handle mouse click and keyboard events
- Calculate reaction time using `performance.now()`
- Detect "too early" clicks

## Prerequisites

- Completed Step 1
- Canvas with red background and game loop running

## Let's Code

### 2.1 — Define Game State Types

At the top of `src/main.ts`, replace the simple `phase` variable with a complete state object:

```typescript
// Canvas setup
const canvas = document.getElementById("gameCanvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

window.addEventListener("resize", () => {
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;
});

// Define phase types
type Phase = "waiting" | "ready" | "tooEarly" | "result";

// Game state
interface GameState {
	phase: Phase;
	waitStartedAt: number; // When waiting phase began
	scheduledDelay: number; // Random delay before turning green
	greenAt: number; // When screen turned green
	reactionMs: number; // Measured reaction time
}

// Initialize state
const state: GameState = {
	phase: "waiting",
	waitStartedAt: performance.now(),
	scheduledDelay: 2000 + Math.random() * 3000, // 2-5 seconds
	greenAt: 0,
	reactionMs: 0,
};
```

**What's happening:**

- Line 14: TypeScript type for all possible game phases
- Line 17-23: Complete state structure with timing data
- Line 26-32: Initialize with random delay between 2-5 seconds

### 2.2 — Add Phase Transition Logic

Replace the `loop()` function with this enhanced version:

```typescript
function loop() {
	const width = canvas.width;
	const height = canvas.height;
	const centerX = width / 2;
	const centerY = height / 2;
	const now = performance.now();

	// Check if it's time to turn green
	if (state.phase === "waiting") {
		const elapsed = now - state.waitStartedAt;
		if (elapsed >= state.scheduledDelay) {
			// Time's up - turn green!
			state.phase = "ready";
			state.greenAt = now;
		}
	}

	// Choose background color based on phase
	let bgColor = "#cc0000"; // Red (waiting)
	if (state.phase === "ready") bgColor = "#00cc00"; // Green
	if (state.phase === "tooEarly") bgColor = "#0066cc"; // Blue
	if (state.phase === "result") bgColor = "#111111"; // Dark

	ctx.fillStyle = bgColor;
	ctx.fillRect(0, 0, width, height);

	// Draw phase-specific text
	ctx.fillStyle = "#ffffff";
	ctx.font = "bold 48px monospace";
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";

	if (state.phase === "waiting") {
		ctx.fillText("Wait for green...", centerX, centerY);
	} else if (state.phase === "ready") {
		ctx.fillText("CLICK NOW!", centerX, centerY);
	} else if (state.phase === "tooEarly") {
		ctx.fillText("Too early!", centerX, centerY - 60);
		ctx.font = "32px monospace";
		ctx.fillText("Wait for green", centerX, centerY + 20);
	} else if (state.phase === "result") {
		ctx.fillText(`${state.reactionMs} ms`, centerX, centerY);
		ctx.font = "28px monospace";
		ctx.fillStyle = "#00ff00";
		ctx.fillText(getFeedback(state.reactionMs), centerX, centerY + 60);
	}

	requestAnimationFrame(loop);
}

// Helper to give feedback based on speed
function getFeedback(ms: number): string {
	if (ms < 200) return "🚀 Lightning fast!";
	if (ms < 250) return "⚡ Excellent!";
	if (ms < 300) return "👍 Great!";
	if (ms < 400) return "👌 Good!";
	return "🐌 Keep practicing!";
}

// Start the loop
loop();
```

**What's happening:**

- Line 9-16: Check elapsed time and transition to green phase
- Line 19-22: Map each phase to a background color
- Line 33-46: Display different messages for each phase
- Line 51-57: Convert reaction time to encouraging feedback

### 2.3 — Handle Click Events

Add click and keyboard event handlers before the `loop()` function:

```typescript
// Handle user input
function handleClick() {
	if (state.phase === "waiting") {
		// Clicked too early - still red!
		state.phase = "tooEarly";
	} else if (state.phase === "ready") {
		// Good click - measure reaction time
		const reactionMs = performance.now() - state.greenAt;
		state.reactionMs = Math.round(reactionMs);
		state.phase = "result";
	} else if (state.phase === "tooEarly" || state.phase === "result") {
		// Click to continue to next round
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

// Listen for clicks
canvas.addEventListener("click", handleClick);

// Also allow spacebar
window.addEventListener("keydown", (e) => {
	if (e.key === " " || e.key === "Enter") {
		e.preventDefault();
		handleClick();
	}
});
```

**What's happening:**

- Line 2-15: Handle clicks differently based on current phase
- Line 4-6: Clicking during red = penalty (blue screen)
- Line 7-10: Clicking during green = measure time and show result
- Line 11-14: Clicking during result = start next round
- Line 17-23: Reset state for a new round
- Line 26: Listen for canvas clicks
- Line 29-34: Also allow spacebar/Enter for accessibility

### 2.4 — Understanding `performance.now()`

We use `performance.now()` instead of `Date.now()` because it's more precise:

```typescript
const start = performance.now();
// ... user clicks ...
const elapsed = performance.now() - start;
```

`performance.now()` returns milliseconds with microsecond precision, perfect for measuring reaction times (typically 150-400ms).

## Try It

```bash
npm run dev
```

Now the game is interactive! Try this sequence:

1. **Wait** - Screen is red, text says "Wait for green..."
2. **Turn green** - After 2-5 seconds, screen turns green: "CLICK NOW!"
3. **Click** - Your reaction time appears (e.g., "247 ms")
4. **Click again** - Starts a new round

Try clicking while the screen is **red** — you'll see a blue penalty screen!

## What We Built

✅ State machine with 4 phases  
✅ Automatic transition from red → green  
✅ Click event handling  
✅ Reaction time measurement  
✅ "Too early" detection  
✅ Result feedback ("Lightning fast!", etc.)

## Challenge

Try these extensions:

1. Add a countdown timer showing seconds until green
2. Vibrate the "CLICK NOW!" text with `Math.sin(now * 0.01)`
3. Add a "false start" counter that tracks total too-early clicks
4. Make the random delay shorter each round (increasing difficulty)

## Next Step

Continue to [Step 3: Multi-Round System & Persistence](./step-3.md) where we'll add a 5-round system, scoring, and localStorage! →
