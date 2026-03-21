# Step 1: Project Setup & Card Rendering

**Goal:** Draw card shapes on canvas with title, cost badge, icon, description, and stat value.

**Time:** ~15 minutes

---

## What You'll Build

- **Type definitions** for cards, combatants, and the full game state
- **Card data file** with 20 card definitions across four types (attack, defense, heal, special)
- **Card rendering function** that draws rounded-rect cards with cost badge, icon, name, description, and value
- **Platform adapter and entry point** wired into the game loop
- **Dark battlefield background** with a static hand of sample cards displayed at the bottom

---

## Concepts

- **Card Data Modeling**: Each card has an `id`, `name`, `type` (attack/defense/heal/special), `value` (how strong the effect is), `cost` (energy required), `icon` (emoji), and `description`. Separating the _definition_ from an _instance_ lets us reuse the same card data for multiple copies in a deck.
- **CardInstance vs Card**: A `Card` is a template definition. A `CardInstance` wraps a `Card` with a unique `uid` so the game can track individual copies in the hand, deck, and discard pile.
- **Combatant State**: Both the player and enemy share the same `Combatant` interface with `hp`, `maxHp`, `energy`, `maxEnergy`, and `block`. This avoids duplicating logic for damage and healing.
- **Type-Based Color Coding**: Attack cards render in red, defense in blue, heal in green, and special in purple. This immediate visual feedback helps players assess their hand at a glance.
- **Cost Badge**: A small dark circle in the top-left corner of each card displays the energy cost in gold text, mimicking physical card game design conventions.

---

## Code

### 1. Create Types

**File:** `src/games/card-battle/types.ts`

All type definitions for the entire game, defined up front so later steps never need to modify this file.

```typescript
/** Card types available in the game */
export type CardType = 'attack' | 'defense' | 'heal' | 'special';

/** Definition of a single card */
export interface Card {
  id: number;
  name: string;
  type: CardType;
  value: number;
  cost: number;
  icon: string;
  description: string;
}

/** A card instance in a hand/deck (wraps definition with unique instance id) */
export interface CardInstance {
  uid: number;
  card: Card;
}

/** Combatant state (shared between player and enemy) */
export interface Combatant {
  name: string;
  hp: number;
  maxHp: number;
  energy: number;
  maxEnergy: number;
  block: number;
}

/** Phase of a single turn */
export type TurnPhase = 'draw' | 'player' | 'enemy' | 'resolve' | 'win' | 'lose' | 'round-win';

/** Full game state for the card battle */
export interface CardBattleState {
  player: Combatant;
  enemy: Combatant;
  deck: CardInstance[];
  hand: CardInstance[];
  discard: CardInstance[];
  playedCards: CardInstance[];
  enemyPlayedCard: Card | null;
  phase: TurnPhase;
  turn: number;
  round: number;
  maxRounds: number;
  selectedCardIndex: number;
  message: string;
  messageTimer: number;
  animTimer: number;
  gameOver: boolean;
  canvasWidth: number;
  canvasHeight: number;
  nextUid: number;
  helpVisible: boolean;
}
```

**What's happening:**
- `Card` is a pure data template. It never changes during gameplay -- it defines what a card _is_.
- `CardInstance` adds a `uid` so we can distinguish between two copies of "Slash" in the same hand. The `uid` increments from `state.nextUid`.
- `Combatant` is shared by player and enemy. The `block` field absorbs incoming damage before HP is reduced, and resets each turn.
- `CardBattleState` holds everything: the player and enemy combatants, the three card piles (deck, hand, discard), the current phase and turn counters, canvas dimensions, and UI state like the selected card index and message timer.
- `TurnPhase` tracks the flow: `draw` -> `player` -> `enemy` -> `resolve`, with terminal states `win`, `lose`, and `round-win`.

---

### 2. Create Card Definitions

**File:** `src/games/card-battle/data/cards.ts`

The master list of 20 cards that make up the game's card pool.

