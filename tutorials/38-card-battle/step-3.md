# Step 3: Combat System

**Goal:** Implement attack and defense resolution with damage calculation, block absorption, healing, special card effects, and health bar rendering.

**Time:** ~15 minutes

---

## What You'll Build

- **BattleSystem** that applies card effects: attack deals damage, defense grants block, heal restores HP, special cards have unique dual effects
- **Damage resolution** where block absorbs incoming damage before HP is reduced
- **HP bar rendering** for both the player and enemy combatant
- **Enemy and player display** with icons, names, HP bars, and block indicators
- **Win/lose detection** that checks if either combatant reaches 0 HP

---

## Concepts

- **Block Mechanics**: Block is a temporary shield that absorbs damage point-for-point. If you have 6 block and take 10 damage, the block absorbs 6 and your HP takes only 4. Block resets at the start of each turn, making it a tactical "this turn only" defense.
- **Damage Resolution Order**: When damage is dealt, we first subtract from block (clamping at 0), then apply remaining damage to HP (also clamping at 0). This two-step process is handled in `dealDamage()`.
- **Special Card Branching**: Special cards use their `id` to determine their unique effect. Power Surge (id 18) deals damage AND grants block. Drain Life (id 19) deals damage AND heals. Berserker (id 20) deals massive damage but hurts the player. This per-card branching is simpler than a full effect system for a 20-card game.
- **HP Bar Rendering**: A filled rectangle whose width is `barWidth * (hp / maxHp)`. The fill color indicates the owner (green for player, red for enemy). Text overlaid on the bar shows the exact HP fraction.

---

## Code

### 1. Create the Battle System

**File:** `src/games/card-battle/systems/BattleSystem.ts`

Handles card effect application, damage calculation, and battle-end detection.

```typescript
import type { CardBattleState, CardInstance } from '../types';

/** Handles card effects, damage calculation, and round progression */
export class BattleSystem {
  /** Apply a card's effect to the battle state */
  applyCard(state: CardBattleState, ci: CardInstance): void {
    const { card } = ci;

    state.player.energy -= card.cost;

    switch (card.type) {
      case 'attack': {
        this.dealDamage(state.enemy, card.value);
        break;
      }
      case 'defense': {
        state.player.block += card.value;
        break;
      }
      case 'heal': {
        state.player.hp = Math.min(
          state.player.maxHp,
          state.player.hp + card.value,
        );
        break;
      }
      case 'special': {
        if (card.id === 18) {
          // Power Surge: damage + block
          this.dealDamage(state.enemy, card.value);
          state.player.block += 4;
        } else if (card.id === 19) {
          // Drain Life: damage + heal
          this.dealDamage(state.enemy, card.value);
          state.player.hp = Math.min(state.player.maxHp, state.player.hp + 4);
        } else if (card.id === 20) {
          // Berserker: big damage, self damage
          this.dealDamage(state.enemy, card.value);
          state.player.hp -= 5;
        }
        break;
      }
    }
  }

  /** Deal damage considering block */
  private dealDamage(
    target: { hp: number; block: number },
    damage: number,
  ): void {
    if (target.block > 0) {
      const absorbed = Math.min(target.block, damage);
      target.block -= absorbed;
      damage -= absorbed;
    }

    target.hp -= damage;
    if (target.hp < 0) target.hp = 0;
  }

  /** Check if a card can be played */
  canPlayCard(state: CardBattleState, handIndex: number): boolean {
    if (handIndex < 0 || handIndex >= state.hand.length) return false;
    return state.hand[handIndex].card.cost <= state.player.energy;
  }

  /** Check for win/lose conditions */
  checkBattleEnd(state: CardBattleState): void {
    if (state.player.hp <= 0) {
      state.phase = 'lose';
      state.gameOver = true;
      state.message = 'Defeated! Click to try again.';
    } else if (state.enemy.hp <= 0) {
      if (state.round >= state.maxRounds) {
        state.phase = 'win';
        state.gameOver = true;
        state.message = 'Victory! You defeated all enemies!';
      } else {
        state.phase = 'round-win';
        state.message = `Round ${state.round} complete! Click to continue.`;
      }
    }
  }

  /** Set up the enemy for a given round */
  setupEnemy(state: CardBattleState): void {
    const round = state.round;
    const names = ['Goblin', 'Dark Knight', 'Dragon'];

    state.enemy = {
      name: names[Math.min(round - 1, names.length - 1)],
      hp: 30 + round * 20,
      maxHp: 30 + round * 20,
      energy: 0,
      maxEnergy: 0,
      block: 0,
    };
  }

  /** Update timers each frame */
  update(state: CardBattleState, dt: number): void {
    if (state.messageTimer > 0) {
      state.messageTimer -= dt;
      if (state.messageTimer <= 0) {
        state.message = '';
      }
    }
  }
}
```

