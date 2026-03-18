import type { GameDefinition } from '@shared/GameInterface';
import { TowerDefenseGame } from '@games/tower-defense';
import { SnakeGame } from '@games/snake';
import { PlatformerGame } from '@games/platformer';
import { PhysicsPuzzleGame } from '@games/physics-puzzle';
import { CityBuilderGame } from '@games/city-builder';
import { BreakoutGame } from '@games/breakout';
import { AsteroidsGame } from '@games/asteroids';
import { SpaceInvadersGame } from '@games/space-invaders';
import { FlappyBirdGame } from '@games/flappy-bird';
import { TetrisGame } from '@games/tetris';
import { MinesweeperGame } from '@games/minesweeper';
import { Match3Game } from '@games/match3';
import { CardBattleGame } from '@games/card-battle';
import { TopDownShooterGame } from '@games/topdown-shooter';
import { RacingGame } from '@games/racing';
import { ZombieSurvivalGame } from '@games/zombie-survival';
import { SokobanGame } from '@games/sokoban';
import { Game2048 } from '@games/game-2048';
import { MazeRunnerGame } from '@games/maze-runner';
import { FishingGame } from '@games/fishing';

export const GAME_REGISTRY: GameDefinition[] = [
  // Arcade
  SnakeGame,
  BreakoutGame,
  AsteroidsGame,
  SpaceInvadersGame,
  FlappyBirdGame,
  TetrisGame,
  // Action
  TowerDefenseGame,
  PlatformerGame,
  TopDownShooterGame,
  ZombieSurvivalGame,
  RacingGame,
  // Puzzle
  PhysicsPuzzleGame,
  MinesweeperGame,
  Match3Game,
  Game2048,
  SokobanGame,
  MazeRunnerGame,
  // Strategy
  CityBuilderGame,
  CardBattleGame,
  // Chill
  FishingGame,
];