```typescript
import type { Card } from '../types';

/** Master deck of 20 card definitions */
export const CARD_DEFINITIONS: Card[] = [
  // --- Attacks (8) ---
  { id: 1,  name: 'Slash',        type: 'attack',  value: 6,  cost: 1, icon: '⚔️',  description: 'Deal 6 damage' },
  { id: 2,  name: 'Heavy Strike', type: 'attack',  value: 10, cost: 2, icon: '🗡️',  description: 'Deal 10 damage' },
  { id: 3,  name: 'Quick Jab',    type: 'attack',  value: 4,  cost: 1, icon: '👊',  description: 'Deal 4 damage' },
  { id: 4,  name: 'Fireball',     type: 'attack',  value: 14, cost: 3, icon: '🔥',  description: 'Deal 14 damage' },
  { id: 5,  name: 'Ice Shard',    type: 'attack',  value: 8,  cost: 2, icon: '❄️',  description: 'Deal 8 damage' },
  { id: 6,  name: 'Poison Dart',  type: 'attack',  value: 5,  cost: 1, icon: '🎯',  description: 'Deal 5 damage' },
  { id: 7,  name: 'Thunder',      type: 'attack',  value: 12, cost: 2, icon: '⚡',  description: 'Deal 12 damage' },
  { id: 8,  name: 'Dagger Throw', type: 'attack',  value: 3,  cost: 1, icon: '🔪',  description: 'Deal 3 damage' },

  // --- Defense (5) ---
  { id: 9,  name: 'Shield Up',    type: 'defense', value: 6,  cost: 1, icon: '🛡️',  description: 'Gain 6 block' },
  { id: 10, name: 'Iron Wall',    type: 'defense', value: 10, cost: 2, icon: '🏰',  description: 'Gain 10 block' },
  { id: 11, name: 'Dodge Roll',   type: 'defense', value: 4,  cost: 1, icon: '💨',  description: 'Gain 4 block' },
  { id: 12, name: 'Fortress',     type: 'defense', value: 15, cost: 3, icon: '🧱',  description: 'Gain 15 block' },
  { id: 13, name: 'Parry',        type: 'defense', value: 7,  cost: 1, icon: '🤺',  description: 'Gain 7 block' },

  // --- Heal (4) ---
  { id: 14, name: 'Heal',         type: 'heal',    value: 5,  cost: 1, icon: '💚',  description: 'Restore 5 HP' },
  { id: 15, name: 'Greater Heal', type: 'heal',    value: 10, cost: 2, icon: '💖',  description: 'Restore 10 HP' },
  { id: 16, name: 'Potion',       type: 'heal',    value: 8,  cost: 2, icon: '🧪',  description: 'Restore 8 HP' },
  { id: 17, name: 'Lifesteal',    type: 'heal',    value: 6,  cost: 1, icon: '🩸',  description: 'Restore 6 HP' },

  // --- Special (3) ---
  { id: 18, name: 'Power Surge',  type: 'special', value: 8,  cost: 2, icon: '✨',  description: 'Deal 8 dmg + gain 4 block' },
  { id: 19, name: 'Drain Life',   type: 'special', value: 6,  cost: 2, icon: '🌀',  description: 'Deal 6 dmg + heal 4 HP' },
  { id: 20, name: 'Berserker',    type: 'special', value: 18, cost: 3, icon: '💥',  description: 'Deal 18 dmg, lose 5 HP' },
];
```

**What's happening:**
- Cards are balanced around a cost-to-value ratio: 1-cost cards deal 3-7, 2-cost cards deal 8-12, 3-cost cards deal 14-18. This gives players meaningful choices about spending energy.
- Attack cards outnumber other types (8 of 20), making the game aggressive by default. Defense and heal cards provide strategic variety.
- Special cards break the rules: Power Surge combines attack and defense, Drain Life combines attack and healing, Berserker offers huge damage at a self-damage cost.
- Each card has a descriptive emoji `icon` that renders large on the card face, giving instant visual identity without needing sprite assets.

---

### 3. Create the Battle Renderer

**File:** `src/games/card-battle/renderers/BattleRenderer.ts`

Draws the battlefield background and a static row of sample cards. In this step we focus on the card rendering method.

```typescript
import type { CardBattleState, CardInstance } from '../types';

/** Renders the battlefield: background and card hand */
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

    // Render cards in hand
    this.renderCardHand(ctx, state);
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

      this.renderCard(ctx, hand[i], cx, handY, cardW, cardH, true, false);
    }
  }

  renderCard(
    ctx: CanvasRenderingContext2D,
    ci: CardInstance,
    x: number,
    y: number,
    w: number,
    h: number,
    canPlay: boolean,
    selected: boolean,
  ): void {
    const card = ci.card;

    // Card background color based on type
    const typeColors: Record<string, string> = {
      attack: '#c0392b',
      defense: '#2980b9',
      heal: '#27ae60',
      special: '#8e44ad',
    };

    ctx.save();

    // Shadow
    ctx.shadowColor = selected ? '#f1c40f' : 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = selected ? 15 : 6;
    ctx.shadowOffsetY = 3;

    // Card body
    ctx.fillStyle = canPlay ? (typeColors[card.type] || '#555') : '#444';
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 8);
    ctx.fill();

    ctx.restore();

    // Border
    ctx.strokeStyle = selected ? '#f1c40f' : canPlay ? '#fff' : '#666';
    ctx.lineWidth = selected ? 3 : 1;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 8);
    ctx.stroke();

    // Cost badge (dark circle top-left)
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
      // Dim overlay for unplayable cards
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, 8);
      ctx.fill();
    }
  }
}
```

**What's happening:**
- `renderCard()` draws a complete card in layers: shadow -> colored body -> border -> cost badge -> icon -> name -> description -> value. Each layer builds on the last.
- `ctx.roundRect()` gives cards smooth rounded corners (radius 8). The `ctx.save()/restore()` block isolates the shadow effect so it does not bleed into subsequent draws.
- The cost badge is a dark circle with gold text in the top-left corner, matching the convention from physical card games where mana cost sits in the corner.
- `canPlay` controls whether the card renders in full color or is dimmed with a dark overlay. `selected` adds a golden glow and thicker border.
- `renderCardHand()` spaces cards evenly across the bottom of the screen. The total width is clamped to 70% of the canvas to prevent overflow, and `spacing` is calculated so cards overlap slightly when the hand is large.

