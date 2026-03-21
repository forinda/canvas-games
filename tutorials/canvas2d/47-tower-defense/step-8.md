# Step 8: Lives, UI & Polish

**Goal:** Add a lives system so enemies reaching the exit cost lives, display a wave preview, show tower range on hover, and build a victory/defeat screen.

**Time:** ~15 minutes

---

## What You'll Build

- **Lives system** — enemies reaching the exit deduct lives instead of vanishing silently
- **Wave preview bar** — shows upcoming enemy types and counts before each wave
- **Tower range indicator** — semi-transparent circle when hovering over a tower
- **Victory & defeat screens** — win after surviving all waves, lose at 0 lives
- **Start wave button** — gives the player control over when each wave begins

---

## Concepts

- **Lives as Feedback**: Without lives, the player has no pressure. Each enemy that reaches the exit costs 1 life. The HUD displays remaining lives prominently so players feel the stakes.
- **Wave Preview**: Showing what's coming lets players plan their tower placement and upgrades. Display enemy icons and counts in a small bar above the "Start Wave" button.
- **Victory Conditions**: The game ends when either all waves are cleared (victory) or lives reach zero (defeat). Both should show a summary screen with stats.
- **Polish Layer**: Small details like range circles, tower hover highlights, and enemy health bars make the game feel complete. These visual touches take minutes to implement but dramatically improve the experience.

---

## Code

### 8.1 — Lives System

Add a lives counter to your game state and deduct when enemies reach the exit.

```typescript
// In your state/types
interface TowerDefenseState {
  // ... existing fields
  lives: number;
  maxLives: number;
  gameOver: boolean;
  victory: boolean;
}

// Initialize in createInitialState:
lives: 20,
maxLives: 20,
gameOver: false,
victory: false,
```

In the enemy update system, when an enemy reaches the final waypoint:

```typescript
// In EnemySystem or PhysicsSystem update:
if (enemy.waypointIndex >= waypoints.length) {
  state.lives -= 1;
  enemy.dead = true; // remove from the field

  if (state.lives <= 0) {
    state.lives = 0;
    state.gameOver = true;
    state.victory = false;
  }
}
```

**What's happening:**
- Each enemy that completes the path costs 1 life
- At 0 lives, `gameOver` triggers the defeat screen
- `maxLives` is stored separately so the HUD can show "15/20"

---

### 8.2 — Wave Preview

Show the player what enemies are coming in the next wave.

```typescript
// In HUDRenderer:
private renderWavePreview(
  ctx: CanvasRenderingContext2D,
  state: TowerDefenseState,
): void {
  if (state.phase !== "building") return;

  const nextWave = state.waves[state.currentWave];
  if (!nextWave) return;

  const previewY = state.canvasH - 60;
  const startX = state.canvasW / 2 - 100;

  ctx.font = "bold 11px monospace";
  ctx.fillStyle = "#aaa";
  ctx.textAlign = "center";
  ctx.fillText(
    `Wave ${state.currentWave + 1} Preview:`,
    state.canvasW / 2,
    previewY - 10,
  );

  // Draw enemy type icons with counts
  let x = startX;
  for (const group of nextWave.groups) {
    ctx.fillStyle = group.color;
    ctx.beginPath();
    ctx.arc(x, previewY + 12, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#fff";
    ctx.font = "9px monospace";
    ctx.fillText(`x${group.count}`, x, previewY + 30);
    x += 50;
  }
}
```

---

### 8.3 — Tower Range Indicator

Show the range circle when hovering over a placed tower.

```typescript
// In the render method, after drawing towers:
if (state.hoveredTower) {
  const tower = state.hoveredTower;

  ctx.beginPath();
  ctx.arc(tower.x, tower.y, tower.range, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(100, 200, 255, 0.08)";
  ctx.fill();
  ctx.strokeStyle = "rgba(100, 200, 255, 0.25)";
  ctx.lineWidth = 1;
  ctx.stroke();
}
```

Add hover detection in the input system:

