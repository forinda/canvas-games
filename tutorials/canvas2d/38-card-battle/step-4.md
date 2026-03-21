# Step 4: Energy & Draw Phase

**Goal:** Add a proper turn structure with energy refresh each turn, drawing new cards from a deck, an end-turn button, and a HUD displaying round/turn/energy information.

**Time:** ~15 minutes

---

## What You'll Build

- **DeckSystem** that manages the draw pile, hand, and discard pile with shuffle, draw, and reshuffle mechanics
- **Draw phase** that refills energy and draws 3 cards at the start of each player turn
- **End-turn button** that discards played and remaining hand cards, then starts the next turn
- **HUD renderer** showing round number, turn counter, phase label, energy pips, deck/discard counts, and status messages

---

## Concepts

- **Three-Pile Deck System**: Cards cycle through three piles: **deck** (draw pile, face down) -> **hand** (playable) -> **discard** (used). When the deck runs out, the discard pile is reshuffled back into the deck. This creates a roguelike loop where you see all 20 cards before any repeat.
- **Fisher-Yates Shuffle**: The gold standard for unbiased shuffling. We iterate backward through the array, swapping each element with a random earlier element. Every permutation is equally likely.
- **Energy Per Turn**: The player gets 3 energy at the start of each turn. Playing cards costs energy. Unspent energy is lost when the turn ends. This forces decisions: do you play one expensive card or two cheap ones?
- **End-Turn Discard**: When the player ends their turn, ALL remaining hand cards and played cards go to the discard pile. You do not keep unplayed cards. This prevents hoarding and keeps the game flowing.

---

## Code

### 1. Create the Deck System

**File:** `src/contexts/canvas2d/games/card-battle/systems/DeckSystem.ts`

Manages the full lifecycle of cards through deck, hand, and discard piles.

```typescript
import type { CardBattleState, CardInstance } from '../types';
import { CARD_DEFINITIONS } from '../data/cards';

/** Manages draw pile, hand, and discard pile */
export class DeckSystem {
  /** Build a fresh deck of CardInstances from the master definitions */
  buildDeck(state: CardBattleState): void {
    state.deck = [];

    for (const card of CARD_DEFINITIONS) {
      state.deck.push({ uid: state.nextUid++, card });
    }

    this.shuffle(state.deck);
    state.hand = [];
    state.discard = [];
    state.playedCards = [];
  }

  /** Fisher-Yates shuffle */
  shuffle(arr: CardInstance[]): void {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  /** Draw n cards from the deck into the hand */
  drawCards(state: CardBattleState, count: number): void {
    for (let i = 0; i < count; i++) {
      if (state.deck.length === 0) {
        this.reshuffleDiscard(state);
      }

      if (state.deck.length === 0) break;

      const card = state.deck.pop()!;
      state.hand.push(card);
    }
  }

  /** Move discard pile back into the deck and shuffle */
  reshuffleDiscard(state: CardBattleState): void {
    state.deck.push(...state.discard);
    state.discard = [];
    this.shuffle(state.deck);
  }

  /** Move a card from hand to played area */
  playCard(state: CardBattleState, handIndex: number): CardInstance | null {
    if (handIndex < 0 || handIndex >= state.hand.length) return null;

    const [card] = state.hand.splice(handIndex, 1);
    state.playedCards.push(card);

    return card;
  }

  /** Discard all played cards and remaining hand at end of turn */
  endTurnDiscard(state: CardBattleState): void {
    state.discard.push(...state.playedCards);
    state.discard.push(...state.hand);
    state.playedCards = [];
    state.hand = [];
  }

  update(_state: CardBattleState, _dt: number): void {
    // Deck system is event-driven, not tick-driven
  }
}
```

**What's happening:**
- `buildDeck()` creates a `CardInstance` for each of the 20 card definitions, assigns a unique `uid`, shuffles the deck, and clears all other piles. This is called at the start of each round.
- `drawCards()` pops cards from the top of the deck into the hand. If the deck is empty, it calls `reshuffleDiscard()` to recycle used cards first. The `break` guard handles the edge case where both deck and discard are empty.
- `playCard()` uses `splice()` to remove the card at the given index from the hand and adds it to `playedCards`. It returns the card instance so the engine can pass it to the battle system.
- `endTurnDiscard()` dumps everything into the discard pile: both played cards and unplayed hand cards. The hand and playedCards arrays are then emptied.
- `shuffle()` uses Fisher-Yates: for each position from the end, swap with a random position at or before it. The destructuring swap `[arr[i], arr[j]] = [arr[j], arr[i]]` is clean and idiomatic.

