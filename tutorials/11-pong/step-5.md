# Step 5: AI Opponent & Polish

**Goal:** Implement a competitive AI opponent with realistic behavior and add final polish.

**Time:** ~25 minutes

---

## What You'll Build

AI features:
- **Smooth tracking**: AI follows ball with easing
- **Reaction delay**: Simulates human reaction time
- **Imperfection**: Random error offset for exploitability
- **Difficulty**: Balanced to be challenging but beatable
- **Mode awareness**: Only active in 'ai' mode

---

## Concepts

- **Low-Pass Filter**: Smooth movement with lag
- **Reaction Speed**: Constant that adds latency
- **Random Offset**: Refreshing error for human-like behavior
- **Target Position**: Predicted ball location
- **Clamped Velocity**: Bounded speed limits

---

## Code

### 1. Create AI System

**File:** `src/games/pong/systems/AISystem.ts`

```typescript
import type { PongState } from '../types';
import { PADDLE_SPEED } from '../types';

export class AISystem {
  private targetOffset: number = 0;
  private offsetTimer: number = 0;
  private readonly REACTION_SPEED = 0.07; // Lower = faster reaction
  private readonly OFFSET_REFRESH_RATE = 500; // ms

  update(state: PongState, dt: number): void {
    // Only run in AI mode during gameplay
    if (state.mode !== 'ai' || state.phase !== 'playing') return;

    // Update random offset periodically
    this.offsetTimer += dt;
    if (this.offsetTimer >= this.OFFSET_REFRESH_RATE) {
      this.offsetTimer = 0;
      this.refreshOffset(state);
    }

    // Track ball with imperfection
    this.trackBall(state, dt);
  }

  private refreshOffset(state: PongState): void {
    const { rightPaddle } = state;

    // Random offset ±35% of paddle height
    const maxOffset = rightPaddle.h * 0.35;
    this.targetOffset = (Math.random() - 0.5) * 2 * maxOffset;
  }

  private trackBall(state: PongState, dt: number): void {
    const { ball, rightPaddle } = state;

    // Calculate paddle center
    const paddleCenterY = rightPaddle.y + rightPaddle.h / 2;

    // Target is ball Y position + random error
    const targetY = ball.y + this.targetOffset;

    // Calculate difference
    const diff = targetY - paddleCenterY;

    // Smooth easing with reaction delay (low-pass filter)
    const dtSec = dt / 1000;
    const desiredDy = diff / (dtSec + this.REACTION_SPEED);

    // Clamp to max paddle speed
    rightPaddle.dy = Math.max(-PADDLE_SPEED, Math.min(PADDLE_SPEED, desiredDy));
  }
}
```

**AI Algorithm Breakdown:**

1. **Target Calculation**: `targetY = ball.y + randomOffset`
   - Aims at ball's current position (not ahead)
   - Adds ±35% paddle height error for imperfection

2. **Difference**: `diff = target - paddleCenter`
   - How far paddle needs to move

3. **Low-Pass Filter**: `desiredDy = diff / (dt + 0.07)`
   - Adds lag/smoothing (simulates reaction time)
   - Higher constant = slower reaction

4. **Velocity Clamp**: Limit to PADDLE_SPEED (420 px/s)

5. **Offset Refresh**: Every 500ms, generate new random error
   - Creates exploit windows
   - Prevents perfect tracking

---

### 2. Update Game Engine

**File:** `src/games/pong/PongEngine.ts`

Add AI system:

```typescript
import { AISystem } from './systems/AISystem';

// Add field:
private aiSystem: AISystem;

// In constructor:
this.aiSystem = new AISystem();

// Update the update method:
private update(dt: number): void {
  this.inputSystem.handlePhaseInput(this.state);
  this.inputSystem.applyInput(this.state);
  this.aiSystem.update(this.state, dt); // Add AI
  this.physicsSystem.update(this.state, dt);
  this.scoreSystem.update(this.state);
}
```

---

### 3. Add Game Help/Info

**File:** `src/games/pong/index.ts`

