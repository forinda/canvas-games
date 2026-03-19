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
import { MemoryMatchGame } from '@games/memory-match';
import { TicTacToeGame } from '@games/tic-tac-toe';
import { GravityBallGame } from '@games/gravity-ball';
import { RhythmTapGame } from '@games/rhythm-tap';
import { HangmanGame } from '@games/hangman';
import { ParticleSandGame } from '@games/particle-sand';
import { SimonSaysGame } from '@games/simon-says';
import { ReactionTimerGame } from '@games/reaction-timer';
import { BrickBuilderGame } from '@games/brick-builder';
import { BalloonPopGame } from '@games/balloon-pop';
import { ColorSwitchGame } from '@games/color-switch';
import { TypingSpeedGame } from '@games/typing-speed';
import { ConnectFourGame } from '@games/connect-four';
import { FroggerGame } from '@games/frogger';
import { GolfGame } from '@games/golf';
import { PixelArtGame } from '@games/pixel-art';
import { CheckersGame } from '@games/checkers';
import { ChessGame } from '@games/chess';

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
    RhythmTapGame,
    ReactionTimerGame,
    BalloonPopGame,
    ColorSwitchGame,
    TypingSpeedGame,
    FroggerGame,
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
    GolfGame,
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
    MemoryMatchGame,
    SimonSaysGame,
    GravityBallGame,
    HangmanGame,
  ],
  strategy: [
    CityBuilderGame,
    CardBattleGame,
    AntColonyGame,
    TicTacToeGame,
    ConnectFourGame,
    CheckersGame,
    ChessGame,
  ],
  chill: [
    FishingGame,
    IdleClickerGame,
    ParticleSandGame,
    BrickBuilderGame,
    PixelArtGame,
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