---

### 2. Create the HUD Renderer

**File:** `src/contexts/canvas2d/games/card-battle/renderers/HUDRenderer.ts`

Displays game information: round, turn, phase, energy pips, deck/discard counts, and messages.

```typescript
import type { CardBattleState } from '../types';

/** Renders HP, energy, turn counter, round info, and messages */
export class HUDRenderer {
  render(ctx: CanvasRenderingContext2D, state: CardBattleState): void {
    const W = state.canvasWidth;

    this.renderTopBar(ctx, state, W);
    this.renderEnergyDisplay(ctx, state, W);
    this.renderMessage(ctx, state, W);
    this.renderDeckInfo(ctx, state, W);
    this.renderHelpHint(ctx, state, W);
  }

  private renderTopBar(ctx: CanvasRenderingContext2D, state: CardBattleState, W: number): void {
    // Background bar
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, W, 32);

    ctx.font = 'bold 13px monospace';
    ctx.textBaseline = 'middle';
    const y = 16;

    // Round
    ctx.fillStyle = '#8e44ad';
    ctx.textAlign = 'left';
    ctx.fillText(`Round ${state.round}/${state.maxRounds}`, 12, y);

    // Turn
    ctx.fillStyle = '#f39c12';
    ctx.fillText(`Turn ${state.turn}`, 160, y);

    // Phase
    ctx.fillStyle = '#bbb';
    ctx.textAlign = 'center';
    const phaseLabels: Record<string, string> = {
      draw: 'Drawing...',
      player: 'Your Turn',
      enemy: 'Enemy Turn',
      resolve: 'Resolving...',
      win: 'Victory!',
      lose: 'Defeated',
      'round-win': 'Round Clear!',
    };
    ctx.fillText(phaseLabels[state.phase] || '', W / 2, y);

    // Player HP summary (right side)
    ctx.textAlign = 'right';
    ctx.fillStyle = '#2ecc71';
    ctx.fillText(`HP: ${state.player.hp}/${state.player.maxHp}`, W - 12, y);
  }

  private renderEnergyDisplay(ctx: CanvasRenderingContext2D, state: CardBattleState, _W: number): void {
    const H = state.canvasHeight;
    const x = 20;
    const y = H / 2 + 10;

    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#f1c40f';
    ctx.fillText('Energy', x, y);

    // Energy pips
    for (let i = 0; i < state.player.maxEnergy; i++) {
      const px = x + i * 22;
      const py = y + 18;
      ctx.font = '16px serif';
      ctx.fillText(i < state.player.energy ? '⚡' : '○', px, py);
    }
  }

  private renderMessage(ctx: CanvasRenderingContext2D, state: CardBattleState, W: number): void {
    if (!state.message || state.gameOver || state.phase === 'round-win') return;

    const H = state.canvasHeight;

    ctx.font = '14px monospace';
    ctx.fillStyle = '#f1c40f';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(state.message, W / 2, H / 2 + 90);
  }

  private renderDeckInfo(ctx: CanvasRenderingContext2D, state: CardBattleState, _W: number): void {
    const H = state.canvasHeight;

    ctx.font = '11px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillStyle = '#666';
    ctx.fillText(
      `Deck: ${state.deck.length}  |  Discard: ${state.discard.length}`,
      12,
      H - 8,
    );
  }

  private renderHelpHint(ctx: CanvasRenderingContext2D, state: CardBattleState, W: number): void {
    const H = state.canvasHeight;

    ctx.font = '11px monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillStyle = '#555';
    ctx.fillText('[H] Help  [ESC] Exit', W - 12, H - 8);
  }
}
```

**What's happening:**
- `renderTopBar()` draws a dark semi-transparent bar across the top with four pieces of info: round counter (purple), turn number (orange), current phase label (center), and player HP summary (green, right-aligned).
- `renderEnergyDisplay()` shows the word "Energy" followed by lightning bolt emojis for available energy and hollow circles for spent energy. This gives an at-a-glance read of remaining resources.
- `renderMessage()` displays temporary status messages (like "Played Slash!") in gold text, centered below the player area. Messages with active game-over overlays are suppressed.
- `renderDeckInfo()` shows deck and discard pile sizes in the bottom-left corner, so the player knows when cards will reshuffle.
- `renderHelpHint()` shows keyboard shortcuts in the bottom-right corner.

---

### 3. Add End Turn Button to Battle Renderer

Update the `render()` method in `BattleRenderer` to include the end-turn button and enemy played card display:

