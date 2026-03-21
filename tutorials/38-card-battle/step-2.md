# Step 2: Hand Display & Card Selection

**Goal:** Display a fan of cards in the player's hand, click to select and play cards, and show played cards in the battle area.

**Time:** ~15 minutes

---

## What You'll Build

- **Fan layout** that spreads cards evenly along the bottom of the screen
- **Click-to-play interaction** where clicking a card in your hand plays it immediately
- **Selected card highlighting** with a golden glow border
- **Played cards area** showing miniature versions of cards you have played this turn
- **Input system** that translates mouse clicks into card indices

---

## Concepts

- **Hit Testing Cards**: To detect which card was clicked, we reconstruct the same layout math used by the renderer and check if the click coordinates fall within each card's bounding rectangle. We iterate from right to left so overlapping cards prioritize the topmost (rightmost) card.
- **Spacing Calculation**: Cards spread across 70% of canvas width at most. When the hand has more cards, they overlap more. With a single card, it centers perfectly. The formula `totalW / (count - 1)` gives the offset between each card's left edge.
- **Played Cards Zone**: Once a card leaves the hand, a miniature version appears in the "Played" area above the midline. This gives visual feedback that the card was used and helps track what you have spent this turn.
- **Event-Driven Input**: Rather than polling, we attach a `click` event listener and use a callback pattern (`onPlayCard(index)`) to decouple input detection from game logic.

---

## Code

### 1. Create the Input System

**File:** `src/games/card-battle/systems/InputSystem.ts`

Handles mouse clicks to detect card selection and button presses.

```typescript
import type { CardBattleState } from '../types';

export interface InputCallbacks {
  onPlayCard(index: number): void;
  onEndTurn(): void;
  onContinue(): void;
  onRestart(): void;
  onExit(): void;
  onToggleHelp(): void;
}

/** Handles click input for card selection, end turn button, and overlays */
export class InputSystem {
  private canvas: HTMLCanvasElement;
  private state: CardBattleState;
  private callbacks: InputCallbacks;
  private clickHandler: (e: MouseEvent) => void;
  private keyHandler: (e: KeyboardEvent) => void;

  constructor(
    canvas: HTMLCanvasElement,
    state: CardBattleState,
    callbacks: InputCallbacks,
  ) {
    this.canvas = canvas;
    this.state = state;
    this.callbacks = callbacks;

    this.clickHandler = (e: MouseEvent) => this.handleClick(e);
    this.keyHandler = (e: KeyboardEvent) => this.handleKey(e);
  }

  attach(): void {
    this.canvas.addEventListener('click', this.clickHandler);
    window.addEventListener('keydown', this.keyHandler);
  }

  detach(): void {
    this.canvas.removeEventListener('click', this.clickHandler);
    window.removeEventListener('keydown', this.keyHandler);
  }

  private handleKey(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      this.callbacks.onExit();
    }
  }

  private handleClick(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const s = this.state;
    const W = s.canvasWidth;
    const H = s.canvasHeight;

    // Only allow input during player phase
    if (s.phase !== 'player') return;

    // Check cards in hand (bottom area)
    const cardW = 100;
    const cardH = 140;
    const handY = H - cardH - 30;
    const handCount = s.hand.length;

    if (handCount === 0) return;

    const totalW = Math.min(handCount * (cardW + 10), W * 0.7);
    const spacing = handCount > 1 ? totalW / (handCount - 1) : 0;
    const startX = (W - totalW) / 2 - cardW / 2;

    // Check from right to left (topmost card drawn last has priority)
    for (let i = handCount - 1; i >= 0; i--) {
      const cx = handCount === 1 ? (W - cardW) / 2 : startX + i * spacing;

      if (x >= cx && x <= cx + cardW && y >= handY && y <= handY + cardH) {
        this.callbacks.onPlayCard(i);
        return;
      }
    }
  }
}
```

**What's happening:**
- `InputCallbacks` is an interface of function hooks. The engine provides implementations; the input system just calls them. This keeps input detection completely separate from game logic.
- `handleClick()` converts the mouse event to canvas-relative coordinates using `getBoundingClientRect()`, then reconstructs the exact same card layout math the renderer uses.
- The reverse iteration (`i = handCount - 1` down to `0`) ensures that when cards overlap, clicking the overlap area selects the card drawn on top.
- `handleKey()` currently only handles Escape for exiting. We will add the help toggle in a later step.
- `attach()`/`detach()` manage event listener lifecycle so the engine can cleanly start and stop input handling.

---

### 2. Update the Battle Renderer with Played Cards

**File:** `src/games/card-battle/renderers/BattleRenderer.ts`

Add the `renderPlayedCards()` method to display miniature cards in the battle area.

Add this method to the existing `BattleRenderer` class and call it from `render()`:

