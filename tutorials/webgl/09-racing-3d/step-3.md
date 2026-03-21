# Step 3: Chase Camera, Laps & Positions

**Goal:** Implement a third-person chase camera, lap counting, position ranking, a countdown start, and game-over detection.

**Time:** ~15 minutes

---

## What You'll Build

- A **chase camera** that follows behind the player car, looking ahead
- A **countdown phase** (3-2-1-GO) before racing starts
- **Lap counting** with `TOTAL_LAPS = 3` to win
- **Position ranking** sorting all cars by laps and waypoint progress
- **Game-over** state with restart capability

---

## Concepts

- **Chase camera**: The camera sits a fixed distance behind the player along the car's backward direction, elevated above. The look target is a point ahead of the car. This creates the classic third-person racing view.

- **Position ranking**: All cars (player + AI) are sorted by laps descending, then by waypoint index descending. This gives a correct race position at any moment — the car that's furthest around the track is in first place.

- **Countdown state machine**: The game starts in `"countdown"` phase with a 3-second timer. During countdown, no input is processed. When the timer reaches 0, the phase transitions to `"racing"`.

---

## Code

### 3.1 — Chase Camera

**File:** `src/contexts/webgl/games/racing-3d/Racing3DEngine.ts`

```typescript
// In render():
const camDist = 8;
const camHeight = 4;
const camX = s.player.x - Math.cos(s.player.angle) * camDist;
const camZ = s.player.z - Math.sin(s.player.angle) * camDist;
const lookX = s.player.x + Math.cos(s.player.angle) * 5;
const lookZ = s.player.z + Math.sin(s.player.angle) * 5;

Mat4.lookAt(
    this.viewMatrix,
    [camX, camHeight, camZ],
    [lookX, 0.5, lookZ],
    [0, 1, 0],
);
```

**What's happening:**
- The camera position is `camDist` (8 units) behind the player: `player.pos - facing * 8`. At `camHeight = 4`, it provides a good overhead view.
- The look target is 5 units ahead of the player: `player.pos + facing * 5`, at `y = 0.5` (slightly above ground level). This makes the camera look "over" the car and down the road.
- When the player turns, the camera swings around naturally because both its position and look target are derived from `player.angle`.
- No smoothing is applied here — the camera snaps to position. For a more cinematic feel, you could lerp the camera position between frames.

---

### 3.2 — Countdown Phase

```typescript
private createState(): Racing3DState {
    // ... car setup ...
    return {
        player,
        aiCars,
        phase: "countdown",
        countdown: 3,
        raceTime: 0,
        positions: [player, ...aiCars],
    };
}

private update(dt: number): void {
    const s = this.state;

    if (s.phase === "countdown") {
        s.countdown -= dt;
        if (s.countdown <= 0) {
            s.phase = "racing";
        }
        return; // No car updates during countdown
    }

    if (s.phase !== "racing") return;
    // ... racing update ...
}
```

**What's happening:**
- State starts with `phase: "countdown"` and `countdown: 3`.
- Each frame, `countdown` decreases by `dt`. When it reaches 0, phase becomes `"racing"`.
- The `return` statement after the countdown block prevents any car movement or input processing during the countdown.
- AI cars also don't move during countdown because `updateCar` and `updateAI` are only called during `"racing"` phase.

---

### 3.3 — Position Ranking

```typescript
// In update(), after moving all cars:
const all = [s.player, ...s.aiCars];

all.sort((a, b) => {
    if (b.laps !== a.laps) return b.laps - a.laps;
    return b.waypointIdx - a.waypointIdx;
});

s.positions = all;
```

**What's happening:**
- All 4 cars go into one array and are sorted.
- **Primary sort**: laps descending — a car with 2 laps is ahead of one with 1 lap.
- **Secondary sort**: waypoint index descending — among cars on the same lap, the one further around the track (higher waypoint index) ranks higher.
- `s.positions` is the sorted array — `positions[0]` is the leader, and `positions.indexOf(s.player) + 1` gives the player's race position.
- This runs every frame, so positions update in real-time as cars pass each other.

---

### 3.4 — Win Detection and Restart

```typescript
// In update():
if (s.player.laps >= TOTAL_LAPS) {
    s.player.finished = true;
    s.phase = "finished";
}

// In constructor, keydown handler:
if (
    (e.code === "Space" || e.code === "Enter") &&
    this.state.phase === "finished"
) {
    this.state = this.createState();
}
```

**What's happening:**
- When the player completes `TOTAL_LAPS` (3) laps, the game ends with `phase: "finished"`.
- Pressing Space or Enter during the finished phase calls `createState()` to reset everything — fresh cars at the start position, countdown timer, zero laps.
- AI cars don't have their own win condition — the game ends when the player finishes. In a full game, you'd track all car finishes for final standings.

---

### 3.5 — Fog Density Per Frame

```typescript
// In render():
gl.uniform1f(this.uFogDensity, 0.008);
```

**What's happening:**
- `uFogDensity = 0.008` is uploaded once per frame. The fragment shader uses it as `exp(-dist * 0.008)`.
- At distance 50, fog is about 33%. At distance 100, fog is about 55%. At distance 200, fog is about 80%.
- Matching `fogColor` in the shader (`vec3(0.6, 0.75, 0.85)`) to `gl.clearColor(0.6, 0.75, 0.85, 1.0)` ensures objects fade seamlessly into the sky.
- You could make fog density dynamic — thicker fog for rain, thinner for clear weather.

---

## Test It

```bash
pnpm dev
```

1. Select "Racing 3D" from the 3D category
2. Wait for the **3-second countdown** to finish
3. Accelerate and race around the track — the **camera follows behind** your car
4. Complete **3 laps** to win the race
5. Watch the AI cars — they should be competitive but beatable
6. Notice how distant track segments **fade into fog**
7. At the finish, press **Space** to restart with a new race

---

## Challenges

**Easy:**
- Change `TOTAL_LAPS` from 3 to 1 for a quick sprint race.

**Medium:**
- Add camera smoothing: instead of snapping to position, lerp the camera position from its previous position: `camX = prevCamX + (targetCamX - prevCamX) * 0.1`.

**Hard:**
- Implement a minimap: in a corner of the screen, render the track from a top-down orthographic view with dots for each car. You'd need a second `lookAt` from above and a scissor rect.

---

## What You Learned

- A chase camera follows behind the car using `position - facing * distance` and looks ahead with `position + facing * lookAhead`
- Countdown phases prevent input and movement with an early `return` in the update loop
- Position ranking sorts by laps first, then waypoint progress second
- Exponential fog with matching fog/clear colors creates seamless atmospheric depth
- Game restart is as simple as calling `createState()` to reset all state

**Next:** Continue to Voxel Builder to learn about 3D grids and occlusion culling.

---
[← Previous Step](./step-2.md) | [Back to README](./README.md)