**What's happening:**
- `applyCard()` uses a `switch` on `card.type` to dispatch the effect. Energy is deducted first, then the card effect fires. Attack calls `dealDamage()` on the enemy, defense adds to player block, heal adds to player HP (capped at `maxHp`).
- `dealDamage()` is the core damage engine. It first checks if the target has block: `absorbed = Math.min(block, damage)` ensures we never absorb more than the incoming damage or more than the remaining block. The leftover damage hits HP.
- `checkBattleEnd()` runs after every card play. If the enemy's HP hits 0, we check if this is the final round (win) or an intermediate round (round-win). If the player's HP hits 0, the game is over.
- `setupEnemy()` creates progressively harder enemies: Goblin (50 HP), Dark Knight (70 HP), Dragon (90 HP). The formula `30 + round * 20` scales linearly.
- `update()` ticks down the message timer so status messages auto-dismiss after their duration.

---

### 2. Update the Battle Renderer with Combatant Display

**File:** `src/games/card-battle/renderers/BattleRenderer.ts`

Add enemy rendering, player rendering, HP bars, block indicators, and game-over overlays. Add these methods to the existing class and call them from `render()`:

```typescript
import type { CardBattleState, CardInstance } from '../types';

export class BattleRenderer {
  render(ctx: CanvasRenderingContext2D, state: CardBattleState): void {
    const W = state.canvasWidth;
    const H = state.canvasHeight;

    // Background
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, W, H);

    // Battle area divider
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.moveTo(0, H / 2);
    ctx.lineTo(W, H / 2);
    ctx.stroke();
    ctx.setLineDash([]);

    this.renderEnemy(ctx, state);
    this.renderPlayer(ctx, state);
    this.renderCardHand(ctx, state);
    this.renderPlayedCards(ctx, state);
    this.renderOverlays(ctx, state);
  }

  private renderEnemy(ctx: CanvasRenderingContext2D, state: CardBattleState): void {
    const W = state.canvasWidth;
    const enemy = state.enemy;
    const cx = W / 2;
    const cy = 100;

    // Enemy icon (changes per round)
    const icons = ['👺', '🗡️', '🐉'];
    const icon = icons[Math.min(state.round - 1, icons.length - 1)];

    ctx.font = '48px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(icon, cx, cy);

    // Enemy name
    ctx.font = 'bold 16px monospace';
    ctx.fillStyle = '#e74c3c';
    ctx.fillText(enemy.name, cx, cy + 45);

    // HP bar
    this.renderHPBar(ctx, cx - 80, cy + 60, 160, 16, enemy.hp, enemy.maxHp, '#e74c3c');

    // Block indicator
    if (enemy.block > 0) {
      ctx.font = '14px monospace';
      ctx.fillStyle = '#3498db';
      ctx.textAlign = 'center';
      ctx.fillText(`🛡️ ${enemy.block}`, cx, cy + 90);
    }
  }

  private renderPlayer(ctx: CanvasRenderingContext2D, state: CardBattleState): void {
    const W = state.canvasWidth;
    const H = state.canvasHeight;
    const player = state.player;
    const cx = W / 2;
    const cy = H / 2 + 40;

    // Player icon
    ctx.font = '36px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🧙', cx, cy);

    // Player name
    ctx.font = 'bold 14px monospace';
    ctx.fillStyle = '#2ecc71';
    ctx.fillText(player.name, cx, cy + 30);

    // HP bar
    this.renderHPBar(ctx, cx - 80, cy + 42, 160, 14, player.hp, player.maxHp, '#2ecc71');

    // Block indicator
    if (player.block > 0) {
      ctx.font = '13px monospace';
      ctx.fillStyle = '#3498db';
      ctx.textAlign = 'center';
      ctx.fillText(`🛡️ ${player.block}`, cx, cy + 68);
    }
  }

  private renderHPBar(
    ctx: CanvasRenderingContext2D,
    x: number, y: number, w: number, h: number,
    hp: number, maxHp: number, color: string,
  ): void {
    // Background
    ctx.fillStyle = '#333';
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 4);
    ctx.fill();

    // Fill
    const ratio = Math.max(0, hp / maxHp);
    if (ratio > 0) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(x, y, w * ratio, h, 4);
      ctx.fill();
    }

    // Text
    ctx.font = `bold ${h - 2}px monospace`;
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${hp}/${maxHp}`, x + w / 2, y + h / 2 + 1);
  }

  private renderCardHand(ctx: CanvasRenderingContext2D, state: CardBattleState): void {
    const W = state.canvasWidth;
    const H = state.canvasHeight;
    const hand = state.hand;
    const cardW = 100;
    const cardH = 140;
    const handY = H - cardH - 30;

    if (hand.length === 0) return;

    const totalW = Math.min(hand.length * (cardW + 10), W * 0.7);
    const spacing = hand.length > 1 ? totalW / (hand.length - 1) : 0;
    const startX = (W - totalW) / 2 - cardW / 2;

    for (let i = 0; i < hand.length; i++) {
      const cx = hand.length === 1 ? (W - cardW) / 2 : startX + i * spacing;
      const canPlay = hand[i].card.cost <= state.player.energy && state.phase === 'player';
      this.renderCard(ctx, hand[i], cx, handY, cardW, cardH, canPlay, i === state.selectedCardIndex);
    }
  }

  renderCard(
    ctx: CanvasRenderingContext2D, ci: CardInstance,
    x: number, y: number, w: number, h: number,
    canPlay: boolean, selected: boolean,
  ): void {
    const card = ci.card;
    const typeColors: Record<string, string> = {
      attack: '#c0392b', defense: '#2980b9', heal: '#27ae60', special: '#8e44ad',
    };

    ctx.save();
    ctx.shadowColor = selected ? '#f1c40f' : 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = selected ? 15 : 6;
    ctx.shadowOffsetY = 3;
    ctx.fillStyle = canPlay ? (typeColors[card.type] || '#555') : '#444';
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 8);
    ctx.fill();
    ctx.restore();

    ctx.strokeStyle = selected ? '#f1c40f' : canPlay ? '#fff' : '#666';
    ctx.lineWidth = selected ? 3 : 1;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 8);
    ctx.stroke();

    ctx.fillStyle = '#1a1a2e';
    ctx.beginPath();
    ctx.arc(x + 16, y + 16, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f1c40f';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${card.cost}`, x + 16, y + 16);

    ctx.font = '28px serif';
    ctx.textAlign = 'center';
    ctx.fillText(card.icon, x + w / 2, y + 48);

    ctx.font = 'bold 11px monospace';
    ctx.fillStyle = '#fff';
    ctx.fillText(card.name, x + w / 2, y + 78);

    ctx.font = '9px monospace';
    ctx.fillStyle = '#ddd';
    ctx.fillText(card.description, x + w / 2, y + 98);

    ctx.font = 'bold 18px monospace';
    ctx.fillStyle = '#fff';
    ctx.fillText(`${card.value}`, x + w / 2, y + h - 22);

    if (!canPlay) {
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, 8);
      ctx.fill();
    }
  }

  private renderPlayedCards(ctx: CanvasRenderingContext2D, state: CardBattleState): void {
    const W = state.canvasWidth;
    const H = state.canvasHeight;
    const played = state.playedCards;
    if (played.length === 0) return;

    const miniW = 50;
    const miniH = 70;
    const baseY = H / 2 - miniH - 20;
    const totalW = played.length * (miniW + 5);
    const startX = (W - totalW) / 2;

    ctx.font = '10px monospace';
    ctx.fillStyle = '#888';
    ctx.textAlign = 'center';
    ctx.fillText('Played', W / 2, baseY - 8);

    for (let i = 0; i < played.length; i++) {
      const c = played[i].card;
      const x = startX + i * (miniW + 5);

      ctx.fillStyle = '#2a2a3e';
      ctx.beginPath();
      ctx.roundRect(x, baseY, miniW, miniH, 4);
      ctx.fill();
      ctx.strokeStyle = '#555';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(x, baseY, miniW, miniH, 4);
      ctx.stroke();
      ctx.font = '18px serif';
      ctx.textAlign = 'center';
      ctx.fillText(c.icon, x + miniW / 2, baseY + 28);
      ctx.font = '8px monospace';
      ctx.fillStyle = '#aaa';
      ctx.fillText(c.name, x + miniW / 2, baseY + 52);
    }
  }

  private renderOverlays(ctx: CanvasRenderingContext2D, state: CardBattleState): void {
    if (!state.gameOver && state.phase !== 'round-win') return;

    const W = state.canvasWidth;
    const H = state.canvasHeight;

    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, W, H);

    ctx.font = 'bold 32px monospace';
    ctx.fillStyle = state.phase === 'win' ? '#f1c40f'
      : state.phase === 'round-win' ? '#2ecc71'
      : '#e74c3c';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const title = state.phase === 'win' ? 'VICTORY!'
      : state.phase === 'round-win' ? 'ROUND CLEAR!'
      : 'DEFEATED';

    ctx.fillText(title, W / 2, H / 2 - 30);

    ctx.font = '16px monospace';
    ctx.fillStyle = '#ccc';
    ctx.fillText(state.message, W / 2, H / 2 + 20);
  }
}
```

**What's happening:**
- `renderEnemy()` draws the enemy in the top half: a large emoji icon (which changes per round -- goblin, knight, dragon), the enemy name in red, an HP bar, and a block indicator if block is active.
- `renderPlayer()` draws the player in the lower-middle area with a wizard emoji, green name, HP bar, and block indicator.
- `renderHPBar()` is a reusable method: it draws a dark background bar, fills it proportionally with color based on `hp/maxHp`, and overlays white text showing the exact HP fraction.
- `renderOverlays()` displays a semi-transparent dark overlay with a large title ("VICTORY!", "ROUND CLEAR!", or "DEFEATED") and a subtitle message when the battle ends.

---

### 3. Update the Engine with Combat Logic

**File:** `src/games/card-battle/CardBattleEngine.ts`

Wire the `BattleSystem` into card play so cards actually deal damage and apply effects.

```typescript
import type { CardBattleState } from './types';
import { CARD_DEFINITIONS } from './data/cards';
import { BattleRenderer } from './renderers/BattleRenderer';
import { BattleSystem } from './systems/BattleSystem';
import { InputSystem } from './systems/InputSystem';

