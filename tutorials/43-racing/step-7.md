# Step 7: Mini-Map & Polish

**Goal:** Add a mini-map overlay showing all car positions, display race positions, and build a finish screen with results.

**Time:** ~15 minutes

---

## What You'll Build

- **Mini-map** in the corner showing the track outline and all car positions as colored dots
- **Position display** showing "1st", "2nd", "3rd" etc. based on lap progress and distance
- **Finish screen** with race results when the player completes all laps
- **Speed indicator** showing current speed as a visual bar
- **Countdown overlay** with "3, 2, 1, GO!" before the race starts

---

## Concepts

- **Mini-Map Rendering**: Scale the entire track down to fit in a small rectangle (e.g., 150x100px). Transform world coordinates to mini-map coordinates using `(worldX - minX) / trackWidth * miniMapWidth`. Draw each car as a colored dot.
- **Race Positions**: Sort all cars by laps completed (descending), then by checkpoint progress, then by distance to next checkpoint. The resulting order gives race positions.
- **Finish State Machine**: When the player crosses the finish line for the final lap, freeze the race time, show a results overlay, and allow restarting.
- **HUD Layering**: The mini-map and HUD render AFTER the game world but BEFORE overlays like the help screen. This keeps the information hierarchy clear.

---

## Code

### 7.1 — Mini-Map Renderer

Create a mini-map that renders the track outline and car positions.

```typescript
// In HUDRenderer or a new MiniMapRenderer:
private renderMiniMap(
  ctx: CanvasRenderingContext2D,
  state: RacingState,
): void {
  const mapW = 150;
  const mapH = 100;
  const mapX = state.canvasW - mapW - 10;
  const mapY = 10;
  const pad = 8;

  // Background
  ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
  ctx.beginPath();
  ctx.roundRect(mapX, mapY, mapW, mapH, 6);
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
  ctx.lineWidth = 1;
  ctx.stroke();

  // Calculate track bounds for scaling
  const waypoints = state.track.waypoints;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const wp of waypoints) {
    minX = Math.min(minX, wp.x);
    minY = Math.min(minY, wp.y);
    maxX = Math.max(maxX, wp.x);
    maxY = Math.max(maxY, wp.y);
  }

  const trackW = maxX - minX || 1;
  const trackH = maxY - minY || 1;
  const scaleX = (mapW - pad * 2) / trackW;
  const scaleY = (mapH - pad * 2) / trackH;
  const scale = Math.min(scaleX, scaleY);
  const offsetX = mapX + pad + ((mapW - pad * 2) - trackW * scale) / 2;
  const offsetY = mapY + pad + ((mapH - pad * 2) - trackH * scale) / 2;

  const toMapX = (wx: number) => offsetX + (wx - minX) * scale;
  const toMapY = (wy: number) => offsetY + (wy - minY) * scale;

  // Draw track path
  ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(toMapX(waypoints[0].x), toMapY(waypoints[0].y));
  for (let i = 1; i < waypoints.length; i++) {
    ctx.lineTo(toMapX(waypoints[i].x), toMapY(waypoints[i].y));
  }
  ctx.closePath();
  ctx.stroke();

  // Draw AI cars as dots
  for (const car of state.aiCars) {
    ctx.fillStyle = car.color;
    ctx.beginPath();
    ctx.arc(toMapX(car.x), toMapY(car.y), 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // Draw player as a larger dot
  ctx.fillStyle = state.player.color;
  ctx.beginPath();
  ctx.arc(toMapX(state.player.x), toMapY(state.player.y), 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 1;
  ctx.stroke();
}
```

**What's happening:**
- We compute the bounding box of all waypoints and scale them to fit the mini-map
- `toMapX`/`toMapY` transform world coordinates to mini-map pixel coordinates
- AI cars are small colored dots; the player is larger with a white border
- The track is drawn as a connected path outline

---

### 7.2 — Position Tracking

Sort all cars by race progress to determine positions.

```typescript
private updatePositions(state: RacingState): void {
  const allCars = [state.player, ...state.aiCars];

  // Sort by: laps (desc), then checkpoint (desc), then distance to next checkpoint (asc)
  allCars.sort((a, b) => {
    if (b.laps !== a.laps) return b.laps - a.laps;
    if (b.waypointIndex !== a.waypointIndex) return b.waypointIndex - a.waypointIndex;

    // Closer to next checkpoint = further ahead
    const nextA = state.track.waypoints[a.waypointIndex % state.track.waypoints.length];
    const nextB = state.track.waypoints[b.waypointIndex % state.track.waypoints.length];
    const distA = Math.hypot(a.x - nextA.x, a.y - nextA.y);
    const distB = Math.hypot(b.x - nextB.x, b.y - nextB.y);
    return distA - distB;
  });

  state.positions = allCars;
}
```

Display the position in the HUD:

