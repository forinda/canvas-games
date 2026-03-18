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