export class CardBattleEngine {
  private ctx: CanvasRenderingContext2D;
  private state: CardBattleState;
  private running = false;
  private rafId = 0;
  private lastTime = 0;
  private battleRenderer: BattleRenderer;
  private battleSystem: BattleSystem;
  private inputSystem: InputSystem;
  private resizeHandler: () => void;

  constructor(canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    this.state = this.createInitialState(canvas.width, canvas.height);
    this.battleRenderer = new BattleRenderer();
    this.battleSystem = new BattleSystem();

    // Setup enemy and load sample hand
    this.battleSystem.setupEnemy(this.state);
    this.loadSampleHand();

    this.inputSystem = new InputSystem(canvas, this.state, {
      onPlayCard: (i) => this.handlePlayCard(i),
      onEndTurn: () => {},
      onContinue: () => {},
      onRestart: () => this.handleRestart(),
      onExit: () => {},
      onToggleHelp: () => {},
    });

    this.inputSystem.attach();

    this.resizeHandler = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      this.state.canvasWidth = canvas.width;
      this.state.canvasHeight = canvas.height;
    };
    window.addEventListener('resize', this.resizeHandler);
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
    window.removeEventListener('resize', this.resizeHandler);
  }

  private createInitialState(w: number, h: number): CardBattleState {
    return {
      player: { name: 'Hero', hp: 60, maxHp: 60, energy: 3, maxEnergy: 3, block: 0 },
      enemy: { name: 'Goblin', hp: 50, maxHp: 50, energy: 0, maxEnergy: 0, block: 0 },
      deck: [],
      hand: [],
      discard: [],
      playedCards: [],
      enemyPlayedCard: null,
      phase: 'player',
      turn: 1,
      round: 1,
      maxRounds: 3,
      selectedCardIndex: -1,
      message: '',
      messageTimer: 0,
      animTimer: 0,
      gameOver: false,
      canvasWidth: w,
      canvasHeight: h,
      nextUid: 1,
      helpVisible: false,
    };
  }

  private loadSampleHand(): void {
    const samples = CARD_DEFINITIONS.slice(0, 5);
    for (const card of samples) {
      this.state.hand.push({ uid: this.state.nextUid++, card });
    }
  }

  private handlePlayCard(index: number): void {
    if (this.state.phase !== 'player') return;

    if (!this.battleSystem.canPlayCard(this.state, index)) {
      this.showMessage('Not enough energy!', 1200);
      return;
    }

    const ci = this.state.hand[index];

    // Move card from hand to played area
    this.state.hand.splice(index, 1);
    this.state.playedCards.push(ci);

    // Apply the card's combat effect
    this.battleSystem.applyCard(this.state, ci);
    this.showMessage(`Played ${ci.card.name}!`, 800);

    // Check if enemy defeated
    this.battleSystem.checkBattleEnd(this.state);
  }

  private handleRestart(): void {
    const w = this.state.canvasWidth;
    const h = this.state.canvasHeight;
    Object.assign(this.state, this.createInitialState(w, h));
    this.battleSystem.setupEnemy(this.state);
    this.loadSampleHand();
  }

  private showMessage(msg: string, durationMs: number): void {
    this.state.message = msg;
    this.state.messageTimer = durationMs;
  }

  private loop(): void {
    if (!this.running) return;
    const now = performance.now();
    const dt = now - this.lastTime;
    this.lastTime = now;
    this.battleSystem.update(this.state, dt);
    this.render();
    this.rafId = requestAnimationFrame(() => this.loop());
  }

  private render(): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.state.canvasWidth, this.state.canvasHeight);
    this.battleRenderer.render(ctx, this.state);
  }
}
```

**What's happening:**
- `handlePlayCard()` now calls `battleSystem.applyCard()` after moving the card, so attack cards actually reduce the enemy's HP and defense cards add block to the player.
- `battleSystem.canPlayCard()` is used for validation instead of inline checks, centralizing the energy-check logic.
- `checkBattleEnd()` runs after every card play. If the enemy's HP drops to 0, the overlay appears showing "ROUND CLEAR!" or "VICTORY!".
- The game loop now tracks `lastTime` and passes `dt` (delta time in milliseconds) to `battleSystem.update()`, which ticks down the message timer so feedback messages auto-dismiss.
- `handleRestart()` resets the entire state and re-sets up the enemy. The `Object.assign()` pattern preserves the state reference so the input system does not need to be re-created.

---

## Test It

1. **Run:** `npm run dev`
2. **Open:** the Card Battle game in your browser
3. **Observe:**
   - The **enemy** (Goblin) appears in the top half with a red HP bar showing **50/50**
   - The **player** (Hero) appears in the lower-middle with a green HP bar showing **60/60**
   - **Click an attack card** (red) and watch the enemy's HP bar shrink
   - **Click a defense card** (blue) and see block appear under the player icon as a shield number
   - **Click a heal card** (green) -- nothing visible happens if already at full HP, but damage yourself with Berserker first to test healing
   - Keep attacking until the enemy's HP reaches **0** -- the "ROUND CLEAR!" overlay appears
   - The feedback message briefly shows which card was played

---

## Challenges

**Easy:**
- Change the HP bar colors: make player HP blue and enemy HP orange instead of the current green/red.

**Medium:**
- Add a damage number animation: when damage is dealt, briefly display the number floating upward from the target's position.

**Hard:**
- Implement a "critical hit" system: 10% chance for attack cards to deal double damage, with a special "CRIT!" text displayed.

---

## What You Learned

- Implementing a block-before-HP damage resolution system
- Branching card effects by type with a switch statement, plus per-card logic for specials
- Rendering HP bars with proportional fill and overlaid text
- Detecting win/lose conditions and showing game-over overlays
- Passing delta time through the game loop for timer-based message dismissal

**Next:** Energy and draw phase -- add a proper turn structure with energy refresh, card drawing, and an end-turn button!
