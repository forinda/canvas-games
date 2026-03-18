/**
 * Standard interface every game must implement.
 * The platform launcher uses this to create/destroy games.
 */
export interface GameInstance {
  /** Start the game loop */
  start(): void;
  /** Stop the game loop and clean up all listeners */
  destroy(): void;
}

/** Structured help info displayed in-game and on the platform menu */
export interface GameHelp {
  /** One-line goal of the game */
  goal: string;
  /** Control mappings shown in help overlay */
  controls: { key: string; action: string }[];
  /** Gameplay tips */
  tips: string[];
}

export type GameCategory = 'arcade' | 'action' | 'puzzle' | 'strategy' | 'chill';

export interface GameDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  /** Category for filtering on the platform menu */
  category?: GameCategory;
  /** Help info: goals, controls, tips */
  help?: GameHelp;
  /** Factory: receives canvas, returns a running game instance */
  create(canvas: HTMLCanvasElement, onExit: () => void): GameInstance;
}
