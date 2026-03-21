# Step 6: Deck Building & Polish

**Goal:** Add a pre-battle deck building screen where you choose cards for your deck, plus visual polish with help overlay, keyboard shortcuts, and the final platform adapter wiring.

**Time:** ~15 minutes

---

## What You'll Build

- **Help overlay** toggled with the H key, showing game controls and tips
- **Keyboard shortcuts** for help (H) and exit (ESC)
- **Platform adapter** with `onExit` callback for integration with the host application
- **Complete game entry point** as a `GameDefinition` object with metadata
- **Message animations** that auto-dismiss using delta-time timers
- **Full game loop** with update and render separation

---

## Concepts

- **Help Overlay Pattern**: A toggleable overlay renders semi-transparent over the game, showing the goal, controls, and tips. It is controlled by a `helpVisible` boolean in the state and toggled via keyboard input. Clicking the overlay also dismisses it.
- **GameDefinition Interface**: The final entry point exports a `GameDefinition` object with `id`, `name`, `description`, `icon`, `color`, `help`, and a `create()` factory function. This standardized interface lets any host application discover and launch the game.
- **Delta-Time Timers**: Message timers subtract `dt` (milliseconds since last frame) each frame. When the timer hits 0, the message clears. This ensures consistent timing regardless of frame rate.
- **Clean Lifecycle**: `destroy()` removes all event listeners, cancels the animation frame, and detaches input handlers. This prevents memory leaks when switching between games.

---

## Code

### 1. Update the Input System with Help Toggle

**File:** `src/contexts/canvas2d/games/card-battle/systems/InputSystem.ts`