```typescript
import type { CardBattleState, CardInstance } from '../types';

export class BattleRenderer {
  render(ctx: CanvasRenderingContext2D, state: CardBattleState): void {
    const W = state.canvasWidth;
    const H = state.canvasHeight;

    // Background
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, W, H);

    // Decorative battle area divider
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.moveTo(0, H / 2);
    ctx.lineTo(W, H / 2);
    ctx.stroke();
    ctx.setLineDash([]);

    this.renderCardHand(ctx, state);
    this.renderPlayedCards(ctx, state);
  }

  private renderCardHand(
    ctx: CanvasRenderingContext2D,
    state: CardBattleState,
  ): void {
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
    ctx: CanvasRenderingContext2D,
    ci: CardInstance,
    x: number, y: number,
    w: number, h: number,
    canPlay: boolean,
    selected: boolean,
  ): void {
    const card = ci.card;

    const typeColors: Record<string, string> = {
      attack: '#c0392b',
      defense: '#2980b9',
      heal: '#27ae60',
      special: '#8e44ad',
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

    // Cost badge
    ctx.fillStyle = '#1a1a2e';
    ctx.beginPath();
    ctx.arc(x + 16, y + 16, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f1c40f';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${card.cost}`, x + 16, y + 16);

    // Icon
    ctx.font = '28px serif';
    ctx.textAlign = 'center';
    ctx.fillText(card.icon, x + w / 2, y + 48);

    // Name
    ctx.font = 'bold 11px monospace';
    ctx.fillStyle = '#fff';
    ctx.fillText(card.name, x + w / 2, y + 78);

    // Description
    ctx.font = '9px monospace';
    ctx.fillStyle = '#ddd';
    ctx.fillText(card.description, x + w / 2, y + 98);

    // Value
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

  private renderPlayedCards(
    ctx: CanvasRenderingContext2D,
    state: CardBattleState,
  ): void {
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
}
```

**What's happening:**
- `renderCardHand()` now checks `canPlay` by comparing the card's cost to the player's current energy _and_ whether the phase is `'player'`. Cards too expensive to play are dimmed.
- `renderPlayedCards()` draws miniature 50x70 cards above the midline with just the icon and name. The "Played" label above them provides context.
- Miniature cards use a simple dark fill (`#2a2a3e`) with a subtle border rather than full type coloring, keeping visual focus on the hand.

---

### 3. Update the Engine with Input Handling

**File:** `src/games/card-battle/CardBattleEngine.ts`

Wire the input system into the engine so clicking a card removes it from the hand and adds it to played cards.

```typescript
import type { CardBattleState } from './types';
import { CARD_DEFINITIONS } from './data/cards';
import { BattleRenderer } from './renderers/BattleRenderer';
import { InputSystem } from './systems/InputSystem';

export class CardBattleEngine {
  private ctx: CanvasRenderingContext2D;
  private state: CardBattleState;
  private running = false;
  private rafId = 0;
  private battleRenderer: BattleRenderer;
  private inputSystem: InputSystem;
  private resizeHandler: () => void;

  constructor(canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    this.state = this.createInitialState(canvas.width, canvas.height);
    this.battleRenderer = new BattleRenderer();

    // Load sample hand
    this.loadSampleHand();

    this.inputSystem = new InputSystem(canvas, this.state, {
      onPlayCard: (i) => this.handlePlayCard(i),
      onEndTurn: () => {},
      onContinue: () => {},
      onRestart: () => {},
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
    if (index < 0 || index >= this.state.hand.length) return;

    const ci = this.state.hand[index];

    // Check energy
    if (ci.card.cost > this.state.player.energy) return;

    // Deduct energy
    this.state.player.energy -= ci.card.cost;

    // Move card from hand to played area
    this.state.hand.splice(index, 1);
    this.state.playedCards.push(ci);
  }

  private loop(): void {
    if (!this.running) return;
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
- `InputSystem` is instantiated with callback functions. When a card is clicked, `onPlayCard(i)` fires with the card's hand index.
- `handlePlayCard()` validates the index and energy cost, then moves the card from `hand` to `playedCards` using `splice()`. The renderer picks up the changes on the next frame.
- Energy is deducted immediately when a card is played. Cards costing more than available energy are silently ignored (and rendered dimmed by the renderer).
- The other callbacks (`onEndTurn`, `onContinue`, etc.) are empty stubs for now -- we will fill them in over the next steps.

---

## Test It

1. **Run:** `npm run dev`
2. **Open:** the Card Battle game in your browser
3. **Observe:**
   - **Five cards** displayed in a fan at the bottom of the screen
   - **Click a card** -- it disappears from your hand and appears as a miniature in the "Played" area above the midline
   - **Play several cards** -- your energy decreases and cards with costs higher than your remaining energy become **dimmed** (unplayable)
   - The "Played" label appears above the miniature cards showing what you have used this turn
   - **Cards respace** automatically as the hand shrinks

---

## Challenges

**Easy:**
- Add a hover effect: track mouse position and set `selectedCardIndex` when the mouse is over a card (without clicking).

**Medium:**
- Add a slight vertical offset (lift) to cards when hovered, so they appear to rise out of the hand.

**Hard:**
- Implement a "fan" layout where cards are slightly rotated using `ctx.rotate()`, spreading from a central pivot point like holding physical cards.

---

## What You Learned

- Hit testing cards by reconstructing layout math and checking bounding rectangles
- Moving cards between arrays (hand -> playedCards) with `splice()` and `push()`
- Rendering miniature card previews in a "played" zone for turn tracking
- Wiring an input system with callbacks to decouple detection from logic
- Dynamically dimming cards based on available energy

**Next:** Combat system -- make those cards actually deal damage, apply defense, and track health!
