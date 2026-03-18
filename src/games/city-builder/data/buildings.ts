import type { BuildingType } from '../types';

export const BUILDING_DEFS: Record<BuildingType, { cost: number; icon: string; name: string; color: string; pop: number; happiness: number; power: number; food: number }> = {
  house:      { cost: 100,  icon: '\u{1F3E0}', name: 'House',       color: '#4a90d9', pop: 10, happiness: 0,  power: -2, food: -3 },
  farm:       { cost: 50,   icon: '\u{1F33E}', name: 'Farm',        color: '#6abf45', pop: 0,  happiness: 2,  power: -1, food: 10 },
  factory:    { cost: 200,  icon: '\u{1F3ED}', name: 'Factory',     color: '#888',    pop: 0,  happiness: -5, power: -5, food: 0 },
  park:       { cost: 75,   icon: '\u{1F333}', name: 'Park',        color: '#2ecc71', pop: 0,  happiness: 10, power: -1, food: 0 },
  road:       { cost: 25,   icon: '\u{1F6E4}\uFE0F', name: 'Road',        color: '#555',    pop: 0,  happiness: 1,  power: 0,  food: 0 },
  powerplant: { cost: 300,  icon: '\u26A1',    name: 'Power Plant', color: '#f39c12', pop: 0,  happiness: -3, power: 30, food: 0 },
};

export const BUILDING_TYPES: BuildingType[] = ['house', 'farm', 'factory', 'park', 'road', 'powerplant'];
