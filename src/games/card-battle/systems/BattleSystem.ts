import type { Updatable } from '@shared/Updatable';
import type { CardBattleState, CardInstance, Card } from '../types';
import { CARD_DEFINITIONS } from '../data/cards';

/** Handles card effects, enemy AI, damage calculation, and round progression */
export class BattleSystem implements Updatable<CardBattleState> {
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
        state.player.hp = Math.min(state.player.maxHp, state.player.hp + card.value);
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
  private dealDamage(target: { hp: number; block: number }, damage: number): void {
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
        state.enemy.hp = Math.min(state.enemy.maxHp, state.enemy.hp + enemyCard.value);
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
    const pool = CARD_DEFINITIONS.filter(c => c.cost <= 2);

    // Bias toward heals when low HP
    if (hpRatio < 0.3) {
      const heals = pool.filter(c => c.type === 'heal');
      if (heals.length > 0 && Math.random() < 0.6) {
        return heals[Math.floor(Math.random() * heals.length)];
      }
    }

    // Bias toward attacks normally
    const attacks = pool.filter(c => c.type === 'attack');
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

  update(state: CardBattleState, _dt: number): void {
    // Advance message timer
    if (state.messageTimer > 0) {
      state.messageTimer -= _dt;
      if (state.messageTimer <= 0) {
        state.message = '';
      }
    }
  }
}