```typescript
// Add these methods to BattleRenderer and call them from render()

private renderEndTurnButton(ctx: CanvasRenderingContext2D, state: CardBattleState): void {
  if (state.phase !== 'player') return;

  const W = state.canvasWidth;
  const H = state.canvasHeight;
  const btnW = 120;
  const btnH = 40;
  const btnX = W - btnW - 20;
  const btnY = H / 2 - btnH / 2;

  ctx.fillStyle = '#e67e22';
  ctx.beginPath();
  ctx.roundRect(btnX, btnY, btnW, btnH, 8);
  ctx.fill();

  ctx.strokeStyle = '#f39c12';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(btnX, btnY, btnW, btnH, 8);
  ctx.stroke();

  ctx.font = 'bold 14px monospace';
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('End Turn', btnX + btnW / 2, btnY + btnH / 2);
}

private renderEnemyPlayedCard(ctx: CanvasRenderingContext2D, state: CardBattleState): void {
  if (!state.enemyPlayedCard) return;

  const W = state.canvasWidth;
  const card = state.enemyPlayedCard;
  const x = W / 2 - 35;
  const y = 170;
  const w = 70;
  const h = 50;

  ctx.fillStyle = '#3d1f1f';
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 4);
  ctx.fill();
  ctx.strokeStyle = '#e74c3c';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 4);
  ctx.stroke();

  ctx.font = '16px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(card.icon, x + w / 2, y + 18);
  ctx.font = '8px monospace';
  ctx.fillStyle = '#e74c3c';
  ctx.fillText(card.name, x + w / 2, y + 38);
}
```

**What's happening:**
- `renderEndTurnButton()` draws an orange rounded-rect button on the right side of the screen, only during the player phase. The position is `W - btnW - 20` for right-alignment with a 20px margin.
- `renderEnemyPlayedCard()` shows a small dark-red card below the enemy icon when the enemy has played a card. This gives visual feedback of the enemy's action.
- Both methods are conditionally rendered: the button only during `'player'` phase, the enemy card only when `enemyPlayedCard` is not null.

---

### 4. Update the Engine with Full Turn Structure

**File:** `src/contexts/canvas2d/games/card-battle/CardBattleEngine.ts`

Wire the deck system and turn flow: draw phase, end turn, and round transitions.

```typescript
import type { CardBattleState } from './types';
import { BattleRenderer } from './renderers/BattleRenderer';
import { HUDRenderer } from './renderers/HUDRenderer';
import { BattleSystem } from './systems/BattleSystem';
import { DeckSystem } from './systems/DeckSystem';
import { InputSystem } from './systems/InputSystem';

export class CardBattleEngine {
  private ctx: CanvasRenderingContext2D;
  private state: CardBattleState;
  private running = false;
  private rafId = 0;
  private lastTime = 0;

  private deckSystem: DeckSystem;
  private battleSystem: BattleSystem;
  private inputSystem: InputSystem;
  private battleRenderer: BattleRenderer;
  private hudRenderer: HUDRenderer;
  private resizeHandler: () => void;

  constructor(canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    this.state = this.createInitialState(canvas.width, canvas.height);

    this.deckSystem = new DeckSystem();
    this.battleSystem = new BattleSystem();
    this.battleRenderer = new BattleRenderer();
    this.hudRenderer = new HUDRenderer();

    this.inputSystem = new InputSystem(canvas, this.state, {
      onPlayCard: (i) => this.handlePlayCard(i),
      onEndTurn: () => this.handleEndTurn(),
      onContinue: () => this.handleContinue(),
      onRestart: () => this.handleRestart(),
      onExit: () => {},
      onToggleHelp: () => {},
    });

    // Setup first round
    this.battleSystem.setupEnemy(this.state);
    this.deckSystem.buildDeck(this.state);
    this.startPlayerTurn();

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
      phase: 'draw',
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

  private startPlayerTurn(): void {
    this.state.phase = 'draw';
    this.state.player.energy = this.state.player.maxEnergy;
    this.state.player.block = 0;
    this.state.enemyPlayedCard = null;
    this.state.playedCards = [];
    this.deckSystem.drawCards(this.state, 3);
    this.state.phase = 'player';
  }

  private handlePlayCard(index: number): void {
    if (this.state.phase !== 'player') return;

    if (!this.battleSystem.canPlayCard(this.state, index)) {
      this.showMessage('Not enough energy!', 1200);
      return;
    }

    const ci = this.deckSystem.playCard(this.state, index);
    if (!ci) return;

    this.battleSystem.applyCard(this.state, ci);
    this.showMessage(`Played ${ci.card.name}!`, 800);

    this.battleSystem.checkBattleEnd(this.state);
  }

  private handleEndTurn(): void {
    if (this.state.phase !== 'player') return;

    // Discard remaining hand and played cards
    this.deckSystem.endTurnDiscard(this.state);

    // Start next player turn (no enemy turn yet -- that comes in step 5)
    this.state.turn++;
    this.startPlayerTurn();
  }

  private handleContinue(): void {
    if (this.state.phase !== 'round-win') return;

    this.state.round++;
    this.state.turn = 1;
    this.state.phase = 'draw';
    this.state.enemyPlayedCard = null;
    this.state.message = '';

    // Heal player partially between rounds
    this.state.player.hp = Math.min(this.state.player.maxHp, this.state.player.hp + 15);
    this.state.player.block = 0;

    // Setup next enemy
    this.battleSystem.setupEnemy(this.state);

    // Rebuild deck
    this.deckSystem.buildDeck(this.state);
    this.startPlayerTurn();
  }

  private handleRestart(): void {
    const w = this.state.canvasWidth;
    const h = this.state.canvasHeight;
    Object.assign(this.state, this.createInitialState(w, h));
    this.battleSystem.setupEnemy(this.state);
    this.deckSystem.buildDeck(this.state);
    this.startPlayerTurn();
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
    this.hudRenderer.render(ctx, this.state);
  }
}
```