```typescript
private handleMouseMove(e: MouseEvent): void {
  const { x, y } = this.getCoords(e);

  // Check if hovering over a placed tower
  state.hoveredTower = null;
  for (const tower of state.towers) {
    const dx = x - tower.x;
    const dy = y - tower.y;
    if (dx * dx + dy * dy < 400) { // 20px radius
      state.hoveredTower = tower;
      break;
    }
  }
}
```

---

### 8.4 — Victory & Defeat Screens

Render an overlay when the game ends.

```typescript
private renderEndScreen(
  ctx: CanvasRenderingContext2D,
  state: TowerDefenseState,
): void {
  if (!state.gameOver) return;

  const W = state.canvasW;
  const H = state.canvasH;

  // Dim background
  ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
  ctx.fillRect(0, 0, W, H);

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  if (state.victory) {
    ctx.font = "bold 36px monospace";
    ctx.fillStyle = "#4ade80";
    ctx.fillText("VICTORY!", W / 2, H / 2 - 40);

    ctx.font = "14px monospace";
    ctx.fillStyle = "#aaa";
    ctx.fillText(
      `Waves survived: ${state.currentWave}  |  Lives remaining: ${state.lives}`,
      W / 2,
      H / 2 + 10,
    );
  } else {
    ctx.font = "bold 36px monospace";
    ctx.fillStyle = "#ef4444";
    ctx.fillText("DEFEATED", W / 2, H / 2 - 40);

    ctx.font = "14px monospace";
    ctx.fillStyle = "#aaa";
    ctx.fillText(
      `Survived to wave ${state.currentWave + 1}`,
      W / 2,
      H / 2 + 10,
    );
  }

  ctx.font = "12px monospace";
  ctx.fillStyle = "#666";
  ctx.fillText("Press R to restart  |  ESC to exit", W / 2, H / 2 + 50);
}
```

Check for victory when all waves are cleared:

```typescript
// In wave system update:
if (
  state.currentWave >= state.waves.length &&
  state.enemies.every((e) => e.dead)
) {
  state.gameOver = true;
  state.victory = true;
}
```

---

### 8.5 — Lives in the HUD

Update the HUD to show lives prominently:

```typescript
// In HUDRenderer:
// Lives display (top-left area)
ctx.font = "bold 14px monospace";
ctx.fillStyle = state.lives <= 5 ? "#ef4444" : "#4ade80";
ctx.textAlign = "left";
ctx.fillText(`Lives: ${state.lives}/${state.maxLives}`, 10, 20);

// Lives bar
const barW = 100;
const barH = 6;
const barX = 10;
const barY = 28;
const pct = state.lives / state.maxLives;

ctx.fillStyle = "#333";
ctx.fillRect(barX, barY, barW, barH);
ctx.fillStyle = pct > 0.5 ? "#4ade80" : pct > 0.25 ? "#f59e0b" : "#ef4444";
ctx.fillRect(barX, barY, barW * pct, barH);
```

---

## Test It

```bash
pnpm dev
```

1. Start a wave and let a few enemies through — lives should decrease
2. Hover over placed towers — range circles should appear
3. Check the wave preview before starting each wave
4. Let lives reach 0 — defeat screen should appear
5. Clear all waves — victory screen should appear
6. Press R to restart from the defeat/victory screen

---

## What We Built

In this final step we added the feedback and polish that turns a prototype into a complete game:

- **Lives system** gives the player something to protect
- **Wave preview** enables strategic tower placement
- **Range indicators** help players understand tower coverage
- **End screens** provide closure and replayability

---

## Challenges

**Easy:**
- Add a "fast forward" button that doubles game speed during waves

**Medium:**
- Show a floating "-1" text that rises when an enemy reaches the exit

**Hard:**
- Add a scoring system based on waves survived, towers built, and lives remaining

---

## What You Learned

- Implementing a lives/health system with visual feedback
- Creating wave preview UI for strategic planning
- Adding hover interactions for placed game objects
- Building victory and defeat state machines with summary screens
- Using color gradients on health bars to communicate urgency

**Congratulations!** You've built a complete Tower Defense game. Continue to [Fishing](../48-fishing/README.md) to learn cast-and-reel mechanics!

---
[← Step 7: Tower Upgrades](./step-7.md) | [Back to README](./README.md)
