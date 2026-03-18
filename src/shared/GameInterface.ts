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

export interface GameDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  /** Factory: receives canvas, returns a running game instance */
  create(canvas: HTMLCanvasElement, onExit: () => void): GameInstance;
}