Complete game definition with full help:

```typescript
import type { GameDefinition } from '@shared/GameInterface';
import { PlatformAdapter } from './adapters/PlatformAdapter';

export const PongGame: GameDefinition = {
  id: 'pong',
  name: 'Pong',
  description: 'Classic arcade tennis - first to 11 wins',
  genre: 'Sports',
  difficulty: 'Easy',
  controls: ['keyboard'],
  HelpComponent: () => {
    return `
🎮 CONTROLS
━━━━━━━━━━━━━━━━━━━━
1/2: Select mode (AI vs 2-Player)
SPACE/ENTER: Start game
W/S: Move left paddle up/down
↑/↓: Move right paddle (2P mode)
P: Pause/Resume
M: Return to mode select (after game)
ESC: Exit to menu

🎯 OBJECTIVE
━━━━━━━━━━━━━━━━━━━━
• First player to 11 points wins
• Score by getting ball past opponent
• Ball speeds up with each paddle hit
• Hit edges of paddle for sharp angles
• Hit center of paddle for straight shots

💡 TIPS
━━━━━━━━━━━━━━━━━━━━
• Position paddle to deflect at angles
• Longer rallies = faster ball
• AI has reaction delay - exploit it!
• Aim for corners to catch opponent off-guard
• Use sharp angles to create unreturnable shots

🏆 SCORING
━━━━━━━━━━━━━━━━━━━━
• Ball exits left → right player scores
• Ball exits right → left player scores
• Ball resets after each point
• First to 11 wins the match

⚙️ PHYSICS
━━━━━━━━━━━━━━━━━━━━
• Hit position determines bounce angle
• Top of paddle → upward angle (60° max)
• Center of paddle → straight
• Bottom of paddle → downward angle
• Speed increases +20 px/s per hit (max 800)
    `.trim();
  },
  instanceFactory: (canvas, onExit) => new PlatformAdapter(canvas, onExit),
};
```

---

### 4. Optional: Add Help Overlay System

**File:** `src/games/pong/systems/InputSystem.ts`

Add help toggle (optional enhancement):

```typescript
private handleKeyDown(e: KeyboardEvent): void {
  const key = e.key.toLowerCase();
  this.pressedKeys.add(key);

  // Prevent default for game keys
  if (['w', 's', 'arrowup', 'arrowdown', ' ', 'p', '1', '2', 'm', 'h'].includes(key)) {
    e.preventDefault();
  }
}

handlePhaseInput(state: PongState): void {
  // Toggle help (any phase)
  if (this.pressedKeys.has('h')) {
    state.showHelp = !state.showHelp;
    this.pressedKeys.delete('h');
  }

  // ... rest of code
}
```

Add help overlay to HUDRenderer:

```typescript
render(ctx: CanvasRenderingContext2D, state: PongState): void {
  if (state.phase === 'mode-select') {
    this.drawModeSelect(ctx, state);
  } else if (state.phase === 'start') {
    this.drawStartScreen(ctx, state);
  } else if (state.phase === 'paused') {
    this.drawPausedScreen(ctx, state);
  } else if (state.phase === 'win') {
    this.drawWinScreen(ctx, state);
  } else if (state.phase === 'playing') {
    this.drawScores(ctx, state);
  }

  // Help overlay (over any screen)
  if (state.showHelp) {
    this.drawHelpOverlay(ctx, state);
  }
}

private drawHelpOverlay(ctx: CanvasRenderingContext2D, state: PongState): void {
  const { canvasW, canvasH } = state;

  this.dimBackground(ctx, canvasW, canvasH);

  ctx.fillStyle = '#26c6da';
  ctx.font = 'bold 32px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('CONTROLS', canvasW / 2, 60);

  ctx.font = '18px monospace';
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'left';

  const startX = canvasW / 2 - 200;
  let y = 120;

  const helpLines = [
    'W/S - Move left paddle',
    '↑/↓ - Move right paddle (2P)',
    'P - Pause/Resume',
    'M - Mode select',
    'H - Toggle help',
    'ESC - Exit',
    '',
    'First to 11 wins!',
    'Ball speeds up each hit',
  ];

  for (const line of helpLines) {
    ctx.fillText(line, startX, y);
    y += 28;
  }

  ctx.font = '16px sans-serif';
  ctx.fillStyle = '#aaa';
  ctx.textAlign = 'center';
  ctx.fillText('Press H to close', canvasW / 2, canvasH - 60);
}
```

