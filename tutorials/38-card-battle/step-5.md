# Step 5: AI Opponent

**Goal:** Implement a computer opponent that selects and plays cards based on strategy heuristics, with damage scaling per round.

**Time:** ~15 minutes

---

## What You'll Build

- **Enemy AI card selection** that picks attack, defense, or heal cards based on weighted random strategy
- **Health-aware bias** so the enemy prioritizes healing when low on HP
- **Round-based damage scaling** where enemy attacks hit harder in later rounds
- **Enemy turn integration** into the turn flow: player ends turn, enemy plays, then the next player turn begins
- **Enemy played card display** showing what the enemy used

---

## Concepts

- **Weighted Random Selection**: Rather than picking a completely random card, the AI biases toward attacks (60% chance) when healthy. This creates predictable-but-varied behavior that feels like a real opponent without complex decision trees.
- **Health-Ratio Heuristics**: When the enemy's HP ratio (`hp / maxHp`) drops below 30%, there is a 60% chance it picks a heal card instead. This simple threshold creates emergent behavior: a wounded enemy "tries to survive" rather than attacking recklessly.
- **Damage Scaling**: Enemy attack damage is modified by `card.value + state.round * 2`. Round 1 adds 2 extra damage, Round 2 adds 4, Round 3 adds 6. This gradual escalation makes each round noticeably harder without redesigning the card pool.
- **Card Pool Filtering**: The enemy only picks from cards costing 2 or less (`c.cost <= 2`), preventing it from using the most powerful 3-cost cards. This keeps the AI beatable while still challenging.

---

## Code

### 1. Add Enemy AI to the Battle System

**File:** `src/games/card-battle/systems/BattleSystem.ts`

Add the `enemyTurn()` and `pickEnemyCard()` methods to the existing `BattleSystem` class.

