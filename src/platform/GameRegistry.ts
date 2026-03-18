import type { GameCategory, GameDefinition } from '@shared/GameInterface';
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
import { WhackAMoleGame } from '@games/whack-a-mole';
import { WordSearchGame } from '@games/word-search';
import { SudokuGame } from '@games/sudoku';
import { PipeConnectGame } from '@games/pipe-connect';
import { HelicopterGame } from '@games/helicopter';
import { PongGame } from '@games/pong';
import { PacManGame } from '@games/pacman';
import { FruitNinjaGame } from '@games/fruit-ninja';
import { AntColonyGame } from '@games/ant-colony';
import { IdleClickerGame } from '@games/idle-clicker';
import { DoodleJumpGame } from '@games/doodle-jump';
import { LightsOutGame } from '@games/lights-out';
import { LavaFloorGame } from '@games/lava-floor';
import { BasketballGame } from '@games/basketball';

export const GAME_REGISTRY: Record<GameCategory, GameDefinition[]> = {
  arcade: [
    SnakeGame,
    BreakoutGame,
    AsteroidsGame,
    SpaceInvadersGame,
    FlappyBirdGame,
    TetrisGame,
    WhackAMoleGame,
    HelicopterGame,
    PongGame,
    PacManGame,
    DoodleJumpGame,
  ],
  action: [
    TowerDefenseGame,
    PlatformerGame,
    TopDownShooterGame,
    ZombieSurvivalGame,
    RacingGame,
    FruitNinjaGame,
    LavaFloorGame,
    BasketballGame,
  ],
  puzzle: [
    PhysicsPuzzleGame,
    MinesweeperGame,
    Match3Game,
    Game2048,
    SokobanGame,
    MazeRunnerGame,
    WordSearchGame,
    SudokuGame,
    PipeConnectGame,
    LightsOutGame,
  ],
  strategy: [
    CityBuilderGame,
    CardBattleGame,
    AntColonyGame,
  ],
  chill: [
    FishingGame,
    IdleClickerGame,
  ],
};

/** Flat list of all games across categories */
export function getAllGames(): GameDefinition[] {
  return Object.values(GAME_REGISTRY).flat();
}

/** Get games for a specific category */
export function getGamesByCategory(category: GameCategory): GameDefinition[] {
  return GAME_REGISTRY[category];
}