**What's happening:**
- `startPlayerTurn()` is the turn initialization sequence: reset energy to max (3), clear block (it does not carry over), clear the enemy's played card display, clear played cards, draw 3 new cards, then set phase to `'player'`.
- `handleEndTurn()` calls `deckSystem.endTurnDiscard()` to dump everything, increments the turn counter, and immediately starts a new player turn. The enemy turn is a placeholder for Step 5.
- `handleContinue()` handles round transitions: increment the round, heal the player by 15 HP (capped at max), set up a new enemy, rebuild and reshuffle the deck, then start a fresh player turn.
- `handleRestart()` uses `Object.assign()` to reset the state in place (preserving the reference the input system holds) and re-initializes everything from scratch.
- The render pipeline now calls both `battleRenderer.render()` and `hudRenderer.render()`, layering the HUD on top of the battle scene.

---

### 5. Update the Input System with End Turn Button

Add the end-turn button hit test to `handleClick()` in the input system. Add this check before the card hit test:

```typescript
// Check End Turn button (right side of screen)
const btnW = 120;
const btnH = 40;
const btnX = W - btnW - 20;
const btnY = H / 2 - btnH / 2;

if (x >= btnX && x <= btnX + btnW && y >= btnY && y <= btnY + btnH) {
  this.callbacks.onEndTurn();
  return;
}
```

**What's happening:**
- The hit test uses the exact same position and dimensions as `renderEndTurnButton()`: 120x40 pixels, positioned at `W - 140` horizontally and vertically centered.
- The `return` after `onEndTurn()` prevents the click from also being interpreted as a card click if the button overlaps the hand area.

---

## Test It

1. **Run:** `npm run dev`
2. **Open:** the Card Battle game in your browser
3. **Observe:**
   - The **top bar** shows "Round 1/3", "Turn 1", "Your Turn", and "HP: 60/60"
   - **3 cards** are drawn into your hand at the start of each turn
   - **Energy pips** (3 lightning bolts) appear on the left -- they deplete as you play cards
   - The **"End Turn" button** (orange) appears on the right side during your turn
   - Click **End Turn** to discard your hand, draw 3 fresh cards, and reset energy
   - The bottom-left shows **"Deck: X | Discard: Y"** tracking pile sizes
   - Play enough turns to **empty the deck** and watch it reshuffle from the discard pile
   - Defeat the enemy, click through **"ROUND CLEAR!"**, and fight the next enemy with a rebuilt deck

---

## Challenges

**Easy:**
- Change the draw count from 3 to 4 cards per turn and see how it affects gameplay pacing.

**Medium:**
- Add a visual "draw animation" where cards slide in from the left side of the screen when drawn, using a short timer and interpolated position.

**Hard:**
- Implement a hand size limit of 7 cards: if drawing would exceed 7, skip the draw. Display a "Hand full!" message when this happens.

---

## What You Learned

- Building a three-pile deck system with draw, play, discard, and reshuffle mechanics
- Implementing Fisher-Yates shuffle for unbiased card randomization
- Creating a turn structure with draw phase, player phase, and end-turn transitions
- Rendering a HUD with round/turn/phase info, energy pips, and deck status
- Wiring an end-turn button with matching hit-test and render coordinates

**Next:** AI opponent -- give the enemy a brain so it fights back!