```typescript
import type { CardBattleState, CardInstance, Card } from '../types';
import { CARD_DEFINITIONS } from '../data/cards';

/** Handles card effects, enemy AI, damage calculation, and round progression */
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
          this.dealDamage(state.enemy, card.value);
          state.player.block += 4;
        } else if (card.id === 19) {
          this.dealDamage(state.enemy, card.value);
          state.player.hp = Math.min(state.player.maxHp, state.player.hp + 4);
        } else if (card.id === 20) {
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

  /** Enemy AI: pick and play a card based on the round difficulty */
  enemyTurn(state: CardBattleState): void {
    const enemyCard = this.pickEnemyCard(state);
    state.enemyPlayedCard = enemyCard;

    switch (enemyCard.type) {
      case 'attack':
        this.dealDamage(state.player, enemyCard.value + state.round * 2);
        break;
      case 'defense':
        state.enemy.block += enemyCard.value;
        break;
      case 'heal':
        state.enemy.hp = Math.min(
          state.enemy.maxHp,
          state.enemy.hp + enemyCard.value,
        );
        break;
      case 'special':
        this.dealDamage(state.player, enemyCard.value);
        state.enemy.hp = Math.min(state.enemy.maxHp, state.enemy.hp + 3);
        break;
    }
  }

  /** Simple AI: weighted random card pick with bias toward attacks */
  private pickEnemyCard(state: CardBattleState): Card {
    const hpRatio = state.enemy.hp / state.enemy.maxHp;
    const pool = CARD_DEFINITIONS.filter((c) => c.cost <= 2);

    // Bias toward heals when low HP
    if (hpRatio < 0.3) {
      const heals = pool.filter((c) => c.type === 'heal');
      if (heals.length > 0 && Math.random() < 0.6) {
        return heals[Math.floor(Math.random() * heals.length)];
      }
    }

    // Bias toward attacks normally
    const attacks = pool.filter((c) => c.type === 'attack');
    if (Math.random() < 0.6 && attacks.length > 0) {
      return attacks[Math.floor(Math.random() * attacks.length)];
    }

    return pool[Math.floor(Math.random() * pool.length)];
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
- `enemyTurn()` calls `pickEnemyCard()` to select a card, stores it in `state.enemyPlayedCard` for rendering, then applies the effect. Attack damage includes the round bonus (`+ state.round * 2`), making later enemies progressively more dangerous.
- `pickEnemyCard()` implements a three-tier decision:
  1. If the enemy is below 30% HP, there is a 60% chance it picks a heal card from the pool.
  2. Otherwise, there is a 60% chance it picks an attack card.
  3. Failing both biases, it picks any random card from the pool.
- The pool is filtered to `cost <= 2`, which excludes Fireball (14 dmg, cost 3), Fortress (15 block, cost 3), and Berserker (18 dmg, cost 3). This prevents the AI from being unfairly powerful.
- For special cards, the enemy version is simplified: it deals the card's value as damage AND heals 3 HP, rather than implementing per-card special logic.

---

### 2. Wire Enemy Turn into the Engine

**File:** `src/games/card-battle/CardBattleEngine.ts`

Update `handleEndTurn()` to run the enemy turn between player turns:

```typescript
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
```

**What's happening:**
- After discarding the player's hand, the phase switches to `'enemy'` and the enemy's block is cleared (just like the player's block resets each turn).
- `battleSystem.enemyTurn()` runs synchronously -- the enemy picks a card and applies its effect immediately. A message displays what the enemy played.
- `checkBattleEnd()` runs after the enemy's action. If the player died, the game-over overlay triggers. If the enemy died (from a prior player attack -- rare timing), round-win triggers.
- The guard `!state.gameOver && phase !== 'round-win'` prevents starting a new player turn if the battle just ended.
- The type cast `(this.state.phase as string)` handles the case where TypeScript's narrowing does not account for `checkBattleEnd()` potentially changing the phase.

---

### 3. Update Input System for Overlay Clicks

**File:** `src/games/card-battle/systems/InputSystem.ts`

Add game-over and round-win overlay click handling at the top of `handleClick()`:

```typescript
private handleClick(e: MouseEvent): void {
  const rect = this.canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const s = this.state;
  const W = s.canvasWidth;
  const H = s.canvasHeight;

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
```

**What's happening:**
- Overlay clicks are checked first, before any phase guard. Clicking during `'win'` or `'lose'` restarts the game. Clicking during `'round-win'` continues to the next round.
- The `return` after each overlay handler prevents the click from falling through to card or button hit testing.
- The `if (s.phase !== 'player') return` guard after overlays prevents any gameplay input during the enemy phase or other non-player phases.

---

## Test It

1. **Run:** `npm run dev`
2. **Open:** the Card Battle game in your browser
3. **Observe:**
   - Play your cards normally, then click **"End Turn"**
   - The **enemy plays a card** -- you see a message like "Goblin used Slash!" and the enemy's card appears below its icon
   - Your **HP decreases** from the enemy's attack (check the top-right HP counter and the green HP bar)
   - If you play **defense cards** before ending your turn, block absorbs some of the enemy's damage
   - Notice the enemy **heals itself** when its HP is low -- it switches strategy
   - Fight through **3 rounds** of increasing difficulty: Goblin (50 HP), Dark Knight (70 HP), Dragon (90 HP)
   - Enemy attacks hit **harder each round** due to the damage scaling
   - Defeat all 3 enemies to see **"VICTORY!"** or lose all your HP to see **"DEFEATED"**

---

## Challenges

**Easy:**
- Change the AI attack bias from 60% to 80% to make the enemy more aggressive and see how it changes the difficulty.

**Medium:**
- Add a second enemy action per turn in Round 3 (the Dragon attacks twice). Call `enemyTurn()` twice when `state.round === 3`.

**Hard:**
- Implement a smarter AI that considers the player's block: if the player has high block, the enemy prefers defense or heal cards instead of wasting an attack into shields.

---

## What You Learned

- Implementing weighted random card selection for AI opponents
- Using health-ratio thresholds to create adaptive enemy behavior
- Scaling difficulty across rounds with additive damage bonuses
- Integrating the enemy turn into the player-enemy-player turn cycle
- Handling game-state transitions between overlays (round-win, game-over) and gameplay

**Next:** Deck building and polish -- choose your cards before battle and add visual effects!
