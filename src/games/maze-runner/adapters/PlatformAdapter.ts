import type { GameInstance } from '@shared/GameInterface.ts';
import { MazeEngine } from '../MazeEngine.ts';

export class PlatformAdapter implements GameInstance {
  private engine: MazeEngine;

  constructor(canvas: HTMLCanvasElement, onExit: () => void) {
    this.engine = new MazeEngine(canvas, onExit);
  }

  start(): void {
    this.engine.start();
  }

  destroy(): void {
    this.engine.destroy();
  }
}