---

### 4. Create the Engine

**File:** `src/games/card-battle/CardBattleEngine.ts`

The engine creates the initial state, places sample cards in the hand, and runs the render loop.

```typescript
import type { CardBattleState } from './types';
import { CARD_DEFINITIONS } from './data/cards';
import { BattleRenderer } from './renderers/BattleRenderer';

export class CardBattleEngine {
  private ctx: CanvasRenderingContext2D;
  private state: CardBattleState;
  private running = false;
  private rafId = 0;
  private battleRenderer: BattleRenderer;
  private resizeHandler: () => void;

  constructor(canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    this.state = this.createInitialState(canvas.width, canvas.height);
    this.battleRenderer = new BattleRenderer();

    // Put some sample cards in the hand so we can see them rendered
    this.loadSampleHand();

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
    window.removeEventListener('resize', this.resizeHandler);
  }

  private createInitialState(w: number, h: number): CardBattleState {
    return {
      player: {
        name: 'Hero',
        hp: 60,
        maxHp: 60,
        energy: 3,
        maxEnergy: 3,
        block: 0,
      },
      enemy: {
        name: 'Goblin',
        hp: 50,
        maxHp: 50,
        energy: 0,
        maxEnergy: 0,
        block: 0,
      },
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

  /** Load a few sample cards into the hand for visual testing */
  private loadSampleHand(): void {
    const samples = CARD_DEFINITIONS.slice(0, 5);
    for (const card of samples) {
      this.state.hand.push({ uid: this.state.nextUid++, card });
    }
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
- `createInitialState()` builds the full `CardBattleState` with the player starting at 60 HP, 3 energy, and the enemy at 50 HP. All card piles start empty.
- `loadSampleHand()` grabs the first 5 card definitions and wraps them as `CardInstance` objects with incrementing `uid` values. This is temporary -- Step 4 will replace it with a proper draw phase.
- The game loop is minimal: clear the canvas, call `battleRenderer.render()`, and request the next frame. No update logic yet.
- The resize handler keeps `canvasWidth`/`canvasHeight` in sync with the window so the renderer always has accurate dimensions.

---

### 5. Create the Platform Adapter

**File:** `src/games/card-battle/adapters/PlatformAdapter.ts`

A thin wrapper that connects the engine to the host application.

```typescript
import { CardBattleEngine } from '../CardBattleEngine';

export class PlatformAdapter {
  private engine: CardBattleEngine;

  constructor(canvas: HTMLCanvasElement) {
    this.engine = new CardBattleEngine(canvas);
  }

  start(): void {
    this.engine.start();
  }

  destroy(): void {
    this.engine.destroy();
  }
}
```

---

### 6. Create the Entry Point

**File:** `src/games/card-battle/index.ts`

```typescript
import { PlatformAdapter } from './adapters/PlatformAdapter';

export function createCardBattle(canvas: HTMLCanvasElement): { destroy: () => void } {
  const adapter = new PlatformAdapter(canvas);
  adapter.start();
  return { destroy: () => adapter.destroy() };
}
```

---

## Test It

1. **Run:** `npm run dev`
2. **Open:** the Card Battle game in your browser
3. **Observe:**
   - A **dark background** (`#1a1a2e`) filling the entire canvas
   - A **dashed horizontal line** dividing the screen in half (the battle area separator)
   - **Five cards** displayed along the bottom of the screen in a horizontal row
   - Each card shows a **gold cost badge** in the top-left, an **emoji icon** in the center, the **card name** in bold white, a **description** below that, and a large **value number** at the bottom
   - Cards are **color-coded**: red for attack, blue for defense, green for heal, purple for special
   - **Resize the window** and cards reposition to stay centered at the bottom

---

## Challenges

**Easy:**
- Change the card body corner radius from 8 to 12 for rounder cards.
- Swap the sample hand to show cards 10-14 (defense and heal cards) instead of the first five.

**Medium:**
- Add a thin colored line at the top of each card (a "type stripe") using the card's type color, 3px tall and spanning the card width.

**Hard:**
- Render a "card back" design for face-down cards: a dark purple rounded rectangle with a repeating diamond pattern drawn with `ctx.lineTo()`.

---

## What You Learned

- Defining a complete card battle type system with Card, CardInstance, Combatant, and game state
- Building a card data file with balanced stats across four card types
- Rendering layered card visuals: shadow, body, border, cost badge, icon, name, description, and value
- Color-coding cards by type for instant visual identification
- Setting up the engine/adapter/entry-point architecture for the game loop

**Next:** Hand display and card selection -- fan your cards, hover to highlight, and click to play them!