---

## Test It

1. **Run:** `npm run dev`
2. **Navigate:** Select "Pong"
3. **Mode Select:**
   - Press **1** for AI mode
4. **AI Behavior:**
   - Start game
   - Watch right paddle track ball automatically
   - AI makes occasional mistakes (offset error)
   - Try different serve angles
5. **Exploit AI:**
   - Send fast shots to corners
   - Change direction quickly during rallies
   - Aim for edges when AI is recovering
6. **2-Player Mode:**
   - Press **M** to return to mode select
   - Press **2** for 2-player
   - Control right paddle with arrow keys
7. **Help System (optional):**
   - Press **H** to view controls overlay
   - Press **H** again to close

---

## AI Difficulty Analysis

Current AI parameters:
- **Reaction Speed**: `0.07` (70ms lag)
- **Offset Range**: `±35%` of paddle height
- **Refresh Rate**: `500ms` (2× per second)

**Result**: Competitive but beatable

### Tuning AI Difficulty

**Make AI Harder:**
```typescript
private readonly REACTION_SPEED = 0.03; // Faster reaction
private readonly OFFSET_REFRESH_RATE = 800; // Refresh less often
```

**Make AI Easier:**
```typescript
private readonly REACTION_SPEED = 0.15; // Slower reaction
private readonly OFFSET_REFRESH_RATE = 300; // More frequent errors
```

---

## Congratulations! 🎉

You've built a complete Pong game with:
- ✅ Delta-time physics for smooth movement
- ✅ Angle-based paddle deflection (±60°)
- ✅ Speed progression (360 → 800 px/s)
- ✅ Wall collision detection
- ✅ Scoring system with win condition
- ✅ Complete game flow (mode select → start → play → win)
- ✅ Smooth AI opponent with imperfection
- ✅ 2-player local multiplayer
- ✅ Pause functionality
- ✅ Rally tracking
- ✅ Visual effects (glow, trail)
- ✅ Full state machine

---

## Next Challenges

**Easy:**
- Add sound effects (hit, score, win)
- Power-up system (larger paddle, slow ball)
- Different ball colors based on speed

**Medium:**
- Best of 3 matches mode
- Multiple difficulty levels (easy/normal/hard AI)
- Statistics tracking (avg rally, longest rally, accuracy)

**Hard:**
- Particle effects on paddle hit
- Screen shake on wall/paddle collision
- Curved ball trajectory (spin mechanics)
- Online multiplayer with WebSockets
- AI learning (tracks player patterns)
- 4-player "Pong Wars" (4 paddles, 4 goals)

---

## What You Learned Overall

✅ Delta-time physics (frame-rate independence)  
✅ AABB collision detection  
✅ Trigonometric deflection angles  
✅ Velocity vector manipulation  
✅ State machine design  
✅ Low-pass filtering for smooth AI  
✅ Input buffering with Set  
✅ Phase-based rendering  
✅ Boundary clamping  
✅ Speed progression mechanics  
✅ AI behavior with imperfection  
✅ Modal UI overlays

**Great job!** 🏓

---

## Code Architecture Summary

**Systems** (update state):
- InputSystem: User controls, phase transitions
- AISystem: Opponent behavior
- PhysicsSystem: Movement, collision, bouncing
- ScoreSystem: Point detection, win condition

**Renderers** (display state):
- GameRenderer: Court, paddles, ball, trail
- HUDRenderer: Scores, overlays, menus

**Pattern**: Single state object → systems modify → renderers display

This clean separation makes debugging easy and enables future enhancements!