Add the help toggle and help-dismiss-on-click behavior.

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
      return;
    }

    if (e.key === 'h' || e.key === 'H') {
      this.callbacks.onToggleHelp();
      return;
    }
  }

  private handleClick(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const s = this.state;
    const W = s.canvasWidth;
    const H = s.canvasHeight;

    // If help is visible, clicking anywhere closes it
    if (s.helpVisible) {
      this.callbacks.onToggleHelp();
      return;
    }

    // Game over or round-win overlays
    if (s.phase === 'win' || s.phase === 'lose') {
      this.callbacks.onRestart();
      return;
    }

    if (s.phase === 'round-win') {
      this.callbacks.onContinue();
      return;
    }

    // Only allow input during player phase
    if (s.phase !== 'player') return;

    // Check End Turn button
    const btnW = 120;
    const btnH = 40;
    const btnX = W - btnW - 20;
    const btnY = H / 2 - btnH / 2;

    if (x >= btnX && x <= btnX + btnW && y >= btnY && y <= btnY + btnH) {
      this.callbacks.onEndTurn();
      return;
    }

    // Check cards in hand
    const cardW = 100;
    const cardH = 140;
    const handY = H - cardH - 30;
    const handCount = s.hand.length;

    if (handCount === 0) return;

    const totalW = Math.min(handCount * (cardW + 10), W * 0.7);
    const spacing = handCount > 1 ? totalW / (handCount - 1) : 0;
    const startX = (W - totalW) / 2 - cardW / 2;

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
- `handleKey()` now handles both Escape (exit) and H (toggle help). The `return` after each prevents key events from being processed further.
- The help overlay check is the very first thing in `handleClick()`. When help is visible, any click dismisses it and no other click processing occurs. This prevents accidentally playing cards while reading the help screen.
- The full click priority chain is: help dismiss -> game-over restart -> round-win continue -> end-turn button -> card selection. Each check returns early to prevent lower-priority handlers from firing.

---

### 2. Complete the Engine with Help and Exit

**File:** `src/contexts/canvas2d/games/card-battle/CardBattleEngine.ts`

The final engine with all systems wired, help overlay support, and onExit callback.

```typescript
import type { CardBattleState } from './types';
import { DeckSystem } from './systems/DeckSystem';
import { BattleSystem } from './systems/BattleSystem';
import { InputSystem } from './systems/InputSystem';
import { BattleRenderer } from './renderers/BattleRenderer';
import { HUDRenderer } from './renderers/HUDRenderer';

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
  private onExit: () => void;
  private resizeHandler: () => void;

  constructor(canvas: HTMLCanvasElement, onExit: () => void) {
    this.ctx = canvas.getContext('2d')!;
    this.onExit = onExit;

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
      onExit: () => this.onExit(),
      onToggleHelp: () => this.toggleHelp(),
    });

    // Setup first round
    this.battleSystem.setupEnemy(this.state);
    this.deckSystem.buildDeck(this.state);
    this.startPlayerTurn();

    this.resizeHandler = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      this.state.canvasWidth = canvas.width;
      this.state.canvasHeight = canvas.height;
    };

    this.inputSystem.attach();
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

  private loop(): void {
    if (!this.running) return;

    const now = performance.now();
    const dt = now - this.lastTime;
    this.lastTime = now;

    this.update(dt);
    this.render();
    this.rafId = requestAnimationFrame(() => this.loop());
  }

  private update(dt: number): void {
    this.battleSystem.update(this.state, dt);
  }

  private render(): void {
    const ctx = this.ctx;

    ctx.clearRect(0, 0, this.state.canvasWidth, this.state.canvasHeight);
    this.battleRenderer.render(ctx, this.state);
    this.hudRenderer.render(ctx, this.state);
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

    // Check if enemy defeated
    this.battleSystem.checkBattleEnd(this.state);
  }

  private handleEndTurn(): void {
    if (this.state.phase !== 'player') return;

    // Discard remaining hand and played cards
    this.deckSystem.endTurnDiscard(this.state);

    // Enemy turn
    this.state.phase = 'enemy';
    this.state.enemy.block = 0;

    this.battleSystem.enemyTurn(this.state);

    const enemyCard = this.state.enemyPlayedCard;
    if (enemyCard) {
      this.showMessage(
        `${this.state.enemy.name} used ${enemyCard.name}!`,
        1200,
      );
    }

    // Check battle end
    this.battleSystem.checkBattleEnd(this.state);

    if (!this.state.gameOver && (this.state.phase as string) !== 'round-win') {
      // Start next player turn
      this.state.turn++;
      this.startPlayerTurn();
    }
  }

  private handleContinue(): void {
    if (this.state.phase !== 'round-win') return;

    this.state.round++;
    this.state.turn = 1;
    this.state.phase = 'draw';
    this.state.enemyPlayedCard = null;
    this.state.message = '';

    // Heal player partially between rounds
    this.state.player.hp = Math.min(
      this.state.player.maxHp,
      this.state.player.hp + 15,
    );
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

  private toggleHelp(): void {
    this.state.helpVisible = !this.state.helpVisible;
  }

  private showMessage(msg: string, durationMs: number): void {
    this.state.message = msg;
    this.state.messageTimer = durationMs;
  }
}
```

**What's happening:**
- The constructor now accepts `onExit: () => void` so the host application can handle navigation when the player presses Escape.
- `toggleHelp()` flips `state.helpVisible`. The renderer checks this flag and draws a semi-transparent overlay with game information when true.
- All six input callbacks are now fully wired: `onPlayCard`, `onEndTurn`, `onContinue`, `onRestart`, `onExit`, and `onToggleHelp`.
- `destroy()` cleans up everything: stops the animation loop, detaches all input event listeners, and removes the resize handler. This prevents memory leaks when the game is unmounted.
- The `update(dt)` / `render()` separation in the game loop keeps logic and drawing cleanly separated, even though the current update is simple (just message timers).

---

### 3. Create the Platform Adapter

**File:** `src/contexts/canvas2d/games/card-battle/adapters/PlatformAdapter.ts`

The adapter wraps the engine to implement the `GameInstance` interface.

```typescript
import { CardBattleEngine } from '../CardBattleEngine';

export class PlatformAdapter {
  private engine: CardBattleEngine;

  constructor(canvas: HTMLCanvasElement, onExit: () => void) {
    this.engine = new CardBattleEngine(canvas, onExit);
  }

  start(): void {
    this.engine.start();
  }

  destroy(): void {
    this.engine.destroy();
  }
}
```

**What's happening:**
- `PlatformAdapter` is a thin wrapper that passes the `canvas` and `onExit` callback through to the engine. It exposes `start()` and `destroy()` to match the expected `GameInstance` interface.
- This indirection exists so the engine does not need to know about the host application's `GameInstance` type -- the adapter bridges the gap.

---

### 4. Create the Game Entry Point

**File:** `src/contexts/canvas2d/games/card-battle/index.ts`

The final entry point exports a `GameDefinition` object with all metadata.

```typescript
import { PlatformAdapter } from './adapters/PlatformAdapter';

export const CardBattleGame = {
  id: 'card-battle',
  category: 'strategy' as const,
  name: 'Card Battle',
  description: 'Defeat enemies with your card deck!',
  icon: '🃏',
  color: '#8e44ad',
  help: {
    goal: 'Defeat 3 increasingly difficult enemies using your card deck.',
    controls: [
      { key: 'Click Card', action: 'Play a card from your hand' },
      { key: 'End Turn', action: 'Finish your turn' },
      { key: 'H', action: 'Toggle help overlay' },
      { key: 'ESC', action: 'Exit to menu' },
    ],
    tips: [
      'You draw 3 cards and get 3 energy each turn',
      'Block absorbs damage but resets each turn',
      'Special cards have unique bonus effects',
      'Save heals for when you really need them',
    ],
  },
  create(canvas: HTMLCanvasElement, onExit: () => void) {
    const instance = new PlatformAdapter(canvas, onExit);
    instance.start();
    return instance;
  },
};
```

**What's happening:**
- `CardBattleGame` is a plain object with all the metadata a game launcher needs: `id` for routing, `name` and `description` for display, `icon` and `color` for the menu, and `help` for the in-game overlay.
- `create()` is a factory function that instantiates the adapter, starts the game loop, and returns the instance. The caller can later call `instance.destroy()` to clean up.
- The `help` object matches the structure used by the help overlay: a `goal` string, an array of `controls` (key-action pairs), and an array of `tips` (strategy hints).

---

### 5. Final File Structure

Here is the complete file structure for the card battle game:

```
src/contexts/canvas2d/games/card-battle/
  types.ts                    -- Card, CardInstance, Combatant, CardBattleState
  data/
    cards.ts                  -- 20 card definitions (attack, defense, heal, special)
  systems/
    DeckSystem.ts             -- Deck/hand/discard management, shuffle, draw
    BattleSystem.ts           -- Card effects, damage, AI, win/lose checks
    InputSystem.ts            -- Click/key handlers, hit testing, callbacks
  renderers/
    BattleRenderer.ts         -- Battlefield, cards, HP bars, overlays
    HUDRenderer.ts            -- Top bar, energy, messages, deck info
  adapters/
    PlatformAdapter.ts        -- GameInstance wrapper
  CardBattleEngine.ts         -- Main engine: state, loop, turn flow
  index.ts                    -- GameDefinition export
```

---

## Test It

1. **Run:** `npm run dev`
2. **Open:** the Card Battle game in your browser
3. **Test the complete game flow:**
   - **Round 1**: Fight the Goblin (50 HP). Play attack cards to deal damage, defense cards before ending your turn to block the enemy attack.
   - **Press H** to see the help overlay with controls and tips. Click or press H again to dismiss.
   - **Round 2**: After defeating the Goblin, click to continue. You heal 15 HP and face the Dark Knight (70 HP) with harder-hitting attacks.
   - **Round 3**: The Dragon (90 HP) deals even more damage. Use heal and defense cards strategically.
   - **Victory**: Defeat all 3 enemies to see the "VICTORY!" screen.
   - **Defeat**: Let your HP reach 0 to see "DEFEATED". Click to restart.
   - **Press ESC** to exit the game (triggers `onExit` callback).
4. **Verify cleanup:**
   - Exit the game and check that no console errors appear (event listeners properly removed).

---

## Challenges

**Easy:**
- Change the game's theme color from purple (`#8e44ad`) to a different color and see it reflected in the round counter and help overlay.
- Modify the between-round healing from 15 HP to 20 HP for an easier experience.

**Medium:**
- Add a deck building screen: before the battle starts, show all 20 cards and let the player select 12 to include in their deck. Use a `'deckbuild'` phase before the first draw phase.

**Hard:**
- Add card effect animations: when an attack card is played, draw a projectile that travels from the player to the enemy. Use `animTimer` in the state and interpolate position over 500ms before applying damage.

---

## What You Learned

- Implementing a help overlay toggled by keyboard and dismissed by click
- Wiring an `onExit` callback through the adapter pattern for host integration
- Creating a `GameDefinition` entry point with metadata and factory function
- Managing clean lifecycle with `destroy()` removing all listeners and canceling animation frames
- Building the complete architecture: types -> data -> systems -> renderers -> engine -> adapter -> entry point

**Congratulations!** You have built a complete card battle game from scratch. The game features 20 unique cards across 4 types, a three-pile deck system, turn-based combat with energy management, an AI opponent with adaptive strategy, and a 3-round campaign with increasing difficulty. The architecture cleanly separates data, logic, rendering, and input into focused modules.
