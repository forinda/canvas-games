import type { GameDefinition } from '../shared/GameInterface';
import { TowerDefenseGame } from '../games/tower-defense';
import { SnakeGame } from '../games/snake';
import { PlatformerGame } from '../games/platformer';
import { PhysicsPuzzleGame } from '../games/physics-puzzle';
import { CityBuilderGame } from '../games/city-builder';

export const GAME_REGISTRY: GameDefinition[] = [
  TowerDefenseGame,
  SnakeGame,
  PlatformerGame,
  PhysicsPuzzleGame,
  CityBuilderGame,
];