```typescript
// Find player's position
const pos = state.positions.indexOf(state.player) + 1;
const suffix = pos === 1 ? "st" : pos === 2 ? "nd" : pos === 3 ? "rd" : "th";

ctx.font = "bold 28px monospace";
ctx.fillStyle = pos === 1 ? "#ffd700" : "#fff";
ctx.textAlign = "left";
ctx.fillText(`${pos}${suffix}`, 10, 40);
```

---

### 7.3 — Speed Indicator

Show current speed as a bar and number:

```typescript
private renderSpeedBar(
  ctx: CanvasRenderingContext2D,
  state: RacingState,
): void {
  const speed = Math.abs(state.player.speed);
  const maxSpeed = 300; // approximate max
  const pct = Math.min(speed / maxSpeed, 1);

  const barW = 120;
  const barH = 8;
  const x = 10;
  const y = state.canvasH - 30;

  // Background
  ctx.fillStyle = "#333";
  ctx.fillRect(x, y, barW, barH);

  // Speed fill
  ctx.fillStyle = pct > 0.8 ? "#ef4444" : pct > 0.5 ? "#f59e0b" : "#4ade80";
  ctx.fillRect(x, y, barW * pct, barH);

  // Speed text
  ctx.font = "10px monospace";
  ctx.fillStyle = "#aaa";
  ctx.textAlign = "left";
  ctx.fillText(`${Math.floor(speed)} km/h`, x, y - 4);
}
```

---

### 7.4 — Finish Screen

When the player finishes all laps, show results:

```typescript
private renderFinishScreen(
  ctx: CanvasRenderingContext2D,
  state: RacingState,
): void {
  if (state.phase !== "finished") return;

  const W = state.canvasW;
  const H = state.canvasH;

  // Dim background
  ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
  ctx.fillRect(0, 0, W, H);

  // Title
  const pos = state.positions.indexOf(state.player) + 1;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.font = "bold 32px monospace";
  ctx.fillStyle = pos === 1 ? "#ffd700" : "#fff";
  ctx.fillText(
    pos === 1 ? "YOU WIN!" : `FINISHED ${pos}${pos === 2 ? "nd" : pos === 3 ? "rd" : "th"}`,
    W / 2,
    H / 2 - 60,
  );

  // Race time
  ctx.font = "16px monospace";
  ctx.fillStyle = "#aaa";
  const mins = Math.floor(state.raceTime / 60);
  const secs = (state.raceTime % 60).toFixed(1);
  ctx.fillText(`Time: ${mins}:${secs.padStart(4, "0")}`, W / 2, H / 2 - 20);

  // Results table
  ctx.font = "12px monospace";
  let y = H / 2 + 20;
  for (let i = 0; i < state.positions.length; i++) {
    const car = state.positions[i];
    ctx.fillStyle = car.isPlayer ? "#ffd700" : car.color;
    ctx.fillText(
      `${i + 1}. ${car.name}${car.finished ? ` — ${car.finishTime.toFixed(1)}s` : " — DNF"}`,
      W / 2,
      y,
    );
    y += 18;
  }

  ctx.font = "11px monospace";
  ctx.fillStyle = "#555";
  ctx.fillText("Press SPACE to race again  |  ESC to exit", W / 2, H / 2 + 120);
}
```

---

### 7.5 — Countdown Display

Show the countdown before the race starts:

```typescript
private renderCountdown(
  ctx: CanvasRenderingContext2D,
  state: RacingState,
): void {
  if (state.phase !== "countdown") return;

  const W = state.canvasW;
  const H = state.canvasH;
  const count = Math.ceil(state.countdownTimer);
  const text = count > 0 ? String(count) : "GO!";

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "bold 64px monospace";
  ctx.fillStyle = count > 0 ? "#fff" : "#4ade80";

  // Pulse effect
  const scale = 1 + (state.countdownTimer % 1) * 0.2;
  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.scale(scale, scale);
  ctx.fillText(text, 0, 0);
  ctx.restore();
}
```

---

## Test It

```bash
pnpm dev
```

1. Launch Racing and watch the **3, 2, 1, GO!** countdown
2. Check the **mini-map** in the top-right — your dot should move as you drive
3. Watch your **position** update as you pass or get passed by AI cars
4. Check the **speed bar** — it should change color at high speeds
5. Complete 3 laps — the **finish screen** should show results with times
6. Press SPACE to race again

---

## Challenges

**Easy:**
- Change the mini-map position to bottom-left and make it larger (200x130)

**Medium:**
- Add best lap time tracking — highlight the fastest lap in the finish screen

**Hard:**
- Add a ghost car that shows your best lap path as a transparent silhouette

---

## What You Learned

- Transforming world coordinates to a mini-map with scale/offset math
- Sorting entities by multiple criteria for race position tracking
- Building speed indicators with color-coded progress bars
- Creating result screens with formatted time displays
- Adding countdown animations with pulse/scale effects

**Congratulations!** You've built a complete Racing game with AI opponents, physics, and a full HUD. Continue to [Zombie Survival](../44-zombie-survival/README.md) to learn wave-based survival mechanics!

---
[← Step 6: AI Opponents](./step-6.md) | [Back to README](./README.md)
