import type { FruitType } from '../types';
import { FRUIT_RADIUS } from '../types';

export const FRUIT_TYPES: FruitType[] = [
  {
    name: 'watermelon',
    color: '#2e7d32',
    innerColor: '#ef5350',
    icon: '🍉',
    radius: FRUIT_RADIUS + 6,
    points: 3,
  },
  {
    name: 'orange',
    color: '#e65100',
    innerColor: '#ffb74d',
    icon: '🍊',
    radius: FRUIT_RADIUS,
    points: 1,
  },
  {
    name: 'apple',
    color: '#c62828',
    innerColor: '#fff9c4',
    icon: '🍎',
    radius: FRUIT_RADIUS - 2,
    points: 1,
  },
  {
    name: 'banana',
    color: '#f9a825',
    innerColor: '#fffde7',
    icon: '🍌',
    radius: FRUIT_RADIUS - 4,
    points: 1,
  },
  {
    name: 'pineapple',
    color: '#f57f17',
    innerColor: '#fff176',
    icon: '🍍',
    radius: FRUIT_RADIUS + 4,
    points: 2,
  },
  {
    name: 'kiwi',
    color: '#558b2f',
    innerColor: '#aed581',
    icon: '🥝',
    radius: FRUIT_RADIUS - 4,
    points: 1,
  },
];

/** Pick a random fruit type */
export function randomFruitType(): FruitType {
  return FRUIT_TYPES[Math.floor(Math.random() * FRUIT_TYPES.length)];
}
