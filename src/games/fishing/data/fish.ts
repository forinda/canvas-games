import type { Fish } from '../types';

export const FISH_SPECIES: Fish[] = [
  // ── Common ──
  {
    name: 'Sardine',
    rarity: 'common',
    sizeRange: [8, 20],
    icon: '🐟',
    color: '#90a4ae',
    points: 10,
    weight: 30,
    fight: 0.1,
  },
  {
    name: 'Trout',
    rarity: 'common',
    sizeRange: [20, 50],
    icon: '🐟',
    color: '#a1887f',
    points: 15,
    weight: 25,
    fight: 0.2,
  },
  {
    name: 'Bass',
    rarity: 'common',
    sizeRange: [25, 60],
    icon: '🐟',
    color: '#81c784',
    points: 20,
    weight: 25,
    fight: 0.25,
  },

  // ── Uncommon ──
  {
    name: 'Salmon',
    rarity: 'uncommon',
    sizeRange: [40, 90],
    icon: '🐠',
    color: '#ff8a65',
    points: 40,
    weight: 12,
    fight: 0.35,
  },
  {
    name: 'Tuna',
    rarity: 'uncommon',
    sizeRange: [60, 150],
    icon: '🐠',
    color: '#4db6ac',
    points: 50,
    weight: 10,
    fight: 0.45,
  },
  {
    name: 'Swordfish',
    rarity: 'uncommon',
    sizeRange: [100, 250],
    icon: '🐠',
    color: '#7986cb',
    points: 60,
    weight: 8,
    fight: 0.5,
  },

  // ── Rare ──
  {
    name: 'Marlin',
    rarity: 'rare',
    sizeRange: [150, 400],
    icon: '🦈',
    color: '#5c6bc0',
    points: 100,
    weight: 4,
    fight: 0.65,
  },
  {
    name: 'Shark',
    rarity: 'rare',
    sizeRange: [200, 500],
    icon: '🦈',
    color: '#78909c',
    points: 120,
    weight: 3,
    fight: 0.8,
  },
  {
    name: 'Whale',
    rarity: 'rare',
    sizeRange: [500, 1500],
    icon: '🐋',
    color: '#42a5f5',
    points: 150,
    weight: 2,
    fight: 0.7,
  },

  // ── Legendary ──
  {
    name: 'Golden Fish',
    rarity: 'legendary',
    sizeRange: [15, 30],
    icon: '✨',
    color: '#ffd54f',
    points: 300,
    weight: 1,
    fight: 0.9,
  },
  {
    name: 'Kraken',
    rarity: 'legendary',
    sizeRange: [1000, 3000],
    icon: '🐙',
    color: '#ce93d8',
    points: 500,
    weight: 0.5,
    fight: 0.95,
  },
  {
    name: "Mermaid's Pearl",
    rarity: 'legendary',
    sizeRange: [5, 10],
    icon: '🔮',
    color: '#e0f7fa',
    points: 1000,
    weight: 0.3,
    fight: 0.6,
  },
];

/** Pick a random fish, weighted by rarity. Cast distance boosts rare chances. */
export function pickRandomFish(castDistance: number): Fish {
  // Further casts improve rare/legendary odds
  const boosted = FISH_SPECIES.map((f) => {
    let w = f.weight;
    if (f.rarity === 'rare') w *= 1 + castDistance * 1.5;
    if (f.rarity === 'legendary') w *= 1 + castDistance * 2;
    return { fish: f, w };
  });

  const total = boosted.reduce((s, b) => s + b.w, 0);
  let roll = Math.random() * total;

  for (const b of boosted) {
    roll -= b.w;
    if (roll <= 0) return b.fish;
  }

  return FISH_SPECIES[0];
}

/** Random size within the fish's size range */
export function randomSize(fish: Fish): number {
  const [min, max] = fish.sizeRange;
  return Math.round((min + Math.random() * (max - min)) * 10) / 10;
}
