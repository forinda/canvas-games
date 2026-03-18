import type { Upgrade } from '../types.ts';

/** Default upgrade definitions — 8 tiers */
export function createDefaultUpgrades(): Upgrade[] {
  return [
    {
      id: 'cursor',
      name: 'Cursor',
      icon: '\u{1F5B1}',
      baseCost: 15,
      costMultiplier: 1.15,
      cps: 0.1,
      owned: 0,
    },
    {
      id: 'grandma',
      name: 'Grandma',
      icon: '\u{1F475}',
      baseCost: 100,
      costMultiplier: 1.15,
      cps: 1,
      owned: 0,
    },
    {
      id: 'farm',
      name: 'Farm',
      icon: '\u{1F33E}',
      baseCost: 1_100,
      costMultiplier: 1.15,
      cps: 8,
      owned: 0,
    },
    {
      id: 'mine',
      name: 'Mine',
      icon: '\u{26CF}',
      baseCost: 12_000,
      costMultiplier: 1.15,
      cps: 47,
      owned: 0,
    },
    {
      id: 'factory',
      name: 'Factory',
      icon: '\u{1F3ED}',
      baseCost: 130_000,
      costMultiplier: 1.15,
      cps: 260,
      owned: 0,
    },
    {
      id: 'bank',
      name: 'Bank',
      icon: '\u{1F3E6}',
      baseCost: 1_400_000,
      costMultiplier: 1.15,
      cps: 1_400,
      owned: 0,
    },
    {
      id: 'temple',
      name: 'Temple',
      icon: '\u{26E9}',
      baseCost: 20_000_000,
      costMultiplier: 1.15,
      cps: 7_800,
      owned: 0,
    },
    {
      id: 'wizard',
      name: 'Wizard Tower',
      icon: '\u{1F9D9}',
      baseCost: 330_000_000,
      costMultiplier: 1.15,
      cps: 44_000,
      owned: 0,
    },
  ];
}
