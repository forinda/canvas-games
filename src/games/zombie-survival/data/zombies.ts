import type { ZombieType } from '../types.ts';

export interface ZombieDef {
  type: ZombieType;
  hp: number;
  speed: number;
  damage: number;
  attackInterval: number;
  radius: number;
  color: string;
}

export const ZOMBIE_DEFS: Record<ZombieType, ZombieDef> = {
  walker: {
    type: 'walker',
    hp: 60,
    speed: 45,
    damage: 8,
    attackInterval: 1.2,
    radius: 12,
    color: '#5a8a3c',
  },
  runner: {
    type: 'runner',
    hp: 35,
    speed: 110,
    damage: 5,
    attackInterval: 0.8,
    radius: 10,
    color: '#c0392b',
  },
  tank: {
    type: 'tank',
    hp: 200,
    speed: 28,
    damage: 18,
    attackInterval: 2.0,
    radius: 18,
    color: '#6c3483',
  },
};
