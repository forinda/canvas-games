# Step 1: Project Setup & Canvas Rendering

> **Game:** Reaction Timer | **Step 1 of 3** | **Time:** ~15 minutes  
> **Next:** [Step 2](./step-2.md)

## What You'll Learn

- Set up an HTML5 Canvas project
- Create a game loop with `requestAnimationFrame`
- Draw colored backgrounds and centered text
- Handle window resizing

## Prerequisites

- Basic JavaScript/TypeScript knowledge
- Node.js installed on your system

## Let's Code

### 1.1 — Create a New Project

First, let's set up a basic Vite project:

```bash
npm create vite@latest reaction-timer -- --template vanilla-ts
cd reaction-timer
npm install
```

### 1.2 — Set Up the HTML

Replace the content of `index.html`:

```html
<!DOCTYPE html>
<html lang="en">
	<head>
		<meta charset="UTF-8" />
		<meta name="viewport" content="width=device-width, initial-scale=1.0" />
		<title>Reaction Timer</title>
		<style>
			* {
				margin: 0;
				padding: 0;
				box-sizing: border-box;
			}
			body {
				overflow: hidden;
				font-family: monospace;
			}
			canvas {
				display: block;
			}
		</style>
	</head>
	<body>
		<canvas id="gameCanvas"></canvas>
		<script type="module" src="/src/main.ts"></script>
	</body>
</html>
```

**What's happening:**

- Line 7-14: Reset default styles and hide scrollbars
- Line 18: Create a canvas that fills the screen
- Line 19: Load our TypeScript game code

### 1.3 — Create the Game Engine

Create `src/main.ts`:

```typescript
// Canvas setup
const canvas = document.getElementById("gameCanvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;

// Make canvas fill the screen
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Handle window resize
window.addEventListener("resize", () => {
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;
});

// Game state
let phase: "waiting" | "ready" = "waiting";

// Game loop
function loop() {
	const width = canvas.width;
	const height = canvas.height;
	const centerX = width / 2;
	const centerY = height / 2;

	// Clear screen with red background (waiting phase)
	ctx.fillStyle = "#cc0000";
	ctx.fillRect(0, 0, width, height);

	// Draw centered text
	ctx.fillStyle = "#ffffff";
	ctx.font = "bold 48px monospace";
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.fillText("Wait for green...", centerX, centerY);

	// Draw instructions at bottom
	ctx.font = "24px monospace";
	ctx.fillText("Click when the screen turns green!", centerX, height - 50);

	// Continue the game loop
	requestAnimationFrame(loop);
}

// Start the game
loop();
```

**What's happening:**

- Line 2-3: Get canvas element and 2D drawing context
- Line 6-7: Set canvas to full window size
- Line 10-13: Update canvas size when window is resized
- Line 16: Store current game phase
- Line 19-43: Main game loop function
- Line 26-27: Fill entire canvas with red
- Line 30-34: Configure text styling and draw centered
- Line 37-38: Draw instructions at bottom
- Line 41: Schedule next frame (creates smooth animation)
- Line 46: Start the loop

### 1.4 — Understanding the Game Loop

The game loop is the heart of every game. It runs many times per second (typically 60fps):

```
loop() → draw frame → requestAnimationFrame(loop) → loop() → ...
```

`requestAnimationFrame` tells the browser to call our function again before the next repaint. This creates smooth animations and is more efficient than `setInterval`.

## Try It

```bash
npm run dev
```

Open http://localhost:5173 in your browser. You should see:

- A full-screen red canvas
- White centered text: "Wait for green..."
- Instructions at the bottom

Try resizing your browser window — the canvas adjusts automatically!

## What We Built

✅ Full-screen HTML5 Canvas  
✅ A smooth 60fps game loop  
✅ Responsive text rendering  
✅ Window resize handling

We've laid the foundation for our game. The red screen is already visible, setting up the anticipation for when it turns green!

## Challenge

Try these on your own:

1. Change the red color to something else (try `#0066cc`)
2. Add a round counter at the top: "Round 1/5"
3. Make the font size responsive: `Math.min(48, width * 0.06) + 'px'`

## Next Step

Continue to [Step 2: Game State & Click Events](./step-2.md) where we'll make the screen turn green and capture reaction times! →
